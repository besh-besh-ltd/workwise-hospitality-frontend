// The scan-screen outbox: posts from the receive, mark-out and count screens
// survive a dropped connection. Callers post through `submitOrQueue`; when the
// device is offline, or the request gets no HTTP answer, the event is kept on
// the device (IndexedDB) and sent later, oldest first, by `flush`.
//
// Rules
//   - Storage: our OWN IndexedDB database (OUTBOX_DB_NAME). C1's
//     `workwise-inventory` database (receive drafts, mark-out sessions) is
//     never opened here, so its version is never touched. Without IndexedDB
//     (old browsers, private mode, jsdom) the queue lives in memory only.
//   - Owner: every event is tagged with the signed-in user's id
//     (redux `userProfile.id`). Only that user's events are counted, listed or
//     sent, so nothing is ever replayed under someone else's session. With no
//     signed-in user (token / site-rep pages) nothing is queued: the call sends
//     online-only and a token never lands on the device.
//   - Kinds: one sender per kind, registered in one place (DEFAULT_SENDERS,
//     extendable with registerSender). A kind with no sender throws.
//   - FIFO per kind: while an event of a kind is waiting, a new event of that
//     kind queues BEHIND it instead of being sent directly, so an older
//     count_lines save is never applied after a newer one. Sends of one kind
//     never overlap.
//   - Outcomes of a queued event:
//       2xx (including `replayed:true`)  sent: removed from the queue.
//       4xx                              final: kept as a failed item (kind,
//                                        summary, server message, time and the
//                                        original payload) until dismissed.
//       5xx, no answer, timeout          kept queued, retried with backoff.
//   - Inline (first) send: a refusal is rethrown to the caller as the RAW error
//     the sender threw, so errorInfo(err) keeps `code` and `details`. Only "no
//     answer" (offline, timeout, dropped connection) and gateway errors
//     (502/503/504: the app server may have applied it) are queued.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createGrn, postOut, saveCountLines } from "@/services/inventory";
import { store } from "@/redux/store";
import { getApiErrorMessage } from "@/utils/apiError";

export const OUTBOX_DB_NAME = "workwise-inventory-outbox";
const DB_VERSION = 1;
const STORE_NAME = "events";

/** A send with no answer after this long counts as "no answer" (axios gives up at 30s). */
const DEFAULT_SEND_TIMEOUT_MS = 60000;
const RETRY_BASE_MS = 5000;
const RETRY_MAX_MS = 5 * 60 * 1000;
const GATEWAY_STATUSES = new Set([502, 503, 504]);

export const OUTBOX_KIND_LABELS = Object.freeze({
  grn_post: "Receipt",
  out_post: "Mark out",
  count_lines: "Count",
});

// ── Senders ──────────────────────────────────────────────────────────────────
// Payloads:
//   grn_post     {grnId|null, clientEventId, input}  -> POST /grn {...input, post:true, clientEventId}
//   out_post     the full POST /out body, with clientEventId
//   count_lines  {countId, lines:[{invItemId, countedQty, clientEventId}]}
const DEFAULT_SENDERS = Object.freeze({
  grn_post: ({ clientEventId, input }) => createGrn({ ...input, post: true, clientEventId }),
  out_post: (payload) => postOut(payload),
  count_lines: ({ countId, lines }) => saveCountLines(countId, lines),
});

const senders = new Map(Object.entries(DEFAULT_SENDERS));

/**
 * Register (or replace) the sender for a kind. Returns a function that puts
 * the previous sender back.
 * @param {string} kind
 * @param {(payload: any) => Promise<any>} send
 * @returns {() => void}
 */
export const registerSender = (kind, send) => {
  if (!kind || typeof kind !== "string") throw new TypeError("registerSender needs a kind");
  if (typeof send !== "function") throw new TypeError(`registerSender("${kind}") needs a function`);
  const previous = senders.get(kind);
  senders.set(kind, send);
  return () => {
    if (senders.get(kind) !== send) return;
    if (previous) senders.set(kind, previous);
    else senders.delete(kind);
  };
};

