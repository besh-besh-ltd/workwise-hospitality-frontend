/* Page-shell tests for /dashboard/buyer: rollout flag, date range, refresh. */
jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

jest.mock("react-redux", () => ({
  useSelector: (fn) => fn({ userProfile: { name: "Asha Rao", hospitality_mappings: [] } }),
}));

jest.mock("next/link", () => {
  const Link = ({ children, href, ...rest }) => <a href={href} {...rest}>{children}</a>;
  Link.displayName = "Link";
  return Link;
});
// Filters are kept in the URL; the router mock records replace() calls and
// reflects the new query back, as Next does after a shallow replace.
const mockRouter = { isReady: true, pathname: "/dashboard/buyer", query: {}, replace: jest.fn() };
jest.mock("next/router", () => ({ useRouter: () => mockRouter }));
jest.mock("next/head", () => {
  const Head = () => null;
  Head.displayName = "Head";
  return Head;
});

jest.mock("@/components/shared/HotelFilter", () => {
  const HotelFilter = () => <div data-testid="hotel-filter" />;
  HotelFilter.displayName = "HotelFilter";
  return HotelFilter;
});

jest.mock("@/services/dashboard", () => ({
  __esModule: true,
  getDashboardConfig: jest.fn(),
}));

// Every widget + the banner record the filters they were rendered with.
const mockRenders = [];
function mockCard(name) {
  const Card = ({ filters }) => {
    mockRenders.push({ name, filters });
    return <div data-testid={`card-${name}`}>{filters.start_date || "no-start"}</div>;
  };
  Card.displayName = name;
  return { __esModule: true, default: Card };
}
jest.mock("./BuyerStatusBanner", () => mockCard("banner"));
jest.mock("./dashboard-components/ActionCenter", () => mockCard("action"));
jest.mock("./dashboard-components/ProcurementSnapshot", () => mockCard("snapshot"));
jest.mock("./dashboard-components/NegotiationSavings", () => mockCard("savings"));
jest.mock("./dashboard-components/CostIntelligence", () => mockCard("cost"));
jest.mock("./dashboard-components/CategoryInsights", () => mockCard("category"));
jest.mock("./dashboard-components/ABCAnalysis", () => mockCard("abc"));
jest.mock("./dashboard-components/WorkflowEfficiency", () => mockCard("workflow"));
jest.mock("./dashboard-components/SmartInsights", () => mockCard("insights"));

const mockVisible = { widgets: [], isLoading: false, error: null, refetch: jest.fn() };
jest.mock("@/hooks/useDashboardWidgets", () => ({
  __esModule: true,
  DashboardPermissionsProvider: ({ children }) => <div data-testid="role-aware">{children}</div>,
  useVisibleDashboardWidgets: () => mockVisible,
}));

jest.mock("./DashboardRegistry", () => ({
  __esModule: true,
  COLUMN: { FULL: "full", LEFT: "left", RIGHT: "right" },
  PERSONAS: { CROSS_ROLE: "cross_role", RFQ_CREATOR: "rfq_creator", AWARDING: "awarding" },
  PERSONA_LABELS: { cross_role: "Cross-role", rfq_creator: "RFQ Creator", awarding: "Awarding P1 / P2" },
}));

jest.mock("./EmptyDashboard", () => {
  const Empty = ({ contactAdminEmail }) => (
    <div data-testid="empty-dashboard">{contactAdminEmail || "no-contact"}</div>
  );
  Empty.displayName = "EmptyDashboard";
  return Empty;
});

import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import BuyerPage, { getDateRange, planLayout, parseDashboardQuery, buildDashboardQuery, CONFIG_RETRY_BASE_MS, CONFIG_RETRY_MAX_MS } from "./index";
import { getDashboardConfig } from "@/services/dashboard";

const flush = () => act(async () => {});

beforeEach(() => {
  mockRouter.isReady = true;
  mockRouter.query = {};
  mockRouter.replace.mockReset();
  mockRouter.replace.mockImplementation((url) => {
    mockRouter.query = url.query;
    return Promise.resolve(true);
  });
  mockRenders.length = 0;
  getDashboardConfig.mockReset();
  mockVisible.widgets = [];
  mockVisible.isLoading = false;
  mockVisible.error = null;
});

