// The scan-screen outbox: posts from the receive, mark-out and count screens
// survive a dropped connection. Callers post through `submitOrQueue`; when the
// device is offline, or the request gets no usable answer, the event is kept
// on the device (IndexedDB) and sent later, oldest first, by `flush`.
//
// Rules
//   - Storage: our OWN IndexedDB database (OUTBOX_DB_NAME). C1's
//     `workwise-inventory` database is never opened here, so its version is
//     never touched. Without IndexedDB, or when a write fails, the event is
//     kept in memory only and the caller is told: `{queued:true,
//     persisted:false}` (the badge says "Kept on this page only").
//   - Owner: every event is tagged with the signed-in user's id. It is sent
//     only while that same user is signed in, checked right before each send:
//     this tab's redux profile, the profile redux-persist last stored
//     (`persist:root`, whichever tab signed in last) and the token must all
//     agree, and nothing may have changed them in another tab in the last few
//     seconds. Otherwise the event is held (no attempt counted). A running
//     flush stops when another tab changes the token or the profile. With no
//     signed-in user (token / site-rep pages) nothing is queued.
//   - Kinds: one sender per kind (DEFAULT_SENDERS, extendable with
//     registerSender). A kind with no sender throws.
//   - FIFO per kind: while an event of a kind is waiting, a new event of that
//     kind queues BEHIND it, so an older count_lines save is never applied
//     after a newer one. Sends of one kind never overlap, in this tab (a
//     promise chain) or across tabs (a Web Lock per kind, where supported).
//     Each flush re-reads the device database first, so a long-lived tab sees
//     what other tabs queued or sent.
//   - Write-ahead: the first send is recorded on the device BEFORE it goes
//     out and removed on its answer, so a send that never settles (a 401
//     parks the request) or a closed tab never loses it.
//   - Outcomes:
//       2xx (including `replayed:true`)        sent.
//       4xx (except 408 / 429)                 final. First send: the RAW
//                                              error is rethrown to the caller.
//                                              Queued: a failed item that keeps
//                                              its payload until discarded.
//       5xx, 408, 429                          retried with backoff; after
//                                              MAX_SERVER_ATTEMPTS answers like
//                                              that, a failed item.
//       no answer (offline, timeout, dropped)  retried with backoff; once the
//                                              event is NO_ANSWER_GIVE_UP_MS old,
//                                              a failed item.
//     The first send and a replay classify an answer the same way.
//   - History: sent and discarded events are remembered for a few days
//     (payload dropped), so `getOutboxStatus` can say what became of one.

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { postOut, saveCountLines } from "@/services/inventory";
import { GRN_POST_KIND, sendGrnPost } from "@/components/inventory/receive/receiveAdapter";
import { store } from "@/redux/store";
import { getApiErrorMessage } from "@/utils/apiError";

export const OUTBOX_DB_NAME = "workwise-inventory-outbox";
const DB_VERSION = 1;
const STORE_NAME = "events";
const LOCK_PREFIX = "workwise-inventory-outbox:";

