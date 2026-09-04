// Approval Hierarchy dashboard — the workflow list must never disagree with the
// KPI row above it, and must never render nothing without saying why.
//
// Those two rules pull against a third: a process card must show its own route.
// ARC approvals are PROCESS-FREE — arcController.publish and
// arcAmendmentController resolve their policy with the ARC's process_id, which
// is NULL by design, and findBestMatchingPolicyTx matches `process_id = $4 OR
// process_id IS NULL`. An ARC policy pinned to a process therefore can never be
// selected: it is a dead row. Staging carries 26 of them and production 1, all
// with zero approval instances ever bound. Painting them into an RFQ process's
// flow ("2/7 stages", circles 6 ARC and 7 Amend) told admins a rate-contract
// gate was configured on their RFQ route when nothing of the sort was true.
// So they leave the card — but they must still be ACCOUNTED for, which is what
// the misrouted-ARC diagnostic below is for. Silence is the one thing barred.
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
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import DashboardView from "./DashboardView";
import { getMisroutedArcPolicies } from "../constants";

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
  it("keeps TENDER on the card — it is a real process-route stage", () => {
    const noArc = POLICIES.filter((p) => p.entity_type !== "ARC");
    const { container } = renderView({ policies: noArc });

    expect(kpi("Processes")).toBe("1");
    expect(kpi("Workflow Stages")).toBe("6");
    expect(kpi("Approval Levels")).toBe("12");

    // A TENDER entity is created under a process, so a TENDER policy pinned to
    // this process is reachable. The card must agree with the KPI row.
    const meta = container.querySelector(".card .meta");
    expect(meta).not.toBeNull();
    expect(meta.textContent).toContain("6/6 stages");
    expect(meta.textContent).toContain("12 levels");
    expect(stageLabels(container)).toEqual(["RFQ", "Tech", "Neg", "NQ", "PO", "Tender"]);
  });

  it("does not paint ARC or Amendment into an RFQ process's flow", () => {
    const { container } = renderView();
    const labels = stageLabels(container);

    expect(labels).toEqual(["RFQ", "Tech", "Neg", "NQ", "PO", "Tender"]);
    expect(labels).not.toContain("ARC");
    expect(labels).not.toContain("Amend");
    // …and the card's own totals drop the stage it no longer shows.
    expect(container.querySelector(".card .meta").textContent).toContain("6/6 stages");
  });

  it("accounts for the ARC policy it removed instead of dropping it silently", () => {
    renderView();

    // The KPI row still counts every policy…
    expect(kpi("Workflow Stages")).toBe(String(TOTAL_POLICIES)); // 7
    // …so the one the card stopped showing has to be explained on the page.
    const diag = screen.getByTestId("arc-misrouted-diagnostic");
    expect(diag).toHaveTextContent(/process-free/i);
    expect(diag).toHaveTextContent("ARC");
    expect(diag).toHaveTextContent("Day to Day Procurement");
  });

  it("says nothing about misrouted ARC when a process carries none", () => {
    const noArc = POLICIES.filter((p) => p.entity_type !== "ARC");
    renderView({ policies: noArc });
    expect(screen.queryByTestId("arc-misrouted-diagnostic")).not.toBeInTheDocument();
  });

  it("leaves a genuine process-free ARC policy alone", () => {
    const arcFree = [
      ...POLICIES.filter((p) => p.entity_type !== "ARC"),
      { ...POLICIES[0], id: 950, process_id: null, entity_type: "ARC" },
    ];
    renderView({ policies: arcFree });
    expect(screen.getByText("ARC (Rate Contracts)")).toBeInTheDocument();
    expect(screen.queryByTestId("arc-misrouted-diagnostic")).not.toBeInTheDocument();
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
    renderView({ policies: POLICIES.filter((p) => p.entity_type !== "ARC") });
    expect(screen.queryByTestId("workflow-diagnostic")).not.toBeInTheDocument();
    expect(screen.queryByTestId("arc-misrouted-diagnostic")).not.toBeInTheDocument();
  });

  it("keeps the true empty state when there is nothing at all to show", () => {
    renderView({ policies: [], processes: [] });
    expect(screen.queryByTestId("workflow-diagnostic")).not.toBeInTheDocument();
    expect(screen.queryByText(/could not be displayed/i)).not.toBeInTheDocument();
  });
});

