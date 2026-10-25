import { useCallback, useEffect, useRef, useState } from "react";
import {
  discardPending, getOutboxStatus, onOutboxOutcome, outboxReady, outcomeError, useFailedItems, useOutboxReady,
  usePendingItems,
} from "./outboxBridge";
import { clearQueuedOut, listQueuedOuts, loadQueuedOut, saveQueuedOut } from "./outSession";

// The signed-in user's mark-out sessions the outbox is holding (queued copies,
// see outSession.js), with what became of each. Only the outbox's own word
// counts:
//
//   "checking"   the stored queue hasn't loaded yet: nothing is decided
//   "pending"    waiting to sync (`item` is the outbox entry)
//   "sending"    being sent right now
//   "discarding" "Discard from this device" is under way: nothing is decided
//                until discardPending answers (its status flips first)
//   "failed"     the server refused it (`error`, errorInfo-shaped)
//   "uncertain"  the outbox doesn't know it ("unknown"), or it was dismissed or
//                discarded elsewhere: it may or may not be recorded
//   "sent"       synced: onSynced(copy, result|null) runs once and the copy goes
//
// A missing event is never read as sent.
//
// @returns {{loaded: boolean, entries: Array<{clientEventId, hotelId, copy, state, item, failed, error}>,
//            track(copy): Promise, forget(clientEventId): Promise, discard(entry): Promise<boolean>}}

export const OUT_KIND = "out_post";
/**
 * The outbox marks an event sent a moment before it reports the server's
 * answer. With the status already "sent" (that alone decides it synced), wait
 * this long for the answer, so the document number and the replay check can
 * use it; an event that synced while the page was closed has none.
 */
export const RESULT_GRACE_MS = 2000;

