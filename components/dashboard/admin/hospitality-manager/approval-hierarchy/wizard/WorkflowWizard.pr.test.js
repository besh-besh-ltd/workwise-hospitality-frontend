// Approval workflow wizard — the Purchase Requisition (PR) flow.
//
// PR approvals are process-free (process_id null). Each level may carry an
// optional "only when PR value >= X" threshold, sent as a decimal STRING.

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
import { createApprovalPolicy, updateApprovalPolicy, deleteApprovalPolicy } from "@/services/approval";

import WorkflowWizard from "./WorkflowWizard";
import DashboardView, { PR_FLOW_PROCESS } from "../dashboard/DashboardView";

const baseProps = () => ({
  processes: [{ id: 2, name: "Day to Day Procurement", process_type: "RFQ" }],
  hotel: { id: 12, name: "Goa Beach Resort" },
  companyId: "4",
  hotelId: "12",
  getApproverOptions: jest.fn(() => [{ value: 7, label: "Asha Rao" }, { value: 8, label: "Ravi Nair" }]),
  getApproverDisplayInfo: jest.fn(() => ({ name: "Asha Rao", email: "", type: "User", typeLabel: "Specific User", users: [] })),
  onCreateProcess: jest.fn(),
  onSave: jest.fn(),
  onCancel: jest.fn(),
});

const step = (id, extra = {}) => ({ approver_source_type: "USER", approver_source_id: id, decision_rule: "ANY", step_order: 1, ...extra });
const next = () => fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
const editingPr = (steps) => ({
  editingProcess: PR_FLOW_PROCESS,
  editingPolicies: [{ id: 51, entity_type: "PR", hotel_id: 12, process_id: null, steps }],
});

beforeEach(() => {
  jest.clearAllMocks();
  createApprovalPolicy.mockResolvedValue({ status: 1 });
  updateApprovalPolicy.mockResolvedValue({ status: 1 });
  deleteApprovalPolicy.mockResolvedValue({ status: 1 });
});

