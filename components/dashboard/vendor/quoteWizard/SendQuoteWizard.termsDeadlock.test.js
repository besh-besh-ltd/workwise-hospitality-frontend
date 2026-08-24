// SendQuoteWizard — a negotiation revision must not be gated on commercial
// terms the buyer never opened.
//
// Reported: the buyer opened a round targeting ONLY base_price. The vendor
// entered the targeted rates, moved on to Commercial terms — and "Continue to
// review" never enabled, so Review & submit was unreachable and the round
// could not be answered.
//
// Root cause: canContinueStep4 demands a valid GSTIN AND payment terms that
// sum to exactly 100 with a type on every row. After bid expiry those inputs
// are DISABLED unless the round raised an RFQ-level ask on them
// (Step4CommercialTerms.isRfqFieldLocked) — and a base_price round raises
// none. So the gate asks for a correction the vendor is physically unable to
// make. Identical in shape to the delivery_period deadlock on RFQ 560.
//
// Three stored-data shapes trip it, none of them visible on screen:
//   * a payment row with NULL/empty `type` — the select DISPLAYS "advance"
//     (`value={t.type || "advance"}`) while state keeps '', so the form looks
//     complete and the gate still fails;
//   * percentages that do not total exactly 100 — including float drift from
//     decimal splits like 33.33 / 33.33 / 33.34;
//   * a malformed GSTIN, which locks unconditionally once the bid expires.
//
// The rule these tests pin: mirror deliveryRequired — require a commercial
// term only where the vendor can actually edit it.

jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRFQById: jest.fn(),
  sendQuotation: jest.fn(),
  updateQuotation: jest.fn(() => Promise.resolve({ status: 1 })),
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
    query: { id: "734", type: "update-quote" },
    pathname: "/dashboard/vendor/quote",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  }),
}));

jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 7001, name: "Test Vendor" } }),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import { getAllActiveNegotiationRounds } from "@/services/negotiation";
import SendQuoteWizard from "./SendQuoteWizard";

const VENDOR_ID = 7001;
const RFQ_PRODUCT_ID = 3169;

const rfqProduct = () => ({
  id: RFQ_PRODUCT_ID,
  product_id: 13679,
  variant: "standard",
  product_details: [{ name: "CLADDING PANEL" }],
  product_specs: [
    { title: "Quantity", value: "10" },
    { title: "Unit", value: "nos" },
  ],
  tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
});

const quotedLine = () => ({
  product_id: 13679,
  variant: "standard",
  pricing_method: "TRADITIONAL",
  unit_price: 19,
  tax: 18,
  tax_mode: "percentage",
  delivery_period: 7,
});

const mkRfq = ({ paymentTerms = [], gstin, bidEndDate = "2020-01-01 12:00:00" } = {}) => ({
  id: 734,
  rfq_no: 536276,
  title: "Cladding work",
  is_tender: 0,
  company_name: "Test Hospitality Co",
  hotel_name: "Test Hotel",
  department_name: "Engineering",
  // Closed by default — the negotiation phase.
  bid_end_date: bidEndDate,
  comment: "",
  terms: [],
  products: [rfqProduct()],
  quote_details: gstin ? { gstin } : {},
  quotations: [
    {
      id: 699,
      pricing_method: "TRADITIONAL",
      payment_terms: paymentTerms,
      products: [quotedLine()],
    },
  ],
});

/** The reported round: a target on base_price and nothing else. */
const basePriceOnlyRound = () => ({
  id: 951,
  round_number: 1,
  status: "ACTIVE",
  end_date: "2099-01-01 12:00:00",
  rfq_product_id: null,
  products: [
    {
      rfq_product_id: RFQ_PRODUCT_ID,
      vendor_targets: [
        { vendor_id: VENDOR_ID, fields: [{ name: "base_price", target: "15" }] },
      ],
    },
  ],
});

const renderAtTerms = async (rfqOverrides, rounds = [basePriceOnlyRound()]) => {
  getRFQById.mockResolvedValue({ data: mkRfq(rfqOverrides) });
  getAllActiveNegotiationRounds.mockResolvedValue({ data: rounds });
  render(<SendQuoteWizard />);
  await screen.findAllByText("Review & submit");
  // A saved quote lands on the last step; walk back to Commercial terms, which
  // is where the vendor gets stuck.
  const back = await screen.findByRole("button", { name: /^Back$/i });
  await userEvent.click(back);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Continue to review/i })).toBeInTheDocument()
  );
};

