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

import userEvent from "@testing-library/user-event";
import { getRFQById, fetchVendorAgreement, addVendorAgreement, updateQuotation } from "@/services/rfq";
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
const clauseRows = (...responses) =>
  responses.map((vendorResponse, i) => ({
    clause_id: 1114 + i,
    clause_text: `${CLAUSE_TEXT} ${i + 1}`,
    clause_files: [],
    vendor_response: vendorResponse,
    vendor_response_files: [],
  }));

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
const paneShowsClause = () => screen.queryAllByText(`${CLAUSE_TEXT} 1`).length > 0;


// CONFIRMED DEFECT, RFQ 536911 (Oct 2026), vendor 422. The vendor had answered
// one technical clause "I Dont Agree" on their original quote. Asked to re-quote
// in a negotiation round, they changed the price and reached Review — where
// "Confirm & Update" was dead and said nothing. The explanation for a disagree
// is not stored on the response row, so every load rehydrates it empty, and
// evalGateOk demanded one for a disagreement the vendor had not touched.
// Same defect as RFQ 536491 (Sep 2026).

const reviewIsOpen = () => screen.queryAllByText("Line items").length > 0;
const confirmButton = () => screen.getByRole("button", { name: /Confirm & Update/i });
const oneProductRfq = () =>
  mkRfq({ products: [rfqProduct(1, "PLANTER BOX", true)], quoteLines: [quoteLine(1)] });

const goToStep = async (label) => {
  const tab = (await screen.findAllByText(label))[0];
  await userEvent.click(tab.closest("button") || tab);
};

describe("a stored disagreement the vendor has not touched", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    addVendorAgreement.mockResolvedValue({});
    updateQuotation.mockResolvedValue({ status: 1 });
  });

  it("does not block re-submitting the quote", async () => {
    fetchVendorAgreement.mockResolvedValue({ data: clauseRows("I Agree", "I Dont Agree") });
    await renderWizard(oneProductRfq());

    await waitFor(() => expect(reviewIsOpen()).toBe(true));
    expect(confirmButton()).toBeEnabled();
  });

  it("submits the quote without re-posting the stored answers", async () => {
    fetchVendorAgreement.mockResolvedValue({ data: clauseRows("I Agree", "I Dont Agree") });
    await renderWizard(oneProductRfq());
    await waitFor(() => expect(reviewIsOpen()).toBe(true));

    await userEvent.click(confirmButton());

    await waitFor(() => expect(updateQuotation).toHaveBeenCalledTimes(1));
    expect(addVendorAgreement).not.toHaveBeenCalled();
  });

  it("still demands an explanation once the vendor flips an answer to disagree", async () => {
    fetchVendorAgreement.mockResolvedValue({ data: clauseRows("I Agree", "I Dont Agree") });
    await renderWizard(oneProductRfq());
    await waitFor(() => expect(reviewIsOpen()).toBe(true));

    await goToStep("Technical evaluation");
    // Clause 1 was "I agree" — flip it to "I don't agree".
    const disagreeButtons = await screen.findAllByRole("button", { name: /I don't agree/i });
    await userEvent.click(disagreeButtons[0]);

    // Everything is answered, yet the step is shut — and says why, rather than
    // "Answer 0 remaining clause(s)".
    expect(screen.getByRole("button", { name: /Continue to pricing/i })).toBeDisabled();
    expect(screen.getAllByText(/add an explanation for the 1 clause you don't agree with/i).length).toBeGreaterThan(0);
    expect(updateQuotation).not.toHaveBeenCalled();
  });

  it("is unblocked again once that explanation is written", async () => {
    fetchVendorAgreement.mockResolvedValue({ data: clauseRows("I Agree", "I Dont Agree") });
    await renderWizard(oneProductRfq());
    await waitFor(() => expect(reviewIsOpen()).toBe(true));

    await goToStep("Technical evaluation");
    const disagreeButtons = await screen.findAllByRole("button", { name: /I don't agree/i });
    await userEvent.click(disagreeButtons[0]);
    const boxes = await screen.findAllByPlaceholderText(/Briefly describe your deviation/i);
    await userEvent.type(boxes[0], "Different brand available");

    expect(screen.getByRole("button", { name: /Continue to pricing/i })).toBeEnabled();
    await goToStep("Review & submit");
    expect(confirmButton()).toBeEnabled();
  });
});

describe("a brand-new disagreement", () => {
  it("is blocked until explained, for a vendor with no stored answer", async () => {
    jest.clearAllMocks();
    fetchVendorAgreement.mockResolvedValue({ data: clauseRows("", "") });
    await renderWizard(oneProductRfq());

    await waitFor(() => expect(paneShowsClause()).toBe(true));
    const disagreeButtons = await screen.findAllByRole("button", { name: /I don't agree/i });
    await userEvent.click(disagreeButtons[0]);
    const agreeButtons = await screen.findAllByRole("button", { name: /I agree/i });
    await userEvent.click(agreeButtons[1]);

    // Both answered, but the disagree has no explanation: Continue stays shut.
    expect(screen.getByRole("button", { name: /Continue to pricing/i })).toBeDisabled();
  });
});
