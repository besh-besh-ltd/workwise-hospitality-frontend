jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

import {
  DASHBOARD_WIDGETS,
  ALL_WIDGET_CODES,
  ALL_WIDGET_PERMISSIONS,
  COLUMN,
  PERSONAS,
  getWidgetByCode,
  getWidgetByPermission,
  getRenderableWidgets,
  groupByPersona,
} from "./DashboardRegistry";
import { DASHBOARD_WIDGET_META, getWidgetMeta } from "./dashboardWidgetMeta";

// Catalogue v1 — backend docs/dashboard_v3/SPEC.md "Widget catalogue v1".
// The backend seeds exactly these `dashboard.*` permission rows.
const CATALOGUE_V1 = [
  "action_center", "procurement_snapshot", "negotiation_savings", "cost_intelligence",
  "category_insights", "abc_analysis", "workflow_efficiency", "smart_insights",
  "my_drafts", "my_active_rfqs", "my_no_response_rfqs", "my_rfqs_bid_closed_no_quotes",
  "my_tech_evals_pending", "tech_evals_with_vendor_disagreements",
  "my_tech_approvals_pending",
  "my_quote_compares", "my_active_negotiations", "savings_pipeline",
  "my_commercial_approvals_pending",
  "my_award_approvals_pending", "recent_awards", "award_value_pipeline",
  "my_rfq_approvals_pending", "approval_turnaround",
];
const CUT_IN_V1 = [
  "tech_approval_oldest_pending", "deals_with_price_anomalies", "tech_eval_throughput",
  "tech_approval_throughput", "commercial_approval_throughput",
];

describe("DashboardRegistry — catalogue v1", () => {
  it("registry codes === widget meta codes === SPEC catalogue v1", () => {
    const sorted = (a) => [...a].sort();
    expect(sorted(ALL_WIDGET_PERMISSIONS)).toEqual(sorted(CATALOGUE_V1));
    expect(sorted(DASHBOARD_WIDGET_META.map((m) => m.code))).toEqual(sorted(CATALOGUE_V1));
  });

  it("no widget cut in v1 is registered", () => {
    CUT_IN_V1.forEach((code) => expect(getWidgetByPermission(code)).toBeNull());
  });

  it("persona, title and description come from the meta catalogue", () => {
    DASHBOARD_WIDGETS.forEach((w) => {
      const meta = getWidgetMeta(w.permission);
      expect(meta).not.toBeNull();
      expect(w.persona).toBe(meta.persona);
      expect(w.label).toBe(meta.title);
      expect(w.description).toBe(meta.description);
    });
  });

  it("8 cross-role cards", () => {
    const crossRole = DASHBOARD_WIDGETS.filter((w) => w.persona === PERSONAS.CROSS_ROLE);
    expect(crossRole).toHaveLength(8);
  });
});

describe("DashboardRegistry — integrity", () => {

  it("every entry has the required fields", () => {
    DASHBOARD_WIDGETS.forEach((w) => {
      expect(typeof w.code).toBe("string");
      expect(w.code.startsWith("dashboard.")).toBe(true);
      expect(typeof w.permission).toBe("string");
      expect(w.permission).not.toContain(".");
      expect(Object.values(PERSONAS)).toContain(w.persona);
      expect(Object.values(COLUMN)).toContain(w.column);
      expect(typeof w.order).toBe("number");
      expect(typeof w.label).toBe("string");
      expect(typeof w.description).toBe("string");
    });
  });

  it("has no duplicate codes or permissions", () => {
    expect(new Set(ALL_WIDGET_CODES).size).toBe(ALL_WIDGET_CODES.length);
    expect(new Set(ALL_WIDGET_PERMISSIONS).size).toBe(ALL_WIDGET_PERMISSIONS.length);
  });

  it("derives permission name as the part after `dashboard.`", () => {
    DASHBOARD_WIDGETS.forEach((w) => {
      expect(w.code).toBe(`dashboard.${w.permission}`);
    });
  });

  it("getWidgetByCode finds entries and returns null for unknowns", () => {
    expect(getWidgetByCode("dashboard.action_center")?.permission).toBe("action_center");
    expect(getWidgetByCode("dashboard.does_not_exist")).toBeNull();
  });

  it("getWidgetByPermission finds entries by raw permission name", () => {
    expect(getWidgetByPermission("my_drafts")?.code).toBe("dashboard.my_drafts");
    expect(getWidgetByPermission("nope")).toBeNull();
  });

  it("getRenderableWidgets returns only entries with a component function", () => {
    const renderable = getRenderableWidgets();
    renderable.forEach((w) => expect(typeof w.component).toBe("function"));
    expect(renderable.length).toBe(DASHBOARD_WIDGETS.length);
  });

  it("groupByPersona returns one bucket per persona with all entries", () => {
    const groups = groupByPersona();
    let total = 0;
    Object.values(groups).forEach((entries) => {
      total += entries.length;
    });
    expect(total).toBe(DASHBOARD_WIDGETS.length);
    expect(groups[PERSONAS.RFQ_CREATOR]).toHaveLength(4);
    expect(groups[PERSONAS.RFQ_APPROVER]).toHaveLength(1);
    expect(groups[PERSONAS.TECH_EVALUATOR]).toHaveLength(2);
    expect(groups[PERSONAS.TECH_APPROVER]).toHaveLength(1);
    expect(groups[PERSONAS.COMMERCIAL_EVALUATOR]).toHaveLength(3);
    expect(groups[PERSONAS.COMMERCIAL_APPROVER]).toHaveLength(1);
    expect(groups[PERSONAS.AWARDING]).toHaveLength(3);
    expect(groups[PERSONAS.APPROVER]).toHaveLength(1);
  });
});
