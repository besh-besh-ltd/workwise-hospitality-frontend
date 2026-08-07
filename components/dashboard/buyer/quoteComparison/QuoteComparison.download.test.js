// The DOWNLOAD CLICK PATH on the embedded quote comparison surface.
//
// quoteComparisonExcel.test.js proves the workbooks are correct as files. This
// proves the buttons are wired to them: that they render, that clicking one
// produces a real .xlsx Blob with the right filename, that the control disables
// while working, and that they are withheld while quotes are still sealed.
//
// Everything up to the browser's own save dialog is covered here — the handoff
// to file-saver is asserted, and file-saver itself is already relied on by the
// vendor Send-Quote wizard in this app.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({
    query: {},
    asPath: "/dashboard/buyer/rfq-management-details?id=346",
    pathname: "/dashboard/buyer/rfq-management-details",
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/components/shared/AccessDeniedPage", () => ({
  __esModule: true,
  default: () => <div>access denied</div>,
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  default: () => ({ canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false }),
}));
jest.mock("@/services/pricing", () => ({
  __esModule: true,
  getQuoteComparisonView: jest.fn(),
}));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  finalizeQuotation: jest.fn(() => Promise.resolve({})),
  getRFQById: jest.fn(() => Promise.resolve({ data: { hotel_ids: [1], department_id: 2 } })),
  getRfqs: jest.fn(() => Promise.resolve([])),
}));
jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  approveNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  rejectNegotiationQuotes: jest.fn(() => Promise.resolve({})),
  getNegotiationApprovalBundle: jest.fn(() => Promise.resolve({ data: {} })),
}));
// The one external boundary: capture what the app hands the browser to save.
jest.mock("file-saver", () => ({ __esModule: true, saveAs: jest.fn() }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { saveAs } from "file-saver";

import { getQuoteComparisonView } from "@/services/pricing";
import QuoteComparison from "./QuoteComparison";

const RFQ_ID = "346";

const cell = (over = {}) => ({
  base: 100, subtotal: 1000, tax_pct: 18, tax_amt: 180, total: 1250,
  freight: 50, packaging: 20, other_charges: [], global_charges: [],
  delivery: 7, pay: "30 days", comment: "", docs: 0, missing: false,
  history: [], ...over,
});

const viewPayload = (over = {}) => ({
  rfq: {
    id: 346, rfq_no: 535900, number: "535900", title: "Calculation RFQ",
    status: "Commercial evaluation", project_id: null,
    quotes_invited: 2, quotes_received: 2, rounds: { ended: 18, active: 0 },
  },
  quotes_locked: false,
  bid_end_date: "2026-05-05T09:03:00.000Z",
  vendors: [
    { id: 11, name: "Metro Supplies", short: "MS" },
    { id: 22, name: "Sharma Traders", short: "ST" },
  ],
  categories: [{ id: 388, name: "Services" }],
  products: [
    {
      id: 901, name: "Bed linen", qty: 10, unit: "set", category: 388,
      state: "open", finalized_vendor: null, quoted_count: 2,
      lpr: { rate: 130, landed_unit: 130, date: "2026-01-02" },
      round: { n: 2, when: "2026-05-01" },
      tech: { configured: false, scores: {} },
      approval: { current_approvers: [], trail: [] },
      quotes: { 11: cell(), 22: cell({ base: 120, subtotal: 1200, total: 1470 }) },
    },
  ],
  approval_chain: [],
  negotiation_metrics: {
    available: true, rounds_created: 18, rounds_ran: 18, rounds_cancelled: 0,
    products_negotiated: 1, pairs_counted: 1,
    baseline_total: 3000, achieved_total: 2400, gain_value: 600, gain_pct: 20,
    pairs_counted_awarded: 0, baseline_total_awarded: 0, achieved_total_awarded: 0,
    gain_value_awarded: 0, gain_pct_awarded: null, baseline_sources: { quote_history: 1 },
  },
  ...over,
});

const renderEmbedded = async (over) => {
  getQuoteComparisonView.mockResolvedValue(viewPayload(over));
  const utils = render(<QuoteComparison rfqId={RFQ_ID} embedded />);
  await waitFor(() => expect(getQuoteComparisonView).toHaveBeenCalled());
  return utils;
};

beforeEach(() => jest.clearAllMocks());

describe("quote comparison — Excel download controls", () => {
  test("both buttons are offered on the embedded surface", async () => {
    await renderEmbedded();
    expect(await screen.findByRole("button", { name: /comparison \.xlsx/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /summary \.xlsx/i })).toBeInTheDocument();
  });

  test("clicking Comparison hands a real .xlsx blob to the browser", async () => {
    await renderEmbedded();
    fireEvent.click(await screen.findByRole("button", { name: /comparison \.xlsx/i }));

    await waitFor(() => expect(saveAs).toHaveBeenCalledTimes(1));
    const [blob, filename] = saveAs.mock.calls[0];
    expect(filename).toBe("RFQ_535900_quote_comparison.xlsx");
    expect(blob).toBeInstanceOf(Blob);
    // A real workbook, not an empty placeholder.
    expect(blob.size).toBeGreaterThan(2000);
  });

  test("clicking Summary produces the summary workbook under its own name", async () => {
    await renderEmbedded();
    fireEvent.click(await screen.findByRole("button", { name: /summary \.xlsx/i }));

    await waitFor(() => expect(saveAs).toHaveBeenCalledTimes(1));
    const [blob, filename] = saveAs.mock.calls[0];
    expect(filename).toBe("RFQ_535900_summary.xlsx");
    expect(blob.size).toBeGreaterThan(1000);
  });

  test("the control disables while the file is being built", async () => {
    await renderEmbedded();
    const btn = await screen.findByRole("button", { name: /comparison \.xlsx/i });
    fireEvent.click(btn);
    // Generation yields a frame first so the button can repaint; both controls
    // are disabled in that window so a second click cannot start a second build.
    expect(screen.getByRole("button", { name: /summary \.xlsx/i })).toBeDisabled();
    await waitFor(() => expect(saveAs).toHaveBeenCalledTimes(1));
    // …and it comes back afterwards.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /summary \.xlsx/i })).not.toBeDisabled()
    );
  });

  test("no download is offered while quotes are still sealed", async () => {
    await renderEmbedded({ quotes_locked: true });
    await waitFor(() => expect(getQuoteComparisonView).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /comparison \.xlsx/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /summary \.xlsx/i })).not.toBeInTheDocument();
  });
});
