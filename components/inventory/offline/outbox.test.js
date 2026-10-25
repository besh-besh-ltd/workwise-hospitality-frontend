// The scan-screen outbox, against fake-indexeddb. services/inventory and the
// signed-in profile are mocked; everything else is the real module.

// jsdom has no structuredClone, which fake-indexeddb needs for every write;
// Node's v8 serializer is the same structured-clone algorithm.
const v8 = require("v8");
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => v8.deserialize(v8.serialize(value));
}
const { IDBFactory, IDBObjectStore } = require("fake-indexeddb");

let mockProfile = { id: 407 };
const mockStoreListeners = new Set();
jest.mock("@/redux/store", () => ({
  __esModule: true,
  store: {
    getState: () => ({ userProfile: mockProfile }),
    subscribe: (l) => {
      mockStoreListeners.add(l);
      return () => mockStoreListeners.delete(l);
    },
  },
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  createGrn: jest.fn(),
  postOut: jest.fn(),
  saveCountLines: jest.fn(),
}));

import { act, configure, renderHook, waitFor } from "@testing-library/react";
import { createGrn, postOut, saveCountLines } from "@/services/inventory";
import {
  MAX_SERVER_ATTEMPTS,
  MIN_NO_ANSWER_TRIES,
  NO_ANSWER_GAP_CAP_MS,
  NO_ANSWER_GIVE_UP_MS,
  OUTBOX_DB_NAME,
  SERVER_GIVE_UP_MIN_MS,
  _resetOutboxForTests,
  discardPending,
  dismissFailed,
  flush,
  getOutboxStatus,
  mayBeRecorded,
  onOutboxOutcome,
  outboxLinkFor,
  outboxReady,
  registerSender,
  retryNow,
  submitOrQueue,
  useFailedItems,
  useOutboxAutoSync,
  useOutboxReady,
  usePendingCount,
  usePendingItems,
} from "./outbox";

let online = true;
Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => online });

// IndexedDB round trips (and a second tab's): room for a loaded CI machine;
// each wait still ends as soon as the state shows.
configure({ asyncUtilTimeout: 4000 });
jest.setTimeout(20000);

const networkError = () => Object.assign(new Error("Network Error"), { isAxiosError: true, code: "ERR_NETWORK", request: {} });
const httpError = (status, data) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    request: {},
    response: { status, data: { status: 0, ...data } },
  });

const countEvent = (n, lines = [{ invItemId: 8, countedQty: n, clientEventId: `line-${n}` }]) => ({
  kind: "count_lines",
  clientEventId: `count-${n}`,
  payload: { countId: 31, lines },
  send: (p) => saveCountLines(p.countId, p.lines),
});

const outEvent = (key = "out-1") => ({
  kind: "out_post",
  clientEventId: key,
  payload: { hotelId: 46, docType: "OUT", departmentId: 3, clientEventId: key, lines: [{ invItemId: 8, qty: 2 }] },
  send: (p) => postOut(p),
});

// ── Who is signed in: this tab's redux profile, redux-persist's copy, the token.
const persistRoot = (id) => JSON.stringify({ userProfile: JSON.stringify(id == null ? null : { id, name: `User ${id}` }), _persist: "{}" });
const signIn = (id) => {
  mockProfile = id == null ? null : { id };
  if (id == null) {
    localStorage.removeItem("token");
    localStorage.removeItem("persist:root");
  } else {
    localStorage.setItem("token", `tok-${id}`);
    localStorage.setItem("persist:root", persistRoot(id));
  }
};
/** This tab's redux profile changes (a sign-in switch here). */
const switchTabUser = (id) =>
  act(() => {
    signIn(id);
    mockStoreListeners.forEach((l) => l());
  });
/** Another tab changed a key: the browser tells this tab with a storage event. */
const otherTabSets = (key, value) => {
  const oldValue = localStorage.getItem(key);
  localStorage.setItem(key, value);
  window.dispatchEvent(new StorageEvent("storage", { key, oldValue, newValue: value, storageArea: localStorage }));
};

