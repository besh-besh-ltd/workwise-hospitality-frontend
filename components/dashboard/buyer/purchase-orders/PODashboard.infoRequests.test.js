jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, push: jest.fn(), replace: jest.fn() }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 408, hospitality_mappings: [{ hospitality_hotel_id: 1 }] } }),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, loading: false }),
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPOKpis: jest.fn(() => Promise.resolve({})),
  getPOAwaiting: jest.fn(),
  getPODashboardList: jest.fn(() => Promise.resolve({ data: [], total_items: 0, page: 1, limit: 10, status_counts: {}, vendors: [] })),
  downloadPOListExcel: jest.fn(() => Promise.resolve()),
}));

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { getPOAwaiting } from "@/services/po";
import PODashboard from "./PODashboard";

const REQ = { send_back_id: 3, po_id: 77, po_number: "138800", rfq_no: 536900, reason_category: "PRICE_TAX_QUERY", requested_by: "Vishal Kamat", since: "2026-10-20T10:00:00Z" };

describe("PODashboard: information requested from you", () => {
  test("lists each request and links to the PO", async () => {
    getPOAwaiting.mockResolvedValue({ data: [], information_requests: [REQ] });
    render(<PODashboard />);
    expect(await screen.findByText("Information requested from you")).toBeInTheDocument();
    expect(screen.getByText(/138800/)).toBeInTheDocument();
    expect(screen.getByText(/Question on price, GST or calculation/)).toBeInTheDocument();
    expect(screen.getByText(/Vishal Kamat/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /138800/ })).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/77");
  });

  test("an old backend (no information_requests) renders nothing extra", async () => {
    getPOAwaiting.mockResolvedValue({ data: [] });
    render(<PODashboard />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Awaiting your approval" })).toBeInTheDocument());
    expect(screen.queryByText("Information requested from you")).toBeNull();
  });

  test("an empty array renders nothing extra", async () => {
    getPOAwaiting.mockResolvedValue({ data: [], information_requests: [] });
    render(<PODashboard />);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Awaiting your approval" })).toBeInTheDocument());
    expect(screen.queryByText("Information requested from you")).toBeNull();
  });
});