// ── State ────────────────────────────────────────────────────────────────────
const EMPTY = Object.freeze([]);
let items = EMPTY; // every stored event, oldest first
let lastSeq = 0;
let sendTimeoutMs = DEFAULT_SEND_TIMEOUT_MS;
const listeners = new Set();
const outcomeListeners = new Set();
const chains = new Map();

const commit = (next) => {
  items = next;
  listeners.forEach((l) => l());
};
const bySeq = (a, b) => a.seq - b.seq;
const nextSeq = () => {
  lastSeq = Math.max(Date.now(), lastSeq + 1);
  return lastSeq;
};
const itemId = (kind, clientEventId) => `${kind}:${clientEventId}`;

const currentUserId = () => {
  try {
    const id = store.getState()?.userProfile?.id;
    return id === undefined || id === null || id === "" ? null : String(id);
  } catch {
    return null;
  }
};

const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

// ── IndexedDB (write-through; memory is the source of truth while the page lives) ──
let dbPromise = null;
let hydration = null;
let warned = false;

const warnOnce = (err) => {
  if (warned) return;
  warned = true;
  // eslint-disable-next-line no-console
  console.warn("Inventory outbox: device storage unavailable, keeping the queue in memory", err);
};

const openDb = () => {
  if (typeof indexedDB === "undefined" || !indexedDB) return Promise.resolve(null);
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      let req;
      try {
        req = indexedDB.open(OUTBOX_DB_NAME, DB_VERSION);
      } catch (err) {
        warnOnce(err);
        resolve(null);
        return;
      }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "id" });
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        warnOnce(req.error);
        resolve(null);
      };
      req.onblocked = () => resolve(null);
    });
  }
  return dbPromise;
};

/** Run `fn(objectStore, setResult)` in one transaction; resolves on complete. */
const withStore = async (mode, fn) => {
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve, reject) => {
    let result;
    const t = db.transaction(STORE_NAME, mode);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
    fn(t.objectStore(STORE_NAME), (v) => {
      result = v;
    });
  });
};

const persist = async (op, value) => {
  try {
    await withStore("readwrite", (os) => (op === "put" ? os.put(value) : os.delete(value)));
  } catch (err) {
    warnOnce(err);
  }
};

/** Load what an earlier page left on the device (once per page load). */
const hydrate = () => {
  if (!hydration) {
    hydration = (async () => {
      try {
        const rows = await withStore("readonly", (os, set) => {
          const req = os.getAll();
          req.onsuccess = () => set(req.result || []);
        });
        if (!Array.isArray(rows) || !rows.length) return;
        const known = new Set(items.map((i) => i.id));
        const merged = [...items, ...rows.filter((r) => r && r.id && !known.has(r.id))].sort(bySeq);
        for (const i of merged) lastSeq = Math.max(lastSeq, Number(i.seq) || 0);
        commit(merged);
      } catch (err) {
        warnOnce(err);
      }
    })();
  }
  return hydration;
};

const putItem = async (item) => {
  commit([...items.filter((i) => i.id !== item.id), item].sort(bySeq));
  await persist("put", item);
};

const dropItem = async (id) => {
  if (!items.some((i) => i.id === id)) return false;
  commit(items.filter((i) => i.id !== id));
  await persist("delete", id);
  return true;
};

const stillQueued = (id) => items.some((i) => i.id === id && i.status === "pending");

// ── Errors ───────────────────────────────────────────────────────────────────
class OutboxTimeout extends Error {
  constructor() {
    super("No answer from the server");
    this.name = "OutboxTimeout";
    this.code = "ETIMEDOUT";
  }
}

const statusOf = (err) => err?.response?.status ?? err?.message?.response?.status ?? null;

