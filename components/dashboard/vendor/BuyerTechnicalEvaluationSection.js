import React, { useMemo } from "react";
import {
  buildBuyerTechEvalOverview,
  buildRfqConditionSummary
} from "./technicalEvaluationHelpers";
import {
  getLifecycleConfig,
  LIFECYCLE_STAGES_ORDERED
} from "@/components/dashboard/buyer/manageRFQ/RFQCard/statusConfig";
import styles from "./ViewRfqTechnicalStatus.module.scss";

const toneMap = {
  neutral: {
    background: "#f8fafc",
    border: "#e2e8f0",
    accent: "#64748b",
    text: "#0f172a"
  },
  info: {
    background: "#f0f9ff",
    border: "#bae6fd",
    accent: "#0284c7",
    text: "#0c4a6e"
  },
  warning: {
    background: "#fff7ed",
    border: "#fed7aa",
    accent: "#ea580c",
    text: "#9a3412"
  },
  danger: {
    background: "#fef2f2",
    border: "#fecaca",
    accent: "#dc2626",
    text: "#991b1b"
  },
  primary: {
    background: "#eef2ff",
    border: "#c7d2fe",
    accent: "#4f46e5",
    text: "#3730a3"
  },
  accent: {
    background: "#fdf4ff",
    border: "#f5d0fe",
    accent: "#c026d3",
    text: "#86198f"
  },
  success: {
    background: "#f0fdf4",
    border: "#bbf7d0",
    accent: "#16a34a",
    text: "#166534"
  }
};

const BuyerTechnicalEvaluationSection = ({
  rfqDetails,
  products = [],
  techEvalStatusByProduct = {}
}) => {
  const normalizedProducts = useMemo(
    () => products.map((product) => ({
      ...product,
      technical_evaluators: rfqDetails?.technical_evaluators || []
    })),
    [products, rfqDetails?.technical_evaluators]
  );

  const overview = useMemo(
    () => buildBuyerTechEvalOverview(normalizedProducts, techEvalStatusByProduct),
    [normalizedProducts, techEvalStatusByProduct]
  );

  const condition = useMemo(
    () => buildRfqConditionSummary(rfqDetails, overview),
    [rfqDetails, overview]
  );

  if (!overview.products.length && !rfqDetails?.lifecycle_stage) {
    return null;
  }

  const tone = toneMap[condition.tone] || toneMap.neutral;
  const lifecycleConfig = rfqDetails?.lifecycle_stage ? getLifecycleConfig(rfqDetails.lifecycle_stage) : null;
  const currentStageIndex = rfqDetails?.lifecycle_stage
    ? LIFECYCLE_STAGES_ORDERED.indexOf(rfqDetails.lifecycle_stage)
    : -1;
  const pillConfig = lifecycleConfig || {
    gradient: `linear-gradient(135deg, ${tone.background} 0%, #ffffff 100%)`,
    dotColor: tone.accent,
    textColor: tone.text,
    label: condition.label
  };
  const counters = overview.counters || {};

  return (
    <div className={styles.conditionCard}>
      {/* Dark left accent bar */}
      <span className={styles.conditionCardAccent} style={{ backgroundColor: tone.accent }} />

      <div className={styles.conditionCardInner}>
        {/* Header row */}
        <div className={styles.conditionTopRow}>
          <div className={styles.conditionMetaRow}>
            <span className={styles.conditionLabel}>Technical Evaluation Overview</span>
          </div>

          <div className={styles.conditionMetaRow}>
            {condition.owner && <span className={styles.conditionMetaChip}>{condition.owner}</span>}
          </div>
        </div>

        {/* Stats row */}
        {counters.totalProducts > 0 && (
          <div className={styles.conditionStatsRow}>
            <div className={styles.conditionStatItem}>
              <span className={styles.conditionStatValue}>{counters.totalProducts}</span>
              <span className={styles.conditionStatLabel}>Total Products</span>
            </div>
            <div className={styles.conditionStatItem} style={{ borderColor: "rgba(34,197,94,0.25)" }}>
              <span className={styles.conditionStatValue} style={{ color: "#166534" }}>{counters.completedProducts}</span>
              <span className={styles.conditionStatLabel} style={{ color: "#16a34a" }}>Completed</span>
            </div>
            <div className={styles.conditionStatItem} style={{ borderColor: "rgba(234,179,8,0.25)" }}>
              <span className={styles.conditionStatValue} style={{ color: "#854d0e" }}>{counters.pendingProducts}</span>
              <span className={styles.conditionStatLabel} style={{ color: "#a16207" }}>In Progress</span>
            </div>
            {counters.totalCleared > 0 && (
              <div className={styles.conditionStatItem} style={{ borderColor: "rgba(34,197,94,0.25)", background: "rgba(34,197,94,0.04)" }}>
                <span className={styles.conditionStatValue} style={{ color: "#166534" }}>{counters.totalCleared}</span>
                <span className={styles.conditionStatLabel} style={{ color: "#16a34a" }}>Vendors Cleared</span>
              </div>
            )}
            {counters.totalRejected > 0 && (
              <div className={styles.conditionStatItem} style={{ borderColor: "rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.04)" }}>
                <span className={styles.conditionStatValue} style={{ color: "#991b1b" }}>{counters.totalRejected}</span>
                <span className={styles.conditionStatLabel} style={{ color: "#dc2626" }}>Vendors Rejected</span>
              </div>
            )}
          </div>
        )}

        {/* Blocker / description row */}
        <div className={styles.conditionBody}>
          <div className={styles.conditionTextWrap}>
            <p className={styles.conditionTitle} style={{ color: tone.text }}>{condition.label}</p>
            <p className={styles.conditionDescription}>{condition.blockerText}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerTechnicalEvaluationSection;
