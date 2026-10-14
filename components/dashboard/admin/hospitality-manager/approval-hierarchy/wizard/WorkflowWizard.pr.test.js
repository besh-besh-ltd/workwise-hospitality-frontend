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
jest.mock("@/services/rbac", () => ({ getRolePermissions: jest.fn() }));

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createApprovalPolicy, updateApprovalPolicy, deleteApprovalPolicy } from "@/services/approval";
import { getRolePermissions } from "@/services/rbac";
import { toast } from "react-toastify";

import WorkflowWizard, { baseStageRequiredMessage } from "./WorkflowWizard";
import DashboardView, { PR_HOTEL_FLOW_PROCESS } from "../dashboard/DashboardView";

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
  editingProcess: PR_HOTEL_FLOW_PROCESS,
  editingPolicies: [{ id: 51, entity_type: "PR", hotel_id: 12, process_id: null, steps }],
});

beforeEach(() => {
  jest.clearAllMocks();
  createApprovalPolicy.mockResolvedValue({ status: 1 });
  updateApprovalPolicy.mockResolvedValue({ status: 1 });
  deleteApprovalPolicy.mockResolvedValue({ status: 1 });
  getRolePermissions.mockResolvedValue({ status: true, data: { pr: ["read", "approve"] } });
});

describe("PR approval flow", () => {
  test("creates a PR policy: two levels, a threshold on level 2, process-free, min_amount as a string", async () => {
    const props = baseProps();
    render(<WorkflowWizard {...props} editingProcess={null} editingPolicies={[]} />);

    fireEvent.click(screen.getByText("Purchase Requisition (no process)"));
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

  test("creating a company-wide PR policy saves hotel_id null; the scope is locked when editing", async () => {
    const props = baseProps();
    const { unmount } = render(<WorkflowWizard {...props} editingProcess={null} editingPolicies={[]} />);
    fireEvent.click(screen.getByText("Purchase Requisition (no process)"));
    fireEvent.click(screen.getByLabelText(/all hotels/i));
    expect(screen.getByText(/company-level access/i)).toBeInTheDocument();
    next();
    const sel = screen.getByLabelText("Add several levels at once");
    fireEvent.focus(sel);
    fireEvent.keyDown(sel, { key: "ArrowDown", keyCode: 40 });
    fireEvent.keyDown(sel, { key: "Enter", keyCode: 13 });
    fireEvent.click(screen.getByRole("button", { name: /add 1 level/i }));
    next();
    fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));
    await waitFor(() => expect(props.onSave).toHaveBeenCalled());
    expect(createApprovalPolicy).toHaveBeenCalledWith(expect.objectContaining({ entity_type: "PR", hotel_id: null, process_id: null }));
    unmount();

    render(<WorkflowWizard {...baseProps()} {...editingPr([step(7)])} />);
    expect(screen.getByLabelText(/all hotels/i)).toBeDisabled();
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
    expect(screen.getByText(/Purchase Requisitions — This hotel/)).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Edit"));
    expect(props.onEditWorkflow).toHaveBeenCalledWith(PR_HOTEL_FLOW_PROCESS);
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

// Final review C-I1: the services reject as { message: AxiosError }, and the
// save catch handed that OBJECT to toast.error — react-toastify v11 renders
// nothing for it. The server's 400 APPROVER_ROLE_CANNOT_APPROVE (the chosen
// role lacks pr.read + pr.approve) vanished; the admin thought the chain was
// saved and every PR submit then failed with "no approval chain".
describe("a refused save is never silent", () => {
  const SERVER_MSG = 'This approval step names a role that cannot approve PR. step 1: role "Front Office" (id 21) is missing pr.approve.';
  const refused = () => ({
    message: Object.assign(new Error("Request failed with status code 400"), {
      isAxiosError: true,
      response: { status: 400, data: { status: 3, code: "APPROVER_ROLE_CANNOT_APPROVE", message: SERVER_MSG } },
    }),
  });

  test("the server's refusal is shown as text and the wizard stays open", async () => {
    updateApprovalPolicy.mockRejectedValue(refused());
    const props = baseProps();
    render(<WorkflowWizard {...props} {...editingPr([step(7)])} />);
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(SERVER_MSG));
    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /save workflow/i })).toBeEnabled();
  });

  test("a refusal after confirming the pending-approval impact is shown as text too", async () => {
    updateApprovalPolicy
      .mockResolvedValueOnce({ status: 0, code: "APPROVAL_IMPACT_WARNING", data: { entity_type: "PR", pending_count: 2, instances: [] } })
      .mockRejectedValueOnce(refused());
    const props = baseProps();
    render(<WorkflowWizard {...props} {...editingPr([step(7)])} />);
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm and apply changes" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(SERVER_MSG));
    expect(toast.error.mock.calls.every(([m]) => typeof m === "string")).toBe(true);
    expect(props.onSave).not.toHaveBeenCalled();
  });
});

