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
//     Each flush, Discard and Dismiss re-reads the device database under that
//     lock first, so a long-lived tab acts on what other tabs queued or sent.
//   - Write-ahead: the first send is recorded on the device BEFORE it goes
//     out (in flight, stamped inFlightSince) and removed on its answer, so a
//     send that never settles (a 401 parks the request) or a closed tab never
//     loses it. Each retry of a queued event is marked in flight the same way
//     before it goes out, and only while the device still holds the row this
//     tab read, waiting and not in flight (else it is held); a Discard takes
//     only a row that is not in flight. Both are checked inside the write's
//     own IndexedDB transaction, so even without Web Locks a stale tab can
//     neither discard an event another tab is sending nor send it twice.
//     A row marked in flight is another tab's live send until this tab holds
//     the kind's lock; only then is it taken back as left behind by a page
//     that is gone. Without Web Locks (Safari < 15.4, Firefox < 96) holding
//     the in-tab lock says nothing about other tabs, so a row is taken back
//     only once it has been in flight longer than any live send can last
//     (the send timeout plus ORPHAN_GRACE_MS).
//   - A "sent" row on the device is never overwritten (checked inside the
//     same IndexedDB transaction as the write): a stale tab cannot turn a sent
//     event into "dismissed", "failed" or "pending".
//   - Outcomes:
//       2xx (including `replayed:true`)        sent.
//       4xx (except 408 / 429)                 final. First send: the RAW
//                                              error is rethrown to the caller.
//                                              Queued: a failed item that keeps
//                                              its payload until discarded.
//       500, 501, 505+, 408, 429               retried with backoff. Given up
//                                              (code GAVE_UP, uncertain) after
//                                              MAX_SERVER_ATTEMPTS such answers
//                                              to retries that were DUE (a forced
//                                              "Sync now" / "Retry now" / online
//                                              retry is not counted), and never
//                                              sooner than SERVER_GIVE_UP_MIN_MS
//                                              after the first one.
//       no answer (timeout, dropped), and      retried with backoff. Given up
//       a gateway's 502 / 503 / 504            (code NO_ANSWER, uncertain) once
//                                              NO_ANSWER_GIVE_UP_MS have been
//                                              spent retrying, and at least
//                                              MIN_NO_ANSWER_TRIES tries went
//                                              unanswered. Time spent retrying
//                                              is the sum of the gaps between
//                                              consecutive unanswered tries made
//                                              ONLINE, each capped at
//                                              NO_ANSWER_GAP_CAP_MS: time offline
//                                              or with no page open (a closed
//                                              tab, a page taken back) does not
//                                              count.
//     The first send and a replay classify an answer the same way. A give-up
//     is uncertain: the server may have recorded it.
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
/** Server failures (500, 408, 429, …) to DUE retries before a queued event is given up on… */
export const MAX_SERVER_ATTEMPTS = 10;
/** …and never sooner than this after its first server failure. */
export const SERVER_GIVE_UP_MIN_MS = 30 * 60 * 1000;
/** After this much time spent retrying with no answer (or a gateway 502/503/504)… */
export const NO_ANSWER_GIVE_UP_MS = 72 * 60 * 60 * 1000;
/** …and at least this many unanswered tries, a queued event is given up on. */
export const MIN_NO_ANSWER_TRIES = 3;
/**
 * The most one gap between two unanswered online tries adds to the time spent
 * retrying: a due retry comes at most one backoff (RETRY_MAX_MS) plus one
 * auto-sync tick after the previous try. A longer gap was offline or closed.
 */
export const NO_ANSWER_GAP_CAP_MS = 6 * 60 * 1000;
/** A row in flight this long past the send timeout is a closed page's, even without Web Locks. */
const ORPHAN_GRACE_MS = 30 * 1000;
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
//        inFlight, attempts (every try: drives the backoff), nextAttemptAt,
//        serverAttempts (due tries the server failed), firstServerFailureAtMs,
//        inFlightSince (when the send in flight went out),
//        noAnswerTries (tries with no answer), lastNoAnswerTryAtMs (the last
//        one made online), noAnswerRetryingMs (time spent retrying: see the
//        rules above),
//        mayBeRecorded (a try got no answer: the server may have it),
//        lastError, error, failedAt, settledAt, settledAtMs,
//        persisted (memory only), result (memory only: a sent event's answer),
//        sendingHere (memory only: this tab is retrying it, so it stays listed)}
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
const sending = new Set(); // ids this tab is sending right now
const TAB_ID = Math.random().toString(36).slice(2, 10);

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

