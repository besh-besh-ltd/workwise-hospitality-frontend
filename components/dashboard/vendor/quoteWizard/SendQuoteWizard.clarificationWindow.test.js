// SendQuoteWizard (vendor) — the clarification window applies to RFQs exactly
// as to tenders (REQ-2026-0099).
//
// The client runs a pre-bid meeting during the clarification window and needs
// every rate held back until it closes. The wizard gated all of that on
// is_tender: on an RFQ with a Vendor Clarification End Date it hid the
// Clarifications step, never loaded the clarifications, and let the vendor
// walk straight to Pricing and submit mid-window.
//
// Product-level: render the REAL wizard against a stubbed RFQ payload and walk
// the stepper the way a vendor does.

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
  getClarifications: jest.fn(() => Promise.resolve({ data: { clarifications: [] } })),
}));

jest.mock("@/hooks/usePreviewTotals", () => ({
  __esModule: true,
  default: () => ({ totals: null, isLoading: false, error: null }),
}));

jest.mock("@/utils/quoteExcel", () => ({ __esModule: true, downloadQuoteExcel: jest.fn() }));
jest.mock("@/components/modal/RegretQuoteReasonModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/shared/QuoteMethodModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/dashboard/buyer/clarification", () => ({
  __esModule: true,
  RaiseClarificationModal: () => null,
  ClarificationDetailModal: () => null,
}));
jest.mock("./ClauseChatDrawer", () => ({ __esModule: true, default: () => null }));
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
  useSelector: (fn) => fn({ userProfile: { id: 497, name: "Vendor One" } }),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";

import { getRFQById } from "@/services/rfq";
import { getClarifications } from "@/services/clarification";
import SendQuoteWizard from "./SendQuoteWizard";

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
  getClarifications.mockResolvedValue({ data: { clarifications: [] } });
});

const OPEN = "2099-01-01 12:00:00";   // window still running
const CLOSED = "2020-01-01 12:00:00"; // window over

const mkRfq = ({ isTender = false, clarification = null, quoted = false } = {}) => ({
  id: 4242,
  rfq_no: 537049,
  title: "Kitchen equipment",
  is_tender: isTender ? 1 : 0,
  company_name: "Hotel Group",
  hotel_name: "Hotel One",
  bid_end_date: "2099-06-01 12:00:00",
  vendor_clarification_date: clarification,
  tender_publish_date: "2020-01-01 10:00:00",
  comment: "",
  terms: [],
  products: [{
    id: 1,
    product_id: 1001,
    variant: "standard",
    product_details: [{ name: "Refrigerator" }],
    product_specs: [{ title: "Quantity", value: "4" }, { title: "Unit", value: "nos" }],
    tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
  }],
  quotations: quoted ? [{
    id: 77,
    is_regret: 0,
    pricing_method: "TRADITIONAL",
    payment_terms: [{ id: 1, type: "advance", value: 100, days: null, comment: "" }],
    global_charges: [],
    products: [{ product_id: 1001, variant: "standard", pricing_method: "TRADITIONAL", unit_price: 230, tax: 18, tax_mode: "percentage", delivery_period: 7 }],
  }] : [],
});

const open = async (rfq) => {
  getRFQById.mockResolvedValue({ data: rfq });
  render(<SendQuoteWizard />);
  await screen.findAllByText("Pricing");
};

const acceptTerms = async () => {
  const box = screen.queryByRole("checkbox", { name: /accept the terms/i });
  if (box) await userEvent.click(box);
};

/** Click Pricing in the stepper; true when the pricing inputs actually show. */
const reachPricing = async () => {
  await userEvent.click(screen.getAllByText("Pricing")[0]);
  return screen.queryByPlaceholderText("0.00") !== null;
};

const hasClarStep = () => screen.queryAllByText("Clarifications").length > 0;

describe("RFQ (not a tender)", () => {
  it("window open: shows the Clarifications step and keeps Pricing locked", async () => {
    await open(mkRfq({ clarification: OPEN }));
    expect(hasClarStep()).toBe(true);
    await acceptTerms();
    expect(await reachPricing()).toBe(false);

    await userEvent.click(screen.getAllByText("Clarifications")[0]);
    expect(await screen.findByText("Clarification window is open")).toBeInTheDocument();
    expect(screen.getByText(/clarifications you have about the RFQ/i)).toBeInTheDocument();
    expect(screen.getByText("Quotes locked")).toBeInTheDocument();
  });

  it("window open: loads the clarifications for the RFQ", async () => {
    await open(mkRfq({ clarification: OPEN }));
    await waitFor(() => expect(getClarifications).toHaveBeenCalledWith(4242, undefined));
  });

  it("window closed: Clarifications step stays for the record, Pricing opens", async () => {
    await open(mkRfq({ clarification: CLOSED }));
    expect(hasClarStep()).toBe(true);
    await acceptTerms();
    expect(await reachPricing()).toBe(true);
  });

  it("no clarification window: no Clarifications step, Pricing opens as before", async () => {
    await open(mkRfq({ clarification: null }));
    expect(hasClarStep()).toBe(false);
    await acceptTerms();
    expect(await reachPricing()).toBe(true);
  });

  it("window closed but a clarification is still open: Pricing stays locked", async () => {
    getClarifications.mockResolvedValue({
      data: {
        clarifications: [{ id: 9, status: "OPEN", subject: "Pre-bid meeting", raised_by_vendor_code: "VEN-12" }],
        open_clarification: { id: 9, status: "OPEN", subject: "Pre-bid meeting" },
        has_open: true,
        is_own_clarification: false,
      },
    });
    await open(mkRfq({ clarification: CLOSED }));
    await waitFor(() => expect(getClarifications).toHaveBeenCalled());
    await acceptTerms();
    await waitFor(async () => expect(await reachPricing()).toBe(false));
  });

  it("vendor who already quoted lands on Review mid-window and cannot submit, with the reason", async () => {
    await open(mkRfq({ clarification: OPEN, quoted: true }));
    expect(
      await screen.findByText(/Quotes can be submitted once the clarification window closes/i)
    ).toBeInTheDocument();
  });
});

describe("tender (unchanged)", () => {
  it("window open: Clarifications step shown and Pricing locked, wording says tender", async () => {
    await open(mkRfq({ isTender: true, clarification: OPEN }));
    expect(hasClarStep()).toBe(true);
    await acceptTerms();
    expect(await reachPricing()).toBe(false);
    await userEvent.click(screen.getAllByText("Clarifications")[0]);
    expect(await screen.findByText(/clarifications you have about the tender/i)).toBeInTheDocument();
  });

  it("window closed: Pricing opens", async () => {
    await open(mkRfq({ isTender: true, clarification: CLOSED }));
    await acceptTerms();
    expect(await reachPricing()).toBe(true);
  });
});
