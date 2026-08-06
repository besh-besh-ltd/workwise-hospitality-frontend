// SendQuoteWizard — step 1's terms-acceptance gate, as an accessibility contract.
//
// CONFIRMED DEFECT, verified in a real browser. The gate that lets a vendor
// leave "Inquiry overview" was a bare <label> wrapping a decorative <span>.
// There was no form control behind it at all: the whole page carried exactly
// one <input> (the nav search box), the label reported tabIndex -1, had no
// role, no aria-checked, and label.focus() did not move focus.
//
// The consequence is not cosmetic. Step 1 cannot be left until this control is
// ticked, so a keyboard-only or screen-reader vendor could not advance the
// wizard and therefore could not submit a quote AT ALL. WCAG 2.1.1 (Keyboard)
// and 4.1.2 (Name, Role, Value), on a contractual acceptance gate.
//
// These tests deliberately assert the ACCESSIBILITY CONTRACT and never the
// markup: they only ever reach the control through getByRole("checkbox") with
// its accessible name, and drive it the way a user does — Tab, Space, click.
// A test that queried the `.check` CSS class would have passed against the
// broken build, which is the whole reason the bug shipped.

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

// The one and only handle these tests are allowed to use: role + accessible
// name. If the control regresses to a decorative <span>, this throws.
const termsCheckbox = () =>
  screen.getByRole("checkbox", { name: /accept the terms/i });

const continueButton = () => screen.getByRole("button", { name: /^Continue/ });

beforeAll(() => {
  // jsdom implements neither; the wizard's stepper calls both on mount.
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SendQuoteWizard — terms acceptance gate (accessibility contract)", () => {
  test("exposes the acceptance gate as a checkbox with an accessible name", async () => {
    await renderWizard();

    const box = termsCheckbox();
    expect(box).toBeInTheDocument();
    // Role and state must both be exposed — an unchecked checkbox, not an
    // element that merely looks like one.
    expect(box).not.toBeChecked();
    expect(box).toBeEnabled();
  });

  test("is reachable by keyboard: Tab lands on it and focus actually moves", async () => {
    const user = userEvent.setup();
    await renderWizard();

    const box = termsCheckbox();
    // The original defect: label.focus() left document.activeElement elsewhere.
    await act(async () => {
      box.focus();
    });
    expect(box).toHaveFocus();

    // And it participates in the natural tab sequence rather than being
    // pulled out of it with tabindex="-1".
    expect(box.tabIndex).not.toBe(-1);

    // And it sits in the natural tab sequence: tabbing forward from the top of
    // the document reaches it without a mouse. (The header's back button and
    // the stepper rail come first, hence the walk rather than a single Tab.)
    document.body.focus();
    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await user.tab();
      if (document.activeElement === box) reached = true;
    }
    expect(reached).toBe(true);
  });

  test("toggles with the Space key and unblocks Continue", async () => {
    const user = userEvent.setup();
    await renderWizard();

    const box = termsCheckbox();
    expect(continueButton()).toBeDisabled();

    await act(async () => {
      box.focus();
    });
    await user.keyboard(" ");

    expect(termsCheckbox()).toBeChecked();
    await waitFor(() => expect(continueButton()).toBeEnabled());

    // Space again unticks it and the gate closes back up.
    await user.keyboard(" ");
    expect(termsCheckbox()).not.toBeChecked();
    await waitFor(() => expect(continueButton()).toBeDisabled());
  });

  test("toggles with a pointer click and unblocks Continue", async () => {
    const user = userEvent.setup();
    await renderWizard();

    expect(continueButton()).toBeDisabled();

    await user.click(termsCheckbox());

    expect(termsCheckbox()).toBeChecked();
    await waitFor(() => expect(continueButton()).toBeEnabled());

    await user.click(termsCheckbox());
    expect(termsCheckbox()).not.toBeChecked();
    await waitFor(() => expect(continueButton()).toBeDisabled());
  });

  test("clicking the surrounding acknowledgement text toggles the checkbox", async () => {
    const user = userEvent.setup();
    await renderWizard();

    // The whole card is the hit target by design; that must now drive the real
    // control rather than a click handler on a <label> with nothing behind it.
    await user.click(
      screen.getByText(/I have read and accept the terms/i)
    );

    expect(termsCheckbox()).toBeChecked();
    await waitFor(() => expect(continueButton()).toBeEnabled());
  });

  test("accepting the terms lets a keyboard user leave step 1", async () => {
    const user = userEvent.setup();
    await renderWizard();

    const box = termsCheckbox();
    await act(async () => {
      box.focus();
    });
    await user.keyboard(" ");
    await waitFor(() => expect(continueButton()).toBeEnabled());

    await user.click(continueButton());

    // Step 2 for a non-tender, no-tech-eval RFQ is Pricing. Reaching it is the
    // behaviour the defect made impossible without a mouse.
    expect(
      await screen.findByText("Pricing & commercial terms")
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: /accept the terms/i })
    ).not.toBeInTheDocument();
  });

  test("stays a checkbox — disabled, not fake — once the bid window has closed", async () => {
    const user = userEvent.setup();
    // Past deadline with no quote on record ⇒ "missed inquiry": the gate is
    // supposed to be inert. Inert must mean `disabled`, which assistive tech
    // announces, not an onClick that silently returns.
    await renderWizard(mkRfq({ bid_end_date: "2020-01-01 12:00:00" }));

    const box = termsCheckbox();
    expect(box).toBeDisabled();
    expect(box).not.toBeChecked();

    await user.click(box).catch(() => {});
    expect(termsCheckbox()).not.toBeChecked();
  });
});
