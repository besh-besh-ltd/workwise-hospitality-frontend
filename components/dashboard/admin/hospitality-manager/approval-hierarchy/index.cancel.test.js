// Cancelling the wizard after a partial save must refresh the dashboard, or it
// shows policies from before the stages that did save.
jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("next/router", () => ({ useRouter: () => ({ query: { companyId: "4", hotelId: "12" }, back: jest.fn() }) }));
jest.mock("@/services/approval", () => ({ deleteApprovalPolicy: jest.fn() }));

const mockRefreshPolicies = jest.fn();
const mockRefreshProcesses = jest.fn();
jest.mock("./hooks/useApprovalData", () => ({
  __esModule: true,
  default: () => ({ hotel: { name: "Goa" }, policies: [], roles: [], users: [], userRoleScopes: {}, departments: [], loading: false, refresh: mockRefreshPolicies, getApproverOptions: jest.fn(), getUsersByRole: jest.fn(), getApproverDisplayInfo: jest.fn(), handleDeletePolicy: jest.fn(), getDeptSubGraphPreview: jest.fn(), refreshDepartments: jest.fn() }),
}));
jest.mock("./hooks/useProcessData", () => ({
  __esModule: true,
  default: () => ({ processes: [], loading: false, handleCreateProcess: jest.fn(), handleUpdateProcess: jest.fn(), handleDeleteProcess: jest.fn(), refresh: mockRefreshProcesses }),
}));
jest.mock("./dashboard/DashboardView", () => ({
  __esModule: true,
  default: ({ onCreateWorkflow }) => <button onClick={onCreateWorkflow}>new workflow</button>,
}));
jest.mock("./wizard/WorkflowWizard", () => ({
  __esModule: true,
  default: ({ onCancel, onWrite }) => (
    <div>
      <button onClick={() => onWrite()}>write a stage</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import ApprovalHierarchy from "./index";

beforeEach(() => jest.clearAllMocks());

test("cancel after a stage was saved refreshes policies", () => {
  render(<ApprovalHierarchy />);
  fireEvent.click(screen.getByText("new workflow"));
  fireEvent.click(screen.getByText("write a stage"));
  fireEvent.click(screen.getByText("Cancel"));
  expect(mockRefreshPolicies).toHaveBeenCalledTimes(1);
});

test("cancel with nothing saved does not refetch", () => {
  render(<ApprovalHierarchy />);
  fireEvent.click(screen.getByText("new workflow"));
  fireEvent.click(screen.getByText("Cancel"));
  expect(mockRefreshPolicies).not.toHaveBeenCalled();
});
