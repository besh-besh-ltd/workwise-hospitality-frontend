import { errorInfo } from "./stockUtils";
import * as outbox from "@/components/inventory/offline/outbox";

// The stock screens' view of the offline outbox (components/inventory/offline/outbox.js,
// owned by task D3). Every export is looked up by name at run time, so this file
// works against the online-only stub and against D3's queue without a change on
// either side.
//
// D3 interface used (anything missing falls back as noted):
//   submitOrQueue({kind, clientEventId, payload, send, summary}) -> {queued, persisted?} | {queued:false, result}
//                                                   (fallback: send now, never queue)
//   useOutboxReady() -> boolean                      (fallback: true)
//   outboxReady() -> Promise                         (fallback: resolved)
//   getOutboxStatus(kind, clientEventId)
//     -> "pending" | "failed" | "sent" | "dismissed" | "unknown"   (fallback: "unknown")
//   usePendingItems(kind) -> [{id, kind, clientEventId, payload, summary, createdAt, attempts, lastError, persisted}]
//                                                    (fallback: [])
//   useFailedItems(kind)  -> [{id, kind, clientEventId, payload, summary, error, createdAt, failedAt}]
//                                                    (fallback: [])
//   dismissFailed(id)                                (fallback: no-op)
//   discardPending(id) -> Promise<boolean>           (fallback: false)
//   onOutboxOutcome(listener) -> unsubscribe         (fallback: never fires)
//     listener({id, clientEventId, kind, outcome: "sent"|"failed"|"discarded", result?, error?})
//
// Nothing here ever reads success from the absence of an event: only "sent"
// (status or outcome) means the server has it. "unknown" and "dismissed" mean
// this device can't say, and the screens treat that as uncertain.

const fn = (name) => (typeof outbox[name] === "function" ? outbox[name] : null);

const EMPTY = Object.freeze([]);
const none = () => EMPTY;
const yes = () => true;
const noop = () => {};

export const submitOrQueue = (args) => {
  const impl = fn("submitOrQueue");
  if (impl) return impl(args);
  return Promise.resolve(args.send(args.payload)).then((result) => ({ queued: false, result }));
};

// The hook implementations are fixed per module load, so every render calls
// the same hooks in the same order.
const readyImpl = fn("useOutboxReady") || yes;
const pendingItemsImpl = fn("usePendingItems") || none;
const failedImpl = fn("useFailedItems") || none;

/** True once the queue stored on this device has loaded. */
export const useOutboxReady = () => readyImpl() !== false;

/** Resolves once the queue stored on this device has loaded. */
export const outboxReady = () => {
  const impl = fn("outboxReady");
  return impl ? Promise.resolve(impl()).then(() => undefined, () => undefined) : Promise.resolve();
};

const STATUSES = new Set(["pending", "failed", "sent", "dismissed", "unknown"]);

/** What became of one event on this device, for the signed-in user. */
export const getOutboxStatus = (kind, clientEventId) => {
  const impl = fn("getOutboxStatus");
  if (!impl || !clientEventId) return "unknown";
  const status = impl(kind, clientEventId);
  return STATUSES.has(status) ? status : "unknown";
};

/** The signed-in user's events of `kind` waiting to sync. */
export const usePendingItems = (kind) => {
  const list = pendingItemsImpl(kind);
  return Array.isArray(list) ? list : EMPTY;
};

/** The signed-in user's events of `kind` the server refused (or that were given up on). */
export const useFailedItems = (kind) => {
  const list = failedImpl(kind);
  return Array.isArray(list) ? list : EMPTY;
};

export const dismissFailed = (id) => Promise.resolve((fn("dismissFailed") || noop)(id)).catch(() => false);

/** Throw a waiting event away: true when it will not be sent, false when it was sent or settled meanwhile. */
export const discardPending = (id) => {
  const impl = fn("discardPending");
  if (!impl) return Promise.resolve(false);
  return Promise.resolve(impl(id)).then((ok) => ok === true, () => false);
};

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
  if (error.isAxiosError || error.message?.response || (error.response && error.httpStatus === undefined)) {
    return errorInfo(error, fallback);
  }
  return {
    httpStatus: error.httpStatus ?? error.status ?? error.response?.status ?? null,
    code: error.code || error.response?.data?.code || null,
    details: error.details && typeof error.details === "object" ? error.details : {},
    message: typeof error.message === "string" && error.message ? error.message : fallback,
  };
};
