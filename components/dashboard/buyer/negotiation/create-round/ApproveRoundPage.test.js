// ApproveRoundPage.test.js — F2, the literal ticket.
//
// THE REPORT: "the round's end date shows as 13 Aug 2026 07:00 AM on the
// approval screen, but the round actually ends at 12:30 PM."
//
// THE ROW: RFQ #536147, tbl_negotiation_rounds id 914,
// end_date = '2026-08-13 07:00:00' — a `timestamp without time zone` holding
// UTC, handed to Node as a bare unlabelled string by dbConn.js:31.
//
// THE PATH: getApprovalBundleForRfq does `SELECT nr.*` -> rounds_history[] ->
// ApproveRoundPage hands round.end_date to StepReview as formData.end_date ->
// StepReview's readOnly branch did `moment(formData.end_date)`, which reads a
// naive string as LOCAL wall clock and prints the digits straight back.
//
// THE IRONY THIS FILE PINS: the same page already parsed created_at correctly,
// through a private copy of the right parser it did not share. So
// "created 12 Aug 2026, 12:35 PM" rendered two inches above
// "End date 13 Aug 2026 · 07:00 AM" — one screen, one row, 5h30m apart. The
// second assertion below is that pair, together, because the bug is not "the
// end date is wrong", it is "two timestamps on one card disagree".
//
// TZ: the page is IST-pinned by contract (decision 1), so these expectations
// hold in every zone. Run under TZ=Asia/Singapore too — under TZ=UTC alone,
// reading a UTC string as local is a no-op and the broken code passes.

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

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getChargeNames: jest.fn(),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getNegotiationApprovalBundle } from "@/services/negotiation";
import { getQuoteComparison, getQuoteComparisonView } from "@/services/pricing";
import { getChargeNames } from "@/services/rfq";
import ApproveRoundPage from "./ApproveRoundPage";

// ── the production row ─────────────────────────────────────────────────────
const ROUND_ID = 914;
const APPROVER = 138;

// The naive UTC string the column actually holds, and what it means.
const NAIVE_END = "2026-08-13 07:00:00"; // 12:30 PM IST
const NAIVE_CREATED = "2026-08-12 07:05:35"; // 12:35 PM IST

// A round the page will show: PENDING_APPROVAL, deadline in the future
// (pendingRounds filters on end_date > now), pending on this user.
const bundle = (over = {}) => ({
  rounds_history: [
    {
      id: ROUND_ID,
      round_number: 2,
      status: "PENDING_APPROVAL",
      end_date: over.end_date ?? NAIVE_END,
      created_at: over.created_at ?? NAIVE_CREATED,
      created_by_name: "Asha Menon",
      rfq_product_id: 4501,
      product_name: "Bath towel 500gsm",
      vendor_approvals: [
        { vendor_id: 91, status: "PENDING", negotiation_fields: [{ name: "base_price", target: "90" }] },
      ],
      products: null,
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
            approvers: [
              { id: 1, approver_user_id: 745, user_name: "Priya Nair", status: "APPROVED" },
              { id: 2, approver_user_id: APPROVER, user_name: "Prashant Joshi", status: "PENDING" },
            ],
          },
        ],
      },
    ],
  },
  negotiation_quote_instances: {},
});

const renderPage = async (over) => {
  getNegotiationApprovalBundle.mockResolvedValue({ status: 1, data: bundle(over) });
  getQuoteComparison.mockResolvedValue({ data: { products: [] } });
  getQuoteComparisonView.mockResolvedValue({
    rfq: { number: 536147, title: "Housekeeping consumables", company: "Phileein", hotel: "Taj Palace", status: "PUBLISHED" },
  });
  getChargeNames.mockResolvedValue({ data: [] });

  const utils = render(<ApproveRoundPage />);
  await screen.findByText(/Round 2/);
  return utils;
};

beforeEach(() => {
  jest.clearAllMocks();
  // The round must still be in the future for the page to list it. Freeze the
  // clock a day before the fixture deadline rather than moving the fixture:
  // the fixture IS the production row and its digits are the whole point.
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  jest.setSystemTime(new Date("2026-08-12T09:00:00.000Z"));
});

