// Approval workflow wizard — the Group ARC (company-wide) workflow.
//
// A group rate contract covers several hotels and is approved once, by the
// group committee. Its approval hierarchy is its own workflow (ARC_GROUP*
// entity types), saved company-wide (hotel_id null) and process-free, and it
// shows on every business unit's page. There is exactly one per company, so
// the wizard must not create a second one from another hotel's page.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/approval", () => ({
  createApprovalPolicy: jest.fn(),
  updateApprovalPolicy: jest.fn(),
  deleteApprovalPolicy: jest.fn(),
}));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { createApprovalPolicy, updateApprovalPolicy, deleteApprovalPolicy } from "@/services/approval";

import WorkflowWizard from "./WorkflowWizard";
import { ARC_GROUP_FLOW_PROCESS } from "../dashboard/DashboardView";

const baseProps = () => ({
  processes: [{ id: 2, name: "Day to Day Procurement", process_type: "RFQ" }],
  hotel: { id: 12, name: "Goa Beach Resort" },
  companyId: "4",
  hotelId: "12",
  getApproverOptions: jest.fn(() => [{ value: 7, label: "Asha Rao" }]),
  getApproverDisplayInfo: jest.fn(() => ({ name: "Asha Rao", email: "", type: "User", typeLabel: "Specific User", users: [] })),
  onCreateProcess: jest.fn(),
  onSave: jest.fn(),
  onCancel: jest.fn(),
});

beforeEach(() => {
  jest.clearAllMocks();
  createApprovalPolicy.mockResolvedValue({ status: 1 });
  updateApprovalPolicy.mockResolvedValue({ status: 1 });
  deleteApprovalPolicy.mockResolvedValue({ status: 1 });
});

describe("Group ARC workflow", () => {
  test("offers a company-wide Group ARC workflow with its own stages", () => {
    render(<WorkflowWizard {...baseProps()} editingProcess={null} editingPolicies={[]} />);

    fireEvent.click(screen.getByText("Group ARC — covers several hotels (company-wide)"));
    expect(screen.getByText(/one approval hierarchy for every group rate contract/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    // Listed once in the stage editor and again in the live preview.
    expect(screen.getAllByText("Group ARC Approval").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Group ARC Committee Award").length).toBeGreaterThan(0);
    expect(screen.queryByText("ARC Committee Award")).not.toBeInTheDocument();
    expect(screen.getByText(/approvers with company-level access/i)).toBeInTheDocument();

    // The base stage gates publishing, so it cannot be left empty even when an
    // optional stage has approvers.
    fireEvent.click(screen.getAllByText("Group ARC Technical Evaluation")[0]);
    fireEvent.click(screen.getByRole("button", { name: /add first level/i }));
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/Group ARC \(Publish & Base\)/));
  });

  test("cannot start a second Group ARC workflow when the company already has one", () => {
    render(<WorkflowWizard {...baseProps()} editingProcess={null} editingPolicies={[]} groupWorkflowExists />);

    fireEvent.click(screen.getByText("Group ARC — covers several hotels (company-wide)"));
    expect(screen.getByText(/already has a Group ARC workflow/i)).toBeInTheDocument();
    // The selection did not move to the group flow: step 1 still asks for a process.
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    expect(toast.error).toHaveBeenCalledWith("Please select a process");
  });

  test("editing saves the group stages company-wide and removes a cleared optional stage", async () => {
    const step = { approver_source_type: "USER", approver_source_id: 7, decision_rule: "ANY", step_order: 1 };
    const props = baseProps();
    render(
      <WorkflowWizard
        {...props}
        editingProcess={ARC_GROUP_FLOW_PROCESS}
        editingPolicies={[
          { id: 91, entity_type: "ARC_GROUP", hotel_id: null, process_id: null, steps: [step] },
          { id: 92, entity_type: "ARC_GROUP_TECH", hotel_id: null, process_id: null, steps: [] },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    expect(screen.getByText(/every group rate contract in this company/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));

    await waitFor(() => expect(props.onSave).toHaveBeenCalled());
    expect(deleteApprovalPolicy).toHaveBeenCalledWith(92);
    expect(createApprovalPolicy).not.toHaveBeenCalled();
    expect(updateApprovalPolicy).toHaveBeenCalledTimes(1);
    expect(updateApprovalPolicy).toHaveBeenCalledWith(expect.objectContaining({
      id: 91, entity_type: "ARC_GROUP", hospitality_company_id: 4, hotel_id: null, process_id: null,
    }));
  });
});
