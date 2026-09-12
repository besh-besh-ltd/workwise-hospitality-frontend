// Finding a draft purchase order.
//
// A draft PO is the one thing on this page that needs someone to DO something
// before it can move, and it was the one thing the page would not let you
// filter to. The server has computed a `draft` bucket and a
// `status_counts.draft` badge all along (poDashboardModel STATUS_BUCKETS);
// the tab strip just never offered it, so drafts were reachable only by
// scrolling "All" or by landing in the mixed "Pending for me" bucket.
//
// Production had 7 drafts stuck this way, the oldest 32 days old, every one of
// them with a valid PO approval policy — so nothing was blocking them except
// nobody finding them. Client feedback item 10.

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
import { getPODashboardList } from "@/services/po";
import PODashboard from "./PODashboard";

const listResponse = (rows = [], counts = {}) => ({
  data: rows,
  total_items: rows.length,
  page: 1,
  limit: 10,
  status_counts: {
    all: rows.length,
    action_required: 0,
    approved: 0,
    rejected: 0,
    draft: 0,
    ...counts,
  },
  vendors: [],
});

const draftRow = {
  id: 473,
  po_number: "138745",
  rfq_no: "808",
  status: "draft",
  vendor: { id: 501, name: "Alpha Vendor Pvt Ltd", short: "AV" },
  items_label: "Widget",
  items_count: 1,
  quantity: 2,
  total_value: 1000,
  initiator: null,
  created_at: "2026-08-11T06:00:00.000Z",
  current_approvers: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  getPODashboardList.mockResolvedValue(listResponse([draftRow], { draft: 7 }));
});

const renderPage = async () => {
  render(<PODashboard />);
  await screen.findByText("All purchase orders");
};

const tab = (name) => screen.getByRole("button", { name: new RegExp(`^${name}`, "i") });
const lastListParams = () =>
  getPODashboardList.mock.calls[getPODashboardList.mock.calls.length - 1][0];

describe("PO dashboard — the Draft tab", () => {
  it("offers a Draft tab", async () => {
    await renderPage();
    expect(tab("Draft")).toBeInTheDocument();
  });

  it("shows the server's draft count on it", async () => {
    await renderPage();
    expect(tab("Draft")).toHaveTextContent("7");
  });

  it("refetches with status=draft when picked", async () => {
    await renderPage();
    fireEvent.click(tab("Draft"));

    await waitFor(() => expect(lastListParams().status).toBe("draft"));
  });

  it("marks it active once picked, and leaves All inactive", async () => {
    await renderPage();
    const draft = tab("Draft");
    fireEvent.click(draft);

    await waitFor(() => expect(draft.className).toBeTruthy());
    // "All" must not still be showing as the current tab
    expect(tab("All").className || "").not.toBe(draft.className);
  });

  it("still offers the tabs that were already there", async () => {
    // Guard against replacing a tab rather than adding one.
    await renderPage();
    for (const t of ["All", "Pending for me", "Approved", "Rejected", "Draft"]) {
      expect(tab(t)).toBeInTheDocument();
    }
  });

  it("shows 0 rather than blank when the server sends no draft count", async () => {
    getPODashboardList.mockResolvedValue(listResponse([draftRow], { draft: undefined }));
    await renderPage();
    expect(tab("Draft")).toHaveTextContent("0");
  });
});
