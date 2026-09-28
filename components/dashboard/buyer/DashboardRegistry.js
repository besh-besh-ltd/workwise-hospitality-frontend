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

import { PERSONAS, getWidgetMeta } from "./dashboardWidgetMeta";
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

import MyRfqApprovalsPending from "./persona-widgets/rfq-approver/MyRfqApprovalsPending";

import MyTechEvalsPending from "./persona-widgets/tech-evaluator/MyTechEvalsPending";
import TechEvalsWithDisagreements from "./persona-widgets/tech-evaluator/TechEvalsWithDisagreements";

import MyTechApprovalsPending from "./persona-widgets/tech-approver/MyTechApprovalsPending";

import MyQuoteCompares from "./persona-widgets/commercial-evaluator/MyQuoteCompares";
import MyActiveNegotiations from "./persona-widgets/commercial-evaluator/MyActiveNegotiations";
import SavingsPipeline from "./persona-widgets/commercial-evaluator/SavingsPipeline";

import MyCommercialApprovalsPending from "./persona-widgets/commercial-approver/MyCommercialApprovalsPending";

import MyAwardApprovalsPending from "./persona-widgets/awarding/MyAwardApprovalsPending";
import RecentAwards from "./persona-widgets/awarding/RecentAwards";
import AwardValuePipeline from "./persona-widgets/awarding/AwardValuePipeline";

import ApprovalTurnaround from "./persona-widgets/approver/ApprovalTurnaround";

/** Backend module key under which all dashboard widget permissions live.
 *  i.e. `dashboard.action_center` → moduleKey "dashboard", permission "action_center". */
export const DASHBOARD_MODULE_KEY = "dashboard";

/** Persona groupings + labels live in dashboardWidgetMeta.js (no component
 *  imports there, so admin screens can read them cheaply). Re-exported here so
 *  existing imports keep working. Visibility is driven by permissions, NOT by
 *  persona membership. */
export { PERSONAS, PERSONA_LABELS, PERSONA_ORDER } from "./dashboardWidgetMeta";

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
 *   persona     One of PERSONAS — dashboard section heading.
 *   component   The React component to render.
 *   column      One of COLUMN — layout placement (cross-role cards).
 *   order       Sort key within its column (low = first).
 *   label       Title the user sees (from dashboardWidgetMeta).
 *   description One-line summary (from dashboardWidgetMeta).
 *
 * persona / label / description come from dashboardWidgetMeta.js, the one
 * catalogue shared with the admin role editor — never restate them here.
 * Catalogue v1 (backend docs/dashboard_v3/SPEC.md).
 */
const entry = (permission, component, column, order) => {
  const meta = getWidgetMeta(permission);
  return {
    code: `dashboard.${permission}`,
    permission,
    persona: meta?.persona,
    component,
    column,
    order,
    label: meta?.title || permission,
    description: meta?.description || "",
  };
};

export const DASHBOARD_WIDGETS = [
  // ───── Cross-role ─────────────────────────────────────────────────
  entry("action_center", ActionCenter, COLUMN.FULL, 10),
  entry("procurement_snapshot", ProcurementSnapshot, COLUMN.FULL, 20),
  entry("negotiation_savings", NegotiationSavings, COLUMN.LEFT, 10),
  entry("cost_intelligence", CostIntelligence, COLUMN.LEFT, 20),
  entry("category_insights", CategoryInsights, COLUMN.RIGHT, 10),
  entry("abc_analysis", ABCAnalysis, COLUMN.RIGHT, 15),
  entry("workflow_efficiency", WorkflowEfficiency, COLUMN.RIGHT, 20),
  entry("smart_insights", SmartInsights, COLUMN.RIGHT, 30),

  // ───── RFQ creator ────────────────────────────────────────────────
  entry("my_drafts", MyDrafts, COLUMN.LEFT, 100),
  entry("my_active_rfqs", MyActiveRFQs, COLUMN.LEFT, 110),
  entry("my_no_response_rfqs", MyNoResponseRFQs, COLUMN.RIGHT, 100),
  entry("my_rfqs_bid_closed_no_quotes", MyRfqsBidClosedNoQuotes, COLUMN.RIGHT, 105),

  // ───── RFQ approver ───────────────────────────────────────────────
  entry("my_rfq_approvals_pending", MyRfqApprovalsPending, COLUMN.LEFT, 150),

  // ───── Technical evaluator ────────────────────────────────────────
  entry("my_tech_evals_pending", MyTechEvalsPending, COLUMN.LEFT, 200),
  entry("tech_evals_with_vendor_disagreements", TechEvalsWithDisagreements, COLUMN.RIGHT, 200),

  // ───── Technical approver ─────────────────────────────────────────
  entry("my_tech_approvals_pending", MyTechApprovalsPending, COLUMN.LEFT, 300),

  // ───── Commercial evaluator / N1 ──────────────────────────────────
  entry("my_quote_compares", MyQuoteCompares, COLUMN.LEFT, 400),
  entry("my_active_negotiations", MyActiveNegotiations, COLUMN.LEFT, 410),
  entry("savings_pipeline", SavingsPipeline, COLUMN.RIGHT, 400),

  // ───── Commercial approver ────────────────────────────────────────
  entry("my_commercial_approvals_pending", MyCommercialApprovalsPending, COLUMN.LEFT, 500),

  // ───── Awarding ───────────────────────────────────────────────────
  entry("my_award_approvals_pending", MyAwardApprovalsPending, COLUMN.LEFT, 600),
  entry("recent_awards", RecentAwards, COLUMN.LEFT, 610),
  entry("award_value_pipeline", AwardValuePipeline, COLUMN.RIGHT, 600),

  // ───── All approvers ──────────────────────────────────────────────
  entry("approval_turnaround", ApprovalTurnaround, COLUMN.RIGHT, 700),
];

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
