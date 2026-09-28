/* ────────────────────────────────────────────────────────────
   Dashboard widget metadata — the admin-facing description of
   every `dashboard.*` permission.
   ──────────────────────────────────────────────────────────── */
/**
 * The role editor shows `dashboard.*` permissions to a client admin deciding
 * who sees which widget. A raw action like `my_commercial_approvals_pending`
 * tells them nothing, so each code carries the title the user will see on the
 * dashboard, one sentence of what it shows, and the persona it is meant for.
 *
 * This file has no component imports on purpose: the admin screens read it,
 * and they must not pull the whole buyer dashboard into their bundle. The
 * registry re-exports PERSONAS / PERSONA_LABELS from here so there is one
 * list of personas.
 *
 * Catalogue v1 — see backend docs/dashboard_v3/SPEC.md. Widgets cut in v1
 * (tech_approval_oldest_pending, deals_with_price_anomalies and the three
 * *_throughput cards) are intentionally absent; if the backend still returns
 * one of them, the role editor shows it under "Other".
 */

/** Persona groupings — used for admin grouping and dashboard section headings.
 *  Visibility is driven by permissions, NOT by persona membership. */
export const PERSONAS = {
  CROSS_ROLE: "cross_role",
  RFQ_CREATOR: "rfq_creator",
  RFQ_APPROVER: "rfq_approver",
  TECH_EVALUATOR: "tech_evaluator",
  TECH_APPROVER: "tech_approver",
  COMMERCIAL_EVALUATOR: "commercial_evaluator",
  COMMERCIAL_APPROVER: "commercial_approver",
  AWARDING: "awarding",
  APPROVER: "approver",
};

export const PERSONA_LABELS = {
  [PERSONAS.CROSS_ROLE]: "Cross-role",
  [PERSONAS.RFQ_CREATOR]: "RFQ Creator",
  [PERSONAS.RFQ_APPROVER]: "RFQ Approver",
  [PERSONAS.TECH_EVALUATOR]: "Technical Evaluator",
  [PERSONAS.TECH_APPROVER]: "Technical Approver",
  [PERSONAS.COMMERCIAL_EVALUATOR]: "Commercial Evaluator / N1 Negotiator",
  [PERSONAS.COMMERCIAL_APPROVER]: "Commercial Approver",
  [PERSONAS.AWARDING]: "Awarding P1 / P2",
  [PERSONAS.APPROVER]: "All Approvers",
};

/** Display order for persona groups (admin editor + dashboard headings). */
export const PERSONA_ORDER = [
  PERSONAS.CROSS_ROLE,
  PERSONAS.RFQ_CREATOR,
  PERSONAS.RFQ_APPROVER,
  PERSONAS.TECH_EVALUATOR,
  PERSONAS.TECH_APPROVER,
  PERSONAS.COMMERCIAL_EVALUATOR,
  PERSONAS.COMMERCIAL_APPROVER,
  PERSONAS.AWARDING,
  PERSONAS.APPROVER,
];