// ── The device database, as another tab (or a closed page) left it.
const openRaw = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(OUTBOX_DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("events", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
const rawRows = async () => {
  const db = await openRaw();
  return new Promise((resolve, reject) => {
    const req = db.transaction("events", "readonly").objectStore("events").getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
};
const putRaw = async (row) => {
  const db = await openRaw();
  return new Promise((resolve, reject) => {
    const t = db.transaction("events", "readwrite");
    t.objectStore("events").put(row);
    t.oncomplete = () => {
      db.close();
      resolve();
    };
    t.onerror = () => reject(t.error);
  });
};
const rawOut = (key, patch = {}) => ({
  id: `out_post:${key}`,
  kind: "out_post",
  clientEventId: key,
  userId: "407",
  payload: outEvent(key).payload,
  summary: "Mark out · 1 line",
  seq: 1,
  createdAt: new Date().toISOString(),
  createdAtMs: Date.now(),
  status: "pending",
  inFlight: false,
  attempts: 0,
  serverAttempts: 0,
  nextAttemptAt: 0,
  lastError: null,
  ...patch,
});

/** Move the clock forward (Date.now only; timers stay real). */
let skew = 0;
const realNow = Date.now.bind(Date);
const travel = (ms) => {
  skew += ms;
};

/** Simulate a page load: memory gone, the device database kept. */
const reload = () => act(() => _resetOutboxForTests());

/** Read a hook once (mounted only for the read, so later changes need no act). */
const peek = (hook) => {
  const r = renderHook(hook);
  const value = r.result.current;
  r.unmount();
  return value;
};

const queueOffline = async (event) => {
  online = false;
  await submitOrQueue(event);
  online = true;
};

/** The backoff after `n` tries (mirrors outbox.js: 5 s doubling, capped at 5 min). */
const backoffAfter = (n) => Math.min(5 * 60 * 1000, 5000 * 2 ** Math.max(0, n - 1));

/**
 * navigator.locks, as the browser has it: one holder per name, waiters in
 * order, and `ifAvailable` handed `null` when the name is held or queued.
 */
const installLocks = () => {
  const tails = new Map();
  const open = new Map();
  const request = jest.fn((name, optsOrWork, maybeWork) => {
    const opts = typeof optsOrWork === "function" ? {} : optsOrWork || {};
    const work = typeof optsOrWork === "function" ? optsOrWork : maybeWork;
    if (opts.ifAvailable && (open.get(name) || 0) > 0) return Promise.resolve().then(() => work(null));
    open.set(name, (open.get(name) || 0) + 1);
    const run = (tails.get(name) || Promise.resolve()).then(() => work({ name })).finally(() => {
      open.set(name, open.get(name) - 1);
    });
    tails.set(name, run.catch(() => {}));
    return run;
  });
  Object.defineProperty(navigator, "locks", { configurable: true, value: { request } });
  return request;
};

/** Another tab: a second copy of the module on the same device database and Web Locks. */
const openOtherTab = () => {
  let tab;
  jest.isolateModules(() => {
    tab = require("./outbox");
  });
  return tab;
};

/** A send whose answer the test gives. */
const heldSend = () => {
  const gate = {};
  gate.send = jest.fn(
    () =>
      new Promise((resolve, reject) => {
        gate.answer = resolve;
        gate.fail = reject;
      })
  );
  return gate;
};

beforeEach(async () => {
  await _resetOutboxForTests();
  globalThis.indexedDB = new IDBFactory();
  online = true;
  localStorage.clear();
  signIn(407);
  jest.resetAllMocks();
  skew = 0;
  jest.spyOn(Date, "now").mockImplementation(() => realNow() + skew);
});

afterEach(() => {
  jest.restoreAllMocks();
  delete navigator.locks;
  delete navigator.storage;
});

describe("submitOrQueue", () => {
  it("outbox enqueues when offline and flushes on online", async () => {
    const outcomes = [];
    onOutboxOutcome((e) => outcomes.push(e));
    const pending = renderHook(() => usePendingCount());

    online = false;
    let res;
    await act(async () => {
      res = await submitOrQueue(outEvent());
    });
    expect(res).toEqual({ queued: true, persisted: true });
    expect(postOut).not.toHaveBeenCalled();
    await waitFor(() => expect(pending.result.current).toBe(1));

    postOut.mockResolvedValue({ id: 5, outNumber: "OUT/46/2026-27/00005" });
    renderHook(() => useOutboxAutoSync({ intervalMs: 60000 }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(postOut).not.toHaveBeenCalled(); // still offline

    online = true;
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(pending.result.current).toBe(0));

    expect(postOut).toHaveBeenCalledTimes(1);
    expect(postOut).toHaveBeenCalledWith(expect.objectContaining({ clientEventId: "out-1", hotelId: 46 }));
    expect(outcomes).toEqual([
      expect.objectContaining({ clientEventId: "out-1", kind: "out_post", outcome: "sent", result: { id: 5, outNumber: "OUT/46/2026-27/00005" } }),
    ]);
    expect(getOutboxStatus("out_post", "out-1")).toBe("sent");
  });

  it("sends directly when online and returns the server's answer", async () => {
    postOut.mockResolvedValue({ id: 9, replayed: true, no_op: true });
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: false, result: { id: 9, replayed: true, no_op: true } });
    expect(peek(() => usePendingCount())).toBe(0);
    expect(getOutboxStatus("out_post", "out-1")).toBe("sent");
  });

  it("queues when the request gets no answer; later events of the kind queue behind it", async () => {
    postOut.mockRejectedValueOnce(networkError());
    await expect(submitOrQueue(outEvent("a"))).resolves.toEqual({ queued: true, persisted: true });
    // "a" waits out its backoff, so "b" queues behind it without a send.
    await expect(submitOrQueue(outEvent("b"))).resolves.toEqual({ queued: true, persisted: true });
    expect(postOut).toHaveBeenCalledTimes(1);
    expect(peek(() => usePendingCount("out_post"))).toBe(2);
  });

  it.each([500, 503, 408, 429])("queues a %d on the first send, as a replay would", async (status) => {
    postOut.mockRejectedValueOnce(httpError(status, { message: "Try again later" }));
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: true, persisted: true });
    expect(peek(() => usePendingItems())).toEqual([
      expect.objectContaining({ clientEventId: "out-1", attempts: 1, lastError: expect.objectContaining({ httpStatus: status }) }),
    ]);
  });

  it("rethrows a refusal as the raw error, keeping code and details, and keeps nothing", async () => {
    const refusal = httpError(409, {
      code: "NEGATIVE_STOCK",
      message: "Not enough stock",
      details: { lines: [{ invItemId: 8, available: 1, requested: 2 }] },
    });
    postOut.mockRejectedValueOnce(refusal);
    await expect(submitOrQueue(outEvent())).rejects.toBe(refusal);

    expect(peek(() => usePendingCount())).toBe(0);
    expect(await rawRows()).toEqual([]);
    expect(getOutboxStatus("out_post", "out-1")).toBe("unknown");
  });

  it("throws for a kind with no registered sender, before sending", async () => {
    const send = jest.fn();
    await expect(submitOrQueue({ kind: "token_grn", clientEventId: "t1", payload: {}, send })).rejects.toThrow(/no sender/);
    expect(send).not.toHaveBeenCalled();
  });

  it("never queues without a signed-in user (token pages): the error comes back raw", async () => {
    signIn(null);
    const err = networkError();
    postOut.mockRejectedValueOnce(err);
    await expect(submitOrQueue(outEvent())).rejects.toBe(err);
    online = false;
    postOut.mockRejectedValueOnce(err);
    await expect(submitOrQueue(outEvent())).rejects.toBe(err);
    signIn(407);
    expect(peek(() => usePendingCount())).toBe(0);
  });

  it("never queues while the tabs disagree on who is signed in", async () => {
    // This tab still shows user 407; another tab has since signed in as 500.
    localStorage.setItem("persist:root", persistRoot(500));
    const err = networkError();
    postOut.mockRejectedValueOnce(err);
    await expect(submitOrQueue(outEvent())).rejects.toBe(err);
    expect(await rawRows()).toEqual([]);
  });

  it("writes the event to the device before the first send and records the answer", async () => {
    let answer;
    postOut.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          answer = resolve;
        })
    );
    const done = submitOrQueue(outEvent());
    await waitFor(async () =>
      expect(await rawRows()).toEqual([expect.objectContaining({ id: "out_post:out-1", status: "pending", inFlight: true })])
    );
    await waitFor(() => expect(answer).toBeDefined());
    // In flight is not "waiting".
    expect(peek(() => usePendingCount())).toBe(0);

    answer({ id: 1 });
    await expect(done).resolves.toEqual({ queued: false, result: { id: 1 } });
    expect(await rawRows()).toEqual([expect.objectContaining({ id: "out_post:out-1", status: "sent", payload: null })]);
  });

  it("an event a closed page left in flight is waiting again on the next load", async () => {
    await putRaw(rawOut("left", { inFlight: true }));
    await outboxReady();
    expect(peek(() => usePendingCount())).toBe(1);
    postOut.mockResolvedValue({ id: 3, replayed: true, no_op: true });
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
    expect(postOut).toHaveBeenCalledWith(expect.objectContaining({ clientEventId: "left" }));
  });

  it("queues a send that never settles (a 401 parks the promise) once the timeout passes", async () => {
    await _resetOutboxForTests({ sendTimeout: 30 });
    postOut.mockImplementationOnce(() => new Promise(() => {}));
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: true, persisted: true });
    expect(getOutboxStatus("out_post", "out-1")).toBe("pending");
  });

  it("without device storage the event is kept on this page only, and says so", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    globalThis.indexedDB = undefined;
    online = false;
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: true, persisted: false });
    expect(peek(() => usePendingItems())).toEqual([expect.objectContaining({ clientEventId: "out-1", persisted: false })]);

    online = true;
    postOut.mockResolvedValue({ id: 1 });
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
  });

  it("asks the browser to keep its storage once, when the first event is queued", async () => {
    const persist = jest.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, "storage", { configurable: true, value: { persist } });
    online = false;
    await submitOrQueue(outEvent("a"));
    await submitOrQueue(outEvent("b"));
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it("sends of a kind hold a Web Lock for that kind", async () => {
    const request = installLocks();
    postOut.mockResolvedValue({ id: 1 });
    await submitOrQueue(outEvent());
    expect(request).toHaveBeenCalledWith("workwise-inventory-outbox:out_post", expect.any(Function));
  });

  it("re-posting a waiting event keeps its tries and give-up clocks", async () => {
    await queueOffline(outEvent());
    postOut.mockRejectedValueOnce(httpError(500, { message: "boom" }));
    await flush();
    const [before] = await rawRows();
    expect(before).toMatchObject({ attempts: 1, serverAttempts: 1 });
    expect(before.firstServerFailureAtMs).toBeGreaterThan(0);

    travel(1000);
    // The screen posts it again (same clientEventId) before its backoff is due.
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: true, persisted: true });
    const [after] = await rawRows();
    expect(after).toMatchObject({
      attempts: 1,
      serverAttempts: 1,
      firstServerFailureAtMs: before.firstServerFailureAtMs,
      createdAtMs: before.createdAtMs,
      seq: before.seq,
      nextAttemptAt: before.nextAttemptAt,
    });
  });

  it("re-posting an event its waiting copy just sent returns that answer and sends nothing more", async () => {
    await queueOffline(outEvent());
    postOut.mockResolvedValue({ id: 5 });
    // Back online: the screen posts it again; the waiting copy goes first.
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: false, result: { id: 5 } });
    expect(postOut).toHaveBeenCalledTimes(1);
    expect(getOutboxStatus("out_post", "out-1")).toBe("sent");
  });

  it("re-posting an event sent elsewhere while offline rethrows the raw error, queues nothing and still reads sent", async () => {
    await putRaw(rawOut("out-1", { status: "sent", payload: null, settledAtMs: Date.now() }));
    online = false;
    const offlineErr = networkError();
    postOut.mockRejectedValue(offlineErr);
    await expect(submitOrQueue(outEvent())).rejects.toBe(offlineErr);
    expect(getOutboxStatus("out_post", "out-1")).toBe("sent");
    expect(await rawRows()).toEqual([expect.objectContaining({ status: "sent" })]);
    expect(peek(() => usePendingCount())).toBe(0);
  });

  it("re-posting an event sent on an earlier page sends it once for the server's answer and queues nothing", async () => {
    await putRaw(rawOut("out-1", { status: "sent", payload: null, settledAtMs: Date.now() }));
    postOut.mockResolvedValue({ id: 5, replayed: true });
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: false, result: { id: 5, replayed: true } });
    expect(postOut).toHaveBeenCalledTimes(1);
    expect(await rawRows()).toEqual([expect.objectContaining({ id: "out_post:out-1", status: "sent" })]);
    expect(peek(() => usePendingCount())).toBe(0);
  });
});

