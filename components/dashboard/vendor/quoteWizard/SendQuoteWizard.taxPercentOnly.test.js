// SendQuoteWizard — a vendor enters tax (GST) as a percentage only.
//
// The ₹ option beside every tax field on the RFQ quote was removed: the item's
// Tax (GST), the tax on an item's other charges and the tax on a global
// (document-level) charge. ₹ stays where it means money (a charge's amount).
//
// A quote saved earlier with a flat ₹ tax keeps its saved figure, so that field
// still shows ₹ (selected, not clickable) and its total stays as submitted.
// Pressing % moves it to a percentage and clears the figure, so an old rupee
// amount is never re-read as a rate.

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
    query: { id: "4343" },
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
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import SendQuoteWizard from "./SendQuoteWizard";

const mkRfq = ({ tax = 18, taxMode = "percentage", charges = [], globalCharges = [] } = {}) => ({
  id: 4343,
  rfq_no: 500003,
  title: "Tax entry check",
  is_tender: 0,
  company_name: "Test Hospitality Co",
  hotel_name: "Test Hotel",
  department_name: "Housekeeping",
  // Bid window OPEN, so every field is editable.
  bid_end_date: "2099-01-01 12:00:00",
  comment: "",
  terms: [],
  products: [
    {
      id: 1,
      product_id: 1001,
      variant: "standard",
      product_details: [{ name: "FLOOR CLEANER" }],
      product_specs: [
        { title: "Quantity", value: "10" },
        { title: "Unit", value: "ltr" },
      ],
      tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
    },
  ],
  quotations: [
    {
      id: 701,
      pricing_method: "TRADITIONAL",
      payment_terms: [],
      global_charges: globalCharges,
      products: [
        {
          product_id: 1001,
          variant: "standard",
          pricing_method: "TRADITIONAL",
          unit_price: 500,
          tax,
          tax_mode: taxMode,
          delivery_period: 7,
          other_charges: charges,
        },
      ],
    },
  ],
});

const freight = (over = {}) => ({
  name: "Freight",
  slug: "freight",
  amount: 250,
  amount_mode: "absolute",
  tax: 5,
  tax_mode: "percentage",
  comment: "door delivery",
  ...over,
});

// An already-quoted vendor lands on Review; step back to Pricing.
const openPricing = async (rfq) => {
  getRFQById.mockResolvedValue({ data: rfq });
  render(<SendQuoteWizard />);
  await screen.findAllByText("Review & submit");
  fireEvent.click((await screen.findAllByText(/Pricing/i))[0]);
  return await screen.findAllByRole("group", { name: "Tax mode" });
};

const taxInputOf = (group) => group.closest(`div`).parentElement.querySelector("input");

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("item Tax (GST)", () => {
  test("offers % only — no ₹ button", async () => {
    const [group] = await openPricing(mkRfq());
    const buttons = within(group).getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["%"]);
    expect(buttons[0]).toHaveAttribute("aria-pressed", "true");
  });

  test("a line saved earlier with a ₹ tax shows ₹ (not clickable); pressing % clears it", async () => {
    const [group] = await openPricing(mkRfq({ tax: 900, taxMode: "absolute" }));
    const rupee = within(group).getByRole("button", { name: "₹" });
    expect(rupee).toBeDisabled();
    expect(rupee).toHaveAttribute("aria-pressed", "true");
    expect(taxInputOf(group)).toHaveValue(900);

    fireEvent.click(within(group).getByRole("button", { name: "%" }));

    const [after] = await screen.findAllByRole("group", { name: "Tax mode" });
    expect(within(after).queryByRole("button", { name: "₹" })).not.toBeInTheDocument();
    expect(within(after).getByRole("button", { name: "%" })).toHaveAttribute("aria-pressed", "true");
    expect(taxInputOf(after)).toHaveValue(null);
  });
});

describe("tax on an item's other charge", () => {
  const openCharges = async (charges) => {
    await openPricing(mkRfq({ charges }));
    fireEvent.click(await screen.findByRole("button", { name: /charge added/i }));
    await screen.findByRole("button", { name: /^Done$/i });
    const groups = screen.getAllByRole("group", { name: "Tax mode" });
    // [0] is the item's own tax on the page behind; the modal's charge tax is last.
    return { chargeTax: groups[groups.length - 1], chargeAmount: screen.getByRole("group", { name: "Charge mode" }) };
  };

  test("offers % only, while the charge amount keeps ₹", async () => {
    const { chargeTax, chargeAmount } = await openCharges([freight()]);
    expect(within(chargeTax).getAllByRole("button").map((b) => b.textContent)).toEqual(["%"]);
    expect(within(chargeAmount).getByRole("button", { name: "₹" })).toBeInTheDocument();
  });

  test("a charge saved earlier with a ₹ tax shows ₹ (not clickable); pressing % clears it", async () => {
    const { chargeTax } = await openCharges([freight({ tax: 45, tax_mode: "absolute" })]);
    expect(within(chargeTax).getByRole("button", { name: "₹" })).toBeDisabled();
    expect(taxInputOf(chargeTax)).toHaveValue(45);

    fireEvent.click(within(chargeTax).getByRole("button", { name: "%" }));

    const groups = screen.getAllByRole("group", { name: "Tax mode" });
    const after = groups[groups.length - 1];
    expect(within(after).queryByRole("button", { name: "₹" })).not.toBeInTheDocument();
    // Cleared to blank = "uses base rate" (the item's GST %).
    expect(taxInputOf(after)).toHaveValue(null);
    expect(screen.getByText("uses base rate")).toBeInTheDocument();
  });
});

describe("tax on a global charge", () => {
  test("offers % only; a charge saved earlier with a ₹ tax shows ₹ until % is pressed", async () => {
    getRFQById.mockResolvedValue({
      data: mkRfq({
        globalCharges: [
          { name: "Insurance", amount: 300, amount_mode: "absolute", additional_tax: 18, additional_tax_mode: "percentage", comment: "transit" },
          { name: "Handling", amount: 400, amount_mode: "absolute", additional_tax: 40, additional_tax_mode: "absolute", comment: "loading" },
        ],
      }),
    });
    render(<SendQuoteWizard />);
    await screen.findAllByText("Review & submit");
    fireEvent.click((await screen.findAllByText("Commercial terms"))[0]);
    fireEvent.click(await screen.findByRole("button", { name: /2 global charges/i }));
    await screen.findByRole("button", { name: /^Done$/i });

    const [fresh, legacy] = screen.getAllByRole("group", { name: "Tax mode" });
    expect(within(fresh).getAllByRole("button").map((b) => b.textContent)).toEqual(["%"]);
    expect(within(screen.getAllByRole("group", { name: "Charge mode" })[0]).getByRole("button", { name: "₹" })).toBeInTheDocument();

    expect(within(legacy).getByRole("button", { name: "₹" })).toBeDisabled();
    fireEvent.click(within(legacy).getByRole("button", { name: "%" }));
    const after = screen.getAllByRole("group", { name: "Tax mode" })[1];
    expect(within(after).queryByRole("button", { name: "₹" })).not.toBeInTheDocument();
    expect(taxInputOf(after)).toHaveValue(null);
  });
});
