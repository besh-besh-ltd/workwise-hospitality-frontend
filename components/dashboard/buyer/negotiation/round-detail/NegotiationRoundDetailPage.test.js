// Negotiation Command Center — product-level tests.
//
// Everything here is asserted through the REAL page component over a stubbed
// service response: what the buyer sees (badges, signed money, the provenance
// tooltip, the empty state, the lock) and what Chart.js is actually handed
// (labels, series lengths, per-bar colours). No internal call counts.
//
// react-chartjs-2 is stubbed so the canvas never has to exist in jsdom; the
// stub records every `data`/`options` object it receives, which is the only
// honest way to assert "non-numeric targets never reach data.datasets".

jest.mock("@/services/negotiation", () => ({
  __esModule: true,
  getNegotiationRoundDetail: jest.fn(),
}));

jest.mock("react-chartjs-2", () => {
  const React = require("react");
  const calls = [];
  return {
    __esModule: true,
    __calls: calls,
    Bar: (props) => {
      calls.push(props);
      return React.createElement("div", { "data-testid": "chart-canvas" });
    },
  };
});

import React from "react";
import { render, screen, within, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

import * as chartLib from "react-chartjs-2";
import { getNegotiationRoundDetail } from "@/services/negotiation";
import NegotiationRoundDetailPage from "./NegotiationRoundDetailPage";
import { CHART_COLORS } from "./chartSetup";

const barCalls = chartLib.__calls;

// ── fixtures ───────────────────────────────────────────────────────────────

const mkLine = (i, over = {}) => ({
  rfq_product_id: 100 + i,
  product_name: `Bath Towel ${i}`,
  vendor_id: 9,
  vendor_name: "Goodluck Textiles",
  quantity: 100,
  uom: "PCS",
  baseline_unit_price: 250,
  baseline_line_total: 25000,
  baseline_source: "original_quote",
  target_unit_price: 225,
  achieved_line_total: 23000,
  responded: true,
  ...over,
});

const mkPayload = ({ items = [mkLine(1)], round = {}, totals, meta = {}, actions = [], history = [] } = {}) => ({
  status: 1,
  data: {
    round: {
      id: 501,
      round_number: 3,
      total_rounds: 3,
      total_rounds_on_parent: 3,
      status: "ACTIVE",
      source: "RFQ",
      rfq_id: 369,
      rfq_no: "535906",
      title: "Housekeeping consumables",
      hotel_name: "Taj Palace",
      department_title: "Housekeeping",
      created_by_name: "Asha Menon",
      created_at: "2026-07-01 10:00:00",
      end_date: "2026-07-31 18:00:00",
      ...round,
    },
    items,
    ...(totals ? { totals } : {}),
    available_actions: actions,
    history,
    meta: { scope: "round", has_siblings: false, quote_visibility_locked: false, ...meta },
  },
});

const renderPage = async (payload) => {
  getNegotiationRoundDetail.mockResolvedValue(payload);
  const utils = render(<NegotiationRoundDetailPage roundId="501" />);
  await screen.findByTestId("negotiation-round-detail");
  return utils;
};

/** The most recent `data` object handed to the Requested-vs-Achieved chart. */
const reductionChartData = () => barCalls[0]?.data;

beforeEach(() => {
  barCalls.length = 0;
  getNegotiationRoundDetail.mockReset();
});

// ── outcome badges ─────────────────────────────────────────────────────────

describe("outcome badges", () => {
  it("renders one badge per line with the right label", async () => {
    await renderPage(
      mkPayload({
        items: [
          mkLine(1, { achieved_line_total: 22500 }), // at target
          mkLine(2, { achieved_line_total: 24000 }), // improved, short of target
          mkLine(3, { achieved_line_total: 25000 }), // flat
          mkLine(4, { achieved_line_total: 25236 }), // price went UP
          mkLine(5, { responded: false, achieved_line_total: null }),
          mkLine(6, { target_unit_price: null, achieved_line_total: null, responded: false }),
        ],
      })
    );

    const table = screen.getByTestId("lines-table");
    expect(within(table).getByTestId("outcome-target_met")).toHaveTextContent("Target met");
    expect(within(table).getByTestId("outcome-improved")).toHaveTextContent("Improved");
    expect(within(table).getByTestId("outcome-no_change")).toHaveTextContent("No change");
    expect(within(table).getByTestId("outcome-regressed")).toHaveTextContent("Price increased");
    expect(within(table).getAllByTestId("outcome-no_response")).toHaveLength(2);
  });

  it("never renders a target-missed treatment on a line that had no target", async () => {
    await renderPage({
      ...mkPayload({
        items: [mkLine(1, { target_unit_price: null, achieved_line_total: 24000 })],
      }),
    });

    expect(screen.getByTestId("no-target")).toHaveTextContent("No price target was set");
    expect(screen.queryByTestId("outcome-target_met")).not.toBeInTheDocument();
    expect(screen.queryByText(/target missed/i)).not.toBeInTheDocument();
    // and the page-level banner is informational, not a red failure
    expect(screen.getByTestId("banner-no-target")).toHaveTextContent(
      /No price target was set on this round/i
    );
  });
});

// ── signed / negative formatting ───────────────────────────────────────────

describe("price regressions are shown signed and unclamped", () => {
  it("renders an increase in danger colour with explicit copy", async () => {
    await renderPage(mkPayload({ items: [mkLine(1, { achieved_line_total: 25236 })] }));

    const cell = screen.getByTestId("movement-regression");
    expect(cell).toHaveTextContent("−₹236");
    expect(cell).toHaveTextContent("Price increased ₹236");
    expect(cell.querySelector(".mono")).toHaveStyle({ color: "var(--danger)" });
  });

  it("states the aggregate regression at the top of the page instead of hiding it", async () => {
    await renderPage(mkPayload({ items: [mkLine(1, { achieved_line_total: 25236 })] }));

    const banner = screen.getByTestId("banner-regression");
    expect(banner).toHaveTextContent("Prices went up on this round");
    expect(banner).toHaveTextContent("₹236");
    expect(screen.getByTestId("stat-saved-round")).toHaveTextContent("−₹236");
  });

  it("still calls out individual regressions when the round is net positive", async () => {
    await renderPage(
      mkPayload({
        items: [
          mkLine(1, { achieved_line_total: 20000 }),
          mkLine(2, { achieved_line_total: 25236 }),
        ],
      })
    );
    expect(screen.getByTestId("banner-line-regression")).toHaveTextContent(
      /1 line came back more expensive/i
    );
    expect(screen.queryByTestId("banner-regression")).not.toBeInTheDocument();
  });
});

// ── baseline provenance ────────────────────────────────────────────────────

describe("baseline_source", () => {
  it("carries an explanatory tooltip on every line", async () => {
    await renderPage(mkPayload({ items: [mkLine(1, { baseline_source: "previous_round" })] }));

    const hint = screen.getByTestId("baseline-source");
    expect(hint).toHaveTextContent("Previous round");
    expect(hint).toHaveAttribute(
      "title",
      expect.stringContaining("previous negotiation round")
    );
  });

  it("explains the provenance when the baseline is stale", async () => {
    await renderPage(
      mkPayload({ items: [mkLine(1, { baseline_source: "round_start_quote", baseline_stale: true })] })
    );
    expect(screen.getByTestId("baseline-source")).toHaveAttribute(
      "title",
      expect.stringContaining("older than the current quote")
    );
    expect(screen.getByTestId("banner-stale-baseline")).toBeInTheDocument();
  });
});

// ── empty state ────────────────────────────────────────────────────────────

describe("empty states", () => {
  it("explains an empty round rather than rendering a bare table", async () => {
    await renderPage(mkPayload({ items: [] }));
    expect(screen.getByTestId("lines-empty")).toHaveTextContent("No lines on this round");
    expect(screen.queryByTestId("lines-table")).not.toBeInTheDocument();
  });

  it("shows a recoverable error state when the round cannot be loaded", async () => {
    getNegotiationRoundDetail.mockRejectedValue({ message: "Round not found" });
    render(<NegotiationRoundDetailPage roundId="999" />);
    expect(await screen.findByTestId("round-detail-error")).toHaveTextContent("Round not found");
    expect(screen.getByRole("link", { name: /Back to negotiations/i })).toBeInTheDocument();
  });
});

// ── chart 1 sizing + series ────────────────────────────────────────────────

describe("Chart 1 — requested vs achieved, at 1 / 12 / 46 lines", () => {
  const sizeCase = async (n) => {
    barCalls.length = 0;
    const items = Array.from({ length: n }, (_, i) => mkLine(i + 1, { rfq_product_id: 200 + i }));
    const { unmount } = await renderPage(mkPayload({ items }));
    const wrap = screen.getByTestId("reduction-chart-canvas-wrap");
    const scroller = screen.getByTestId("reduction-chart-scroller");
    const data = reductionChartData();
    return { wrap, scroller, data, unmount };
  };

  it("gives a single product a readable 120px pair of bars, not an empty chart", async () => {
    const { wrap, scroller, data } = await sizeCase(1);
    expect(wrap).toHaveStyle({ height: "120px" });
    expect(scroller).not.toHaveStyle({ overflowY: "auto" });
    expect(data.labels).toHaveLength(1);
    expect(data.datasets).toHaveLength(2);
    data.datasets.forEach((ds) => expect(ds.data).toHaveLength(1));
  });

  it("gives 12 lines 44px each and still does not need to scroll", async () => {
    const { wrap, scroller, data } = await sizeCase(12);
    expect(wrap).toHaveStyle({ height: "528px" });
    expect(scroller).not.toHaveStyle({ overflowY: "auto" });
    expect(data.labels).toHaveLength(12);
    data.datasets.forEach((ds) => expect(ds.data).toHaveLength(12));
  });

  it("scrolls 46 lines inside a 560px cap without overflowing the card", async () => {
    const { wrap, scroller, data } = await sizeCase(46);
    expect(wrap).toHaveStyle({ height: "2024px" });
    expect(scroller).toHaveStyle({ maxHeight: "560px", overflowY: "auto", overflowX: "hidden" });
    expect(data.labels).toHaveLength(46);
    data.datasets.forEach((ds) => expect(ds.data).toHaveLength(46));
    expect(screen.queryByTestId("reduction-chart-truncated")).not.toBeInTheDocument();
  });

  it("caps at the top 50 by baseline value and says how many are hidden", async () => {
    barCalls.length = 0;
    const items = Array.from({ length: 55 }, (_, i) =>
      mkLine(i + 1, { rfq_product_id: 300 + i, baseline_line_total: 1000 + i })
    );
    await renderPage(mkPayload({ items }));
    expect(reductionChartData().labels).toHaveLength(50);
    expect(screen.getByTestId("reduction-chart-truncated")).toHaveTextContent("+5 more");
    // top-50 by baseline means the largest line survives and the smallest does not
    expect(reductionChartData().labels).toContain("Bath Towel 55");
    expect(reductionChartData().labels).not.toContain("Bath Towel 1");
  });
});

// ── chart 1 content rules ──────────────────────────────────────────────────

describe("Chart 1 — what is allowed on the % axis", () => {
  it("keeps non-numeric targets out of data.datasets entirely", async () => {
    await renderPage(
      mkPayload({
        items: [
          mkLine(1, { product_name: "Chartable product" }),
          mkLine(2, {
            product_name: "Payment terms only",
            target_unit_price: null,
            target_field: "payment_terms",
            target_payment_terms: "Net 45",
            baseline_line_total: null,
            baseline_unit_price: null,
            achieved_line_total: null,
            responded: false,
          }),
          mkLine(3, {
            product_name: "Documents only",
            target_unit_price: null,
            target_field: "documents",
            target_documents: "ISO 9001",
            baseline_line_total: null,
            baseline_unit_price: null,
            responded: false,
            achieved_line_total: null,
          }),
        ],
      })
    );

    const data = reductionChartData();
    expect(data.labels).toEqual(["Chartable product"]);
    data.datasets.forEach((ds) => expect(ds.data).toHaveLength(1));
    expect(data.labels).not.toContain("Payment terms only");
    expect(data.labels).not.toContain("Documents only");

    // …but they are still visible to the buyer, as chips on the line.
    expect(screen.getByTestId("nonnumeric-target-payment_terms")).toHaveTextContent(
      "Payment terms · Net 45"
    );
    expect(screen.getByTestId("nonnumeric-target-documents")).toHaveTextContent("ISO 9001");
    expect(screen.getByTestId("reduction-chart-excluded")).toHaveTextContent(
      /2 lines carry a non-price target/i
    );
  });

  it("colours a negative achieved reduction as danger and a positive one as success", async () => {
    await renderPage(
      mkPayload({
        items: [
          mkLine(1, { achieved_line_total: 23000 }), // −8% → saving
          mkLine(2, { achieved_line_total: 25236 }), // price went UP
        ],
      })
    );
    const achieved = reductionChartData().datasets[1];
    expect(achieved.label).toBe("Achieved reduction");
    expect(achieved.data[0]).toBeGreaterThan(0);
    expect(achieved.data[1]).toBeLessThan(0);
    expect(achieved.backgroundColor).toEqual([CHART_COLORS.achieved, CHART_COLORS.danger]);
  });

  it("plots the requested series with an inline note when no vendor has responded", async () => {
    await renderPage(
      mkPayload({
        items: [mkLine(1, { responded: false, achieved_line_total: null })],
      })
    );
    const data = reductionChartData();
    expect(data.datasets).toHaveLength(1);
    expect(data.datasets[0].label).toBe("Requested reduction");
    expect(data.datasets[0].data).toEqual([10]); // 250 → 225
    expect(screen.getByTestId("reduction-chart-note")).toHaveTextContent(
      /No vendor has responded yet/i
    );
    expect(screen.getByTestId("banner-no-responses")).toBeInTheDocument();
  });
});

// ── chart 2 ────────────────────────────────────────────────────────────────

describe("Chart 2 — where the money went", () => {
  it("splits saved / shortfall / overrun at a single product", async () => {
    await renderPage(
      mkPayload({ items: [mkLine(1, { achieved_line_total: 24000 })] }) // saved 1000, target asked 2500
    );
    const money = barCalls[barCalls.length - 1].data;
    expect(money.datasets.map((d) => d.label)).toEqual(["Saved", "Short of target"]);
    expect(money.datasets[0].data).toEqual([1000]);
    expect(money.datasets[1].data).toEqual([1500]);
    expect(money.labels).toHaveLength(1);
  });

  it("renders the same single-bar shape at 46 lines — it is a pure aggregate", async () => {
    await renderPage(
      mkPayload({
        items: Array.from({ length: 46 }, (_, i) =>
          mkLine(i + 1, { rfq_product_id: 400 + i, achieved_line_total: 24000 })
        ),
      })
    );
    const money46 = barCalls[barCalls.length - 1].data;
    expect(money46.labels).toHaveLength(1);
    expect(money46.datasets[0].data).toEqual([46000]);
    expect(money46.datasets[1].data).toEqual([69000]);
  });

  it("adds a red overrun segment when prices went up", async () => {
    await renderPage(
      mkPayload({ items: [mkLine(1, { achieved_line_total: 25236, target_unit_price: null })] })
    );
    const money = barCalls[barCalls.length - 1].data;
    expect(money.datasets.map((d) => d.label)).toEqual(["Saved", "Price increase"]);
    expect(money.datasets[1].data).toEqual([236]);
    expect(money.datasets[1].backgroundColor).toBe(CHART_COLORS.danger);
    expect(screen.getByTestId("money-flow-no-target")).toBeInTheDocument();
  });
});

// ── quote visibility lock ──────────────────────────────────────────────────

describe("quote_visibility_locked", () => {
  it("renders metadata and targets but not a single price", async () => {
    const { container } = await renderPage(
      mkPayload({
        items: [mkLine(1)],
        meta: { quote_visibility_locked: true },
      })
    );

    expect(screen.getByTestId("banner-locked")).toHaveTextContent("Vendor prices are sealed");
    expect(screen.getByTestId("money-flow-locked")).toBeInTheDocument();

    // metadata still readable
    expect(screen.getByText("Housekeeping consumables")).toBeInTheDocument();
    expect(screen.getByTestId("lines-table")).toHaveTextContent("Bath Towel 1");

    // and no rupee figure anywhere on the page
    expect(container.textContent).not.toMatch(/₹/);

    // the achieved series is withheld too — it is a derivative of a sealed price
    expect(reductionChartData().datasets).toHaveLength(1);
    expect(screen.getByTestId("reduction-chart-note")).toHaveTextContent(/stay sealed/i);
  });
});

// ── scope, denominators, settled rounds ────────────────────────────────────

describe("scope toggle", () => {
  it("defaults to cycle when sibling rounds exist and refetches on switch", async () => {
    await renderPage(
      mkPayload({ meta: { scope: "cycle", has_siblings: true, sibling_round_count: 4 } })
    );

    const toggle = screen.getByTestId("scope-toggle");
    expect(within(toggle).getByRole("button", { name: /All products at round 3/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(within(toggle).getByRole("button", { name: "This round" }));
    await waitFor(() =>
      expect(getNegotiationRoundDetail).toHaveBeenLastCalledWith("501", { scope: "round" })
    );
  });

  it("defaults to this-round when there are no siblings, and still offers the other view", async () => {
    await renderPage(mkPayload({ meta: { scope: null, has_siblings: false } }));
    const toggle = screen.getByTestId("scope-toggle");
    expect(within(toggle).getByRole("button", { name: "This round" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(
      within(toggle).getByRole("button", { name: /All products at round 3/i })
    ).toBeEnabled();
  });
});

describe("honest denominators", () => {
  it("renders both counts when the cycle and the parent disagree", async () => {
    await renderPage(
      mkPayload({ round: { round_number: 5, total_rounds: 7, total_rounds_on_parent: 32 } })
    );
    expect(screen.getByTestId("banner-denominator")).toHaveTextContent(
      "Round 5 of 7 · 32 rounds on this RFQ"
    );
  });
});

describe("cancelled and expired rounds", () => {
  it("renders in full behind a muted hero plus an explanatory banner", async () => {
    await renderPage(
      mkPayload({
        round: { status: "CANCELLED", closed_at: "2026-07-10 09:00:00" },
        items: [mkLine(1)],
      })
    );
    expect(screen.getByTestId("hero-muted")).toBeInTheDocument();
    expect(screen.getByTestId("banner-terminated")).toHaveTextContent("This round was cancelled");
    // still fully rendered — the history is the point
    expect(screen.getByTestId("lines-table")).toBeInTheDocument();
    expect(screen.getByTestId("reduction-chart")).toBeInTheDocument();
  });
});

describe("multi-round labelling", () => {
  it("never presents a bare savings number — round and cumulative are separate tiles", async () => {
    await renderPage(
      mkPayload({
        round: { round_number: 2, total_rounds: 3, total_rounds_on_parent: 3 },
        items: [mkLine(1, { achieved_line_total: 23000 })],
        totals: { saved_value: 2000, baseline_value: 25000, cumulative_saved_value: 9000 },
      })
    );
    expect(screen.getByTestId("stat-saved-round")).toHaveTextContent("Saved · this round");
    expect(screen.getByTestId("stat-saved-round")).toHaveTextContent("+₹2,000");
    expect(screen.getByTestId("stat-saved-cumulative")).toHaveTextContent("Saved · all 3 rounds");
    expect(screen.getByTestId("stat-saved-cumulative")).toHaveTextContent("+₹9,000");
  });
});

describe("ARC-sourced rounds", () => {
  it("routes and labels against the rate contract rather than an RFQ", async () => {
    await renderPage(
      mkPayload({
        round: { source: "ARC", arc_id: 77, arc_number: "ARC-2026-77", rfq_id: null, rfq_no: null },
      })
    );
    expect(screen.getByTestId("banner-arc")).toHaveTextContent("belongs to a rate contract");
    expect(screen.getByTestId("action-open-parent")).toHaveAttribute(
      "href",
      "/dashboard/buyer/rate-contracts/77?stage=commercial"
    );
  });
});

describe("vendor participation", () => {
  it("lists who responded and who has not, with something to call", async () => {
    await renderPage(
      mkPayload({
        items: [
          mkLine(1, { vendor_id: 9, vendor_name: "Goodluck", responded: true }),
          mkLine(2, {
            vendor_id: 4,
            vendor_name: "Sharma Traders",
            responded: false,
            achieved_line_total: null,
          }),
        ],
      })
    );
    const panel = screen.getByTestId("vendor-panel");
    expect(within(panel).getAllByTestId("vendor-responded")).toHaveLength(1);
    expect(within(panel).getAllByTestId("vendor-pending")).toHaveLength(1);
    expect(panel).toHaveTextContent("1 of 2");
  });
});
