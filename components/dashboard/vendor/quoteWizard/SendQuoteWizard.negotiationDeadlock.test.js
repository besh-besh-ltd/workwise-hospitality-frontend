// SendQuoteWizard — a negotiation revision must not require a field the
// buyer never opened.
//
// CONFIRMED DEFECT, reproduced against production data (RFQ 560, vendor
// PRATIK MALI). The vendor was invited to a negotiation round on base_price,
// opened the wizard, lowered the price, and could not submit. The Confirm &
// Update button stayed disabled, and clicking through raised:
//
//     Base price and delivery period must be greater than zero
//
// …naming a field the wizard had itself rendered as DISABLED, because the
// round did not open delivery_period. Required and un-editable at the same
// time. Seven rounds were created on that RFQ; the vendor answered none of
// them, and tbl_negotiation_round_quotes holds zero rows for all seven.
//
// Root cause: the delivery period became mandatory when this wizard shipped
// (~30 July 2026), but 5,264 quote items across 622 quotes were written by the
// previous UI, which did not require it. `tbl_quote_items.delivery_period` is
// `text NOT NULL`, so those store '' — and the wizard re-serialises '' through
// `parseInt(x) || 0` into 0. The submit gates then demanded a value the vendor
// had no way to supply.
//
// The rule these tests pin: a delivery period is required when the vendor can
// actually set it — always on a fresh quote, and during a round only when the
// buyer opened delivery_period.

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
  useSelector: (fn) => fn({ userProfile: { id: 372, name: "PRATIK MALI" } }),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import { getAllActiveNegotiationRounds } from "@/services/negotiation";
import SendQuoteWizard from "./SendQuoteWizard";

const RFQ_PRODUCT_ID = 3169;

const rfqProduct = () => ({
  id: RFQ_PRODUCT_ID,
  product_id: 13679,
  variant: "standard",
  product_details: [{ name: "ACP SHEET" }],
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
  rfq_no: 536106,
  title: "ORCHID HOTEL PUNE - ACP WORK",
  is_tender: 0,
  company_name: "Orchid Hotel Pune",
  hotel_name: "Orchid Hotel Pune",
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
      vendor_targets: [{ vendor_id: 372, fields }],
    },
  ],
});

const renderWizard = async (rfq, rounds) => {
  getRFQById.mockResolvedValue({ data: rfq });
  getAllActiveNegotiationRounds.mockResolvedValue({ data: rounds });
  render(<SendQuoteWizard />);
  // A saved quote opens the wizard directly on Review & submit.
  await screen.findAllByText("Review & submit");
};

const submitButton = () => screen.getByRole("button", { name: /Confirm & Update/i });

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("negotiation revision on a quote with no delivery period", () => {
  test("submit is enabled when the round did not open delivery_period", async () => {
    await renderWizard(
      mkRfq([legacyQuoteLine()]),
      [mkRound([{ name: "base_price", target: "15" }])]
    );

    // The defect: this button was permanently disabled, so the vendor could
    // not respond to the round at all.
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  test("submit is still blocked when the buyer DID open delivery_period and it is blank", async () => {
    await renderWizard(
      mkRfq([legacyQuoteLine()]),
      [
        mkRound([
          { name: "base_price", target: "15" },
          { name: "delivery_period", target: "7" },
        ]),
      ]
    );

    // Here the field is editable, so requiring it is fair — and the vendor can
    // satisfy it. The rule survives exactly where it makes sense.
    await waitFor(() => expect(submitButton()).toBeDisabled());
  });

  test("submit is enabled once a delivery period exists, whatever the round opened", async () => {
    await renderWizard(
      mkRfq([legacyQuoteLine({ delivery_period: 7 })]),
      [mkRound([{ name: "base_price", target: "15" }])]
    );

    await waitFor(() => expect(submitButton()).toBeEnabled());
  });
});
