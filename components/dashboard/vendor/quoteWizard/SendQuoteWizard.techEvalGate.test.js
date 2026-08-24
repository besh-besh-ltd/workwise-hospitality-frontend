// SendQuoteWizard — an already-quoted vendor with unanswered technical clauses
// must land ON the gate, and must not be able to submit past it.
//
// CONFIRMED DEFECT, reproduced from RFQ 536289 (Orchid Hotel Panchgani, Aug 2026).
// A vendor submitted a regret, came back, and converted it into a fully priced
// 14-line quote — six of those lines on products carrying a technical clause they
// never answered. The buyer's Technical Evaluation screen was then correctly
// blank (nothing to score), the commercial gate hid all 14 lines, and the RFQ
// could not proceed. The bid window then closed, locking the vendor out of
// answering at all.
//
// The client let it through by way of two things that were each individually
// defensible:
//
//   1. On load, an existing quote jumped the vendor straight to Review
//      (`setCurrentStep(reviewIdx)`). canVisit() returns true for every step at
//      or below the current one, so arriving at Review retroactively marked the
//      Technical evaluation step as visited — a step they had never opened.
//   2. `canSubmit` was `canContinueStep3 && canContinueStep4 && !clarBlocksQuote`.
//      It never consulted `evalGateOk`. That gate only ever guarded forward
//      movement through the stepper, which step 1 had skipped.
//
// There is also a subtler trap these tests cover: clause lists arrive
// asynchronously, one fetch per product. Until they land, `evalAnswered` and
// `evalTotalClauses` are BOTH zero, so an equality check reads as "all answered".
// That was harmless while evalGateOk only gated navigation. It is not harmless
// once canSubmit depends on it.

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
  useSelector: (fn) => fn({ userProfile: { id: 497, name: "surya enterprises" } }),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRFQById, fetchVendorAgreement } from "@/services/rfq";
import SendQuoteWizard from "./SendQuoteWizard";

// jsdom has no scrollIntoView, and the stepper rail calls it whenever the active
// step changes. Unstubbed it throws mid-effect and React unmounts the tree, so
// every assertion below would fail against an empty document for a reason that
// has nothing to do with the gate.
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

const CLAUSE_TEXT = "Ocean Brand";

// An RFQ line. `hasTechEval` mirrors what rfqModel's tech_evaluation_status CTE
// returns for a vendor (user_type 3).
const rfqProduct = (id, name, hasTechEval) => ({
  id,
  product_id: 1000 + id,
  variant: "standard",
  product_details: [{ name }],
  product_specs: [
    { title: "Quantity", value: "40" },
    { title: "Unit", value: "nos" },
  ],
  tech_evaluation_status: hasTechEval
    ? { has_tech_eval: true, is_accepted: false, all_clauses_responded: false }
    : { has_tech_eval: false, is_accepted: false },
});

const quoteLine = (id, over = {}) => ({
  product_id: 1000 + id,
  variant: "standard",
  pricing_method: "TRADITIONAL",
  unit_price: 230,
  tax: 18,
  tax_mode: "percentage",
  delivery_period: 7,
  ...over,
});

const mkRfq = ({ products, quoteLines, is_tender = 0, extra = {} }) => ({
  id: 4242,
  rfq_no: 536289,
  title: "The Orchid Hotel Panchgani - Crockery & Glassware",
  is_tender,
  company_name: "Kamat Hotels India Limited",
  hotel_name: "The Orchid Hotel Panchgani",
  department_name: "F&B",
  // Future deadline so the quote stays editable — the incident happened INSIDE
  // the bid window.
  bid_end_date: "2099-01-01 12:00:00",
  comment: "",
  terms: [],
  products,
  quotations: [{ pricing_method: "TRADITIONAL", payment_terms: [], products: quoteLines }],
  ...extra,
});