describe("getDateRange", () => {
  it("'All' sends no start date", () => {
    expect(getDateRange("allTime").start_date).toBeUndefined();
  });
  it("FYTD starts on 1 April of the current financial year", () => {
    expect(getDateRange("fy").start_date).toMatch(/^\d{4}-04-01$/);
  });
});

describe("rollout flag (runtime, per buyer company)", () => {
  it("renders the legacy layout when the company flag is off", async () => {
    getDashboardConfig.mockResolvedValue({ status: 1, data: { v3_enabled: false } });
    render(<BuyerPage />);
    await flush();
    expect(screen.getByTestId("card-action")).toBeInTheDocument();
    expect(screen.queryByTestId("role-aware")).not.toBeInTheDocument();
  });

  it("renders the role-aware layout when the company flag is on", async () => {
    getDashboardConfig.mockResolvedValue({ status: 1, data: { v3_enabled: true } });
    render(<BuyerPage />);
    await flush();
    expect(screen.getByTestId("role-aware")).toBeInTheDocument();
  });

  it("falls back to the legacy layout when the config call fails", async () => {
    getDashboardConfig.mockRejectedValue({ message: "boom" });
    render(<BuyerPage />);
    await flush();
    expect(screen.getByTestId("card-action")).toBeInTheDocument();
    expect(screen.queryByTestId("role-aware")).not.toBeInTheDocument();
  });

  it("shows neither layout while the flag is loading", () => {
    getDashboardConfig.mockReturnValue(new Promise(() => {}));
    render(<BuyerPage />);
    expect(screen.queryByTestId("card-action")).not.toBeInTheDocument();
    expect(screen.queryByTestId("role-aware")).not.toBeInTheDocument();
  });

  describe("recovering from a cold-load outage", () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    it("keeps retrying the config with backoff and switches to the role-aware layout once it answers — no reload", async () => {
      getDashboardConfig
        .mockRejectedValueOnce({ status: null, network: true })
        .mockRejectedValueOnce({ status: 503 })
        .mockResolvedValue({ status: 1, data: { v3_enabled: true } });
      render(<BuyerPage />);
      await act(async () => {});
      expect(screen.getByTestId("card-action")).toBeInTheDocument(); // legacy meanwhile
      expect(getDashboardConfig).toHaveBeenCalledTimes(1);

      await act(async () => { jest.advanceTimersByTime(CONFIG_RETRY_BASE_MS); });
      expect(getDashboardConfig).toHaveBeenCalledTimes(2);
      await act(async () => { jest.advanceTimersByTime(CONFIG_RETRY_BASE_MS); }); // backoff: 10s now
      expect(getDashboardConfig).toHaveBeenCalledTimes(2);
      await act(async () => { jest.advanceTimersByTime(CONFIG_RETRY_BASE_MS); });
      expect(getDashboardConfig).toHaveBeenCalledTimes(3);
      expect(screen.getByTestId("role-aware")).toBeInTheDocument();

      await act(async () => { jest.advanceTimersByTime(CONFIG_RETRY_MAX_MS); });
      expect(getDashboardConfig).toHaveBeenCalledTimes(3); // settled: no more polling
    });

    it("does not retry a definitive 4xx answer", async () => {
      getDashboardConfig.mockRejectedValue({ status: 403 });
      render(<BuyerPage />);
      await act(async () => {});
      await act(async () => { jest.advanceTimersByTime(CONFIG_RETRY_MAX_MS); });
      expect(getDashboardConfig).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("card-action")).toBeInTheDocument();
    });

    it("retries immediately when the tab becomes visible or the browser comes back online", async () => {
      getDashboardConfig
        .mockRejectedValueOnce({ status: null, network: true })
        .mockResolvedValue({ status: 1, data: { v3_enabled: true } });
      render(<BuyerPage />);
      await act(async () => {});
      expect(getDashboardConfig).toHaveBeenCalledTimes(1);
      await act(async () => { window.dispatchEvent(new Event("online")); });
      expect(getDashboardConfig).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId("role-aware")).toBeInTheDocument();
    });
  });
});

