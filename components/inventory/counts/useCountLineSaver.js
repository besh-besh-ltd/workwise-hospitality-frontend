import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { saveCountLines } from "@/services/inventory";
import { submitOrQueue, usePendingCount } from "@/components/inventory/offline/outbox";
import { getApiErrorMessage } from "@/utils/apiError";
import { errorInfo, newClientEventId, plural } from "./countUtils";

// The save engine of the counting screen.
//
// Each figure is saved a moment after the last keystroke via the outbox (kind
// `count_lines`), one clientEventId per line save: a retry of the same figure
// reuses it (the server answers a replay as success), a new figure gets a new
// one. At most one save is in flight; figures typed meanwhile go in the next.
//
// Line entries (only for lines touched in this session), keyed by invItemId:
//   blank    field cleared; nothing to send, the saved figure stands
//   invalid  not a quantity; nothing to send
//   dirty    waiting for the debounce
//   saving   in flight with `eventId`
//   queued   kept by the outbox until it syncs
//   error    refused or not delivered; `retry` when re-sending can help
// A line with no entry shows what the server's count carries.

export const SAVE_DEBOUNCE_MS = 700;
const MAX_LINES_PER_SAVE = 500;
const QTY_RE = /^(\d+(\.\d{0,4})?|\.\d{1,4})$/;

