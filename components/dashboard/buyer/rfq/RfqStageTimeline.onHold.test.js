// R18: the on-hold sub-state is derived on the frontend from the per-PO `hold`.
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import RfqStageTimeline from "./RfqStageTimeline";

const hold = (over = {}) => ({
  send_back_id: 1, target_role: "RFQ_CREATOR", target: { id: 5, name: "Asha Rao" },
  reason_category: "EVIDENCE_MISSING", since: "2026-10-20T10:00:00Z", requested_by: { id: 9, name: "Vishal" }, ...over,
});
const stages = (pos, state = "active") => [
  { key: "overview", label: "Overview", state: "complete", summary: null, action: null },
  { key: "purchase-order", label: "Purchase Order", state, summary: null, action: null, phase: { purchase_orders: pos } },
];

describe("RfqStageTimeline: PO on hold", () => {
  test("shows the amber hold line with the person and the reason", () => {
    render(<RfqStageTimeline stages={stages([{ id: 1, hold: hold() }])} selectedKey="x" onSelect={() => {}} />);
    const line = screen.getByText("On hold, waiting on Asha Rao for: Photos or documents missing");
    expect(line).toHaveClass("t-warn");
  });

  test("with several holds it uses the oldest and adds +N more", () => {
    const pos = [
      { id: 1, hold: hold({ target: { id: 6, name: "Newer Person" }, reason_category: "OTHER", since: "2026-10-21T10:00:00Z" }) },
      { id: 2, hold: hold() },
      { id: 3, hold: null },
    ];
    render(<RfqStageTimeline stages={stages(pos)} selectedKey="x" onSelect={() => {}} />);
    expect(screen.getByText("On hold, waiting on Asha Rao for: Photos or documents missing +1 more")).toBeInTheDocument();
  });

  test("no hold renders today's text", () => {
    render(<RfqStageTimeline stages={stages([{ id: 1, hold: null }])} selectedKey="x" onSelect={() => {}} />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.queryByText(/On hold/)).toBeNull();
  });

  test("old payload (no hold key, no phase) renders today's text", () => {
    render(<RfqStageTimeline stages={[{ key: "purchase-order", label: "Purchase Order", state: "active", action: null }]} selectedKey="x" onSelect={() => {}} />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });
});
