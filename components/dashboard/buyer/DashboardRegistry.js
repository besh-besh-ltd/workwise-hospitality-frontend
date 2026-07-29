/* ────────────────────────────────────────────────────────────
   Dashboard widget registry
   ──────────────────────────────────────────────────────────── */
/* eslint-disable no-unused-vars */
/**
 * Single source of truth for every buyer-dashboard widget.
 *
 * Each entry maps a `dashboard.*` permission code to its renderable
 * component plus layout metadata (persona group + column placement).
 * The buyer dashboard iterates this list, intersects against the
 * current user's permissions (see hooks/useDashboardWidgets.js),
 * and renders the resulting subset.
 *
 * To add a new widget:
 *   1. Build the component (mirror existing card pattern under
 *      `dashboard-components/` or `persona-widgets/`).
 *   2. Append a new entry below with its permission code + metadata.
 *   3. Add the backend permission code to the catalogue (separate
 *      ticket) so admins can grant it via RoleScopeSelector.
 *
 * No other file should hardcode the widget list — keep this
 * declarative and the registry stays the only place to touch.
 */

import ActionCenter from "./dashboard-components/ActionCenter";
import ProcurementSnapshot from "./dashboard-components/ProcurementSnapshot";
import NegotiationSavings from "./dashboard-components/NegotiationSavings";
import CostIntelligence from "./dashboard-components/CostIntelligence";
import CategoryInsights from "./dashboard-components/CategoryInsights";
import ABCAnalysis from "./dashboard-components/ABCAnalysis";
import WorkflowEfficiency from "./dashboard-components/WorkflowEfficiency";
import SmartInsights from "./dashboard-components/SmartInsights";

// Persona widgets
import MyDrafts from "./persona-widgets/rfq-creator/MyDrafts";
import MyActiveRFQs from "./persona-widgets/rfq-creator/MyActiveRFQs";
import MyNoResponseRFQs from "./persona-widgets/rfq-creator/MyNoResponseRFQs";
import MyRfqsBidClosedNoQuotes from "./persona-widgets/rfq-creator/MyRfqsBidClosedNoQuotes";

import MyTechEvalsPending from "./persona-widgets/tech-evaluator/MyTechEvalsPending";
import TechEvalsWithDisagreements from "./persona-widgets/tech-evaluator/TechEvalsWithDisagreements";
import TechEvalThroughput from "./persona-widgets/tech-evaluator/TechEvalThroughput";

import MyTechApprovalsPending from "./persona-widgets/tech-approver/MyTechApprovalsPending";
import TechApprovalOldestPending from "./persona-widgets/tech-approver/TechApprovalOldestPending";
import TechApprovalThroughput from "./persona-widgets/tech-approver/TechApprovalThroughput";

import MyQuoteCompares from "./persona-widgets/commercial-evaluator/MyQuoteCompares";
import MyActiveNegotiations from "./persona-widgets/commercial-evaluator/MyActiveNegotiations";
import SavingsPipeline from "./persona-widgets/commercial-evaluator/SavingsPipeline";

import MyCommercialApprovalsPending from "./persona-widgets/commercial-approver/MyCommercialApprovalsPending";
import DealsWithPriceAnomalies from "./persona-widgets/commercial-approver/DealsWithPriceAnomalies";
import CommercialApprovalThroughput from "./persona-widgets/commercial-approver/CommercialApprovalThroughput";

import MyAwardApprovalsPending from "./persona-widgets/awarding/MyAwardApprovalsPending";
import RecentAwards from "./persona-widgets/awarding/RecentAwards";
import AwardValuePipeline from "./persona-widgets/awarding/AwardValuePipeline";

/** Backend module key under which all dashboard widget permissions live.
 *  i.e. `dashboard.action_center` → moduleKey "dashboard", permission "action_center". */
export const DASHBOARD_MODULE_KEY = "dashboard";

/** Persona groupings — used purely for admin documentation / UI grouping.
 *  Visibility is driven by permissions, NOT by persona membership. */
export const PERSONAS = {
  CROSS_ROLE: "cross_role",
  RFQ_CREATOR: "rfq_creator",
  TECH_EVALUATOR: "tech_evaluator",
  TECH_APPROVER: "tech_approver",
  COMMERCIAL_EVALUATOR: "commercial_evaluator",
  COMMERCIAL_APPROVER: "commercial_approver",
  AWARDING: "awarding",
};

