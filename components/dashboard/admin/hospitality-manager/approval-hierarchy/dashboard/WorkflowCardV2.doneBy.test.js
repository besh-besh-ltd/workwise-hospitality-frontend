// "Done by": who does the work at a stage, separate from who approves it.
jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import WorkflowCardV2 from "./WorkflowCardV2";

const ROLES = [
  { id: 1, title: "RFQ Creator", approvable_entity_types: [], performs_entity_types: ["RFQ"] },
  { id: 2, title: "RFQ Approver", approvable_entity_types: ["RFQ"], performs_entity_types: [] },
];
const NAMES = ["Asha", "Ben", "Chitra", "Dev", "Esha", "Farah", "Gita"];
const getUsersByRole = jest.fn((roleId) =>
  roleId === 1 ? NAMES.map((name, i) => ({ user_id: i + 1, name })) : [{ user_id: 99, name: "Approver Person" }]
);

const policies = [{ id: 1, entity_type: "RFQ", process_id: 5, steps: [{ id: 1, step_order: 1, decision_rule: "ANY" }] }];
const info = () => ({ type: "User", name: "X", typeLabel: "User" });

const open = (props = {}) => {
  const { container } = render(
    <WorkflowCardV2
      process={{ id: 5, name: "Capex", process_type: "RFQ" }}
      policies={policies}
      onEdit={() => {}}
      onDelete={() => {}}
      getApproverDisplayInfo={info}
      roles={ROLES}
      getUsersByRole={getUsersByRole}
      {...props}
    />
  );
  fireEvent.click(container.querySelector(".stageClickable"));
};

describe("WorkflowCardV2 Done by row", () => {
  it("lists the holders of roles that perform the stage, first five plus a count", () => {
    open();
    expect(screen.getByText(/done by/i)).toBeInTheDocument();
    expect(screen.getByText("RFQ Creator")).toBeInTheDocument();
    expect(screen.getByText(/Asha/)).toBeInTheDocument();
    expect(screen.getByText(/Esha/)).toBeInTheDocument();
    expect(screen.queryByText(/Farah/)).not.toBeInTheDocument();
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("Does the work — not an approval level")).toBeInTheDocument();
    expect(getUsersByRole).toHaveBeenCalledWith(1, null, 5);
  });

  it("does not list approver-only roles", () => {
    open();
    expect(screen.queryByText("Approver Person")).not.toBeInTheDocument();
  });

  it("renders no row when roles are not supplied", () => {
    open({ roles: undefined, getUsersByRole: undefined });
    expect(screen.queryByText(/done by/i)).not.toBeInTheDocument();
  });
});
