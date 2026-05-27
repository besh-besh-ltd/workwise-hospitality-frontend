import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { getSmartInsightsData } from "@/services/dashboard";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import styles from "./SmartInsights.module.scss";

const INSIGHT_META = {
  price_alert: {
    icon: AlertTriangle,
    badge: "Action needed",
  },
  vendor_optimization: {
    icon: ShieldCheck,
    badge: "Saving opportunity",
  },
  spend_trend: {
    icon: TrendingUp,
    badge: "Trend",
  },
  general: {
    icon: Lightbulb,
    badge: "Insight",
  },
};

const pickTrendIcon = (insight) => {
  if (insight.type !== "spend_trend") return null;
  const text = `${insight.title || ""} ${insight.description || ""}`.toLowerCase();
  if (/decreas|drop|down|reduc|saved|lower/.test(text)) return TrendingDown;
  if (/increas|up|higher|grew|grow|spike/.test(text)) return TrendingUp;
  return TrendingUp;
};

const SmartInsights = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await getSmartInsightsData(filters);
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

  const insights = data?.insights || [];

  return (
    <PersonaCardShell
      title="Smart insights"
      icon={Sparkles}
      tooltip="AI-generated price alerts, vendor optimisation tips and spend trends."
      loading={loading}
      error={error}
      isEmpty={insights.length === 0}
      renderEmpty={() => (
        <div className={styles.emptyState}>
          No insights available for the selected period.
        </div>
      )}
      onRefresh={() => {
        setLoading(true);
        fetchData();
      }}
    >
      <div className={styles.insightsBody}>
        {insights.map((insight, index) => {
          const meta = INSIGHT_META[insight.type] || INSIGHT_META.general;
          const typeClass = styles[insight.type] || styles.general;
          const trendIcon = pickTrendIcon(insight);
          const IconComponent = trendIcon || meta.icon;

          return (
            <div key={index} className={`${styles.insightCard} ${typeClass}`}>
              <div className={styles.iconChip}>
                <IconComponent size={15} strokeWidth={2.4} />
              </div>
              <div className={styles.insightBody}>
                <div className={styles.insightHead}>
                  <p className={styles.insightTitle}>{insight.title}</p>
                </div>
                <p
                  className={styles.insightDescription}
                  dangerouslySetInnerHTML={{ __html: insight.description }}
                />
                {insight.action_label && insight.action_url && (
                  <Link href={insight.action_url} className={styles.actionCta}>
                    <span>{insight.action_label}</span>
                    <ArrowRight size={11} strokeWidth={2.4} />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </PersonaCardShell>
  );
};

export default SmartInsights;