/** A counted quantity typed by hand, or null when it is not one. */
export const parseQty = (text) => {
  const s = String(text ?? "").trim();
  if (!QTY_RE.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export const PENDING = new Set(["dirty", "saving", "queued", "error", "invalid"]);
export const COUNTED = new Set(["saved", "dirty", "saving", "queued"]);
const UNSAVED = new Set(["dirty", "saving", "error", "invalid"]);
const BROKEN = new Set(["error", "invalid"]);

// A line save that lands after the count left `open` is final (PUT lines answers CONFLICT {status}).
const CLOSED_MESSAGE = {
  submitted: "This count was already submitted",
  approved: "This count was already approved",
  cancelled: "This count was cancelled",
};

/** A replayed save answers `{...Count, replayed:true, no_op:true}`: keep the Count. */
export const stripFlags = (c) => {
  if (!c || typeof c !== "object") return c;
  const out = { ...c };
  delete out.replayed;
  delete out.no_op;
  return out;
};

const asCount = (c) => (c && typeof c === "object" && Array.isArray(c.lines) ? stripFlags(c) : null);

/**
 * @param {object} args
 * @param {object} args.count          the count as the page holds it
 * @param {Function} args.onCountChange the page takes a newer count from a save
 * @param {Function} args.onReload     the page fetches the count again; resolves the fresh Count, or null when
 *                                     the answer was dropped (a newer save landed meanwhile) or failed
 * @param {Function} [args.onReloaded] told the fresh count (or null) after every reload
 * @param {boolean} [args.guard]       warn before leaving with figures that are not saved
 */
const useCountLineSaver = ({ count, onCountChange, onReload, onReloaded, guard = false }) => {
  const [entries, setEntries] = useState({});
  const entriesRef = useRef(entries);
  const countRef = useRef(count);
  const timerRef = useRef(null);
  const inFlightRef = useRef(null);
  const againRef = useRef(false);
  const closedRef = useRef(false); // the server said this count is no longer open: nothing more to save
  const flushRef = useRef(() => Promise.resolve());
  const props = useRef({});
  props.current = { onCountChange, onReload, onReloaded };

  const update = useCallback((fn) => {
    entriesRef.current = fn(entriesRef.current);
    setEntries(entriesRef.current);
  }, []);

  // ── Queued figures ─────────────────────────────────────────────────────────
  /**
   * Queued figures the server's count now carries are saved. With `final` (the
   * outbox is empty) any figure still missing was never applied: it becomes an
   * error with Retry, which re-sends it under the same key.
   */
  const settleQueued = useCallback(
    (server, final) => {
      if (!server) return;
      const have = new Map(server.lines.map((l) => [Number(l.invItemId), l.countedQty]));
      update((cur) => {
        let out = cur;
        for (const [id, e] of Object.entries(cur)) {
          if (e.status !== "queued") continue;
          const q = have.get(Number(id));
          if (q != null && Number(q) === parseQty(e.draft)) {
            if (out === cur) out = { ...cur };
            delete out[id];
          } else if (final) {
            if (out === cur) out = { ...cur };
            out[id] = { ...e, status: "error", error: "Not saved: the sync did not go through", retry: true };
          }
        }
        return out;
      });
    },
    [update]
  );

  // Count saves the outbox still holds, from this visit or an earlier one. Only
  // this kind: a stuck receipt or mark-out must not hold up a count.
  const pending = Number(usePendingCount("count_lines")) || 0;
  const pendingRef = useRef(pending);

  // A newer count: queued figures it carries are saved; once the outbox holds
  // no count saves, one it still lacks was given up on and offers Retry.
  useEffect(() => {
    countRef.current = count;
    settleQueued(asCount(count), pendingRef.current === 0);
  }, [count, settleQueued]);

  /** Fetch the count again; resolves the fresh Count, or null. */
  const reload = useCallback(async () => {
    const fresh = asCount(await Promise.resolve(props.current.onReload?.()).catch(() => null));
    if (fresh) countRef.current = fresh;
    props.current.onReloaded?.(fresh);
    return fresh;
  }, []);

  /** Ask the server what it has now, then settle the queued figures against it. */
  const recheckQueued = useCallback(async () => {
    const hadQueued = Object.values(entriesRef.current).some((e) => e.status === "queued");
    const fresh = await reload();
    if (fresh && fresh.status && fresh.status !== "open") {
      // Submitted (or cancelled) elsewhere before these figures synced: they can't be saved now.
      if (hadQueued && !closedRef.current) toast.error(CLOSED_MESSAGE[fresh.status] || CLOSED_MESSAGE.submitted);
      closedRef.current = true;
      clearTimeout(timerRef.current);
      update(() => ({}));
      return;
    }
    settleQueued(fresh, pendingRef.current === 0);
  }, [reload, settleQueued, update]);

  // The outbox syncs on its own (back online, "Sync now"). Whenever it sends
  // count saves, see what the server has now: figures queued here settle, and
  // ones queued on an earlier visit show up.
  useEffect(() => {
    const before = pendingRef.current;
    pendingRef.current = pending;
    if (pending < before) recheckQueued();
  }, [pending, recheckQueued]);

  // ── Saving ─────────────────────────────────────────────────────────────────
  const settleSaved = (batch, next) => {
    const fresh = asCount(next);
    if (fresh) {
      countRef.current = fresh;
      props.current.onCountChange?.(fresh);
    }
    update((cur) => {
      const out = { ...cur };
      for (const l of batch) {
        const e = out[l.invItemId];
        if (e && e.status === "saving" && e.eventId === l.clientEventId) delete out[l.invItemId];
      }
      return out;
    });
  };

  const markBatch = (batch, patchFor) =>
    update((cur) => {
      const out = { ...cur };
      batch.forEach((l, index) => {
        const e = out[l.invItemId];
        if (!e || e.eventId !== l.clientEventId || e.status !== "saving") return; // edited since
        const patch = patchFor(l, index);
        if (patch) out[l.invItemId] = { ...e, ...patch };
      });
      return out;
    });

  const failBatch = (batch, err) => {
    const { httpStatus, code, details } = errorInfo(err);
    const message = getApiErrorMessage(err, "Not saved. Try again.");
    let resend = false;

    if (httpStatus === null) {
      markBatch(batch, () => ({ status: "error", error: "Not saved: no connection", retry: true }));
    } else if (code === "VALIDATION" && details.index != null && batch[details.index]) {
      // One bad line sinks the whole save; send the others again on their own.
      markBatch(batch, (l, i) =>
        i === Number(details.index) ? { status: "error", error: message, retry: false } : { status: "dirty" }
      );
      resend = true;
    } else if (code === "CONFLICT" && details.countId != null) {
      const clash = new Set((details.invItemIds || []).map(Number));
      const named = batch.some((l) => clash.has(l.invItemId));
      const other = { id: details.countId, number: details.countNumber };
      markBatch(batch, (l) =>
        !named || clash.has(l.invItemId)
          ? { status: "error", error: "Already being counted in", other, retry: false }
          : { status: "dirty" }
      );
      resend = named;
    } else if (code === "CONFLICT") {
      // The count left `open` (submitted, approved or cancelled) before this save landed. That is
      // final: drop every unsaved figure (none can be saved now), say so once, and reload.
      if (!closedRef.current) toast.error(CLOSED_MESSAGE[details.status] || message);
      closedRef.current = true;
      clearTimeout(timerRef.current);
      update(() => ({}));
      reload();
    } else if (code === "NOT_FOUND" || code === "FORBIDDEN" || httpStatus === 403 || httpStatus === 404) {
      // The count is gone or no longer ours to count: say so on the lines and
      // reload, so the page shows what is true now.
      markBatch(batch, () => ({ status: "error", error: message, retry: false }));
      reload();
    } else {
      markBatch(batch, () => ({ status: "error", error: message, retry: httpStatus >= 500 }));
    }
    if (resend) againRef.current = true;
  };

  const flush = () => {
    clearTimeout(timerRef.current);
    if (closedRef.current) return Promise.resolve();
    if (inFlightRef.current) {
      againRef.current = true;
      return inFlightRef.current;
    }
    const countId = countRef.current?.id;
    const batch = [];
    for (const [key, e] of Object.entries(entriesRef.current)) {
      if (e.status !== "dirty") continue;
      const qty = parseQty(e.draft);
      if (qty === null) continue;
      if (batch.length >= MAX_LINES_PER_SAVE) {
        againRef.current = true;
        break;
      }
      batch.push({ invItemId: Number(key), countedQty: qty, clientEventId: e.eventId || newClientEventId() });
    }
    if (!batch.length || !countId) return Promise.resolve();

    update((cur) => {
      const out = { ...cur };
      for (const l of batch) out[l.invItemId] = { ...out[l.invItemId], status: "saving", eventId: l.clientEventId, error: null };
      return out;
    });

    const run = (async () => {
      try {
        const res = await submitOrQueue({
          kind: "count_lines",
          clientEventId: newClientEventId(),
          payload: { countId, lines: batch },
          send: (p) => saveCountLines(p.countId, p.lines),
        });
        if (res?.queued) markBatch(batch, () => ({ status: "queued" }));
        else settleSaved(batch, res?.result);
      } catch (err) {
        failBatch(batch, err);
      } finally {
        inFlightRef.current = null;
        if (againRef.current) {
          againRef.current = false;
          flushRef.current();
        }
      }
    })();
    inFlightRef.current = run;
    return run;
  };
  flushRef.current = flush;

  const schedule = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => flushRef.current(), SAVE_DEBOUNCE_MS);
  };

  /** Send everything typed so far and wait until nothing is in flight. */
  const settleAll = async () => {
    clearTimeout(timerRef.current);
    for (let i = 0; i < 6; i += 1) {
      if (inFlightRef.current) await inFlightRef.current;
      const dirty = Object.values(entriesRef.current).some((e) => e.status === "dirty");
      if (!dirty && !inFlightRef.current) return;
      await flushRef.current();
    }
  };

  // ── Editing ────────────────────────────────────────────────────────────────
  const setDraft = (id, text) => {
    const blank = String(text).trim() === "";
    const qty = parseQty(text);
    update((cur) => ({
      ...cur,
      [id]: {
        draft: text,
        eventId: null,
        status: blank ? "blank" : qty === null ? "invalid" : "dirty",
        error: !blank && qty === null ? "Enter 0 or more" : null,
        retry: false,
      },
    }));
    schedule();
  };

  /** Put a line back as it was (a wedge scan typed into its box); no snapshot = untouched. */
  const restoreEntry = (id, snapshot) =>
    update((cur) => {
      const out = { ...cur };
      if (!snapshot) delete out[id];
      else out[id] = snapshot.status === "saving" ? { ...snapshot, status: "dirty" } : snapshot;
      return out;
    });

  /** Leaving a box: a cleared box shows the saved figure again; anything typed goes now. */
  const leaveLine = (id) => {
    if (entriesRef.current[id]?.status === "blank") restoreEntry(id, null);
    if (Object.values(entriesRef.current).some((x) => x.status === "dirty")) flushRef.current();
  };

  /** Forget a line's unsaved figure (a found item taken off again). */
  const drop = (id) =>
    update((cur) => {
      if (!cur[id]) return cur;
      const out = { ...cur };
      delete out[id];
      return out;
    });

  const retry = (id) => {
    update((cur) => (cur[id] ? { ...cur, [id]: { ...cur[id], status: "dirty", error: null } } : cur));
    flushRef.current();
  };

  const retryAll = () => {
    update((cur) => {
      const out = { ...cur };
      for (const [k, e] of Object.entries(out)) if (e.status === "error" && e.retry) out[k] = { ...e, status: "dirty", error: null };
      return out;
    });
    flushRef.current();
  };

  // ── Leaving ────────────────────────────────────────────────────────────────
  // Leaving the screen sends what is typed.
  useEffect(
    () => () => {
      clearTimeout(timerRef.current);
      if (Object.values(entriesRef.current).some((e) => e.status === "dirty")) flushRef.current();
    },
    []
  );

  // Closing the tab while figures are not saved asks first.
  const hasUnsaved = guard && Object.values(entries).some((e) => UNSAVED.has(e.status));
  useEffect(() => {
    if (!hasUnsaved || typeof window === "undefined") return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  // An in-app navigation while figures failed or are not quantities asks too
  // (pending ones are sent on the way out; queued ones stay in the outbox).
  const router = useRouter();
  const hasBroken = guard && Object.values(entries).some((e) => BROKEN.has(e.status));
  useEffect(() => {
    if (!hasBroken || !router?.events) return undefined;
    const onRouteChangeStart = () => {
      const n = Object.values(entriesRef.current).filter((e) => BROKEN.has(e.status)).length;
      if (!n || window.confirm(`${plural(n, "quantity", "quantities")} on this count not saved. Leave this page and lose ${n === 1 ? "it" : "them"}?`)) {
        return;
      }
      router.events.emit("routeChangeError");
      // Next.js has no cancellable route event; throwing is the documented way to abort.
      throw new Error("Route change aborted: unsaved count quantities");
    };
    router.events.on("routeChangeStart", onRouteChangeStart);
    return () => router.events.off("routeChangeStart", onRouteChangeStart);
  }, [hasBroken, router]);

  return {
    entries,
    entriesRef,
    countRef,
    pendingRef,
    setDraft,
    restoreEntry,
    leaveLine,
    drop,
    flush: () => flushRef.current(),
    settleAll,
    retry,
    retryAll,
    reload,
    recheckQueued,
  };
};

export default useCountLineSaver;
