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

  return (
    <div className={styles.conditionCard}>
      <div className={styles.conditionTopRow}>
        <div className={styles.conditionMetaRow}>
          <span className={styles.conditionLabel}>Current RFQ Condition</span>
          <div className={styles.lifecyclePill} style={{ background: pillConfig.gradient }}>
            <span className={styles.lifecycleDot} style={{ backgroundColor: pillConfig.dotColor }} />
            <span className={styles.lifecycleLabel} style={{ color: pillConfig.textColor }}>
              {pillConfig.label}
            </span>
            {lifecycleConfig && (
              <span className={styles.lifecycleSteps}>
                {LIFECYCLE_STAGES_ORDERED.map((key, index) => {
                  if (key === "TECHNICAL_REJECTED") return null;
                  const isOn = index <= currentStageIndex;
                  return (
                    <span
                      key={key}
                      className={`${styles.lifecycleStep} ${isOn ? styles.lifecycleStepOn : ""}`}
                      style={isOn ? { backgroundColor: pillConfig.dotColor } : undefined}
                    />
                  );
                })}
              </span>
            )}
          </div>
        </div>

        <div className={styles.conditionMetaRow}>
          {condition.owner && <span className={styles.conditionMetaChip}>{condition.owner}</span>}
        </div>
      </div>

      <div className={styles.conditionBody}>
        <span className={styles.conditionAccent} style={{ backgroundColor: tone.accent }} />
        <div className={styles.conditionTextWrap}>
          <p className={styles.conditionTitle}>{condition.label}</p>
          <p className={styles.conditionDescription}>{condition.blockerText}</p>
        </div>
      </div>
    </div>
  );
};

export default BuyerTechnicalEvaluationSection;
