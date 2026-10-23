// QuoteComparison — a PO an approver rejected must be explained where the
// evaluator lands.
//
// An approver rejects PO #681508 with "Re-negotiate or change the vendor". Its
// product is de-finalized and goes back to commercial evaluation, and the
// evaluator's notification links to THIS page. The page said nothing: the
// product just read "Not finalized", and picking the same vendor again gave no
// warning. The legacy Quote Compare (FinalizeVendorModal /
// ProductComparisonMatrix) already showed it; the rows are the RFQ payload's
// `vendor_rejections` (one per rejected PO x product, newest first), which this
// page already fetches with getRFQById.

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
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
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
  default: () => ({ canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false }),
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
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getQuoteComparisonView } from "@/services/pricing";
import { getRFQById } from "@/services/rfq";
import QuoteComparison, { awardCellAnchorId } from "./QuoteComparison";

const RFQ_ID = "363";
const ALPHA = 431;
const BETA = 433;

const SCREEN = { id: 9001, pvid: 71001, name: "LAPTOP SCREEN" };
const KEYBOARD = { id: 9002, pvid: 71002, name: "KEYBOARD" };

const cell = (base, vendorId, quoteId) => ({
  base,
  subtotal: base * 10,
  tax_amt: Math.round(base * 10 * 0.18),
  delivery_charges: 0,
  total: Math.round(base * 10 * 1.18),
  other_charges: [],
  global_charges: [],
  history: [],
  negotiation: null,
  finalize: {
    vendor_id: vendorId,
    quote_id: quoteId,
    quote_item_id: quoteId * 10,
    unit_price: base,
    total_value: base * 10,
    charges_meta: {},
  },
});

const product = (p, over = {}) => ({
  id: p.id,
  product_variant_id: p.pvid,
  variant: 0,
  name: p.name,
  qty: 10,
  unit: "nos",
  category: 1,
  state: "open",
  awaiting_me: false,
  finalized_vendor: null,
  finalized_by: null,
  negotiation: null,
  reject_info: null,
  quoted_count: 2,
  tech: { configured: false, scores: {} },
  quotes: { [ALPHA]: cell(1000, ALPHA, 11), [BETA]: cell(1200, BETA, 12) },
  quotes_absence: {},
  approval: { current_approvers: [] },
  ...over,
});

const view = (over = {}) => ({
  rfq: {
    id: 363, rfq_no: "535917", number: "535917", title: "IT hardware", status: "OPEN",
    project_id: null, tech_clauses: true,
  },
  quotes_locked: false,
  bid_end_date: "2026-07-25T10:00:00.000Z",
  vendors: [
    { id: ALPHA, name: "Alpha Vendor", short: "AV" },
    { id: BETA, name: "Beta Supplies", short: "BS" },
  ],
  categories: [{ id: 1, name: "IT" }],
  products: [product(SCREEN), product(KEYBOARD)],
  approval_chain: [],
  has_delivery_charges: false,
  ...over,
});

// One row of rfqModel.getLivePoRejectionsForRfqs, as the RFQ payload sends it.
const rejection = (over = {}) => ({
  rfq_id: 363,
  product_variant_id: SCREEN.pvid,
  variant: 0,
  vendor_id: ALPHA,
  vendor_name: "alpha.user",
  vendor_organization: "Alpha Vendor",
  po_id: 9100,
  po_number: "681508",
  rejection_type: "approver",
  reason_category: "RENEGOTIATE",
  rejection_reason: "Price is 20% above the ARC rate.",
  rejected_at: "2026-10-21T10:00:00.000Z",
  rejected_by_name: "Ravi Shah",
  rejected_by_email: "ravi@example.com",
  ...over,
});

const mount = async ({ rows = [], v = view() } = {}) => {
  getQuoteComparisonView.mockResolvedValue(v);
  getRFQById.mockResolvedValue({ data: { hotel_ids: [1], department_id: 2, vendor_rejections: rows } });
  const utils = render(<QuoteComparison rfqId={RFQ_ID} embedded />);
  await screen.findByText("LAPTOP SCREEN");
  await waitFor(() => expect(getRFQById).toHaveBeenCalled());
  return utils;
};