describe("the PR role picker says which roles can approve PRs", () => {
  const roleStep = (id) => step(id, { approver_source_type: "ROLE" });
  const roleProps = () => ({
    ...baseProps(),
    getApproverOptions: jest.fn((type) => (type === "ROLE"
      ? [{ value: 21, label: "Front Office" }, { value: 22, label: "PR Approver" }]
      : [{ value: 7, label: "Asha Rao" }])),
    getApproverDisplayInfo: jest.fn((st) => ({ name: st.approver_source_id === 21 ? "Front Office" : "PR Approver", email: "", users: [{ user_id: 1 }] })),
  });

  test("a role without pr.read + pr.approve is flagged; one with both is not", async () => {
    getRolePermissions.mockImplementation((id) => Promise.resolve({
      status: true, data: id === 21 ? { pr: ["read"], rfq: ["read", "approve"] } : { pr: ["read", "approve"] },
    }));
    render(<WorkflowWizard {...roleProps()} {...editingPr([roleStep(21), roleStep(22)])} />);
    next();
    const flag = await screen.findByText(/can't approve purchase requisitions/i);
    expect(flag.closest("[role=alert]")).toHaveTextContent(/missing pr\.approve\./);
    expect(screen.getAllByText(/can't approve purchase requisitions/i)).toHaveLength(1);
    expect(getRolePermissions).toHaveBeenCalledWith(21);
    expect(getRolePermissions).toHaveBeenCalledWith(22);
    // Level 2 (PR Approver) carries the plain explanation, not the flag.
    expect(screen.getAllByText("The role needs the PR Approver permission (pr.read + pr.approve).").length).toBeGreaterThan(0);
  });

  test("the bulk picker explains the PR Approver permission when adding levels by role", () => {
    render(<WorkflowWizard {...roleProps()} editingProcess={null} editingPolicies={[]} />);
    fireEvent.click(screen.getByText("Purchase Requisition (no process)"));
    next();
    expect(screen.getByText("The role needs the PR Approver permission (pr.read + pr.approve).")).toBeInTheDocument();
  });

  test("a non-PR stage has no PR flag, no PR help line and looks nothing up", async () => {
    render(<WorkflowWizard {...roleProps()} editingProcess={{ id: 2, name: "Day to Day Procurement", process_type: "RFQ" }}
      editingPolicies={[{ id: 61, entity_type: "RFQ", hotel_id: 12, process_id: 2, steps: [roleStep(21)] }]} />);
    next();
    await screen.findAllByText(/Level 1/);
    expect(screen.queryByText(/pr\.read \+ pr\.approve/)).not.toBeInTheDocument();
    expect(screen.queryByText(/can't approve purchase requisitions/i)).not.toBeInTheDocument();
    expect(getRolePermissions).not.toHaveBeenCalled();
  });
});

// Final review C-M5: the base-stage message was written for rate contracts
// ("it gates publishing") and was reused verbatim for Purchase Requisitions.
test("the PR base-stage message does not talk about publishing; ARC keeps its reason", () => {
  expect(baseStageRequiredMessage("PR")).toBe("The Purchase Requisition stage needs at least one approval level — every submitted PR is approved through it.");
  expect(baseStageRequiredMessage("PR")).not.toMatch(/publish/i);
  expect(baseStageRequiredMessage("ARC")).toMatch(/ARC \(Publish & Base\) stage needs at least one approval level — it gates publishing\./);
});
