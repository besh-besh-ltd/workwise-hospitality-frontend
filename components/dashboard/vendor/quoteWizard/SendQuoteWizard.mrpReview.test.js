// SendQuoteWizard — Review & submit must recognise MRP lines as priced.
//
// CONFIRMED DEFECT, reproduced live. A vendor picked "MRP (tax-inclusive)" and
// priced all three lines. The final confirmation screen said:
//
//     Line items                    0 priced · 3 skipped
//     01 KEYBOARD   Not priced — will be marked as regret for this line  SKIPPED
//
// …directly beside a correct GRAND TOTAL of ₹1,99,249.73.
//
// Root cause: two definitions of "priced" that drifted. The submit-payload
// validator branched on pricing_method; the review screen and the pricing-step
// status pill tested `parseFloat(p.unit_price) > 0`. In MRP mode the vendor
// enters entered_mrp + mrp_discount and `unit_price` is the DERIVED base — it
// is never populated in client state, so every MRP line read as 0.
//
// Nothing was lost on submit (the payload builder was correct), which is what
// made it dangerous: the copy appears on the last screen before the vendor
// commits and tells them their good quote will be recorded as a regret.
//
// The fix collapses both to one `isLinePriced` helper. These tests pin the
// behaviour on MRP lines specifically — a Traditional-only test passed
// throughout the entire lifetime of this bug.

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

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Step5Review — MRP lines count as priced", () => {
  test("three priced MRP lines are not reported as skipped regrets", async () => {
    await renderReview(
      mkRfq({
        products: [
          rfqProduct(1, "KEYBOARD"),
          rfqProduct(2, "LAPTOP SCREEN"),
          rfqProduct(3, "MOUSE"),
        ],
        quoteLines: [
          mrpQuoteLine(1),
          mrpQuoteLine(2, { entered_mrp: 6000, mrp_discount: 5 }),
          mrpQuoteLine(3, { entered_mrp: 500, mrp_discount: 20 }),
        ],
      })
    );

    // The exact string the vendor was shown: "0 priced · 3 skipped".
    expect(screen.getByText("3 priced")).toBeInTheDocument();
    expect(screen.queryByText(/skipped/i)).not.toBeInTheDocument();
    expect(screen.queryAllByText(REGRET_COPY)).toHaveLength(0);
    expect(screen.queryAllByText("Skipped")).toHaveLength(0);
  });

  test("a genuinely unpriced MRP line is still reported as skipped", async () => {
    await renderReview(
      mkRfq({
        products: [rfqProduct(1, "KEYBOARD"), rfqProduct(2, "MOUSE")],
        quoteLines: [
          mrpQuoteLine(1),
          // Vendor chose MRP but never entered one — a real regret.
          mrpQuoteLine(2, { entered_mrp: 0, mrp_discount: 0, delivery_period: 0 }),
        ],
      })
    );

    expect(screen.getByText("1 priced · 1 skipped")).toBeInTheDocument();
    expect(screen.getAllByText(REGRET_COPY)).toHaveLength(1);
    expect(screen.getAllByText("Skipped")).toHaveLength(1);
  });

  test("an MRP line shows its derived base rate and where it came from", async () => {
    await renderReview(
      mkRfq({
        products: [rfqProduct(1, "KEYBOARD")],
        quoteLines: [mrpQuoteLine(1)],
      })
    );

    // MRP 1300 less 15% = 1105 inclusive of 18% GST ⇒ base 1105 / 1.18 = 936.44.
    // The old row rendered "40 nos × ₹ 0.00" off the empty unit_price.
    const math = screen.getByText(/936\.44/);
    expect(math).toHaveTextContent("40 nos × ₹ 936.44");
    expect(math).toHaveTextContent("MRP ₹1,300.00 less 15%");
    expect(math).toHaveTextContent("18% tax");
    expect(math).toHaveTextContent("7d delivery");
  });

  test("an absolute MRP discount is described in rupees, not percent", async () => {
    await renderReview(
      mkRfq({
        products: [rfqProduct(1, "KEYBOARD")],
        quoteLines: [
          mrpQuoteLine(1, { mrp_discount: 200, mrp_discount_mode: "absolute" }),
        ],
      })
    );

    // 1300 − 200 = 1100 incl. 18% GST ⇒ base 932.20.
    const math = screen.getByText(/932\.20/);
    expect(math).toHaveTextContent("MRP ₹1,300.00 less ₹200.00");
  });

  test("Traditional lines keep their existing priced / skipped behaviour", async () => {
    await renderReview(
      mkRfq({
        products: [rfqProduct(1, "KEYBOARD"), rfqProduct(2, "MOUSE")],
        quoteLines: [
          traditionalQuoteLine(1),
          traditionalQuoteLine(2, { unit_price: 0, delivery_period: 0 }),
        ],
      })
    );

    expect(screen.getByText("1 priced · 1 skipped")).toBeInTheDocument();
    expect(screen.getAllByText(REGRET_COPY)).toHaveLength(1);

    // Traditional rows keep the plain qty × rate string, with no MRP provenance.
    const math = screen.getByText(/1,300\.00/);
    expect(math).toHaveTextContent("40 nos × ₹ 1,300.00");
    expect(math).not.toHaveTextContent("MRP");
  });
});
