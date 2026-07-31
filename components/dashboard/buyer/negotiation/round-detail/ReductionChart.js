// CHART 1 — Requested vs Achieved reduction, per line.
//
// Grouped HORIZONTAL bar (indexAxis:'y') because the category labels are long
// product names and would be unreadable rotated under a vertical axis.
//
// The X axis is "% reduction from baseline", not rupees. That is the whole
// point of the chart: the buyer asked for a UNIT price and the vendor moved a
// LINE TOTAL, and those two differ by roughly qty × tax. Plotting them against
// each other in ₹ would draw a comparison that isn't true. Normalising both to
// "% off the same baseline" makes them genuinely comparable, and the rupee
// figures still travel in the tooltip where they can't mislead.
//
// Lines whose only target is non-numeric (payment_terms, documents, comments,
// global_comment, delivery_period, vendor_tc) never enter `data.datasets` —
// they render as chips in the table instead.

import { useMemo } from "react";
import { Bar, CHART_COLORS, TOOLTIP_STYLE } from "./chartSetup";
import {
  formatMoney,
  formatSignedMoney,
  baselineSourceLabel,
} from "./roundDetailModel";

// ── sizing ────────────────────────────────────────────────────────────────
// 46 lines is the production maximum observed, so MAX_PLOTTED is a guard rail
// rather than a routine path.
export const MAX_PLOTTED = 50;
export const ROW_HEIGHT = 44;
export const SINGLE_ROW_HEIGHT = 120;
export const SCROLL_MAX_HEIGHT = 560;

/**
 * Decide what actually gets drawn and how tall the canvas is.
 *
 *   1 line      → 120px, so a single pair of bars reads as a comparison
 *                 rather than as an accidentally-empty chart.
 *   ≤12 lines   → 44px per line.
 *   13–50 lines → 44px per line inside a 560px scroller.
 *   >50 lines   → top 50 by baseline value + an explicit "+N more" note.
 */
export function planReductionChart(lines = []) {
  const eligible = lines.filter((l) => l.chartEligible);
  const truncated = eligible.length > MAX_PLOTTED;
  const plotted = truncated
    ? [...eligible]
        .sort((a, b) => (b.baselineTotal || 0) - (a.baselineTotal || 0))
        .slice(0, MAX_PLOTTED)
    : eligible;

  const n = plotted.length;
  const height = n === 0 ? SINGLE_ROW_HEIGHT : n === 1 ? SINGLE_ROW_HEIGHT : Math.max(SINGLE_ROW_HEIGHT, ROW_HEIGHT * n);

  return {
    plotted,
    truncated,
    hiddenCount: truncated ? eligible.length - MAX_PLOTTED : 0,
    excludedCount: lines.length - eligible.length,
    height,
    // Only scroll once the plot would overflow the cap — 12 lines (528px) fit,
    // 13 (572px) do not.
    needsScroll: height > SCROLL_MAX_HEIGHT,
  };
}

const round2 = (v) => (v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100) / 100);

function lineLabel(line, showVendor) {
  const base = line.variantName ? `${line.productName} · ${line.variantName}` : line.productName;
  return showVendor ? `${base} — ${line.vendorName}` : base;
}

/**
 * Build the exact `data` object handed to Chart.js.
 *
 * `locked` (sealed quotes) drops the achieved series entirely — an achieved %
 * is a derivative of a price the viewer is not allowed to see.
 * Zero vendor responses also drops the achieved series, so the canvas shows
 * the requested series plus an inline note instead of a blank grid.
 */
export function buildReductionChartData(plotted = [], { locked = false } = {}) {
  const vendorNames = new Set(plotted.map((l) => l.vendorName));
  const showVendor = vendorNames.size > 1;

  const anyAchieved =
    !locked && plotted.some((l) => l.responded && l.achievedPct != null);

  const datasets = [
    {
      label: "Requested reduction",
      data: plotted.map((l) => (l.hasNumericTarget ? round2(l.requestedPct) : null)),
      backgroundColor: CHART_COLORS.requested,
      borderColor: CHART_COLORS.requested,
      borderWidth: 0,
      borderRadius: 3,
      barPercentage: 0.78,
      categoryPercentage: 0.72,
    },
  ];

  if (anyAchieved) {
    datasets.push({
      label: "Achieved reduction",
      data: plotted.map((l) => (l.responded ? round2(l.achievedPct) : null)),
      // Per-bar colour: a negative achieved % means the revised price went UP,
      // and that flips the bar to danger rather than being clamped away.
      backgroundColor: plotted.map((l) =>
        Number(l.achievedPct) < 0 ? CHART_COLORS.danger : CHART_COLORS.achieved
      ),
      borderWidth: 0,
      borderRadius: 3,
      barPercentage: 0.78,
      categoryPercentage: 0.72,
    });
  }

  return {
    labels: plotted.map((l) => lineLabel(l, showVendor)),
    datasets,
  };
}

