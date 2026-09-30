// SendQuoteWizard on a phone (<=768px).
//
// Vendors open this wizard from email / WhatsApp links; ~12% of vendor logins
// are from a phone. There the desktop sticky footer (helper text + total +
// Download Excel + Regret + Back + Continue, ~150px tall over three rows) is
// hidden by CSS and replaced by the shared MobileActionBar. These tests pin:
//   - the bar only mounts at phone width (no duplicate buttons on desktop),
//   - its Continue / Back drive the same step handlers as the footer and obey
//     the same disabled gate, with the blocking reason printed,
//   - Download Excel / Regret stay reachable (moved into the page),
//   - price fields open the numeric keypad (inputMode),
//   - the phone CSS contract (textual — jsdom has no media queries).

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
  useSelector: (fn) => fn({ userProfile: { id: 90210, name: "Test Vendor" } }),
}));

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import SendQuoteWizard from "./SendQuoteWizard";

const mkRfq = (over = {}) => ({
  id: 4242,
  rfq_no: 536999,
  title: "Room door locks",
  is_tender: 0,
  company_name: "Orchid Passaros Goa",
  hotel_name: "Orchid Passaros Goa",
  department_name: "Engineering",
  contact_name: "Buyer Contact",
  response_email: "buyer@example.com",
  contact_number: "9999999999",
  location: "Goa",
  // Far future so checkBidExpired() is false and the wizard stays editable.
  bid_end_date: "2099-01-01 12:00:00",
  comment: "",
  terms: [{ id: 7, term_content: "Delivery within 30 days of the purchase order." }],
  quotations: [],
  products: [
    {
      id: 11,
      product_id: 12248,
      variant: "standard",
      product_details: [{ name: "Room door lock", description: "" }],
      product_specs: [
        { title: "Quantity", value: "40" },
        { title: "Unit", value: "nos" },
      ],
      tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
    },
  ],
  ...over,
});

const renderWizard = async (rfq = mkRfq()) => {
  getRFQById.mockResolvedValue({ data: rfq });
  const utils = render(<SendQuoteWizard />);
  // Step 1 is only painted after the inquiry resolves. ("Inquiry overview"
  // appears twice — once in the stepper rail, once as the pane heading.)
  await screen.findAllByText("Inquiry overview");
  return utils;
};


import fs from "fs";
import path from "path";
import { within, fireEvent } from "@testing-library/react";

const setViewport = (phone) => {
  window.matchMedia = (q) => ({
    matches: phone && /max-width:\s*768px/.test(q),
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
};

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  delete window.matchMedia;
  document.body.classList.remove("has-mobile-action-bar");
});

const bar = () => screen.getByRole("region", { name: "Quote steps" });
const accept = () => screen.getByRole("checkbox", { name: /accept the terms/i });

describe("SendQuoteWizard — phone action bar", () => {
  test("is not mounted at desktop width, so the footer's buttons stay unique", async () => {
    setViewport(false);
    await renderWizard();
    expect(screen.queryByRole("region", { name: "Quote steps" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Continue/ })).toHaveLength(1);
  });

  test("renders without matchMedia at all (SSR / older jsdom)", async () => {
    delete window.matchMedia;
    await renderWizard();
    expect(screen.queryByRole("region", { name: "Quote steps" })).not.toBeInTheDocument();
  });

  test("Continue is gated like the footer's, says why, and advances the same step", async () => {
    setViewport(true);
    await renderWizard();
    await screen.findByRole("region", { name: "Quote steps" });

    const phoneContinue = within(bar()).getByRole("button", { name: /^Continue/ });
    expect(phoneContinue).toBeDisabled();
    expect(within(bar()).getByText(/Step 1 of/)).toBeInTheDocument();
    expect(within(bar()).getByText(/Acknowledge the terms/)).toBeInTheDocument();

    fireEvent.click(accept());
    await waitFor(() => expect(within(bar()).getByRole("button", { name: /^Continue/ })).toBeEnabled());
    // The blocking reason goes away once nothing blocks.
    expect(within(bar()).queryByText(/Acknowledge the terms/)).not.toBeInTheDocument();

    fireEvent.click(within(bar()).getByRole("button", { name: /^Continue/ }));
    expect(await screen.findByText("Pricing & commercial terms")).toBeInTheDocument();
    expect(within(bar()).getByText(/Step 2 of/)).toBeInTheDocument();

    // Back from the bar returns to step 1.
    fireEvent.click(within(bar()).getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("checkbox", { name: /accept the terms/i })).toBeInTheDocument();
  });

  test("keeps Regret reachable in the page body on a phone", async () => {
    setViewport(true);
    await renderWizard();
    await screen.findByRole("region", { name: "Quote steps" });
    const regrets = screen.getAllByRole("button", { name: /Regret quote/i });
    // One in the (CSS-hidden) desktop footer, one in the phone extras row.
    expect(regrets.length).toBe(2);
    expect(regrets.some((b) => !b.closest("footer"))).toBe(true);
  });

  test("price, tax and delivery inputs open the numeric keypad", async () => {
    setViewport(false);
    await renderWizard();
    fireEvent.click(accept());
    await waitFor(() => expect(screen.getByRole("button", { name: /^Continue/ })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: /^Continue/ }));
    await screen.findByText("Pricing & commercial terms");

    const numbers = document.querySelectorAll('input[type="number"]');
    expect(numbers.length).toBeGreaterThan(0);
    numbers.forEach((el) => {
      expect(["decimal", "numeric"]).toContain(el.getAttribute("inputmode"));
    });
  });
});

describe("SendQuoteWizard — phone CSS contract", () => {
  const css = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/vendor/quoteWizard/SendQuoteWizard.module.scss"),
    "utf8"
  );
  const phone = css.slice(css.lastIndexOf("@media (max-width: 768px)"));

  test("desktop footer is hidden and replaced only at <=768px", () => {
    expect(phone).toMatch(/\.actionBar\s*{\s*display:\s*none;/);
    expect(css).toMatch(/^\.phoneExtras\s*{\s*display:\s*none;\s*}/m);
  });

  test("root bleed matches the 16px shell padding below 992px", () => {
    expect(css).toMatch(/@media \(max-width: 991px\)\s*{\s*\.root\s*{\s*margin:\s*-16px;/);
  });

  test("header stacks, pricing is one column, pay rows restack, modals use dvh", () => {
    expect(phone).toMatch(/\.headerInner\s*{[^}]*flex-direction:\s*column/);
    expect(phone).toMatch(/\.headerMeta\s*{[^}]*flex-wrap:\s*wrap/);
    expect(phone).toMatch(/\.priceGrid\s*{[^}]*grid-template-columns:\s*1fr;/);
    expect(phone).toMatch(/\.payRow\s*{[^}]*grid-template-columns:\s*24px 1fr 1fr 40px/);
    expect(phone).toMatch(/\.reviewKv\s*{[^}]*grid-template-columns:\s*1fr;/);
    expect(phone).toMatch(/100dvh/);
    expect(phone).toMatch(/background-attachment:\s*scroll/);
  });
});