describe("page shell", () => {
  beforeEach(() => {
    getDashboardConfig.mockResolvedValue({ status: 1, data: { v3_enabled: false } });
  });

  it("shows one greeting only (the banner owns it)", async () => {
    render(<BuyerPage />);
    await flush();
    expect(screen.queryByText(/Good (Morning|Afternoon|Evening)/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Procurement dashboard");
  });

  it("refresh bumps _refresh for the banner and every widget", async () => {
    render(<BuyerPage />);
    await flush();
    const before = mockRenders.filter((r) => r.filters._refresh === 0).map((r) => r.name);
    expect(before).toEqual(expect.arrayContaining(["banner", "action", "snapshot", "insights"]));
    fireEvent.click(screen.getByRole("button", { name: /refresh all data/i }));
    await flush();
    const after = new Set(mockRenders.filter((r) => r.filters._refresh === 1).map((r) => r.name));
    ["banner", "action", "snapshot", "savings", "cost", "category", "abc", "workflow", "insights"].forEach(
      (n) => expect(after.has(n)).toBe(true)
    );
  });

  it("'All' removes the start date from every widget's filters", async () => {
    render(<BuyerPage />);
    await flush();
    fireEvent.click(screen.getByText("All"));
    await flush();
    const last = mockRenders[mockRenders.length - 1];
    expect(last.filters.start_date).toBeUndefined();
  });

  it("an incomplete custom range keeps the previous range and says so", async () => {
    render(<BuyerPage />);
    await flush();
    const fyStart = getDateRange("fy").start_date;
    fireEvent.click(screen.getByText("Custom"));
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent(/pick both dates/i);
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-05-01" } });
    await flush();
    const last = mockRenders[mockRenders.length - 1];
    expect(last.filters.start_date).toBe(fyStart);
  });

  it("a complete custom range applies, swapping an inverted pair", async () => {
    render(<BuyerPage />);
    await flush();
    fireEvent.click(screen.getByText("Custom"));
    fireEvent.change(screen.getByLabelText("Start date"), { target: { value: "2026-06-30" } });
    fireEvent.change(screen.getByLabelText("End date"), { target: { value: "2026-05-01" } });
    await flush();
    const last = mockRenders[mockRenders.length - 1];
    expect(last.filters.start_date).toBe("2026-05-01");
    expect(last.filters.end_date).toBe("2026-06-30");
    expect(screen.queryByText(/pick both dates/i)).not.toBeInTheDocument();
  });
});

const W = (code, persona, column, order = 10) => {
  const Comp = () => <div data-testid={`w-${code}`} />;
  Comp.displayName = code;
  return { code, persona, column, order, component: Comp };
};

describe("planLayout", () => {
  it("splits cross-role cards by column and groups persona widgets by persona", () => {
    const plan = planLayout([
      W("a", "cross_role", "full"),
      W("b", "cross_role", "left"),
      W("c", "cross_role", "right"),
      W("d", "rfq_creator", "left", 100),
      W("e", "awarding", "right", 600),
      W("f", "rfq_creator", "right", 105),
    ]);
    expect(plan.full.map((w) => w.code)).toEqual(["a"]);
    expect(plan.left.map((w) => w.code)).toEqual(["b"]);
    expect(plan.right.map((w) => w.code)).toEqual(["c"]);
    expect(plan.groups.map((g) => [g.label, g.widgets.map((w) => w.code)])).toEqual([
      ["RFQ Creator", ["d", "f"]],
      ["Awarding P1 / P2", ["e"]],
    ]);
  });
});

describe("role-aware layout", () => {
  beforeEach(() => {
    getDashboardConfig.mockResolvedValue({
      status: 1,
      data: { v3_enabled: true, admin_contact_email: "admin@example.com" },
    });
  });

  it("uses a single column when only right-column cards are visible", async () => {
    mockVisible.widgets = [W("c1", "cross_role", "right"), W("c2", "cross_role", "right", 20)];
    render(<BuyerPage />);
    await flush();
    expect(screen.getByTestId("cross-one-col")).toBeInTheDocument();
    expect(screen.queryByTestId("cross-two-col")).not.toBeInTheDocument();
    expect(screen.getByTestId("w-c1")).toBeInTheDocument();
  });

  it("uses two columns only when both sides have cards", async () => {
    mockVisible.widgets = [W("l", "cross_role", "left"), W("r", "cross_role", "right")];
    render(<BuyerPage />);
    await flush();
    expect(screen.getByTestId("cross-two-col")).toBeInTheDocument();
  });

  it("renders persona widgets under their persona heading", async () => {
    mockVisible.widgets = [W("d", "rfq_creator", "left", 100)];
    render(<BuyerPage />);
    await flush();
    expect(screen.getByRole("heading", { name: "RFQ Creator" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "RFQ Creator" })).toContainElement(screen.getByTestId("w-d"));
  });

  it("a permission-fetch failure renders a retry card, not the no-access state", async () => {
    mockVisible.error = "Network down";
    mockVisible.refetch = jest.fn();
    render(<BuyerPage />);
    await flush();
    expect(screen.queryByTestId("empty-dashboard")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Network down");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(mockVisible.refetch).toHaveBeenCalled();
  });

  it("no grants renders the empty state with the admin contact from config", async () => {
    render(<BuyerPage />);
    await flush();
    expect(screen.getByTestId("empty-dashboard")).toHaveTextContent("admin@example.com");
  });
});

/* ─── Filters in the URL ───────────────────────────────── */
describe("dashboard filters in the URL", () => {
  const TODAY = "2026-09-29";

  it("parses a valid query and ignores malformed parts", () => {
    expect(parseDashboardQuery({ range: "custom", from: "2026-05-01", to: "2026-06-30", bu: "4,5,4" }, TODAY)).toEqual({
      range: "custom", customStart: "2026-05-01", customEnd: "2026-06-30", hotelIds: [4, 5],
    });
    expect(parseDashboardQuery({ range: "bogus", bu: "abc,-1,7" }, TODAY)).toEqual({
      range: "fy", customStart: "", customEnd: "", hotelIds: [7],
    });
    // Future or impossible dates are dropped; dates only count for Custom.
    expect(parseDashboardQuery({ range: "custom", from: "2026-02-31", to: "2099-01-01" }, TODAY)).toMatchObject({ customStart: "", customEnd: "" });
    expect(parseDashboardQuery({ range: "past30days", from: "2026-05-01" }, TODAY).customStart).toBe("");
  });

  it("builds a clean query: defaults omitted, other keys kept", () => {
    expect(buildDashboardQuery({ range: "fy", hotelIds: [] }, { tab: "x", range: "allTime" })).toEqual({ tab: "x" });
    expect(buildDashboardQuery({ range: "custom", customStart: "2026-05-01", customEnd: "2026-06-30", hotelIds: [4] })).toEqual({
      range: "custom", from: "2026-05-01", to: "2026-06-30", bu: "4",
    });
  });

  it("restores the view from the URL without first fetching FYTD", async () => {
    mockRouter.query = { range: "custom", from: "2026-05-01", to: "2026-06-30", bu: "4,5" };
    getDashboardConfig.mockResolvedValue({ data: { v3_enabled: false } });
    render(<BuyerPage />);
    await flush();
    expect(mockRenders.length).toBeGreaterThan(0);
    mockRenders.forEach((r) => {
      expect(r.filters.start_date).toBe("2026-05-01");
      expect(r.filters.end_date).toBe("2026-06-30");
      expect(r.filters.hotel_ids).toBe("4,5");
    });
  });

  it("waits for the router before fetching", async () => {
    mockRouter.isReady = false;
    getDashboardConfig.mockResolvedValue({ data: { v3_enabled: false } });
    render(<BuyerPage />);
    await flush();
    expect(mockRenders).toHaveLength(0);
  });

  it("changing the range writes it to the URL with a shallow replace", async () => {
    getDashboardConfig.mockResolvedValue({ data: { v3_enabled: false } });
    render(<BuyerPage />);
    await flush();
    expect(mockRouter.replace).not.toHaveBeenCalled(); // FYTD default: nothing to write
    fireEvent.click(screen.getByText("30D"));
    await flush();
    expect(mockRouter.replace).toHaveBeenLastCalledWith(
      { pathname: "/dashboard/buyer", query: { range: "past30days" } },
      undefined,
      { shallow: true, scroll: false }
    );
  });
});
