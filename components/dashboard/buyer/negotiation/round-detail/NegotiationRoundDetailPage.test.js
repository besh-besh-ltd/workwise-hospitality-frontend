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
  it("divides by every round on the parent, and says how many touched these items", async () => {
    await renderPage(
      mkPayload({ round: { round_number: 5, rounds_on_parent: 32, rounds_on_products: 7 } })
    );
    // The position is RFQ-wide, so the denominator is too.
    expect(screen.getByTestId("hero-denominator")).toHaveTextContent("Round 5 of 32");
    // The per-product count is context, in a sentence — never the divisor.
    expect(screen.getByTestId("banner-denominator")).toHaveTextContent("7 of those 32 rounds");
  });
});

describe("cancelled and lapsed rounds", () => {
  it("renders in full behind a muted hero plus an explanatory banner", async () => {
    await renderPage(
      mkPayload({
        round: { status: "CANCELLED", closed_at: "2026-07-10 09:00:00" },
        items: [mkLine(1)],
      })
    );
    expect(screen.getByTestId("hero-muted")).toBeInTheDocument();
    expect(screen.getByTestId("banner-terminated")).toHaveTextContent("Cancelled");
    expect(screen.getByTestId("banner-terminated")).toHaveTextContent(
      "Someone cancelled this round deliberately"
    );
    // still fully rendered — the history is the point
    expect(screen.getByTestId("lines-table")).toBeInTheDocument();
    expect(screen.getByTestId("reduction-chart")).toBeInTheDocument();
  });

  it("says a lapsed round never reached a vendor, rather than calling it expired", async () => {
    await renderPage(
      mkPayload({
        round: { status: "EXPIRED", end_date: "2026-07-10 09:00:00" },
        items: [mkLine(1, { responded: false, achieved_line_total: null })],
      })
    );
    const banner = screen.getByTestId("banner-terminated");
    expect(banner).toHaveTextContent("Lapsed — never approved");
    expect(banner).toHaveTextContent("no vendor ever saw them");
    // The "no vendor has responded yet" nag would be nonsense here: nobody was
    // ever asked, so there is nothing to chase.
    expect(screen.queryByTestId("banner-no-responses")).not.toBeInTheDocument();
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

// ── the REAL backend contract ──────────────────────────────────────────────
//
// Everything above uses the speculative payload this UI was originally written
// against. This block uses the shape
// GET /negotiation/rounds/:id/detail actually returns
// (negotiationRoundDetailController.js + negotiationModel.getRoundDetail), which
// differs in every place the page reads identity, actions or approval from.

const mkServerPayload = (over = {}) => ({
  status: 1,
  data: {
    scope: "round",
    cycle: null,
    round: {
      round_id: 501,
      // The server-computed RFQ-wide position…
      round_number: 7,
      // …versus the stored per-product sequence, which is never rendered.
      stored_round_number: 4,
      status: "ENDED",
      effective_status: "AWAITING_DECISION",
      state: "ready_for_decision",
      state_label: "Ready for your decision",
      state_description:
        "Window closed and vendors responded — choose which quotes to take forward.",
      response_count: 1,
      has_approved_quote: false,
      is_open: false,
      mode: "PER_ITEM",
      source_type: "RFQ",
      source_id: 512,
      rounds_on_parent: 138,
      rounds_on_products: 4,
      end_date: "2026-07-20T18:00:00.000Z",
      created_at: "2026-07-01T10:00:00.000Z",
      closed_at: null,
      created_by: {
        user_id: 80011,
        name: "Asha Menon",
        email: "asha@example.com",
        mobile: "9800000000",
        designation: "Buyer",
      },
    },
    parent: {
      source_type: "RFQ",
      rfq_id: 512,
      rfq_no: 536299,
      arc_id: null,
      arc_number: null,
      title: "Housekeeping consumables",
      status: 1,
      is_tender: 0,
      hotel_id: 10101,
      hotel_name: "Taj Palace",
      department_id: 10201,
      department_name: "Housekeeping",
      company_name: "Phileein Hospitality",
    },
    lines: [
      {
        line_id: "501:100:9",
        round_id: 501,
        round_number: 4,
        rfq_product_id: 100,
        product_name: "Bath Towel",
        vendor_id: 9,
        vendor_name: "Goodluck Textiles",
        quantity: 100,
        uom: "PCS",
        baseline_line_total: 25000,
        baseline_unit: 250,
        baseline_source: "prior_round",
        target_unit: 225,
        target_line_total: 22500,
        has_numeric_target: true,
        achieved_line_total: 23000,
        achieved_unit: 230,
        responded: true,
        responded_at: "2026-07-18T09:00:00.000Z",
        saved_value: 2000,
        outcome: "target_missed",
      },
    ],
    totals: {
      currency: "INR",
      lines_total: 1,
      lines_responded: 1,
      lines_with_numeric_target: 1,
      vendors_total: 1,
      vendors_responded: 1,
      baseline_total: 25000,
      achieved_total: 23000,
      target_baseline_total: 25000,
      target_total: 22500,
      saved_value: 2000,
      saved_pct: 8,
      requested_pct: 10,
      attainment_pct: 80,
      target_met: false,
    },
    cumulative: {
      from_round_number: 1,
      to_round_number: 7,
      rounds_counted: 4,
      baseline_total: 30000,
      achieved_total: 21000,
      saved_value: 9000,
      saved_pct: 30,
      excludes_cancelled: true,
    },
    vendors: [
      {
        vendor_id: 9,
        vendor_name: "Goodluck Textiles",
        vendor_email: "sales@goodluck.example",
        vendor_mobile: "9820000000",
        lines: 1,
        lines_responded: 1,
        last_responded_at: "2026-07-18T09:00:00.000Z",
        has_responded: true,
        saved_value: 2000,
      },
    ],
    history: [
      {
        round_id: 498,
        round_number: 5,
        stored_round_number: 3,
        status: "ENDED",
        state: "concluded",
        state_label: "Concluded",
        is_current: false,
        end_date: "2026-06-20T18:00:00.000Z",
        line_count: 1,
        responded_count: 1,
        saved_value: 4000,
      },
      {
        round_id: 501,
        round_number: 7,
        stored_round_number: 4,
        status: "ENDED",
        state: "ready_for_decision",
        state_label: "Ready for your decision",
        is_current: true,
        end_date: "2026-07-20T18:00:00.000Z",
        line_count: 1,
        responded_count: 1,
        saved_value: 2000,
      },
    ],
    approval: {
      instances: [
        {
          instance_id: 88,
          round_id: 501,
          status: "PENDING",
          current_step: 1,
          total_steps: 2,
          initiated_by: { user_id: 80011, name: "Asha Menon" },
          steps: [
            {
              step_id: 900,
              step_order: 1,
              status: "PENDING",
              approvers: [
                { user_id: 412, name: "Balasaheb Aiwale", email: "bala@example.com", status: "PENDING" },
                { user_id: 138, name: "Prashant Joshi", email: "pj@example.com", status: "PENDING" },
              ],
            },
            { step_id: 901, step_order: 2, status: "PENDING", approvers: [] },
          ],
          pending_with: [
            { user_id: 412, name: "Balasaheb Aiwale", email: "bala@example.com", status: "PENDING" },
            { user_id: 138, name: "Prashant Joshi", email: "pj@example.com", status: "PENDING" },
          ],
          is_pending_for_me: true,
        },
      ],
      status: "PENDING",
      pending_with: [
        { user_id: 412, name: "Balasaheb Aiwale", email: "bala@example.com", status: "PENDING" },
        { user_id: 138, name: "Prashant Joshi", email: "pj@example.com", status: "PENDING" },
      ],
      is_pending_for_me: true,
      vendor_approvals: { total: 1, approved: 1, rejected: 0, pending: 0 },
    },
    permissions: { read: true, create: true, update: true, approve: true, delete: false },
    quote_visibility: { locked: false, timezone: "Asia/Kolkata", deadline: null, remainingMs: 0, message: null },
    prices_hidden: false,
    actions: {
      can_approve: false,
      can_reject: false,
      can_close: true,
      can_create_next_round: true,
      can_view_quotes: true,
      can_submit_quotes_for_approval: true,
    },
    ...over,
  },
});

describe("the real backend payload", () => {
  it("renders action buttons from the object-shaped `actions` map", async () => {
    await renderPage(mkServerPayload());

    // `actions` is an object of booleans. Running asArray() over it returned
    // [] and the page rendered no buttons at all, on every round.
    expect(screen.getByTestId("action-create_next_round")).toBeInTheDocument();
    expect(screen.getByTestId("action-submit_quotes_for_approval")).toBeInTheDocument();
    expect(screen.getByTestId("action-close_round")).toBeInTheDocument();
    // Gates the server set to false must not appear.
    expect(screen.queryByTestId("action-approve")).not.toBeInTheDocument();
  });

  it("gives every rendered action a real destination", async () => {
    await renderPage(mkServerPayload());
    // round.rfqId used to resolve null (it lives on `parent`), so even the
    // unconditional fallback rendered nothing.
    expect(screen.getByTestId("action-create_next_round")).toHaveAttribute(
      "href",
      "/dashboard/buyer/negotiation/512/create"
    );
    expect(screen.getByTestId("action-open-parent")).toHaveAttribute(
      "href",
      "/dashboard/buyer/quote-comparison?rfq=512"
    );
  });

  it("renders approver NAMES, never [object Object]", async () => {
    await renderPage(mkServerPayload());

    const panel = screen.getByTestId("approval-panel");
    expect(panel).toHaveTextContent("Balasaheb Aiwale");
    expect(panel).not.toHaveTextContent("[object Object]");

    const banner = screen.getByTestId("banner-approval");
    expect(banner).toHaveTextContent("Balasaheb Aiwale");
    expect(banner).not.toHaveTextContent("[object Object]");

    expect(document.body.textContent).not.toContain("[object Object]");
  });

  it("populates the hero from the parent record, not from the round row", async () => {
    await renderPage(mkServerPayload());

    // Title came from the literal fallback string "RFQ" before this.
    expect(screen.getByText("Housekeeping consumables")).toBeInTheDocument();
    // The id chip is the RFQ number, not the round id.
    expect(screen.getByText("#536299")).toBeInTheDocument();
    expect(screen.getByTestId("hero-hotel")).toHaveTextContent("Taj Palace");
    expect(screen.getByTestId("hero-department")).toHaveTextContent("Housekeeping");
    // created_by is an object.
    expect(screen.getByTestId("hero-creator")).toHaveTextContent("Asha Menon");
    // And the state is spelled out in words somewhere on the page.
    expect(screen.getByTestId("hero-state-description")).toHaveTextContent(
      "Window closed and vendors responded"
    );
  });

  it("numbers the round across the whole RFQ", async () => {
    await renderPage(mkServerPayload());
    // The server sends the computed position (7th of 138 rounds on RFQ 512).
    // The stored column says 4 — its per-product sequence — and is not rendered.
    expect(screen.getByTestId("hero-denominator")).toHaveTextContent("Round 7 of 138");
    expect(screen.getByTestId("hero-denominator")).not.toHaveTextContent("Round 4");
    // How many of those 138 touched these items goes in a sentence.
    expect(screen.getByTestId("banner-denominator")).toHaveTextContent("4 of those 138 rounds");
  });

  it("reads the cumulative roll-up from its own top-level object", async () => {
    await renderPage(mkServerPayload());
    const tile = screen.getByTestId("stat-saved-cumulative");
    expect(tile).toHaveTextContent("+₹9,000");
    expect(tile).not.toHaveTextContent("Not reported by the server");
  });

  it("fills the round-history table", async () => {
    await renderPage(mkServerPayload());
    const table = screen.getByTestId("round-history");
    expect(table).toHaveTextContent("Round 5");
    expect(table).toHaveTextContent("Concluded");
    expect(table).toHaveTextContent("You are here");
    expect(screen.queryByTestId("history-empty")).not.toBeInTheDocument();
  });

  it("detects the quote lock from quote_visibility and explains it", async () => {
    await renderPage(
      mkServerPayload({
        prices_hidden: true,
        totals: null,
        cumulative: null,
        quote_visibility: {
          locked: true,
          timezone: "Asia/Kolkata",
          deadline: "2026-08-10T18:00:00.000Z",
          message: "Vendor prices unseal after the quote deadline.",
        },
      })
    );
    expect(screen.getByTestId("banner-locked")).toHaveTextContent("Vendor prices are sealed");
    expect(screen.getByTestId("banner-locked")).toHaveTextContent(
      "Vendor prices unseal after the quote deadline."
    );
    expect(screen.getByTestId("stat-saved-round")).toHaveTextContent("Sealed");
  });

  it("counts responded LINES, not responded vendors", async () => {
    await renderPage(
      mkServerPayload({
        totals: { lines_total: 6, lines_responded: 6, vendors_total: 2, vendors_responded: 2, baseline_total: 1000 },
      })
    );
    // `vendors_responded` used to win the alias race and reported "2 of 6".
    expect(screen.getByTestId("stat-responses")).toHaveTextContent("6 of 6");
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