const banners = () => screen.queryAllByRole("note", { name: /^PO #\S+ rejected$/ });

const cellFor = (productId, vendorId) => document.getElementById(awardCellAnchorId(productId, vendorId));
const select = (productId, vendorId) =>
  fireEvent.click(within(cellFor(productId, vendorId)).getByRole("button", { name: /select for this item/i }));
const openFinalise = async () => {
  fireEvent.click(screen.getByRole("button", { name: /^Finalise \d+ ·/ }));
  return screen.findByRole("dialog", { name: "Finalise vendor selection" });
};

beforeEach(() => {
  jest.clearAllMocks();
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

describe("banner above the matrix", () => {
  it("explains an approver's RENEGOTIATE rejection, with the reason, the comment and a negotiation link", async () => {
    await mount({ rows: [rejection()] });
    const banner = await screen.findByRole("note", { name: "PO #681508 rejected" });
    expect(banner).toHaveTextContent("PO #681508 for Alpha Vendor was rejected by an approver.");
    expect(banner).toHaveTextContent(/Rejected by Ravi Shah on 21 Oct 2026/);
    expect(banner).toHaveTextContent("Reason: Re-negotiate or change the vendor");
    expect(banner).toHaveTextContent("“Price is 20% above the ARC rate.”");
    expect(banner).toHaveTextContent("Back for award: LAPTOP SCREEN");
    expect(within(banner).getByRole("link", { name: "Create negotiation round" })).toHaveAttribute(
      "href",
      "/dashboard/buyer/negotiation/363/create"
    );
  });

  it("gives no negotiation link for any other reason", async () => {
    await mount({ rows: [rejection({ reason_category: "PRICE_TAX_QUERY" })] });
    const banner = await screen.findByRole("note", { name: "PO #681508 rejected" });
    expect(banner).toHaveTextContent("Reason: Question on price, GST or calculation");
    expect(within(banner).queryByRole("link", { name: /negotiation round/i })).not.toBeInTheDocument();
  });

  it("shows no banner when nothing was rejected", async () => {
    await mount({ rows: [] });
    expect(banners()).toHaveLength(0);
    expect(screen.queryByText(/was rejected/)).not.toBeInTheDocument();
  });

  it("shows one banner per PO, naming every product it sent back", async () => {
    await mount({
      rows: [rejection(), rejection({ product_variant_id: KEYBOARD.pvid })],
    });
    await screen.findByRole("note", { name: "PO #681508 rejected" });
    expect(banners()).toHaveLength(1);
    expect(banners()[0]).toHaveTextContent("Back for award: LAPTOP SCREEN, KEYBOARD");
  });

  it("shows a vendor's own rejection too, as the legacy Quote Compare does, with no reason label", async () => {
    await mount({
      rows: [
        rejection({
          rejection_type: "vendor",
          reason_category: null,
          rejected_by_name: "alpha.user",
          rejection_reason: "Cannot deliver by the date asked.",
        }),
      ],
    });
    const banner = await screen.findByRole("note", { name: "PO #681508 rejected" });
    expect(banner).toHaveTextContent("Alpha Vendor rejected PO #681508.");
    expect(banner).toHaveTextContent("“Cannot deliver by the date asked.”");
    expect(banner).not.toHaveTextContent(/Reason:/);
    expect(within(banner).queryByRole("link")).not.toBeInTheDocument();
  });

  it("drops a rejection once its product has been awarded again on this page", async () => {
    await mount({
      rows: [rejection()],
      v: view({ products: [product(SCREEN, { state: "pending", finalized_vendor: BETA }), product(KEYBOARD)] }),
    });
    expect(banners()).toHaveLength(0);
  });

  it("reads the rows from the RFQ the host page already holds when embedded", async () => {
    getQuoteComparisonView.mockResolvedValue(view());
    render(
      <QuoteComparison
        rfqId={RFQ_ID}
        embedded
        rfq={{ id: 363, hotel_ids: [1], department_id: 2, vendor_rejections: [rejection()] }}
      />
    );
    await screen.findByText("LAPTOP SCREEN");
    expect(await screen.findByRole("note", { name: "PO #681508 rejected" })).toBeInTheDocument();
    expect(getRFQById).not.toHaveBeenCalled();
  });
});

describe("warning in the finalise sheet", () => {
  it("warns when the pick repeats the rejected vendor on the same product", async () => {
    await mount({ rows: [rejection()] });
    await screen.findByRole("note", { name: "PO #681508 rejected" });
    select(SCREEN.id, ALPHA);
    const dialog = await openFinalise();
    expect(
      within(dialog).getByText("Alpha Vendor's last PO #681508 was rejected: Re-negotiate or change the vendor.")
    ).toBeInTheDocument();
  });

  it("says nothing for a different vendor on that product", async () => {
    await mount({ rows: [rejection()] });
    await screen.findByRole("note", { name: "PO #681508 rejected" });
    select(SCREEN.id, BETA);
    const dialog = await openFinalise();
    expect(within(dialog).queryByText(/last PO/)).not.toBeInTheDocument();
  });

  it("says nothing for the same vendor on a product the rejected PO did not carry", async () => {
    await mount({ rows: [rejection()] });
    await screen.findByRole("note", { name: "PO #681508 rejected" });
    select(KEYBOARD.id, ALPHA);
    const dialog = await openFinalise();
    expect(within(dialog).queryByText(/last PO/)).not.toBeInTheDocument();
  });

  it("names the vendor's own rejection plainly", async () => {
    await mount({ rows: [rejection({ rejection_type: "vendor", reason_category: null })] });
    await screen.findByRole("note", { name: "PO #681508 rejected" });
    select(SCREEN.id, ALPHA);
    const dialog = await openFinalise();
    expect(within(dialog).getByText("Alpha Vendor rejected their last PO #681508.")).toBeInTheDocument();
  });
});