export const PERSONA_LABELS = {
  [PERSONAS.CROSS_ROLE]: "Cross-role",
  [PERSONAS.RFQ_CREATOR]: "RFQ Creator",
  [PERSONAS.TECH_EVALUATOR]: "Technical Evaluator",
  [PERSONAS.TECH_APPROVER]: "Technical Approver",
  [PERSONAS.COMMERCIAL_EVALUATOR]: "Commercial Evaluator / N1 Negotiator",
  [PERSONAS.COMMERCIAL_APPROVER]: "Commercial Approver",
  [PERSONAS.AWARDING]: "Awarding P1 / P2",
};

/** Column placement within the dashboard layout. */
export const COLUMN = {
  /** Spans the full row above the 2-col layout. */
  FULL: "full",
  /** Left column of the 2-col layout. */
  LEFT: "left",
  /** Right column of the 2-col layout. */
  RIGHT: "right",
};

/**
 * Widget entry shape:
 *   code        Canonical dotted identifier (`dashboard.X`). Used in
 *               admin permission UI and as the React key.
 *   permission  Backend permission string (the part AFTER `dashboard.`)
 *               — matches what `getBulkPermissions("dashboard", ...)`
 *               returns inside `permissions.dashboard[]`.
 *   persona     One of PERSONAS — for admin grouping.
 *   component   The React component to render. If null/undefined, the
 *               registry entry is metadata-only and the renderer skips
 *               it (used to declare upcoming widgets ahead of build).
 *   column      One of COLUMN — layout placement.
 *   order       Sort key within its column (low = first).
 *   label       Human-readable widget name (admin docs, tooltips).
 *   description One-line summary of what the widget shows.
 */
