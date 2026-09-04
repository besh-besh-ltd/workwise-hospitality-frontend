// CHART 2 — Where the money went.
//
// One horizontal stacked bar, in rupees, decomposing the negotiation against
// its own baseline:
//
//   green  — saved: baseline money the vendors actually gave back
//   amber  — shortfall: the reduction that was requested and not delivered
//   red    — overrun: money ADDED because a revised price went UP
//
// This is a pure aggregate, so it renders identically whether the round covers
// one product or fifty — which is exactly why it is here. Chart 1 collapses to
// a single pair of bars in the 885-of-886 single-product case; this one always
// answers "so what happened to the money".
//
// Non-numeric targets contribute nothing: they have no rupee baseline, so they
// never reach the totals this chart reads.

import { useMemo } from "react";
import { Bar, CHART_COLORS, TOOLTIP_STYLE } from "./chartSetup";
import { formatMoney } from "./roundDetailModel";
import { formatCurrencyShort } from "@/utils/sharedFunctions";

/**
 * Decompose the aggregate. Every branch tolerates a missing total.
 * `hasTarget` is false when no numeric target was set anywhere on the round —
 * in which case the amber segment is omitted entirely rather than drawn at
 * zero, so the chart never implies a target that wasn't set.
 */
export function buildMoneyFlow(totals = {}) {
  const baseline = totals.baselineValue ?? null;
  const target = totals.targetValue ?? null;
  const saved = totals.savedValue ?? null;

  const savedAmount = saved == null ? 0 : Math.max(0, saved);
  const overrun = saved == null ? 0 : Math.max(0, -saved);

  // The gap has to be measured on the lines that actually carried a target —
  // `requestedSaving` and `targetedSavedValue` are both scoped to those, so
  // untargeted lines can neither create nor close a shortfall.
  const requestedSaving =
    totals.requestedSaving != null
      ? Math.max(0, totals.requestedSaving)
      : totals.targetedBaselineValue != null && target != null
      ? Math.max(0, totals.targetedBaselineValue - target)
      : null;
  const savedOnTargeted = Math.max(0, totals.targetedSavedValue ?? saved ?? 0);
  const shortfall =
    requestedSaving == null ? null : Math.max(0, requestedSaving - savedOnTargeted);

  return {
    baseline,
    savedAmount,
    overrun,
    requestedSaving,
    shortfall,
    hasTarget: requestedSaving != null,
    // Nothing to draw at all — no baseline and no movement.
    isEmpty: savedAmount === 0 && overrun === 0 && (shortfall == null || shortfall === 0),
  };
}

export function buildMoneyFlowChartData(flow) {
  const datasets = [
    {
      label: "Saved",
      data: [flow.savedAmount],
      backgroundColor: CHART_COLORS.achieved,
      borderWidth: 0,
      borderRadius: 3,
      barPercentage: 0.9,
      categoryPercentage: 0.9,
    },
  ];
  if (flow.hasTarget && flow.shortfall > 0) {
    datasets.push({
      label: "Short of target",
      data: [flow.shortfall],
      backgroundColor: CHART_COLORS.warn,
      borderWidth: 0,
      borderRadius: 3,
      barPercentage: 0.9,
      categoryPercentage: 0.9,
    });
  }
  if (flow.overrun > 0) {
    datasets.push({
      label: "Price increase",
      data: [flow.overrun],
      backgroundColor: CHART_COLORS.danger,
      borderWidth: 0,
      borderRadius: 3,
      barPercentage: 0.9,
      categoryPercentage: 0.9,
    });
  }
  return { labels: ["This negotiation"], datasets };
}

export function buildMoneyFlowChartOptions() {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: true,
        position: "bottom",
        align: "start",
        labels: {
          usePointStyle: true,
          pointStyle: "circle",
          padding: 14,
          boxWidth: 8,
          font: { size: 11, weight: "600" },
        },
      },
      tooltip: {
        ...TOOLTIP_STYLE,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: CHART_COLORS.grid },
        ticks: {
          font: { size: 10 },
          color: CHART_COLORS.axis,
          callback: (v) => formatCurrencyShort(v),
        },
      },
      y: {
        stacked: true,
        grid: { display: false },
        ticks: { display: false },
      },
    },
  };
}

const SWATCH = {
  saved: CHART_COLORS.achieved,
  shortfall: CHART_COLORS.warn,
  overrun: CHART_COLORS.danger,
};

export default function MoneyFlowChart({ totals = {}, locked = false }) {
  const flow = useMemo(() => buildMoneyFlow(totals), [totals]);
  const data = useMemo(() => buildMoneyFlowChartData(flow), [flow]);
  const options = useMemo(() => buildMoneyFlowChartOptions(), []);

  if (locked) {
    return (
      <div className="guide warn" data-testid="money-flow-locked">
        <div>
          <strong>Prices are sealed.</strong> The money breakdown unlocks once the quote
          submission deadline passes.
        </div>
      </div>
    );
  }

  if (flow.isEmpty) {
    return (
      <div className="empty-state" style={{ padding: "34px 20px" }} data-testid="money-flow-empty">
        <h2 style={{ fontSize: 15 }}>No money has moved yet</h2>
        <p>
          Once a vendor submits a revised price, the saving, the gap to your target and any price
          increase all appear here.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="money-flow-chart">
      <div style={{ height: 104 }}>
        <Bar data={data} options={options} />
      </div>

      <div className="breakdown-legend" style={{ marginTop: 4 }}>
        <div className="breakdown-row">
          <span className="lbl">
            <span className="swatch" style={{ background: SWATCH.saved }} />
            Saved against baseline
          </span>
          <span className="val">{formatMoney(flow.savedAmount)}</span>
        </div>
        {flow.hasTarget && (
          <div className="breakdown-row">
            <span className="lbl">
              <span className="swatch" style={{ background: SWATCH.shortfall }} />
              Still short of your target
            </span>
            <span className="val">{formatMoney(flow.shortfall)}</span>
          </div>
        )}
        {flow.overrun > 0 && (
          <div className="breakdown-row">
            <span className="lbl">
              <span className="swatch" style={{ background: SWATCH.overrun }} />
              Added by price increases
            </span>
            <span className="val">{formatMoney(flow.overrun)}</span>
          </div>
        )}
        {flow.baseline != null && (
          <div className="breakdown-row">
            <span className="lbl" style={{ paddingLeft: 16 }}>Baseline this round</span>
            <span className="val">{formatMoney(flow.baseline)}</span>
          </div>
        )}
      </div>

      {!flow.hasTarget && (
        <p className="help-text" style={{ marginTop: 10 }} data-testid="money-flow-no-target">
          No price target was set on this round, so there is no shortfall to measure — only what
          was actually saved.
        </p>
      )}
    </div>
  );
}