// An approval level names a person or a role, and until now nothing on the page
// said which part of the business that person sits in. Two approvers called
// "Vineet I" and "Vineet II" are indistinguishable in a list of levels; an admin
// auditing a chain has to leave the page and look each one up. The department is
// already loaded — useApprovalData enriches every resolved approver with
// departmentNames from /rbac/users/batch-departments — it simply was not drawn.
describe("<DashboardView> — an expanded level names each approver's departments", () => {
  const DEPTS = {
    408: ["F&B Production", "Housekeeping", "IT", "Projects", "Purchase"],
    412: ["Purchase"],
  };

  const withApprover = (info) => () => info;

  const expandFirstStage = (container) => {
    fireEvent.click(container.querySelector(".stage"));
  };

  it("shows the departments of a Specific User approver", () => {
    const { container } = renderView({
      policies: [POLICIES[0]],
      getApproverDisplayInfo: withApprover({
        type: "User",
        typeLabel: "Specific User",
        name: "Vineet I",
        email: "vineet+hos@letsworkwise.com",
        users: [{ user_id: 408, name: "Vineet I", departmentNames: DEPTS[408] }],
      }),
    });
    expandFirstStage(container);

    DEPTS[408].forEach((d) => {
      expect(screen.getAllByText(d).length).toBeGreaterThan(0);
    });
  });

  it("shows departments per user when the approver is a Role", () => {
    const { container } = renderView({
      policies: [POLICIES[0]],
      getApproverDisplayInfo: withApprover({
        type: "Role",
        typeLabel: "User Role",
        name: "CEO",
        email: "",
        users: [
          { user_id: 408, name: "Vineet I", email: "a@x.com", departmentNames: DEPTS[408] },
          { user_id: 412, name: "Vineet II", email: "b@x.com", departmentNames: DEPTS[412] },
        ],
      }),
    });
    expandFirstStage(container);

    // The role's user list is collapsed behind a toggle; open it.
    fireEvent.click(screen.getAllByText(/2 users/)[0].closest("button"));

    const rows = [...container.querySelectorAll(".userRow")];
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("Purchase");
    expect(rows[1].textContent).toContain("Purchase");
    // Vineet I sits in five departments, Vineet II in one — the row must
    // distinguish them, which is the entire point of showing this.
    expect(rows[0].textContent).toContain("Housekeeping");
    expect(rows[1].textContent).not.toContain("Housekeeping");
  });

  it("renders a level cleanly when the approver has no department", () => {
    const { container } = renderView({
      policies: [POLICIES[0]],
      getApproverDisplayInfo: withApprover({
        type: "User",
        typeLabel: "Specific User",
        name: "Unmapped Person",
        email: "u@x.com",
        users: [{ user_id: 999, name: "Unmapped Person", departmentNames: [] }],
      }),
    });
    expandFirstStage(container);

    expect(screen.getAllByText("Unmapped Person").length).toBeGreaterThan(0);
    expect(container.querySelector(".deptList")).toBeNull();
  });
});

// getMisroutedArcPolicies is exported and reads as a general predicate, so its
// contract is pinned here rather than only through the one caller that happens
// to pre-filter process-free policies out. Drop the process_id test and a
// perfectly good ARC-card policy gets reported as broken.
describe("getMisroutedArcPolicies", () => {
  const arc = (over) => ({ id: 1, entity_type: "ARC", process_id: 7, ...over });

  it("reports an ARC policy pinned to an RFQ process", () => {
    expect(getMisroutedArcPolicies("RFQ", [arc()])).toHaveLength(1);
  });

  it("ignores a process-free ARC policy — that is the supported shape", () => {
    expect(getMisroutedArcPolicies("RFQ", [arc({ process_id: null })])).toHaveLength(0);
  });

  it("ignores ARC on a TENDER process, whose route names ARC as its last stage", () => {
    expect(getMisroutedArcPolicies("TENDER", [arc()])).toHaveLength(0);
    // …but ARC_AMENDMENT is on no process route at all.
    expect(getMisroutedArcPolicies("TENDER", [arc({ entity_type: "ARC_AMENDMENT" })])).toHaveLength(1);
  });

  it("ignores ordinary process-route policies", () => {
    expect(getMisroutedArcPolicies("RFQ", [arc({ entity_type: "PO" })])).toHaveLength(0);
  });
});
