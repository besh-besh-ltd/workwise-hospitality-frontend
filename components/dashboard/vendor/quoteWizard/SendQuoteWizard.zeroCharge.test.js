// SendQuoteWizard — a charge of exactly 0 is a legitimate amount.
//
// CONFIRMED DEFECT. A buyer can open a negotiation asking for freight at 0
// (i.e. "waive it"), and the wizard's own negotiated-charge injector then adds
// that charge at exactly `amount: 0`. `validateCharge` rejected it with
//
//     amount must be greater than 0
//
// …so the form refused the ask it had just rendered. Worse, the charges modal
// routes its Done button, its X button AND its backdrop click through the same
// `attemptClose` gate, so the vendor could not close the modal at all — the
// only escape was to invent a non-zero charge they had not agreed to.
//
// 110 of the 490 charge entries already stored in production are zero-amount,
// and 6,072 of 6,200 quote items carry freight_price = 0. Zero is the NORMAL
// value on this path, not a missing one.
//
// Blank and negative are still errors. Only the "> 0" part was wrong.

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
  useSelector: (fn) => fn({ userProfile: { id: 7001, name: "Test Vendor" } }),
}));

import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import { toast } from "react-toastify";
import SendQuoteWizard from "./SendQuoteWizard";

const charge = (amount, comment) => ({
  name: "Freight",
  slug: "freight",
  amount,
  amount_mode: "absolute",
  tax_on_charge: 0,
  tax_mode: "percentage",
  comment,
});

const mkRfq = (charges) => ({
  id: 4242,
  rfq_no: 500002,
  title: "Freight waiver check",
  is_tender: 0,
  company_name: "Test Hospitality Co",
  hotel_name: "Test Hotel",
  department_name: "Engineering",
  // Bid window OPEN — everything editable, so the modal gate is what we isolate.
  bid_end_date: "2099-01-01 12:00:00",
  comment: "",
  terms: [],
  products: [
    {
      id: 1,
      product_id: 1001,
      variant: "standard",
      product_details: [{ name: "CLADDING PANEL" }],
      product_specs: [
        { title: "Quantity", value: "10" },
        { title: "Unit", value: "nos" },
      ],
      tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
    },
  ],
  quotations: [
    {
      id: 700,
      pricing_method: "TRADITIONAL",
      payment_terms: [],
      products: [
        {
          product_id: 1001,
          variant: "standard",
          pricing_method: "TRADITIONAL",
          unit_price: 500,
          tax: 18,
          tax_mode: "percentage",
          delivery_period: 7,
          other_charges: charges,
        },
      ],
    },
  ],
});

const openChargesModal = async (rfq) => {
  getRFQById.mockResolvedValue({ data: rfq });
  render(<SendQuoteWizard />);
  await screen.findAllByText("Review & submit");

  // Step back to Pricing, where the per-line charges trigger lives.
  const pricingTab = await screen.findAllByText(/Pricing/i);
  fireEvent.click(pricingTab[0]);

  // With the fix a zero-amount charge is visible as "1 charge added";
  // before it, it read "Add freight, insurance…" — match either so this
  // test fails on the ASSERTION, not on being unable to find the button.
  const trigger = await screen.findByRole("button", {
    name: /charge added|Add freight/i,
  });
  fireEvent.click(trigger);
  return await screen.findByRole("button", { name: /^Done$/i });
};

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("other-charges modal — zero is a legitimate amount", () => {
  test("a charge of 0 with a note closes the modal without an error", async () => {
    const done = await openChargesModal(mkRfq([charge(0, "waived as agreed")]));

    fireEvent.click(done);

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^Done$/i })).not.toBeInTheDocument();
    });
    // The exact copy the vendor was trapped by.
    const messages = toast.error.mock.calls.map((c) => String(c[0]));
    expect(messages.join(" | ")).not.toMatch(/amount must be greater than 0/i);
  });

  test("clearing the amount is still rejected", async () => {
    // Note the prefill coerces a blank stored amount to 0 (helpers.js:58,
    // `parseFloat(c.amount ?? c.tax ?? 0) || 0`), so "no amount" can only be
    // reached by the vendor emptying the field — which is what we do here.
    const done = await openChargesModal(mkRfq([charge(250, "trucking")]));

    // Scope to the modal: the pricing grid behind it also has number inputs.
    const modal = done.closest("div.modalBackdrop");
    expect(modal).not.toBeNull();
    const amount = within(modal).getAllByPlaceholderText("0")[0];
    fireEvent.change(amount, { target: { value: "" } });

    fireEvent.click(done);

    const messages = toast.error.mock.calls.map((c) => String(c[0]));
    expect(messages.join(" | ")).toMatch(/amount is required/i);
    // Still open — a half-filled charge must never save silently.
    expect(screen.getByRole("button", { name: /^Done$/i })).toBeInTheDocument();
  });

  test("a charge of 0 with NO note is still rejected", async () => {
    // The server requires a note on every per-product charge, so relaxing the
    // amount rule must not relax this one — that would only move the failure
    // from this modal to the submit call.
    const done = await openChargesModal(mkRfq([charge(0, "")]));

    fireEvent.click(done);

    const messages = toast.error.mock.calls.map((c) => String(c[0]));
    expect(messages.join(" | ")).toMatch(/note is required/i);
    expect(messages.join(" | ")).not.toMatch(/amount must be greater than 0/i);
  });
});
