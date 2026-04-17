import React, { useEffect, useState, useRef } from "react";
import { getNegotiationSavings } from "@/services/dashboard";
import CardLoader from "./CardLoader";
import CardError from "./CardError";
import styles from "./NegotiationSavings.module.scss";

const formatCurrency = (value) => {
  if (!value || value === 0) return "₹0";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};

const NegotiationSavings = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getNegotiationSavings(filters);
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

  const baseline = data?.market_baseline || 0;
  const negotiated = data?.negotiated_total || 0;
  const savings = data?.total_savings || 0;
  const negotiatedPct = baseline > 0 ? Math.round((negotiated / baseline) * 100) : 0;
  const savedPct = baseline > 0 ? Math.round((savings / baseline) * 100) : 0;

  return (
    <div className={styles.savingsCard}>
      <div className={styles.decorativeBlur} />
      {loading && <CardLoader />}
      {error && !loading && <CardError onRetry={fetchData} />}
      <div className={styles.savingsContent}>
        <div className={styles.savingsHeader}>
          <div className={styles.headerLeft}>
            <h3 className={styles.headerTitle}>Negotiation Savings Achieved</h3>
            <p className={styles.headerSubtitle}>
              Direct value impact from strategic vendor negotiations.
            </p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.savingsAmount}>{formatCurrency(savings)}</div>
            <p className={styles.savingsLabel}>Total Saved</p>
          </div>
        </div>

        {baseline > 0 && savings > 0 ? (
          <>
            <div className={styles.comparisonBars}>
              <div className={styles.barGroup}>
                <div className={`${styles.barLabel} ${styles.baseline}`}>
                  <span>Market Baseline</span>
                  <span>{formatCurrency(baseline)}</span>
                </div>
                <div className={styles.barTrack}>
                  <div
                    className={`${styles.barFill} ${styles.grey}`}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div className={styles.barGroup}>
                <div className={`${styles.barLabel} ${styles.negotiated}`}>
                  <span>Negotiated Price</span>
                  <span>{formatCurrency(negotiated)}</span>
                </div>
                <div className={styles.barTrackLarge}>
                  <div
                    className={`${styles.barFill} ${styles.green}`}
                    style={{ width: `${negotiatedPct}%` }}
                  />
                  <div className={styles.savedSection}>
                    <span className={styles.savedText}>{savedPct}% SAVED</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={styles.subCards}>
              <div className={styles.subCard}>
                <p className={styles.subCardLabel}>Top Category Saving</p>
                <p className={styles.subCardValue}>
                  {data?.top_category_saving
                    ? `${data.top_category_saving.name} (${data.top_category_saving.percentage}%)`
                    : "–"}
                </p>
              </div>
              <div className={styles.subCard}>
                <p className={styles.subCardLabel}>Cost Avoidance</p>
                <p className={styles.subCardValue}>
                  {data?.cost_avoidance
                    ? `${formatCurrency(data.cost_avoidance)} prevented`
                    : "–"}
                </p>
              </div>
            </div>
          </>
        ) : (
          !loading && (
            <div className={styles.emptyState}>
              No price reductions recorded through negotiations in this period.
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default NegotiationSavings;
