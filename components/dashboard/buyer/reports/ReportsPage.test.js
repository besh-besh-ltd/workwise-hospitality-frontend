/**
 * Reports catalogue + runner.
 *
 * The load-bearing assertion here is that the page does NOT decide what a user
 * may see. The catalogue endpoint returns only the reports they hold a
 * permission for, and the page renders that list verbatim — so these tests
 * feed it a catalogue and check it renders exactly that, rather than checking
 * a client-side permission rule that must not exist.
 */

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, push: jest.fn(), replace: jest.fn() }),
}));

// The state object is built ONCE inside the factory, not per call. HotelFilter
// runs `useEffect(..., [userProfile])`, so handing it a fresh object on every
// render makes that effect fire forever and the suite hangs rather than fails.
jest.mock("react-redux", () => {
  const state = {
    userProfile: {
      id: 408,
      hospitality_mappings: [
        { hospitality_hotel_id: 1, hotel_name: "Hotel One" },
        { hospitality_hotel_id: 2, hotel_name: "Hotel Two" },
      ],
    },
  };
  return { __esModule: true, useSelector: (fn) => fn(state) };
});

jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.mock("@/services/reports", () => ({
  __esModule: true,
  getReportCatalogue: jest.fn(),
  previewReport: jest.fn(),
  downloadReport: jest.fn(() => Promise.resolve()),
}));

import fs from "fs";
import path from "path";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ReportsPage from "./ReportsPage";
import { getReportCatalogue, previewReport, downloadReport } from "@/services/reports";

const SPEND_BY_VENDOR = {
  key: "spend_by_vendor",
  number: "1.4",
  family: "Spend Analytics",
  title: "Spend by Vendor",
  description: "Every vendor ranked by spend for the period.",
  filters: [
    { key: "fy", type: "fy", label: "Financial year" },
    { key: "hotel_ids", type: "hotels", label: "Business unit" },
  ],
  readiness: { state: "ready" },
  runnable: true,
};

const BUDGET_VS_ACTUAL = {
  key: "budget_vs_actual",
  number: "4.1",
  family: "Budget & Cost Control",
  title: "Budget vs Actual",
  description: "Actual spend against budget.",
  filters: [],
  readiness: {
    state: "not_configured",
    missing: "No budgets are held in the platform.",
  },
  runnable: false,
};

const PREVIEW = {
  key: "spend_by_vendor",
  title: "Spend by Vendor",
  period: { label: "2026-27", from: "2026-04-01", to: "2027-04-01" },
  columns: [
    { header: "Rank", key: "rank", type: "int", align: "right" },
    { header: "Vendor Name", key: "vendor_name", type: "text", align: "left" },
    { header: "Spend (₹)", key: "amount", type: "money", align: "right" },
  ],
  rows: [{ rank: 1, vendor_name: "Acme Supplies", amount: 1234567 }],
  total_rows: 1,
  truncated: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  previewReport.mockResolvedValue({ data: PREVIEW });
});

describe("ReportsPage — the catalogue", () => {
  it("renders exactly the reports the server returned, grouped by family", async () => {
    getReportCatalogue.mockResolvedValue({
      data: { reports: [SPEND_BY_VENDOR, BUDGET_VS_ACTUAL] },
    });
    render(<ReportsPage />);

    expect(await screen.findByText("Spend by Vendor")).toBeInTheDocument();
    expect(screen.getByText("Budget vs Actual")).toBeInTheDocument();
    expect(screen.getByText("Spend Analytics")).toBeInTheDocument();
    expect(screen.getByText("Budget & Cost Control")).toBeInTheDocument();

    // Nothing the server withheld appears, because the page has no list of its
    // own to fall back on.
    expect(screen.queryByText("Approval Audit Trail")).not.toBeInTheDocument();
  });

  it("disables a not-configured report and says what is missing, instead of hiding it", async () => {
    getReportCatalogue.mockResolvedValue({
      data: { reports: [SPEND_BY_VENDOR, BUDGET_VS_ACTUAL] },
    });
    render(<ReportsPage />);

    await screen.findByText("Budget vs Actual");
    // Hiding it would read as "you lack permission" for a problem no
    // administrator can fix.
    expect(screen.getByText("No budgets are held in the platform.")).toBeInTheDocument();
    expect(screen.getByLabelText("Budget vs Actual — not available")).toBeDisabled();
    expect(screen.getByLabelText("Spend by Vendor")).not.toBeDisabled();
  });

  it("shows the access-denied state when the catalogue comes back empty", async () => {
    getReportCatalogue.mockResolvedValue({ data: { reports: [] } });
    render(<ReportsPage />);

    expect(await screen.findByText(/No reports available/i)).toBeInTheDocument();
  });

  it("does not leave a spinner up when the catalogue call fails", async () => {
    getReportCatalogue.mockRejectedValue(new Error("boom"));
    render(<ReportsPage />);

    expect(await screen.findByText(/No reports available/i)).toBeInTheDocument();
  });
});

