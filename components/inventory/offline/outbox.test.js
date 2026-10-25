// The scan-screen outbox, against fake-indexeddb. services/inventory and the
// signed-in profile are mocked; everything else is the real module.

// jsdom has no structuredClone, which fake-indexeddb needs for every write;
// Node's v8 serializer is the same structured-clone algorithm.
const v8 = require("v8");
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => v8.deserialize(v8.serialize(value));
}
const { IDBFactory } = require("fake-indexeddb");

let mockProfile = { id: 407 };
jest.mock("@/redux/store", () => ({
  __esModule: true,
  store: { getState: () => ({ userProfile: mockProfile }) },
}));
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  createGrn: jest.fn(),
  postOut: jest.fn(),
  saveCountLines: jest.fn(),
}));

import { act, renderHook, waitFor } from "@testing-library/react";
import { createGrn, postOut, saveCountLines } from "@/services/inventory";
import {
  OUTBOX_DB_NAME,
  _resetOutboxForTests,
  dismissFailed,
  flush,
  onOutboxOutcome,
  registerSender,
  submitOrQueue,
  useFailedItems,
  useOutboxAutoSync,
  usePendingCount,
} from "./outbox";

let online = true;
Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => online });

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

/** Simulate a page load: memory gone, the device database kept. */
const reload = () => _resetOutboxForTests();

beforeEach(async () => {
  await _resetOutboxForTests();
  globalThis.indexedDB = new IDBFactory();
  online = true;
  mockProfile = { id: 407 };
  jest.resetAllMocks();
});

describe("submitOrQueue", () => {
  it("outbox enqueues when offline and flushes on online", async () => {
    const outcomes = [];
    onOutboxOutcome((e) => outcomes.push(e));
    const pending = renderHook(() => usePendingCount());

    online = false;
    const res = await submitOrQueue(outEvent());
    expect(res).toEqual({ queued: true });
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
    expect(pending.result.current).toBe(0);
    expect(outcomes).toEqual([
      expect.objectContaining({ clientEventId: "out-1", kind: "out_post", outcome: "sent", result: { id: 5, outNumber: "OUT/46/2026-27/00005" } }),
    ]);
  });

  it("sends directly when online and returns the server's answer", async () => {
    postOut.mockResolvedValue({ id: 9, replayed: true, no_op: true });
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: false, result: { id: 9, replayed: true, no_op: true } });
    const { result } = renderHook(() => usePendingCount());
    expect(result.current).toBe(0);
  });

  it("queues when the request gets no answer; later events of the kind queue behind it", async () => {
    postOut.mockRejectedValueOnce(networkError());
    await expect(submitOrQueue(outEvent("a"))).resolves.toEqual({ queued: true });
    // "a" waits out its backoff, so "b" queues behind it without a send.
    await expect(submitOrQueue(outEvent("b"))).resolves.toEqual({ queued: true });
    expect(postOut).toHaveBeenCalledTimes(1);
    const { result } = renderHook(() => usePendingCount("out_post"));
    expect(result.current).toBe(2);
  });

  it("queues a 503 on the first send", async () => {
    postOut.mockRejectedValueOnce(httpError(503, { message: "Service Unavailable" }));
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: true });
  });

  it("rethrows a refusal as the raw error, keeping code and details", async () => {
    const refusal = httpError(409, {
      code: "NEGATIVE_STOCK",
      message: "Not enough stock",
      details: { lines: [{ invItemId: 8, available: 1, requested: 2 }] },
    });
    postOut.mockRejectedValueOnce(refusal);
    await expect(submitOrQueue(outEvent())).rejects.toBe(refusal);

    const server = httpError(500, { message: "boom" });
    postOut.mockRejectedValueOnce(server);
    await expect(submitOrQueue(outEvent("x"))).rejects.toBe(server);

    const { result } = renderHook(() => usePendingCount());
    expect(result.current).toBe(0);
  });

  it("throws for a kind with no registered sender, before sending", async () => {
    const send = jest.fn();
    await expect(submitOrQueue({ kind: "token_grn", clientEventId: "t1", payload: {}, send })).rejects.toThrow(/no sender/);
    expect(send).not.toHaveBeenCalled();
  });

  it("never queues without a signed-in user (token pages): the error comes back raw", async () => {
    mockProfile = null;
    const err = networkError();
    postOut.mockRejectedValueOnce(err);
    await expect(submitOrQueue(outEvent())).rejects.toBe(err);
    online = false;
    postOut.mockRejectedValueOnce(err);
    await expect(submitOrQueue(outEvent())).rejects.toBe(err);
    mockProfile = { id: 407 };
    const { result } = renderHook(() => usePendingCount());
    expect(result.current).toBe(0);
  });

  it("queues a send that never settles (a 401 parks the promise) once the timeout passes", async () => {
    await _resetOutboxForTests({ sendTimeout: 30 });
    postOut.mockImplementationOnce(() => new Promise(() => {}));
    await expect(submitOrQueue(outEvent())).resolves.toEqual({ queued: true });
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
    await expect(submitOrQueue(countEvent(5))).resolves.toEqual({ queued: true });
    await expect(submitOrQueue(countEvent(6))).resolves.toEqual({ queued: true });
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
  const queueOffline = async (event) => {
    online = false;
    await submitOrQueue(event);
    online = true;
  };

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
    expect(outcomes).toEqual([
      expect.objectContaining({ clientEventId: "count-5", kind: "count_lines", outcome: "failed", error: expect.objectContaining({ code: "CONFLICT" }) }),
    ]);

    // A later flush does not send it again.
    await act(() => flush({ force: true }));
    expect(saveCountLines).toHaveBeenCalledTimes(1);

    await act(() => dismissFailed(item.id));
    expect(failed.result.current).toEqual([]);
  });

  it("a 5xx keeps the event queued with backoff", async () => {
    await queueOffline(outEvent());
    postOut.mockRejectedValueOnce(httpError(500, { message: "boom" }));
    await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 1 });
    await flush();
    expect(postOut).toHaveBeenCalledTimes(1); // backoff not due
    postOut.mockResolvedValueOnce({ id: 3, replayed: true, no_op: true });
    await expect(flush({ force: true })).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
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
    const again = renderHook(() => usePendingCount());
    await new Promise((r) => setTimeout(r, 20));
    expect(again.result.current).toBe(0);
  });

  it("only the user who queued an event sees it or sends it", async () => {
    online = false;
    await submitOrQueue(outEvent());
    online = true;

    mockProfile = { id: 500 };
    const other = renderHook(() => usePendingCount());
    expect(other.result.current).toBe(0);
    await expect(flush()).resolves.toEqual({ sent: 0, failed: 0, pending: 0 });
    expect(postOut).not.toHaveBeenCalled();

    mockProfile = { id: 407 };
    postOut.mockResolvedValue({ id: 1 });
    await expect(flush()).resolves.toEqual({ sent: 1, failed: 0, pending: 0 });
  });
});