/** A send with no answer after this long counts as "no answer" (axios gives up at 30s). */
const DEFAULT_SEND_TIMEOUT_MS = 60000;
const RETRY_BASE_MS = 5000;
const RETRY_MAX_MS = 5 * 60 * 1000;
/** Server-side failures (5xx, 408, 429) before a queued event becomes a failed item. */
export const MAX_SERVER_ATTEMPTS = 10;
/** A queued event that still gets no answer at this age becomes a failed item. */
export const NO_ANSWER_GIVE_UP_MS = 72 * 60 * 60 * 1000;
/** How long sent / discarded events are remembered for getOutboxStatus. */
const HISTORY_TTL_MS = 3 * 24 * 60 * 60 * 1000;
/** Sends wait this long after another tab changed the token or the profile. */
const IDENTITY_SETTLE_MS = 10000;
const GATEWAY_STATUSES = new Set([502, 503, 504]);
const RETRYABLE_4XX = new Set([408, 429]);

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
  [GRN_POST_KIND]: sendGrnPost,
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
// Item: {id, kind, clientEventId, userId, payload, summary, seq, createdAt,
//        createdAtMs, status: "pending"|"failed"|"sent"|"dismissed",
//        inFlight, attempts, serverAttempts, nextAttemptAt, lastError,
//        error, failedAt, settledAt, settledAtMs, persisted}
const EMPTY = Object.freeze([]);
let items = EMPTY;
let ready = false;
let lastSeq = 0;
let rev = 0;
const touched = new Map(); // id -> rev of its last change in memory
let sendTimeoutMs = DEFAULT_SEND_TIMEOUT_MS;
let identityEpoch = 0;
let lastIdentityEventAt = 0;
let persistenceAsked = false;
const listeners = new Set();
const outcomeListeners = new Set();
const chains = new Map();

const notify = () => listeners.forEach((l) => l());
const commit = (next) => {
  items = next;
  notify();
};
const bySeq = (a, b) => a.seq - b.seq;
const nextSeq = () => {
  lastSeq = Math.max(Date.now(), lastSeq + 1);
  return lastSeq;
};
const itemId = (kind, clientEventId) => `${kind}:${clientEventId}`;
const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

// ── Who is signed in ─────────────────────────────────────────────────────────
const asId = (v) => (v === undefined || v === null || v === "" ? null : String(v));

/** This tab's signed-in user (redux). */
const reduxOwner = () => {
  try {
    return asId(store.getState()?.userProfile?.id);
  } catch {
    return null;
  }
};

const profileIdOf = (raw) => {
  if (!raw) return null;
  try {
    const root = JSON.parse(raw);
    const profile = typeof root?.userProfile === "string" ? JSON.parse(root.userProfile) : root?.userProfile;
    return asId(profile?.id);
  } catch {
    return null;
  }
};

