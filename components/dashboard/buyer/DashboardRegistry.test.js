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

describe("DashboardRegistry — integrity", () => {
  it("declares 26 widgets (7 cross-role + 19 persona — incl. urgent-attention)", () => {
    expect(DASHBOARD_WIDGETS).toHaveLength(26);
    const crossRole = DASHBOARD_WIDGETS.filter((w) => w.persona === PERSONAS.CROSS_ROLE);
    expect(crossRole).toHaveLength(7);
  });

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
    // All 25 widgets have components wired now
    expect(renderable.length).toBe(DASHBOARD_WIDGETS.length);
  });

  it("groupByPersona returns one bucket per persona with all entries", () => {
    const groups = groupByPersona();
    let total = 0;
    Object.values(groups).forEach((entries) => {
      total += entries.length;
    });
    expect(total).toBe(DASHBOARD_WIDGETS.length);
    expect(groups[PERSONAS.RFQ_CREATOR]).toHaveLength(4); // incl. urgent-attention
    expect(groups[PERSONAS.TECH_EVALUATOR]).toHaveLength(3);
    expect(groups[PERSONAS.TECH_APPROVER]).toHaveLength(3);
    expect(groups[PERSONAS.COMMERCIAL_EVALUATOR]).toHaveLength(3);
    expect(groups[PERSONAS.COMMERCIAL_APPROVER]).toHaveLength(3);
    expect(groups[PERSONAS.AWARDING]).toHaveLength(3);
  });
});
