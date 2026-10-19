jest.mock("../preview/ApprovalFlowGraph", () => ({ __esModule: true, default: () => null }));

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import StepConfigureStages from "./StepConfigureStages";

it("passes the stage type to the picker and shows why a role is disabled", () => {
  const getApproverOptions = jest.fn((type, dept, entityType) =>
    type === "ROLE"
      ? [
          { value: 1, label: "RFQ Creator", isDisabled: true, reason: "RFQ Creator can't approve RFQ Approval" },
          { value: 2, label: "RFQ Approver" },
        ]
      : []
  );
  render(
    <StepConfigureStages
      stages={[{ entity_type: "RFQ", steps: [] }]}
      onStagesChange={() => {}}
      getApproverOptions={getApproverOptions}
      getApproverDisplayInfo={() => ({ users: [] })}
      selectedProcess={{ name: "Capex", process_type: "capex" }}
    />
  );
  expect(getApproverOptions).toHaveBeenCalledWith("ROLE", null, "RFQ");
  fireEvent.keyDown(screen.getByLabelText(/add several levels at once/i), { key: "ArrowDown" });
  expect(screen.getByText("RFQ Creator can't approve RFQ Approval")).toBeInTheDocument();
  expect(screen.getByText("RFQ Creator").closest('[aria-disabled="true"]')).not.toBeNull();
  expect(screen.getByText("RFQ Approver").closest('[aria-disabled="true"]')).toBeNull();
});
