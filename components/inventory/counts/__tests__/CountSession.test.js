// The counting screen: scan or pick an item, type what is on the shelf, and
// the quantity is saved (debounced) with a clientEventId per line save.
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  saveCountLines: jest.fn(),
  submitCount: jest.fn(),
  cancelCount: jest.fn(),
  resolveScan: jest.fn(),
  listItems: jest.fn(() => Promise.resolve({ rows: [], total: 0 })),
  addItemBarcode: jest.fn(),
}));
// The A4 outbox stub sends online; D3 swaps in the real queue behind the same
// interface. Spy on it so the test sees what the screen hands it.
jest.mock("@/components/inventory/offline/outbox", () => ({
  __esModule: true,
  submitOrQueue: jest.fn(async ({ send, payload }) => ({ queued: false, result: await send(payload) })),
  usePendingCount: () => 0,
}));
jest.mock("@/components/inventory/scan/LazyCameraScanner", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/inventory/scan/scanFeedback", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    unlock: jest.fn(),
    installUnlock: jest.fn(() => () => {}),
    isMuted: jest.fn(() => false),
    setMuted: jest.fn(),
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
import { render, screen, fireEvent, act, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { saveCountLines, submitCount, resolveScan } from "@/services/inventory";
import { submitOrQueue } from "@/components/inventory/offline/outbox";
import CountSession, { SAVE_DEBOUNCE_MS } from "../CountSession";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const line = (o = {}) => ({
  id: 1,
  invItemId: 7,
  displayName: "Basmati rice",
  itemCode: "RICE-01",
  stockUom: "kg",
  binLabel: "A-01",
  countedQty: null,
  countedAt: null,
  countedByName: null,
  systemQtyAtCount: null,
  varianceQty: null,
  varianceValue: null,
  reason: null,
  ...o,
});

const count = (o = {}) => {
  const lines = o.lines || [line(), line({ id: 2, invItemId: 8, displayName: "Sugar", itemCode: "SUG-01", binLabel: "B-02" })];
  return {
    id: 41,
    countNumber: "CNT/46/2026-27/00003",
    companyId: 3,
    hotelId: 46,
    hotelName: "Orchid Mumbai",
    scope: "FULL",
    status: "open",
    isBlind: false,
    startedAt: "2026-10-25T04:00:00.000Z",
    submittedAt: null,
    approvedAt: null,
    approvedBy: null,
    approvedByName: null,
    createdBy: 9,
    createdByName: "Asha Menon",
    summary: {
      lineCount: lines.length,
      countedCount: lines.filter((l) => l.countedQty != null).length,
      varianceLines: null,
      varianceValue: null,
    },
    can: { count: true, approve: false },
    ...o,
    lines,
  };
};

// CountDetail keeps the count in state and hands every server answer back in.
const Harness = ({ initial, onChange, onReload = () => {} }) => {
  const [c, setC] = useState(initial);
  return (
    <CountSession
      count={c}
      onCountChange={(next) => {
        onChange?.(next);
        setC(next);
      }}
      onReload={onReload}
    />
  );
};

const refusal = (status, data) => Object.assign(new Error(data.message), { isAxiosError: true, response: { status, data } });

const qtyBox = (name) => screen.getByLabelText(`Counted qty for ${name}`);
const rowOf = (name) => qtyBox(name).closest("li");

/** Let the debounce fire and the save settle. */
const flushSave = async () => {
  await act(async () => {
    jest.advanceTimersByTime(SAVE_DEBOUNCE_MS + 10);
  });
  await act(async () => {});
};

/** A server answer for a save: the given lines now carry what was counted. */
const answerWith = (base, counted) =>
  count({
    ...base,
    lines: base.lines.map((l) => (counted[l.invItemId] != null ? { ...l, countedQty: counted[l.invItemId], countedAt: "2026-10-25T05:00:00.000Z", countedByName: "Asha Menon" } : l)),
  });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

describe("CountSession", () => {
  it("lists lines by bin label, items without a bin last", () => {
    const c = count({
      lines: [
        line({ id: 3, invItemId: 9, displayName: "Atta", binLabel: null }),
        line({ id: 2, invItemId: 8, displayName: "Sugar", binLabel: "B-02" }),
        line({ id: 1, invItemId: 7, displayName: "Basmati rice", binLabel: "A-01" }),
      ],
    });
    render(<Harness initial={c} />);
    const names = screen.getAllByLabelText(/^Counted qty for /).map((el) => el.getAttribute("aria-label"));
    expect(names).toEqual(["Counted qty for Basmati rice", "Counted qty for Sugar", "Counted qty for Atta"]);
  });

  it("blind count never renders system qty", async () => {
    // A counted line whose payload carries the system figures (an approver's
    // view): the control shows them on an ordinary count…
    const lines = [line({ countedQty: 5, systemQtyAtCount: 37, varianceQty: -32, varianceValue: -1600 })];
    const { unmount } = render(<Harness initial={count({ lines, can: { count: true, approve: true } })} />);
    expect(within(rowOf("Basmati rice")).getByText("37")).toBeInTheDocument();
    unmount();

    // …and a blind count never shows them while counting, whoever counts.
    render(<Harness initial={count({ lines, isBlind: true, can: { count: true, approve: true } })} />);
    const row = rowOf("Basmati rice");
    expect(within(row).queryByText("37")).toBeNull();
    expect(within(row).queryByText(/32/)).toBeNull();
    expect(within(row).queryByText(/1,600/)).toBeNull();
    expect(within(row).queryByText(/system/i)).toBeNull();
    expect(qtyBox("Basmati rice")).toHaveValue("5");
  });

  it("blind count for a counter: null figures render nothing (never 0), also after a save", async () => {
    const base = count({ isBlind: true, can: { count: true, approve: false } });
    saveCountLines.mockImplementation(() => Promise.resolve(answerWith(base, { 7: 0 })));
    render(<Harness initial={base} />);

    fireEvent.change(qtyBox("Basmati rice"), { target: { value: "0" } });
    await flushSave();

    const row = rowOf("Basmati rice");
    expect(within(row).getByText("Saved")).toBeInTheDocument();
    expect(within(row).queryByText(/system/i)).toBeNull();
    expect(within(row).queryByText("0")).toBeNull();
    expect(within(row).queryByText(/diff/i)).toBeNull();
  });

  it("saving a line calls saveCountLines with clientEventId", async () => {
    const base = count();
    saveCountLines.mockImplementation(() => Promise.resolve(answerWith(base, { 7: 12 })));
    const onChange = jest.fn();
    render(<Harness initial={base} onChange={onChange} />);

    // Typing is debounced: one save for the final figure.
    fireEvent.change(qtyBox("Basmati rice"), { target: { value: "1" } });
    fireEvent.change(qtyBox("Basmati rice"), { target: { value: "12" } });
    expect(saveCountLines).not.toHaveBeenCalled();
    await flushSave();

    expect(saveCountLines).toHaveBeenCalledTimes(1);
    expect(saveCountLines).toHaveBeenCalledWith(41, [
      { invItemId: 7, countedQty: 12, clientEventId: expect.stringMatching(UUID) },
    ]);
    // It goes through the outbox as a count_lines event carrying everything a
    // later sync needs.
    const sent = saveCountLines.mock.calls[0][1];
    expect(submitOrQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "count_lines",
        clientEventId: expect.stringMatching(UUID),
        payload: { countId: 41, lines: sent },
      })
    );
    expect(within(rowOf("Basmati rice")).getByText("Saved")).toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: 41 }));
    expect(screen.getByText(/1 of 2 counted/)).toBeInTheDocument();
  });

  it("a retry after a dropped connection reuses the clientEventId; a replay is success; a new figure gets a new one", async () => {
    const base = count();
    const dropped = Object.assign(new Error("Network Error"), { isAxiosError: true });
    saveCountLines
      .mockRejectedValueOnce(dropped)
      .mockImplementationOnce(() => Promise.resolve({ ...answerWith(base, { 7: 4 }), replayed: true, no_op: true }))
      .mockImplementationOnce(() => Promise.resolve(answerWith(base, { 7: 5 })));
    render(<Harness initial={base} />);

    fireEvent.change(qtyBox("Basmati rice"), { target: { value: "4" } });
    await flushSave();
    const row = rowOf("Basmati rice");
    expect(within(row).getByText(/not saved/i)).toBeInTheDocument();
    expect(within(row).queryByText("Saved")).toBeNull();

    fireEvent.click(within(row).getByRole("button", { name: /retry/i }));
    await flushSave();
    const first = saveCountLines.mock.calls[0][1][0].clientEventId;
    const retry = saveCountLines.mock.calls[1][1][0].clientEventId;
    expect(retry).toBe(first);
    expect(within(rowOf("Basmati rice")).getByText("Saved")).toBeInTheDocument();

    fireEvent.change(qtyBox("Basmati rice"), { target: { value: "5" } });
    await flushSave();
    expect(saveCountLines).toHaveBeenCalledTimes(3);
    const next = saveCountLines.mock.calls[2][1][0];
    expect(next).toEqual({ invItemId: 7, countedQty: 5, clientEventId: expect.stringMatching(UUID) });
    expect(next.clientEventId).not.toBe(first);
  });

  it("a figure the outbox keeps offline waits for the connection, blocks submit, and clears once synced", async () => {
    const base = count({ scope: "SELECTED" });
    submitOrQueue.mockImplementationOnce(async () => ({ queued: true }));
    // Later: the queued figure (Basmati 4) has synced; Sugar's save answers with both.
    saveCountLines.mockImplementation(() => Promise.resolve(answerWith(base, { 7: 4, 8: 2 })));
    render(<Harness initial={base} />);

    fireEvent.change(qtyBox("Basmati rice"), { target: { value: "4" } });
    await flushSave();
    expect(within(rowOf("Basmati rice")).getByText("Waiting for connection")).toBeInTheDocument();
    expect(screen.getByText(/1 figure kept on this device/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));
    await act(async () => {});
    expect(submitCount).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Submit count" })).toBeNull();

    fireEvent.change(qtyBox("Sugar"), { target: { value: "2" } });
    await flushSave();
    expect(within(rowOf("Basmati rice")).getByText("Saved")).toBeInTheDocument();
    expect(within(rowOf("Sugar")).getByText("Saved")).toBeInTheDocument();
  });

  it("a save that arrives after the count was submitted is final: dropped, said once, count reloaded", async () => {
    const base = count({ lines: [line({ countedQty: 3 }), line({ id: 2, invItemId: 8, displayName: "Sugar", binLabel: "B-02" })] });
    saveCountLines.mockRejectedValue(
      refusal(409, { status: 0, code: "CONFLICT", message: "This count is submitted", details: { status: "submitted" } })
    );
    const onReload = jest.fn();
    render(<Harness initial={base} onReload={onReload} />);

    fireEvent.change(qtyBox("Basmati rice"), { target: { value: "5" } });
    await flushSave();

    expect(toast.error).toHaveBeenCalledWith("This count was already submitted");
    expect(onReload).toHaveBeenCalled();
    // The figure is dropped, not left to retry: the box shows what the server has.
    const row = rowOf("Basmati rice");
    expect(qtyBox("Basmati rice")).toHaveValue("3");
    expect(within(row).queryByRole("button", { name: /retry/i })).toBeNull();
    await flushSave();
    // Nothing more goes to a closed count, even a figure typed before the reload lands.
    fireEvent.change(qtyBox("Sugar"), { target: { value: "2" } });
    await flushSave();
    expect(saveCountLines).toHaveBeenCalledTimes(1);
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("a scanned item that is not on the count joins it", async () => {
    const base = count();
    resolveScan.mockResolvedValue({
      kind: "item",
      code: "8901234567890",
      gs1: null,
      item: { invItemId: 99, displayName: "Olive oil", stockUom: "l", packFactor: 1, poLineId: null, stockedAtHotel: true },
    });
    saveCountLines.mockImplementation((id, lines) =>
      Promise.resolve(
        count({
          lines: [
            ...base.lines,
            line({ id: 9, invItemId: 99, displayName: "Olive oil", stockUom: "l", binLabel: null, countedQty: lines[0].countedQty }),
          ],
        })
      )
    );
    render(<Harness initial={base} />);

    fireEvent.change(screen.getByLabelText("Scan or type a code"), { target: { value: "8901234567890" } });
    fireEvent.click(screen.getByRole("button", { name: "Look up" }));
    await act(async () => {});
    expect(resolveScan).toHaveBeenCalledWith("8901234567890", "hotel:46");

    const box = await screen.findByLabelText("Counted qty for Olive oil");
    expect(box).toHaveFocus();
    fireEvent.change(box, { target: { value: "3" } });
    await flushSave();
    expect(saveCountLines).toHaveBeenCalledWith(41, [
      { invItemId: 99, countedQty: 3, clientEventId: expect.stringMatching(UUID) },
    ]);
    expect(within(rowOf("Olive oil")).getByText("Saved")).toBeInTheDocument();
  });

  it("a scanner trigger pulled while a quantity box has focus is a scan, not a quantity", async () => {
    const base = count({ lines: [line({ countedQty: 6 }), line({ id: 2, invItemId: 8, displayName: "Sugar", binLabel: "B-02" })] });
    resolveScan.mockResolvedValue({
      kind: "item",
      code: "SUG-01",
      gs1: null,
      item: { invItemId: 8, displayName: "Sugar", stockUom: "kg", packFactor: 1, poLineId: null, stockedAtHotel: true },
    });
    render(<Harness initial={base} />);

    const box = qtyBox("Basmati rice");
    box.focus();
    // A wedge scanner "types" the code in a few ms and ends it with Enter.
    let value = box.value;
    for (const ch of "SUG-01") {
      fireEvent.keyDown(box, { key: ch });
      value += ch;
      fireEvent.change(box, { target: { value } });
    }
    fireEvent.keyDown(box, { key: "Enter" });
    await act(async () => {});

    expect(resolveScan).toHaveBeenCalledWith("SUG-01", "hotel:46");
    expect(qtyBox("Basmati rice")).toHaveValue("6");
    expect(qtyBox("Sugar")).toHaveFocus();
    await flushSave();
    expect(saveCountLines).not.toHaveBeenCalled();
  });

  it("a save does not pull focus back to the line scanned earlier", async () => {
    const base = count();
    resolveScan.mockResolvedValue({
      kind: "item",
      code: "SUG-01",
      gs1: null,
      item: { invItemId: 8, displayName: "Sugar", stockUom: "kg", packFactor: 1, poLineId: null, stockedAtHotel: true },
    });
    saveCountLines.mockImplementation(() => Promise.resolve(answerWith(base, { 7: 4 })));
    render(<Harness initial={base} />);

    fireEvent.change(screen.getByLabelText("Scan or type a code"), { target: { value: "SUG-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Look up" }));
    await act(async () => {});
    expect(qtyBox("Sugar")).toHaveFocus();

    // The counter moves on to another line by hand.
    qtyBox("Basmati rice").focus();
    fireEvent.change(qtyBox("Basmati rice"), { target: { value: "4" } });
    await flushSave();
    expect(saveCountLines).toHaveBeenCalledTimes(1);
    expect(qtyBox("Basmati rice")).toHaveFocus();
  });

  it("submitting saves what is still pending first, then submits", async () => {
    // Sugar is already counted; Basmati's figure is typed but not saved yet.
    const base = count({ lines: [line(), line({ id: 2, invItemId: 8, displayName: "Sugar", binLabel: "B-02", countedQty: 2 })] });
    saveCountLines.mockImplementation(() => Promise.resolve(answerWith(base, { 7: 9 })));
    submitCount.mockImplementation(() =>
      Promise.resolve({ ...answerWith(base, { 7: 9 }), status: "submitted", submittedAt: "2026-10-25T06:00:00.000Z" })
    );
    const onChange = jest.fn();
    render(<Harness initial={base} onChange={onChange} />);

    fireEvent.change(qtyBox("Basmati rice"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));
    await act(async () => {});
    fireEvent.click(await screen.findByRole("button", { name: "Submit count" }));
    await act(async () => {});
    await act(async () => {});

    expect(saveCountLines).toHaveBeenCalledTimes(1);
    expect(submitCount).toHaveBeenCalledWith(41);
    expect(saveCountLines.mock.invocationCallOrder[0]).toBeLessThan(submitCount.mock.invocationCallOrder[0]);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ status: "submitted" }));
  });

  it("a full count with items still to count is not submitted; the screen shows them", async () => {
    const base = count({ lines: [line({ countedQty: 3 }), line({ id: 2, invItemId: 8, displayName: "Sugar", binLabel: "B-02" })] });
    render(<Harness initial={base} />);

    fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));
    await act(async () => {});

    expect(submitCount).not.toHaveBeenCalled();
    expect(screen.getByText("1 item not counted yet")).toBeInTheDocument();
    // Only what is left to count is listed, so the counter can walk to it.
    expect(screen.queryByLabelText("Counted qty for Basmati rice")).toBeNull();
    expect(qtyBox("Sugar")).toBeInTheDocument();
  });

  it("a selected count may be submitted with items left uncounted", async () => {
    const base = count({ scope: "SELECTED", lines: [line({ countedQty: 3 }), line({ id: 2, invItemId: 8, displayName: "Sugar", binLabel: "B-02" })] });
    submitCount.mockResolvedValue({ ...base, status: "submitted" });
    render(<Harness initial={base} />);

    fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));
    await act(async () => {});
    fireEvent.click(await screen.findByRole("button", { name: "Submit count" }));
    await act(async () => {});
    expect(submitCount).toHaveBeenCalledWith(41);
  });

  it("when the server says items are still uncounted, the screen says how many and reloads the count", async () => {
    const base = count({ lines: [line({ countedQty: 3 })] });
    submitCount.mockRejectedValue(
      refusal(400, {
        status: 0,
        code: "VALIDATION",
        message: "Count every item before submitting a full count",
        details: { field: "lines", uncounted: [{ lineId: 5, invItemId: 50, displayName: "Ghee" }, { lineId: 6, invItemId: 51, displayName: "Jaggery" }], uncountedTotal: 2 },
      })
    );
    const onReload = jest.fn();
    render(<Harness initial={base} onReload={onReload} />);

    fireEvent.click(screen.getByRole("button", { name: "Submit for approval" }));
    await act(async () => {});
    fireEvent.click(await screen.findByRole("button", { name: "Submit count" }));
    await act(async () => {});
    await act(async () => {});

    expect(screen.getByText("2 items not counted yet")).toBeInTheDocument();
    expect(onReload).toHaveBeenCalled();
  });

  it("someone who cannot count sees the figures but no inputs or scan box", () => {
    render(<Harness initial={count({ can: { count: false, approve: false }, lines: [line({ countedQty: 3 })] })} />);
    expect(screen.queryByLabelText(/^Counted qty for /)).toBeNull();
    expect(screen.queryByLabelText("Scan or type a code")).toBeNull();
    expect(screen.queryByRole("button", { name: "Submit for approval" })).toBeNull();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
