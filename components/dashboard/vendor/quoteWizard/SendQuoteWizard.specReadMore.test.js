// The "What you're quoting" panel on step 1 must let a vendor read the whole
// specification the buyer wrote.
//
// Reported on RFQ 914 (prod): a 486-character LAPTOP spec rendered as
// "Processor: - 14th Gen Intel Core 5 Memory (RAM): Up to 32GB DDR5 (via 2x
// SO-DIMM slots). Storage: NVMe SSDs 500GB Display: 1…" and stopped there. The
// rest — graphics, battery, connectivity — was reachable only by hovering for
// the native `title` tooltip, which is not a thing anyone discovers.
//
// `.previewSpec` carried `white-space: nowrap; overflow: hidden; text-overflow:
// ellipsis`, a hard ONE-LINE clamp. That is not a rare edge: of the 3,564
// non-empty Spec values in production, 2,285 (64%) are longer than 60
// characters, 794 exceed 400, and the longest is 2,000. Worse, 1,817 contain
// newlines and 862 have two or more — genuinely multi-paragraph specs with
// section headings — and `nowrap` flattened every one of them into a single
// run before hiding all but its first line.
//
// jsdom applies no CSS, so the clamp itself is invisible here. What is testable
// is the affordance that replaces it: an overflowing spec must offer Read More,
// it must expand, and a short spec must not sprout a control it does not need.

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
    query: { id: "914", showTechEvalRestrictions: "false" },
    pathname: "/dashboard/vendor/quote",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  }),
}));

jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 834, name: "Sandeep Pinge" } }),
}));

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import SendQuoteWizard from "./SendQuoteWizard";

/** The real value stored for RFQ 914 — 486 characters, no newlines. */
const LONG_SPEC =
  "Processor: - 14th Gen Intel Core 5 Memory (RAM): Up to 32GB DDR5 (via 2x SO-DIMM slots). " +
  "Storage: NVMe SSDs 500GB Display: 15.6-inch Full HD (1920 x 1080) anti-glare display with " +
  "NanoEdge bezels. Graphics: Integrated Intel Graphics, Iris Xe, or Intel Arc. Battery: 42Wh " +
  "to 50Wh 3-cell Li-ion battery supporting 65W Type-C fast charging. Connectivity: 2x USB 3.2 " +
  "Gen 2 Type-C (with display and power delivery), 2x USB 3.2 Gen 1 Type-A, 1x HDMI 1.4, RJ45 " +
  "Ethernet, and a 3.5mm audio jack.";

const mkRfq = (spec) => ({
  id: 914,
  rfq_no: 536501,
  title: "Laptop procurement",
  is_tender: 0,
  company_name: "Kamat Hotels (India) Ltd",
  bid_end_date: "2099-08-31 16:00",
  comment: "",
  terms: [],
  products: [
    {
      id: 5001,
      product_id: 3001,
      variant: 0,
      product_details: [{ name: "LAPTOP" }],
      product_specs: [
        { title: "Quantity", value: "1" },
        { title: "Unit", value: "NO" },
        { title: "Spec", value: spec },
      ],
      tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
    },
  ],
  quotations: [],
});

/**
 * jsdom reports every box as 0x0, so ReadMore's `scrollHeight > clientHeight`
 * check can never fire on its own. Stand in for layout: 60 characters to a
 * line, 20px a line, and a visible box exactly as tall as the element's own
 * `-webkit-line-clamp` (which jsdom does keep). An element therefore overflows
 * exactly when its text runs past the lines it is clamped to — so the clamp is
 * really under test here, not assumed.
 */
const CHARS_PER_LINE = 60;
const LINE_PX = 20;
let layout;
beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
  layout = [
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight"),
    Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight"),
  ];
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get() {
      return Math.ceil((this.textContent || "").length / CHARS_PER_LINE) * LINE_PX;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      const clamp = parseInt(this.style?.WebkitLineClamp, 10);
      // Unclamped elements show everything, so they never overflow.
      return Number.isNaN(clamp) ? this.scrollHeight : clamp * LINE_PX;
    },
  });
});
afterAll(() => {
  if (layout[0]) Object.defineProperty(HTMLElement.prototype, "scrollHeight", layout[0]);
  if (layout[1]) Object.defineProperty(HTMLElement.prototype, "clientHeight", layout[1]);
});

beforeEach(() => jest.clearAllMocks());

const renderWizard = async (spec) => {
  getRFQById.mockResolvedValue({ data: mkRfq(spec) });
  const utils = render(<SendQuoteWizard />);
  await screen.findByText("What you're quoting", {}, { timeout: 5000 });
  return utils;
};

/** The product row inside the "What you're quoting" panel. */
const quotingPanel = (container) =>
  [...container.querySelectorAll('[class*="previewRow"]')][0];

describe("the buyer's specification on step 1", () => {
  test("the whole spec is rendered, not just its first line", async () => {
    const { container } = await renderWizard(LONG_SPEC);
    // The tail of the spec — everything past the old one-line cut — must be here.
    expect(quotingPanel(container).textContent).toContain("3.5mm audio jack");
  });

  test("a long spec offers Read More, and it expands", async () => {
    const { container } = await renderWizard(LONG_SPEC);
    const row = quotingPanel(container);

    const more = await within(row).findByText(/read more/i);
    await userEvent.click(more);

    expect(within(row).getByText(/read less/i)).toBeInTheDocument();
    expect(within(row).queryByText(/read more/i)).not.toBeInTheDocument();
  });

  test("a short spec gets no Read More control", async () => {
    const { container } = await renderWizard("Blue, 10mm");
    const row = quotingPanel(container);

    expect(within(row).queryByText(/read more/i)).not.toBeInTheDocument();
    expect(row.textContent).toContain("Blue, 10mm");
  });

  test("a product with no spec still says so", async () => {
    const { container } = await renderWizard("");
    const row = quotingPanel(container);

    expect(row.textContent).toContain("No additional information");
    expect(within(row).queryByText(/read more/i)).not.toBeInTheDocument();
  });
});
