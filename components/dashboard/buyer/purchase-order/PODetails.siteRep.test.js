// The legacy PO detail's "Site Rep" button used to open AddSiteRepModal,
// which sends no hotel and is refused on a multi-hotel PO. Site reps now
// live on the new PO page's Deliveries tab (hotel-aware), so the button
// goes there.

jest.mock("next/navigation", () => ({ __esModule: true, useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => false }));
jest.mock("@/hooks/useHasTechClauses", () => ({ __esModule: true, default: () => ({ hasClauses: true, loading: false }) }));
jest.mock("@/services/po", () => ({
  __esModule: true,
  handleDeleteMilestone: jest.fn(), handleDeleteTask: jest.fn(), handleGetTasks: jest.fn(() => Promise.resolve({ data: [], total: 0 })),
  handleUpdateGST: jest.fn(), handleUpdateHSN: jest.fn(), handleRegeneratePO: jest.fn(), handleUploadPODocument: jest.fn(),
  handleAddSiteRep: jest.fn(),
}));
jest.mock("@/services/project", () => ({ __esModule: true, getProjectAvailableBudget: jest.fn(() => Promise.resolve(null)) }));
jest.mock("@/components/dashboard/buyer/approval/ApprovalWorkflowSection", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import PODetails from "./PODetails";

it("Site Rep opens the PO's Deliveries tab instead of the hotel-less modal", () => {
  render(
    <PODetails
      data={{ id: 42, po_number: "PO-42", status: "approved", products: [], product_details: [], payment_milestones: [], hsn_codes: [] }}
      handlePODecision={jest.fn()}
      refetchPODetails={jest.fn()}
      companyUsers={[]}
      canWrite
    />
  );
  const link = screen.getByRole("link", { name: /Site Rep/ });
  expect(link).toHaveAttribute("href", "/dashboard/buyer/purchase-orders/42?tab=deliveries");
  expect(screen.queryByText("Assign Site Representative")).not.toBeInTheDocument();
});
