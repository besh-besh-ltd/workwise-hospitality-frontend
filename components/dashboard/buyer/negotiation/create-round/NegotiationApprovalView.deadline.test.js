// NegotiationApprovalView.deadline.test.js — the approver sees how long is left.
//
// A round's deadline is fixed when it is CREATED, but vendors only see it once
// every approver has signed off, so approval time comes out of the vendor's
// window. Production ARC-2026-27-0006 opened eight rounds with deadlines 4–64
// minutes out; seven lapsed in PENDING_APPROVAL and no vendor ever saw one.
// The approver now sees the time left, flagged once it is inside the minimum
// round window (2 hours).
//
// The chip carries only the time left. The deadline itself is already printed
// by the read-only review below it (End date … IST), and printing the same
// instant twice would make the RFQ page's single-match assertions ambiguous.

jest.mock("@/services/pricing", () => ({
  __esModule: true,
  previewTotals: jest.fn(() => Promise.resolve({ data: { vendors: [] } })),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import NegotiationApprovalView from "./NegotiationApprovalView";
import { roundToReviewEntries } from "./ApproveRoundPage";

const ROUND_ID = 77;
const NOW = "2026-10-24T06:00:00.000Z";

// end_date is the naive UTC string the column holds.
const bundle = (endDate) => ({
  rounds_history: [
    {
      id: ROUND_ID,
      round_number: 1,
      status: "PENDING_APPROVAL",
      end_date: endDate,
      created_at: "2026-10-24 05:55:00",
      created_by_name: "Hitesh Rao",
      rfq_product_id: 11,
      product_name: "Milk 1L",
      vendor_approvals: [{ vendor_id: 5, status: "PENDING", negotiation_fields: [{ name: "base_price", target: "52" }] }],
      products: null,
    },
  ],
  negotiation_instances: {
    [String(ROUND_ID)]: [
      {
        id: 1,
        status: "PENDING",
        current_step: 1,
        can_user_approve: true,
        steps: [{ id: 2, step_order: 1, status: "PENDING", approvers: [{ id: 3, approver_user_id: 924, user_name: "Geetanand Shetty", status: "PENDING" }] }],
      },
    ],
  },
});

const renderView = (endDate) =>
  render(
    <NegotiationApprovalView
      loading={false}
      loadError={null}
      header={{ title: "Approve negotiation round" }}
      bundle={bundle(endDate)}
      products={[]}
      chargeNamesList={[]}
      toReviewEntries={roundToReviewEntries}
      allowLineWithhold
      onApprove={jest.fn()}
      onReject={jest.fn()}
      refetchBundle={jest.fn()}
      onDone={jest.fn()}
      backLabel="Back"
      onBack={jest.fn()}
    />
  );

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  jest.setSystemTime(new Date(NOW));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("time left on the round", () => {
  it("flags a round ending in 90 minutes as urgent", () => {
    renderView("2026-10-24 07:30:00");
    const chip = screen.getByTestId("round-deadline");
    expect(chip).toHaveTextContent("Vendors' deadline in 1h 30m");
    expect(chip).toHaveAttribute("data-urgent", "true");
  });

  it("does not flag a round five hours out", () => {
    renderView("2026-10-24 11:00:00");
    const chip = screen.getByTestId("round-deadline");
    expect(chip).toHaveTextContent("Vendors' deadline in 5h");
    expect(chip).toHaveAttribute("data-urgent", "false");
  });

  it("names the instant in its tooltip, in IST", () => {
    renderView("2026-10-24 11:00:00");
    expect(screen.getByTestId("round-deadline")).toHaveAttribute("title", "24 Oct 2026, 04:30 PM IST");
  });
});
