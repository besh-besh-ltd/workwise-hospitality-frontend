import React, { useEffect, useState, useRef } from "react";
import { getProcurementSnapshot } from "@/services/dashboard";
import CardError from "./CardError";
import CardTooltip from "./CardTooltip";
import styles from "./ProcurementSnapshot.module.scss";

const formatCurrency = (value) => {
  if (!value || value === 0) return "₹0";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toLocaleString("en-IN")}`;
};

const METRICS = [
  { key: "total_rfqs", label: "Total RFQs", tooltip: "Total number of RFQs created in the selected period", format: (v) => v ?? 0 },
  { key: "active_tenders", label: "Active Tenders", tooltip: "Currently live tenders open for vendor bidding", format: (v) => v ?? 0 },
  { key: "pos_issued", label: "POs Issued", tooltip: "Purchase orders created in the selected period", format: (v) => v ?? 0 },
  { key: "total_spend", label: "Total Spend", tooltip: "Sum of all approved PO values including taxes and charges", format: formatCurrency, highlighted: true },
  { key: "avg_turnaround", label: "Avg. Turnaround", tooltip: "Average days from RFQ publish to vendor finalization", format: (v) => v ? `${parseFloat(v).toFixed(1)}d` : "0d" },
];

const ProcurementSnapshot = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getProcurementSnapshot(filters);
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 20000);
    return () => clearInterval(intervalRef.current);
  }, [filters.hotel_ids, filters.start_date, filters.end_date, filters._refresh]);

  return (
    <section className={styles.actionSection}>
      {error && <CardError onRetry={fetchData} inline />}
      <div className={styles.snapshotGrid}>
      {METRICS.map((metric) => {
        const value = data?.[metric.key];
        const sparklineData = data?.sparklines?.[metric.key] || [];
        const maxSpark = Math.max(...sparklineData, 1);

        return (
          <div
            key={metric.key}
            className={`${styles.metricCard} ${metric.highlighted ? styles.highlighted : ""}`}
          >
            <p className={styles.metricLabel}>
              {metric.label}
              <CardTooltip text={metric.tooltip} />
            </p>
            <span className={styles.metricValue}>
              {loading ? "–" : metric.format(value)}
            </span>

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
    </section>
  );
};

export default ProcurementSnapshot;