describe("FIFO per kind", () => {
  it("an older count save is sent before a newer one, never after", async () => {
    const order = [];
    saveCountLines.mockImplementation(async (countId, lines) => {
      order.push(lines[0].countedQty);
      return { id: countId };
    });

    online = false;
    await submitOrQueue(countEvent(5));
    await submitOrQueue(countEvent(6));
    online = true;
    // The next save goes out only after the two waiting ones.
    const res = await submitOrQueue(countEvent(7));
    expect(res).toEqual({ queued: false, result: { id: 31 } });
    expect(order).toEqual([5, 6, 7]);
  });

  it("while an older save waits out its backoff, a newer one queues behind it", async () => {
    const order = [];
    saveCountLines.mockRejectedValueOnce(networkError());
    await expect(submitOrQueue(countEvent(5))).resolves.toEqual({ queued: true, persisted: true });
    await expect(submitOrQueue(countEvent(6))).resolves.toEqual({ queued: true, persisted: true });
    expect(saveCountLines).toHaveBeenCalledTimes(1);

    saveCountLines.mockImplementation(async (countId, lines) => {
      order.push(lines[0].countedQty);
      return { id: countId };
    });
    await flush(); // backoff not due: nothing sent
    expect(order).toEqual([]);
    await expect(flush({ force: true })).resolves.toEqual({ sent: 2, failed: 0, pending: 0 });
    expect(order).toEqual([5, 6]);
  });

  it("kinds do not wait on each other", async () => {
    saveCountLines.mockRejectedValueOnce(networkError());
    await submitOrQueue(countEvent(5));
    postOut.mockResolvedValue({ id: 1 });
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: false, result: { id: 1 } });
  });
});

