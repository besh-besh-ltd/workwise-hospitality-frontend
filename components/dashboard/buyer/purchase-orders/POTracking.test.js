// PO tracking (buyer). D5: the expanded row offered buyers "Mark dispatched",
// which calls a vendor-only endpoint (acl([3])) and is the vendor's step to
// confirm anyway. Buyers keep "Open PO" only.

jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: {}, isReady: true, push: mockPush, replace: jest.fn() }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 125, hospitality_mappings: [{ hospitality_hotel_id: 1 }] } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
// Full write rights: the action must be gone for every buyer, not just hidden
// from read-only ones.
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({ canRead: true, canCreate: true, canUpdate: true, canApprove: true, loading: false }),
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPOTracking: jest.fn(),
  downloadPOTrackingExcel: jest.fn(() => Promise.resolve()),
  handleMarkDispatched: jest.fn(() => Promise.resolve({})),
}));

const mockPush = jest.fn();

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import { getPOTracking, handleMarkDispatched } from "@/services/po";
import POTracking from "./POTracking";

const STAGES = [
  { key: "approved", label: "Approved", status: "done", when: "2026-10-20T05:00:00.000Z" },
  { key: "sent", label: "PO sent", status: "done", when: "2026-10-20T06:00:00.000Z" },
  { key: "ack", label: "Acknowledged", status: "current", when: "2026-10-21T06:00:00.000Z" },
  { key: "dispatched", label: "Dispatched", status: "pending", when: null },
  { key: "grn", label: "GRN received", status: "pending", when: null },
];

beforeEach(() => {
  jest.clearAllMocks();
  getPOTracking.mockResolvedValue({
    data: [
      {
        id: 701,
        po_number: "PO-701",
        rfq_no: "536900",
        vendor: { id: 9, name: "Alpha Supplies" },
        items_label: "Basmati rice",
        items_count: 1,
        current_stage: "ack",
        stages: STAGES,
        progress: 40,
        total_value: 125000,
        completed: false,
      },
    ],
    tab_counts: { active: 1 },
    total_items: 1,
  });
});

it("tracking page has no Mark dispatched for buyers", async () => {
  render(<POTracking />);

  // Expand the acknowledged PO: this is where the action used to render.
  fireEvent.click(await screen.findByText("#PO-701"));
  expect(await screen.findByText("Next milestone:", { exact: false })).toBeInTheDocument();

  expect(screen.queryByRole("button", { name: /mark dispatched/i })).not.toBeInTheDocument();
  expect(screen.queryByText(/mark dispatched/i)).not.toBeInTheDocument();
  expect(handleMarkDispatched).not.toHaveBeenCalled();

  // "Open PO" is still the way into the order.
  const openButtons = screen.getAllByRole("button", { name: /open po/i });
  fireEvent.click(openButtons[openButtons.length - 1]);
  expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/purchase-orders/701");
});

it("the site-rep banner describes links that exist (no 'sent on dispatch confirmation')", async () => {
  render(<POTracking />);
  await screen.findByText("#PO-701");
  expect(screen.queryByText(/dispatch confirmation/i)).not.toBeInTheDocument();
  expect(screen.getByText(/valid for 14 days/i)).toBeInTheDocument();
});
