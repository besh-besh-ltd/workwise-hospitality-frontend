// SendQuoteWizard — REQ-2026-0104: a vendor can RAISE a price in a round.
//
// The buyer may now set a negotiation price target above the vendor's quote
// (RFQ 537041: quoted ₹100, approved rate ₹110). The wizard used to drop any
// ask whose target was not below the quoted price, and dropping it also
// DISABLED the price input (isFieldNegotiable reads the same list), so the
// vendor could not move the price at all. A higher ask is now kept; an ask
// equal to the quote (no change) is still dropped.

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
    query: { id: "560", type: "update-quote" },
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

/**
 * The vendor's stored line, exactly as the pre-wizard UI wrote it: priced, but
 * with NO delivery period. This single field is the whole defect.
 */
const legacyQuoteLine = (over = {}) => ({
  product_id: 13679,
  variant: "standard",
  pricing_method: "TRADITIONAL",
  unit_price: 19,
  tax: 18,
  tax_mode: "percentage",
  delivery_period: "",
  ...over,
});

const mkRfq = (quoteLines) => ({
  id: 560,
  rfq_no: 500001,
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
    { id: 699, pricing_method: "TRADITIONAL", payment_terms: [], products: quoteLines },
  ],
});

/** An ACTIVE round opening exactly `fields` on our one product. */
const mkRound = (fields) => ({
  id: 906,
  status: "ACTIVE",
  end_date: "2099-01-01 12:00:00",
  rfq_product_id: null,
  products: [
    {
      rfq_product_id: RFQ_PRODUCT_ID,
      vendor_targets: [{ vendor_id: 7001, fields }],
    },
  ],
});

const renderWizard = async (rfq, rounds) => {
  getRFQById.mockResolvedValue({ data: rfq });
  getAllActiveNegotiationRounds.mockResolvedValue({ data: rounds });
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

describe("negotiation round asking the vendor to raise a price", () => {
  const unitPriceInput = () => screen.getAllByPlaceholderText("0.00")[0];

  test("a target above the quote keeps the price editable and shows the ask", async () => {
    getRFQById.mockResolvedValue({ data: mkRfq([legacyQuoteLine({ unit_price: 100, delivery_period: 7 })]) });
    getAllActiveNegotiationRounds.mockResolvedValue({ data: [mkRound([{ name: "base_price", target: "110" }])] });
    render(<SendQuoteWizard />);

    await waitFor(() => expect(screen.getByText(/Buyer's ask:/)).toBeInTheDocument());
    expect(screen.getByText(/Buyer's ask:/)).toHaveTextContent("₹110");
    expect(unitPriceInput()).toHaveValue(100);
    expect(unitPriceInput()).toBeEnabled();

    await userEvent.clear(unitPriceInput());
    await userEvent.type(unitPriceInput(), "110");
    expect(unitPriceInput()).toHaveValue(110);
  });

  test("a target equal to the quote is still dropped (nothing to change)", async () => {
    getRFQById.mockResolvedValue({ data: mkRfq([legacyQuoteLine({ unit_price: 100, delivery_period: 7 })]) });
    getAllActiveNegotiationRounds.mockResolvedValue({ data: [mkRound([{ name: "base_price", target: "100" }])] });
    render(<SendQuoteWizard />);

    await screen.findAllByText("Review & submit");
    await waitFor(() => expect(unitPriceInput()).toBeDisabled());
    expect(screen.queryByText(/Buyer's ask:/)).toBeNull();
  });

  test("a target below the quote works as before", async () => {
    getRFQById.mockResolvedValue({ data: mkRfq([legacyQuoteLine({ unit_price: 100, delivery_period: 7 })]) });
    getAllActiveNegotiationRounds.mockResolvedValue({ data: [mkRound([{ name: "base_price", target: "90" }])] });
    render(<SendQuoteWizard />);

    await waitFor(() => expect(screen.getByText(/Buyer's ask:/)).toHaveTextContent("₹90"));
    expect(unitPriceInput()).toBeEnabled();
  });
});
