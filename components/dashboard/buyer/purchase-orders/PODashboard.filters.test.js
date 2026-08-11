// PODashboard — the three cosmetic controls a buyer reported on
// /dashboard/buyer/purchase-orders.
//
// 1. "Vendor" rendered as a button with no onClick. Clicking it did nothing;
//    there was no way to see one vendor's orders.
// 2. "Date" likewise.
// 3. "Export" likewise — and "Reports" beside it pointed at a surface that
//    does not exist.
//
// These are wiring tests over the rendered page: they assert what a user can
// do (open the menu, pick a vendor, get a filtered refetch, get a download
// carrying the same filters), never how the component is put together.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 408, hospitality_mappings: [{ hospitality_hotel_id: 1 }] } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, loading: false }),
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPOKpis: jest.fn(() => Promise.resolve({})),
  getPOAwaiting: jest.fn(() => Promise.resolve({ data: [] })),
  getPODashboardList: jest.fn(),
  downloadPOListExcel: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getPODashboardList, downloadPOListExcel } from "@/services/po";
import PODashboard from "./PODashboard";

const VENDORS = [
  { id: 501, key: "501", label: "Alpha Vendor Pvt Ltd", count: 4 },
  { id: 502, key: "502", label: "Beta Vendor Pvt Ltd", count: 2 },
];

const listResponse = (rows = []) => ({
  data: rows,
  total_items: rows.length,
  page: 1,
  limit: 10,
  status_counts: { all: rows.length, action_required: 0, approved: 0, rejected: 0 },
  vendors: VENDORS,
});

const row = (over = {}) => ({
  id: 1,
  po_number: "PO-1",
  rfq_no: "77",
  status: "approved",
  vendor: { id: 501, name: "Alpha Vendor Pvt Ltd", short: "AV" },
  items_label: "Widget",
  items_count: 1,
  quantity: 2,
  total_value: 1000,
  initiator: null,
  created_at: "2026-08-01T06:00:00.000Z",
  current_approvers: [],
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
  getPODashboardList.mockResolvedValue(listResponse([row()]));
});

const renderPage = async () => {
  render(<PODashboard />);
  await screen.findByText("All purchase orders");
};

/** The params of the most recent list fetch. */
const lastListParams = () =>
  getPODashboardList.mock.calls[getPODashboardList.mock.calls.length - 1][0];

describe("PO dashboard filter bar", () => {
  it("the Vendor button opens the server-supplied vendor list and filtering refetches with vendor_id", async () => {
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Vendor/i }));
    // The options come from the response facet, not from the rows on screen —
    // a page of 10 rows must not decide which vendors are offered.
    expect(screen.getByText("Beta Vendor Pvt Ltd")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Beta Vendor Pvt Ltd"));

    await waitFor(() => expect(lastListParams().vendor_id).toBe(502));
    // ...and the page resets, so a narrowed result is not hidden behind
    // pagination.
    expect(lastListParams().page).toBe(1);

    // Clearing it removes the parameter entirely rather than sending a falsy one.
    fireEvent.click(screen.getByRole("button", { name: /Beta Vendor Pvt Ltd/i }));
    fireEvent.click(screen.getByText("All vendors"));
    await waitFor(() => expect(lastListParams().vendor_id).toBeUndefined());
  });

  it("the Date button applies a financial-year window as date_from/date_to", async () => {
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: /^Date$/i }));
    const fyOption = screen.getAllByText(/^FY \d{4}-\d{2}$/)[0];
    const fy = fyOption.textContent.replace("FY ", "");
    fireEvent.click(fyOption);

    const startYear = parseInt(fy.slice(0, 4), 10);
    await waitFor(() => {
      expect(lastListParams().date_from).toBe(`${startYear}-04-01`);
      expect(lastListParams().date_to).toBe(`${startYear + 1}-03-31`);
    });
  });

  it("a custom range sends exactly the two dates entered", async () => {
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: /^Date$/i }));
    fireEvent.click(screen.getByText("Custom range…"));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-01-01" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-01-31" } });

    await waitFor(() => {
      expect(lastListParams().date_from).toBe("2026-01-01");
      expect(lastListParams().date_to).toBe("2026-01-31");
    });
  });
});

describe("PO dashboard header actions", () => {
  it("Export downloads with the filters currently applied to the table", async () => {
    await renderPage();

    // Narrow first, then export — the file must be the table, not everything.
    fireEvent.click(screen.getByRole("button", { name: /Vendor/i }));
    fireEvent.click(screen.getByText("Beta Vendor Pvt Ltd"));
    await waitFor(() => expect(lastListParams().vendor_id).toBe(502));

    fireEvent.click(screen.getByRole("button", { name: /^Export$/i }));

    await waitFor(() => expect(downloadPOListExcel).toHaveBeenCalledTimes(1));
    const params = downloadPOListExcel.mock.calls[0][0];
    expect(params.vendor_id).toBe(502);
    expect(params.status).toBe("all");
    // No page/limit: an export is the whole filtered set.
    expect(params.page).toBeUndefined();
    expect(params.limit).toBeUndefined();
  });

  it("switching to a status tab is carried into the export", async () => {
    await renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Rejected/i }));
    await waitFor(() => expect(lastListParams().status).toBe("rejected"));

    fireEvent.click(screen.getByRole("button", { name: /^Export$/i }));
    await waitFor(() => expect(downloadPOListExcel).toHaveBeenCalled());
    expect(downloadPOListExcel.mock.calls[0][0].status).toBe("rejected");
  });

  it("no dead controls are left in the header or the row actions", async () => {
    await renderPage();
    // "Reports" had no onClick and no destination.
    expect(screen.queryByRole("button", { name: /Reports/i })).not.toBeInTheDocument();
    // Per-row "More" (⋯) opened nothing.
    expect(screen.queryByTitle("More")).not.toBeInTheDocument();
  });
});