/** The request got no HTTP answer: offline, timeout, dropped connection. */
const noAnswer = (err) => {
  if (!err) return false;
  if (err instanceof OutboxTimeout) return true;
  if (statusOf(err) != null) return false;
  return (
    !!err.isAxiosError ||
    err.request != null ||
    /network|timeout|ECONNABORTED|ERR_NETWORK/i.test(`${err.code || ""} ${err.message || ""}`)
  );
};
const outcomeUnknown = (err) => noAnswer(err) || GATEWAY_STATUSES.has(Number(statusOf(err)));
const retryable = (err) => noAnswer(err) || Number(statusOf(err)) >= 500;

const plain = (value) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
};

/**
 * A refusal in a form the device can store. It reads both ways:
 * `{httpStatus, code, details, message}`, and errorInfo()/getApiErrorMessage()
 * through `response: {status, data}`.
 */
const storedError = (err) => {
  const httpStatus = statusOf(err);
  const data = err?.response?.data || err?.message?.response?.data || {};
  const code = typeof data.code === "string" ? data.code : null;
  const details = data.details && typeof data.details === "object" ? plain(data.details) : {};
  const message = getApiErrorMessage(err, "The server did not record this.");
  return {
    httpStatus: httpStatus ?? null,
    code,
    details,
    message,
    ...(httpStatus != null ? { response: { status: httpStatus, data: { code, details, message } } } : {}),
  };
};

const withTimeout = (work, ms) => {
  let timer;
  return Promise.race([
    Promise.resolve()
      .then(work)
      .finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new OutboxTimeout()), ms);
    }),
  ]);
};

const backoffMs = (attempts) => Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1));

// ── Outcomes ─────────────────────────────────────────────────────────────────
/**
 * Listen for the outcome of every QUEUED event (inline sends answer the caller
 * directly and are not reported here).
 *
 * @param {(event: {id: string, clientEventId: string, kind: string, outcome: "sent"|"failed",
 *   result?: any, error?: {httpStatus: number|null, code: string|null, details: object,
 *   message: string, response?: {status: number, data: object}}}) => void} listener
 * @returns {() => void} unsubscribe
 */
export const onOutboxOutcome = (listener) => {
  if (typeof listener !== "function") return () => {};
  outcomeListeners.add(listener);
  return () => {
    outcomeListeners.delete(listener);
  };
};

const emit = (event) => {
  outcomeListeners.forEach((l) => {
    try {
      l(event);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Inventory outbox: outcome listener failed", err);
    }
  });
};

// ── Sending ──────────────────────────────────────────────────────────────────
/** Sends of one kind run one at a time, in call order. */
const exclusive = (kind, work) => {
  const run = (chains.get(kind) || Promise.resolve()).then(work);
  chains.set(
    kind,
    run.catch(() => {})
  );
  return run;
};

/** Send one queued event: "sent" | "failed" | "held" (still queued). */
const sendQueued = async (item, extraSenders) => {
  const send = (extraSenders && extraSenders[item.kind]) || senders.get(item.kind);
  if (typeof send !== "function") return "held";
  try {
    const result = await withTimeout(() => send(item.payload), sendTimeoutMs);
    await dropItem(item.id);
    emit({ id: item.id, clientEventId: item.clientEventId, kind: item.kind, outcome: "sent", result });
    return "sent";
  } catch (err) {
    if (!stillQueued(item.id)) return "held";
    if (retryable(err)) {
      const attempts = (Number(item.attempts) || 0) + 1;
      await putItem({ ...item, attempts, nextAttemptAt: Date.now() + backoffMs(attempts), lastError: storedError(err) });
      return "held";
    }
    const error = storedError(err);
    await putItem({ ...item, status: "failed", error, failedAt: new Date().toISOString() });
    emit({ id: item.id, clientEventId: item.clientEventId, kind: item.kind, outcome: "failed", error });
    return "failed";
  }
};

