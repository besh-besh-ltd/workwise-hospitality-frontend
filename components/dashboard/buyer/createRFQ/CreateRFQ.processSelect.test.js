jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import RfqProcessField, { NO_RFQ_WORKFLOW_MESSAGE } from "./RfqProcessField";
import { usableRfqProcesses, isTenderAvailable, processFieldState, nextProcessId, mergeCoverages } from "@/utils/policyCoverage";

const RFQ_A = { value: 1, label: "Day to Day", process_type: "RFQ" };
const RFQ_B = { value: 2, label: "Renovation", process_type: "RFQ" };
const ARC = { value: 3, label: "Old ARC", process_type: "ARC" };
const ALL = [RFQ_A, RFQ_B, ARC];

describe("usableRfqProcesses", () => {
  it("keeps only the RFQ process that has an RFQ policy at the unit", () => {
    const cov = { process_free: [], by_process: { 1: ["RFQ", "PO"], 2: ["TENDER"] } };
    expect(usableRfqProcesses(ALL, cov)).toEqual([RFQ_A]);
  });

  it("never lists an ARC-type process", () => {
    const cov = { process_free: ["RFQ"], by_process: { 3: ["RFQ"] } };
    expect(usableRfqProcesses(ALL, cov).map((p) => p.value)).toEqual([1, 2]);
  });

  it("treats a process-free RFQ policy as covering every RFQ process", () => {
    const cov = { process_free: ["RFQ"], by_process: {} };
    expect(usableRfqProcesses(ALL, cov)).toEqual([RFQ_A, RFQ_B]);
  });

  it("returns none when nothing is covered", () => {
    expect(usableRfqProcesses(ALL, { process_free: [], by_process: {} })).toEqual([]);
  });

  it("falls back to every RFQ-type process when coverage is unknown", () => {
    expect(usableRfqProcesses(ALL, null)).toEqual([RFQ_A, RFQ_B]);
  });
});

describe("isTenderAvailable", () => {
  it("is false only when coverage is known and has no TENDER", () => {
    expect(isTenderAvailable({ process_free: ["RFQ"], by_process: { 1: ["RFQ"] } })).toBe(false);
    expect(isTenderAvailable({ process_free: ["TENDER"], by_process: {} })).toBe(true);
    expect(isTenderAvailable({ process_free: [], by_process: { 4: ["TENDER"] } })).toBe(true);
    expect(isTenderAvailable(null)).toBe(true);
  });
});

describe("RfqProcessField", () => {
  const base = { value: null, onChange: jest.fn(), disabled: false, missing: false };

  it("shows a single usable process read-only, with no select", () => {
    const { container } = render(<RfqProcessField {...base} processes={[RFQ_A]} fieldState="readonly" />);
    expect(screen.getByTestId("process-readonly")).toHaveTextContent("Day to Day");
    expect(container.querySelector("#select_process-create_rfq_page")).toBeNull();
  });

  it("explains instead of rendering a required select when none is usable", () => {
    const { container } = render(<RfqProcessField {...base} processes={[]} fieldState="none" />);
    expect(screen.getByText(NO_RFQ_WORKFLOW_MESSAGE)).toBeInTheDocument();
    expect(NO_RFQ_WORKFLOW_MESSAGE).toBe(
      "No approval workflow is set up for RFQs at this unit. Ask your company admin to set one up."
    );
    expect(container.textContent).not.toMatch(/Required/);
    expect(container.querySelector(".rfq-required")).toBeNull();
  });

  it("renders the required select when several processes work", () => {
    render(<RfqProcessField {...base} processes={[RFQ_A, RFQ_B]} fieldState="select" />);
    expect(screen.getByText("Select Process")).toBeInTheDocument();
  });
});

describe("RfqProcessField with unknown coverage", () => {
  it("renders the required select for a lone process so the user can pick it", () => {
    const onChange = jest.fn();
    const { container } = render(
      <RfqProcessField processes={[RFQ_A]} fieldState="select" value={null} onChange={onChange} />
    );
    expect(screen.queryByTestId("process-readonly")).toBeNull();
    expect(container.querySelector("#select_process-create_rfq_page")).not.toBeNull();
    expect(container.querySelector(".rfq-required")).not.toBeNull();
  });
});

describe("processFieldState", () => {
  const covA = { process_free: [], by_process: { 1: ["RFQ"] } };
  it("is select whenever coverage is unknown, even with one process", () => {
    expect(processFieldState([RFQ_A], null)).toBe("select");
    expect(processFieldState([RFQ_A, RFQ_B], null)).toBe("select");
  });
  it("is readonly for one usable, none for zero, select for several", () => {
    expect(processFieldState([RFQ_A, RFQ_B], covA)).toBe("readonly");
    expect(processFieldState([RFQ_A, RFQ_B], { process_free: [], by_process: {} })).toBe("none");
    expect(processFieldState([RFQ_A, RFQ_B], { process_free: ["RFQ"], by_process: {} })).toBe("select");
  });
  it("is select (field hidden) when the user has no RFQ processes at all", () => {
    expect(processFieldState([], covA)).toBe("select");
  });
});

describe("nextProcessId", () => {
  const covA = { process_free: [], by_process: { 1: ["RFQ"] } };
  it("never touches the id when coverage is unknown (user keeps the select)", () => {
    expect(nextProcessId(null, [RFQ_A], null)).toBeNull();
    expect(nextProcessId(2, [RFQ_A], null)).toBe(2);
  });
  it("auto-selects the lone usable process", () => {
    expect(nextProcessId(null, [RFQ_A], covA)).toBe(1);
    expect(nextProcessId(2, [RFQ_A], covA)).toBe(1);
  });
  it("clears an id that is no longer usable, keeps one that is", () => {
    expect(nextProcessId(9, [RFQ_A, RFQ_B], covA)).toBeNull();
    expect(nextProcessId(2, [RFQ_A, RFQ_B], covA)).toBe(2);
    expect(nextProcessId(1, [], covA)).toBeNull();
  });
});

describe("mergeCoverages (multi-unit)", () => {
  const unit1 = { process_free: [], by_process: { 1: ["RFQ"], 2: ["RFQ"] } };
  const unit2 = { process_free: [], by_process: { 1: ["RFQ"] } };
  it("offers a process only when usable at every selected unit", () => {
    const merged = mergeCoverages([unit1, unit2]);
    expect(usableRfqProcesses([RFQ_A, RFQ_B], merged)).toEqual([RFQ_A]);
  });
  it("counts a unit's process_free RFQ policy for that unit", () => {
    const free = { process_free: ["RFQ"], by_process: {} };
    const merged = mergeCoverages([unit1, free]);
    expect(usableRfqProcesses([RFQ_A, RFQ_B], merged)).toEqual([RFQ_A, RFQ_B]);
  });
  it("is unknown if any unit's coverage is unknown", () => {
    expect(mergeCoverages([unit1, null])).toBeNull();
    expect(mergeCoverages([])).toBeNull();
  });
});
