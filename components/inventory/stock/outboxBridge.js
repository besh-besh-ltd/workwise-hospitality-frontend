import { useEffect, useRef } from "react";
import * as outbox from "@/components/inventory/offline/outbox";
import { errorInfo } from "./stockUtils";

// The stock screens' view of the offline outbox (components/inventory/offline/outbox.js,
// owned by task D3). Today that module is an online-only stub exporting
// `submitOrQueue` and `usePendingCount`; D3 adds the rest. Everything here is
// looked up by name at run time, so this file works against the stub now and
// against the real queue later, without a change on either side.
//
// Assumed D3 interface (anything missing falls back as noted):
//   submitOrQueue({kind, clientEventId, payload, send}) -> {queued, result}
//   usePendingCount(kind?) -> number                     (fallback: 0)
//   useFailedItems(kind?)  -> [{id, kind, clientEventId, payload, error}]
//                                                        (fallback: [])
//   dismissFailed(id)                                    (fallback: no-op)
//   onOutboxOutcome(listener) -> unsubscribe             (fallback: never fires)
//     listener({clientEventId, kind, outcome: "sent"|"failed", error?, result?})
//   `error` may be an axios-style error, an {httpStatus, code, details, message}
//   object or a string; outcomeError() turns any of them into the latter.

const fn = (name) => (typeof outbox[name] === "function" ? outbox[name] : null);

const EMPTY = Object.freeze([]);
const zero = () => 0;
const none = () => EMPTY;
const noop = () => {};

export const submitOrQueue = (args) => {
  const impl = fn("submitOrQueue");
  if (impl) return impl(args);
  return Promise.resolve(args.send(args.payload)).then((result) => ({ queued: false, result }));
};

// The hook implementations are fixed per module load, so every render calls
// the same hooks in the same order.
const pendingImpl = fn("usePendingCount") || zero;
const failedImpl = fn("useFailedItems") || none;

/** Events of `kind` still waiting to sync on this device. */
export const usePendingCount = (kind) => {
  const n = pendingImpl(kind);
  return Number.isFinite(Number(n)) ? Number(n) : 0;
};

/** Events of `kind` the server refused after they were queued. */
export const useFailedItems = (kind) => {
  const list = failedImpl(kind);
  return Array.isArray(list) ? list : EMPTY;
};

export const dismissFailed = (id) => (fn("dismissFailed") || noop)(id);

export const onOutboxOutcome = (listener) => {
  const impl = fn("onOutboxOutcome");
  if (!impl) return noop;
  const off = impl(listener);
  return typeof off === "function" ? off : noop;
};

/** A refusal from the outbox, in errorInfo's shape. */
export const outcomeError = (error, fallback = "The server refused this session.") => {
  if (!error) return { httpStatus: null, code: null, details: {}, message: fallback };
  if (typeof error === "string") return { httpStatus: null, code: null, details: {}, message: error };
  if (error.response || error.isAxiosError || error.message?.response) return errorInfo(error, fallback);
  return {
    httpStatus: error.httpStatus ?? error.status ?? null,
    code: error.code || null,
    details: error.details && typeof error.details === "object" ? error.details : {},
    message: typeof error.message === "string" && error.message ? error.message : fallback,
  };
};

const eventIdOf = (item) => item?.clientEventId ?? item?.payload?.clientEventId ?? null;

// With no outcome event to go on, a queued event counts as sent once the
// pending count for its kind has read 0 for this long with no refusal for it.
export const SETTLE_MS = 1500;

/**
 * Watch one queued event until the outbox settles it.
 *
 *   onSent(result?)       it reached the server (outcome "sent", or the pending
 *                          count for `kind` stayed at 0 for SETTLE_MS)
 *   onFailed(info, item)  the server refused it; `info` is errorInfo-shaped.
 *                          The failed entry is dismissed from the outbox, since
 *                          the caller now holds it again.
 *
 * Does nothing while `clientEventId` is null.
 */
export const useQueuedOutcome = ({ kind, clientEventId, onSent, onFailed }) => {
  const pending = usePendingCount(kind);
  const failed = useFailedItems(kind);
  const handlers = useRef({ onSent, onFailed });
  handlers.current = { onSent, onFailed };
  const settledRef = useRef(null);

  useEffect(() => {
    settledRef.current = null;
  }, [clientEventId]);

  const settle = (how, a, b) => {
    if (!clientEventId || settledRef.current === clientEventId) return;
    settledRef.current = clientEventId;
    if (how === "sent") handlers.current.onSent?.(a);
    else handlers.current.onFailed?.(a, b);
  };

  // A refusal the outbox kept (also covers one that happened while this page was closed).
  const refused = clientEventId ? failed.find((f) => eventIdOf(f) === clientEventId) || null : null;
  useEffect(() => {
    if (!refused) return;
    settle("failed", outcomeError(refused.error), refused);
    if (refused.id != null) dismissFailed(refused.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refused]);

  // Live outcomes.
  useEffect(() => {
    if (!clientEventId) return undefined;
    return onOutboxOutcome((ev) => {
      if (!ev || ev.clientEventId !== clientEventId) return;
      if (ev.outcome === "sent") settle("sent", ev.result);
      else if (ev.outcome === "failed") settle("failed", outcomeError(ev.error), ev);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientEventId]);

  // Fallback: the queue for this kind has drained and nothing was refused.
  useEffect(() => {
    if (!clientEventId || pending > 0 || refused) return undefined;
    const t = setTimeout(() => settle("sent"), SETTLE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientEventId, pending, refused]);

  return { pending };
};
