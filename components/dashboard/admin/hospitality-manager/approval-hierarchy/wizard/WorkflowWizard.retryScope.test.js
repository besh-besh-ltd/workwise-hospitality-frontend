// Policies created by a failed attempt are remembered for the retry. They must
// be scoped to the flow + process they were created for, and the delete path
// must see them too.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/services/approval", () => ({
  createApprovalPolicy: jest.fn(),
  updateApprovalPolicy: jest.fn(),
  deleteApprovalPolicy: jest.fn(),
}));
jest.mock("react-toastify", () => ({ toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() } }));
// The real stage editor is covered elsewhere; a stub lets this test fill and
// empty stages directly.
jest.mock("./StepConfigureStages", () => {
  const React = require("react");
  const lvl = { approver_source_type: "ROLE", approver_source_id: 7, decision_rule: "ANY", step_order: 1 };
  return {
    __esModule: true,
    default: ({ stages, onStagesChange }) => (
      <div>
        <button onClick={() => onStagesChange(stages.map((s) => ({ ...s, steps: [lvl] })))}>fill all</button>
        <button onClick={() => onStagesChange(stages.map((s) => (s.entity_type === "ARC_TECH" ? { ...s, steps: [] } : s)))}>empty tech</button>
      </div>
    ),
  };
});

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { toast } from "react-toastify";
import { createApprovalPolicy, updateApprovalPolicy, deleteApprovalPolicy } from "@/services/approval";
import WorkflowWizard from "./WorkflowWizard";

const rejection = (data) => Promise.reject({ message: { response: { data } } });
const next = () => fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
const save = () => fireEvent.click(screen.getByRole("button", { name: /save workflow/i }));

const onWrite = jest.fn();
const mount = () => render(
  <WorkflowWizard
    processes={[{ id: 2, name: "Day to Day", process_type: "RFQ" }, { id: 3, name: "Capex", process_type: "RFQ" }]}
    hotel={{ id: 12, name: "Goa" }} companyId="4" hotelId="12"
    getApproverOptions={jest.fn(() => [])} getApproverDisplayInfo={jest.fn(() => ({}))}
    onCreateProcess={jest.fn()} onSave={jest.fn()} onCancel={jest.fn()} onWrite={onWrite}
    editingProcess={null} editingPolicies={[]}
  />
);

beforeEach(() => {
  jest.clearAllMocks();
  updateApprovalPolicy.mockResolvedValue({ status: 1 });
  deleteApprovalPolicy.mockResolvedValue({ status: 1 });
});

test("switching process after a partial failure creates the new process's policy instead of updating the old one", async () => {
  createApprovalPolicy.mockImplementation((p) =>
    p.entity_type === "RFQ" && p.process_id === 2
      ? rejection({ status: 3, code: "X", message: "nope" })
      : Promise.resolve({ status: 1, data: { id: p.process_id * 100 + p.steps.length } })
  );
  mount();
  fireEvent.click(screen.getByText("Day to Day"));
  next();
  fireEvent.click(screen.getByText("fill all"));
  next();
  save();
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  const techForTwo = createApprovalPolicy.mock.calls.find(([p]) => p.entity_type === "TECHNICAL" && p.process_id === 2);
  expect(techForTwo).toBeTruthy();

  // back to step 1, pick the other process, save again
  fireEvent.click(screen.getByRole("button", { name: /back/i }));
  fireEvent.click(screen.getByText("Capex"));
  next();
  next();
  save();
  await waitFor(() => expect(toast.success).toHaveBeenCalled());
  expect(updateApprovalPolicy).not.toHaveBeenCalled();
  expect(createApprovalPolicy).toHaveBeenCalledWith(expect.objectContaining({ entity_type: "TECHNICAL", process_id: 3 }));
});

test("an optional Unit ARC stage created on a failed attempt and then emptied is deleted", async () => {
  createApprovalPolicy.mockImplementation((p) =>
    p.entity_type === "ARC"
      ? rejection({ status: 3, code: "X", message: "nope" })
      : Promise.resolve({ status: 1, data: { id: 800 + p.steps.length } })
  );
  mount();
  fireEvent.click(screen.getByText("Unit ARC (no process)"));
  next();
  fireEvent.click(screen.getByText("fill all"));
  next();
  save();
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(createApprovalPolicy).toHaveBeenCalledWith(expect.objectContaining({ entity_type: "ARC_TECH" }));

  fireEvent.click(screen.getByText("empty tech"));
  createApprovalPolicy.mockResolvedValue({ status: 1, data: { id: 999 } });
  next();
  save();
  await waitFor(() => expect(deleteApprovalPolicy).toHaveBeenCalledWith(801));
});

test("a partial save tells the page something was written", async () => {
  createApprovalPolicy.mockImplementation((p) =>
    p.entity_type === "RFQ" ? rejection({ status: 3, code: "X", message: "nope" }) : Promise.resolve({ status: 1, data: { id: 5 } })
  );
  mount();
  fireEvent.click(screen.getByText("Day to Day"));
  next();
  fireEvent.click(screen.getByText("fill all"));
  next();
  save();
  await waitFor(() => expect(toast.error).toHaveBeenCalled());
  expect(onWrite).toHaveBeenCalled();
});