const useQueuedOuts = ({ userId, onSynced }) => {
  const ready = useOutboxReady();
  const pendingItems = usePendingItems(OUT_KIND);
  const failedItems = useFailedItems(OUT_KIND);
  const [hydrated, setHydrated] = useState(false);
  const [copies, setCopies] = useState([]);
  const [loadedFor, setLoadedFor] = useState(null);
  const [sent, setSent] = useState({}); // clientEventId -> {result}
  const [, setTick] = useState(0);
  const handlers = useRef({ onSynced });
  handlers.current = { onSynced };
  const revRef = useRef(0);
  const changedRef = useRef(new Map()); // clientEventId -> rev of its last track/forget here
  const handledRef = useRef(new Set());
  const graceRef = useRef(new Map()); // clientEventId -> timer
  const [graceOver, setGraceOver] = useState({}); // clientEventId -> true
  const [discarding, setDiscarding] = useState({}); // clientEventId -> true while discardPending runs

  useEffect(
    () => () => {
      graceRef.current.forEach((t) => clearTimeout(t));
      graceRef.current.clear();
    },
    []
  );

  useEffect(() => {
    let live = true;
    outboxReady().then(() => {
      if (live) setHydrated(true);
    });
    return () => {
      live = false;
    };
  }, []);

  // This user's copies, from the device.
  useEffect(() => {
    let cancelled = false;
    setLoadedFor(null);
    if (!userId) {
      setCopies([]);
      return undefined;
    }
    const startedAt = revRef.current;
    (async () => {
      const index = await listQueuedOuts(userId);
      const found = [];
      for (const e of index) {
        const copy = await loadQueuedOut(userId, e.clientEventId);
        if (copy) found.push(copy);
      }
      if (cancelled) return;
      setCopies((prev) => {
        // Anything tracked or forgotten here while the device was being read wins.
        const newer = (cid) => (changedRef.current.get(cid) || 0) > startedAt;
        const keep = found.filter((c) => !newer(c.clientEventId));
        const mine = prev.filter((c) => newer(c.clientEventId));
        return [...keep, ...mine];
      });
      setLoadedFor(userId);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Live outcomes: "sent" is the only word that clears a copy.
  useEffect(
    () =>
      onOutboxOutcome((ev) => {
        if (!ev || ev.kind !== OUT_KIND || ev.outcome !== "sent" || !ev.clientEventId) return;
        setSent((m) => ({ ...m, [ev.clientEventId]: { result: ev.result ?? null } }));
      }),
    []
  );

  const track = useCallback(
    async (copy) => {
      revRef.current += 1;
      changedRef.current.set(copy.clientEventId, revRef.current);
      handledRef.current.delete(copy.clientEventId);
      setSent((m) => {
        if (!m[copy.clientEventId]) return m;
        const next = { ...m };
        delete next[copy.clientEventId];
        return next;
      });
      setCopies((prev) => [...prev.filter((c) => c.clientEventId !== copy.clientEventId), copy]);
      await saveQueuedOut(userId, copy);
    },
    [userId]
  );

  const forget = useCallback(
    (clientEventId) => {
      revRef.current += 1;
      changedRef.current.set(clientEventId, revRef.current);
      setCopies((prev) => prev.filter((c) => c.clientEventId !== clientEventId));
      return clearQueuedOut(userId, clientEventId);
    },
    [userId]
  );

  const outboxLoaded = ready && hydrated;
  const entries = copies.map((copy) => {
    const cid = copy.clientEventId;
    const item = pendingItems.find((i) => i.clientEventId === cid) || null;
    const failed = failedItems.find((i) => i.clientEventId === cid) || null;
    let state;
    if (sent[cid]) state = "sent";
    else if (discarding[cid]) state = "discarding";
    else if (!outboxLoaded) state = "checking";
    else {
      const status = getOutboxStatus(OUT_KIND, cid);
      if (status === "sent") state = "sent";
      else if (status === "pending") state = item ? "pending" : "sending";
      else if (status === "failed") state = "failed";
      else state = "uncertain"; // "unknown" or "dismissed": no word that it was recorded
    }
    return {
      clientEventId: cid,
      hotelId: Number(copy.hotelId),
      copy,
      state,
      item,
      failed,
      error: state === "failed" ? outcomeError(failed?.error) : null,
      result: sent[cid]?.result ?? null,
    };
  });

  // Synced: hand it over once (with the server's answer when the outbox has
  // reported it), then drop the device copy.
  useEffect(() => {
    for (const e of entries) {
      const cid = e.clientEventId;
      if (e.state !== "sent" || handledRef.current.has(cid)) continue;
      if (!sent[cid] && !graceOver[cid]) {
        if (!graceRef.current.has(cid)) {
          graceRef.current.set(
            cid,
            setTimeout(() => {
              graceRef.current.delete(cid);
              setGraceOver((m) => ({ ...m, [cid]: true }));
            }, RESULT_GRACE_MS)
          );
        }
        continue;
      }
      clearTimeout(graceRef.current.get(cid));
      graceRef.current.delete(cid);
      handledRef.current.add(cid);
      forget(cid);
      handlers.current.onSynced?.(e.copy, e.result);
    }
  });

  /** "Discard from this device": false when it was sent (or settled) meanwhile. */
  const discard = useCallback(
    async (entry) => {
      if (!entry?.item?.id) return false;
      const cid = entry.clientEventId;
      // While the outbox answers, the entry's status may already read
      // "dismissed": hold it so it isn't taken for an unaccounted-for session.
      setDiscarding((m) => ({ ...m, [cid]: true }));
      const done = () =>
        setDiscarding((m) => {
          const next = { ...m };
          delete next[cid];
          return next;
        });
      let ok = false;
      try {
        ok = await discardPending(entry.item.id);
        if (ok) await forget(cid);
      } finally {
        done();
        if (!ok) setTick((n) => n + 1); // read its status again
      }
      return ok;
    },
    [forget]
  );

  return { loaded: !!userId && loadedFor === userId && outboxLoaded, entries, track, forget, discard };
};

export default useQueuedOuts;