export const DASHBOARD_WIDGETS = [
  // ───── Cross-role: existing widgets (gated) ─────────────────────────
  {
    code: "dashboard.action_center",
    permission: "action_center",
    persona: PERSONAS.CROSS_ROLE,
    component: ActionCenter,
    column: COLUMN.FULL,
    order: 10,
    label: "Action Center",
    description: "Top-of-mind action queue (approvals, no-responses, RFQs ending soon, PO rejections).",
  },
  {
    code: "dashboard.procurement_snapshot",
    permission: "procurement_snapshot",
    persona: PERSONAS.CROSS_ROLE,
    component: ProcurementSnapshot,
    column: COLUMN.FULL,
    order: 20,
    label: "Procurement Snapshot",
    description: "Headline counts: Total RFQs, Active Tenders, POs Issued, Total Spend, Avg Turnaround.",
  },
  {
    code: "dashboard.negotiation_savings",
    permission: "negotiation_savings",
    persona: PERSONAS.CROSS_ROLE,
    component: NegotiationSavings,
    column: COLUMN.LEFT,
    order: 10,
    label: "Negotiation Savings",
    description: "Market baseline vs negotiated total, savings ₹ and %.",
  },
  {
    code: "dashboard.cost_intelligence",
    permission: "cost_intelligence",
    persona: PERSONAS.CROSS_ROLE,
    component: CostIntelligence,
    column: COLUMN.LEFT,
    order: 20,
    label: "Cost Intelligence",
    description: "Spend trends over time, category-filterable line chart.",
  },
  {
    code: "dashboard.category_insights",
    permission: "category_insights",
    persona: PERSONAS.CROSS_ROLE,
    component: CategoryInsights,
    column: COLUMN.RIGHT,
    order: 10,
    label: "Category Insights",
    description: "Spend by category / sub-category / item — donut chart + table.",
  },
  {
    code: "dashboard.abc_analysis",
    permission: "abc_analysis",
    persona: PERSONAS.CROSS_ROLE,
    component: ABCAnalysis,
    column: COLUMN.RIGHT,
    order: 15,
    label: "ABC Analysis",
    description: "Pareto A/B/C classification of procured items by value or volume.",
  },
  {
    code: "dashboard.workflow_efficiency",
    permission: "workflow_efficiency",
    persona: PERSONAS.CROSS_ROLE,
    component: WorkflowEfficiency,
    column: COLUMN.RIGHT,
    order: 20,
    label: "Workflow Efficiency",
    description: "RFQ lifecycle dwell times stage-by-stage with bottleneck alerts.",
  },
  {
    code: "dashboard.smart_insights",
    permission: "smart_insights",
    persona: PERSONAS.CROSS_ROLE,
    component: SmartInsights,
    column: COLUMN.RIGHT,
    order: 30,
    label: "Smart Insights",
    description: "AI-generated alerts: price anomalies, vendor optimisation, spend trends.",
  },

  // ───── Persona-targeted widgets — declared as metadata-only stubs ───
  // Components land in follow-on tasks (#13–18). Stubs keep the
  // permission catalogue + admin docs honest about what's coming.

  // RFQ Creator
  {
    code: "dashboard.my_drafts",
    permission: "my_drafts",
    persona: PERSONAS.RFQ_CREATOR,
    component: MyDrafts,
    column: COLUMN.LEFT,
    order: 100,
    label: "My drafts",
    description: "RFQs you started but haven't published yet.",
  },
  {
    code: "dashboard.my_active_rfqs",
    permission: "my_active_rfqs",
    persona: PERSONAS.RFQ_CREATOR,
    component: MyActiveRFQs,
    column: COLUMN.LEFT,
    order: 110,
    label: "My active RFQs",
    description: "Your live RFQs grouped by current lifecycle stage.",
  },
  {
    code: "dashboard.my_no_response_rfqs",
    permission: "my_no_response_rfqs",
    persona: PERSONAS.RFQ_CREATOR,
    component: MyNoResponseRFQs,
    column: COLUMN.RIGHT,
    order: 100,
    label: "Vendors yet to quote",
    description: "Live RFQs of yours where one or more invited vendors haven't quoted.",
  },
  {
    code: "dashboard.my_rfqs_bid_closed_no_quotes",
    permission: "my_rfqs_bid_closed_no_quotes",
    persona: PERSONAS.RFQ_CREATOR,
    component: MyRfqsBidClosedNoQuotes,
    column: COLUMN.RIGHT,
    order: 105,
    label: "Needs urgent attention",
    description: "RFQs whose bid window has passed but received zero quotes — re-publish or escalate.",
  },

  // Technical Evaluator
  {
    code: "dashboard.my_tech_evals_pending",
    permission: "my_tech_evals_pending",
    persona: PERSONAS.TECH_EVALUATOR,
    component: MyTechEvalsPending,
    column: COLUMN.LEFT,
    order: 200,
    label: "My tech-evals pending",
    description: "Products awaiting your tech-eval clause responses — sorted by oldest.",
  },
  {
    code: "dashboard.tech_evals_with_vendor_disagreements",
    permission: "tech_evals_with_vendor_disagreements",
    persona: PERSONAS.TECH_EVALUATOR,
    component: TechEvalsWithDisagreements,
    column: COLUMN.LEFT,
    order: 210,
    label: "Vendor-disagreement items",
    description: "Tech-eval items where one or more vendors flagged disagree — extra study needed.",
  },
  {
    code: "dashboard.tech_eval_throughput",
    permission: "tech_eval_throughput",
    persona: PERSONAS.TECH_EVALUATOR,
    component: TechEvalThroughput,
    column: COLUMN.RIGHT,
    order: 200,
    label: "Tech-eval throughput",
    description: "Avg turnaround time this period vs last (▲/▼ delta + 4-week sparkline).",
  },

  // Technical Approver
  {
    code: "dashboard.my_tech_approvals_pending",
    permission: "my_tech_approvals_pending",
    persona: PERSONAS.TECH_APPROVER,
    component: MyTechApprovalsPending,
    column: COLUMN.LEFT,
    order: 300,
    label: "My tech-approvals pending",
    description: "Tech-eval results queued for your approval.",
  },
  {
    code: "dashboard.tech_approval_oldest_pending",
    permission: "tech_approval_oldest_pending",
    persona: PERSONAS.TECH_APPROVER,
    component: TechApprovalOldestPending,
    column: COLUMN.LEFT,
    order: 310,
    label: "Oldest in my approval queue",
    description: "Top 5 items waiting on you the longest — proactive escalation.",
  },
  {
    code: "dashboard.tech_approval_throughput",
    permission: "tech_approval_throughput",
    persona: PERSONAS.TECH_APPROVER,
    component: TechApprovalThroughput,
    column: COLUMN.RIGHT,
    order: 300,
    label: "Tech-approval throughput",
    description: "Avg approval time this period vs last (▲/▼ delta + 4-week sparkline).",
  },

  // Commercial Evaluator / N1 Negotiator
  {
    code: "dashboard.my_quote_compares",
    permission: "my_quote_compares",
    persona: PERSONAS.COMMERCIAL_EVALUATOR,
    component: MyQuoteCompares,
    column: COLUMN.LEFT,
    order: 400,
    label: "My quote-compares",
    description: "RFQs in quote-compare stage awaiting your decision.",
  },
  {
    code: "dashboard.my_active_negotiations",
    permission: "my_active_negotiations",
    persona: PERSONAS.COMMERCIAL_EVALUATOR,
    component: MyActiveNegotiations,
    column: COLUMN.LEFT,
    order: 410,
    label: "My active negotiations",
    description: "Negotiation rounds where you're the lead — with silent-vendor flags.",
  },
  {
    code: "dashboard.savings_pipeline",
    permission: "savings_pipeline",
    persona: PERSONAS.COMMERCIAL_EVALUATOR,
    component: SavingsPipeline,
    column: COLUMN.RIGHT,
    order: 400,
    label: "Savings pipeline",
    description: "Cumulative ₹ savings from negotiations you led this period.",
  },

  // Commercial Approver
  {
    code: "dashboard.my_commercial_approvals_pending",
    permission: "my_commercial_approvals_pending",
    persona: PERSONAS.COMMERCIAL_APPROVER,
    component: MyCommercialApprovalsPending,
    column: COLUMN.LEFT,
    order: 500,
    label: "My commercial approvals pending",
    description: "Pending approval count, total ₹ value, and top-3 by ₹ awaiting your sign-off.",
  },
  {
    code: "dashboard.deals_with_price_anomalies",
    permission: "deals_with_price_anomalies",
    persona: PERSONAS.COMMERCIAL_APPROVER,
    component: DealsWithPriceAnomalies,
    column: COLUMN.LEFT,
    order: 510,
    label: "Price-anomaly approvals",
    description: "Approvals where awarded unit-price is significantly above the last purchase of the same product.",
  },
  {
    code: "dashboard.commercial_approval_throughput",
    permission: "commercial_approval_throughput",
    persona: PERSONAS.COMMERCIAL_APPROVER,
    component: CommercialApprovalThroughput,
    column: COLUMN.RIGHT,
    order: 500,
    label: "Commercial-approval throughput",
    description: "Avg approval time this period vs last (▲/▼ delta + 4-week sparkline).",
  },

  // Awarding P1 / P2
  {
    code: "dashboard.my_award_approvals_pending",
    permission: "my_award_approvals_pending",
    persona: PERSONAS.AWARDING,
    component: MyAwardApprovalsPending,
    column: COLUMN.LEFT,
    order: 600,
    label: "My award approvals pending",
    description: "Awards waiting on your approval — any step in the chain where you're next.",
  },
  {
    code: "dashboard.recent_awards",
    permission: "recent_awards",
    persona: PERSONAS.AWARDING,
    component: RecentAwards,
    column: COLUMN.LEFT,
    order: 610,
    label: "Recent awards",
    description: "What you've cleared recently, with links to the resulting POs.",
  },
  {
    code: "dashboard.award_value_pipeline",
    permission: "award_value_pipeline",
    persona: PERSONAS.AWARDING,
    component: AwardValuePipeline,
    column: COLUMN.RIGHT,
    order: 600,
    label: "Award value pipeline",
    description: "₹ completed (PO approved + vendor accepted) vs ₹ ongoing (in approval / awaiting vendor).",
  },
];

/** All widget codes (regardless of whether a component is yet built).
 *  Useful for admin permission UI even before all renderers ship. */
export const ALL_WIDGET_CODES = DASHBOARD_WIDGETS.map((w) => w.code);

/** Permission names (the part after `dashboard.`) — what the backend
 *  returns inside `permissions.dashboard[]`. */
export const ALL_WIDGET_PERMISSIONS = DASHBOARD_WIDGETS.map((w) => w.permission);

/** Look up a registry entry by widget code. */
export const getWidgetByCode = (code) =>
  DASHBOARD_WIDGETS.find((w) => w.code === code) || null;

/** Look up a registry entry by backend permission name. */
export const getWidgetByPermission = (permission) =>
  DASHBOARD_WIDGETS.find((w) => w.permission === permission) || null;

/** Renderable widgets only (component defined). */
export const getRenderableWidgets = () =>
  DASHBOARD_WIDGETS.filter((w) => typeof w.component === "function");

/** Group widgets by persona — for admin documentation views. */
export const groupByPersona = () =>
  Object.values(PERSONAS).reduce((acc, p) => {
    acc[p] = DASHBOARD_WIDGETS.filter((w) => w.persona === p);
    return acc;
  }, {});
