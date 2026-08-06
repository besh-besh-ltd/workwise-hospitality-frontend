// QuoteComparison — the receiving half of the award-approval hand-off.
//
// The RFQ page's award banner deliberately carries no Approve/Reject: the
// decision lives on this sheet's product × vendor cells, where the approver can
// see the item, the vendor and the price and decide several lines at once. The
// banner bumps `focusAwardToken`; this sheet has to land the approver on the
// first cell where THEIR approval is pending.
//
// The three things that make that non-trivial in production, all asserted here:
// the sheet loads asynchronously, the post-approval refetch replaces every
// product, and there may be no matching cell at all.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: {},
    asPath: "/dashboard/buyer/rfq-management-details?id=536264",
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({
  __esModule: true,
  default: () => <div>access denied</div>,
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  default: () => ({
    canRead: true,
    canCreate: true,
    canUpdate: true,
    canApprove: true,
    loading: false,
  }),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  getQuoteComparisonView: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  finalizeQuotation: jest.fn(() => Promise.resolve({})),
  getRFQById: jest.fn(() => Promise.resolve({ data: { hotel_ids: [1], department_id: 2 } })),
  getRfqs: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  approveNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  rejectNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  getNegotiationApprovalBundle: jest.fn(() => Promise.resolve({ data: {} })),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import QuoteComparison, { awardCellAnchorId, QUOTE_SHEET_ANCHOR_ID } from "./QuoteComparison";

const RFQ_ID = "720";
const SHARMA = 5512;
const METRO = 5513;

const quote = (base) => ({
  base,
  subtotal: base * 10,
  tax_amt: Math.round(base * 10 * 0.18),
  total: Math.round(base * 10 * 1.18),
  other_charges: [],
  history: [],
  finalize: {
    vendor_id: SHARMA,
    quote_id: 1,
    quote_item_id: 1,
    unit_price: base,
    total_value: Math.round(base * 10 * 1.18),
    charges_meta: {},
  },
});

const product = (id, name, state, awaitingMe, finalizedVendor) => ({
  id,
  name,
  qty: 10,
  unit: "nos",
  category: 1,
  state,
  awaiting_me: awaitingMe,
  finalized_vendor: finalizedVendor,
  quoted_count: 2,
  quotes: { [SHARMA]: quote(1500), [METRO]: quote(1620) },
  approval: { current_approvers: [{ name: "Prashant Joshi" }] },
});

// Product 8801 is already through; 8802 is the one waiting on THIS approver —
// awarded to Metro, so the cell to land on is 8802 × Metro, not 8802 × Sharma.
const viewPayload = () => ({
  rfq: { id: 720, rfq_no: "536264", title: "Window fittings", status: "OPEN", project_id: null },
  quotes_locked: false,
  bid_end_date: "2026-07-25T10:00:00.000Z",
  vendors: [
    { id: SHARMA, name: "Sharma Glassworks", short: "SG" },
    { id: METRO, name: "Metro Fittings", short: "MF" },
  ],
  categories: [{ id: 1, name: "Fittings" }],
  products: [
    product(8801, "WINDOW A", "approved", false, SHARMA),
    product(8802, "WINDOW B", "pending", true, METRO),
    product(8803, "WINDOW C", "pending", true, SHARMA),
  ],
  approval_chain: [],
  // The toggle only renders when the RFQ actually carries a delivery charge;
  // this suite clicks it purely to force a refetch.
  has_delivery_charges: true,
});

// No line is waiting on this user — the sheet still has to do something sane.
const nothingPendingPayload = () => {
  const v = viewPayload();
  v.products = v.products.map((p) => ({
    ...p,
    state: "approved",
    awaiting_me: false,
  }));
  return v;
};

let scrollSpy;

beforeEach(() => {
  jest.clearAllMocks();
  scrollSpy = jest.fn();
  // jsdom has no layout, so scrollIntoView is not implemented.
  window.HTMLElement.prototype.scrollIntoView = scrollSpy;
  getQuoteComparisonView.mockResolvedValue(viewPayload());
});

const renderSheet = async (props = {}) => {
  const utils = render(<QuoteComparison rfqId={RFQ_ID} embedded {...props} />);
  await screen.findByText("WINDOW B");
  return utils;
};

describe("award focus — landing the approver on their cell", () => {
  test("scrolls to the first product × vendor cell awaiting THIS user", async () => {
    await renderSheet({ focusAwardToken: 1 });

    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(1));

    const target = document.getElementById(awardCellAnchorId(8802, METRO));
    expect(target).toBeInTheDocument();
    // `this` on the scrollIntoView call is the element it was called on.
    expect(scrollSpy.mock.instances[0]).toBe(target);
  });

  test("makes that cell visually obvious, and it is the one carrying the decision", async () => {
    await renderSheet({ focusAwardToken: 1 });

    const target = document.getElementById(awardCellAnchorId(8802, METRO));
    await waitFor(() => expect(target).toHaveTextContent(/your approval/i));
    // The decision surface the banner promised is right there.
    expect(target.querySelector("button")).toBeTruthy();
    expect(target).toHaveTextContent(/approve/i);
    expect(target).toHaveTextContent(/reject/i);

    // The runner-up cell is untouched.
    const other = document.getElementById(awardCellAnchorId(8802, SHARMA));
    expect(other).not.toHaveTextContent(/your approval/i);
  });

  test("no-ops while the sheet is still loading, then self-heals when it lands", async () => {
    // Hold the view back so the token arrives before anything is in the DOM.
    let release;
    getQuoteComparisonView.mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(viewPayload());
      })
    );

    render(<QuoteComparison rfqId={RFQ_ID} embedded focusAwardToken={1} />);

    // Nothing to scroll to yet — and crucially, no crash and no scroll.
    expect(scrollSpy).not.toHaveBeenCalled();

    await act(async () => {
      release();
    });
    await screen.findByText("WINDOW B");

    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(1));
    expect(scrollSpy.mock.instances[0]).toBe(
      document.getElementById(awardCellAnchorId(8802, METRO))
    );
  });

  test("a refetch does not yank the viewport back", async () => {
    await renderSheet({ focusAwardToken: 1 });
    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(1));

    // A refetch replaces every product object — exactly what happens after an
    // approve/reject. The token has not changed, so nothing should move.
    getQuoteComparisonView.mockResolvedValue(viewPayload());
    fireEvent.click(screen.getByText(/include delivery charges/i));

    await waitFor(() => expect(getQuoteComparisonView).toHaveBeenCalledTimes(2));
    await screen.findByText("WINDOW B");
    expect(scrollSpy).toHaveBeenCalledTimes(1);
  });

  test("a second click focuses again", async () => {
    const { rerender } = await renderSheet({ focusAwardToken: 1 });
    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(1));

    rerender(<QuoteComparison rfqId={RFQ_ID} embedded focusAwardToken={2} />);
    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(2));
  });

  test("does nothing at all until asked", async () => {
    await renderSheet({ focusAwardToken: 0 });

    await waitFor(() => expect(screen.getByText("WINDOW B")).toBeInTheDocument());
    expect(scrollSpy).not.toHaveBeenCalled();
    expect(document.body).not.toHaveTextContent(/your approval/i);
  });

  test("degrades to the sheet itself when no cell matches", async () => {
    getQuoteComparisonView.mockResolvedValue(nothingPendingPayload());

    render(<QuoteComparison rfqId={RFQ_ID} embedded focusAwardToken={1} />);
    await screen.findByText("WINDOW B");

    await waitFor(() => expect(scrollSpy).toHaveBeenCalledTimes(1));
    expect(scrollSpy.mock.instances[0]).toBe(
      document.getElementById(QUOTE_SHEET_ANCHOR_ID)
    );
    // …and marks nothing, because nothing is this user's to decide.
    expect(document.body).not.toHaveTextContent(/your approval/i);
  });
});
