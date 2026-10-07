import {
  DASHBOARD_WIDGET_META,
  PERSONAS,
  PERSONA_LABELS,
  PERSONA_ORDER,
  getWidgetMeta,
  groupDashboardPermissions,
} from "./dashboardWidgetMeta";

// Catalogue v1 (backend docs/dashboard_v3/SPEC.md).
const V1_CODES = [
  "action_center", "procurement_snapshot", "negotiation_savings", "cost_intelligence",
  "category_insights", "abc_analysis", "workflow_efficiency", "smart_insights",
  "my_drafts", "my_active_rfqs", "my_no_response_rfqs", "my_rfqs_bid_closed_no_quotes",
  "my_tech_evals_pending", "tech_evals_with_vendor_disagreements", "my_tech_approvals_pending",
  "my_quote_compares", "my_active_negotiations", "savings_pipeline",
  "my_commercial_approvals_pending", "my_award_approvals_pending", "recent_awards",
  "award_value_pipeline", "my_rfq_approvals_pending", "approval_turnaround",
];
const CUT_CODES = [
  "tech_approval_oldest_pending", "deals_with_price_anomalies", "tech_eval_throughput",
  "tech_approval_throughput", "commercial_approval_throughput",
];

test("meta covers exactly catalogue v1", () => {
  expect(DASHBOARD_WIDGET_META.map((m) => m.code).sort()).toEqual([...V1_CODES].sort());
  CUT_CODES.forEach((c) => expect(getWidgetMeta(c)).toBeNull());
});

test("every entry has a title, one-sentence description and a known persona", () => {
  DASHBOARD_WIDGET_META.forEach((m) => {
    expect(m.title).toBeTruthy();
    expect(m.description).toMatch(/\.$/);
    expect(Object.values(PERSONAS)).toContain(m.persona);
  });
  PERSONA_ORDER.forEach((p) => expect(PERSONA_LABELS[p]).toBeTruthy());
});

test("lookup accepts dotted codes and any case", () => {
  expect(getWidgetMeta("dashboard.my_drafts").title).toBe("My drafts");
  expect(getWidgetMeta("MY_DRAFTS").title).toBe("My drafts");
});

test("grouping drops empty personas and puts unknown codes last", () => {
  const groups = groupDashboardPermissions([
    { id: 1, action: "brand_new_widget" },
    { id: 2, action: "approval_turnaround" },
    { id: 3, action: "my_drafts" },
  ]);
  expect(groups.map((g) => g.persona)).toEqual(["rfq_creator", "approver", "other"]);
  expect(groups[2].label).toBe("Other");
  expect(groups[2].items[0].meta).toBeNull();
});