/**
 * Write through to the device. A put never replaces a stored "sent" row with
 * anything else, and `guard(storedRow|null)` may refuse it too; both are
 * checked inside the same readwrite transaction as the write.
 * @returns {Promise<{persisted: boolean, refused?: true, current?: object|null}>}
 *   persisted: the device holds a row for it; refused: the write was not
 *   made, `current` being what the device holds.
 */
const persist = async (op, value, guard = null) => {
  try {
    const db = await openDb();
    if (!db) return { persisted: false };
    const out = await withStore("readwrite", (os, set) => {
      if (op !== "put") {
        os.delete(value);
        set({ persisted: true });
        return;
      }
      const req = os.get(value.id);
      req.onsuccess = () => {
        const current = req.result ?? null;
        const overSent = current?.status === "sent" && value.status !== "sent";
        if (overSent || (guard && !guard(current))) {
          set({ persisted: current != null, refused: true, current });
          return;
        }
        os.put(value);
        set({ persisted: true });
      };
    });
    return out || { persisted: false };
  } catch (err) {
    warnOnce(err);
    return { persisted: false };
  }
};

const isHistory = (i) => i.status === "sent" || i.status === "dismissed";

/** Whether memory already holds this device row (every write stamps a new writeId). */
const sameRow = (a, b) =>
  a.id === b.id &&
  a.writeId === b.writeId &&
  a.status === b.status &&
  (Number(a.attempts) || 0) === (Number(b.attempts) || 0) &&
  !!a.inFlight === !!b.inFlight &&
  (Number(a.noAnswerTries) || 0) === (Number(b.noAnswerTries) || 0) &&
  (Number(a.nextAttemptAt) || 0) === (Number(b.nextAttemptAt) || 0) &&
  (Number(a.settledAtMs) || 0) === (Number(b.settledAtMs) || 0);

/**
 * Bring memory in line with the device: what other tabs (or an earlier page)
 * queued, sent or discarded. This tab's own sends, memory-only events and
 * anything changed here since the read started keep their memory version; a
 * row the device holds unchanged keeps its memory object (and so its
 * `result`), and nothing is committed when nothing changed. A row marked in
 * flight stays so: it may be another tab's live send (see reclaimOrphans).
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
    fromDb.set(r.id, r);
  }
  const next = [];
  const seen = new Set();
  for (const i of items) {
    seen.add(i.id);
    const keepMine = (touched.get(i.id) || 0) > startedAt || sending.has(i.id) || i.persisted === false;
    const stored = fromDb.get(i.id);
    if (keepMine || (stored && sameRow(i, stored))) next.push(i);
    else if (stored) next.push(stored);
    // else: settled and cleared by another tab
  }
  for (const [id, r] of fromDb) {
    if (seen.has(id) || (touched.get(id) || 0) > startedAt) continue;
    next.push(r);
  }
  for (const i of next) lastSeq = Math.max(lastSeq, Number(i.seq) || 0);
  next.sort(bySeq);
  const unchanged = next.length === items.length && next.every((i, k) => i === items[k]);
  if (!unchanged) commit(next);
  for (const id of stale) persist("delete", id);
};

/** Load what an earlier page left on the device (once per page load). */
const hydrate = () => {
  if (!hydration) {
    watchIdentity();
    hydration = loadFromDb()
      .then(reclaimWhereFree)
      .finally(() => {
        ready = true;
        notify();
      });
  }
  return hydration;
};

/** What the device keeps of an item (memory-only fields dropped). */
const storable = (item) => {
  const s = { ...item };
  delete s.persisted;
  delete s.result;
  delete s.sendingHere;
  return s;
};

/** Memory takes the device's row for `id` (or drops it when the device has none). */
const adopt = (id, row) => {
  const rest = items.filter((i) => i.id !== id);
  commit(row ? [...rest, row].sort(bySeq) : rest);
};

/**
 * Write an item: memory at once (synchronously, before the first await, so a
 * caller can emit right after), then the device. When the device refuses it
 * (a stored "sent" row, or `guard`), memory takes the device's row.
 * @returns {Promise<{persisted: boolean, refused?: true, current?: object|null}>}
 */