const pendingOf = (kind, userId) =>
  items.filter((i) => i.status === "pending" && i.userId === userId && (!kind || i.kind === kind));

/** Send this user's waiting events of one kind, oldest first, until one is held. */
const flushKind = async (kind, userId, { force = false, senders: extra } = {}) => {
  let sent = 0;
  let failed = 0;
  for (;;) {
    if (isOffline()) break;
    const next = pendingOf(kind, userId)[0];
    if (!next) break;
    if (!force && (Number(next.nextAttemptAt) || 0) > Date.now()) break;
    const outcome = await sendQueued(next, extra);
    if (outcome === "sent") sent += 1;
    else if (outcome === "failed") failed += 1;
    else break;
  }
  return { sent, failed };
};

/**
 * Send the signed-in user's waiting events, oldest first per kind. Runs on the
 * `online` event, on a timer and from "Sync now" (PendingSyncBadge).
 *
 * @param {{force?: boolean, senders?: Object<string, (payload: any) => Promise<any>>}} [options]
 *   force: ignore the retry backoff. senders: per-kind overrides for this run.
 * @returns {Promise<{sent: number, failed: number, pending: number}>}
 */
export const flush = async ({ force = false, senders: extra } = {}) => {
  await hydrate();
  const userId = currentUserId();
  if (!userId) return { sent: 0, failed: 0, pending: 0 };
  if (isOffline()) return { sent: 0, failed: 0, pending: pendingOf(null, userId).length };
  const kinds = [...new Set(pendingOf(null, userId).map((i) => i.kind))];
  const results = await Promise.all(
    kinds.map((kind) => exclusive(kind, () => flushKind(kind, userId, { force, senders: extra })))
  );
  return {
    sent: results.reduce((n, r) => n + r.sent, 0),
    failed: results.reduce((n, r) => n + r.failed, 0),
    pending: pendingOf(null, userId).length,
  };
};

const lineCount = (lines) => {
  const n = Array.isArray(lines) ? lines.length : 0;
  return `${n} ${n === 1 ? "line" : "lines"}`;
};

const defaultSummary = (kind, payload) => {
  const p = payload || {};
  if (kind === "grn_post") {
    const po = p.input?.poId != null ? ` for PO #${p.input.poId}` : "";
    return `Receipt${po} · ${lineCount(p.input?.lines)}`;
  }
  if (kind === "out_post") return `${p.docType === "RETURN" ? "Return to store" : "Mark out"} · ${lineCount(p.lines)}`;
  if (kind === "count_lines") return `Count${p.countId != null ? ` #${p.countId}` : ""} · ${lineCount(p.lines)}`;
  return OUTBOX_KIND_LABELS[kind] || kind;
};

const enqueue = async ({ id, kind, clientEventId, payload, summary, userId, error = null }) => {
  // The same event queued again (a retry of the same session) keeps its place.
  const earlier = items.find((i) => i.id === id && i.status === "pending");
  // A first send that just went unanswered waits out one backoff step.
  const attempts = error ? 1 : 0;
  await putItem({
    id,
    kind,
    clientEventId,
    userId,
    payload: plain(payload),
    summary: summary || defaultSummary(kind, payload),
    createdAt: earlier?.createdAt || new Date().toISOString(),
    seq: earlier?.seq ?? nextSeq(),
    status: "pending",
    attempts,
    nextAttemptAt: attempts ? Date.now() + backoffMs(attempts) : 0,
    lastError: error ? storedError(error) : null,
  });
};

/**
 * Send now, or keep for later when there is no connection.
 *
 * @param {{kind: string, clientEventId: string, payload: any, send: (payload: any) => Promise<any>,
 *   summary?: string}} args
 *   kind must have a registered sender (it replays a queued event); `send`
 *   makes the inline attempt. `summary` labels a failed item ("Receipt for PO
 *   #12 · 3 lines" by default).
 * @returns {Promise<{queued: true} | {queued: false, result: any}>}
 * @throws the raw error from `send` when the server answered with a refusal
 *   (4xx, or a 500); a kind with no registered sender throws before sending.
 */
