jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import fs from "fs";
import path from "path";
import RfqProcessField, { NO_RFQ_WORKFLOW_MESSAGE } from "./RfqProcessField";
import { usableRfqProcesses, isTenderAvailable } from "@/utils/policyCoverage";

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
    const { container } = render(<RfqProcessField {...base} processes={[RFQ_A]} noneUsable={false} />);
    expect(screen.getByTestId("process-readonly")).toHaveTextContent("Day to Day");
    expect(container.querySelector("#select_process-create_rfq_page")).toBeNull();
  });

  it("explains instead of rendering a required select when none is usable", () => {
    const { container } = render(<RfqProcessField {...base} processes={[]} noneUsable />);
    expect(screen.getByText(NO_RFQ_WORKFLOW_MESSAGE)).toBeInTheDocument();
    expect(NO_RFQ_WORKFLOW_MESSAGE).toBe(
      "No approval workflow is set up for RFQs at this unit. Ask your company admin to set one up."
    );
    expect(container.textContent).not.toMatch(/Required/);
    expect(container.querySelector(".rfq-required")).toBeNull();
  });

  it("renders the required select when several processes work", () => {
    render(<RfqProcessField {...base} processes={[RFQ_A, RFQ_B]} noneUsable={false} />);
    expect(screen.getByText("Select Process")).toBeInTheDocument();
  });
});

describe("CreateRFQ wiring", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/buyer/createRFQ/CreateRFQ.js"),
    "utf8"
  );
  it("derives the process list from coverage and uses the field component", () => {
    expect(source).toMatch(/usePolicyCoverage\(/);
    expect(source).toMatch(/usableRfqProcesses\(allProcesses, coverage\)/);
    expect(source).toMatch(/<RfqProcessField/);
  });
  it("only requires a process when one can be picked", () => {
    expect(source).toMatch(/processes\.length > 0 && !formDataCopy\.process_id/);
  });
});
