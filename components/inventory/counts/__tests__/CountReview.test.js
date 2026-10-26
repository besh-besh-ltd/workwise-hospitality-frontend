// The variance review: an approver reads each difference (qty and value,
// largest first), gives every non-zero line a reason, then approves.
jest.mock("@/services/inventory", () => ({
  __esModule: true,
  approveCount: jest.fn(),
  cancelCount: jest.fn(),
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

import React, { useState } from "react";
import { render, screen, fireEvent, act, within, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { approveCount, cancelCount } from "@/services/inventory";
import CountReview from "../CountReview";

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

// Server order is bin, then name: Salt (A-01), Sugar (A-02), Basmati (B-01), Olive oil (no bin).
const LINES = [
  line({ id: 13, invItemId: 9, displayName: "Salt", binLabel: "A-01", countedQty: 4, systemQtyAtCount: 4, varianceQty: 0, varianceValue: 0 }),
  line({ id: 12, invItemId: 8, displayName: "Sugar", binLabel: "A-02", countedQty: 6, systemQtyAtCount: 5, varianceQty: 1, varianceValue: 45 }),
  line({ id: 11, invItemId: 7, displayName: "Basmati rice", binLabel: "B-01", countedQty: 8, systemQtyAtCount: 10, varianceQty: -2, varianceValue: -180 }),
  line({ id: 14, invItemId: 10, displayName: "Olive oil", stockUom: "l", binLabel: null }),
];

const count = (o = {}) => ({
  id: 41,
  countNumber: "CNT/46/2026-27/00003",
  companyId: 3,
  hotelId: 46,
  hotelName: "Orchid Mumbai",
  scope: "SELECTED",
  status: "submitted",
  isBlind: false,
  startedAt: "2026-10-25T04:00:00.000Z",
  submittedAt: "2026-10-25T06:00:00.000Z",
  approvedAt: null,
  approvedBy: null,
  approvedByName: null,
  createdBy: 9,
  createdByName: "Asha Menon",
  lines: LINES,
  summary: { lineCount: 4, countedCount: 3, varianceLines: 2, varianceValue: -135 },
  can: { count: true, approve: true },
  ...o,
});

const Harness = ({ initial, onReload = () => {} }) => {
  const [c, setC] = useState(initial);
  return <CountReview count={c} onCountChange={setC} onReload={onReload} />;
};

const refusal = (status, data) => Object.assign(new Error(data.message), { isAxiosError: true, response: { status, data } });
const approveBtn = () => screen.getByRole("button", { name: "Approve and post" });
const reasonFor = (name) => screen.getByLabelText(`Reason for ${name}`);
const rowOf = (name) => screen.getByText(name).closest("tr");

/** Page button → confirmation → confirm. */
const approveAndConfirm = async () => {
  fireEvent.click(approveBtn());
  fireEvent.click(await screen.findByRole("button", { name: "Post differences" }));
  await act(async () => {});
  await act(async () => {});
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("CountReview", () => {
  it("lists counted lines by the size of the difference in value, largest first", () => {
    render(<Harness initial={count()} />);
    const counted = within(screen.getByRole("table", { name: "Counted items" }));
    const names = counted
      .getAllByRole("row")
      .slice(1)
      .map((r) => r.querySelector("[data-item-name]")?.textContent);
    expect(names).toEqual(["Basmati rice", "Sugar", "Salt"]);
    // Qty and value per line, signed.
    expect(within(rowOf("Basmati rice")).getByText("−2")).toBeInTheDocument();
    expect(within(rowOf("Basmati rice")).getByText("−₹180.00")).toBeInTheDocument();
    expect(within(rowOf("Sugar")).getByText("+1")).toBeInTheDocument();
    expect(within(rowOf("Sugar")).getByText("+₹45.00")).toBeInTheDocument();
    // What nobody counted is set apart: it is left out of the posting.
    expect(screen.getByText(/1 item not counted/i)).toBeInTheDocument();
  });

  it("a count with no differences says approving changes nothing in stock, and approves", async () => {
    const same = [line({ id: 13, invItemId: 9, displayName: "Salt", countedQty: 4, systemQtyAtCount: 4, varianceQty: 0, varianceValue: 0 })];
    approveCount.mockResolvedValue(count({ lines: same, status: "approved", summary: { lineCount: 1, countedCount: 1, varianceLines: 0, varianceValue: 0 } }));
    render(<Harness initial={count({ lines: same, summary: { lineCount: 1, countedCount: 1, varianceLines: 0, varianceValue: 0 } })} />);
    fireEvent.click(approveBtn());
    expect(await screen.findByText("Every counted qty matches stock, so nothing changes in stock. Approving closes the count.")).toBeInTheDocument();
    expect(screen.queryByText(/0 lines with a difference/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Post differences" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Approve count" }));
    await waitFor(() => expect(approveCount).toHaveBeenCalled());
  });

  it("approve disabled until every variance has a reason", async () => {
    approveCount.mockResolvedValue({ ...count(), status: "approved", approvedAt: "2026-10-25T07:00:00.000Z", approvedByName: "Ravi Iyer" });
    render(<Harness initial={count()} />);

    expect(approveBtn()).toBeDisabled();
    expect(screen.queryByLabelText("Reason for Salt")).toBeNull(); // no difference, no reason

    fireEvent.change(reasonFor("Basmati rice"), { target: { value: "Spilled in store" } });
    expect(approveBtn()).toBeDisabled();
    fireEvent.change(reasonFor("Sugar"), { target: { value: "   " } });
    expect(approveBtn()).toBeDisabled();
    fireEvent.change(reasonFor("Sugar"), { target: { value: "Found in back store" } });
    expect(approveBtn()).toBeEnabled();

    await approveAndConfirm();
    expect(approveCount).toHaveBeenCalledWith(41, { 11: "Spilled in store", 12: "Found in back store" });
    expect(screen.queryByRole("button", { name: "Approve and post" })).toBeNull();
  });

  it("lines the server says still need a reason are highlighted", async () => {
    approveCount.mockRejectedValue(
      refusal(400, {
        status: 0,
        code: "VALIDATION",
        message: "Give a reason for every line with a difference",
        details: {
          field: "reasons",
          lines: [{ lineId: 12, invItemId: 8, displayName: "Sugar" }],
          reasons: [{ lineId: 12, invItemId: 8, displayName: "Sugar" }],
          unitCosts: [],
        },
      })
    );
    render(<Harness initial={count()} />);
    fireEvent.change(reasonFor("Basmati rice"), { target: { value: "Spilled" } });
    fireEvent.change(reasonFor("Sugar"), { target: { value: "Found" } });
    await approveAndConfirm();

    expect(reasonFor("Sugar")).toHaveAttribute("aria-invalid", "true");
    expect(within(rowOf("Sugar")).getByText("Reason needed")).toBeInTheDocument();
    expect(reasonFor("Basmati rice")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("one refusal naming missing reasons and missing costs highlights both kinds of line", async () => {
    approveCount.mockRejectedValue(
      refusal(400, {
        status: 0,
        code: "VALIDATION",
        message: "Give a reason for every line with a difference",
        details: {
          field: "reasons",
          lines: [{ lineId: 11, invItemId: 7, displayName: "Basmati rice" }],
          reasons: [{ lineId: 11, invItemId: 7, displayName: "Basmati rice" }],
          unitCosts: [{ lineId: 12, invItemId: 8, displayName: "Sugar" }],
        },
      })
    );
    render(<Harness initial={count()} />);
    fireEvent.change(reasonFor("Basmati rice"), { target: { value: "Spilled" } });
    fireEvent.change(reasonFor("Sugar"), { target: { value: "Found" } });
    await approveAndConfirm();

    expect(reasonFor("Basmati rice")).toHaveAttribute("aria-invalid", "true");
    expect(within(rowOf("Sugar")).getByLabelText("Unit cost (₹ per kg)")).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Unit cost/)).toHaveLength(1);
    expect(approveBtn()).toBeDisabled();
  });

  it("a line the server hints needs a unit cost asks for it up front (above 0, at most 1e9)", async () => {
    approveCount.mockResolvedValue({ ...count(), status: "approved" });
    const hinted = LINES.map((l) => ({ ...l, needsUnitCost: l.id === 12 }));
    render(<Harness initial={count({ lines: hinted })} />);

    const cost = within(rowOf("Sugar")).getByLabelText("Unit cost (₹ per kg)");
    expect(screen.getAllByLabelText(/Unit cost/)).toHaveLength(1);
    fireEvent.change(reasonFor("Basmati rice"), { target: { value: "Spilled" } });
    fireEvent.change(reasonFor("Sugar"), { target: { value: "Found" } });
    expect(approveBtn()).toBeDisabled();
    fireEvent.change(cost, { target: { value: "2000000000" } });
    expect(approveBtn()).toBeDisabled();
    fireEvent.change(cost, { target: { value: "38" } });
    expect(approveBtn()).toBeEnabled();

    await approveAndConfirm();
    expect(approveCount).toHaveBeenCalledWith(41, { 11: "Spilled", 12: "Found" }, { 12: 38 });
  });

  it("a viewer who cannot decide is never asked for a unit cost", () => {
    const hinted = LINES.map((l) => ({ ...l, needsUnitCost: l.id === 12 }));
    render(<Harness initial={count({ lines: hinted, can: { count: true, approve: false } })} />);
    expect(screen.queryByLabelText(/Unit cost/)).toBeNull();
  });

  it("approve asks for unit cost on lines the server flags", async () => {
    approveCount
      .mockRejectedValueOnce(
        refusal(400, {
          status: 0,
          code: "VALIDATION",
          message: "Sugar has no cost anywhere yet: enter a unit cost",
          details: {
            field: "unitCosts",
            lines: [{ lineId: 12, invItemId: 8, displayName: "Sugar" }],
            reasons: [],
            unitCosts: [{ lineId: 12, invItemId: 8, displayName: "Sugar" }],
          },
        })
      )
      .mockResolvedValueOnce({ ...count(), status: "approved" });
    render(<Harness initial={count()} />);
    expect(screen.queryByLabelText(/Unit cost/)).toBeNull();

    fireEvent.change(reasonFor("Basmati rice"), { target: { value: "Spilled" } });
    fireEvent.change(reasonFor("Sugar"), { target: { value: "Found" } });
    await approveAndConfirm();

    // Exactly the flagged line asks for a cost, and approving waits for it.
    expect(screen.getAllByLabelText(/Unit cost/)).toHaveLength(1);
    const cost = within(rowOf("Sugar")).getByLabelText("Unit cost (₹ per kg)");
    expect(approveBtn()).toBeDisabled();
    fireEvent.change(cost, { target: { value: "0" } });
    expect(approveBtn()).toBeDisabled();
    fireEvent.change(cost, { target: { value: "52.5" } });
    expect(approveBtn()).toBeEnabled();

    await approveAndConfirm();
    expect(approveCount).toHaveBeenLastCalledWith(41, { 11: "Spilled", 12: "Found" }, { 12: 52.5 });
  });

  it("a blind count shows someone without approve no system or variance figures, never 0", () => {
    const blindLines = LINES.map((l) => ({ ...l, systemQtyAtCount: null, varianceQty: null, varianceValue: null }));
    render(
      <Harness
        initial={count({
          isBlind: true,
          lines: blindLines,
          summary: { lineCount: 4, countedCount: 3, varianceLines: null, varianceValue: null },
          can: { count: true, approve: false },
        })}
      />
    );
    expect(screen.queryByRole("columnheader", { name: /system/i })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: /variance/i })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: /value/i })).toBeNull();
    expect(within(rowOf("Salt")).getByText("4")).toBeInTheDocument();
    expect(within(rowOf("Salt")).queryByText("0")).toBeNull();
    expect(screen.queryByText(/₹/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve and post" })).toBeNull();
    expect(screen.queryByLabelText(/^Reason for /)).toBeNull();
  });

  it("cancelling needs approve rights and confirms first", async () => {
    cancelCount.mockResolvedValue({ ...count(), status: "cancelled" });
    const { unmount } = render(<Harness initial={count({ can: { count: true, approve: false } })} />);
    expect(screen.queryByRole("button", { name: "Cancel count" })).toBeNull();
    unmount();

    render(<Harness initial={count()} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel count" }));
    fireEvent.click(await screen.findByRole("button", { name: "Yes, cancel it" }));
    await act(async () => {});
    expect(cancelCount).toHaveBeenCalledWith(41);
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
  });

  it("an approved count shows its reasons as text", () => {
    const approved = LINES.map((l) => (l.id === 11 ? { ...l, reason: "Spilled in store" } : l.id === 12 ? { ...l, reason: "Found" } : l));
    render(<Harness initial={count({ status: "approved", lines: approved, approvedByName: "Ravi Iyer", approvedAt: "2026-10-25T07:00:00.000Z" })} />);
    expect(within(rowOf("Basmati rice")).getByText("Spilled in store")).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Reason for /)).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve and post" })).toBeNull();
  });
});
