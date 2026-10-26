// The adjustment sheet only ever shows the adjustment it was opened for: a
// slow answer for an earlier one is dropped, and switching never flashes the
// last one's figures or buttons.

jest.mock("@/services/inventory", () => ({ __esModule: true, getAdjustment: jest.fn() }));

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getAdjustment } from "@/services/inventory";
import AdjustmentDetailModal from "../AdjustmentDetailModal";

const adjustment = (id, number, over = {}) => ({
  id, adjustmentNumber: number, hotelId: 46, hotelName: "Orchid Mumbai", reasonCode: "WASTAGE",
  status: "pending_approval", remarks: null, value: 540, createdAt: "2026-10-24T09:00:00.000Z", createdByName: "Ravi K",
  can: { approve: true, reject: true },
  lines: [{ id, invItemId: 9, displayName: "Basmati rice", itemCode: "RICE-25", stockUom: "bag", qty: -0.3, unitCost: 1800, value: -540 }],
  ...over,
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => jest.clearAllMocks());

describe("AdjustmentDetailModal", () => {
  test("a slow answer for the adjustment switched away from never lands", async () => {
    const first = deferred();
    const second = deferred();
    getAdjustment.mockImplementation((id) => (id === 1 ? first.promise : second.promise));
    const { rerender } = render(<AdjustmentDetailModal id={1} onHide={() => {}} />);
    rerender(<AdjustmentDetailModal id={2} onHide={() => {}} />);
    await act(async () => second.resolve(adjustment(2, "ADJ/46/2026-27/00005")));
    expect(await screen.findByText("ADJ/46/2026-27/00005")).toBeInTheDocument();

    await act(async () => first.resolve(adjustment(1, "ADJ/46/2026-27/00004")));
    expect(screen.getByText("ADJ/46/2026-27/00005")).toBeInTheDocument();
    expect(screen.queryByText("ADJ/46/2026-27/00004")).toBeNull();
  });

  test("switching to another adjustment clears the last one while the next loads", async () => {
    const second = deferred();
    getAdjustment.mockImplementation((id) => (id === 1 ? Promise.resolve(adjustment(1, "ADJ/46/2026-27/00004")) : second.promise));
    const { rerender } = render(<AdjustmentDetailModal id={1} onHide={() => {}} onApprove={() => {}} />);
    expect(await screen.findByText("ADJ/46/2026-27/00004")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();

    rerender(<AdjustmentDetailModal id={2} onHide={() => {}} onApprove={() => {}} />);
    expect(screen.queryByText("ADJ/46/2026-27/00004")).toBeNull();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("table", { name: "Adjustment lines" })).toBeNull();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();

    await act(async () => second.resolve(adjustment(2, "ADJ/46/2026-27/00005", { can: { approve: false, reject: false } })));
    expect(await screen.findByText("ADJ/46/2026-27/00005")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
  });

  test("a refusal for an earlier adjustment doesn't show on the next", async () => {
    const first = deferred();
    getAdjustment.mockImplementation((id) => (id === 1 ? first.promise : Promise.resolve(adjustment(2, "ADJ/46/2026-27/00005"))));
    const { rerender } = render(<AdjustmentDetailModal id={1} onHide={() => {}} />);
    rerender(<AdjustmentDetailModal id={2} onHide={() => {}} />);
    expect(await screen.findByText("ADJ/46/2026-27/00005")).toBeInTheDocument();
    await act(async () => first.reject(new Error("Network Error")));
    await waitFor(() => expect(getAdjustment).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("ADJ/46/2026-27/00005")).toBeInTheDocument();
  });
});