export const submitOrQueue = async ({ kind, clientEventId, payload, send, summary } = {}) => {
  if (typeof send !== "function") throw new TypeError("submitOrQueue needs a send function");
  if (!senders.has(kind)) throw new Error(`The outbox has no sender for "${kind}"`);

  const userId = currentUserId();
  if (!userId || !clientEventId) {
    // Nobody to own a queued copy (token pages): online only.
    const result = await send(payload);
    return { queued: false, result };
  }

  await hydrate();
  return exclusive(kind, async () => {
    const id = itemId(kind, clientEventId);
    // Sending it again replaces a refused copy: the caller holds it now.
    if (items.some((i) => i.id === id && i.status === "failed")) await dropItem(id);
    const queue = async (error) => {
      await enqueue({ id, kind, clientEventId, payload, summary, userId, error });
      return { queued: true };
    };

    await flushKind(kind, userId); // older events of this kind go first
    if (isOffline() || pendingOf(kind, userId).length) return queue();

    let result;
    try {
      result = await withTimeout(() => send(payload), sendTimeoutMs);
    } catch (err) {
      if (outcomeUnknown(err)) return queue(err);
      throw err;
    }
    return { queued: false, result };
  });
};

// ── Hooks ────────────────────────────────────────────────────────────────────
const subscribe = (listener) => {
  listeners.add(listener);
  hydrate();
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => items;
const getServerSnapshot = () => EMPTY;
const useItems = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

/** Events of `kind` (every kind when omitted) waiting to sync for the signed-in user. */
export const usePendingCount = (kind) => {
  const all = useItems();
  const userId = currentUserId();
  let n = 0;
  for (const i of all) if (i.status === "pending" && i.userId === userId && (!kind || i.kind === kind)) n += 1;
  return n;
};

/**
 * Events of `kind` (every kind when omitted) the server refused after they
 * were queued, oldest first:
 * `{id, kind, clientEventId, payload, summary, error, createdAt, failedAt}`.
 * `payload` is what was queued, so a screen can offer "Open again".
 */
export const useFailedItems = (kind) => {
  const all = useItems();
  const userId = currentUserId();
  return useMemo(
    () => all.filter((i) => i.status === "failed" && i.userId === userId && (!kind || i.kind === kind)),
    [all, kind, userId]
  );
};

/**
 * Keep the queue moving while a screen is open: flush on mount, when the
 * device comes back online (ignoring the backoff) and every `intervalMs`.
 */
export const useOutboxAutoSync = ({ enabled = true, intervalMs = 30000 } = {}) => {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const run = (force) => {
      flush({ force }).catch(() => {});
    };
    const onOnline = () => run(true);
    run(false);
    window.addEventListener("online", onOnline);
    const timer = setInterval(() => run(false), intervalMs);
    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);
};

/** Forget a failed item (the user has seen it, or the screen took it back). */
export const dismissFailed = async (id) => {
  const userId = currentUserId();
  const item = items.find((i) => i.id === id && i.status === "failed");
  if (!item || item.userId !== userId) return false;
  return dropItem(id);
};

/** Test-only: empty the in-memory queue and forget the device database handle. */
export const _resetOutboxForTests = async ({ sendTimeout = DEFAULT_SEND_TIMEOUT_MS } = {}) => {
  const db = await dbPromise;
  if (db) db.close();
  dbPromise = null;
  hydration = null;
  items = EMPTY;
  lastSeq = 0;
  warned = false;
  sendTimeoutMs = sendTimeout;
  chains.clear();
  outcomeListeners.clear();
  senders.clear();
  for (const [k, v] of Object.entries(DEFAULT_SENDERS)) senders.set(k, v);
  listeners.forEach((l) => l());
};
