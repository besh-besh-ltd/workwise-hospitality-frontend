// SendQuoteWizard — a live negotiation round must be legible, not buried.
//
// Reported on RFQ 536237 (prod round 1004, round_number 6 — ACTIVE, vendor 508
// listed, base_price target 158800 against a quoted unit price of 169800). The
// buyer ran SIX rounds and the vendor never moved their price. The round was
// functionally answerable the whole time — `locked` was false, the price input
// was enabled, and a "Buyer's ask" chip rendered under it — but FOUR separate
// signals told the vendor the opposite, every one of them testing `isBidExpired`
// alone with no exemption for a live round:
//
//   1. HeaderStrip  → "Existing quote · Read-only" + red "Already ended · <bid>"
//   2. visibleSteps → last step relabelled "Snapshot of your submitted quote"
//   3. landOn       → an already-quoted vendor is dropped ONTO that step
//   4. Step5Review  → receives no negotiation props at all, so the step the
//                     vendor actually lands on never mentions the ask
//
// The vendor read "read-only", "already ended" and "snapshot", concluded the
// inquiry was closed, and left. The editable field was one step back, unadvertised.
//
// These tests pin the vendor-facing contract: when a round is live the page must
// say so at the top, mark WHICH steps carry the ask, land the vendor where they
// can act, and — on review — name the item, the field and the target explicitly.

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
    query: { id: "693", type: "update-quote" },
    pathname: "/dashboard/vendor/quote",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  }),
}));

jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 508, name: "Shubhangi Darvesh" } }),
}));

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import {
  getAllActiveNegotiationRounds,
  getAllVendorNegotiationStatus,
} from "@/services/negotiation";
import SendQuoteWizard from "./SendQuoteWizard";

const VENDOR_ID = 508;
const RFQ_PRODUCT_ID = 3802;
const PRODUCT_NAME = "Laptop for video editor";

const rfqProduct = () => ({
  id: RFQ_PRODUCT_ID,
  product_id: 13656,
  variant: 0,
  product_details: [{ name: PRODUCT_NAME }],
  product_specs: [
    { title: "Quantity", value: "1" },
    { title: "Unit", value: "nos" },
  ],
  tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
});

const quotedLine = () => ({
  product_id: 13656,
  variant: 0,
  pricing_method: "TRADITIONAL",
  unit_price: 169800,
  tax: 18,
  tax_mode: "percentage",
  delivery_period: 10,
});

const mkRfq = () => ({
  id: 693,
  rfq_no: 536237,
  title: "The Orchid Mumbai - Laptop for video editor in market department",
  is_tender: 0,
  company_name: "Kamat Hotels",
  hotel_name: "The Orchid Mumbai",
  department_name: "Marketing",
  // Bid window CLOSED on 18 Jul — the only state in which a round applies.
  bid_end_date: "2026-07-18 20:35",
  comment: "",
  terms: [],
  products: [rfqProduct()],
  quotations: [
    { id: 817, pricing_method: "TRADITIONAL", payment_terms: [], products: [quotedLine()] },
  ],
});

/**
 * Round 1004 exactly as production stores it: a LEGACY round — `rfq_product_id`
 * on the row, `products` NULL, and the vendor's asks living in
 * `vendor_approvals[].negotiation_fields`.
 */
const liveRound = (fields = [{ name: "base_price", target: "158800" }]) => ({
  id: 1004,
  round_number: 6,
  status: "ACTIVE",
  end_date: "2099-09-01 10:30:00",
  rfq_product_id: RFQ_PRODUCT_ID,
  products: null,
  vendor_approvals: [
    {
      vendor_id: VENDOR_ID,
      status: "APPROVED",
      negotiation_fields: fields,
    },
  ],
});