describe("replaying queued events", () => {
  it("a 4xx is final: dropped from the queue and kept as a failed item with its payload", async () => {
    const outcomes = [];
    onOutboxOutcome((e) => outcomes.push(e));
    await queueOffline(countEvent(5));
    saveCountLines.mockRejectedValueOnce(httpError(409, { code: "CONFLICT", message: "This count was already submitted", details: { status: "submitted" } }));

    const pending = renderHook(() => usePendingCount("count_lines"));
    const failed = renderHook(() => useFailedItems());
    await act(() => flush());

    expect(pending.result.current).toBe(0);
    expect(failed.result.current).toHaveLength(1);
    const item = failed.result.current[0];
    expect(item).toMatchObject({
      kind: "count_lines",
      clientEventId: "count-5",
      summary: "Count #31 · 1 line",
      payload: { countId: 31, lines: [{ invItemId: 8, countedQty: 5, clientEventId: "line-5" }] },
      error: { httpStatus: 409, code: "CONFLICT", details: { status: "submitted" }, message: "This count was already submitted" },
    });
    expect(Date.parse(item.failedAt)).not.toBeNaN();
    expect(getOutboxStatus("count_lines", "count-5")).toBe("failed");
    expect(outcomes).toEqual([
      expect.objectContaining({ clientEventId: "count-5", kind: "count_lines", outcome: "failed", error: expect.objectContaining({ code: "CONFLICT" }) }),
    ]);

    // A later flush does not send it again.
    await act(() => flush({ force: true }));
    expect(saveCountLines).toHaveBeenCalledTimes(1);

    await act(() => dismissFailed(item.id));
    expect(failed.result.current).toEqual([]);
    expect(getOutboxStatus("count_lines", "count-5")).toBe("dismissed");
  });

  it.each([500, 503, 408, 429])("a %d keeps the event queued with backoff and shows why", async (status) => {
    await queueOffline(outEvent());
    postOut.mockRejectedValueOnce(httpError(status, { message: "boom" }));
    await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    await flush();
    expect(postOut).toHaveBeenCalledTimes(1); // backoff not due
    expect(peek(() => usePendingItems())[0].lastError).toEqual(expect.objectContaining({ httpStatus: status }));
    postOut.mockResolvedValueOnce({ id: 3, replayed: true, no_op: true });
    await expect(flush({ force: true })).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
  });

  it(`given up (uncertain) after ${MAX_SERVER_ATTEMPTS} due server failures over at least 30 minutes; its kind moves on`, async () => {
    const outcomes = [];
    onOutboxOutcome((e) => outcomes.push(e));
    await queueOffline(outEvent("a"));
    await queueOffline(outEvent("b"));
    postOut.mockImplementation(async (p) => {
      if (p.clientEventId === "a") throw httpError(500, { message: "boom" });
      return { id: 2 };
    });
    // Each retry waits out its backoff: 10 tries take about 20 minutes.
    await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 2 });
    for (let n = 1; n < MAX_SERVER_ATTEMPTS; n += 1) {
      travel(backoffAfter(n) + 1);
      await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 2 });
    }
    expect(postOut).toHaveBeenCalledTimes(MAX_SERVER_ATTEMPTS);
    expect((await rawRows()).find((r) => r.clientEventId === "a")).toMatchObject({ serverAttempts: MAX_SERVER_ATTEMPTS });

    // Not before 30 minutes since the first failure.
    travel(SERVER_GIVE_UP_MIN_MS);
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 1, pending: 0 });

    const error = expect.objectContaining({
      httpStatus: 500,
      code: "GAVE_UP",
      uncertain: true,
      message: expect.stringContaining(`after ${MAX_SERVER_ATTEMPTS + 1} tries`),
    });
    expect(peek(() => useFailedItems("out_post"))).toEqual([
      expect.objectContaining({ clientEventId: "a", payload: outEvent("a").payload, error }),
    ]);
    expect(outcomes).toEqual([
      expect.objectContaining({ clientEventId: "a", outcome: "failed", error }),
      expect.objectContaining({ clientEventId: "b", outcome: "sent" }),
    ]);
    expect(getOutboxStatus("out_post", "b")).toBe("sent");
  });

  it("Sync now, Retry now and coming back online do not spend the server-failure budget", async () => {
    await queueOffline(outEvent());
    postOut.mockRejectedValue(httpError(500, { message: "boom" }));
    await flush(); // due: the first failure
    for (let i = 0; i < MAX_SERVER_ATTEMPTS * 2; i += 1) {
      await flush({ force: true });
      await retryNow("out_post:out-1");
    }
    expect(postOut).toHaveBeenCalledTimes(1 + MAX_SERVER_ATTEMPTS * 4);
    travel(SERVER_GIVE_UP_MIN_MS + 1);
    await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    expect(await rawRows()).toEqual([expect.objectContaining({ status: "pending", serverAttempts: 2 })]);
  });

  it.each([502, 503, 504])("a gateway %d is waited out like no answer: not given up on the attempt count", async (status) => {
    await queueOffline(outEvent());
    postOut.mockRejectedValue(httpError(status, { message: "Bad gateway" }));
    await flush();
    for (let n = 1; n <= MAX_SERVER_ATTEMPTS + 2; n += 1) {
      travel(backoffAfter(n) + 1);
      await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    }
    expect(peek(() => usePendingItems())[0]).toEqual(expect.objectContaining({ mayBeRecorded: true }));
    expect(await rawRows()).toEqual([expect.objectContaining({ noAnswerTries: MAX_SERVER_ATTEMPTS + 3, serverAttempts: 0 })]);
  });

  it("time spent retrying adds up the gaps between unanswered online tries (no answer or a gateway error), each capped", async () => {
    await queueOffline(outEvent());
    let n = 0;
    postOut.mockImplementation(async () => {
      n += 1;
      throw n % 2 ? networkError() : httpError(503, { message: "Service Unavailable" });
    });
    await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    const [waiting] = peek(() => usePendingItems());
    expect(waiting.lastError).toEqual(expect.objectContaining({ message: "No answer from the server" }));
    expect(mayBeRecorded(waiting)).toBe(true);
    expect(await rawRows()).toEqual([expect.objectContaining({ noAnswerTries: 1, noAnswerRetryingMs: 0 })]);

    for (let i = 0; i < 4; i += 1) {
      travel(NO_ANSWER_GAP_CAP_MS / 2);
      await flush({ force: true });
    }
    travel(NO_ANSWER_GAP_CAP_MS * 10); // a long gap counts as one capped gap
    await flush();
    const [row] = await rawRows();
    expect(row).toMatchObject({ status: "pending", noAnswerTries: 6 });
    // 4 half gaps + 1 capped gap (plus the few real milliseconds the test took).
    expect(row.noAnswerRetryingMs).toBeGreaterThanOrEqual(3 * NO_ANSWER_GAP_CAP_MS);
    expect(row.noAnswerRetryingMs).toBeLessThan(3 * NO_ANSWER_GAP_CAP_MS + 60 * 1000);
  });

  it(`given up (uncertain) once 3 days have been spent retrying, with ${MIN_NO_ANSWER_TRIES}+ unanswered tries`, async () => {
    // Retried for 3 days less one gap: the next unanswered try crosses the line.
    await putRaw(
      rawOut("out-1", {
        noAnswerTries: MIN_NO_ANSWER_TRIES - 1, lastNoAnswerTryAtMs: Date.now(),
        noAnswerRetryingMs: NO_ANSWER_GIVE_UP_MS - NO_ANSWER_GAP_CAP_MS, mayBeRecorded: true,
      })
    );
    postOut.mockRejectedValue(httpError(504, { message: "Gateway Timeout" }));
    travel(NO_ANSWER_GAP_CAP_MS - 1000);
    await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    travel(1000);
    await expect(flush({ force: true })).resolves.toEqual({ sent: 0, failed: 1, pending: 0 });
    const [failed] = peek(() => useFailedItems());
    expect(failed).toEqual(
      expect.objectContaining({
        payload: outEvent().payload,
        error: expect.objectContaining({ httpStatus: 504, code: "NO_ANSWER", uncertain: true }),
      })
    );
    expect(mayBeRecorded(failed)).toBe(true);
  });

  it(`three days spent retrying also need ${MIN_NO_ANSWER_TRIES} unanswered tries`, async () => {
    await putRaw(
      rawOut("few", {
        noAnswerTries: 1, lastNoAnswerTryAtMs: Date.now() - NO_ANSWER_GAP_CAP_MS,
        noAnswerRetryingMs: NO_ANSWER_GIVE_UP_MS, mayBeRecorded: true,
      })
    );
    postOut.mockRejectedValue(networkError());
    await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    await expect(flush({ force: true })).resolves.toEqual({ sent: 0, failed: 1, pending: 0 });
  });

  it("time spent offline does not count toward the 3 days", async () => {
    await queueOffline(outEvent());
    online = false;
    travel(NO_ANSWER_GIVE_UP_MS * 2);
    await flush(); // offline: nothing goes out
    online = true;
    postOut.mockRejectedValue(networkError());
    for (let i = 0; i < MIN_NO_ANSWER_TRIES + 2; i += 1) {
      await expect(flush({ force: true })).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    }
    expect(await rawRows()).toEqual([expect.objectContaining({ status: "pending", noAnswerTries: MIN_NO_ANSWER_TRIES + 2 })]);
  });

  it("P5: offline (or closed) days after the first unanswered try do not count toward the 3 days", async () => {
    await queueOffline(outEvent());
    postOut.mockRejectedValue(networkError());
    await flush(); // the first unanswered try, online
    online = false;
    travel(NO_ANSWER_GIVE_UP_MS + 24 * 60 * 60 * 1000); // four days without a connection
    await flush();
    online = true;
    await reload(); // and the page was closed meanwhile
    for (let i = 0; i < MIN_NO_ANSWER_TRIES + 2; i += 1) {
      travel(NO_ANSWER_GAP_CAP_MS);
      await expect(flush({ force: true })).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    }
    const [row] = await rawRows();
    expect(row).toMatchObject({ status: "pending", noAnswerTries: MIN_NO_ANSWER_TRIES + 3 });
    // Only the capped gaps between the online tries count.
    expect(row.noAnswerRetryingMs).toBe((MIN_NO_ANSWER_TRIES + 2) * NO_ANSWER_GAP_CAP_MS);
  });

  it("P6: a row taken back from a closed page does not start the clock at its creation", async () => {
    const fourDaysAgo = Date.now() - (NO_ANSWER_GIVE_UP_MS + 24 * 60 * 60 * 1000);
    await putRaw(rawOut("left", { inFlight: true, inFlightSince: fourDaysAgo, createdAtMs: fourDaysAgo }));
    await outboxReady();
    expect(await rawRows()).toEqual([expect.objectContaining({ inFlight: false, noAnswerTries: 1 })]);
    postOut.mockRejectedValue(networkError());
    for (let i = 0; i < MIN_NO_ANSWER_TRIES; i += 1) {
      await expect(flush({ force: true })).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    }
    expect((await rawRows())[0].noAnswerRetryingMs).toBeLessThan(60 * 1000);
  });

  it("a refusal is certain: no uncertain flag, and a waiting event nobody tried is not 'may be recorded'", async () => {
    await queueOffline(outEvent());
    expect(mayBeRecorded(peek(() => usePendingItems())[0])).toBe(false);
    postOut.mockRejectedValueOnce(httpError(409, { code: "CONFLICT", message: "No" }));
    await flush();
    const [failed] = peek(() => useFailedItems());
    expect(failed.error.uncertain).toBeUndefined();
    expect(mayBeRecorded(failed)).toBe(false);
  });

  it("an outcome fires as soon as memory has it, before the device write, and the status agrees", async () => {
    const put = jest.spyOn(IDBObjectStore.prototype, "put");
    const seen = [];
    onOutboxOutcome((e) => {
      seen.push({
        outcome: e.outcome,
        status: getOutboxStatus(e.kind, e.clientEventId),
        written: put.mock.calls.some(([row]) => row.id === e.id && row.status !== "pending"),
      });
    });
    await queueOffline(outEvent("a"));
    await queueOffline(outEvent("b"));
    postOut.mockImplementation(async (p) => {
      if (p.clientEventId === "a") return { id: 1 };
      throw httpError(422, { message: "No" });
    });
    await flush();
    expect(seen).toEqual([
      { outcome: "sent", status: "sent", written: false },
      { outcome: "failed", status: "failed", written: false },
    ]);
    expect((await rawRows()).map((r) => r.status).sort()).toEqual(["failed", "sent"]);
  });

  it("a re-read of the device that finds nothing new changes nothing (no re-render)", async () => {
    await queueOffline(outEvent());
    online = false;
    const items = renderHook(() => usePendingItems());
    const first = items.result.current;
    expect(first).toHaveLength(1);
    await act(() => flush());
    await act(() => flush());
    expect(items.result.current).toBe(first);
  });

  it("sends a queued receipt with the grn_post sender", async () => {
    await queueOffline({
      kind: "grn_post",
      clientEventId: "grn-key",
      payload: { grnId: 12, clientEventId: "grn-key", input: { poId: 77, hotelId: 46, lines: [{ poLineId: 1, acceptedQty: 2 }] } },
      send: jest.fn(),
    });
    createGrn.mockResolvedValue({ id: 12, status: "posted" });
    await flush();
    expect(createGrn).toHaveBeenCalledWith({
      poId: 77, hotelId: 46, lines: [{ poLineId: 1, acceptedQty: 2 }], post: true, clientEventId: "grn-key",
    });
  });

  it("a registered sender replaces the default and can be removed", async () => {
    const custom = jest.fn().mockResolvedValue({ ok: 1 });
    const off = registerSender("out_post", custom);
    await queueOffline(outEvent());
    await flush();
    expect(custom).toHaveBeenCalledWith(expect.objectContaining({ clientEventId: "out-1" }));
    expect(postOut).not.toHaveBeenCalled();
    off();

    const extra = jest.fn().mockResolvedValue({});
    const offExtra = registerSender("waste_post", extra);
    await queueOffline({ kind: "waste_post", clientEventId: "w1", payload: { a: 1 }, send: jest.fn() });
    await flush();
    expect(extra).toHaveBeenCalledWith({ a: 1 });
    offExtra();
    await expect(submitOrQueue({ kind: "waste_post", clientEventId: "w2", payload: {}, send: jest.fn() })).rejects.toThrow();
  });

  it("Retry now sends a waiting event before its backoff is due", async () => {
    postOut.mockRejectedValueOnce(networkError());
    await submitOrQueue(outEvent());
    await flush();
    expect(postOut).toHaveBeenCalledTimes(1);
    postOut.mockResolvedValueOnce({ id: 1 });
    await expect(retryNow("out_post:out-1")).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
  });

  it("Discard throws a waiting event away: never sent, remembered as dismissed", async () => {
    const outcomes = [];
    onOutboxOutcome((e) => outcomes.push(e));
    await queueOffline(outEvent());
    await expect(discardPending("out_post:out-1")).resolves.toBe(true);
    expect(getOutboxStatus("out_post", "out-1")).toBe("dismissed");
    expect(outcomes).toEqual([expect.objectContaining({ clientEventId: "out-1", outcome: "discarded" })]);
    await flush({ force: true });
    expect(postOut).not.toHaveBeenCalled();
    await expect(discardPending("out_post:out-1")).resolves.toBe(false);
  });
});

