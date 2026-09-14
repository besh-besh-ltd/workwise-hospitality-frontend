// Approving a negotiation round LINE BY LINE.
//
// A round covers many line items but its approval was one yes/no: in
// production 22 approvals each decided between 2 and 18 line items with a
// single verdict, and no round has ever had a heterogeneous outcome. An
// approver happy with four of five targets had to reject the whole round and
// have it rebuilt. Client feedback item 8.
//
// Semantics: partial publish. A withheld line is sent as REJECTED and never
// reaches the vendor; the rest of the round goes live. The server enforces the
// same rule (negotiation.lineApproval.test.js) — this suite is about what the
// approver can express on screen.

const pushMock = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { rfqId: "601" },
    asPath: "/dashboard/buyer/negotiation/601/approve",
    pathname: "/dashboard/buyer/negotiation/[rfqId]/approve",
    push: (...a) => pushMock(...a),
    replace: jest.fn(),
    isReady: true,
  }),
}));

jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationApprovalBundle: jest.fn(),
  approveNegotiationRound: jest.fn(),
  rejectNegotiationRound: jest.fn(),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  getQuoteComparison: jest.fn(),
  getQuoteComparisonView: jest.fn(),
  previewTotals: jest.fn(() => Promise.resolve({ data: { vendors: [] } })),
}));
jest.mock("@/services/rfq", () => ({ __esModule: true, getChargeNames: jest.fn() }));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import {
  getNegotiationApprovalBundle,
  approveNegotiationRound,
} from "@/services/negotiation";
import { getQuoteComparison, getQuoteComparisonView } from "@/services/pricing";
import { getChargeNames } from "@/services/rfq";
import ApproveRoundPage from "./ApproveRoundPage";

const ROUND_ID = 914;
const APPROVER = 138;
const VENDOR_A = 91;
const VENDOR_B = 92;
const LINE_A = 4501;
const LINE_B = 4502;

// A two-line round, both lines targeted at the same vendor, plus a second
// vendor on line A — the shape that makes "which line, which vendor" matter.
const bundle = () => ({
  rounds_history: [
    {
      id: ROUND_ID,
      round_number: 2,
      status: "PENDING_APPROVAL",
      end_date: "2026-08-13 07:00:00",
      created_at: "2026-08-12 07:05:35",
      created_by_name: "Asha Menon",
      rfq_product_id: null,
      product_names: [
        { rfq_product_id: LINE_A, product_name: "Bath towel 500gsm" },
        { rfq_product_id: LINE_B, product_name: "Hand towel 400gsm" },
      ],
      vendor_approvals: [
        { vendor_id: VENDOR_A, status: "PENDING" },
        { vendor_id: VENDOR_B, status: "PENDING" },
      ],
      products: [
        {
          rfq_product_id: LINE_A,
          vendor_targets: [
            { vendor_id: VENDOR_A, fields: [{ name: "base_price", target: "90" }] },
            { vendor_id: VENDOR_B, fields: [{ name: "base_price", target: "92" }] },
          ],
        },
        {
          rfq_product_id: LINE_B,
          vendor_targets: [
            { vendor_id: VENDOR_A, fields: [{ name: "base_price", target: "45" }] },
          ],
        },
      ],
    },
  ],
  negotiation_instances: {
    [String(ROUND_ID)]: [
      {
        id: 88,
        status: "PENDING",
        current_step: 1,
        can_user_approve: true,
        steps: [
          {
            id: 900,
            step_order: 1,
            status: "PENDING",
            approvers: [{ id: 2, approver_user_id: APPROVER, user_name: "Prashant Joshi", status: "PENDING" }],
          },
        ],
      },
    ],
  },
  negotiation_quote_instances: {},
});

