// SendQuoteWizard — an RFQ-level-only negotiation round must be answerable.
//
// CONFIRMED DEFECT, reproduced against a real reported case (RFQ 536276,
// negotiation round 944, round_number 3). The buyer opened a round targeting
// only RFQ-LEVEL fields — payment terms / global charges — and no product
// lines. The invited vendor opened the wizard, saw the banner invite them to
// the round, edited the negotiated terms, and could not submit. Clicking
// Confirm & Update raised:
//
//     No products are currently open for quoting.
//
// …on a round that was still ACTIVE and still inside its end_date.
//
// Root cause: a round with only an RFQ-level entry persists as
// `products: [{is_rfq_level: true, …}]` with `rfq_product_id` NULL
// (negotiationController.createRound). The wizard's `coveredIdsOf` collects
// only `rfq_product_id`, so `activeNegotiationProductIds` came back EMPTY,
// and the post-expiry line filter then dropped every product — leaving an
// empty payload the submit guard rejected. There was no path out: the round
// was un-answerable for its whole life.
//
// The backend has always accepted this. `updateQuoteItems` carries an explicit
// UNION branch keeping an RFQ-level round registered as active with no product
// entries, and its per-product check is skipped when `products` is empty.
// Sending the lines anyway is NOT the fix — that same check 400s them with
// "this product does not have an active negotiation round".
//
// The rule these tests pin: an active RFQ-level round makes the quote
// submittable on its quote-level fields alone, while the once-per-round lock
// on product lines keeps working untouched.

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
    query: { id: "536276", type: "update-quote" },
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
import { toast } from "react-toastify";

import { getRFQById, updateQuotation } from "@/services/rfq";
import {
  getAllActiveNegotiationRounds,
  getAllVendorNegotiationStatus,
} from "@/services/negotiation";
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

const mkRfq = () => ({
  id: 536276,
  rfq_no: 536276,
  title: "Cladding work",
  is_tender: 0,
  company_name: "Test Hospitality Co",
  hotel_name: "Test Hotel",
  department_name: "Engineering",
  // Bid window CLOSED — the only state in which a negotiation round applies.
  bid_end_date: "2020-01-01 12:00:00",
  comment: "",
  terms: [],
  products: [rfqProduct()],
  quotations: [
    { id: 699, pricing_method: "TRADITIONAL", payment_terms: [], products: [quotedLine()] },
  ],
});

/**
 * Round 944 as stored: RFQ-level entry only. `rfq_product_id` is NULL on the
 * row and no products[] entry carries one, so nothing identifies a line.
 */
const rfqLevelOnlyRound = () => ({
  id: 944,
  round_number: 3,
  status: "ACTIVE",
  end_date: "2099-01-01 12:00:00",
  rfq_product_id: null,
  products: [
    {
      is_rfq_level: true,
      vendor_targets: [
        {
          vendor_id: VENDOR_ID,
          fields: [{ name: "payment_terms", demand: "60 days credit" }],
        },
      ],
    },
  ],
});

/** A conventional round on the one product line. */
const productRound = () => ({
  id: 945,
  round_number: 4,
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

const renderWizard = async (rounds, vendorStatus = []) => {
  getRFQById.mockResolvedValue({ data: mkRfq() });
  getAllActiveNegotiationRounds.mockResolvedValue({ data: rounds });
  getAllVendorNegotiationStatus.mockResolvedValue({ status: 1, data: vendorStatus });
  render(<SendQuoteWizard />);
  // A live round now lands the vendor on the step holding the ask (Pricing or
  // Commercial terms), not on Review — the step they landed on used to mention
  // neither the round nor the target (RFQ 536237). Walk to Review explicitly.
  const reviewTab = (await screen.findAllByText("Review & submit"))[0];
  await userEvent.click(reviewTab.closest("button") || reviewTab);
};

const submitButton = () => screen.getByRole("button", { name: /Confirm & Update/i });

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RFQ-level-only negotiation round", () => {
  test("the vendor can submit their response", async () => {
    await renderWizard([rfqLevelOnlyRound()]);

    await waitFor(() => expect(submitButton()).toBeEnabled());
    await userEvent.click(submitButton());

    // The defect: this never fired, and the vendor got a toast telling them
    // nothing was open for quoting on a round that was open.
    await waitFor(() => expect(updateQuotation).toHaveBeenCalled());
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringContaining("No products are currently open for quoting")
    );
  });

  test("no frozen product lines ride along in the payload", async () => {
    await renderWizard([rfqLevelOnlyRound()]);

    await waitFor(() => expect(submitButton()).toBeEnabled());
    await userEvent.click(submitButton());

    await waitFor(() => expect(updateQuotation).toHaveBeenCalled());
    // updateQuoteItems rejects any line without an active round of its own, so
    // the lines must stay out. The RFQ-level fields are the whole payload.
    const [, payload] = updateQuotation.mock.calls[0];
    expect(payload.products).toEqual([]);
  });
});

describe("the once-per-round lock is unaffected", () => {
  test("a product line already answered this round stays blocked", async () => {
    await renderWizard(
      [productRound()],
      [{ rfq_product_id: RFQ_PRODUCT_ID, hasSubmittedQuote: true, round_number: 4 }]
    );

    await waitFor(() => expect(submitButton()).toBeEnabled());
    await userEvent.click(submitButton());

    // Nothing is open: the line was answered and there is no RFQ-level entry.
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(updateQuotation).not.toHaveBeenCalled();
    // …and the vendor is told WHY, rather than that no product exists.
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/already submitted.*negotiation round/i)
    );
  });
});