export const DASHBOARD_WIDGET_META = [
  // Cross-role
  { code: "action_center", title: "Action centre", persona: PERSONAS.CROSS_ROLE,
    description: "Counts of what needs attention now: approvals waiting, RFQs closing soon and rejected POs." },
  { code: "procurement_snapshot", title: "Procurement snapshot", persona: PERSONAS.CROSS_ROLE,
    description: "Headline figures for the period: committed spend, RFQs open for bidding and average turnaround." },
  { code: "negotiation_savings", title: "Negotiation savings", persona: PERSONAS.CROSS_ROLE,
    description: "Savings realised on awarded quotes through negotiation, with all-vendor savings alongside." },
  { code: "cost_intelligence", title: "Price benchmarking", persona: PERSONAS.CROSS_ROLE,
    description: "Price trend for top purchased items compared with the lowest price actually paid." },
  { code: "category_insights", title: "Spend by category", persona: PERSONAS.CROSS_ROLE,
    description: "How committed spend splits across product categories." },
  { code: "abc_analysis", title: "ABC analysis", persona: PERSONAS.CROSS_ROLE,
    description: "Items ranked into A, B and C classes by the value spent on them." },
  { code: "workflow_efficiency", title: "Stage turnaround", persona: PERSONAS.CROSS_ROLE,
    description: "Typical time each procurement stage takes, as median and 90th percentile." },
  { code: "smart_insights", title: "Insights", persona: PERSONAS.CROSS_ROLE,
    description: "Rule-based highlights such as price increases and best-priced vendors, each linked to where to act." },

  // RFQ creator
  { code: "my_drafts", title: "My drafts", persona: PERSONAS.RFQ_CREATOR,
    description: "RFQ drafts this user started and has not published." },
  { code: "my_active_rfqs", title: "My active RFQs", persona: PERSONAS.RFQ_CREATOR,
    description: "This user's live RFQs grouped by the stage each one is in." },
  { code: "my_no_response_rfqs", title: "My RFQs with no response", persona: PERSONAS.RFQ_CREATOR,
    description: "This user's RFQs that no vendor has responded to yet." },
  { code: "my_rfqs_bid_closed_no_quotes", title: "My RFQs closed without quotes", persona: PERSONAS.RFQ_CREATOR,
    description: "This user's RFQs whose bidding closed with no usable quote." },

  // RFQ approver (new in v1)
  { code: "my_rfq_approvals_pending", title: "RFQs awaiting my approval", persona: PERSONAS.RFQ_APPROVER,
    description: "RFQs waiting on this user's approval before they can go out." },

  // Technical evaluator
  { code: "my_tech_evals_pending", title: "Technical evaluations pending", persona: PERSONAS.TECH_EVALUATOR,
    description: "Technical evaluations that can be done now, in this user's business units." },
  { code: "tech_evals_with_vendor_disagreements", title: "Vendor disagreements", persona: PERSONAS.TECH_EVALUATOR,
    description: "Evaluations where a vendor has disagreed with a technical clause." },

  // Technical approver
  { code: "my_tech_approvals_pending", title: "Technical approvals awaiting me", persona: PERSONAS.TECH_APPROVER,
    description: "Technical evaluations waiting on this user's approval, oldest first." },

  // Commercial evaluator
  { code: "my_quote_compares", title: "Ready for quote comparison", persona: PERSONAS.COMMERCIAL_EVALUATOR,
    description: "RFQs whose bidding has closed and whose quotes are ready to compare." },
  { code: "my_active_negotiations", title: "My active negotiations", persona: PERSONAS.COMMERCIAL_EVALUATOR,
    description: "Negotiation rounds this user started that are still running." },
  { code: "savings_pipeline", title: "Savings pipeline", persona: PERSONAS.COMMERCIAL_EVALUATOR,
    description: "Savings from negotiations in the selected period compared with the one before." },

  // Commercial approver
  { code: "my_commercial_approvals_pending", title: "Negotiated quotes awaiting me", persona: PERSONAS.COMMERCIAL_APPROVER,
    description: "Negotiated quotes waiting on this user's approval." },

  // Awarding
  { code: "my_award_approvals_pending", title: "POs awaiting my approval", persona: PERSONAS.AWARDING,
    description: "Purchase orders waiting on this user's approval." },
  { code: "recent_awards", title: "Recently approved POs", persona: PERSONAS.AWARDING,
    description: "Purchase orders approved most recently in this user's business units." },
  { code: "award_value_pipeline", title: "PO value by stage", persona: PERSONAS.AWARDING,
    description: "Value of purchase orders at each stage, from approval to delivery, for the period." },

  // All approvers (new in v1)
  { code: "approval_turnaround", title: "Approval turnaround", persona: PERSONAS.APPROVER,
    description: "How long approvals take at each stage, measured from when the step reached the approver." },
];

const META_BY_CODE = DASHBOARD_WIDGET_META.reduce((acc, m) => {
  acc[m.code] = m;
  return acc;
}, {});

/** Lookup by bare code (`action_center`) or dotted code (`dashboard.action_center`). */
export const getWidgetMeta = (code = "") => {
  const key = code.toString().trim().replace(/^dashboard\./i, "").toLowerCase();
  return META_BY_CODE[key] || null;
};

/** Key used for permissions whose code is not in the catalogue. */
export const OTHER_GROUP = "other";
export const OTHER_GROUP_LABEL = "Other";

/**
 * Group permission items ({ action, ... }) by persona, in PERSONA_ORDER, with
 * unknown actions in a trailing "Other" group. Empty groups are dropped.
 * Within a group, items keep catalogue order; unknown items keep input order.
 */
export const groupDashboardPermissions = (items = []) => {
  const buckets = {};
  items.forEach((item) => {
    const meta = getWidgetMeta(item.action);
    const persona = meta ? meta.persona : OTHER_GROUP;
    (buckets[persona] = buckets[persona] || []).push({ ...item, meta });
  });
  const catalogueIndex = (item) => DASHBOARD_WIDGET_META.indexOf(item.meta);
  return [...PERSONA_ORDER, OTHER_GROUP]
    .filter((p) => buckets[p]?.length)
    .map((p) => ({
      persona: p,
      label: p === OTHER_GROUP ? OTHER_GROUP_LABEL : PERSONA_LABELS[p],
      items: p === OTHER_GROUP
        ? buckets[p]
        : buckets[p].slice().sort((a, b) => catalogueIndex(a) - catalogueIndex(b)),
    }));
};
