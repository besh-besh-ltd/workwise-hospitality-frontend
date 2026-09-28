// The files the buyer attached to a product must reach the vendor who is
// quoting it.
//
// Reported 2026-09-23 against RFQ 1104: a buyer attached a technical data
// sheet to a product. The buyer's own RFQ page showed the TDS chip; the
// vendor's quote page showed nothing.
//
// Nothing was lost. `tbl_rfq_product_files` holds the row, and getRfqById
// json_aggs it to every caller — vendors included — as three per-product
// fields: `datasheet_file` (TDS), `spec_file` (SPEC) and `qap_file` (QAP).
// buildInitialQuoteProducts copies all three onto each wizard product. The
// wizard then rendered chips for them in exactly one place: inside
// `evalProducts.map(...)`, the TECHNICAL EVALUATION screen. RFQ 1104 has no
// technical evaluation configured, so that screen never renders and the file
// was invisible on both screens the vendor actually uses.
//
// In production that is 1,083 products across 454 published RFQs whose
// attachments a vendor cannot see while quoting.
//
// Two details these tests pin beyond "show it somewhere":
//   - the fields are json_agg ARRAYS. The old chip did `href={p.datasheet_file}`,
//     which renders one link whose href is the array stringified — fine for one
//     file, a comma-joined broken URL for two. 206 (product, type) groups in
//     production hold more than one file.
//   - the vendor needs them on the screen where they price the line, not only
//     on the overview.

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
    query: { id: "1104", showTechEvalRestrictions: "false" },
    pathname: "/dashboard/vendor/quote",
    push: jest.fn(),
    replace: jest.fn(),
    isReady: true,
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
  }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 195, name: "Test Vendor" } }),
}));

import React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import { getRFQById } from "@/services/rfq";
import SendQuoteWizard from "./SendQuoteWizard";

// The real file on RFQ 1104's product.
const TDS = "https://test-workwise-bucket.s3.ap-south-1.amazonaws.com/1789996591238-85181e2f-5a2a-4c6e-b8ab-5282aa2ea44b.pdf";
const TDS_2 = "https://test-workwise-bucket.s3.ap-south-1.amazonaws.com/second-datasheet.pdf";
const SPEC = "https://test-workwise-bucket.s3.ap-south-1.amazonaws.com/spec-drawing.pdf";
const QAP = "https://test-workwise-bucket.s3.ap-south-1.amazonaws.com/quality-plan.pdf";

/**
 * RFQ 1104's shape: one product, technical evaluation NOT configured, and the
 * buyer's files arriving as json_agg arrays (null when the buyer attached none).
 */
const mkRfq = ({ datasheet_file = null, spec_file = null, qap_file = null } = {}) => ({
  id: 1104,
  rfq_no: 536638,
  title: "The Orchid Hotel Pune - LED Zoom Light for mirage lobby",
  is_tender: 0,
  company_name: "Kamat Hotels (India) Ltd",
  bid_end_date: "2099-09-22 12:04",
  comment: "",
  terms: [],
  products: [
    {
      id: 5952,
      product_id: 13481,
      variant: 0,
      product_details: [{ name: "LED LIGHTS" }],
      product_specs: [
        { title: "Quantity", value: "20" },
        { title: "Unit", value: "NOS" },
        { title: "Size", value: "200 mm × 150 mm" },
        { title: "Spec", value: "Supply of luker 50W LED canopy Zoom Light PRODUCT CODE LZCOB50 WARM WHITE." },
      ],
      datasheet_file,
      spec_file,
      qap_file,
      tech_evaluation_status: { has_tech_eval: false, is_accepted: false },
    },
  ],
  quotations: [],
});

beforeAll(() => {
  window.scrollTo = jest.fn();
  Element.prototype.scrollIntoView = jest.fn();
});
beforeEach(() => jest.clearAllMocks());

const renderWizard = async (files) => {
  getRFQById.mockResolvedValue({ data: mkRfq(files) });
  const utils = render(<SendQuoteWizard />);
  await screen.findByText("What you're quoting", {}, { timeout: 5000 });
  return utils;
};

/** The pricing step is gated behind the terms acknowledgement, as on the real
 *  page ("Step 1 of 4. Acknowledge the terms above to continue."). */
const gotoPricing = async () => {
  await userEvent.click(screen.getByRole("checkbox", { name: /accept the terms/i }));
  const tab = (await screen.findAllByText("Pricing"))[0];
  await userEvent.click(tab.closest("button") || tab);
};

/** The product row in the "What you're quoting" panel on step 1. */
const quotingRow = (container) => [...container.querySelectorAll('[class*="previewRow"]')][0];
/** The first line card on the pricing step. */
const firstLineCard = (container) => [...container.querySelectorAll('[class*="lineCard"]')][0];

const linksTo = (scope, url) => [...scope.querySelectorAll(`a[href="${url}"]`)];

describe("the buyer's attachments on the screens a vendor quotes from", () => {
  test("a TDS reaches the vendor even with no technical evaluation — RFQ 1104", async () => {
    const { container } = await renderWizard({ datasheet_file: [TDS] });

    expect(linksTo(quotingRow(container), TDS)).toHaveLength(1);
  });

  test("the vendor can still see it on the screen where they price the line", async () => {
    const { container } = await renderWizard({ datasheet_file: [TDS] });
    await gotoPricing();

    expect(linksTo(firstLineCard(container), TDS)).toHaveLength(1);
  });

  test("two datasheets render as two working links, not one broken one", async () => {
    const { container } = await renderWizard({ datasheet_file: [TDS, TDS_2] });
    const row = quotingRow(container);

    expect(linksTo(row, TDS)).toHaveLength(1);
    expect(linksTo(row, TDS_2)).toHaveLength(1);
    // The old `href={array}` produced a single comma-joined URL.
    expect(row.querySelector(`a[href*="${TDS},"]`)).toBeNull();
  });

  test("specification and quality-plan files come through too", async () => {
    const { container } = await renderWizard({ spec_file: [SPEC], qap_file: [QAP] });
    const row = quotingRow(container);

    expect(linksTo(row, SPEC)).toHaveLength(1);
    expect(linksTo(row, QAP)).toHaveLength(1);
  });

  test("each file says what kind it is, so the vendor knows what they opened", async () => {
    const { container } = await renderWizard({ datasheet_file: [TDS], qap_file: [QAP] });
    const row = quotingRow(container);

    expect(within(row).getByText(/TDS/i)).toBeInTheDocument();
    expect(within(row).getByText(/QAP/i)).toBeInTheDocument();
  });

  test("a product with no attachments grows no empty attachment row", async () => {
    const { container } = await renderWizard({});
    const row = quotingRow(container);

    expect(row.querySelectorAll("a[href]")).toHaveLength(0);
    expect(within(row).queryByText(/TDS/i)).not.toBeInTheDocument();
  });

  test("a single file sent as a bare string still renders (older rows)", async () => {
    const { container } = await renderWizard({ datasheet_file: TDS });

    expect(linksTo(quotingRow(container), TDS)).toHaveLength(1);
  });
});
