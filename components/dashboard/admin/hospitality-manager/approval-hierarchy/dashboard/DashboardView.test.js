// Approval Hierarchy dashboard — the workflow list must never disagree with the
// KPI row above it, and must never render nothing without saying why.
//
// Production shape this reproduces (hospitality company 4, hotel 4): ONE process
// (id 2, process_type "RFQ") with SEVEN active policies — RFQ, TECHNICAL,
// NEGOTIATION, NEGOTIATION_QUOTE, PO plus TENDER and ARC — 13 approval levels in
// total. The grouping filter intersected each process's policies with
// getStageEntityOrder(process_type), so the TENDER and ARC policies matched no
// stage and vanished: the card showed 5 stages / 11 levels while the KPI row
// said 7 / 13.
//
// Separately, when the process list came back EMPTY (the backend was handed a
// hospitality company id where it wanted a buyer company id) every group was
// empty, the empty state was suppressed because policies.length > 0, and the
// page rendered a blank area with no explanation at all.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

import DashboardView from "./DashboardView";

const PROCESS = { id: 2, name: "Day to Day Procurement", process_type: "RFQ", is_active: true };

// 7 policies / 13 levels, mirroring production for hospitality company 4.
const LEVELS_BY_ENTITY = {
  RFQ: 2,
  TECHNICAL: 2,
  NEGOTIATION: 2,
  NEGOTIATION_QUOTE: 2,
  PO: 2,
  TENDER: 2,
  ARC: 1,
};

const POLICIES = Object.entries(LEVELS_BY_ENTITY).map(([entity_type, levels], i) => ({
  id: 8 + i,
  hospitality_company_id: 4,
  hotel_id: 4,
  process_id: PROCESS.id,
  entity_type,
  is_active: true,
  steps: Array.from({ length: levels }, (_, n) => ({
    id: (8 + i) * 100 + n,
    step_order: n + 1,
    decision_rule: "ANY",
    approver_user_id: 500 + n,
  })),
}));

const TOTAL_POLICIES = POLICIES.length;
const TOTAL_LEVELS = Object.values(LEVELS_BY_ENTITY).reduce((a, b) => a + b, 0);

const noop = () => {};
const getApproverDisplayInfo = () => ({ type: "User", name: "Approver", typeLabel: "User" });

function renderView(props = {}) {
  return render(
    <DashboardView
      policies={POLICIES}
      processes={[PROCESS]}
      departments={[]}
      onCreateWorkflow={noop}
      onEditWorkflow={noop}
      onDeleteWorkflow={noop}
      onDeletePolicy={noop}
      onCreateProcess={noop}
      onUpdateProcess={noop}
      onDeleteProcess={noop}
      getApproverDisplayInfo={getApproverDisplayInfo}
      getDeptSubGraphPreview={noop}
      {...props}
    />
  );
}

/** The KPI row renders "<value>" above "<label>"; read the value beside a label. */
function kpi(label) {
  return screen.getByText(label).parentElement.querySelector("div").textContent;
}

/** Stage short-labels rendered under each flow circle of the (single) card. */
const stageLabels = (container) =>
  [...container.querySelectorAll(".stageLabel")].map((n) => n.textContent);

describe("<DashboardView> — card totals reconcile with the KPI row", () => {
  it("renders all 7 stages of a single RFQ process, including TENDER and ARC", () => {
    const { container } = renderView();

    expect(kpi("Processes")).toBe("1");
    expect(kpi("Workflow Stages")).toBe(String(TOTAL_POLICIES)); // 7
    expect(kpi("Approval Levels")).toBe(String(TOTAL_LEVELS)); // 13

    // The card must agree with the KPI row on both counts.
    const meta = container.querySelector(".card .meta");
    expect(meta).not.toBeNull();
    expect(meta.textContent).toContain("7/7 stages");
    expect(meta.textContent).toContain("13 levels");
  });

  it("shows a stage circle for every configured entity type, TENDER and ARC included", () => {
    const { container } = renderView();
    const labels = stageLabels(container);

    // Canonical RFQ route first, then the stages this process carries outside it.
    expect(labels).toEqual(["RFQ", "Tech", "Neg", "NQ", "PO", "Tender", "ARC"]);
  });

  it("leaves a plain RFQ process at its canonical 5 stages", () => {
    const canonical = POLICIES.filter((p) => !["TENDER", "ARC"].includes(p.entity_type));
    const { container } = renderView({ policies: canonical });

    expect(stageLabels(container)).toEqual(["RFQ", "Tech", "Neg", "NQ", "PO"]);
    expect(container.querySelector(".card .meta").textContent).toContain("5/5 stages");
    expect(kpi("Workflow Stages")).toBe("5");
  });

  it("still groups process-free ARC policies into their own ARC card", () => {
    const arcOnly = [
      { ...POLICIES[0], id: 900, process_id: null, entity_type: "ARC" },
      { ...POLICIES[0], id: 901, process_id: null, entity_type: "ARC_COMMITTEE" },
    ];
    const { container } = renderView({ policies: arcOnly, processes: [] });

    expect(screen.getByText("ARC (Rate Contracts)")).toBeInTheDocument();
    expect(container.querySelector("[data-testid='workflow-diagnostic']")).toBeNull();
  });
});

describe("<DashboardView> — diagnostic instead of a blank screen", () => {
  it("explains itself when policies exist but no process matches them", () => {
    // The P0 as users saw it: processes = [] (the backend was querying the wrong
    // id space), policies = 7. Every group was empty, so nothing rendered at all.
    renderView({ processes: [] });

    // The KPI row still counts the policies…
    expect(kpi("Workflow Stages")).toBe("7");
    // …so the page must account for them rather than render an empty region.
    const diag = screen.getByTestId("workflow-diagnostic");
    expect(diag).toHaveTextContent(/could not be displayed/i);
    // It must name the count and the unmatched process id, so the next failure
    // of this class explains itself instead of looking like a blank page.
    expect(diag).toHaveTextContent("7");
    expect(diag).toHaveTextContent("2");
  });

  it("still shows the diagnostic when only SOME policies are unmatched", () => {
    const stray = { ...POLICIES[0], id: 9001, process_id: 4242, entity_type: "RFQ" };
    const { container } = renderView({ policies: [...POLICIES, stray] });

    // The healthy card still renders…
    expect(container.querySelector(".card .title").textContent).toBe("Day to Day Procurement");
    // …and the stray policy is accounted for rather than silently dropped.
    expect(screen.getByTestId("workflow-diagnostic")).toHaveTextContent("4242");
  });

  it("shows no diagnostic when every policy is rendered", () => {
    renderView();
    expect(screen.queryByTestId("workflow-diagnostic")).not.toBeInTheDocument();
  });

  it("keeps the true empty state when there is nothing at all to show", () => {
    renderView({ policies: [], processes: [] });
    expect(screen.queryByTestId("workflow-diagnostic")).not.toBeInTheDocument();
    expect(screen.queryByText(/could not be displayed/i)).not.toBeInTheDocument();
  });
});
