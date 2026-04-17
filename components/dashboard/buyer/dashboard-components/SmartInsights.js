import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { TrendingUp, ShieldCheck, AlertCircle, Lightbulb } from "lucide-react";
import { getSmartInsightsData } from "@/services/dashboard";
import CardLoader from "./CardLoader";
import CardError from "./CardError";
import FullLoader from "@/components/shared/FullLoader";
import styles from "./SmartInsights.module.scss";

const INSIGHT_ICONS = {
  price_alert: AlertCircle,
  vendor_optimization: ShieldCheck,
  spend_trend: TrendingUp,
  general: Lightbulb,
};

const SmartInsights = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getSmartInsightsData(filters);
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

  const insights = data?.insights || [];

  return (
    <div className={styles.insightsSection}>
      <p className={styles.sectionLabel}>Smart Insights</p>

      <div className={styles.insightsBody}>
        {loading && <CardLoader />}
        {error && !loading && <CardError onRetry={fetchData} inline />}
        {insights.length > 0 ? (
          insights.map((insight, index) => {
          const IconComponent = INSIGHT_ICONS[insight.type] || Lightbulb;
          const typeClass = styles[insight.type] || styles.general;

          return (
            <div
              key={index}
              className={`${styles.insightCard} ${typeClass}`}
            >
              <div className={`${styles.insightIcon} ${typeClass}`}>
                <IconComponent size={20} />
              </div>
              <div className={styles.insightBody}>
                <p className={styles.insightTitle}>{insight.title}</p>
                <p
                  className={styles.insightDescription}
                  dangerouslySetInnerHTML={{ __html: insight.description }}
                />
                {insight.action_label && insight.action_url && (
                  <Link href={insight.action_url} className={styles.insightAction}>
                    {insight.action_label}
                  </Link>
                )}
              </div>
            </div>
          );
        })
        ) : (
          !loading && (
            <div className={styles.emptyState}>
              No insights available for the selected period.
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SmartInsights;