const putItem = async (item, guard = null) => {
  rev += 1;
  touched.set(item.id, rev);
  const mine = rev;
  const stored = { ...storable(item), writeId: `${TAB_ID}:${mine}` };
  const inMemory = { ...stored, persisted: item.persisted };
  if (item.result !== undefined) inMemory.result = item.result;
  if (item.sendingHere && item.inFlight) inMemory.sendingHere = true;
  commit([...items.filter((i) => i.id !== item.id), inMemory].sort(bySeq));
  const res = await persist("put", stored, guard);
  // Unless something newer replaced it meanwhile: say whether the device holds it.
  if ((touched.get(item.id) || 0) === mine) {
    if (res.refused) adopt(item.id, res.current);
    else {
      const cur = items.find((i) => i.id === item.id);
      if (cur && cur.persisted !== res.persisted) {
        commit(items.map((i) => (i.id === item.id ? { ...i, persisted: res.persisted } : i)));
      }
    }
  }
  return res;
};

const dropItem = async (id) => {
  rev += 1;
  touched.set(id, rev);
  if (items.some((i) => i.id === id)) commit(items.filter((i) => i.id !== id));
  await persist("delete", id);
};

/**
 * Remember what became of an event, without its payload. `expect`: only when
 * the device still holds it in that status (or never held it: memory only);
 * `idle`: and not in flight (another tab's send). `result` (a sent event's
 * answer) stays in memory only.
 */