const continueToReview = () => screen.getByRole("button", { name: /Continue to review/i });

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("a base_price-only round must not be gated on locked commercial terms", () => {
  test("a payment row stored with no type does not block the round", async () => {
    // Displays as "advance" on screen; state holds ''. The vendor sees a
    // complete, correct form and a dead button.
    await renderAtTerms({
      paymentTerms: [
        { id: 1, type: "", value: 50, days: "", comment: "" },
        { id: 2, type: "credit", value: 50, days: 30, comment: "" },
      ],
    });

    await waitFor(() => expect(continueToReview()).toBeEnabled());
  });

  test("stored percentages that do not total 100 do not block the round", async () => {
    // The current UI enforces 100; quotes written by the previous one did not.
    await renderAtTerms({
      paymentTerms: [
        { id: 1, type: "advance", value: 50, days: "", comment: "" },
        { id: 2, type: "credit", value: 40, days: 30, comment: "" },
      ],
    });

    await waitFor(() => expect(continueToReview()).toBeEnabled());
  });

  test("a malformed stored GSTIN does not block the round", async () => {
    // GSTIN locks unconditionally after bid expiry — it is never negotiable.
    await renderAtTerms({
      gstin: "NOTAGSTIN",
      paymentTerms: [
        { id: 1, type: "advance", value: 50, days: "", comment: "" },
        { id: 2, type: "credit", value: 50, days: 30, comment: "" },
      ],
    });

    await waitFor(() => expect(continueToReview()).toBeEnabled());
  });

  test("nothing about a locked field is blamed in the action bar", async () => {
    await renderAtTerms({
      paymentTerms: [
        { id: 1, type: "advance", value: 50, days: "", comment: "" },
        { id: 2, type: "credit", value: 30, days: 30, comment: "" },
      ],
    });

    // The 80% is real but locked, so it no longer gates the step — and the
    // vendor must not be told to fix something they cannot touch.
    expect(screen.queryByText(/must total 100%/i)).not.toBeInTheDocument();
    await waitFor(() => expect(continueToReview()).toBeEnabled());
  });

  test("the payment inputs really are locked — the vendor cannot self-serve", async () => {
    await renderAtTerms({
      paymentTerms: [{ id: 1, type: "", value: 50, days: "", comment: "" }],
    });

    // This is why the gate is unsatisfiable rather than merely strict.
    const percentInputs = screen
      .getAllByRole("spinbutton")
      .filter((el) => el.getAttribute("placeholder") === "0");
    expect(percentInputs.length).toBeGreaterThan(0);
    percentInputs.forEach((el) => expect(el).toBeDisabled());
  });
});

describe("while the bid window is open the rule still bites, and says why", () => {
  // Same broken data, but now the vendor CAN fix it — so the gate holds and
  // the action bar has to name the reason instead of just going dead.
  const openBid = (paymentTerms) =>
    renderAtTerms({ paymentTerms, bidEndDate: "2099-01-01 12:00:00" }, []);

  test("a total under 100 blocks, and the shortfall is spelled out", async () => {
    await openBid([
      { id: 1, type: "advance", value: 50, days: "", comment: "" },
      { id: 2, type: "credit", value: 30, days: 30, comment: "" },
    ]);

    await waitFor(() => expect(continueToReview()).toBeDisabled());
    expect(
      screen.getByText(/Payment terms currently total 80% — they must total 100% to continue\./i)
    ).toBeInTheDocument();
  });

  test("a row with no type blocks, and says which rule was missed", async () => {
    await openBid([
      { id: 1, type: "", value: 60, days: "", comment: "" },
      { id: 2, type: "credit", value: 40, days: 30, comment: "" },
    ]);

    await waitFor(() => expect(continueToReview()).toBeDisabled());
    expect(
      screen.getByText(/Every payment term needs a type and a percentage above zero\./i)
    ).toBeInTheDocument();
  });

  test("a malformed GSTIN blocks, and names the format", async () => {
    getRFQById.mockResolvedValue({
      data: mkRfq({
        gstin: "NOTAGSTIN",
        bidEndDate: "2099-01-01 12:00:00",
        paymentTerms: [
          { id: 1, type: "advance", value: 50, days: "", comment: "" },
          { id: 2, type: "credit", value: 50, days: 30, comment: "" },
        ],
      }),
    });
    getAllActiveNegotiationRounds.mockResolvedValue({ data: [] });
    render(<SendQuoteWizard />);
    await screen.findAllByText("Review & submit");
    await userEvent.click(await screen.findByRole("button", { name: /^Back$/i }));

    await waitFor(() => expect(continueToReview()).toBeDisabled());
    // Two messages are correct here: the inline hint beside the field, and the
    // action-bar reason beside the dead button. Match the latter specifically.
    expect(
      screen.getByText(/The GSTIN format looks off — it should be 15 characters/i)
    ).toBeInTheDocument();
  });

  test("nothing is blamed once the terms are valid", async () => {
    await openBid([
      { id: 1, type: "advance", value: 50, days: "", comment: "" },
      { id: 2, type: "credit", value: 50, days: 30, comment: "" },
    ]);

    await waitFor(() => expect(continueToReview()).toBeEnabled());
    expect(screen.queryByText(/must total 100%/i)).not.toBeInTheDocument();
  });
});
