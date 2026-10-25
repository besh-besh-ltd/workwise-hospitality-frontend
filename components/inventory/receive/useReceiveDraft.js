import { useCallback, useEffect, useRef, useState } from "react";
import { clearLocalDraft, grnDraftKey, loadLocalDraft, saveLocalDraft } from "./draftStore";
import { buyerReceiveAdapter as api } from "./receiveAdapter";
import { replayVerdict } from "./receivePost";
import {
  blankHeader, blankLine, buildGrnInput, errorInfo, hasContent, isNetworkError, newClientEventId,
} from "./receiveUtils";

// The receipt's session: its clientEventId, the server draft and the device
// copy in IndexedDB (entries and keys only; buyer screens only).
//
// Session key rules (each receipt posts exactly once):
//   - A server draft is created with the session key and keeps it; the post
//     sends the same key, so the server posts that draft or, on a retry,
//     replays it.
//   - The key changes only after a confirmed outcome: posted, found "already
//     posted earlier", or the draft discarded. A queued post keeps it, and
//     keeps the device copy, until the receipt is reopened and settled.
//   - A key from the device copy is reused only when the create's outcome was
//     unknown (no draftId saved). A device copy that names a draft the server
//     no longer has is dropped, and the receiver is told what became of it.
//   - A spent key (AlreadyPosted) is settled once, by whoever is current: a
//     post waiting on a background save takes it over from that save.
//
// `form` holds the page's synchronous mirrors: {ctxRef, headerRef, entriesRef,
// dirtyRef, editVersionRef, touchedRef, mountedRef, loadSeqRef, commitEntries,
// commitHeader, commitDirty}.

const AUTOSAVE_MS = 10000;
const BLUR_SAVE_MS = 800;
const LOCAL_SAVE_MS = 400;

const withoutPoId = (input) => {
  const out = { ...input };
  delete out.poId;
  return out;
};

/** The session key (`key`) already belongs to a posted receipt (`postedGrn`). */
export class AlreadyPosted extends Error {
  constructor(grn, key = null) {
    super("This receipt is already posted");
    this.postedGrn = grn;
    this.key = key;
  }
}

const online = () => typeof navigator === "undefined" || navigator.onLine !== false;

/** The draft is no longer a draft: fetch what it became (it keeps its id when posted). */
const spentDraft = async (id, key) => {
  let grn = null;
  try {
    grn = await api.getGrn(id);
  } catch {
    grn = null;
  }
  return new AlreadyPosted(grn || { id, status: "posted" }, key);
};
const isPostedConflict = (info) => info.code === "CONFLICT" && !!info.details.status && info.details.status !== "draft";

