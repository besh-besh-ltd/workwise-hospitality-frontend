import React from "react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import styles from "./PersonaCard.module.scss";

/**
 * Reusable throughput display body — used by *_throughput widgets.
 *
 * data shape:
 *   {
 *     current_period_avg_hours: number,
 *     prior_period_avg_hours: number,
 *     delta_pct: number,         // -ve = faster (good), +ve = slower (bad)
 *     unit: "hours" | "days",
 *     sparkline: number[]        // last 4 weeks (or N points)
 *   }
 */
const ThroughputBody = ({ data }) => {
  const unit = data?.unit || "hrs";
  const current = data?.current_period_avg ?? data?.current_period_avg_hours ?? 0;
  const prior = data?.prior_period_avg ?? data?.prior_period_avg_hours ?? null;
  const delta = data?.delta_pct;

  let deltaClass = styles.deltaFlat;
  let DeltaIcon = Minus;
  let deltaLabel = "—";
  if (typeof delta === "number") {
    if (delta < -1) {
      deltaClass = styles.deltaDown; // faster — green
      DeltaIcon = TrendingDown;
      deltaLabel = `${Math.abs(delta).toFixed(0)}% faster`;
    } else if (delta > 1) {
      deltaClass = styles.deltaUp; // slower — red
      DeltaIcon = TrendingUp;
      deltaLabel = `${Math.abs(delta).toFixed(0)}% slower`;
    } else {
      deltaLabel = "Same as last period";
    }
  }

  return (
    <>
      <div className={styles.throughputBlock}>
        <div className={styles.throughputCurrent}>
          <div className={styles.throughputLbl}>This period · avg</div>
          <div>
            <span className={styles.throughputNum}>
              {Number(current).toFixed(1)}
            </span>
            <span className={styles.throughputUnit}>{unit}</span>
          </div>
          {prior != null && (
            <div className={styles.subline}>
              Prior:{" "}
              <span className={styles.subValue}>
                {Number(prior).toFixed(1)} {unit}
              </span>
            </div>
          )}
        </div>
        <span className={`${styles.deltaChip} ${deltaClass}`}>
          <DeltaIcon size={12} />
          {deltaLabel}
        </span>
      </div>
      {Array.isArray(data?.sparkline) && data.sparkline.length > 1 && (
        <Sparkline points={data.sparkline} />
      )}
    </>
  );
};

const Sparkline = ({ points }) => {
  const w = 200;
  const h = 36;
  const padding = 2;
  if (!points || points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = (w - padding * 2) / (points.length - 1);
  const coords = points.map((v, i) => [
    padding + i * step,
    h - padding - ((v - min) / range) * (h - padding * 2),
  ]);
  const pathD = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const areaD = `${pathD} L${coords[coords.length - 1][0].toFixed(1)},${h} L${coords[0][0].toFixed(1)},${h} Z`;
  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path className={styles.sparklineArea} d={areaD} />
      <path className={styles.sparklinePath} d={pathD} />
    </svg>
  );
};

export default ThroughputBody;