afterEach(() => {
  jest.useRealTimers();
});

describe("the reported bug — the deadline the approver is approving", () => {
  it("shows 12:30 PM, the time the round actually ends", async () => {
    await renderPage();
    // Substring, not equality: one formatter means one shape, and the shape
    // now carries an " IST" suffix and a comma separator (changes.md §4).
    // What must not move is the TIME.
    expect(screen.getByText(/12:30 PM/)).toBeInTheDocument();
  });

  it("does NOT show 07:00 AM — the stored digits, printed raw", async () => {
    await renderPage();
    // The whole ticket in one line. `moment("2026-08-13 07:00:00")` reads the
    // naive string as local wall clock and passes the digits through
    // untouched; 07:00 is what the DB holds, not what the deadline is.
    expect(screen.queryByText(/07:00 AM/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/07:00 AM/);
  });

  it("says IST, so an approver in another zone is not converting in their head", async () => {
    await renderPage();
    expect(screen.getByText(/12:30 PM IST/)).toBeInTheDocument();
  });

  it("THE IRONY: created_at and end_date now agree, on one card", async () => {
    // This page always rendered created_at correctly, through a private copy
    // of the right parser that StepReview never got. The defect was visible
    // on screen as two timestamps of the same row disagreeing by 5h30m.
    await renderPage();
    const text = document.body.textContent;
    expect(text).toMatch(/12 Aug 2026, 12:35 PM/); // created — was already right
    expect(text).toMatch(/13 Aug 2026, 12:30 PM/); // end date — was 07:00 AM
    // …and neither is the raw stored digits.
    expect(text).not.toMatch(/07:05 AM/);
    expect(text).not.toMatch(/07:00 AM/);
  });

  it("renders an already-ISO end_date identically — the backend now sends these", async () => {
    // Layer 1 labels these server-side. Both spellings of one instant must
    // land on one rendering, or the fix has merely moved the seam.
    await renderPage({ end_date: "2026-08-13T07:00:00.000Z" });
    expect(screen.getByText(/13 Aug 2026, 12:30 PM IST/)).toBeInTheDocument();
  });

  it("still lists the round it is asked to approve, and who has acted", async () => {
    // Guard: the page must not have been made "correct" by rendering nothing.
    await renderPage();
    expect(screen.getByText(/Round 2/)).toBeInTheDocument();
    expect(screen.getByText(/Asha Menon/)).toBeInTheDocument();
    expect(screen.getByText("Priya Nair")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve/ })).toBeInTheDocument();
  });
});

describe("the page decides what is still pending off the INSTANT, not the digits", () => {
  it("keeps a round whose deadline has not yet passed", async () => {
    // 2026-08-12 09:00Z is before 2026-08-13 07:00Z, so the round is live.
    await renderPage();
    expect(screen.queryByText(/No rounds awaiting your approval/)).not.toBeInTheDocument();
  });

  it("drops a round whose deadline has passed", async () => {
    jest.setSystemTime(new Date("2026-08-13T09:00:00.000Z")); // two hours after 07:00Z
    getNegotiationApprovalBundle.mockResolvedValue({ status: 1, data: bundle() });
    getQuoteComparison.mockResolvedValue({ data: { products: [] } });
    getQuoteComparisonView.mockResolvedValue({ rfq: { number: 536147 } });
    getChargeNames.mockResolvedValue({ data: [] });

    render(<ApproveRoundPage />);
    expect(await screen.findByText(/No rounds awaiting your approval/)).toBeInTheDocument();
  });

  it("keeps it at 11:00 IST on the deadline day — the 5h30m window the bug lived in", async () => {
    // 05:30Z is 11:00 IST, an hour and a half before the 12:30 IST deadline.
    // Read through the broken parser the round looks 5h30m more expired than
    // it is, so an approver arriving in this window found the round GONE from
    // their queue while vendors could still see it.
    jest.setSystemTime(new Date("2026-08-13T05:30:00.000Z"));
    await renderPage();
    expect(screen.queryByText(/No rounds awaiting your approval/)).not.toBeInTheDocument();
    expect(screen.getByText(/12:30 PM IST/)).toBeInTheDocument();
  });
});
