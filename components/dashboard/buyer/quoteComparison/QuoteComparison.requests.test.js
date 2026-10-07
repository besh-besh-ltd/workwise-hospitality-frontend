// QuoteComparison — what it asks the server for, and when.
//
// Three defects, all request-shaped:
//   1. A serial waterfall: getRFQById → permissions/bulk → quote-comparison-view.
//      The view (the slow one) only started once both had returned.
//   2. The approval-bundle effect depended on [rfq, view], so it fired twice on
//      mount (view null → loaded) and again after every silent refetch.
//   3. Embedded in the RFQ page it re-fetched the RFQ the host already held.
//
// The permission hook is mocked the way the real one behaves: it answers only
// once it is enabled (i.e. once the RFQ's hotel is known).

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: {},
    asPath: "/dashboard/buyer/quote-comparison?rfq=363",
    pathname: "/dashboard/buyer/quote-comparison",
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
const mockPerms = { read: true };
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  default: ({ enabled }) => ({
    canRead: !!enabled && mockPerms.read,
    canCreate: !!enabled && mockPerms.read,
    canUpdate: !!enabled && mockPerms.read,
    canApprove: !!enabled && mockPerms.read,
    loading: false,
  }),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  getQuoteComparisonView: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  finalizeQuotation: jest.fn(() => Promise.resolve({ status: 1 })),
  getRFQById: jest.fn(),
  getRfqs: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  approveNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  rejectNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  getNegotiationApprovalBundle: jest.fn(() => Promise.resolve({ data: {} })),
}));

import React from "react";
import { render, screen, fireEvent, waitFor, within, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import { getRFQById, finalizeQuotation } from "@/services/rfq";
import { getNegotiationApprovalBundle } from "@/services/negotiation";
import QuoteComparison, { awardCellAnchorId } from "./QuoteComparison";

const RFQ_ID = "363";
const ACME = 431;
const METRO = 433;
const SCREEN = { id: 9001, pvid: 71001, name: "LAPTOP SCREEN" };

const cell = (base, vendorId, quoteId) => ({
  base, subtotal: base * 10, tax_amt: Math.round(base * 10 * 0.18), delivery_charges: 0,
  total: Math.round(base * 10 * 1.18), other_charges: [], global_charges: [], history: [], negotiation: null,
  finalize: { vendor_id: vendorId, quote_id: quoteId, quote_item_id: quoteId * 10, unit_price: base, total_value: base * 10, charges_meta: {} },
});
const product = (p) => ({
  id: p.id, product_variant_id: p.pvid, variant: 0, name: p.name, qty: 10, unit: "nos", category: 1,
  state: "open", awaiting_me: false, finalized_vendor: null, finalized_by: null, negotiation: null,
  reject_info: null, quoted_count: 2, tech: { configured: false, scores: {} },
  quotes: { [ACME]: cell(1000, ACME, 11), [METRO]: cell(1200, METRO, 12) },
  quotes_absence: {}, approval: { current_approvers: [] },
});
const payload = () => ({
  rfq: { id: 363, rfq_no: "535917", number: "535917", title: "IT hardware", status: "OPEN", project_id: null, tech_clauses: true },
  quotes_locked: false,
  bid_end_date: "2026-07-25T10:00:00.000Z",
  vendors: [{ id: ACME, name: "Acme Systems", short: "AS" }, { id: METRO, name: "Metro Fittings", short: "MF" }],
  categories: [{ id: 1, name: "IT" }],
  products: [product(SCREEN)],
  approval_chain: [],
  has_delivery_charges: false,
});
const RFQ_META = { id: 363, hotel_ids: [1], department_id: 2 };

beforeEach(() => {
  jest.clearAllMocks();
  mockPerms.read = true;
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  getQuoteComparisonView.mockResolvedValue(payload());
  getRFQById.mockResolvedValue({ data: RFQ_META });
});

describe("request waterfall", () => {
  it("starts the comparison view without waiting for the RFQ and its permissions", async () => {
    getRFQById.mockReturnValue(new Promise(() => {})); // RFQ (→ permissions) still in flight
    render(<QuoteComparison rfqId={RFQ_ID} embedded />);
    await waitFor(() => expect(getQuoteComparisonView).toHaveBeenCalledTimes(1));
    expect(getRFQById).toHaveBeenCalledTimes(1);
  });

  it("still renders nothing it fetched when the read grant is missing", async () => {
    mockPerms.read = false;
    render(<QuoteComparison rfqId={RFQ_ID} embedded />);
    expect(await screen.findByText("access denied")).toBeInTheDocument();
    expect(screen.queryByText("LAPTOP SCREEN")).not.toBeInTheDocument();
  });
});

describe("approval bundle", () => {
  it("is requested once on mount, and not again after a silent refetch", async () => {
    render(<QuoteComparison rfqId={RFQ_ID} embedded />);
    await screen.findByText("LAPTOP SCREEN");
    expect(getNegotiationApprovalBundle).toHaveBeenCalledTimes(1);

    // Finalise one line: the sheet POSTs, then silently refetches the view.
    fireEvent.click(
      within(document.getElementById(awardCellAnchorId(SCREEN.id, ACME)))
        .getByRole("button", { name: /select for this item/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /^Finalise \d+ ·/ }));
    await screen.findByText("Finalise vendor selection");
    fireEvent.change(screen.getByLabelText(/comment/i), { target: { value: "Lowest landed cost." } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /confirm & create po draft/i }));
    });
    await waitFor(() => expect(finalizeQuotation).toHaveBeenCalled());
    await waitFor(() => expect(getQuoteComparisonView.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(getNegotiationApprovalBundle).toHaveBeenCalledTimes(1);
  });
});

describe("embedded in the RFQ page", () => {
  it("uses the host's RFQ instead of fetching it again", async () => {
    render(<QuoteComparison rfqId={RFQ_ID} rfq={RFQ_META} embedded />);
    await screen.findByText("LAPTOP SCREEN");
    expect(getRFQById).not.toHaveBeenCalled();
  });

  it("falls back to fetching when the host's RFQ is a different one", async () => {
    render(<QuoteComparison rfqId={RFQ_ID} rfq={{ id: 999, hotel_ids: [1] }} embedded />);
    await screen.findByText("LAPTOP SCREEN");
    expect(getRFQById).toHaveBeenCalledTimes(1);
  });
});
