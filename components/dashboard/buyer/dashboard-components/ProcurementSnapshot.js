import React, { useEffect, useState, useRef, useCallback } from "react";
import { BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { getProcurementSnapshot } from "@/services/dashboard";
import CardTooltip from "./CardTooltip";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import styles from "./ProcurementSnapshot.module.scss";

const formatCurrency = (value) => {
  if (!value || value === 0) return "₹0";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
};

const METRICS = [
  { key: "total_rfqs",      label: "Total RFQs",      tooltip: "Total number of RFQs created in the selected period", format: (v) => v ?? 0, trendKind: "neutral" },
  { key: "active_tenders",  label: "Active tenders",  tooltip: "Currently live tenders open for vendor bidding",       format: (v) => v ?? 0, trendKind: "neutral" },
  { key: "pos_issued",      label: "POs issued",      tooltip: "Purchase orders created in the selected period",      format: (v) => v ?? 0, trendKind: "neutral" },
  { key: "total_spend",     label: "Total spend",     tooltip: "Sum of all approved PO values including taxes",       format: formatCurrency, highlighted: true, trendKind: "spend" },
  { key: "avg_turnaround",  label: "Avg turnaround",  tooltip: "Avg days from RFQ publish to finalisation",            format: (v) => v ? `${parseFloat(v).toFixed(1)}d` : "0d", trendKind: "lower-better" },
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
    intervalRef.current = setInterval(fetchData, 20000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.hotel_ids, filters.start_date, filters.end_date, filters._refresh]);

  return (
    <PersonaCardShell
      title="Procurement snapshot"
      icon={BarChart3}
      tooltip="Headline counts and spend across the selected business units and period."
      loading={loading}
      error={error}
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
            >
              <div className={styles.metricLabel}>
                {metric.label}
                <CardTooltip text={metric.tooltip} />
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
    </PersonaCardShell>
  );
};

export default ProcurementSnapshot;