const renderWizard = async (rounds = [liveRound()], vendorStatus = []) => {
  getRFQById.mockResolvedValue({ data: mkRfq() });
  getAllActiveNegotiationRounds.mockResolvedValue({ data: rounds });
  getAllVendorNegotiationStatus.mockResolvedValue({ status: 1, data: vendorStatus });
  render(<SendQuoteWizard />);
  // The invite banner renders on every step once rounds have loaded.
  await screen.findByText(/Negotiation round in progress/i, {}, { timeout: 5000 });
};

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("a live negotiation round on an expired-bid RFQ", () => {
  test("the header does not call the quote read-only", async () => {
    await renderWizard();
    expect(screen.queryByText(/Read-only/i)).not.toBeInTheDocument();
  });

  test("the header shows the round deadline, not 'Already ended'", async () => {
    await renderWizard();
    expect(screen.queryByText(/Already ended/i)).not.toBeInTheDocument();
    // The vendor needs the date they are actually working to.
    expect(screen.getByText(/Negotiation R6/i)).toBeInTheDocument();
  });

  // The round deadline is stored UTC-naive. Rendering it as-is reads the string
  // as LOCAL time and shows an IST vendor a deadline 5h30m early — on a 2-hour
  // round (production has 195 of them under 2h) that is the difference between
  // "respond today" and "already missed".
  test("the round deadline is rendered as a real instant, not a naive string", async () => {
    await renderWizard([liveRound()]);
    // end_date "2099-09-01 10:30:00" is UTC → 16:00 in IST (UTC+5:30).
    const expected = new Date("2099-09-01T10:30:00Z");
    const hh = String(expected.getHours() % 12 || 12).padStart(2, "0");
    const mm = String(expected.getMinutes()).padStart(2, "0");
    const ampm = expected.getHours() >= 12 ? "PM" : "AM";
    expect(
      screen.getByText(new RegExp(`Respond by.*${hh}:${mm} ${ampm}`))
    ).toBeInTheDocument();
  });

  test("the final step is still 'Review & submit', not a read-only snapshot", async () => {
    await renderWizard();
    expect(
      screen.queryByText(/Snapshot of your submitted quote/i)
    ).not.toBeInTheDocument();
  });

  test("the stepper marks which steps carry a negotiated ask", async () => {
    await renderWizard();
    // base_price lives on the Pricing step, so that tab must be flagged.
    const pricingTab = screen
      .getAllByText("Pricing")[0]
      .closest("button");
    expect(pricingTab).toHaveAttribute("data-negotiation", "true");
    // Commercial terms carries no ask in this round.
    const termsTab = screen
      .getAllByText("Commercial terms")[0]
      .closest("button");
    expect(termsTab).toHaveAttribute("data-negotiation", "false");
  });

  test("the vendor lands on Pricing, where the ask can actually be answered", async () => {
    await renderWizard();
    expect(
      await screen.findByText("Pricing & commercial terms")
    ).toBeInTheDocument();
  });

  test("the price input is enabled and shows the buyer's ask", async () => {
    await renderWizard();
    const input = await screen.findByDisplayValue("169800");
    expect(input).toBeEnabled();
    expect(screen.getByText(/1,58,800/)).toBeInTheDocument();
  });
});

describe("the review step spells out the outstanding asks", () => {
  const gotoReview = async () => {
    const tab = screen.getAllByText("Review & submit")[0];
    await userEvent.click(tab.closest("button") || tab);
  };

  test("names the item, the field and the target", async () => {
    await renderWizard();
    await gotoReview();

    const callout = await screen.findByTestId("negotiation-callout");
    expect(callout).toHaveTextContent(PRODUCT_NAME);
    expect(callout).toHaveTextContent(/Unit price/i);
    expect(callout).toHaveTextContent(/1,58,800/);
  });

  test("offers a way to get to the step that holds the ask", async () => {
    await renderWizard();
    await gotoReview();

    const jump = await screen.findByRole("button", { name: /Go to Pricing/i });
    await userEvent.click(jump);
    expect(
      await screen.findByText("Pricing & commercial terms")
    ).toBeInTheDocument();
  });

  test("lists an RFQ-level ask under the step that owns it", async () => {
    const round = liveRound();
    round.rfq_product_id = null;
    round.vendor_approvals = null;
    round.products = [
      {
        is_rfq_level: true,
        vendor_targets: [
          {
            vendor_id: VENDOR_ID,
            fields: [{ name: "payment_terms", demand: "60 days credit" }],
          },
        ],
      },
    ];
    await renderWizard([round]);
    await gotoReview();

    const callout = await screen.findByTestId("negotiation-callout");
    expect(callout).toHaveTextContent(/Payment terms/i);
    expect(
      screen.getByRole("button", { name: /Go to Commercial terms/i })
    ).toBeInTheDocument();
  });
});

describe("with no live round the read-only treatment is unchanged", () => {
  test("an expired bid with no round still reads as read-only", async () => {
    getRFQById.mockResolvedValue({ data: mkRfq() });
    getAllActiveNegotiationRounds.mockResolvedValue({ data: [] });
    getAllVendorNegotiationStatus.mockResolvedValue({ status: 1, data: [] });
    render(<SendQuoteWizard />);

    expect((await screen.findAllByText(/Read-only/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Already ended/i)).toBeInTheDocument();
    expect(
      screen.queryByTestId("negotiation-callout")
    ).not.toBeInTheDocument();
  });
});