describe("ReportRunner — filters, preview and download", () => {
  const openRunner = async () => {
    getReportCatalogue.mockResolvedValue({ data: { reports: [SPEND_BY_VENDOR] } });
    render(<ReportsPage />);
    fireEvent.click(await screen.findByLabelText("Spend by Vendor"));
    await screen.findByRole("button", { name: /Download Excel/i });
  };

  it("previews the report on open and renders the server's columns", async () => {
    await openRunner();

    await waitFor(() => expect(previewReport).toHaveBeenCalled());
    expect(previewReport.mock.calls[0][0]).toBe("spend_by_vendor");

    expect(await screen.findByText("Vendor Name")).toBeInTheDocument();
    expect(screen.getByText("Spend (₹)")).toBeInTheDocument();
    expect(screen.getByText("Acme Supplies")).toBeInTheDocument();
    // Money is formatted for display with Indian grouping.
    expect(screen.getByText("12,34,567")).toBeInTheDocument();
  });

  it("downloads with the filters currently on screen, and sends no ids", async () => {
    await openRunner();
    await waitFor(() => expect(previewReport).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Download Excel/i }));
    await waitFor(() => expect(downloadReport).toHaveBeenCalledTimes(1));

    const [key, payload] = downloadReport.mock.calls[0];
    expect(key).toBe("spend_by_vendor");
    // The period the preview ran with, carried through unchanged.
    expect(payload).toHaveProperty("fy");
    // Scope comes from the session. A payload carrying a company id would mean
    // the client believed it could choose one.
    expect(payload).not.toHaveProperty("company_id");
    expect(payload).not.toHaveProperty("hospitality_company_id");
  });

  it("sends the same payload to preview and to download", async () => {
    await openRunner();
    await waitFor(() => expect(previewReport).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /Download Excel/i }));
    await waitFor(() => expect(downloadReport).toHaveBeenCalled());

    const previewPayload = previewReport.mock.calls[previewReport.mock.calls.length - 1][1];
    expect(downloadReport.mock.calls[0][1]).toEqual(previewPayload);
  });

  it("will not offer a download when the filters match nothing", async () => {
    previewReport.mockResolvedValue({
      data: { ...PREVIEW, rows: [], total_rows: 0 },
    });
    await openRunner();

    expect(await screen.findByText(/Nothing to report/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download Excel/i })).toBeDisabled();
  });

  it("goes back to the catalogue", async () => {
    await openRunner();
    fireEvent.click(screen.getByRole("button", { name: /All reports/i }));
    expect(await screen.findByText("Spend Analytics")).toBeInTheDocument();
  });
});

describe("the arc_v2 classes this page leans on actually exist", () => {
  // jsdom does not load the stylesheet, so asserting a className proves nothing
  // about whether it renders. Read the file instead — same guard RfqListPage
  // uses.
  it("defines every global primitive used here", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "styles/arc_v2.css"), "utf8");
    for (const cls of [
      ".main-body", ".page-h1", ".page-sub", ".page-eyebrow", ".section-label",
      ".kpi-grid", ".kpi-tile", ".kt-row", ".kt-label", ".kt-ic", ".kt-val", ".kt-sub",
      ".contracts-layout", ".filter-sidebar", ".fs-head", ".reset-link",
      ".filter-group", ".fg-label", ".list-toolbar", ".lt-left", ".lt-right",
      ".section-card", ".empty-state", ".arc-sk", ".btn", ".btn-sm", ".btn-blue", ".btn-ghost",
    ]) {
      expect(css).toContain(cls);
    }
  });
});