describe("two tabs", () => {
  it("a stale tab cannot discard an event another tab sent meanwhile", async () => {
    installLocks();
    await queueOffline(outEvent());
    const tab2 = openOtherTab();
    const gate = heldSend();
    const tab2Flush = tab2.flush({ senders: { out_post: gate.send } });
    await waitFor(() => expect(gate.send).toHaveBeenCalled());

    // This tab still lists it as waiting; the user discards it while tab 2's send is out.
    expect(getOutboxStatus("out_post", "out-1")).toBe("pending");
    const discard = discardPending("out_post:out-1");
    gate.answer({ id: 9 });
    await expect(tab2Flush).resolves.toEqual(expect.objectContaining({ sent: 1 }));
    await expect(discard).resolves.toBe(false);

    expect(getOutboxStatus("out_post", "out-1")).toBe("sent");
    expect(await rawRows()).toEqual([expect.objectContaining({ id: "out_post:out-1", status: "sent" })]);
    await tab2._resetOutboxForTests();
  });

  it("a stale tab cannot dismiss a failed item another tab has since sent", async () => {
    installLocks();
    await queueOffline(outEvent());
    postOut.mockRejectedValueOnce(httpError(409, { code: "CONFLICT", message: "No" }));
    await flush();
    expect(getOutboxStatus("out_post", "out-1")).toBe("failed");

    // The user opens it again in another tab and sends it.
    const tab2 = openOtherTab();
    const gate = heldSend();
    const sent = tab2.submitOrQueue({ ...outEvent(), send: gate.send });
    await waitFor(() => expect(gate.send).toHaveBeenCalled());
    gate.answer({ id: 9 });
    await expect(sent).resolves.toEqual({ queued: false, result: { id: 9 } });

    // This tab still shows the old failure; Dismiss must not bury the sent event.
    await expect(dismissFailed("out_post:out-1")).resolves.toBe(false);
    expect(getOutboxStatus("out_post", "out-1")).toBe("sent");
    expect(await rawRows()).toEqual([expect.objectContaining({ status: "sent" })]);
    await tab2._resetOutboxForTests();
  });

  it("another tab's live first send is not listed as waiting here, nor discarded, nor sent twice", async () => {
    installLocks();
    await outboxReady();
    const tab2 = openOtherTab();
    const gate = heldSend();
    const sent = tab2.submitOrQueue({ ...outEvent(), send: gate.send });
    await waitFor(() => expect(gate.send).toHaveBeenCalled());

    postOut.mockResolvedValue({ id: 1 });
    const ours = flush({ force: true }); // reads the device, then waits for tab 2's lock
    await waitFor(() => expect(getOutboxStatus("out_post", "out-1")).toBe("pending"));
    expect(peek(() => usePendingItems())).toEqual([]);
    const discard = discardPending("out_post:out-1");

    gate.answer({ id: 9 });
    await expect(sent).resolves.toEqual({ queued: false, result: { id: 9 } });
    await ours;
    await expect(discard).resolves.toBe(false);
    expect(postOut).not.toHaveBeenCalled();
    expect(getOutboxStatus("out_post", "out-1")).toBe("sent");
    expect(await rawRows()).toEqual([expect.objectContaining({ status: "sent" })]);
    await tab2._resetOutboxForTests();
  });

  it("without Web Locks, another tab's live first send is not taken back, discarded or sent twice", async () => {
    // Older Safari / Firefox: no navigator.locks, so the in-tab lock says nothing about other tabs.
    expect(navigator.locks).toBeUndefined();
    await outboxReady();
    const tab2 = openOtherTab();
    const gate = heldSend();
    const sent = tab2.submitOrQueue({ ...outEvent(), send: gate.send });
    await waitFor(() => expect(gate.send).toHaveBeenCalled());

    postOut.mockResolvedValue({ id: 1 });
    await flush({ force: true });
    await expect(discardPending("out_post:out-1")).resolves.toBe(false);
    expect(postOut).not.toHaveBeenCalled();
    expect(await rawRows()).toEqual([expect.objectContaining({ status: "pending", inFlight: true })]);

    gate.answer({ id: 9 });
    await expect(sent).resolves.toEqual({ queued: false, result: { id: 9 } });
    await flush({ force: true });
    expect(postOut).not.toHaveBeenCalled();
    expect(getOutboxStatus("out_post", "out-1")).toBe("sent");
    await tab2._resetOutboxForTests();
  });

  it("without Web Locks, a row in flight longer than any live send is taken back", async () => {
    await putRaw(rawOut("old", { inFlight: true, inFlightSince: Date.now() - 91 * 1000 }));
    await putRaw(rawOut("new", { inFlight: true, inFlightSince: Date.now(), seq: 2 }));
    await outboxReady();
    expect(peek(() => usePendingItems()).map((i) => i.clientEventId)).toEqual(["old"]);

    postOut.mockResolvedValue({ id: 3, replayed: true });
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
    expect(postOut.mock.calls.map(([p]) => p.clientEventId)).toEqual(["old"]);

    travel(91 * 1000); // the "new" one's page is gone too, by now
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
    expect(postOut.mock.calls.map(([p]) => p.clientEventId)).toEqual(["old", "new"]);
  });

  it("a row a closed page left in flight is taken back on load when no tab holds its kind", async () => {
    installLocks();
    await putRaw(rawOut("left", { inFlight: true }));
    await outboxReady();
    expect(peek(() => usePendingItems())).toEqual([
      expect.objectContaining({ clientEventId: "left", inFlight: false, mayBeRecorded: true, noAnswerTries: 1 }),
    ]);
  });
});

