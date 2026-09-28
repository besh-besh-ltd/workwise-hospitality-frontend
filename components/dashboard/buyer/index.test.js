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
  const Empty = () => <div data-testid="empty-dashboard" />;
  Empty.displayName = "EmptyDashboard";
  return Empty;
});

import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import BuyerPage, { getDateRange } from "./index";
import { getDashboardConfig } from "@/services/dashboard";

const flush = () => act(async () => {});

beforeEach(() => {
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
