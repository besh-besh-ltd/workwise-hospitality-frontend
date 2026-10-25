import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { FileText, Loader2, RotateCcw, Save, ScanBarcode, Send } from "lucide-react";
import ScanInput from "@/components/inventory/scan/ScanInput";
import LinkUnknownCodeSheet from "@/components/inventory/scan/LinkUnknownCodeSheet";
import MobileActionBar, { MobileActionButton } from "@/components/shared/mobile/MobileActionBar";
import useIsMobile from "@/hooks/useIsMobile";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { submitOrQueue, usePendingCount } from "@/components/inventory/offline/outbox";
import ReceiveLineRow from "./ReceiveLineRow";
import ReceiveLineCard from "./ReceiveLineCard";
import QtyPad from "./QtyPad";
import UomFactorPrompt from "./UomFactorPrompt";
import DeliveryDocuments from "./DeliveryDocuments";
import ReceiveConfirmModal from "./ReceiveConfirmModal";
import {
  BlockedState, DiscardDraftModal, ErrorState, LoadingState, PickHotelState, PostedState, QueuedState, ReceiveEyebrow,
  ReceiveFrame, ReceiveNotice,
} from "./ReceiveStates";
import { GRN_POST_KIND, buyerReceiveAdapter as api } from "./receiveAdapter";
import useReceiveDraft, { AlreadyPosted } from "./useReceiveDraft";
import useReceiveScan from "./useReceiveScan";
import { earlierPostMessage, isFreshPost, postErrorAction, postedGrnOf } from "./receivePost";
import { applyDispatch, formFromContext } from "./receiveFormState";
import {
  blankHeader, buildGrnInput, errorInfo, factorText, isNetworkError, lineQty, parseQty, routes, subQty, validateForPost,
} from "./receiveUtils";
import styles from "./receive.module.scss";

// Receive one delivery against one PO at one hotel: pick the hotel, scan or
// type what arrived, note rejects / batches / documents, confirm, post.
//
// Signed-in receivers only. A site rep on an emailed link uses
// TokenReceivePage (task D5), built from the same line, pad, confirm and
// documents components; it has no drafts, no outbox and no device copy.
//
//   poId              PO id
//   initialHotelId    preselected hotel (?hotelId=); otherwise the server picks or we ask
//   dispatchId        ?dispatch=: prefill received qty + challan from that dispatch note
//                     (once; a draft or another hotel skips it, with a notice)
//   onPosted(grn)     after a successful post
//   onHotelChange(id) after the receiver picks a hotel (the page syncs ?hotelId=)
//
// Posting is ONE request keyed by the session's clientEventId (useReceiveDraft):
// the server posts the draft holding the key, or replays it on a retry. It
// goes through the offline outbox (kind grn_post). A queued post keeps the key
// and the device copy until the receipt is reopened; an unknown outcome (no
// answer, or a gateway 502/503/504) keeps the screen and offers Retry with the
// same key.