const settle = (item, status, { expect = null, idle = false, result } = {}) => {
  const now = Date.now();
  const guard = expect
    ? (cur) => (cur ? cur.status === expect && !(idle && cur.inFlight) : item.persisted === false)
    : null;
  return putItem(
    {
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
      ...(result !== undefined ? { result } : {}),
    },
    guard
  );
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

/**
 * "no-answer" | "gateway" (502/503/504: the app may not have seen it, or may
 * have: like no answer) | "server" (other 5xx, 408, 429: try again) | "final"
 */
const classify = (err) => {
  if (noAnswer(err)) return "no-answer";
  const s = Number(statusOf(err));
  if (GATEWAY_STATUSES.has(s)) return "gateway";
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
 * caller directly and is not reported here). The event fires right after the
 * in-memory state changes, so getOutboxStatus() already agrees with it.
 *
 * "failed" comes in two kinds; tell them apart by `error.uncertain`:
 *   - a refusal (4xx): `uncertain` absent, `code` the server's code. Not recorded.
 *   - a give-up: `uncertain: true`, `code` "GAVE_UP" (the server kept failing:
 *     5xx, 408, 429) or "NO_ANSWER" (no answer, or a gateway 502/503/504, for
 *     3 days spent retrying). The server MAY have recorded it: check the
 *     document (or send it again with the same clientEventId, which the server
 *     answers with the original) before treating it as lost.
 *
 * @param {(event: {id: string, clientEventId: string, kind: string,
 *   outcome: "sent"|"failed"|"discarded", result?: any, error?: {httpStatus: number|null,
 *   code: string|null, details: object, message: string, uncertain?: true,
 *   response?: {status: number, data: object}}}) => void} listener
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

/** Like exclusive, but skipped (resolves undefined) when another tab holds the kind's lock. */
const exclusiveIfFree = (kind, work) => {
  const locks = typeof navigator !== "undefined" ? navigator.locks : null;
  if (locks && typeof locks.request === "function") {
    return new Promise((resolve) => {
      resolve(locks.request(`${LOCK_PREFIX}${kind}`, { ifAvailable: true }, (lock) => (lock ? work() : undefined)));
    }).catch(() => {});
  }
  return exclusive(kind, work).catch(() => {});
};

const hasWebLocks = () =>
  typeof navigator !== "undefined" && !!navigator.locks && typeof navigator.locks.request === "function";

/**
 * Under the kind's Web Lock no tab is sending it, so a row still marked in
 * flight was left by a page that closed mid-send: waiting again. Without Web
 * Locks the lock is this tab's only, so a row is taken back only once it has
 * been in flight longer than a live send can last. Its try may have reached
 * the server (mayBeRecorded) and counts as one unanswered try; the time the
 * page was gone does not count as time spent retrying.
 * Call inside exclusive(kind), after loadFromDb().
 */
const reclaimOrphans = async (kind) => {
  const now = Date.now();
  const abandoned = (i) => hasWebLocks() || now - (Number(i.inFlightSince) || 0) >= sendTimeoutMs + ORPHAN_GRACE_MS;
  const left = items.filter(
    (i) => i.kind === kind && i.status === "pending" && i.inFlight && !sending.has(i.id) && abandoned(i)
  );
  for (const i of left) {
    await putItem({
      ...i,
      inFlight: false,
      inFlightSince: 0,
      mayBeRecorded: true,
      noAnswerTries: (Number(i.noAnswerTries) || 0) + 1,
    });
  }
};

/** On page load: take back what a closed page left in flight, for kinds no other tab is sending. */
const reclaimWhereFree = async () => {
  const kinds = [...new Set(items.filter((i) => i.status === "pending" && i.inFlight).map((i) => i.kind))];
  await Promise.all(
    kinds.map((kind) =>
      exclusiveIfFree(kind, async () => {
        await loadFromDb();
        await reclaimOrphans(kind);
      })
    )
  );
};

const pendingOf = (kind, userId) =>
  items.filter(
    (i) => i.status === "pending" && !i.inFlight && i.userId === userId && (!kind || i.kind === kind)
  );
const stillPending = (id) => items.some((i) => i.id === id && i.status === "pending");

/** Record a failed item; the outcome is emitted as soon as memory has it. */
const fail = (item, error) => {
  const write = putItem({ ...item, inFlight: false, status: "failed", error, failedAt: new Date().toISOString() });
  emit({ id: item.id, clientEventId: item.clientEventId, kind: item.kind, outcome: "failed", error });
  return write;
};

/**
 * After an unanswered or server-failed try: wait and retry, or give up.
 * `due`: the try was due under the backoff (a forced one is not counted
 * against the server-failure budget). Returns "held" | "failed".
 */
const afterTrouble = async (item, err, how, { due = true } = {}) => {
  const now = Date.now();
  const lastError = storedError(err, how === "no-answer" ? { message: "No answer from the server" } : {});
  const next = { ...item };
  if (how === "no-answer" || how === "gateway") {
    next.mayBeRecorded = true;
    if (!isOffline()) {
      // Time spent retrying: the gap since the last unanswered online try,
      // capped (a longer gap was spent offline or with no page open).
      const last = Number(item.lastNoAnswerTryAtMs) || 0;
      const gap = last ? Math.min(Math.max(0, now - last), NO_ANSWER_GAP_CAP_MS) : 0;
      next.noAnswerRetryingMs = (Number(item.noAnswerRetryingMs) || 0) + gap;
      next.lastNoAnswerTryAtMs = now;
      next.noAnswerTries = (Number(item.noAnswerTries) || 0) + 1;
    }
    const tries = Number(next.noAnswerTries) || 0;
    if (tries >= MIN_NO_ANSWER_TRIES && (Number(next.noAnswerRetryingMs) || 0) >= NO_ANSWER_GIVE_UP_MS) {
      await fail(next, {
        ...lastError,
        code: "NO_ANSWER",
        uncertain: true,
        message: "No answer from the server over 3 days of retrying",
      });
      return "failed";
    }
  } else {
    next.firstServerFailureAtMs = Number(item.firstServerFailureAtMs) || now;
    if (due) next.serverAttempts = (Number(item.serverAttempts) || 0) + 1;
    const tries = Number(next.serverAttempts) || 0;
    if (tries >= MAX_SERVER_ATTEMPTS && now - next.firstServerFailureAtMs >= SERVER_GIVE_UP_MIN_MS) {
      await fail(next, {
        ...storedError(err, {
          message: `The server kept failing after ${tries} tries (${lastError.httpStatus}): ${lastError.message}`,
        }),
        code: "GAVE_UP",
        uncertain: true,
      });
      return "failed";
    }
  }
  const attempts = (Number(item.attempts) || 0) + 1;
  await putItem({ ...next, inFlight: false, attempts, nextAttemptAt: now + backoffMs(attempts), lastError });
  return "held";
};

/**
 * Send one queued event: "sent" | "failed" | "held" (still queued). Marked in
 * flight on the device first, as a first send is, so a Discard in another tab
 * cannot claim it while it is out; held, unsent, when the device no longer
 * holds the row this tab read, waiting and not in flight.
 */
const sendQueued = async (item, extraSenders, { due = true } = {}) => {
  const send = (extraSenders && extraSenders[item.kind]) || senders.get(item.kind);
  if (typeof send !== "function") return "held";
  sending.add(item.id);
  try {
    const marked = { ...item, inFlight: true, inFlightSince: Date.now(), sendingHere: true };
    const mark = await putItem(marked, (cur) =>
      cur ? cur.status === "pending" && !cur.inFlight && cur.writeId === item.writeId : item.persisted === false
    );
    if (mark.refused) return "held";
    const result = await withTimeout(() => send(item.payload), sendTimeoutMs);
    const write = settle(item, "sent", { result });
    emit({ id: item.id, clientEventId: item.clientEventId, kind: item.kind, outcome: "sent", result });
    await write;
    return "sent";
  } catch (err) {
    if (!stillPending(item.id)) return "held";
    const how = classify(err);
    const current = items.find((i) => i.id === item.id) || item;
    if (how !== "final") return afterTrouble(current, err, how, { due });
    await fail(current, storedError(err));
    return "failed";
  } finally {
    sending.delete(item.id);
  }
};

/**
 * Send this user's waiting events of one kind, oldest first, until one is
 * held. Call inside exclusive(kind): it re-reads the device, takes back rows
 * a closed page left in flight, and only then sends.
 */
const flushKind = async (kind, owner, { force = false, senders: extra } = {}) => {
  await loadFromDb();
  await reclaimOrphans(kind);
  const gate = { epoch: identityEpoch, token: readLocal("token") };
  let sent = 0;
  let failed = 0;
  for (;;) {
    if (isOffline()) break;
    const next = pendingOf(kind, owner)[0];
    if (!next) break;
    if (!gateOpen(next, gate)) break; // someone else is signed in, or just was: hold
    const due = (Number(next.nextAttemptAt) || 0) <= Date.now();
    if (!force && !due) break;
    const outcome = await sendQueued(next, extra, { due });
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
  // Kinds with something waiting, or a row in flight (another tab's live send,
  // or one a closed page left: flushKind takes it back under the lock).
  const kinds = [
    ...new Set(items.filter((i) => i.status === "pending" && i.userId === owner).map((i) => i.kind)),
  ];
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

/**
 * Queue (or re-queue) an event. The same event keeps its place, its tries
 * and its give-up clocks (a re-post must not reset the budget).
 * @returns {Promise<{persisted: boolean, refused?: true, current?: object|null}>}
 */
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
    attempts: Number(earlier?.attempts) || 0,
    serverAttempts: Number(earlier?.serverAttempts) || 0,
    firstServerFailureAtMs: Number(earlier?.firstServerFailureAtMs) || 0,
    noAnswerTries: Number(earlier?.noAnswerTries) || 0,
    lastNoAnswerTryAtMs: Number(earlier?.lastNoAnswerTryAtMs) || 0,
    noAnswerRetryingMs: Number(earlier?.noAnswerRetryingMs) || 0,
    mayBeRecorded: earlier?.mayBeRecorded === true,
    nextAttemptAt: Number(earlier?.nextAttemptAt) || 0,
    lastError: earlier?.lastError || null,
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
 *   The same clientEventId again: a waiting copy is replaced (keeping its
 *   place and its tries). One already sent (getOutboxStatus "sent") is never
 *   queued again: its answer, when this page still holds it, is returned as
 *   is; otherwise `send` runs once more inline for the answer (the server
 *   answers a repeated clientEventId with the original). That inline send is
 *   not queued even when it gets no answer or the device is offline: it
 *   rethrows the raw error, like a first send's unknown outcome, while
 *   getOutboxStatus still reads "sent" (the server has it).
 * @returns {Promise<{queued: true, persisted: boolean} | {queued: false, result: any}>}
 *   persisted:false: this browser could not store it; it lives only as long
 *   as this page.
 * @throws the RAW error from `send` when the server refused it (4xx other
 *   than 408/429), or from the inline re-send of an event already sent (any
 *   error, offline included: see above); a kind with no registered sender
 *   throws before sending.
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
    const sentAlready = () => {
      const known = items.find((i) => i.id === id);
      return known?.status === "sent" && known.userId === owner ? known : null;
    };
    // Reads the device first; older events of this kind go first (and a waiting copy of this one).
    await flushKind(kind, owner);
    // Sending it again replaces a refused or given-up copy: the caller holds it now.
    if (items.some((i) => i.id === id && i.status === "failed")) await dropItem(id);
    const done = sentAlready();
    if (done && done.result !== undefined) return { queued: false, result: done.result };
    if (done) return { queued: false, result: await withTimeout(() => send(payload), sendTimeoutMs) };

    if (isOffline() || pendingOf(kind, owner).length) {
      const res = await enqueue(base);
      askForPersistence();
      return { queued: true, persisted: res.persisted };
    }

    // Write-ahead: on the device before it goes out.
    sending.add(id);
    let result;
    try {
      await enqueue(base, { inFlight: true, inFlightSince: Date.now() });
      try {
        result = await withTimeout(() => send(payload), sendTimeoutMs);
      } catch (err) {
        const how = classify(err);
        const current = items.find((i) => i.id === id);
        if (how === "final" || !current) {
          await dropItem(id);
          throw err;
        }
        await afterTrouble(current, err, how, { due: true });
        askForPersistence();
        const now = items.find((i) => i.id === id);
        if (now?.status === "failed") throw err; // gave up at once (only for an event already days old)
        return { queued: true, persisted: now?.persisted !== false };
      }
      const current = items.find((i) => i.id === id);
      if (current) await settle(current, "sent", { result });
      return { queued: false, result };
    } finally {
      sending.delete(id);
    }
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

/**
 * A waiting event is listed while it waits and while this tab retries it; a
 * send in flight from a page's own submit, or from another tab, is not.
 */
const listed = (i) => !i.inFlight || i.sendingHere === true;

/** True once the events stored on this device have loaded (counts before that read 0). */
export const useOutboxReady = () => useSnapshot().ready;

/** Resolves once the events stored on this device have loaded. */
export const outboxReady = () => hydrate();

/** Events of `kind` (every kind when omitted) waiting to sync for the signed-in user. */
export const usePendingCount = (kind) => {
  const snap = useSnapshot();
  let n = 0;
  for (const i of snap.items) {
    if (i.status === "pending" && listed(i) && snap.owner && i.userId === snap.owner && (!kind || i.kind === kind)) n += 1;
  }
  return n;
};

/**
 * Events of `kind` (every kind when omitted) waiting to sync, oldest first:
 * `{id, kind, clientEventId, payload, summary, createdAt, attempts, lastError, persisted,
 * mayBeRecorded}`. mayBeRecorded: a try got no answer, so the server may
 * already hold it (see mayBeRecorded()).
 */
export const usePendingItems = (kind) => {
  const snap = useSnapshot();
  return useMemo(() => mineOf(snap, "pending", kind).filter(listed), [snap, kind]);
};

/**
 * Events of `kind` (every kind when omitted) the server refused or that were
 * given up on, oldest first:
 * `{id, kind, clientEventId, payload, summary, error, createdAt, failedAt}`.
 * `payload` is what was queued, so a screen can offer "Open again".
 * `error.uncertain === true` marks a give-up (`error.code` "GAVE_UP" or
 * "NO_ANSWER"): the server MAY have recorded it, so check before re-entering
 * it (sending it again with the same clientEventId is safe: the server answers
 * a repeat with the original). Without it, the server refused it: not recorded.
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

/**
 * Whether the server may already hold this event: a waiting event one of
 * whose tries got no answer (or a gateway error), or a failed item that was
 * given up on (`error.uncertain`).
 */
export const mayBeRecorded = (item) => item?.mayBeRecorded === true || item?.error?.uncertain === true;

/**
 * Forget a failed item (the user has seen it, or the screen took it back).
 * Runs under the kind's lock on what the device holds now; false when it is
 * no longer a failed item (sent, re-posted or dismissed in another tab).
 */
export const dismissFailed = async (id) => {
  await hydrate();
  const first = items.find((i) => i.id === id);
  if (!first) return false;
  return exclusive(first.kind, async () => {
    await loadFromDb();
    const owner = reduxOwner();
    const item = items.find((i) => i.id === id && i.status === "failed");
    if (!item || item.userId !== owner) return false;
    const res = await settle(item, "dismissed", { expect: "failed" });
    return !res.refused;
  });
};

/**
 * Throw away a waiting event: it will not be sent. Waits for a send of its
 * kind in progress (in any tab), then decides on what the device holds; false
 * when it was sent or settled meanwhile.
 */
export const discardPending = async (id) => {
  await hydrate();
  const first = items.find((i) => i.id === id);
  if (!first) return false;
  return exclusive(first.kind, async () => {
    await loadFromDb();
    await reclaimOrphans(first.kind);
    const owner = reduxOwner();
    const item = items.find((i) => i.id === id && i.status === "pending" && !i.inFlight);
    if (!item || item.userId !== owner) return false;
    const res = await settle(item, "dismissed", { expect: "pending", idle: true });
    if (res.refused) return false;
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
  sending.clear();
  outcomeListeners.clear();
  senders.clear();
  for (const [k, v] of Object.entries(DEFAULT_SENDERS)) senders.set(k, v);
  notify();
};
/** Test-only (undefined outside NODE_ENV=test, so production builds drop it). */
export const _resetOutboxForTests = process.env.NODE_ENV === "test" ? resetForTests : undefined;