const readLocal = (key) => {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * The user every tab agrees is signed in: this tab's redux profile, the one
 * redux-persist last stored (any tab), and a token present. Null otherwise.
 */
const signedInOwner = () => {
  const mine = reduxOwner();
  if (!mine || !readLocal("token")) return null;
  return profileIdOf(readLocal("persist:root")) === mine ? mine : null;
};

const onStorage = (e) => {
  if (e.key !== null && e.key !== "token" && e.key !== "persist:root") return;
  if (e.key === "persist:root" && profileIdOf(e.oldValue) === profileIdOf(e.newValue)) return;
  identityEpoch += 1;
  lastIdentityEventAt = Date.now();
  notify();
};

let watching = false;
const watchIdentity = () => {
  if (watching || typeof window === "undefined") return;
  watching = true;
  window.addEventListener("storage", onStorage);
};

/** May `item` go out now, under the identity this flush started with? */
const gateOpen = (item, gate) =>
  gate.epoch === identityEpoch &&
  Date.now() - lastIdentityEventAt >= IDENTITY_SETTLE_MS &&
  signedInOwner() === item.userId &&
  readLocal("token") === gate.token;

// ── IndexedDB (write-through; memory mirrors it while the page lives) ────────
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

/** Write through to the device. True when the device has it. */
const persist = async (op, value) => {
  try {
    const db = await openDb();
    if (!db) return false;
    await withStore("readwrite", (os) => (op === "put" ? os.put(value) : os.delete(value)));
    return true;
  } catch (err) {
    warnOnce(err);
    return false;
  }
};

const isHistory = (i) => i.status === "sent" || i.status === "dismissed";

/**
 * Bring memory in line with the device: what other tabs (or an earlier page)
 * queued, sent or discarded. Our own in-flight sends, memory-only events and
 * anything changed here since the read started keep their memory version.
 */
const loadFromDb = async () => {
  const startedAt = rev;
  let rows;
  try {
    rows = await withStore("readonly", (os, set) => {
      const req = os.getAll();
      req.onsuccess = () => set(req.result || []);
    });
  } catch (err) {
    warnOnce(err);
    return;
  }
  if (!Array.isArray(rows)) return; // no device database: memory is all there is
  const now = Date.now();
  const stale = [];
  const fromDb = new Map();
  for (const r of rows) {
    if (!r || !r.id) continue;
    if (isHistory(r) && now - (Number(r.settledAtMs) || 0) > HISTORY_TTL_MS) {
      stale.push(r.id);
      continue;
    }
    // A send recorded as in flight by a page that is gone: waiting again.
    fromDb.set(r.id, r.inFlight ? { ...r, inFlight: false } : r);
  }
  const next = [];
  const seen = new Set();
  for (const i of items) {
    seen.add(i.id);
    const keepMine = (touched.get(i.id) || 0) > startedAt || i.inFlight || i.persisted === false;
    if (keepMine) next.push(i);
    else if (fromDb.has(i.id)) next.push(fromDb.get(i.id));
    // else: settled and cleared by another tab
  }
  for (const [id, r] of fromDb) {
    if (seen.has(id) || (touched.get(id) || 0) > startedAt) continue;
    next.push(r);
  }
  for (const i of next) lastSeq = Math.max(lastSeq, Number(i.seq) || 0);
  commit(next.sort(bySeq));
  for (const id of stale) persist("delete", id);
};

/** Load what an earlier page left on the device (once per page load). */
const hydrate = () => {
  if (!hydration) {
    watchIdentity();
    hydration = loadFromDb().finally(() => {
      ready = true;
      notify();
    });
  }
  return hydration;
};

const putItem = async (item) => {
  rev += 1;
  touched.set(item.id, rev);
  const mine = rev;
  const stored = { ...item };
  delete stored.persisted;
  commit([...items.filter((i) => i.id !== item.id), { ...stored, persisted: item.persisted }].sort(bySeq));
  const ok = await persist("put", stored);
  // Say whether the device holds it (unless something newer replaced it meanwhile).
  if ((touched.get(item.id) || 0) === mine) {
    const cur = items.find((i) => i.id === item.id);
    if (cur && cur.persisted !== ok) commit(items.map((i) => (i.id === item.id ? { ...i, persisted: ok } : i)));
  }
  return ok;
};

const dropItem = async (id) => {
  rev += 1;
  touched.set(id, rev);
  if (items.some((i) => i.id === id)) commit(items.filter((i) => i.id !== id));
  await persist("delete", id);
};

/** Remember what became of an event, without its payload. */
const settle = (item, status) => {
  const now = Date.now();
  return putItem({
    id: item.id,
    kind: item.kind,
    clientEventId: item.clientEventId,
    userId: item.userId,
    summary: item.summary,
    seq: item.seq,
    createdAt: item.createdAt,
    createdAtMs: item.createdAtMs,
    status,
    payload: null,
    settledAt: new Date(now).toISOString(),
    settledAtMs: now,
  });
};

const askForPersistence = () => {
  if (persistenceAsked) return;
  persistenceAsked = true;
  try {
    const p = typeof navigator !== "undefined" ? navigator.storage?.persist?.() : null;
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch {
    // best effort
  }
};

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

/** "no-answer" | "server" (5xx, 408, 429: try again) | "final" */
const classify = (err) => {
  if (noAnswer(err)) return "no-answer";
  const s = Number(statusOf(err));
  if (s >= 500 || RETRYABLE_4XX.has(s)) return "server";
  return "final";
};

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
const storedError = (err, { message: override, code: codeOverride } = {}) => {
  const httpStatus = statusOf(err);
  const data = err?.response?.data || err?.message?.response?.data || {};
  const code = codeOverride || (typeof data.code === "string" ? data.code : null);
  const details = data.details && typeof data.details === "object" ? plain(data.details) : {};
  const message = override || getApiErrorMessage(err, "The server did not record this.");
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
 * Listen for the outcome of every QUEUED event (an inline send answers its
 * caller directly and is not reported here).
 *
 * @param {(event: {id: string, clientEventId: string, kind: string,
 *   outcome: "sent"|"failed"|"discarded", result?: any, error?: {httpStatus: number|null,
 *   code: string|null, details: object, message: string, response?: {status: number, data: object}}}) => void} listener
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
const withKindLock = (kind, work) => {
  const locks = typeof navigator !== "undefined" ? navigator.locks : null;
  if (locks && typeof locks.request === "function") return locks.request(`${LOCK_PREFIX}${kind}`, () => work());
  return work();
};

/** Work on one kind runs one at a time: in call order here, and across tabs. */
const exclusive = (kind, work) => {
  const run = (chains.get(kind) || Promise.resolve()).then(() => withKindLock(kind, work));
  chains.set(
    kind,
    run.catch(() => {})
  );
  return run;
};

const pendingOf = (kind, userId) =>
  items.filter(
    (i) => i.status === "pending" && !i.inFlight && i.userId === userId && (!kind || i.kind === kind)
  );
const stillPending = (id) => items.some((i) => i.id === id && i.status === "pending");

const fail = async (item, error) => {
  await putItem({ ...item, inFlight: false, status: "failed", error, failedAt: new Date().toISOString() });
  emit({ id: item.id, clientEventId: item.clientEventId, kind: item.kind, outcome: "failed", error });
};

/**
 * After an unanswered or server-failed send: wait and retry, or give up.
 * Returns "held" | "failed".
 */
const afterTrouble = async (item, err, how) => {
  const lastError = storedError(err, how === "no-answer" ? { message: "No answer from the server" } : {});
  if (how === "no-answer") {
    if (Date.now() - (Number(item.createdAtMs) || Date.now()) >= NO_ANSWER_GIVE_UP_MS) {
      await fail(item, {
        ...lastError,
        code: "NO_ANSWER",
        message: "Not sent: no answer from the server for 3 days",
      });
      return "failed";
    }
  } else {
    const serverAttempts = (Number(item.serverAttempts) || 0) + 1;
    if (serverAttempts >= MAX_SERVER_ATTEMPTS) {
      const status = lastError.httpStatus;
      await fail(
        { ...item, serverAttempts },
        storedError(err, { message: `The server could not record this after ${serverAttempts} tries (${status}): ${lastError.message}` })
      );
      return "failed";
    }
    item = { ...item, serverAttempts };
  }
  const attempts = (Number(item.attempts) || 0) + 1;
  await putItem({ ...item, inFlight: false, attempts, nextAttemptAt: Date.now() + backoffMs(attempts), lastError });
  return "held";
};

/** Send one queued event: "sent" | "failed" | "held" (still queued). */
const sendQueued = async (item, extraSenders) => {
  const send = (extraSenders && extraSenders[item.kind]) || senders.get(item.kind);
  if (typeof send !== "function") return "held";
  try {
    const result = await withTimeout(() => send(item.payload), sendTimeoutMs);
    await settle(item, "sent");
    emit({ id: item.id, clientEventId: item.clientEventId, kind: item.kind, outcome: "sent", result });
    return "sent";
  } catch (err) {
    if (!stillPending(item.id)) return "held";
    const how = classify(err);
    if (how !== "final") return afterTrouble(items.find((i) => i.id === item.id) || item, err, how);
    await fail(item, storedError(err));
    return "failed";
  }
};

/**
 * Send this user's waiting events of one kind, oldest first, until one is
 * held. Call inside exclusive(kind).
 */
const flushKind = async (kind, owner, { force = false, senders: extra } = {}) => {
  await loadFromDb();
  const gate = { epoch: identityEpoch, token: readLocal("token") };
  let sent = 0;
  let failed = 0;
  for (;;) {
    if (isOffline()) break;
    const next = pendingOf(kind, owner)[0];
    if (!next) break;
    if (!gateOpen(next, gate)) break; // someone else is signed in, or just was: hold
    if (!force && (Number(next.nextAttemptAt) || 0) > Date.now()) break;
    const outcome = await sendQueued(next, extra);
    if (outcome === "sent") sent += 1;
    else if (outcome === "failed") failed += 1;
    else break;
  }
  return { sent, failed };
};

/**
 * Send the signed-in user's waiting events, oldest first per kind. Runs on
 * mount, when the device comes back online or into view, on a timer, and from
 * "Sync now" / "Retry now" (PendingSyncBadge).
 *
 * @param {{force?: boolean, senders?: Object<string, (payload: any) => Promise<any>>}} [options]
 *   force: ignore the retry backoff. senders: per-kind overrides for this run.
 * @returns {Promise<{sent: number, failed: number, pending: number}>}
 */
export const flush = async ({ force = false, senders: extra } = {}) => {
  await hydrate();
  await loadFromDb();
  const owner = signedInOwner();
  if (!owner) return { sent: 0, failed: 0, pending: 0 };
  if (isOffline()) return { sent: 0, failed: 0, pending: pendingOf(null, owner).length };
  const kinds = [...new Set(pendingOf(null, owner).map((i) => i.kind))];
  const results = await Promise.all(
    kinds.map((kind) => exclusive(kind, () => flushKind(kind, owner, { force, senders: extra })))
  );
  return {
    sent: results.reduce((n, r) => n + r.sent, 0),
    failed: results.reduce((n, r) => n + r.failed, 0),
    pending: pendingOf(null, owner).length,
  };
};

/** "Retry now" on a waiting event: send its kind now, ignoring the backoff. */
export const retryNow = async (id) => {
  const item = items.find((i) => i.id === id && i.status === "pending");
  const owner = signedInOwner();
  if (!item || !owner || item.userId !== owner) return { sent: 0, failed: 0, pending: 0 };
  const r = await exclusive(item.kind, () => flushKind(item.kind, owner, { force: true }));
  return { ...r, pending: pendingOf(null, owner).length };
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

/** Queue (or re-queue) an event; the same event keeps its place. True when the device holds it. */
const enqueue = (base, patch = {}) => {
  const earlier = items.find((i) => i.id === base.id && i.status === "pending");
  const now = Date.now();
  return putItem({
    ...base,
    createdAt: earlier?.createdAt || new Date(now).toISOString(),
    createdAtMs: earlier?.createdAtMs || now,
    seq: earlier?.seq ?? nextSeq(),
    status: "pending",
    inFlight: false,
    attempts: 0,
    serverAttempts: 0,
    nextAttemptAt: 0,
    lastError: null,
    ...patch,
  });
};

/**
 * Send now, or keep for later when there is no connection.
 *
 * @param {{kind: string, clientEventId: string, payload: any, send: (payload: any) => Promise<any>,
 *   summary?: string}} args
 *   kind must have a registered sender (it replays a queued event); `send`
 *   makes the first attempt. `summary` labels the event in the sync panel
 *   ("Receipt for PO #12 · 3 lines" by default).
 * @returns {Promise<{queued: true, persisted: boolean} | {queued: false, result: any}>}
 *   persisted:false: this browser could not store it; it lives only as long
 *   as this page.
 * @throws the RAW error from `send` when the server refused it (4xx other
 *   than 408/429); a kind with no registered sender throws before sending.
 */
export const submitOrQueue = async ({ kind, clientEventId, payload, send, summary } = {}) => {
  if (typeof send !== "function") throw new TypeError("submitOrQueue needs a send function");
  if (!senders.has(kind)) throw new Error(`The outbox has no sender for "${kind}"`);

  await hydrate();
  const owner = signedInOwner();
  if (!owner || !clientEventId) {
    // Nobody every tab agrees on to own a queued copy (token pages): online only.
    const result = await send(payload);
    return { queued: false, result };
  }

  return exclusive(kind, async () => {
    const id = itemId(kind, clientEventId);
    const base = { id, kind, clientEventId, userId: owner, payload: plain(payload), summary: summary || defaultSummary(kind, payload) };
    // Sending it again replaces a refused copy: the caller holds it now.
    if (items.some((i) => i.id === id && i.status === "failed")) await dropItem(id);

    await flushKind(kind, owner); // older events of this kind go first
    if (isOffline() || pendingOf(kind, owner).length) {
      const persisted = await enqueue(base);
      askForPersistence();
      return { queued: true, persisted };
    }

    // Write-ahead: on the device before it goes out.
    await enqueue(base, { inFlight: true });
    let result;
    try {
      result = await withTimeout(() => send(payload), sendTimeoutMs);
    } catch (err) {
      const how = classify(err);
      const current = items.find((i) => i.id === id);
      if (how === "final" || !current) {
        await dropItem(id);
        throw err;
      }
      await afterTrouble(current, err, how);
      askForPersistence();
      const now = items.find((i) => i.id === id);
      if (now?.status === "failed") throw err; // gave up at once (only for an event already days old)
      return { queued: true, persisted: now?.persisted !== false };
    }
    const current = items.find((i) => i.id === id);
    if (current) await settle(current, "sent");
    return { queued: false, result };
  });
};

// ── Hooks and queries ────────────────────────────────────────────────────────
let snapshot = { items: EMPTY, owner: null, ready: false };
const getSnapshot = () => {
  const owner = reduxOwner();
  if (snapshot.items !== items || snapshot.owner !== owner || snapshot.ready !== ready) {
    snapshot = { items, owner, ready };
  }
  return snapshot;
};
const SERVER_SNAPSHOT = Object.freeze({ items: EMPTY, owner: null, ready: false });
const getServerSnapshot = () => SERVER_SNAPSHOT;
const subscribe = (listener) => {
  listeners.add(listener);
  // A sign-in switch in this tab changes whose events show.
  const unsubscribeStore = typeof store?.subscribe === "function" ? store.subscribe(listener) : null;
  hydrate();
  return () => {
    listeners.delete(listener);
    if (unsubscribeStore) unsubscribeStore();
  };
};
const useSnapshot = () => useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

const mineOf = (snap, status, kind) =>
  snap.items.filter(
    (i) => i.status === status && i.userId === snap.owner && snap.owner && (!kind || i.kind === kind)
  );

/** True once the events stored on this device have loaded (counts before that read 0). */
export const useOutboxReady = () => useSnapshot().ready;

/** Resolves once the events stored on this device have loaded. */
export const outboxReady = () => hydrate();

/** Events of `kind` (every kind when omitted) waiting to sync for the signed-in user. */
export const usePendingCount = (kind) => {
  const snap = useSnapshot();
  let n = 0;
  for (const i of snap.items) {
    if (i.status === "pending" && !i.inFlight && snap.owner && i.userId === snap.owner && (!kind || i.kind === kind)) n += 1;
  }
  return n;
};

/**
 * Events of `kind` (every kind when omitted) waiting to sync, oldest first:
 * `{id, kind, clientEventId, payload, summary, createdAt, attempts, lastError, persisted}`.
 */
export const usePendingItems = (kind) => {
  const snap = useSnapshot();
  return useMemo(() => mineOf(snap, "pending", kind).filter((i) => !i.inFlight), [snap, kind]);
};

/**
 * Events of `kind` (every kind when omitted) the server refused or that were
 * given up on, oldest first:
 * `{id, kind, clientEventId, payload, summary, error, createdAt, failedAt}`.
 * `payload` is what was queued, so a screen can offer "Open again".
 */
export const useFailedItems = (kind) => {
  const snap = useSnapshot();
  return useMemo(() => mineOf(snap, "failed", kind), [snap, kind]);
};

/**
 * What became of an event on this device, for the signed-in user:
 * "pending" (waiting or being sent) | "failed" | "sent" | "dismissed"
 * (discarded) | "unknown" (never queued here, forgotten after a few days, or
 * the stored queue has not loaded yet: see outboxReady()).
 */
export const getOutboxStatus = (kind, clientEventId) => {
  const owner = reduxOwner();
  const item = items.find((i) => i.id === itemId(kind, clientEventId));
  if (!item || !owner || item.userId !== owner) return "unknown";
  return item.status;
};

/** Forget a failed item (the user has seen it, or the screen took it back). */
export const dismissFailed = async (id) => {
  const owner = reduxOwner();
  const item = items.find((i) => i.id === id && i.status === "failed");
  if (!item || item.userId !== owner) return false;
  await settle(item, "dismissed");
  return true;
};

/**
 * Throw away a waiting event: it will not be sent. Waits for a send of its
 * kind in progress; false when it was sent or settled meanwhile.
 */
export const discardPending = async (id) => {
  const first = items.find((i) => i.id === id);
  if (!first) return false;
  return exclusive(first.kind, async () => {
    const owner = reduxOwner();
    const item = items.find((i) => i.id === id && i.status === "pending" && !i.inFlight);
    if (!item || item.userId !== owner) return false;
    await settle(item, "dismissed");
    emit({ id: item.id, clientEventId: item.clientEventId, kind: item.kind, outcome: "discarded" });
    return true;
  });
};

/** The screen an event came from, to open it again; null when unknown. */
export const outboxLinkFor = (item) => {
  const p = item?.payload || {};
  if (item?.kind === "grn_post" && p.input?.poId != null) {
    const hotel = p.input.hotelId != null ? `?hotelId=${encodeURIComponent(p.input.hotelId)}` : "";
    return `/dashboard/buyer/inventory/receive/${encodeURIComponent(p.input.poId)}${hotel}`;
  }
  if (item?.kind === "count_lines" && p.countId != null) {
    return `/dashboard/buyer/inventory/counts/${encodeURIComponent(p.countId)}`;
  }
  if (item?.kind === "out_post" && p.hotelId != null) {
    return `/dashboard/buyer/inventory/out?hotelId=${encodeURIComponent(p.hotelId)}${p.docType === "RETURN" ? "&mode=return" : ""}`;
  }
  return null;
};

/**
 * Keep the queue moving while signed in: flush on mount, when the device
 * comes back online (ignoring the backoff), when the page comes back into
 * view, and every `intervalMs`.
 */
export const useOutboxAutoSync = ({ enabled = true, intervalMs = 30000 } = {}) => {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const run = (force) => {
      flush({ force }).catch(() => {});
    };
    const onOnline = () => run(true);
    const onVisible = () => {
      if (typeof document === "undefined" || document.visibilityState !== "hidden") run(false);
    };
    run(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(() => run(false), intervalMs);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);
};

// ── Tests only ───────────────────────────────────────────────────────────────
/** Empty the in-memory queue and forget the device database handle ("a page load"). */
const resetForTests = async ({ sendTimeout = DEFAULT_SEND_TIMEOUT_MS } = {}) => {
  const db = await dbPromise;
  if (db) db.close();
  dbPromise = null;
  hydration = null;
  ready = false;
  items = EMPTY;
  lastSeq = 0;
  rev = 0;
  touched.clear();
  warned = false;
  persistenceAsked = false;
  identityEpoch = 0;
  lastIdentityEventAt = 0;
  sendTimeoutMs = sendTimeout;
  chains.clear();
  outcomeListeners.clear();
  senders.clear();
  for (const [k, v] of Object.entries(DEFAULT_SENDERS)) senders.set(k, v);
  notify();
};
/** Test-only (undefined outside NODE_ENV=test, so production builds drop it). */
export const _resetOutboxForTests = process.env.NODE_ENV === "test" ? resetForTests : undefined;