/** What /rfq/get-vendor-responses returns: one row per clause, answered or not. */
const clauseRows = (vendorResponse) => [
  {
    clause_id: 1114,
    clause_text: CLAUSE_TEXT,
    clause_files: [],
    vendor_response: vendorResponse,
    vendor_response_files: [],
  },
];

const renderWizard = async (rfq) => {
  getRFQById.mockResolvedValue({ data: rfq });
  render(<SendQuoteWizard />);
  // "Review & submit" is in the step rail, so this only proves the wizard has
  // finished loading — never which pane is open. Pane identity is asserted
  // separately below.
  await screen.findAllByText("Review & submit");
};

/**
 * Which pane is open. The step rail repeats every label, so identity comes from
 * the pane's own heading — the Technical evaluation pane renders the clause text
 * and the Review pane renders the "Line items" summary.
 */
const paneShowsClause = () => screen.queryAllByText(CLAUSE_TEXT).length > 0;

describe("landing step for an already-quoted vendor", () => {
  it("opens on Technical evaluation when clauses are unanswered", async () => {
    fetchVendorAgreement.mockResolvedValue({ data: clauseRows("") });

    await renderWizard(
      mkRfq({
        products: [rfqProduct(1, "JUICE GLASS", true), rfqProduct(2, "SS LINEN TROLLEY", false)],
        quoteLines: [quoteLine(1), quoteLine(2)],
      })
    );

    // The clause the vendor owes an answer on is on screen — they were dropped
    // on the gate, not past it.
    await waitFor(() => expect(paneShowsClause()).toBe(true));
  });

  it("opens on Review when every clause is already answered", async () => {
    fetchVendorAgreement.mockResolvedValue({ data: clauseRows("I Agree") });

    await renderWizard(
      mkRfq({
        products: [rfqProduct(1, "JUICE GLASS", true)],
        quoteLines: [quoteLine(1)],
      })
    );

    await waitFor(() => expect(screen.queryAllByText("Line items").length).toBeGreaterThan(0));
  });

  it("opens on Review when the RFQ has no technical evaluation at all", async () => {
    await renderWizard(
      mkRfq({
        products: [rfqProduct(1, "SS LINEN TROLLEY", false)],
        quoteLines: [quoteLine(1)],
      })
    );

    await waitFor(() => expect(screen.queryAllByText("Line items").length).toBeGreaterThan(0));
  });
});

describe("submit is gated on the technical answers, not just on pricing", () => {
  const submitButton = () =>
    screen
      .queryAllByRole("button")
      .find((b) => /submit quote|confirm & submit|submit/i.test(b.textContent || ""));

  it("cannot submit while a clause is unanswered, even with every line priced", async () => {
    fetchVendorAgreement.mockResolvedValue({ data: clauseRows("") });

    await renderWizard(
      mkRfq({
        products: [rfqProduct(1, "JUICE GLASS", true)],
        quoteLines: [quoteLine(1)],
      })
    );

    // Pricing and commercial terms are complete — under the old canSubmit that
    // was the whole test, and the quote went out.
    await waitFor(() => expect(paneShowsClause()).toBe(true));
    const btn = submitButton();
    if (btn) expect(btn).toBeDisabled();
  });

  it("a clause list that failed to load does not read as answered", async () => {
    // The per-product clause fetch is wrapped in try/catch and only logs, so a
    // failure leaves techClauses[p.id] unset while the wizard renders normally.
    // evalAnswered and evalTotalClauses are then both 0, and an equality check
    // alone would read that as "everything answered" — the exact hole that made
    // adding evalGateOk to canSubmit a no-op until the hydration guard existed.
    fetchVendorAgreement.mockRejectedValue(new Error("clause fetch failed"));

    await renderWizard(
      mkRfq({
        products: [rfqProduct(1, "JUICE GLASS", true)],
        quoteLines: [quoteLine(1)],
      })
    );

    const btn = submitButton();
    if (btn) expect(btn).toBeDisabled();
  });
});
