// ApprovalWorkflowSection's phone sticky bar (showMobileStickyActions, used by
// the legacy PO page /dashboard/buyer/purchase-order). It used to be its own
// ad-hoc fixed bar (.aws-mobile-sticky); it is now the shared MobileActionBar,
// so every phone decision surface has one implementation: 44px targets,
// safe-area padding, and the FAB / push-prompt clearance that comes with it.

jest.mock("@/hooks/useIsMobile", () => ({ __esModule: true, default: () => mockIsMobile }));
let mockIsMobile = true;

const mockWorkflow = {
  instance: { id: 1, status: "PENDING", current_step: 3, total_steps: 3 },
  previousInstances: [],
  loading: false,
  error: null,
  actionLoading: false,
  canUserApprove: true,
  status: "PENDING",
  currentStep: 3,
  totalSteps: 3,
  steps: [],
  initiatedBy: null,
  isAutoApproved: false,
  autoApprovedReason: null,
  handleApprovalAction: jest.fn(),
  applyOptimisticAction: jest.fn(),
  rollbackOptimisticAction: jest.fn(),
  refetch: jest.fn(),
};
jest.mock("@/hooks/useApprovalWorkflow", () => ({ __esModule: true, default: () => mockWorkflow }));
jest.mock("./ApprovalTimeline", () => ({ __esModule: true, default: () => null }));
jest.mock("../negotiation/SelectedQuotesDisplay", () => ({ __esModule: true, default: () => null }));
jest.mock("../technical-evaluation/TechEvalVendorStatusDisplay", () => ({ __esModule: true, default: () => null }));
jest.mock("./ApprovalActionModal", () => ({
  __esModule: true,
  default: ({ show, actionType }) => (show ? <div role="dialog">action modal: {actionType}</div> : null),
}));
jest.mock("react-toastify", () => ({ __esModule: true, toast: { success: jest.fn(), error: jest.fn() } }));

import React from "react";
import fs from "fs";
import path from "path";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import ApprovalWorkflowSection from "./ApprovalWorkflowSection";

const mount = (props = {}) =>
  render(
    <ApprovalWorkflowSection
      entityType="PO"
      entityId={605}
      entityLabel="Purchase Order #138877"
      showMobileStickyActions
      hideTopButtons
      {...props}
    />
  );

beforeEach(() => {
  mockIsMobile = true;
  mockWorkflow.canUserApprove = true;
});
afterEach(() => document.body.classList.remove("has-mobile-action-bar"));

describe("ApprovalWorkflowSection phone bar", () => {
  it("renders the shared MobileActionBar with the entity and step", async () => {
    mount();
    const region = await screen.findByRole("region", { name: "Approval workflow" });
    expect(region.parentElement).toBe(document.body);
    expect(within(region).getByText("Purchase Order #138877")).toBeInTheDocument();
    expect(within(region).getByText("Step 3/3")).toBeInTheDocument();
    expect(document.querySelector(".aws-mobile-sticky")).toBeNull();
  });

  it("routes Approve and Reject through the approval action modal", async () => {
    mount();
    const region = await screen.findByRole("region", { name: "Approval workflow" });
    fireEvent.click(within(region).getByRole("button", { name: /Approve/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("action modal: APPROVE");
  });

  it("opens the modal in reject mode from Reject", async () => {
    mount();
    const region = await screen.findByRole("region", { name: "Approval workflow" });
    fireEvent.click(within(region).getByRole("button", { name: /Reject/ }));
    expect(screen.getByRole("dialog")).toHaveTextContent("action modal: REJECT");
  });

  it("keeps the opt-in prop API: no bar unless the page asks for it", () => {
    mount({ showMobileStickyActions: false });
    expect(screen.queryByRole("region", { name: "Approval workflow" })).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass("has-mobile-action-bar");
  });

  it("no bar for someone who cannot approve", () => {
    mockWorkflow.canUserApprove = false;
    mount();
    expect(screen.queryByRole("region", { name: "Approval workflow" })).not.toBeInTheDocument();
    expect(document.body).not.toHaveClass("has-mobile-action-bar");
  });

  it("no bar on desktop widths", () => {
    mockIsMobile = false;
    mount();
    expect(screen.queryByRole("region", { name: "Approval workflow" })).not.toBeInTheDocument();
  });

  // The section sits mid-page, so MobileActionBar's in-flow spacer would open
  // a gap in the middle of the page; the host hides it and the page reserves
  // the room at its own bottom (PODetails.js paddingBottom).
  it("hides the bar's in-flow spacer inside the section", () => {
    const src = fs.readFileSync(path.join(__dirname, "ApprovalWorkflowSection.js"), "utf8");
    expect(src).toMatch(/\.aws-mobile-bar-host\s*{\s*display:\s*none;/);
    expect(src).not.toMatch(/\.aws-mobile-sticky\s*{/);
  });
});

describe("legacy PO page (PODetails.js) uses the shared bar too", () => {
  const src = fs.readFileSync(
    path.join(__dirname, "..", "purchase-order", "PODetails.js"),
    "utf8"
  );

  it("renders MobileActionBar instead of the old .mobileApprovalBar div", () => {
    expect(src).toMatch(/<MobileActionBar[\s\S]*label="PO approval"/);
    expect(src).not.toMatch(/className=\{styles\.mobileApprovalBar\}/);
  });

  it("still passes showMobileStickyActions to the new-workflow section", () => {
    expect(src).toMatch(/showMobileStickyActions=\{showMobileApprovalBar\}/);
  });
});