const renderPage = async () => {
  getNegotiationApprovalBundle.mockResolvedValue({ status: 1, data: bundle() });
  getQuoteComparison.mockResolvedValue({ data: { products: [] } });
  getQuoteComparisonView.mockResolvedValue({
    rfq: { number: 536147, title: "Housekeeping consumables", company: "Phileein", hotel: "Taj Palace", status: "PUBLISHED" },
  });
  getChargeNames.mockResolvedValue({ data: [] });
  approveNegotiationRound.mockResolvedValue({ status: 1, data: { published: true } });

  const utils = render(<ApproveRoundPage />);
  await screen.findByText(/Round 2/);
  return utils;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  jest.setSystemTime(new Date("2026-08-12T09:00:00.000Z"));
});
afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

/** Confirm the approval through the reason modal the page opens. */
const confirmApprove = async () => {
  fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));
  // The modal's own button reads "Confirm Approval"; the page button behind it
  // still reads "Approve", so match the modal's wording exactly.
  const confirm = await screen.findByRole("button", { name: /confirm approval/i });
  fireEvent.click(confirm);
};

const withholdToggle = (line, vendor) =>
  screen.getByLabelText(new RegExp(`withhold line ${line} for vendor ${vendor}`, "i"));

describe("withholding a line while approving the round", () => {
  it("offers a withhold control for every line and vendor on the round", async () => {
    await renderPage();

    expect(withholdToggle(LINE_A, VENDOR_A)).toBeInTheDocument();
    expect(withholdToggle(LINE_A, VENDOR_B)).toBeInTheDocument();
    expect(withholdToggle(LINE_B, VENDOR_A)).toBeInTheDocument();
  });

  it("sends no line verdicts when nothing is withheld", async () => {
    // Back-compat: an approver who just approves must produce the same request
    // every caller sent before this feature.
    await renderPage();
    await confirmApprove();

    await waitFor(() => expect(approveNegotiationRound).toHaveBeenCalled());
    const [, , , lines] = approveNegotiationRound.mock.calls.at(-1);
    expect(lines == null || lines.length === 0).toBe(true);
  });

  it("sends the withheld line as REJECTED, and only that one", async () => {
    await renderPage();
    fireEvent.click(withholdToggle(LINE_B, VENDOR_A));
    await confirmApprove();

    await waitFor(() => expect(approveNegotiationRound).toHaveBeenCalled());
    const [, , , lines] = approveNegotiationRound.mock.calls.at(-1);

    expect(lines).toEqual([
      expect.objectContaining({
        rfq_product_id: LINE_B,
        vendor_id: VENDOR_A,
        decision: "REJECTED",
      }),
    ]);
  });

  it("can withhold one vendor on a line while the other vendor keeps it", async () => {
    await renderPage();
    fireEvent.click(withholdToggle(LINE_A, VENDOR_B));
    await confirmApprove();

    await waitFor(() => expect(approveNegotiationRound).toHaveBeenCalled());
    const [, , , lines] = approveNegotiationRound.mock.calls.at(-1);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ rfq_product_id: LINE_A, vendor_id: VENDOR_B, decision: "REJECTED" });
  });

  it("un-withholding puts the line back", async () => {
    await renderPage();
    const toggle = withholdToggle(LINE_B, VENDOR_A);
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    await confirmApprove();

    await waitFor(() => expect(approveNegotiationRound).toHaveBeenCalled());
    const [, , , lines] = approveNegotiationRound.mock.calls.at(-1);
    expect(lines == null || lines.length === 0).toBe(true);
  });

  it("refuses to approve when every line has been withheld", async () => {
    // Publishing a round with nothing in it would invite the vendor to answer
    // an empty negotiation. The server refuses this too; saying so here saves
    // the round trip.
    const { toast } = require("react-toastify");
    await renderPage();
    fireEvent.click(withholdToggle(LINE_A, VENDOR_A));
    fireEvent.click(withholdToggle(LINE_A, VENDOR_B));
    fireEvent.click(withholdToggle(LINE_B, VENDOR_A));

    fireEvent.click(screen.getByRole("button", { name: /^approve$/i }));

    expect(approveNegotiationRound).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/every line|reject the round/i));
  });
});