describe("whose events", () => {
  it("only the user who queued an event sees it or sends it", async () => {
    await queueOffline(outEvent());

    await switchTabUser(500);
    expect(peek(() => usePendingCount())).toBe(0);
    await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 0 });
    expect(postOut).not.toHaveBeenCalled();

    await switchTabUser(407);
    postOut.mockResolvedValue({ id: 1 });
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
  });

  it("the waiting count follows a sign-in switch in this tab", async () => {
    await queueOffline(outEvent());
    const { result } = renderHook(() => usePendingCount());
    await waitFor(() => expect(result.current).toBe(1));
    await switchTabUser(500);
    expect(result.current).toBe(0);
    await switchTabUser(407);
    expect(result.current).toBe(1);
  });

  it("holds events while another tab has someone else signed in, without counting an attempt", async () => {
    await queueOffline(outEvent());
    // This tab's redux still says 407; redux-persist's copy and the token are user 500's.
    localStorage.setItem("persist:root", persistRoot(500));
    localStorage.setItem("token", "tok-500");
    await flush({ force: true });
    expect(postOut).not.toHaveBeenCalled();
    expect(peek(() => usePendingItems())).toEqual([expect.objectContaining({ clientEventId: "out-1", attempts: 0 })]);

    signIn(407);
    postOut.mockResolvedValue({ id: 1 });
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
  });

  it("a sign-in change in another tab stops a running flush and holds sends for a while", async () => {
    await queueOffline(outEvent("a"));
    await queueOffline(outEvent("b"));
    postOut.mockImplementationOnce(async () => {
      otherTabSets("token", "tok-407-again");
      return { id: 1 };
    });
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 1 });
    expect(postOut).toHaveBeenCalledTimes(1);

    // Right after the change nothing goes, even forced.
    await expect(flush({ force: true })).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    expect(postOut).toHaveBeenCalledTimes(1);
    expect(peek(() => usePendingItems())).toEqual([expect.objectContaining({ clientEventId: "b", attempts: 0 })]);

    // Once things settle and the same user is still signed in, it goes.
    travel(11000);
    postOut.mockResolvedValue({ id: 2 });
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
  });

  it("a profile write in another tab that keeps the same user does not hold sends", async () => {
    await queueOffline(outEvent());
    otherTabSets("persist:root", persistRoot(407));
    postOut.mockResolvedValue({ id: 1 });
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
  });
});