const ReceivePage = ({
  poId,
  initialHotelId,
  dispatchId = null,
  onPosted,
  onHotelChange,
}) => {
  const router = useRouter();
  const isMobile = useIsMobile();
  const pendingCount = usePendingCount(GRN_POST_KIND);

  const [view, setView] = useState({ phase: "loading" });
  const [ctx, setCtx] = useState(null);
  const [hotelId, setHotelId] = useState(
    initialHotelId != null && initialHotelId !== "" ? Number(initialHotelId) : undefined
  );
  const [header, setHeader] = useState(blankHeader);
  const [entries, setEntries] = useState({});
  const [lineErrors, setLineErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [canRetry, setCanRetry] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [posting, setPosting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [uomPrompt, setUomPrompt] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [attachError, setAttachError] = useState(null);
  const [notice, setNotice] = useState(null);

  // Synchronous mirrors: scans, autosave timers and the post path read the
  // latest values, not the ones captured by a render.
  const ctxRef = useRef(null);
  const hotelIdRef = useRef(hotelId);
  const headerRef = useRef(header);
  const entriesRef = useRef(entries);
  const dirtyRef = useRef(false);
  const editVersionRef = useRef(0);
  const touchedRef = useRef(false);
  const postingRef = useRef(false);
  const loadSeqRef = useRef(0);
  const mountedRef = useRef(true);
  const dispatchPendingRef = useRef(dispatchId);
  const settleSpentRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const commitEntries = useCallback((next) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);
  const commitHeader = useCallback((next) => {
    headerRef.current = next;
    setHeader(next);
  }, []);
  const commitDirty = useCallback((v) => {
    dirtyRef.current = v;
    setDirty(v);
  }, []);
  const markEdited = useCallback(() => {
    editVersionRef.current += 1;
    touchedRef.current = true;
    commitDirty(true);
  }, [commitDirty]);

  const form = useMemo(() => ({
    ctxRef, headerRef, entriesRef, dirtyRef, editVersionRef, touchedRef, mountedRef, loadSeqRef,
    commitEntries, commitHeader, commitDirty,
  }), [commitEntries, commitHeader, commitDirty]);

  const session = useReceiveDraft({
    poId,
    form,
    active: view.phase === "ready",
    watch: { header, entries, dirty, hotelId },
    postingRef,
    onSpent: (spent) => settleSpentRef.current?.(spent),
  });
  const { startSession, restoreLocal } = session;

  const lines = useMemo(() => ctx?.lines || [], [ctx]);
  const lineById = useMemo(() => new Map(lines.map((l) => [Number(l.poLineId), l])), [lines]);
  const hotel = ctx?.hotel || null;
  const po = ctx?.po || null;

  const invHotelIds = useMemo(() => (hotelId ? [Number(hotelId)] : []), [hotelId]);
  const invPerms = useModulePermissions({ moduleKey: "inventory", hotelIds: invHotelIds });
  // Fail closed: nothing that needs inventory.update shows while it is loading.
  const canSetupItems = !invPerms.loading && !!invPerms.canUpdate;

  // ── Edits ─────────────────────────────────────────────────────────────────
  const patchLine = useCallback((id, patch) => {
    const prev = entriesRef.current;
    if (!prev[id]) return;
    commitEntries({ ...prev, [id]: { ...prev[id], ...patch } });
    setLineErrors((errs) => {
      if (!(id in errs)) return errs;
      const next = { ...errs };
      delete next[id];
      return next;
    });
    setFormError(null);
    setCanRetry(false);
    markEdited();
  }, [commitEntries, markEdited]);

  /** A field typed on a row or card: a typed received qty restarts the scan count. */
  const editLine = useCallback((id, patch) =>
    patchLine(id, "received" in patch ? { ...patch, scanUnits: 0, scanBase: null } : patch), [patchLine]);

  const patchHeader = useCallback((patch) => {
    commitHeader({ ...headerRef.current, ...patch });
    setFormError(null);
    setCanRetry(false);
    markEdited();
  }, [commitHeader, markEdited]);

  const pickDispatch = useCallback((id) => {
    const dsp = (ctxRef.current?.dispatches || []).find((x) => String(x.id) === String(id));
    const hdr = headerRef.current;
    if (!dsp) {
      patchHeader({ dispatchId: "" });
      return;
    }
    // Fill only what the receiver has not entered yet.
    const next = applyDispatch(dsp, entriesRef.current, hdr);
    if (next.entries !== entriesRef.current) commitEntries(next.entries);
    patchHeader(next.header);
  }, [commitEntries, patchHeader]);

  const scan = useReceiveScan({
    form: { entriesRef, ctxRef, patchLine },
    lines,
    lineById,
    pickDispatch,
    canLinkCodes: canSetupItems,
    router,
  });

  // ── Form initialisation ───────────────────────────────────────────────────
  /** Fresh form state for a loaded context. Returns the server draft it resumed (or null). */
  const initForm = useCallback((data, { ignoreDraft = false } = {}) => {
    const draft = ignoreDraft ? null : data.draft || null;
    const dispatchWanted = dispatchPendingRef.current;
    dispatchPendingRef.current = null; // a ?dispatch= applies to the first receipt only
    const { entries: nextEntries, header: nextHeader, note } = formFromContext(data, { draft, dispatchId: dispatchWanted });
    startSession(draft);
    editVersionRef.current = 0;
    touchedRef.current = false;
    commitEntries(nextEntries);
    commitHeader(nextHeader);
    commitDirty(false);
    setAttachments(draft?.attachments || []);
    setLineErrors({});
    setFormError(null);
    setCanRetry(false);
    setAttachError(null);
    setNotice(note);
    return draft;
  }, [startSession, commitEntries, commitHeader, commitDirty]);

  // ── Loading ───────────────────────────────────────────────────────────────
  const load = useCallback(async (hid) => {
    const seq = ++loadSeqRef.current;
    setView({ phase: "loading" });
    try {
      const data = await api.getContext(poId, hid);
      if (seq !== loadSeqRef.current || !mountedRef.current) return;
      ctxRef.current = data;
      setCtx(data);
      if (!data?.hotel) {
        const choices = data?.hotelChoices || [];
        if (choices.length === 1 && hid == null) {
          hotelIdRef.current = Number(choices[0].id);
          setHotelId(Number(choices[0].id));
          load(Number(choices[0].id));
          return;
        }
        setView(choices.length ? { phase: "pickHotel" } : { phase: "blocked", reason: "no_hotel", message: null });
        return;
      }
      hotelIdRef.current = Number(data.hotel.id);
      setHotelId(Number(data.hotel.id));
      const draft = initForm(data);
      setView({ phase: "ready" });
      const local = await restoreLocal(data, draft, seq);
      if (!local || seq !== loadSeqRef.current || !mountedRef.current) return;
      if (local.kind === "restored") {
        setNotice({ tone: "note", text: "Restored the entries you had not saved yet on this device." });
      } else if (local.grn) {
        setNotice({
          tone: "warn",
          text: `Your earlier receipt for this order was already posted${local.grn.grnNumber ? ` (${local.grn.grnNumber})` : ""}.`,
          grnId: local.grn.id ?? null,
        });
      } else if (!local.hasServerDraft) {
        setNotice({ tone: "note", text: "Your saved draft is no longer available." });
      }
    } catch (err) {
      if (seq !== loadSeqRef.current || !mountedRef.current) return;
      const info = errorInfo(err, "Could not load this purchase order.");
      if (info.code === "CONFLICT" && info.details.reason === "PO_NOT_RECEIVABLE") {
        const rs = info.details.receiptStatus;
        const reason = rs === "received" || rs === "closed_short" ? rs : "not_ready";
        setView({ phase: "blocked", reason, message: info.message });
      } else if (info.httpStatus === 404) {
        setView({ phase: "blocked", reason: "not_found", message: info.message });
      } else if (info.httpStatus === 403) {
        setView({ phase: "blocked", reason: "forbidden", message: info.message });
      } else {
        setView({ phase: "error", message: info.message });
      }
    }
  }, [poId, initForm, restoreLocal]);

  const initialHotelRef = useRef(hotelId);
  useEffect(() => {
    load(initialHotelRef.current);
  }, [load]);

  const chooseHotel = (id) => {
    const hid = Number(id);
    hotelIdRef.current = hid;
    setHotelId(hid);
    onHotelChange?.(hid);
    load(hid);
  };

  // ── Outcomes ──────────────────────────────────────────────────────────────
  const finishPosted = useCallback(async (grn) => {
    commitDirty(false);
    await session.clearLocal();
    session.rotateKey();
    if (!mountedRef.current) return;
    setNotice(null);
    setFormError(null);
    setCanRetry(false);
    setUomPrompt(null);
    setView({ phase: "posted", grn, warnings: Array.isArray(grn?.warnings) ? grn.warnings : [] });
    onPosted?.(grn);
  }, [session, commitDirty, onPosted]);

  /** The key turned out to be posted already, and not by this screen's entries: start over, keep them. */
  const showEarlier = useCallback((grn) => {
    session.rotateKey();
    commitDirty(true);
    session.saveLocalNow();
    if (!mountedRef.current) return;
    setAttachments([]); // they went with the posted receipt
    setConfirmOpen(false);
    setUomPrompt(null);
    setFormError(null);
    setCanRetry(false);
    setNotice({ tone: "warn", text: earlierPostMessage(grn), grnId: grn?.id ?? null });
  }, [session, commitDirty]);

  /**
   * The session key turned out to be posted already (an AlreadyPosted). Settled
   * once: if the key has moved on since, someone already did.
   */
  const settleSpent = useCallback((spent) => {
    if (spent.key != null && spent.key !== session.sessionKeyRef.current) return Promise.resolve();
    const grn = spent.postedGrn;
    return session.verdictFor(grn) === "ours" ? finishPosted(grn) : Promise.resolve(showEarlier(grn));
  }, [session, finishPosted, showEarlier]);
  useEffect(() => {
    settleSpentRef.current = settleSpent;
  });

  // ── Drafts ────────────────────────────────────────────────────────
  const onSaveDraftClick = async () => {
    try {
      const grn = await session.saveDraft({ force: true });
      if (grn) toast.success("Draft saved");
    } catch (err) {
      if (err instanceof AlreadyPosted) {
        await settleSpent(err);
        return;
      }
      setFormError(errorInfo(err, "Could not save the draft. Your entries are kept on this device.").message);
    }
  };

  const confirmDiscard = async () => {
    setDiscarding(true);
    try {
      await session.discard();
      if (!mountedRef.current) return;
      initForm(ctxRef.current, { ignoreDraft: true });
      setNotice({ tone: "note", text: "Draft discarded." });
    } catch (err) {
      if (err instanceof AlreadyPosted) await settleSpent(err);
      else if (mountedRef.current) setFormError(errorInfo(err, "Could not discard the draft. Try again.").message);
    } finally {
      if (mountedRef.current) {
        setDiscarding(false);
        setDiscardOpen(false);
      }
    }
  };

  // ── Unit conversion ───────────────────────────────────────────────────────
  const applyFactor = (factor) => {
    const p = uomPrompt;
    setUomPrompt(null);
    if (!p) return;
    let patch;
    if (p.mode === "mismatch") {
      // The item already has a conversion: send none and the server uses it
      // (no inventory.update needed). Keep it for scans.
      patch = { uomFactor: "", knownFactor: factorText(p.currentFactor) || null };
    } else {
      const text = factorText(factor);
      if (!text) return;
      patch = { uomFactor: text };
    }
    const prev = entriesRef.current;
    const next = { ...prev, [p.poLineId]: { ...prev[p.poLineId], ...patch } };
    commitEntries(next);
    setLineErrors((errs) => {
      const n = { ...errs };
      delete n[p.poLineId];
      return n;
    });
    markEdited();
    if (p.thenPost) runPost(next);
  };

  // ── Posting ───────────────────────────────────────────────────────────────
  const handlePostError = (err) => {
    const info = errorInfo(err, "Could not post this receipt. Try again.");
    const act = postErrorAction(info, { network: isNetworkError(err), lineById, canSetupItems });
    if (act.blocked) {
      setView({ phase: "blocked", ...act.blocked });
      return;
    }
    if (act.lineErrors) setLineErrors(act.lineErrors);
    if (act.formError) setFormError(act.formError);
    setCanRetry(!!act.retry);
    if (act.uomPrompt) setUomPrompt(act.uomPrompt);
  };

  // Queued: the outbox owns the post now. The device copy notePosting wrote
  // ({draftId, sessionKey, entries}) and the key stay, so reopening this
  // receipt settles it either way: landed → "already posted", refused → the
  // entries come back under the same key, still waiting → a re-post replays.
  const onQueued = (persisted = true) => {
    commitDirty(false);
    if (mountedRef.current) setView({ phase: "queued", persisted });
  };

  async function runPost(entriesOverride = null) {
    if (postingRef.current) return;
    const data = ctxRef.current;
    if (!data?.hotel) return;
    postingRef.current = true;
    setPosting(true);
    setFormError(null);
    setCanRetry(false);
    const input = buildGrnInput({
      poId: data.po.id,
      hotelId: data.hotel.id,
      header: headerRef.current,
      ctxLines: data.lines || [],
      entries: entriesOverride || entriesRef.current,
    });
    // The key is fixed before waiting on saves: a background save that finds
    // it spent is settled here, and a key that moved on means it was settled.
    const key = session.sessionKeyRef.current;
    let sent = false;
    try {
      await session.beforePost();
      if (session.sessionKeyRef.current !== key) return;
      await session.notePosting();
      const payload = { grnId: session.grnIdRef.current, clientEventId: key, input };
      sent = true;
      const outcome = await submitOrQueue({ kind: GRN_POST_KIND, clientEventId: key, payload, send: (p) => api.post(p) });
      if (outcome?.queued) {
        onQueued(outcome.persisted !== false);
        return;
      }
      const grn = postedGrnOf(outcome?.result);
      if (isFreshPost(grn) || session.verdictFor(grn) === "ours") await finishPosted(grn);
      else showEarlier(grn);
    } catch (err) {
      if (err instanceof AlreadyPosted) {
        await settleSpent(err);
      } else {
        if (sent && isNetworkError(err)) session.markLost(key);
        if (mountedRef.current) handlePostError(err);
      }
    } finally {
      postingRef.current = false;
      if (mountedRef.current) {
        setPosting(false);
        setConfirmOpen(false);
      }
    }
  }

  const requestPost = () => {
    if (postingRef.current) return;
    const errs = validateForPost(lines, entriesRef.current);
    if (errs) {
      const { form: formMsg, ...perLine } = errs;
      setLineErrors(perLine);
      setFormError(formMsg || "Fix the highlighted lines, then post.");
      setCanRetry(false);
      return;
    }
    setLineErrors({});
    setFormError(null);
    setCanRetry(false);
    setConfirmOpen(true);
  };

  // The sheet stays open (busy) until the post settles: a second tap is a no-op.
  const confirmPost = () => runPost();

  // ── Attachments ───────────────────────────────────────────────────────────
  const onUpload = async (file, kind) => {
    setAttachError(null);
    setUploading(true);
    try {
      let id = session.grnIdRef.current;
      if (!id) {
        const g = await session.saveDraft({ force: true });
        id = g?.id ?? session.grnIdRef.current;
      }
      const att = await api.uploadAttachment(id, file, kind);
      if (mountedRef.current && att) setAttachments((list) => [...list, att]);
    } catch (err) {
      if (err instanceof AlreadyPosted) {
        await settleSpent(err);
        return;
      }
      if (mountedRef.current) setAttachError(errorInfo(err, "Could not upload that file. Try again.").message);
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  };

  const onDeleteAttachment = async (att) => {
    const id = session.grnIdRef.current;
    if (!id) return;
    setAttachError(null);
    try {
      await api.deleteAttachment(id, att.id);
      setAttachments((list) => list.filter((a) => a.id !== att.id));
    } catch (err) {
      setAttachError(errorInfo(err, "Could not remove that file.").message);
    }
  };

  const changeHotel = async () => {
    if (dirtyRef.current) {
      try {
        await session.saveDraft();
      } catch {
        // The device copy still holds the entries.
      }
    }
    setView({ phase: "pickHotel" });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    let withQty = 0;
    let scanned = 0;
    for (const l of lines) {
      const e = entries[l.poLineId];
      if (!e) continue;
      const { received, rejected } = lineQty(e);
      if ((received || 0) > 0 || (rejected || 0) > 0) withQty += 1;
      if (e.scannedAt > 0) scanned += 1;
    }
    return { withQty, scanned };
  }, [lines, entries]);

  const cardOrder = useMemo(() => {
    const idx = new Map(lines.map((l, i) => [l.poLineId, i]));
    return [...lines].sort((a, b) => {
      const sa = entries[a.poLineId]?.scannedAt || 0;
      const sb = entries[b.poLineId]?.scannedAt || 0;
      if (sa !== sb) return sb - sa;
      return idx.get(a.poLineId) - idx.get(b.poLineId);
    });
  }, [lines, entries]);

  const overlayOpen = confirmOpen || discardOpen || !!scan.pad || !!uomPrompt || !!scan.unknownCode;
  const scanPaused = overlayOpen || posting;
  const canChangeHotel = (ctx?.hotelChoices?.length || 0) > 1;
  const canDiscard = session.draftId != null || dirty;

  const saveLabel = (() => {
    const st = session.saveState.status;
    if (st === "saving") return "Saving…";
    if (st === "error") return "Not saved yet";
    if (dirty) return "Unsaved changes";
    if (st === "saved") return "Draft saved";
    return null;
  })();

  // ── Render: non-form states ───────────────────────────────────────────────
  const frame = (body, { title = po?.poNumber, sub = null } = {}) => (
    <ReceiveFrame title={title} sub={sub}>{body}</ReceiveFrame>
  );

  if (view.phase === "loading") return frame(<LoadingState />, { title: null });
  if (view.phase === "error") {
    return frame(<ErrorState message={view.message} onRetry={() => load(hotelIdRef.current)} />);
  }
  if (view.phase === "blocked") {
    return frame(<BlockedState reason={view.reason} message={view.message} poId={po?.id ?? poId} />);
  }
  if (view.phase === "pickHotel") {
    return frame(<PickHotelState choices={ctx?.hotelChoices || []} onPick={chooseHotel} />, {
      sub: po?.vendorName ? <div className={styles.pageSub}>{po.vendorName}</div> : null,
    });
  }
  if (view.phase === "queued") return frame(<QueuedState pendingCount={pendingCount} persisted={view.persisted !== false} />);
  if (view.phase === "posted") {
    const canReceiveMore = lines.some((l) => subQty(l.openAtHotel, lineQty(entries[l.poLineId]).accepted || 0) > 0);
    return frame(
      <PostedState
        grn={view.grn}
        warnings={view.warnings}
        hotelName={hotel?.name}
        lineName={(id) => lineById.get(Number(id))?.productName}
        canReceiveMore={canReceiveMore}
        onReceiveMore={() => load(hotelIdRef.current)}
      />
    );
  }

  // ── Render: the receive form ──────────────────────────────────────────────

  const lineProps = (l) => ({
    line: l,
    entry: entries[l.poLineId],
    onChange: (patch) => editLine(l.poLineId, patch),
    // A scanner read typed into a qty box: the line as it was, scan count included.
    onRestore: (prev) => patchLine(l.poLineId, prev),
    error: lineErrors[l.poLineId] || null,
    flash: scan.flashId === l.poLineId,
    departments: ctx?.departments || [],
    allowItemSetup: canSetupItems,
    suggestions: ctx?.itemSuggestions?.[l.poLineId] || [],
    receivedAt: header.receivedAt,
    onOpenUom: canSetupItems
      ? () => setUomPrompt({ mode: "required", poLineId: l.poLineId, poUnit: l.unit, stockUom: l.stockUom, thenPost: false })
      : undefined,
  });

  const itemsCard = (
    <section className={styles.card} aria-labelledby="receive-items-title">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="receive-items-title">
          <span className={styles.cardIc}><ScanBarcode size={14} aria-hidden="true" /></span>
          Items
          <span className={styles.count}>{lines.length}</span>
        </h2>
        <span className={styles.saveState}>
          {counts.withQty} of {lines.length} entered{counts.scanned ? ` · ${counts.scanned} scanned` : ""}
        </span>
      </div>
      <div className={styles.scanDock} data-testid="scan-dock">
        <ScanInput
          context={`po:${po.id}`}
          onResolved={scan.onScanResolved}
          onUnknown={scan.onScanUnknown}
          disabled={scanPaused}
        />
      </div>
      {formError && (
        <div className={`${styles.formError} ${styles.formErrorRow}`} role="alert" style={{ marginTop: 14 }}>
          <span>{formError}</span>
          {canRetry && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
              onClick={() => runPost()}
              disabled={posting}
            >
              <RotateCcw size={13} aria-hidden="true" /> Retry posting
            </button>
          )}
        </div>
      )}
      {lines.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>Nothing is open on this PO at {hotel?.name || "this hotel"}</div>
        </div>
      ) : isMobile ? (
        <div className={styles.cardList}>
          {cardOrder.map((l) => (
            <ReceiveLineCard
              key={l.poLineId}
              {...lineProps(l)}
              onStep={(delta) => scan.stepLine(l, delta)}
              onOpenPad={() => scan.openSetPad(l)}
            />
          ))}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.linesTable} aria-label="Receive lines">
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th className={styles.num}>Open</th>
                <th className={styles.num}>Received</th>
                <th className={styles.num}>Accepted</th>
                <th className={styles.num}>Rejected</th>
                <th>Mark out</th>
              </tr>
            </thead>
            {lines.map((l, i) => (
              <ReceiveLineRow key={l.poLineId} index={i} {...lineProps(l)} />
            ))}
          </table>
        </div>
      )}
    </section>
  );

  const documentsCard = (
    <section className={styles.card} aria-labelledby="receive-docs-title">
      <div className={styles.cardHead}>
        <h2 className={styles.cardTitle} id="receive-docs-title">
          <span className={styles.cardIc}><FileText size={14} aria-hidden="true" /></span>
          Delivery documents
        </h2>
      </div>
      <div className={styles.cardBody}>
        <DeliveryDocuments
          header={header}
          onChange={patchHeader}
          dispatches={ctx?.dispatches || []}
          onPickDispatch={pickDispatch}
          attachments={attachments}
          onUpload={onUpload}
          onDelete={onDeleteAttachment}
          uploading={uploading}
        />
        {attachError && (
          <div className={styles.formError} role="alert" style={{ margin: "12px 0 0" }}>
            {attachError}
          </div>
        )}
      </div>
    </section>
  );

  const postLabel = (
    <>
      {posting ? <Loader2 size={15} className={styles.spin} aria-hidden="true" /> : <Send size={15} aria-hidden="true" />}
      Post receipt
    </>
  );

  const padLine = scan.pad ? lineById.get(Number(scan.pad.poLineId)) : null;
  const uomLine = uomPrompt ? lineById.get(Number(uomPrompt.poLineId)) : null;

  return (
    <div className={styles.page} onBlur={session.onFormBlur}>
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.headMain}>
            <ReceiveEyebrow />
            <h1 className={styles.pageTitle}>
              <span className={styles.titleMono}>{po.poNumber}</span>
              {po.isCallOff && <span className={`${styles.pill} ${styles.pillIndigo}`}>Call-off</span>}
            </h1>
            <div className={styles.pageSub}>
              {po.vendorName && <span>{po.vendorName}</span>}
              {po.vendorName && <span className={styles.subSep} aria-hidden="true">·</span>}
              <span>
                Receiving at <strong data-testid="receiving-hotel">{hotel.name}</strong>
              </span>
              {canChangeHotel && (
                <button type="button" className={styles.btnLink} onClick={changeHotel}>
                  Change hotel
                </button>
              )}
              {po.id != null && (
                <>
                  <span className={styles.subSep} aria-hidden="true">·</span>
                  <Link href={routes.po(po.id)} className={styles.btnLink}>Open PO</Link>
                </>
              )}
              {canDiscard && (
                <>
                  <span className={styles.subSep} aria-hidden="true">·</span>
                  <button
                    type="button"
                    className={`${styles.btnLink} ${styles.btnLinkDanger}`}
                    onClick={() => setDiscardOpen(true)}
                    disabled={posting}
                  >
                    Discard draft
                  </button>
                </>
              )}
            </div>
          </div>
          {!isMobile && (
            <div className={styles.headerActions}>
              {pendingCount > 0 && (
                <span className={`${styles.pill} ${styles.pillWarn}`}>{pendingCount} waiting to sync</span>
              )}
              {saveLabel && (
                <span className={styles.saveState} aria-live="polite">
                  {session.saveState.status === "saving" && <Loader2 size={12} className={styles.spin} aria-hidden="true" />}
                  {saveLabel}
                </span>
              )}
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={onSaveDraftClick}
                disabled={posting}
              >
                <Save size={14} aria-hidden="true" />
                Save draft
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSuccess}`}
                onClick={requestPost}
                disabled={posting || lines.length === 0}
              >
                {postLabel}
              </button>
            </div>
          )}
        </div>
      </section>

      <main className={styles.pageBody}>
        <div className={styles.stack}>
          <ReceiveNotice notice={notice} onDismiss={() => setNotice(null)} />
          {isMobile ? (
            <>
              {itemsCard}
              {documentsCard}
            </>
          ) : (
            <>
              {documentsCard}
              {itemsCard}
            </>
          )}
        </div>
      </main>

      {isMobile && (
        <MobileActionBar
          label="Receive actions"
          summary={
            <span>
              {counts.withQty} of {lines.length} lines entered
              {saveLabel ? ` · ${saveLabel}` : ""}
              {pendingCount > 0 ? ` · ${pendingCount} waiting to sync` : ""}
            </span>
          }
        >
          <MobileActionButton variant="secondary" onClick={onSaveDraftClick} disabled={posting}>
            <Save size={16} aria-hidden="true" />
            Save draft
          </MobileActionButton>
          <MobileActionButton variant="primary" onClick={requestPost} disabled={posting || lines.length === 0}>
            {postLabel}
          </MobileActionButton>
        </MobileActionBar>
      )}

      {confirmOpen && (
        <ReceiveConfirmModal
          show
          lines={lines}
          entries={entries}
          hotelName={hotel.name}
          receivedAt={header.receivedAt}
          busy={posting}
          onConfirm={confirmPost}
          onHide={() => setConfirmOpen(false)}
        />
      )}
      {discardOpen && (
        <DiscardDraftModal busy={discarding} onConfirm={confirmDiscard} onHide={() => setDiscardOpen(false)} />
      )}
      {scan.pad && padLine && (
        <QtyPad
          show
          title={padLine.productName}
          unit={padLine.unit}
          initial={scan.pad.initial}
          mode={scan.pad.mode}
          receivedSoFar={parseQty(entries[scan.pad.poLineId]?.received) ?? 0}
          openQty={padLine.openAtHotel}
          onDone={scan.onPadDone}
          onHide={scan.closePad}
        />
      )}
      {uomPrompt && uomLine && (
        <UomFactorPrompt
          show
          mode={uomPrompt.mode}
          productName={uomLine.productName}
          poUnit={uomPrompt.poUnit || uomLine.unit}
          stockUom={uomPrompt.stockUom || uomLine.stockUom}
          receivedQty={lineQty(entries[uomPrompt.poLineId]).received || 0}
          currentFactor={uomPrompt.currentFactor}
          suppliedFactor={uomPrompt.suppliedFactor}
          canSet={canSetupItems}
          busy={posting}
          submitLabel={uomPrompt.thenPost ? "Save and post" : "Use this conversion"}
          onSubmit={applyFactor}
          onHide={() => setUomPrompt(null)}
        />
      )}
      {scan.unknownCode && (
        <LinkUnknownCodeSheet
          show
          code={scan.unknownCode}
          poLines={lines}
          hotelId={hotel.id}
          onHide={scan.closeUnknown}
          onLinked={scan.onCodeLinked}
        />
      )}
    </div>
  );
};

export default ReceivePage;
