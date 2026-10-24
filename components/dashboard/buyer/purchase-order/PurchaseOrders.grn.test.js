// D4: the legacy PO page's GRN action opened UpdateGRNModal and called
// handleMarkGRN(po_id, file) (a file where the API expects a payload), a
// one-click status flip with no quantities. Receiving now happens on the
// inventory Receive screen, so the action routes there.

const mockPush = jest.fn();
jest.mock("next/router", () => ({
  __esModule: true,
  useRouter: () => ({ query: { rfq: "5" }, isReady: true, push: mockPush, replace: jest.fn() }),
}));
jest.mock("react-redux", () => ({
  __esModule: true,
  useSelector: (fn) => fn({ userProfile: { id: 125, hospitality_mappings: [{ hospitality_hotel_id: 1 }] } }),
}));
jest.mock("react-toastify", () => ({
  __esModule: true,
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/hooks/useModulePermissions", () => ({
  __esModule: true,
  useModulePermissions: () => ({
    canRead: true, canCreate: true, canUpdate: true, canApprove: true, canRegenerate: false,
    allowedProcessIds: null, isProcessAllowed: () => true, loading: false,
  }),
}));
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));
jest.mock("@/services/rfq", () => ({
  __esModule: true,
  getRfqs: jest.fn(() => Promise.resolve([])),
  getRFQById: jest.fn(() => Promise.resolve({ data: { id: 5, rfq_no: 536900, status: 1, hotel_id: 1 } })),
}));
jest.mock("@/services/po", () => ({
  __esModule: true,
  getPoData: jest.fn(() => Promise.resolve({ data: [{ id: 42, po_number: "PO-42", status: "dispatched" }], total: 1 })),
  getPoDetails: jest.fn(() => Promise.resolve(null)),
  handlePOApproval: jest.fn(),
  handlePOInitialization: jest.fn(),
  updatePODetails: jest.fn(),
  handleMarkGRN: jest.fn(),
}));
jest.mock("@/services/Auth", () => ({ __esModule: true, getCompanyUsers: jest.fn(() => Promise.resolve({ data: [] })) }));
jest.mock("@/components/layout/DashboardShell", () => ({
  __esModule: true,
  TwoPanelPage: ({ children }) => <div>{children}</div>,
}));
jest.mock("@/components/shared/RFQListSidebar", () => ({ __esModule: true, default: () => null }));
jest.mock("./PODetails", () => ({ __esModule: true, default: () => null }));
// The listing's "Mark GRN" confirm ends in handlePODecision(id, {type:'grn_update'}).
jest.mock("./POListing", () => ({
  __esModule: true,
  default: ({ poList, handlePODecision }) => (
    <button type="button" onClick={() => handlePODecision(poList[0].id, { type: "grn_update" }, poList[0])}>
      Mark GRN
    </button>
  ),
}));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import { handleMarkGRN } from "@/services/po";
import PurchaseOrders from "./PurchaseOrders";

beforeEach(() => jest.clearAllMocks());

it("the GRN action opens the inventory Receive screen for that PO", async () => {
  render(<PurchaseOrders />);
  fireEvent.click(await screen.findByRole("button", { name: "Mark GRN" }));

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/dashboard/buyer/inventory/receive/42"));
  expect(handleMarkGRN).not.toHaveBeenCalled();
  // No upload-a-GRN-file modal any more.
  expect(screen.queryByText(/upload/i)).not.toBeInTheDocument();
});