describe("on the device", () => {
  it("survives a page load, in its own database", async () => {
    online = false;
    await submitOrQueue(outEvent());
    await reload();

    const { result } = renderHook(() => usePendingCount());
    await waitFor(() => expect(result.current).toBe(1));
    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names).toEqual([OUTBOX_DB_NAME]);
    expect(names).not.toContain("workwise-inventory");

    online = true;
    postOut.mockResolvedValue({ id: 1 });
    await act(() => flush());
    expect(result.current).toBe(0);
    await reload();
    await act(() => outboxReady());
    expect(peek(() => usePendingCount())).toBe(0);
  });

  it("each flush reads the device first: what another tab queued is sent, what it sent is not resent", async () => {
    await queueOffline(outEvent("mine"));
    await outboxReady();
    // Another tab sent "mine" meanwhile, and queued "theirs".
    await putRaw(rawOut("mine", { status: "sent", payload: null, settledAt: new Date().toISOString(), settledAtMs: Date.now() }));
    await putRaw(rawOut("theirs", { seq: Date.now() + 5 }));

    postOut.mockResolvedValue({ id: 1 });
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
    expect(postOut.mock.calls.map(([p]) => p.clientEventId)).toEqual(["theirs"]);
    expect(getOutboxStatus("out_post", "mine")).toBe("sent");
  });

  it("forgets sent and discarded events after a few days", async () => {
    const old = Date.now() - 4 * 24 * 60 * 60 * 1000;
    await putRaw(rawOut("old", { status: "sent", payload: null, settledAtMs: old }));
    await putRaw(rawOut("recent", { status: "dismissed", payload: null, settledAtMs: Date.now() }));
    await outboxReady();
    expect(getOutboxStatus("out_post", "old")).toBe("unknown");
    expect(getOutboxStatus("out_post", "recent")).toBe("dismissed");
    await waitFor(async () => expect((await rawRows()).map((r) => r.clientEventId)).toEqual(["recent"]));
  });

  it("useOutboxReady turns true once the stored queue has loaded", async () => {
    await putRaw(rawOut("left"));
    const ready = renderHook(() => useOutboxReady());
    const count = renderHook(() => usePendingCount());
    expect(ready.result.current).toBe(false);
    await waitFor(() => expect(ready.result.current).toBe(true));
    expect(count.result.current).toBe(1);
  });
});

