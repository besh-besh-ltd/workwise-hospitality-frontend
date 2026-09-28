/* Cross-role dashboard cards, rendered from contract-shaped fixtures
   (../__fixtures__/dashboardContract.js): figures, copy that matches the
   backend definition, links through dashboardLinks, empty and error states. */
jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

jest.mock("next/link", () => {
  const Link = ({ children, href, onClick, ...rest }) => (
    <a href={href} onClick={onClick} {...rest}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

// InfoTip renders its text so tooltips can be asserted.
jest.mock("@/components/shared/InfoTip", () => {
  const InfoTip = ({ text }) => <span data-testid="infotip">{text}</span>;
  InfoTip.displayName = "InfoTip";
  return InfoTip;
});

jest.mock("@/services/dashboard", () => ({
  __esModule: true,
  getActionCenterData: jest.fn(),
  getBuyerStatusBanner: jest.fn(),
  getProcurementSnapshot: jest.fn(),
  getNegotiationSavings: jest.fn(),
  getCostIntelligence: jest.fn(),
  getCategoryInsights: jest.fn(),
  getAbcAnalysis: jest.fn(),
  getWorkflowEfficiency: jest.fn(),
  getSmartInsightsData: jest.fn(),
  getPendingApprovalsDetail: jest.fn(),
  getRejectedPOsDetail: jest.fn(),
  getNoResponseDetail: jest.fn(),
}));

// Canvas charts can't render in jsdom — capture the data they were given.
const chartProps = {};
jest.mock("react-chartjs-2", () => ({
  Pie: (props) => {
    chartProps.pie = props;
    return <div data-testid="pie" aria-label={props["aria-label"]} />;
  },
  Line: (props) => {
    chartProps.line = props;
    return <div data-testid="line" aria-label={props["aria-label"]} />;
  },
}));

// react-select is heavy in jsdom; a plain select is enough for these tests.
jest.mock("react-select", () => {
  const Select = ({ value, options }) => (
    <div data-testid="product-select">{value ? value.label : ""}|{(options || []).length}</div>
  );
  Select.displayName = "Select";
  return Select;
});

import React from "react";
import { render, screen, act, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import * as svc from "@/services/dashboard";
import * as L from "@/components/dashboard/shared/dashboardLinks";
import { formatMoney } from "@/components/dashboard/shared/format";
import * as F from "../__fixtures__/dashboardContract";
import ActionCenter from "./ActionCenter";
import ProcurementSnapshot from "./ProcurementSnapshot";
import NegotiationSavings, { savingsState } from "./NegotiationSavings";
import CostIntelligence from "./CostIntelligence";
import CategoryInsights, { CHART_COLORS, OTHERS_COLOR } from "./CategoryInsights";
import ABCAnalysis from "./ABCAnalysis";
import WorkflowEfficiency, { formatDwellTime } from "./WorkflowEfficiency";
import SmartInsights, { resolveInsightAction } from "./SmartInsights";
import PendingApprovalsModal, { approvalRowHref } from "./PendingApprovalsModal";
import RejectedPOsModal from "./RejectedPOsModal";
import NoResponseModal from "./NoResponseModal";
import BuyerStatusBanner, { buildNarrative, TARGET } from "../BuyerStatusBanner";

const FILTERS = { hotel_ids: "12", start_date: "2026-04-01", end_date: "2026-09-28", _refresh: 0 };
const flush = () => act(async () => {});

const renderWith = async (Comp, fetcher, data, props = {}) => {
  fetcher.mockResolvedValue(F.envelope(data));
  const utils = render(<Comp filters={FILTERS} {...props} />);
  await flush();
  return utils;
};

const expectErrorState = async (Comp, fetcher) => {
  fetcher.mockRejectedValue({ message: "Server said no" });
  render(<Comp filters={FILTERS} />);
  await flush();
  expect(screen.getByRole("alert")).toHaveTextContent("Server said no");
  expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(chartProps).forEach((k) => delete chartProps[k]);
});

/* ─── Action centre ─────────────────────────────────────── */
describe("ActionCenter", () => {
  it("shows every queue count and adds vendor + approval rejections", async () => {
    await renderWith(ActionCenter, svc.getActionCenterData, F.ACTION_CENTER);
    const tile = (label) => screen.getByText(label).closest("button, a");
    expect(within(tile("Pending approvals")).getByText("4")).toBeInTheDocument();
    expect(within(tile("POs rejected")).getByText("3")).toBeInTheDocument();
    expect(within(tile("POs rejected")).getByText("1 by vendor · 2 in approval")).toBeInTheDocument();
    expect(within(tile("No responses")).getByText("3")).toBeInTheDocument();
    expect(screen.getByText("7 urgent")).toBeInTheDocument();
  });

  it("link tiles point at the builder destinations", async () => {
    await renderWith(ActionCenter, svc.getActionCenterData, F.ACTION_CENTER);
    expect(screen.getByText("RFQs ending soon").closest("a")).toHaveAttribute("href", L.rfqListView("closing_soon"));
    expect(screen.getByText("PO pending").closest("a")).toHaveAttribute("href", L.poTracking({ tab: "active" }));
  });

  it("polls as a queue (60s)", async () => {
    jest.useFakeTimers();
    try {
      await renderWith(ActionCenter, svc.getActionCenterData, F.ACTION_CENTER);
      await act(async () => jest.advanceTimersByTime(60000));
      expect(svc.getActionCenterData).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("error state", () => expectErrorState(ActionCenter, svc.getActionCenterData));
});

/* ─── Procurement snapshot ──────────────────────────────── */
describe("ProcurementSnapshot", () => {
  it("renders the live RFQ split, committed spend and median turnaround", async () => {
    await renderWith(ProcurementSnapshot, svc.getProcurementSnapshot, F.PROCUREMENT_SNAPSHOT);
    expect(within(screen.getByTestId("snapshot-active_rfqs")).getByText("17")).toBeInTheDocument();
    expect(within(screen.getByTestId("snapshot-in_progress_rfqs")).getByText("23")).toBeInTheDocument();
    expect(within(screen.getByTestId("snapshot-total_spend")).getByText(formatMoney(298400000))).toBeInTheDocument();
    const tat = screen.getByTestId("snapshot-turnaround");
    expect(within(tat).getByText("6.6 days")).toBeInTheDocument();
    expect(within(tat).getByText("P90 21.4 days · 392 RFQs")).toBeInTheDocument();
  });

  it("never claims spend is 'approved POs' and explains 'open for bidding'", async () => {
    await renderWith(ProcurementSnapshot, svc.getProcurementSnapshot, F.PROCUREMENT_SNAPSHOT);
    const tips = screen.getAllByTestId("infotip").map((t) => t.textContent).join(" ");
    expect(tips).toMatch(/bid window is still open/);
    expect(tips).toMatch(/committed purchase orders/);
    expect(tips).not.toMatch(/Sum of all approved PO values/);
  });

  it("no finalised RFQs → turnaround shows a dash, not 0", async () => {
    await renderWith(ProcurementSnapshot, svc.getProcurementSnapshot, {
      ...F.PROCUREMENT_SNAPSHOT,
      turnaround_days: { median: null, p90: null, n: 0 },
    });
    const tat = screen.getByTestId("snapshot-turnaround");
    expect(within(tat).getByText("—")).toBeInTheDocument();
    expect(within(tat).getByText("No RFQs finalised in the period")).toBeInTheDocument();
  });

  it("breakup opens a dialog with exact committed-PO figures", async () => {
    await renderWith(ProcurementSnapshot, svc.getProcurementSnapshot, F.PROCUREMENT_SNAPSHOT);
    fireEvent.click(screen.getByRole("button", { name: /Breakup/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByText("₹29,84,00,000").length).toBeGreaterThan(0);
    expect(within(dialog).getByText(/across 512 committed purchase orders/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Committed POs only/)).toBeInTheDocument();
  });

  it("error state", () => expectErrorState(ProcurementSnapshot, svc.getProcurementSnapshot));
});

/* ─── Negotiation savings ───────────────────────────────── */
describe("NegotiationSavings", () => {
  it("headlines AWARDED savings; all-vendor savings is context only", async () => {
    await renderWith(NegotiationSavings, svc.getNegotiationSavings, F.NEGOTIATION_SAVINGS);
    expect(screen.getByText("Saved on awarded quotes")).toBeInTheDocument();
    expect(screen.getByText(formatMoney(12654361))).toBeInTheDocument();
    expect(screen.getByText("8.4% saved")).toBeInTheDocument();
    expect(screen.getByText(/Across all vendors, including those not awarded: ₹1.81Cr/)).toBeInTheDocument();
  });

  it("loss state: signed total and 'above' copy", async () => {
    await renderWith(NegotiationSavings, svc.getNegotiationSavings, {
      ...F.NEGOTIATION_SAVINGS,
      total_savings: -150000,
      negotiated_total: 150150000,
      savings_pct: -0.1,
    });
    expect(screen.getByText("Awarded above baseline")).toBeInTheDocument();
    expect(screen.getByText("−₹1.5L")).toBeInTheDocument();
  });

  it("negotiated but no change is not the empty state", () => {
    expect(savingsState({ negotiation_count: 3, market_baseline: 1000, negotiated_total: 1000, total_savings: 0 }).kind).toBe("flat");
    expect(savingsState({ negotiation_count: 0, market_baseline: 0, total_savings: 0 }).kind).toBe("empty");
  });

  it("empty state", async () => {
    await renderWith(NegotiationSavings, svc.getNegotiationSavings, { total_savings: 0, market_baseline: 0, negotiated_total: 0, negotiation_count: 0 });
    expect(screen.getByText("No negotiations on awarded quotes in this period.")).toBeInTheDocument();
  });

  it("error state", () => expectErrorState(NegotiationSavings, svc.getNegotiationSavings));
});

/* ─── Price benchmarking ────────────────────────────────── */
describe("CostIntelligence", () => {
  it("plots null gaps as gaps (spanGaps) and labels paid-vs-paid", async () => {
    await renderWith(CostIntelligence, svc.getCostIntelligence, F.COST_INTELLIGENCE);
    const datasets = chartProps.line.data.datasets;
    const avg = datasets.find((d) => d.label === "Avg");
    expect(avg.data).toEqual([25000, null, 27000]);
    expect(avg.spanGaps).toBe(true);
    expect(screen.getByText("Latest price paid")).toBeInTheDocument();
    expect(screen.getByText(/30.8% above benchmark/)).toBeInTheDocument();
    expect(screen.getByTestId("product-select")).toHaveTextContent("SMART TV 55|2");
  });

  it("spec variation hides the over-paying alarm and explains why", async () => {
    await renderWith(CostIntelligence, svc.getCostIntelligence, {
      ...F.COST_INTELLIGENCE,
      benchmark: { ...F.COST_INTELLIGENCE.benchmark, spec_variation: true },
    });
    expect(screen.queryByText(/above benchmark/)).not.toBeInTheDocument();
    expect(screen.getByText(/Specifications differ across these purchases/)).toBeInTheDocument();
  });

  it("vendors show quote counts", async () => {
    await renderWith(CostIntelligence, svc.getCostIntelligence, F.COST_INTELLIGENCE);
    expect(screen.getByText("Alpha Electronics")).toBeInTheDocument();
    expect(screen.getByText("3 quotes")).toBeInTheDocument();
  });

  it("empty contract (no priced items) → empty state", async () => {
    await renderWith(CostIntelligence, svc.getCostIntelligence, {
      top_products: [], benchmark: null, granularity: null, vendor_comparison: [],
      price_trend: { labels: [], avg: [], max: [], min: [] },
    });
    expect(screen.getByText(/No price benchmarking data/)).toBeInTheDocument();
  });

  it("error state", () => expectErrorState(CostIntelligence, svc.getCostIntelligence));
});

/* ─── Spend by category ─────────────────────────────────── */
describe("CategoryInsights", () => {
  it("plots rupees under the backend's committed total, grey Others", async () => {
    await renderWith(CategoryInsights, svc.getCategoryInsights, F.CATEGORY_INSIGHTS);
    const ds = chartProps.pie.data.datasets[0];
    expect(ds.data).toEqual([600000, 300000, 100000]);
    expect(ds.backgroundColor).toEqual([CHART_COLORS[0], CHART_COLORS[1], OTHERS_COLOR]);
    expect(screen.getByText("Committed spend")).toBeInTheDocument();
    expect(screen.getAllByText(formatMoney(1000000)).length).toBeGreaterThan(0);
    expect(screen.getByText("Others (5 more)")).toBeInTheDocument();
  });

  it("has a distinct colour for every named bucket", () => {
    expect(new Set(CHART_COLORS).size).toBe(12);
    expect(CHART_COLORS).not.toContain(OTHERS_COLOR);
  });

  it("empty state", async () => {
    await renderWith(CategoryInsights, svc.getCategoryInsights, { total_spend: 0, categories: [] });
    expect(screen.getByText(/No category spend data/)).toBeInTheDocument();
  });

  it("error state", () => expectErrorState(CategoryInsights, svc.getCategoryInsights));
});

/* ─── ABC analysis ──────────────────────────────────────── */
describe("ABCAnalysis", () => {
  it("is value-only: no volume toggle, no metric param", async () => {
    await renderWith(ABCAnalysis, svc.getAbcAnalysis, F.ABC_ANALYSIS);
    expect(screen.queryByLabelText("ABC metric")).not.toBeInTheDocument();
    expect(svc.getAbcAnalysis.mock.calls[0][0]).not.toHaveProperty("metric");
    expect(screen.getAllByText(/of committed spend/).length).toBeGreaterThan(0);
    expect(screen.getByText(formatMoney(800000))).toBeInTheDocument();
  });

  it("empty state", async () => {
    await renderWith(ABCAnalysis, svc.getAbcAnalysis, { metric: "value", total_items: 0, classes: [], items: [] });
    expect(screen.getByText(/No procured items/)).toBeInTheDocument();
  });

  it("error state", () => expectErrorState(ABCAnalysis, svc.getAbcAnalysis));
});

/* ─── Stage turnaround ──────────────────────────────────── */
describe("WorkflowEfficiency (Stage turnaround)", () => {
  it("shows median, P90, RFQ count and instant decisions; highlights the longest", async () => {
    await renderWith(WorkflowEfficiency, svc.getWorkflowEfficiency, F.WORKFLOW_EFFICIENCY);
    expect(screen.getByText("Stage turnaround")).toBeInTheDocument();
    expect(screen.getByText("3.0d")).toBeInTheDocument(); // tech eval median 72h
    expect(screen.getByText("P90 1.3d · 30 RFQs · 2 instant")).toBeInTheDocument();
    expect(screen.getAllByText(/Longest stage/)).toHaveLength(1);
  });

  it("formats durations; null is a dash", () => {
    expect(formatDwellTime(null)).toBe("—");
    expect(formatDwellTime(0.5)).toBe("30m");
    expect(formatDwellTime(5.5)).toBe("5.5h");
    expect(formatDwellTime(48)).toBe("2.0d");
  });

  it("empty state", async () => {
    await renderWith(WorkflowEfficiency, svc.getWorkflowEfficiency, { stages: [] });
    expect(screen.getByText(/No completed stages/)).toBeInTheDocument();
  });

  it("error state", () => expectErrorState(WorkflowEfficiency, svc.getWorkflowEfficiency));
});

/* ─── Insights ──────────────────────────────────────────── */
describe("SmartInsights", () => {
  it("resolves every action through the link builder; unknown types get no link", async () => {
    await renderWith(SmartInsights, svc.getSmartInsightsData, F.SMART_INSIGHTS);
    expect(screen.getByText("Find RFQs for this item").closest("a")).toHaveAttribute("href", L.rfqList({ search: "SMART TV 55" }));
    expect(screen.getByText("View their POs").closest("a")).toHaveAttribute("href", L.poList({ search: "Alpha Electronics" }));
    expect(screen.getByText("Open spend reports").closest("a")).toHaveAttribute("href", L.reports());
    expect(screen.queryByText("Go somewhere")).not.toBeInTheDocument();
    expect(resolveInsightAction(undefined)).toBeNull();
  });

  it("renders description as text (no HTML injection) and details as a list", async () => {
    const { container } = await renderWith(SmartInsights, svc.getSmartInsightsData, F.SMART_INSIGHTS);
    expect(screen.getByText("<b>not html</b>")).toBeInTheDocument();
    expect(container.querySelector("b")).toBeNull();
    expect(screen.getByText("Best paid")).toBeInTheDocument();
    expect(screen.getByText("₹22,550")).toBeInTheDocument();
    expect(screen.getByText("Above benchmark")).toBeInTheDocument();
  });

  it("does not call itself AI", async () => {
    await renderWith(SmartInsights, svc.getSmartInsightsData, F.SMART_INSIGHTS);
    expect(document.body.textContent).not.toMatch(/AI-generated/);
    expect(screen.getByText("Insights")).toBeInTheDocument();
  });

  it("empty state", async () => {
    await renderWith(SmartInsights, svc.getSmartInsightsData, { insights: [] });
    expect(screen.getByText(/Nothing stands out/)).toBeInTheDocument();
  });

  it("error state", () => expectErrorState(SmartInsights, svc.getSmartInsightsData));
});

/* ─── Drill-down modals ─────────────────────────────────── */
describe("Drill-down modals", () => {
  it("pending approvals: every row links to where the approver acts", async () => {
    svc.getPendingApprovalsDetail.mockResolvedValue(F.envelope(F.PENDING_APPROVALS));
    render(<PendingApprovalsModal filters={FILTERS} onClose={() => {}} />);
    await flush();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Linen RFQ").closest("a")).toHaveAttribute("href", L.approvalHref("RFQ", { rfqId: 10 }));
    expect(within(dialog).getByText("PO PO-0077").closest("a")).toHaveAttribute("href", L.poDetail(77));
    // TECHNICAL: the RFQ comes from rfq_id, never the round id in entity_id.
    expect(within(dialog).getByText("Kitchen RFQ").closest("a").getAttribute("href")).toContain("id=40");
    expect(within(dialog).getByText("26 products")).toBeInTheDocument();
    expect(approvalRowHref(F.PENDING_APPROVALS[1])).toBe(L.approvalHref("NEGOTIATION_QUOTE", { rfqId: 20 }));
  });

  it("rejected POs: grouped by source, linking to the PO", async () => {
    svc.getRejectedPOsDetail.mockResolvedValue(F.envelope(F.REJECTED_POS));
    render(<RejectedPOsModal filters={FILTERS} onClose={() => {}} />);
    await flush();
    expect(screen.getByText("Rejected by vendor")).toBeInTheDocument();
    expect(screen.getByText("Rejected in approval")).toBeInTheDocument();
    expect(screen.getByText("PO PO-0081").closest("a")).toHaveAttribute("href", L.poDetail(81));
    expect(screen.getByText("Reason: Budget")).toBeInTheDocument();
  });

  it("no response: rows open the RFQ, regrets shown", async () => {
    svc.getNoResponseDetail.mockResolvedValue(F.envelope(F.NO_RESPONSE));
    render(<NoResponseModal filters={FILTERS} onClose={() => {}} />);
    await flush();
    expect(screen.getByText("Crockery").closest("a")).toHaveAttribute("href", L.rfqDetail(51));
    expect(screen.getByText("1 regret")).toBeInTheDocument();
  });
});

/* ─── Status banner ─────────────────────────────────────── */
describe("BuyerStatusBanner", () => {
  it("links count the user's own RFQs through the builder (mine=1)", () => {
    expect(TARGET.CLOSED_NO_QUOTES.href).toBe(L.rfqListView("ended_no_quotes", { mine: true }));
    expect(TARGET.QUOTE_COMPARE.href).toBe(L.rfqListView("quote_compare", { mine: true }));
    expect(TARGET.PO_VENDOR_PENDING.href).toBe(L.poTracking({ tab: "active" }));
  });

  it("critical mode still lists the other queues", () => {
    const { primary, secondary } = buildNarrative(
      { counts: { closed_no_quotes: 2, pending_approvals: 6, closing_soon: 1, quote_compare_ready: 3, po_acceptance_pending: 1 } },
      "critical"
    );
    const text = [...primary, ...secondary].map((f) => f.text).join("");
    expect(text).toMatch(/2 RFQs ended without quotes/);
    expect(text).toMatch(/6 approvals/);
    expect(text).toMatch(/1 RFQ closing soon/);
    expect(text).toMatch(/3 ready to compare/);
    expect(text).toMatch(/1 PO awaiting vendor/);
  });

  it("clear mode reads the windowed `period` block", () => {
    const { secondary } = buildNarrative({ counts: {}, period: { rfqs_published: 6, savings_pct: 4.2 } }, "clear");
    expect(secondary.map((f) => f.text).join("")).toMatch(/You published 6 RFQs in this period with 4.2% savings/);
  });

  it("renders the steady narrative from the contract", async () => {
    await renderWith(BuyerStatusBanner, svc.getBuyerStatusBanner, F.BANNER);
    expect(document.body.textContent).toMatch(/3 quotes ready to compare/);
    expect(screen.getByText("3 quotes ready to compare").closest("a")).toHaveAttribute("href", TARGET.QUOTE_COMPARE.href);
  });
});