export function buildReductionChartOptions(plotted = [], { locked = false } = {}) {
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    layout: { padding: { right: 8 } },
    plugins: {
      legend: {
        display: true,
        position: "top",
        align: "end",
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
          label: (ctx) => {
            const v = ctx.raw;
            if (v == null) {
              return ctx.datasetIndex === 0
                ? "No price target was set"
                : "No revised price received";
            }
            return `${ctx.dataset.label}: ${Number(v).toFixed(1)}%`;
          },
          // The rupee context that the % axis deliberately leaves out.
          afterBody: (items) => {
            const line = plotted[items?.[0]?.dataIndex];
            if (!line) return [];
            if (locked) return ["Prices hidden — quotes are still sealed."];
            const out = [];
            out.push(`Baseline: ${formatMoney(line.baselineTotal)}`);
            if (line.baselineUnit != null) {
              out.push(`  ${formatMoney(line.baselineUnit)} / ${line.uom || "unit"}`);
            }
            if (line.hasNumericTarget && line.targetUnit != null) {
              out.push(`Target: ${formatMoney(line.targetUnit)} / ${line.uom || "unit"}`);
            } else {
              out.push("Target: none set");
            }
            out.push(
              line.responded
                ? `Achieved: ${formatMoney(line.achievedTotal)}`
                : "Achieved: no response"
            );
            if (line.savedValue != null) {
              out.push(`Saved: ${formatSignedMoney(line.savedValue)}`);
            }
            out.push(`Baseline source: ${baselineSourceLabel(line.baselineSource)}`);
            return out;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: "% reduction from baseline",
          color: CHART_COLORS.axis,
          font: { size: 10.5, weight: "600" },
        },
        grid: {
          // Zero is the meaningful line here (below it the price went UP), so
          // it gets --border-strong while the rest stay on the faint grid tint.
          color: (ctx) => (ctx.tick?.value === 0 ? CHART_COLORS.zeroLine : CHART_COLORS.grid),
        },
        ticks: {
          font: { size: 10 },
          color: CHART_COLORS.axis,
          callback: (v) => `${v}%`,
        },
      },
      y: {
        grid: { display: false },
        ticks: {
          font: { size: 10.5 },
          color: "#3f3f46",
          autoSkip: false,
          crossAlign: "far",
          callback(value) {
            const raw = this.getLabelForValue(value);
            return String(raw).length > 38 ? `${String(raw).slice(0, 37)}…` : raw;
          },
        },
      },
    },
  };
}

export default function ReductionChart({ lines = [], locked = false, respondedCount = 0 }) {
  const plan = useMemo(() => planReductionChart(lines), [lines]);
  const data = useMemo(
    () => buildReductionChartData(plan.plotted, { locked }),
    [plan.plotted, locked]
  );
  const options = useMemo(
    () => buildReductionChartOptions(plan.plotted, { locked }),
    [plan.plotted, locked]
  );

  if (plan.plotted.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "34px 20px" }} data-testid="reduction-chart-empty">
        <h2 style={{ fontSize: 15 }}>Nothing to plot</h2>
        <p>
          {lines.length === 0
            ? "This round has no priced lines."
            : "Every line on this round carries a non-price target only, so there is no % reduction to chart. The targets are listed in the table below."}
        </p>
      </div>
    );
  }

  const noAchievedSeries = data.datasets.length < 2;

  return (
    <div data-testid="reduction-chart">
      <div
        data-testid="reduction-chart-scroller"
        style={
          plan.needsScroll
            ? { maxHeight: SCROLL_MAX_HEIGHT, overflowY: "auto", overflowX: "hidden" }
            : undefined
        }
      >
        <div style={{ height: plan.height, minWidth: 0 }} data-testid="reduction-chart-canvas-wrap">
          <Bar data={data} options={options} />
        </div>
      </div>

      {noAchievedSeries && (
        <p className="help-text" style={{ marginTop: 10 }} data-testid="reduction-chart-note">
          {locked
            ? "Only the requested reduction is shown — vendor prices stay sealed until the submission deadline passes."
            : respondedCount === 0
            ? "No vendor has responded yet, so only the reduction you requested is plotted."
            : "No comparable revised price has been received yet, so only the requested reduction is plotted."}
        </p>
      )}

      {plan.truncated && (
        <p className="help-text" style={{ marginTop: 8 }} data-testid="reduction-chart-truncated">
          Showing the top {MAX_PLOTTED} lines by baseline value · +{plan.hiddenCount} more in the
          table below.
        </p>
      )}

      {plan.excludedCount > 0 && (
        <p className="help-text" style={{ marginTop: 6 }} data-testid="reduction-chart-excluded">
          {plan.excludedCount} line{plan.excludedCount === 1 ? " carries" : "s carry"} a non-price
          target (payment terms, documents, comments, delivery period) and cannot be expressed as a
          % reduction — see the chips in the table.
        </p>
      )}
    </div>
  );
}
