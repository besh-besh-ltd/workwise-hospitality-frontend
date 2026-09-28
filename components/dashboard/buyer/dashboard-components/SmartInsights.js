import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  Target,
  ArrowRight,
} from "lucide-react";
import { getSmartInsightsData } from "@/services/dashboard";
import { rfqList, poList, reports } from "@/components/dashboard/shared/dashboardLinks";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import styles from "./SmartInsights.module.scss";

const INSIGHT_META = {
  benchmark_alert: {
    icon: Target,
    badge: "Above benchmark",
  },
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

/**
 * The backend names a destination ({type, params}); the URL is built here
 * through the one link builder, so an insight can never point at a page that
 * doesn't exist. Unknown types render no button rather than a broken link.
 */
const ACTION_BUILDERS = {
  rfqList: (p = {}) => rfqList({ search: p.search }),
  poList: (p = {}) => poList({ search: p.search }),
  reports: () => reports(),
};
export const resolveInsightAction = (action) => {
  const build = action && ACTION_BUILDERS[action.type];
  return build ? build(action.params || {}) : null;
};

const pickTrendIcon = (insight) => {
  if (insight.type !== "spend_trend") return null;
  return /decreas/i.test(insight.title || "") ? TrendingDown : TrendingUp;
};

const SmartInsights = ({ filters }) => {
  const { data, loading, error, stale, refetch } = useDashboardQuery(getSmartInsightsData, filters);

  const insights = data?.insights || [];

  return (
    <PersonaCardShell
      title="Insights"
      icon={Lightbulb}
      tooltip="Rule-based highlights from your own data: items bought above their best price, quotes above your usual price, the best-priced vendor and the spend trend — each linked to where to act."
      loading={loading}
      error={error}
      stale={stale}
      isEmpty={insights.length === 0}
      skeleton={<SkeletonRankList rows={4} />}
      renderEmpty={() => (
        <div className={styles.emptyState}>
          Nothing stands out in the selected period.
        </div>
      )}
      onRefresh={refetch}
    >
      <div className={styles.insightsBody}>
        {insights.map((insight, index) => {
          const meta = INSIGHT_META[insight.type] || INSIGHT_META.general;
          const typeClass = styles[insight.type] || styles.general;
          const IconComponent = pickTrendIcon(insight) || meta.icon;
          const href = resolveInsightAction(insight.action);
          const details = Array.isArray(insight.details) ? insight.details : [];

          return (
            <div key={index} className={`${styles.insightCard} ${typeClass}`}>
              <div className={styles.iconChip} aria-hidden="true">
                <IconComponent size={15} strokeWidth={2.4} />
              </div>
              <div className={styles.insightBody}>
                <div className={styles.insightHead}>
                  <p className={styles.insightTitle}>{insight.title}</p>
                  <span className={styles.badge}>{meta.badge}</span>
                </div>
                {insight.description && (
                  <p className={styles.insightDescription}>{insight.description}</p>
                )}
                {details.length > 0 && (
                  <dl className={styles.details}>
                    {details.map((d, i) => (
                      <div key={i}>
                        <dt>{d.label}</dt>
                        <dd>{d.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {insight.action_label && href && (
                  <Link href={href} className={styles.actionCta}>
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
