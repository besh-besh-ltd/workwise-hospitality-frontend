// SendQuoteWizard — Review & submit must not present a line the buyer closed
// without award as a priced line or as a regret.
//
// Found while testing on real data (RFQ 536621): the Pricing step marked the
// closed lines "Closed by buyer — not awarded", but Review listed them like any
// other line. An unpriced closed line read "Not priced — will be marked as
// regret for this line", which is false: closed lines are not sent at all (the
// submit filter drops them and the server refuses them).

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRFQById: jest.fn(),
  sendQuotation: jest.fn(),
  updateQuotation: jest.fn(),
  fetchVendorAgreement: jest.fn(() => Promise.resolve({ data: [] })),
  addVendorAgreement: jest.fn(),
  fetchQuoteHistory: jest.fn(() => Promise.resolve({ data: [] })),
  fetchDeviationPreviews: jest.fn(() => Promise.resolve({ data: [] })),
  handleUploadFile: jest.fn(),
  createTenderPaymentOrder: jest.fn(),
  verifyTenderPayment: jest.fn(),
  getChargeNames: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getAllActiveNegotiationRounds: jest.fn(() => Promise.resolve({ data: [] })),
  getAllVendorNegotiationStatus: jest.fn(() => Promise.resolve({ status: 1, data: [] })),
}));

jest.mock("@/services/clarification", () => ({
  __esModule: true,
  getClarifications: jest.fn(() => Promise.resolve({ data: [] })),
}));

jest.mock("@/hooks/usePreviewTotals", () => ({
  __esModule: true,
  default: () => ({ totals: null, isLoading: false, error: null }),
}));

jest.mock("@/utils/quoteExcel", () => ({
  __esModule: true,
  downloadQuoteExcel: jest.fn(),
}));

jest.mock("@/components/modal/RegretQuoteReasonModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/shared/QuoteMethodModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/dashboard/buyer/clarification", () => ({
  __esModule: true,
  RaiseClarificationModal: () => null,
  ClarificationDetailModal: () => null,
}));

jest.mock("./ClauseChatDrawer", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: { id: "4242" },
    pathname: "/dashboard/vendor/quote",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  }),
}));

jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 90210, name: "Test Vendor" } }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import SendQuoteWizard from "./SendQuoteWizard";

// An RFQ line as the buyer published it.
const rfqProduct = (id, name) => ({
  id,
  product_id: 1000 + id,
  variant: "standard",
  product_details: [{ name }],
  product_specs: [
    { title: "Quantity", value: "40" },
    { title: "Unit", value: "nos" },
  ],
  tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
});

// The vendor's saved quote for that line. This is the shape that reproduces
// the defect: pricing_method MRP, entered_mrp set, unit_price ABSENT — exactly
// what the client holds while an MRP quote is being composed.
const mrpQuoteLine = (id, over = {}) => ({
  product_id: 1000 + id,
  variant: "standard",
  pricing_method: "MRP",
  entered_mrp: 1300,
  mrp_discount: 15,
  mrp_discount_mode: "percentage",
  tax: 18,
  tax_mode: "percentage",
  delivery_period: 7,
  ...over,
});

const traditionalQuoteLine = (id, over = {}) => ({
  product_id: 1000 + id,
  variant: "standard",
  pricing_method: "TRADITIONAL",
  unit_price: 1300,
  tax: 18,
  tax_mode: "percentage",
  delivery_period: 7,
  ...over,
});

const mkRfq = ({ products, quoteLines }) => ({
  id: 4242,
  rfq_no: 536999,
  title: "Peripherals",
  is_tender: 0,
  company_name: "Orchid Passaros Goa",
  hotel_name: "Orchid Passaros Goa",
  department_name: "Engineering",
  // Future deadline: quote stays editable, so the review step is the live
  // pre-submit confirmation rather than a read-only snapshot.
  bid_end_date: "2099-01-01 12:00:00",
  comment: "",
  terms: [],
  products,
  // A saved quote makes the wizard open straight on Review & submit — the
  // screen the defect appears on.
  quotations: [{ pricing_method: "MRP", payment_terms: [], products: quoteLines }],
});

// Renders and lands on the review step.
const renderReview = async (rfq) => {
  getRFQById.mockResolvedValue({ data: rfq });
  render(<SendQuoteWizard />);
  // "Review & submit" appears twice — stepper rail + pane heading.
  return screen.findAllByText("Review & submit");
};

const REGRET_COPY = /will be marked as regret/i;
const CLOSED = { finalization_status: "Closed without award", closed_at: "2026-11-04T06:32:10.168Z" };

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Step5Review — lines closed by the buyer", () => {
  test("a closed line is marked closed and counted apart from priced and skipped lines", async () => {
    await renderReview(
      mkRfq({
        products: [rfqProduct(1, "KEYBOARD"), { ...rfqProduct(2, "MATTRESS"), ...CLOSED }, rfqProduct(3, "MOUSE")],
        // The vendor priced KEYBOARD and (before the close) MATTRESS; MOUSE is unpriced.
        quoteLines: [traditionalQuoteLine(1), traditionalQuoteLine(2)],
      })
    );

    expect(screen.getAllByTestId("review-line-closed")).toHaveLength(1);
    expect(screen.getByText(/isn't sent with your quote/i)).toBeInTheDocument();
    expect(screen.getByText("1 priced · 1 skipped · 1 closed by buyer")).toBeInTheDocument();
    // Only MOUSE, the open unpriced line, is described as a regret.
    expect(screen.getAllByText(REGRET_COPY)).toHaveLength(1);
  });

  test("an unpriced closed line is not reported as a regret", async () => {
    await renderReview(
      mkRfq({
        products: [rfqProduct(1, "KEYBOARD"), { ...rfqProduct(2, "MATTRESS"), ...CLOSED }],
        quoteLines: [traditionalQuoteLine(1)],
      })
    );

    expect(screen.queryByText(REGRET_COPY)).not.toBeInTheDocument();
    expect(screen.getByText("1 priced · 1 closed by buyer")).toBeInTheDocument();
    expect(screen.getByTestId("review-line-closed")).toHaveTextContent("Closed by buyer");
  });

  test("with nothing closed the Review step is unchanged", async () => {
    await renderReview(
      mkRfq({ products: [rfqProduct(1, "KEYBOARD"), rfqProduct(2, "MOUSE")], quoteLines: [traditionalQuoteLine(1)] })
    );

    expect(screen.queryByTestId("review-line-closed")).not.toBeInTheDocument();
    expect(screen.getByText("1 priced · 1 skipped")).toBeInTheDocument();
    expect(screen.getAllByText(REGRET_COPY)).toHaveLength(1);
  });
});
