// Building a four-level approval chain.
//
// The configurator only ever let you add ONE level at a time: click "Add Next
// Approval Level", pick an approver, click again, pick again. A client asked
// to choose L2, L3 and L4 at once, and they are hitting the loop exactly where
// it hurts — production has 35 one-level policies, 87 two-level, 20
// three-level and 4 four-level. Client feedback item 11.
//
// `tbl_approval_policy_steps.approver_source_id` is a scalar NOT NULL, so
// "all at once" means "pick N approvers, get N sequential levels" — one
// approver per level, in the order chosen. That needs no migration. (Several
// approvers on ONE level would be a schema change and is not what was asked.)

jest.mock("../preview/ApprovalFlowGraph", () => ({
  __esModule: true,
  default: () => null,
}));

import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import StepConfigureStages from "./StepConfigureStages";

const ROLE_OPTIONS = [
  { value: 11, label: "Department Head" },
  { value: 12, label: "Commercial Approver" },
  { value: 13, label: "Finance Controller" },
  { value: 14, label: "CEO" },
];
const USER_OPTIONS = [
  { value: 8001, label: "Asha Menon" },
  { value: 8002, label: "Rahul Nair" },
];

const getApproverOptions = (type) => (type === "USER" ? USER_OPTIONS : ROLE_OPTIONS);
const getApproverDisplayInfo = () => ({ email: null, users: [{ id: 1 }] });

const setup = (stages) => {
  const onStagesChange = jest.fn();
  render(
    <StepConfigureStages
      stages={stages}
      onStagesChange={onStagesChange}
      getApproverOptions={getApproverOptions}
      getApproverDisplayInfo={getApproverDisplayInfo}
      selectedProcess={{ name: "Capex", process_type: "capex" }}
    />
  );
  return onStagesChange;
};

// One stage, already carrying L1, expanded by default (expandedStage = 0).
const stagesWithOneLevel = () => [
  {
    entity_type: "RFQ",
    steps: [
      { step_order: 1, approval_type: "STANDARD", decision_rule: "ANY", approver_source_type: "ROLE", approver_source_id: 11 },
    ],
  },
  { entity_type: "PO", steps: [] },
];

const bulkPicker = () => screen.getByLabelText(/add several levels at once/i);

/** react-select is keyboard-driven in jsdom: type, then Enter to take the top hit. */
const pick = (input, text) => {
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: "Enter", code: "Enter" });
};

describe("adding several approval levels at once", () => {
  it("offers a bulk picker alongside the one-at-a-time button", () => {
    setup(stagesWithOneLevel());

    expect(screen.getByRole("button", { name: /add next approval level/i })).toBeInTheDocument();
    expect(bulkPicker()).toBeInTheDocument();
  });

  it("turns three chosen approvers into three sequential levels", () => {
    const onStagesChange = setup(stagesWithOneLevel());
    const input = bulkPicker();

    pick(input, "Commercial Approver");
    pick(input, "Finance Controller");
    pick(input, "CEO");
    fireEvent.click(screen.getByRole("button", { name: /add 3 levels/i }));

    expect(onStagesChange).toHaveBeenCalled();
    const next = onStagesChange.mock.calls.at(-1)[0];
    const steps = next[0].steps;

    expect(steps).toHaveLength(4);
    expect(steps.map((s) => s.step_order)).toEqual([1, 2, 3, 4]);
    expect(steps.map((s) => s.approver_source_id)).toEqual([11, 12, 13, 14]);
    expect(steps.every((s) => s.approver_source_type === "ROLE")).toBe(true);
  });

  it("appends after the existing levels rather than replacing them", () => {
    const onStagesChange = setup(stagesWithOneLevel());
    const input = bulkPicker();

    pick(input, "CEO");
    fireEvent.click(screen.getByRole("button", { name: /add 1 level/i }));

    const steps = onStagesChange.mock.calls.at(-1)[0][0].steps;
    expect(steps[0].approver_source_id).toBe(11); // L1 untouched
    expect(steps[1].approver_source_id).toBe(14);
  });

  it("leaves the other stages alone", () => {
    const onStagesChange = setup(stagesWithOneLevel());
    const input = bulkPicker();

    pick(input, "CEO");
    fireEvent.click(screen.getByRole("button", { name: /add 1 level/i }));

    const next = onStagesChange.mock.calls.at(-1)[0];
    expect(next[1].entity_type).toBe("PO");
    expect(next[1].steps).toHaveLength(0);
  });

  it("can add levels held by named users, not just roles", () => {
    const onStagesChange = setup(stagesWithOneLevel());

    // scoped name: each LEVEL card carries an identically-labelled pill
    fireEvent.click(screen.getByRole("button", { name: /add levels by specific user/i }));
    const input = bulkPicker();
    pick(input, "Asha Menon");
    pick(input, "Rahul Nair");
    fireEvent.click(screen.getByRole("button", { name: /add 2 levels/i }));

    const steps = onStagesChange.mock.calls.at(-1)[0][0].steps;
    expect(steps.slice(1).map((s) => s.approver_source_id)).toEqual([8001, 8002]);
    expect(steps.slice(1).every((s) => s.approver_source_type === "USER")).toBe(true);
  });

  it("will not add anything when nothing is chosen", () => {
    const onStagesChange = setup(stagesWithOneLevel());
    const btn = screen.queryByRole("button", { name: /add \d+ levels?/i });

    expect(btn).toBeNull();
    expect(onStagesChange).not.toHaveBeenCalled();
  });

  it("clears the picker after adding, so the next batch starts empty", () => {
    setup(stagesWithOneLevel());
    const input = bulkPicker();

    pick(input, "CEO");
    fireEvent.click(screen.getByRole("button", { name: /add 1 level/i }));

    expect(screen.queryByRole("button", { name: /add \d+ levels?/i })).toBeNull();
  });

  it("still lets a stage with no levels be started in bulk", () => {
    const onStagesChange = setup([{ entity_type: "RFQ", steps: [] }]);
    const input = bulkPicker();

    pick(input, "Department Head");
    pick(input, "CEO");
    fireEvent.click(screen.getByRole("button", { name: /add 2 levels/i }));

    const steps = onStagesChange.mock.calls.at(-1)[0][0].steps;
    expect(steps.map((s) => s.approver_source_id)).toEqual([11, 14]);
    expect(steps.map((s) => s.step_order)).toEqual([1, 2]);
  });
});