export default function useReceiveDraft({
  poId, form, active, watch, postingRef, onSpent,
}) {
  const {
    ctxRef, headerRef, entriesRef, dirtyRef, editVersionRef, touchedRef, mountedRef, loadSeqRef,
    commitEntries, commitHeader, commitDirty,
  } = form;

  const [saveState, setSaveState] = useState({ status: "idle", at: null });
  const [draftId, setDraftId] = useState(null);

  const grnIdRef = useRef(null);
  const sessionKeyRef = useRef(newClientEventId());
  // The key came from the device copy (restoreLocal): its replays are dated.
  const keyRestoredRef = useRef(false);
  const needsKeyRef = useRef(false);
  const createUncertainRef = useRef(false);
  const lostAtRef = useRef(new Map());
  const saveChainRef = useRef(Promise.resolve());
  const lastSaveRef = useRef(Promise.resolve());
  const blurTimerRef = useRef(null);
  const pageLoadedAtRef = useRef(Date.now());
  const onSpentRef = useRef(onSpent);
  useEffect(() => {
    onSpentRef.current = onSpent;
  });
  useEffect(() => () => clearTimeout(blurTimerRef.current), []);

  const setGrnId = useCallback((id) => {
    grnIdRef.current = id ?? null;
    if (mountedRef.current) setDraftId(id ?? null);
  }, [mountedRef]);

  const localKey = useCallback(() => {
    const data = ctxRef.current;
    return data?.hotel ? grnDraftKey(data.po?.id ?? poId, data.hotel.id) : null;
  }, [ctxRef, poId]);

  /** Start the session for a freshly loaded form (`draft` is the server's, or null). */
  const startSession = useCallback((draft) => {
    setGrnId(draft?.id ?? null);
    sessionKeyRef.current = draft?.clientEventId || newClientEventId();
    keyRestoredRef.current = false;
    needsKeyRef.current = !!draft && !draft.clientEventId;
    createUncertainRef.current = false;
    setSaveState({ status: draft ? "saved" : "idle", at: null });
  }, [setGrnId]);

  /** A new receipt: new key, no draft. */
  const rotateKey = useCallback(() => {
    setGrnId(null);
    sessionKeyRef.current = newClientEventId();
    keyRestoredRef.current = false;
    needsKeyRef.current = false;
    createUncertainRef.current = false;
  }, [setGrnId]);

  /**
   * Write the device copy now. `clean`: it matches the server draft (just
   * saved), so a reload resumes the server copy; it still records which draft
   * and key this receipt is, so a draft that vanishes can be explained.
   */
  const saveLocalNow = useCallback(({ clean = false } = {}) => {
    const key = localKey();
    if (!key) return Promise.resolve(null);
    return saveLocalDraft(key, {
      savedAt: Date.now(),
      clean,
      draftId: grnIdRef.current,
      sessionKey: sessionKeyRef.current,
      header: headerRef.current,
      entries: entriesRef.current,
    });
  }, [localKey, headerRef, entriesRef]);

  const clearLocal = useCallback(() => {
    const key = localKey();
    return key ? clearLocalDraft(key) : Promise.resolve(null);
  }, [localKey]);

  /**
   * Apply the device copy. Resolves to {kind:"restored"}, {kind:"lost", grn}
   * (the copy named a server draft that is gone: grn is what it became when
   * the server can say) or null.
   */
  const restoreLocal = useCallback(async (data, draft, seq) => {
    const hid = data.hotel?.id;
    if (!hid) return null;
    const key = grnDraftKey(data.po?.id ?? poId, hid);
    const local = await loadLocalDraft(key);
    if (!local || seq !== loadSeqRef.current || !mountedRef.current) return null;

    const localDraftId = local.draftId != null ? Number(local.draftId) : null;
    if (localDraftId != null && (!draft || Number(draft.id) !== localDraftId)) {
      // Posted or discarded since. Its key is spent (or gone with it): never
      // reuse it, and don't bring back entries that may already be in stock.
      clearLocalDraft(key);
      let grn = null;
      try {
        const g = await api.getGrn(localDraftId);
        if (g && g.status !== "draft" && Number(g.poId) === Number(data.po?.id)) grn = g;
      } catch {
        // Not found or not visible: it was discarded.
      }
      if (seq !== loadSeqRef.current || !mountedRef.current) return null;
      return { kind: "lost", grn, hasServerDraft: !!draft };
    }

    if (local.clean || touchedRef.current) return null;
    const serverAt = draft?.updatedAt ? Date.parse(draft.updatedAt) || 0 : 0;
    if (!(Number(local.savedAt) > serverAt)) return null;
    const deptDefault = data.po?.departmentId ?? null;
    const next = {};
    for (const l of data.lines || []) {
      next[l.poLineId] = { ...blankLine(l, { departmentId: deptDefault }), ...(local.entries?.[l.poLineId] || {}) };
    }
    if (!draft && local.sessionKey) {
      // The create (or a one-request post) may have landed without an answer:
      // keep its key so the server can tell us. A posted key is caught by the
      // first save or post and reported as "already posted earlier".
      sessionKeyRef.current = local.sessionKey;
      keyRestoredRef.current = true;
      createUncertainRef.current = true;
    }
    commitEntries(next);
    commitHeader({ ...blankHeader(), ...(local.header || {}) });
    commitDirty(true);
    return { kind: "restored" };
  }, [poId, loadSeqRef, mountedRef, touchedRef, commitEntries, commitHeader, commitDirty]);

  // ── Server draft ─────────────────────────────────────────────────────────
  const writeDraft = useCallback(async (input) => {
    const key = sessionKeyRef.current;
    if (grnIdRef.current) {
      try {
        // The key rides along: a draft saved without one adopts it.
        const grn = await api.updateDraft(grnIdRef.current, { ...withoutPoId(input), post: false, clientEventId: key });
        needsKeyRef.current = false;
        return grn;
      } catch (err) {
        const info = errorInfo(err);
        // Posted under us, often by our own post whose reply was lost.
        if (isPostedConflict(info)) throw await spentDraft(grnIdRef.current, key);
        if (info.httpStatus !== 404) throw err;
        setGrnId(null); // discarded elsewhere: start a new draft with the same key
      }
    }
    const grn = await api.createDraft({ ...input, post: false, clientEventId: key });
    if (grn?.status && grn.status !== "draft") throw new AlreadyPosted(grn, key);
    setGrnId(grn?.id ?? null);
    if (createUncertainRef.current && grnIdRef.current) {
      // An earlier create landed unheard: that draft came back unchanged.
      createUncertainRef.current = false;
      return api.updateDraft(grnIdRef.current, { ...withoutPoId(input), post: false, clientEventId: key });
    }
    createUncertainRef.current = false;
    return grn;
  }, [setGrnId]);

  /**
   * Save the server draft. Saves run one at a time (a second create with the
   * same key would answer with the first draft, unchanged). `snapshot`
   * overrides {header, entries}. Throws AlreadyPosted when the key is spent.
   */
  const saveDraft = useCallback(({ force = false, snapshot = null } = {}) => {
    const job = async () => {
      const data = ctxRef.current;
      if (!data?.hotel) return null;
      const hdr = snapshot?.header || headerRef.current;
      const ents = snapshot?.entries || entriesRef.current;
      if (!force && !dirtyRef.current) return null;
      if (!force && !grnIdRef.current && !hasContent(hdr, ents)) return null;
      const version = editVersionRef.current;
      const input = buildGrnInput({
        poId: data.po.id, hotelId: data.hotel.id, header: hdr, ctxLines: data.lines || [], entries: ents,
      });
      if (mountedRef.current) setSaveState({ status: "saving", at: null });
      try {
        const grn = await writeDraft(input);
        if (editVersionRef.current === version) commitDirty(false);
        if (mountedRef.current) setSaveState({ status: "saved", at: Date.now() });
        saveLocalNow({ clean: !dirtyRef.current });
        return grn;
      } catch (err) {
        if (!grnIdRef.current && isNetworkError(err) && !(err instanceof AlreadyPosted)) {
          createUncertainRef.current = true;
        }
        if (mountedRef.current) setSaveState({ status: err instanceof AlreadyPosted ? "idle" : "error", at: null });
        throw err;
      }
    };
    const run = saveChainRef.current.then(job, job);
    saveChainRef.current = run.catch(() => {});
    lastSaveRef.current = run;
    return run;
  }, [
    ctxRef, headerRef, entriesRef, dirtyRef, editVersionRef, mountedRef, writeDraft, commitDirty, saveLocalNow,
  ]);

  /**
   * Background save: a spent key goes to onSpent(AlreadyPosted), anything
   * else waits for the next try. While a post is in progress the post settles
   * it instead (beforePost rethrows it), so it is never settled twice.
   */
  const saveQuietly = useCallback(() => {
    saveDraft().catch((err) => {
      if (!(err instanceof AlreadyPosted) || postingRef.current || err.key !== sessionKeyRef.current) return;
      onSpentRef.current?.(err);
    });
  }, [saveDraft, postingRef]);

  /**
   * Before a post: let an in-flight save finish (a create racing the post
   * would make two documents) and rethrow its AlreadyPosted for this key, so
   * the post settles it rather than going out under a new key. Then give a
   * draft saved without a key ours.
   */
  const beforePost = useCallback(async () => {
    const key = sessionKeyRef.current;
    try {
      await lastSaveRef.current;
    } catch (err) {
      if (err instanceof AlreadyPosted && err.key === key) throw err;
    }
    if (grnIdRef.current && needsKeyRef.current && online()) {
      await saveDraft({ force: true });
    }
  }, [saveDraft]);

  /**
   * Just before a post leaves: the device remembers which draft and key it
   * was, and keeps that until the outcome is known (a queued post included).
   * Only a copy that matches a server draft is "clean".
   */
  const notePosting = useCallback(
    () => saveLocalNow({ clean: !dirtyRef.current && grnIdRef.current != null }),
    [saveLocalNow, dirtyRef]
  );

  /** Delete the server draft (if any) and the device copy; a new receipt starts. */
  const discard = useCallback(async () => {
    await saveChainRef.current;
    const id = grnIdRef.current;
    const key = sessionKeyRef.current;
    if (id) {
      try {
        await api.discardDraft(id);
      } catch (err) {
        const info = errorInfo(err);
        if (isPostedConflict(info)) throw await spentDraft(id, key);
        if (info.httpStatus !== 404) throw err;
      }
    }
    await clearLocal();
    rotateKey();
    commitDirty(false);
    setSaveState({ status: "idle", at: null });
  }, [clearLocal, rotateKey, commitDirty]);

  // ── Replays ──────────────────────────────────────────────────────────────
  /** A post with this key ended with no answer (its outcome is unknown). */
  const markLost = useCallback((key) => {
    lostAtRef.current.set(key, editVersionRef.current);
  }, [editVersionRef]);

  /** "ours" | "earlier" for a posted GRN the session key turned out to own. */
  const verdictFor = useCallback((grn) => replayVerdict({
    grn,
    lostAtVersion: lostAtRef.current.get(sessionKeyRef.current),
    editVersion: editVersionRef.current,
    keyRestored: keyRestoredRef.current,
    pageLoadedAt: pageLoadedAtRef.current,
  }), [editVersionRef]);

  // ── Background saves ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => {
      if (dirtyRef.current && !postingRef.current) saveQuietly();
    }, AUTOSAVE_MS);
    return () => clearInterval(t);
  }, [active, dirtyRef, postingRef, saveQuietly]);

  // Save when the tab hides (phone locked, app switched).
  useEffect(() => {
    if (!active) return undefined;
    const onHide = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current && !postingRef.current) saveQuietly();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [active, dirtyRef, postingRef, saveQuietly]);

  // Device copy, a moment after each edit.
  const { header, entries, dirty, hotelId } = watch;
  useEffect(() => {
    if (!active || !dirty || !hotelId || !ctxRef.current) return undefined;
    const t = setTimeout(() => {
      if (dirtyRef.current) saveLocalNow(); // not after a post or discard cleared it
    }, LOCAL_SAVE_MS);
    return () => clearTimeout(t);
  }, [header, entries, dirty, hotelId, active, ctxRef, dirtyRef, saveLocalNow]);

  /** Focus left a field: save shortly after (unless focus moved within the form and typing goes on). */
  const onFormBlur = useCallback(() => {
    clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      if (dirtyRef.current && !postingRef.current) saveQuietly();
    }, BLUR_SAVE_MS);
  }, [dirtyRef, postingRef, saveQuietly]);

  return {
    saveState,
    draftId,
    grnIdRef,
    sessionKeyRef,
    startSession,
    rotateKey,
    restoreLocal,
    saveDraft,
    saveLocalNow,
    clearLocal,
    beforePost,
    notePosting,
    discard,
    markLost,
    verdictFor,
    onFormBlur,
  };
}
