/* Every persona widget, rendered from contract-shaped fixtures
   (../__fixtures__/dashboardContract.js): title from the catalogue, TRUE
   count (not the capped list), item + "View all" links through
   dashboardLinks, empty / error states, and which widgets poll. */
jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });

jest.mock("next/link", () => {
  const Link = ({ children, href, onClick, ...rest }) => (
    <a href={href} onClick={onClick} {...rest}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("@/components/shared/InfoTip", () => {
  const InfoTip = ({ text }) => <span data-testid="infotip">{text}</span>;
  InfoTip.displayName = "InfoTip";
  return InfoTip;
});

jest.mock("@/services/dashboard", () => ({
  __esModule: true,
  getMyDrafts: jest.fn(),
  getMyActiveRfqs: jest.fn(),
  getMyNoResponseRfqs: jest.fn(),
  getMyRfqsBidClosedNoQuotes: jest.fn(),
  getMyRfqApprovalsPending: jest.fn(),
  getMyTechEvalsPending: jest.fn(),
  getTechEvalsWithDisagreements: jest.fn(),
  getMyTechApprovalsPending: jest.fn(),
  getMyQuoteCompares: jest.fn(),
  getMyActiveNegotiations: jest.fn(),
  getSavingsPipeline: jest.fn(),
  getMyCommercialApprovalsPending: jest.fn(),
  getMyAwardApprovalsPending: jest.fn(),
  getRecentAwards: jest.fn(),
  getAwardValuePipeline: jest.fn(),
  getApprovalTurnaround: jest.fn(),
}));

import React from "react";
import { render, screen, act, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import * as svc from "@/services/dashboard";
import * as L from "@/components/dashboard/shared/dashboardLinks";
import { formatMoney } from "@/components/dashboard/shared/format";
import { getWidgetMeta } from "../dashboardWidgetMeta";
import { DASHBOARD_WIDGETS } from "../DashboardRegistry";
import { PERSONA, PERSONA_EMPTY, envelope } from "../__fixtures__/dashboardContract";
import { savingsDelta } from "./commercial-evaluator/SavingsPipeline";
import { formatDuration } from "./approver/ApprovalTurnaround";

const FILTERS = { hotel_ids: "12", start_date: "2026-04-01", end_date: "2026-09-28", _refresh: 0 };
const flush = () => act(async () => {});
const component = (code) => DASHBOARD_WIDGETS.find((w) => w.permission === code).component;

/**
 * Per widget: the service it calls, whether it is a queue (polls), the
 * "View all" destination, and one item link it must render from the fixture.
 */
const CASES = [
  {
    code: "my_drafts", fetcher: "getMyDrafts", poll: true,
    viewAll: L.rfqList({ tab: "drafts", mine: true }),
    item: ["Draft linen", L.resumeDraft(101)],
    count: "7",
  },
  {
    code: "my_active_rfqs", fetcher: "getMyActiveRfqs", poll: true,
    viewAll: L.rfqList({ tab: "ongoing", mine: true }),
    item: ["Commercial Evaluation", L.rfqList({ status: ["COMMERCIAL_EVALUATION"], mine: true })],
    count: "20",
  },
  {
    code: "my_no_response_rfqs", fetcher: "getMyNoResponseRfqs", poll: true,
    viewAll: L.rfqListView("no_response", { mine: true }),
    item: ["Crockery", L.rfqDetail(201)],
    count: "3",
  },
  {
    code: "my_rfqs_bid_closed_no_quotes", fetcher: "getMyRfqsBidClosedNoQuotes", poll: true,
    viewAll: L.rfqListView("bid_closed_no_quotes", { mine: true }),
    item: ["Cutlery", L.rfqDetail(301)],
    count: "2",
  },
  {
    code: "my_rfq_approvals_pending", fetcher: "getMyRfqApprovalsPending", poll: true,
    viewAll: L.approvalQueue("RFQ"),
    item: ["Linen RFQ", L.approvalHref("RFQ", { rfqId: 10 })],
    count: "2",
  },
  {
    code: "my_tech_evals_pending", fetcher: "getMyTechEvalsPending", poll: true,
    viewAll: L.rfqListView("tech_evaluation"),
    item: ["Combi oven", L.techEval({ rfqId: 40, rfqProductId: 4001 })],
    count: "12",
  },
  {
    code: "tech_evals_with_vendor_disagreements", fetcher: "getTechEvalsWithDisagreements", poll: true,
    viewAll: L.rfqListView("tech_evaluation"),
    item: ["Washer", L.techEval({ rfqId: 50, rfqProductId: 5001 })],
    count: "3",
  },
  {
    code: "my_tech_approvals_pending", fetcher: "getMyTechApprovalsPending", poll: true,
    viewAll: L.approvalQueue("TECHNICAL"),
    item: ["HVAC", L.approvalHref("TECHNICAL", { rfqId: 525 })],
    count: "1",
  },
  {
    code: "my_quote_compares", fetcher: "getMyQuoteCompares", poll: true,
    viewAll: L.rfqListView("quote_compare"),
    item: ["Minibar", L.quoteCompare(601)],
    count: "11",
  },
  {
    code: "my_active_negotiations", fetcher: "getMyActiveNegotiations", poll: true,
    viewAll: L.negotiationList({ tab: "needs_attention" }),
    item: ["Uniforms", L.negotiationForRfq(70)],
    count: "2",
  },
  {
    code: "my_commercial_approvals_pending", fetcher: "getMyCommercialApprovalsPending", poll: true,
    viewAll: L.approvalQueue("NEGOTIATION_QUOTE"),
    item: ["Amenities", L.approvalHref("NEGOTIATION_QUOTE", { rfqId: 435 })],
    count: "3",
  },
  {
    code: "my_award_approvals_pending", fetcher: "getMyAwardApprovalsPending", poll: true,
    viewAll: L.approvalQueue("PO"),
    item: ["PO PO-0077", L.poDetail(77)],
    count: "1",
  },
  {
    code: "savings_pipeline", fetcher: "getSavingsPipeline", poll: false,
    viewAll: L.negotiationList({ tab: "closed" }),
  },
  {
    code: "recent_awards", fetcher: "getRecentAwards", poll: false,
    viewAll: L.poList({ status: "approved" }),
    item: ["PO PO-0088", L.poDetail(88)],
    count: "17",
  },
  {
    code: "award_value_pipeline", fetcher: "getAwardValuePipeline", poll: false,
    viewAll: L.poList(),
    item: [/Approved · 7 POs/, L.poList({ status: "approved" })],
  },
  {
    code: "approval_turnaround", fetcher: "getApprovalTurnaround", poll: false,
  },
];

beforeEach(() => jest.clearAllMocks());

it("every persona widget in the registry is covered here", () => {
  const persona = DASHBOARD_WIDGETS.filter((w) => w.persona !== "cross_role").map((w) => w.permission).sort();
  expect(CASES.map((c) => c.code).sort()).toEqual(persona);
});

describe.each(CASES)("$code", ({ code, fetcher, poll, viewAll, item, count }) => {
  const Comp = component(code);
  const fn = () => svc[fetcher];

  it("renders from the contract with the catalogue title", async () => {
    fn().mockResolvedValue(envelope(PERSONA[code]));
    render(<Comp filters={FILTERS} />);
    await flush();
    expect(fn()).toHaveBeenCalledTimes(1);
    expect(screen.getByText(getWidgetMeta(code).title)).toBeInTheDocument();
    // Only real API params are sent.
    expect(Object.keys(fn().mock.calls[0][0]).sort()).toEqual(["end_date", "hotel_ids", "start_date"]);
  });

  if (count) {
    it("headline is the TRUE count, not the length of the capped list", async () => {
      fn().mockResolvedValue(envelope(PERSONA[code]));
      render(<Comp filters={FILTERS} />);
      await flush();
      expect(PERSONA[code].items ? PERSONA[code].items.length : 0).toBeLessThanOrEqual(Number(count));
      expect(screen.getAllByText(count).length).toBeGreaterThan(0);
    });
  }

  if (viewAll) {
    it("View all goes through the link builder", async () => {
      fn().mockResolvedValue(envelope(PERSONA[code]));
      render(<Comp filters={FILTERS} />);
      await flush();
      expect(screen.getByTitle("View all")).toHaveAttribute("href", viewAll);
    });
  }

  if (item) {
    it("item links go through the link builder", async () => {
      fn().mockResolvedValue(envelope(PERSONA[code]));
      render(<Comp filters={FILTERS} />);
      await flush();
      expect(screen.getByText(item[0]).closest("a")).toHaveAttribute("href", item[1]);
    });
  }

  it("empty state", async () => {
    fn().mockResolvedValue(envelope(PERSONA_EMPTY[code]));
    const { container } = render(<Comp filters={FILTERS} />);
    await flush();
    expect(container.querySelector('[class*="emptyState"]')).not.toBeNull();
  });

  it("error state with Retry", async () => {
    fn().mockRejectedValue({ message: "Nope" });
    render(<Comp filters={FILTERS} />);
    await flush();
    expect(screen.getByRole("alert")).toHaveTextContent("Nope");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it(poll ? "polls as a queue (60s)" : "does not poll (period widget)", async () => {
    jest.useFakeTimers();
    try {
      fn().mockResolvedValue(envelope(PERSONA[code]));
      render(<Comp filters={FILTERS} />);
      await flush();
      await act(async () => jest.advanceTimersByTime(60000));
      expect(fn()).toHaveBeenCalledTimes(poll ? 2 : 1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("list capping", () => {
  it("shows five items and '+N more' linking to the full queue", async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: 900 + i, rfq_no: 537000 + i, title: `Draft ${i}`, product_count: 1, created_at: "2026-09-20T10:00:00Z",
    }));
    svc.getMyDrafts.mockResolvedValue(envelope({ count: 57, oldest_created_at: null, items }));
    const Comp = component("my_drafts");
    render(<Comp filters={FILTERS} />);
    await flush();
    expect(screen.getByText("57")).toBeInTheDocument();
    expect(screen.getAllByText(/^Draft \d+$/)).toHaveLength(5);
    expect(screen.getByText("+52 more")).toHaveAttribute("href", L.rfqList({ tab: "drafts", mine: true }));
  });
});

describe("approval queues", () => {
  it("money queues show total and per-item value", async () => {
    svc.getMyCommercialApprovalsPending.mockResolvedValue(envelope(PERSONA.my_commercial_approvals_pending));
    const Comp = component("my_commercial_approvals_pending");
    render(<Comp filters={FILTERS} />);
    await flush();
    expect(screen.getByText(formatMoney(120547.88))).toBeInTheDocument();
    expect(screen.getByText(formatMoney(94379))).toBeInTheDocument();
    expect(screen.getByText("Soap +1")).toBeInTheDocument();
  });

  it("never links an item to the missing /dashboard/buyer/approval page", async () => {
    const codes = ["my_rfq_approvals_pending", "my_tech_approvals_pending", "my_commercial_approvals_pending", "my_award_approvals_pending"];
    for (const code of codes) {
      const c = CASES.find((x) => x.code === code);
      svc[c.fetcher].mockResolvedValue(envelope(PERSONA[code]));
      const Comp = component(code);
      const { container, unmount } = render(<Comp filters={FILTERS} />);
      await flush();
      container.querySelectorAll("a").forEach((a) => {
        expect(a.getAttribute("href")).not.toMatch(/\/dashboard\/buyer\/approval(\?|$)/);
      });
      unmount();
    }
  });
});

describe("My active negotiations", () => {
  it("a round awaiting approval opens the approve page", async () => {
    svc.getMyActiveNegotiations.mockResolvedValue(envelope(PERSONA.my_active_negotiations));
    const Comp = component("my_active_negotiations");
    render(<Comp filters={FILTERS} />);
    await flush();
    expect(screen.getByText("Carpets").closest("a")).toHaveAttribute("href", L.negotiationRoundApproval(71));
  });
});

describe("Savings pipeline", () => {
  it("awarded savings vs the prior window", async () => {
    svc.getSavingsPipeline.mockResolvedValue(envelope(PERSONA.savings_pipeline));
    const Comp = component("savings_pipeline");
    render(<Comp filters={FILTERS} />);
    await flush();
    expect(screen.getByText(formatMoney(450000))).toBeInTheDocument();
    expect(screen.getByText(/50% more than prior period/)).toBeInTheDocument();
    expect(screen.getByText(/Across all vendors \(incl. not awarded\): ₹7L/)).toBeInTheDocument();
  });

  it("'All' range (prior null) shows no comparison", () => {
    expect(savingsDelta(100, null)).toBeNull();
    expect(savingsDelta(100, 100)).toEqual({ kind: "flat" });
    expect(savingsDelta(50, 100)).toEqual({ kind: "down", pct: -50 });
  });
});

describe("Approval turnaround", () => {
  it("opens on the first stage with decisions and switches tabs", async () => {
    svc.getApprovalTurnaround.mockResolvedValue(envelope(PERSONA.approval_turnaround));
    const Comp = component("approval_turnaround");
    render(<Comp filters={FILTERS} />);
    await flush();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
    expect(screen.getByRole("tab", { selected: true })).toHaveTextContent("Technical approval (4)");
    expect(screen.getByText("30 h")).toBeInTheDocument();
    expect(screen.getByText("4 days")).toBeInTheDocument();
    expect(screen.getByText(/Based on 4 decisions · 1 decided within a minute/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "PO approval (12)" }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("30 min")).toBeInTheDocument();
    expect(within(panel).getByText("19 h")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Quote approval" }));
    expect(screen.getByText("No quote approval in this period.")).toBeInTheDocument();
  });

  it("formats durations; null is a dash", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(0.01)).toBe("1 min");
    expect(formatDuration(6.5)).toBe("6.5 h");
    expect(formatDuration(76.8)).toBe("3.2 days");
  });
});
