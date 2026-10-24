// ArcApproveRoundPage.test.js — the ARC approver sees the round they approve.
//
// THE TICKET (Phileein, 22 Oct 2026): "No revised quotes submitted yet" during
// approval, and the approver (Mrs. Shetty) could not see the target price. The
// old ARC approve page read the legacy tbl_negotiation_rounds.target_price
// column, which the create wizard stopped writing — every production ARC round
// has it NULL — so the targets, stored per vendor and per item in
// products[].vendor_targets[].fields, never reached the approver.
//
// ARC rounds now render on the RFQ approval page (NegotiationApprovalView): the
// item, each vendor's current rate and target, the approver chips, the creator's
// remarks, and the same approve/reject modal. The production shape below is
// ARC-2026-27-0006 "DAIRY PRODUCTS", round 8.

const pushMock = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ push: (...a) => pushMock(...a), query: {}, isReady: true }),
}));

jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock("@/services/arc_v2", () => ({
  __esModule: true,
  getArcNegotiationApprovalBundle: jest.fn(),
  approveArcNegotiationRound: jest.fn(),
  rejectArcNegotiationRound: jest.fn(),
}));

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getChargeNames: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(() => Promise.resolve({ data: { vendors: [] } })),
}));

import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as ArcApi from "@/services/arc_v2";
import ArcApproveRoundPage from "./ArcApproveRoundPage";

const ARC_ID = "8";
const ROUND_ID = 8;
const PANEER = 31;
const MILK = 32;
const VENDOR = 807;

const NOW = "2026-10-24T06:00:00.000Z";
const END = "2026-10-25 06:30:00"; // naive UTC, a day and a half-hour out

const instance = (over = {}) => ({
  id: 501,
  status: "PENDING",
  current_step: 1,
  can_user_approve: true,
  steps: [
    {
      id: 601,
      step_order: 1,
      status: "PENDING",
      approvers: [
        { id: 1, approver_user_id: 924, user_name: "Geetanand Shetty", status: "PENDING" },
        { id: 2, approver_user_id: 124, user_name: "Prashant Joshi", status: "PENDING" },
        { id: 3, approver_user_id: 165, user_name: "Hitesh Rao", status: "APPROVED" },
      ],
    },
  ],
  ...over,
});

const round = (over = {}) => ({
  id: ROUND_ID,
  round_number: 8,
  status: "PENDING_APPROVAL",
  end_date: END,
  created_at: "2026-10-24 05:50:00",
  created_by_name: "Hitesh Rao",
  creator_remarks: "Paneer is 20% above last year",
  arc_item_id: null,
  target_price: null,
  vendor_ids: [VENDOR],
  products: [
    { arc_item_id: PANEER, vendor_targets: [{ vendor_id: VENDOR, fields: [{ name: "base_price", target: "200" }] }] },
  ],
  ...over,
});

const bundle = ({ rounds = [round()], inst = instance() } = {}) => ({
  arc: {
    id: ARC_ID, arc_number: "ARC-2026-27-0006", title: "DAIRY PRODUCTS", status: "comm_eval_in_progress",
    company_name: "Orchid Hotels", hotel_name: "Orchid Mumbai", department_title: "Purchase",
  },
  rounds_history: rounds,
  negotiation_instances: Object.fromEntries(rounds.map((r) => [String(r.id), [inst]])),
  items: [
    { id: PANEER, variant_name: "PANEER TABELA", indicative_qty: 100, uom: "kg" },
    { id: MILK, variant_name: "COW MILK", indicative_qty: 500, uom: "litre" },
  ],
  quotes: [
    { vendor_id: VENDOR, vendor_name: "Shree Dairy", arc_item_id: PANEER, rate: "240.00", gst_pct: "5", charges: [] },
    { vendor_id: VENDOR, vendor_name: "Shree Dairy", arc_item_id: MILK, rate: "58.00", gst_pct: "0", charges: [] },
  ],
  qualified_by_item: {},
});

