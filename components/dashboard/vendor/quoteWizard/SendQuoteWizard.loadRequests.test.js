// SendQuoteWizard (vendor) — load-time requests.
//
// For every product with a technical evaluation the wizard fetched the clause
// rows, and only THEN the per-clause chat previews: two round trips in series
// per product. And the negotiation rounds fetch (bid closed) waited for all of
// that to finish although it needs none of it. Independent reads now start
// together; they are still applied in the original order.

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

import { getRFQById, fetchVendorAgreement, fetchDeviationPreviews } from "@/services/rfq";
import { getAllActiveNegotiationRounds } from "@/services/negotiation";
import SendQuoteWizard from "./SendQuoteWizard";

beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});

const rfqProduct = (id, name) => ({
  id,
  product_id: 1000 + id,
  variant: "standard",
  product_details: [{ name }],
  product_specs: [{ title: "Quantity", value: "40" }, { title: "Unit", value: "nos" }],
  tech_evaluation_status: { has_tech_eval: true, is_accepted: false, all_clauses_responded: false },
});

const mkRfq = (bid_end_date) => ({
  id: 4242,
  rfq_no: 536289,
  title: "Crockery & Glassware",
  is_tender: 0,
  company_name: "Kamat Hotels India Limited",
  hotel_name: "The Orchid Hotel Panchgani",
  bid_end_date,
  comment: "",
  terms: [],
  products: [rfqProduct(1, "JUICE GLASS"), rfqProduct(2, "WINE GLASS")],
  quotations: [{
    pricing_method: "TRADITIONAL",
    payment_terms: [],
    products: [1, 2].map((id) => ({ product_id: 1000 + id, variant: "standard", pricing_method: "TRADITIONAL", unit_price: 230, tax: 18, tax_mode: "percentage", delivery_period: 7 })),
  }],
});

const never = () => new Promise(() => {});

beforeEach(() => {
  jest.clearAllMocks();
});

it("requests each product's chat previews alongside its clauses, not after them", async () => {
  // Clause rows never arrive — pre-fix, no preview request could start.
  fetchVendorAgreement.mockImplementation(never);
  getRFQById.mockResolvedValue({ data: mkRfq("2099-01-01 12:00:00") });

  render(<SendQuoteWizard />);

  await waitFor(() => expect(fetchVendorAgreement).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(fetchDeviationPreviews).toHaveBeenCalledTimes(2));
  expect(fetchDeviationPreviews.mock.calls.map((c) => c[0]).sort()).toEqual([1, 2]);
});

it("starts the negotiation rounds fetch alongside the tech-eval loads once the bid has closed", async () => {
  fetchVendorAgreement.mockImplementation(never);
  getRFQById.mockResolvedValue({ data: mkRfq("2020-01-01 12:00:00") }); // bid closed → negotiation phase

  render(<SendQuoteWizard />);

  await waitFor(() => expect(fetchVendorAgreement).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(getAllActiveNegotiationRounds).toHaveBeenCalledTimes(1));
  expect(getAllActiveNegotiationRounds.mock.calls[0][0]).toBe(4242);
});

it("still applies clause rows and preview counts once both land", async () => {
  fetchVendorAgreement.mockResolvedValue({
    data: [{ clause_id: 1114, clause_text: "Ocean Brand", clause_files: [], vendor_response: "", vendor_response_files: [] }],
  });
  fetchDeviationPreviews.mockResolvedValue({ data: [{ clause_id: 1114 }, { clause_id: 1114 }] });
  getRFQById.mockResolvedValue({ data: mkRfq("2099-01-01 12:00:00") });

  render(<SendQuoteWizard />);

  await waitFor(() => expect(screen.queryAllByText("Ocean Brand").length).toBeGreaterThan(0));
  expect(fetchDeviationPreviews).toHaveBeenCalledTimes(2);
  expect(getAllActiveNegotiationRounds).not.toHaveBeenCalled(); // bid still open
});