describe("PR approval flow", () => {
  test("creates a PR policy: two levels, a threshold on level 2, process-free, min_amount as a string", async () => {
    const props = baseProps();
    render(<WorkflowWizard {...props} editingProcess={null} editingPolicies={[]} />);

    fireEvent.click(screen.getByText(/Purchase Requisition/));
    next();

    // Pick two approvers in the bulk picker -> two levels.
    const picker = screen.getByLabelText("Add several levels at once");
    fireEvent.focus(picker);
    fireEvent.keyDown(picker, { key: "ArrowDown", keyCode: 40 });
    fireEvent.keyDown(picker, { key: "Enter", keyCode: 13 });
    fireEvent.keyDown(picker, { key: "ArrowDown", keyCode: 40 });
    fireEvent.keyDown(picker, { key: "Enter", keyCode: 13 });
    fireEvent.click(screen.getByRole("button", { name: /add 2 levels/i }));

    const inputs = screen.getAllByLabelText(/only when pr value/i);
    expect(inputs).toHaveLength(2);
    fireEvent.change(inputs[1], { target: { value: "100000" } });

    next();
    expect(screen.getByText(/Steps with a minimum apply only when the PR's estimated value is at or above it\./)).toBeInTheDocument();
    expect(screen.getAllByText(/Only when PR value ≥ ₹1,00,000/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));

    await waitFor(() => expect(props.onSave).toHaveBeenCalled());
    expect(createApprovalPolicy).toHaveBeenCalledTimes(1);
    const payload = createApprovalPolicy.mock.calls[0][0];
    expect(payload).toMatchObject({ entity_type: "PR", process_id: null, hospitality_company_id: 4, hotel_id: 12 });
    expect(payload.steps).toHaveLength(2);
    expect(payload.steps[0].min_amount).toBeNull();
    expect(payload.steps[1].min_amount).toBe("100000");
  });

  test("a company-wide PR policy is saved with hotel_id null", async () => {
    const props = baseProps();
    render(<WorkflowWizard {...props} {...editingPr([step(7)])} />);
    fireEvent.click(screen.getByLabelText(/all hotels/i));
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));
    await waitFor(() => expect(props.onSave).toHaveBeenCalled());
    expect(updateApprovalPolicy).toHaveBeenCalledWith(expect.objectContaining({ id: 51, hotel_id: null, process_id: null }));
  });

  test.each(["-5", "1.234", "abc", "1e5"])("min amount %s shows an inline error and disables Save", (bad) => {
    render(<WorkflowWizard {...baseProps()} {...editingPr([step(7), step(8)])} />);
    next();
    next();
    // (steps are valid here; go back and break one)
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    const inputs = screen.getAllByLabelText(/only when pr value/i);
    fireEvent.change(inputs[1], { target: { value: bad } });
    expect(screen.getByRole("alert")).toHaveTextContent(/0 or more with at most 2 decimals/i);
    next();
    expect(screen.getByRole("button", { name: /save workflow/i })).toBeDisabled();
    expect(updateApprovalPolicy).not.toHaveBeenCalled();
  });

  test("accepts 0, 2 decimals and blank", () => {
    render(<WorkflowWizard {...baseProps()} {...editingPr([step(7), step(8)])} />);
    next();
    const inputs = screen.getAllByLabelText(/only when pr value/i);
    fireEvent.change(inputs[0], { target: { value: "0" } });
    fireEvent.change(inputs[1], { target: { value: "12500000.75" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    next();
    expect(screen.getByRole("button", { name: /save workflow/i })).toBeEnabled();
  });

  test("the threshold input is not shown for the ARC flow", () => {
    render(<WorkflowWizard {...baseProps()} editingProcess={null} editingPolicies={[]} />);
    fireEvent.click(screen.getByText(/ARC — Rate Contracts/));
    next();
    fireEvent.click(screen.getByRole("button", { name: /add first level/i }));
    expect(screen.queryByLabelText(/only when pr value/i)).not.toBeInTheDocument();
  });
});

describe("Edit on a process-free policy opens the wizard", () => {
  const dashProps = () => ({
    processes: [], departments: [],
    onCreateWorkflow: jest.fn(), onEditWorkflow: jest.fn(), onDeleteWorkflow: jest.fn(), onDeletePolicy: jest.fn(),
    onCreateProcess: jest.fn(), onUpdateProcess: jest.fn(), onDeleteProcess: jest.fn(),
    getApproverDisplayInfo: jest.fn(() => ({ name: "Asha", users: [] })),
    getDeptSubGraphPreview: jest.fn(),
  });

  test("PR policy: grouped into a Purchase Requisitions card; Edit opens the wizard, never deletes", () => {
    const props = dashProps();
    render(<DashboardView {...props} policies={[{ id: 51, entity_type: "PR", process_id: null, hotel_id: 12, steps: [step(7)] }]} />);
    expect(screen.getByText("Purchase Requisitions")).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Edit"));
    expect(props.onEditWorkflow).toHaveBeenCalledWith(PR_FLOW_PROCESS);
    expect(props.onDeletePolicy).not.toHaveBeenCalled();
    expect(props.onDeleteWorkflow).not.toHaveBeenCalled();
  });

  test("uncategorized (orphan) policy: Edit routes to the editor, not to delete", () => {
    const props = dashProps();
    render(<DashboardView {...props} policies={[{ id: 77, entity_type: "MR", process_id: null, hotel_id: 12, steps: [step(7)] }]} />);
    fireEvent.click(screen.getByTitle("Edit"));
    expect(props.onEditWorkflow).toHaveBeenCalledWith(expect.objectContaining({ is_orphan: true }));
    expect(props.onDeletePolicy).not.toHaveBeenCalled();
  });

  test("editing an existing PR workflow opens the wizard on the PR stage with its levels", () => {
    render(<WorkflowWizard {...baseProps()} {...editingPr([step(7), step(8, { min_amount: "100000.00" })])} />);
    next();
    const inputs = screen.getAllByLabelText(/only when pr value/i);
    expect(inputs[1]).toHaveValue("100000.00");
  });
});
