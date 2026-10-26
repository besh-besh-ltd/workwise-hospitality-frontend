// The counting screen over the REAL offline outbox (fake-indexeddb): a figure
// typed with no connection waits on the device, is saved once the device is
// back online, and a save the server refuses on replay (the count was
// submitted meanwhile) becomes a failed item that keeps the figures.
// services/inventory is mocked as in CountSession.test.js; the outbox is not.

const v8 = require("v8");
if (typeof globalThis.structuredClone !== "function") {
  globalThis.structuredClone = (value) => v8.deserialize(v8.serialize(value));
}
const { IDBFactory } = require("fake-indexeddb");

jest.mock("@/services/inventory", () => ({
  __esModule: true,
  saveCountLines: jest.fn(),
  submitCount: jest.fn(),
  cancelCount: jest.fn(),
  resolveScan: jest.fn(),
  listItems: jest.fn(() => Promise.resolve({ rows: [], total: 0 })),
  addItemBarcode: jest.fn(),
  createGrn: jest.fn(),
  postOut: jest.fn(),
}));
jest.mock("@/redux/store", () => ({
  __esModule: true,
  store: { getState: () => ({ userProfile: { id: 407 } }), subscribe: () => () => {} },
}));
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ events: { on: jest.fn(), off: jest.fn() }, push: jest.fn() }),
}));
jest.mock("@/components/inventory/scan/LazyCameraScanner", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/inventory/scan/scanFeedback", () => ({
  __esModule: true,
  default: {
    success: jest.fn(), error: jest.fn(), unlock: jest.fn(), installUnlock: jest.fn(() => () => {}),
    isMuted: jest.fn(() => false), setMuted: jest.fn(),
  },
}));
jest.mock("@/components/shared/mobile/MobileActionBar", () => ({
  __esModule: true,
  default: () => null,
  MobileActionButton: () => null,
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => (
    <a href={typeof href === "string" ? href : ""} {...rest}>
      {children}
    </a>
  ),
}));

import React, { useState } from "react";
import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { saveCountLines } from "@/services/inventory";
import {
  _resetOutboxForTests,
  flush,
  getOutboxStatus,
  onOutboxOutcome,
  outboxReady,
  useFailedItems,
} from "@/components/inventory/offline/outbox";
import CountSession, { SAVE_DEBOUNCE_MS } from "../CountSession";

let online = true;
Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => online });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const line = (o = {}) => ({
  id: 1, invItemId: 7, displayName: "Basmati rice", itemCode: "RICE-01", stockUom: "kg", binLabel: "A-01",
  countedQty: null, countedAt: null, countedByName: null, systemQtyAtCount: null, varianceQty: null,
  varianceValue: null, reason: null, ...o,
});
const count = (o = {}) => {
  const lines = o.lines || [line(), line({ id: 2, invItemId: 8, displayName: "Sugar", itemCode: "SUG-01", binLabel: "B-02" })];
  return {
    id: 41, countNumber: "CNT/46/2026-27/00003", companyId: 3, hotelId: 46, hotelName: "Orchid Mumbai",
    scope: "SELECTED", status: "open", isBlind: false, startedAt: "2026-10-25T04:00:00.000Z", submittedAt: null,
    approvedAt: null, approvedBy: null, approvedByName: null, createdBy: 9, createdByName: "Asha Menon",
    summary: { lineCount: lines.length, countedCount: lines.filter((l) => l.countedQty != null).length, varianceLines: null, varianceValue: null },
    can: { count: true, approve: false },
    ...o,
    lines,
  };
};
const answerWith = (base, counted, o = {}) =>
  count({
    ...base,
    ...o,
    lines: base.lines.map((l) => (counted[l.invItemId] != null ? { ...l, countedQty: counted[l.invItemId], countedAt: "2026-10-25T05:00:00.000Z", countedByName: "Asha Menon" } : l)),
  });

const Harness = ({ initial, onReload }) => {
  const [c, setC] = useState(initial);
  return (
    <CountSession
      count={c}
      onCountChange={setC}
      onReload={async () => {
        const next = await onReload?.();
        if (next) setC(next);
        return next || null;
      }}
    />
  );
};