describe("keeping the queue moving", () => {
  it("syncs when the page comes back into view or gets focus", async () => {
    postOut.mockRejectedValueOnce(networkError());
    await submitOrQueue(outEvent("a"));
    renderHook(() => useOutboxAutoSync({ intervalMs: 600000 }));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(postOut).toHaveBeenCalledTimes(1); // backoff not due on mount

    travel(6000);
    postOut.mockResolvedValue({ id: 1 });
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    await waitFor(() => expect(getOutboxStatus("out_post", "a")).toBe("sent"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });

    postOut.mockRejectedValueOnce(networkError());
    await act(() => submitOrQueue(outEvent("b")));
    travel(6000);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(() => expect(getOutboxStatus("out_post", "b")).toBe("sent"));
  });
});

describe("outboxLinkFor", () => {
  it("points back at the screen that made the event", () => {
    expect(outboxLinkFor({ kind: "grn_post", payload: { input: { poId: 77, hotelId: 46 } } })).toBe(
      "/dashboard/buyer/inventory/receive/77?hotelId=46"
    );
    expect(outboxLinkFor({ kind: "count_lines", payload: { countId: 31, lines: [] } })).toBe("/dashboard/buyer/inventory/counts/31");
    expect(outboxLinkFor({ kind: "out_post", payload: { hotelId: 46, docType: "OUT" } })).toBe("/dashboard/buyer/inventory/out?hotelId=46");
    expect(outboxLinkFor({ kind: "out_post", payload: { hotelId: 46, docType: "RETURN" } })).toBe(
      "/dashboard/buyer/inventory/out?hotelId=46&mode=return"
    );
    expect(outboxLinkFor({ kind: "waste_post", payload: {} })).toBeNull();
    expect(outboxLinkFor({ kind: "count_lines", payload: null })).toBeNull();
  });
});