const renderPage = async (b = bundle()) => {
  ArcApi.getArcNegotiationApprovalBundle.mockResolvedValue({ status: 1, data: b });
  const utils = render(<ArcApproveRoundPage arcId={ARC_ID} roundId={String(ROUND_ID)} />);
  await screen.findByText("ARC-2026-27-0006");
  return utils;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  jest.setSystemTime(new Date(NOW));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("what the approver sees", () => {
  it("shows the item, the target and the vendor's current rate", async () => {
    const { container } = await renderPage();
    expect(within(container).getAllByText("PANEER TABELA").length).toBeGreaterThan(0);
    expect(within(container).getByText("base_price 200")).toBeInTheDocument();
    expect(container.textContent).toMatch(/₹240/);
    expect(container.textContent).toMatch(/₹200/);
  });

  it("shows who approves, and who has already approved", async () => {
    const { container } = await renderPage();
    expect(within(container).getByText("Geetanand Shetty")).toBeInTheDocument();
    expect(within(container).getByText("Prashant Joshi")).toBeInTheDocument();
    expect(within(container).getByText("Hitesh Rao", { selector: "span" })).toBeInTheDocument();
  });

  it("shows the creator's remarks and the time left", async () => {
    await renderPage();
    expect(screen.getByTestId("round-remarks")).toHaveTextContent("Paneer is 20% above last year");
    expect(screen.getByTestId("round-deadline")).toHaveTextContent("Vendors' deadline in 1d");
  });

  it("offers no per-line withholding — the ARC round is decided as a whole", async () => {
    await renderPage();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("shows a legacy single-item round's target_price as the base price target", async () => {
    const { container } = await renderPage(bundle({
      rounds: [round({ products: null, arc_item_id: PANEER, target_price: "150.00", arc_item_name: "PANEER TABELA" })],
    }));
    expect(within(container).getByText("base_price 150")).toBeInTheDocument();
  });

  it("renders an ask on the whole rate contract", async () => {
    const { container } = await renderPage(bundle({
      rounds: [round({
        products: [{ is_arc_level: true, vendor_targets: [{ vendor_id: VENDOR, fields: [{ name: "payment_terms", target: "45 days" }] }] }],
      })],
    }));
    expect(within(container).getAllByText("Whole rate contract").length).toBeGreaterThan(0);
    expect(within(container).getByText("payment_terms 45 days")).toBeInTheDocument();
  });
});

describe("deciding", () => {
  it("approves through the ARC endpoint with the approver's comment", async () => {
    const { container } = await renderPage();
    ArcApi.approveArcNegotiationRound.mockResolvedValue({ status: 1, data: { allApproved: false } });
    fireEvent.click(within(container).getByRole("button", { name: /^approve$/i }));
    fireEvent.change(await screen.findByRole("textbox"), { target: { value: "Fine by me" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm approval/i }));
    await waitFor(() =>
      expect(ArcApi.approveArcNegotiationRound).toHaveBeenCalledWith(ARC_ID, ROUND_ID, { comment: "Fine by me" })
    );
  });

  it("rejects through the ARC endpoint with the reason", async () => {
    const { container } = await renderPage();
    ArcApi.rejectArcNegotiationRound.mockResolvedValue({ status: 1 });
    fireEvent.click(within(container).getByRole("button", { name: /^reject$/i }));
    fireEvent.change(await screen.findByRole("textbox"), { target: { value: "Targets too aggressive" } });
    fireEvent.click(screen.getByRole("button", { name: /confirm rejection/i }));
    await waitFor(() =>
      expect(ArcApi.rejectArcNegotiationRound).toHaveBeenCalledWith(ARC_ID, ROUND_ID, { comment: "Targets too aggressive" })
    );
  });
});

describe("a round that is not waiting on this user", () => {
  it("says so, and links to the round", async () => {
    await renderPage(bundle({ inst: instance({ can_user_approve: false }) }));
    expect(screen.getByText(/No rounds awaiting your approval/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /view round/i })).toHaveAttribute(
      "href",
      `/dashboard/buyer/negotiation/round/${ROUND_ID}`
    );
  });
});