const qtyBox = (name) => screen.getByLabelText(`Counted qty for ${name}`);
const rowOf = (name) => qtyBox(name).closest("li");
/**
 * Run the save debounce, then let the outbox's device round trips run (each
 * act() turn yields to fake-indexeddb's real setImmediate) until `check`
 * passes: a state to wait for, not a fixed number of turns.
 */
const MAX_TURNS = 50;
const settleUntil = async (check) => {
  await act(async () => {
    jest.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
  });
  for (let i = 0; i < MAX_TURNS; i += 1) {
    try {
      check();
      return;
    } catch {
      await act(() => outboxReady());
    }
  }
  check(); // fails with the matcher's message
};

/** Type a figure with no connection: the real outbox keeps it. */
const countOffline = async (base, onReload) => {
  render(<Harness initial={base} onReload={onReload} />);
  await act(() => outboxReady());
  online = false;
  fireEvent.change(qtyBox("Basmati rice"), { target: { value: "4" } });
  await settleUntil(() => expect(within(rowOf("Basmati rice")).getByText("Waiting for connection")).toBeInTheDocument());
  expect(saveCountLines).not.toHaveBeenCalled();
};

let outcomes = [];
beforeEach(async () => {
  jest.useFakeTimers();
  await _resetOutboxForTests();
  globalThis.indexedDB = new IDBFactory();
  online = true;
  localStorage.clear();
  localStorage.setItem("token", "tok-407");
  localStorage.setItem("persist:root", JSON.stringify({ userProfile: JSON.stringify({ id: 407 }), _persist: "{}" }));
  jest.clearAllMocks();
  saveCountLines.mockReset();
  outcomes = [];
  onOutboxOutcome((e) => outcomes.push(e));
});
afterEach(() => {
  jest.useRealTimers();
});

it("a figure typed offline waits on the device and is saved once the device is back online", async () => {
  const base = count();
  const onReload = jest.fn(() => answerWith(base, { 7: 4 }));
  await countOffline(base, onReload);

  saveCountLines.mockImplementation(() => Promise.resolve(answerWith(base, { 7: 4 })));
  online = true;
  await act(() => flush({ force: true }));
  // The outbox drained: the screen asks the server and shows the figure saved.
  await settleUntil(() => expect(within(rowOf("Basmati rice")).getByText("Saved")).toBeInTheDocument());

  expect(saveCountLines).toHaveBeenCalledWith(41, [{ invItemId: 7, countedQty: 4, clientEventId: expect.stringMatching(UUID) }]);
  expect(outcomes).toEqual([expect.objectContaining({ kind: "count_lines", outcome: "sent" })]);
  expect(getOutboxStatus("count_lines", outcomes[0].clientEventId)).toBe("sent");
  expect(onReload).toHaveBeenCalled();
});

it("a save refused on replay (the count was submitted meanwhile) becomes a failed item that keeps the figures", async () => {
  const base = count();
  const onReload = jest.fn(() => answerWith(base, {}, { status: "submitted" }));
  await countOffline(base, onReload);

  saveCountLines.mockRejectedValue(
    Object.assign(new Error("This count was already submitted"), {
      isAxiosError: true,
      response: { status: 409, data: { status: 0, code: "CONFLICT", message: "This count was already submitted", details: { status: "submitted" } } },
    })
  );
  online = true;
  await act(() => flush({ force: true }));
  // The screen learns the count closed and says so.
  await settleUntil(() => expect(toast.error).toHaveBeenCalledWith("This count was already submitted"));

  expect(saveCountLines).toHaveBeenCalledTimes(1);
  expect(outcomes).toEqual([expect.objectContaining({ kind: "count_lines", outcome: "failed" })]);
  expect(getOutboxStatus("count_lines", outcomes[0].clientEventId)).toBe("failed");
  const { result } = renderHook(() => useFailedItems("count_lines"));
  expect(result.current).toEqual([
    expect.objectContaining({
      summary: "Count #41 · 1 line",
      payload: { countId: 41, lines: [{ invItemId: 7, countedQty: 4, clientEventId: expect.stringMatching(UUID) }] },
      error: expect.objectContaining({ httpStatus: 409, code: "CONFLICT", details: { status: "submitted" } }),
    }),
  ]);
  expect(onReload).toHaveBeenCalled();
});
