import React, { useEffect, useState, useRef, useCallback } from "react";
import { BarChart3, ArrowUpRight, ArrowDownRight, PieChart } from "lucide-react";
import { getProcurementSnapshot } from "@/services/dashboard";
import InfoTip from "@/components/shared/InfoTip";
import SpendBreakupModal from "./SpendBreakupModal";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonKpiGrid, DASHBOARD_POLL_MS } from "@/components/dashboard/shared";
import styles from "./ProcurementSnapshot.module.scss";

// Trim trailing zeros from a fixed-decimal string: "19.50"→"19.5", "20.00"→"20".
const trimZeros = (s) => s.replace(/\.?0+$/, "");
const formatCurrency = (value) => {
  if (!value || value === 0) return "₹0";
  if (value >= 10000000) return `₹${trimZeros((value / 10000000).toFixed(2))}Cr`;
  if (value >= 100000) return `₹${trimZeros((value / 100000).toFixed(2))}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
};

// `accent` drives each card's top-bar colour. The four context cards share one
// deep, muted green accent (rendered at low opacity, see scss) — subtle and easy
// on the eye; Total spend uses a brighter green at full opacity + green tint so
// it still stands out as the headline figure.
const CARD_ACCENT = "#166534"; // deep muted green for context cards
const METRICS = [
  { key: "active_rfqs",     label: "Active RFQs",     tooltip: "Currently live, published RFQs open for vendor bidding", format: (v) => v ?? 0, trendKind: "neutral", accent: CARD_ACCENT },
  { key: "closed_rfqs",     label: "Closed RFQs",     tooltip: "RFQs closed in the selected period",                   format: (v) => v ?? 0, trendKind: "neutral", accent: CARD_ACCENT },
  { key: "pos_issued",      label: "POs issued against RFQs", tooltip: "Purchase orders created in the selected period", format: (v) => v ?? 0, trendKind: "neutral", accent: CARD_ACCENT },
  { key: "total_spend",     label: "Total spend",     tooltip: "Sum of all approved PO values including taxes",       format: formatCurrency, highlighted: true, trendKind: "spend", accent: "#15803d" },
  { key: "avg_turnaround",  label: "Average Turnaround Time", tooltip: "Avg days from RFQ publish to finalisation",     format: (v) => v ? `${parseFloat(v).toFixed(1)} Days` : "0 Days", trendKind: "lower-better", accent: CARD_ACCENT },
];

// Compute % change from first non-zero sparkline point to the last value.
// Returns { delta: signed percentage, sentiment: 'good' | 'bad' | 'neutral' }.
const computeTrend = (sparklineData, trendKind) => {
  if (!sparklineData || sparklineData.length < 2) return null;
  const last = sparklineData[sparklineData.length - 1];
  const first = sparklineData.find((v) => v > 0);
  if (!first || first === 0) return null;
  const delta = ((last - first) / first) * 100;
  if (Math.abs(delta) < 1) return null;
  let sentiment = "neutral";
  if (trendKind === "lower-better") {
    sentiment = delta < 0 ? "good" : "bad";
  } else if (trendKind === "spend") {
    sentiment = delta > 0 ? "good" : "bad";
  }
  return { delta, sentiment };
};

const ProcurementSnapshot = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBreakup, setShowBreakup] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await getProcurementSnapshot(filters);
      setData(res.data);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    intervalRef.current = setInterval(fetchData, DASHBOARD_POLL_MS);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.hotel_ids, filters.start_date, filters.end_date, filters._refresh]);

  return (
    <PersonaCardShell
      title="Procurement (Products & Services) snapshot"
      icon={BarChart3}
      tooltip="Headline counts and spend across the selected business units and period."
      loading={loading}
      error={error}
      skeleton={<SkeletonKpiGrid count={METRICS.length} />}
      onRefresh={() => {
        setLoading(true);
        fetchData();
      }}
    >
      <div className={styles.snapshotGrid}>
        {METRICS.map((metric) => {
          const value = data?.[metric.key];
          const sparklineData = data?.sparklines?.[metric.key] || [];
          const maxSpark = Math.max(...sparklineData, 1);
          const trend = computeTrend(sparklineData, metric.trendKind);
          const TrendIcon = trend && trend.delta >= 0 ? ArrowUpRight : ArrowDownRight;

          return (
            <div
              key={metric.key}
              className={`${styles.metricItem} ${metric.highlighted ? styles.highlighted : ""}`}
              style={{ "--metric-accent": metric.accent }}
            >
              <div className={styles.metricLabel}>
                {metric.label}
                <InfoTip text={metric.tooltip} />
              </div>
              <div className={styles.metricValueRow}>
                <div className={styles.metricValue}>
                  {loading ? "–" : metric.format(value)}
                </div>
                {trend && !loading && (
                  <span className={`${styles.trendChip} ${styles[trend.sentiment]}`}>
                    <TrendIcon size={9} strokeWidth={2.6} />
                    {Math.abs(trend.delta).toFixed(0)}%
                  </span>
                )}
                {metric.key === "total_spend" && !loading && data?.spend_breakup && (
                  <button
                    type="button"
                    className={styles.breakupBtn}
                    onClick={() => setShowBreakup(true)}
                  >
                    <PieChart size={11} strokeWidth={2.4} />
                    Breakup
                  </button>
                )}
              </div>
              {sparklineData.length > 0 && (
                <div className={styles.sparkline}>
                  {sparklineData.map((val, i) => (
                    <div
                      key={i}
                      className={`${styles.sparkBar} ${i === sparklineData.length - 1 ? styles.active : ""}`}
                      style={{ height: `${Math.max((val / maxSpark) * 100, 8)}%` }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showBreakup && data?.spend_breakup && (
        <SpendBreakupModal
          breakup={data.spend_breakup}
          posIssued={data.pos_issued}
          onClose={() => setShowBreakup(false)}
        />
      )}
    </PersonaCardShell>
  );
};

export default ProcurementSnapshot;
