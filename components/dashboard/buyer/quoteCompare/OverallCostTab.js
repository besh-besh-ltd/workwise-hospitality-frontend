import React from "react";
import OverallCostMatrix from "@/components/dashboard/buyer/quoteCompare/tables/OverallCostMatrix";
import QuoteVisibilityLockPanel from "@/components/dashboard/buyer/quoteCompare/QuoteVisibilityLockPanel";
import styles from "./QuoteCompareRevamp.module.scss";

const OverallCostTab = ({
  context,
  rfq,
  rfq_product_id,
  source,
  normalizeFilter,
  freightFilter,
  metrics,
  quoteVisibility,
}) => {
  const comparisonContext = context || {};
  const currentRfqId = rfq || comparisonContext?.rfq;
  const contextFilters = comparisonContext?.filters || {};
  const metricValues = metrics || comparisonContext?.metrics || {};
  const visibility = quoteVisibility || comparisonContext?.quoteVisibility || null;

  if (visibility?.locked) {
    return (
      <div className={styles.sectionCardFlush}>
        <QuoteVisibilityLockPanel
          title="Overall Cost Comparison Unlocks After Deadline"
          message="Overall cost analysis, L1 totals, and vendor cost ladders remain hidden until the quote submission deadline has fully passed in IST."
          deadline={visibility.deadline}
          remainingMs={visibility.remainingMs}
        />
      </div>
    );
  }

  return (
    <div className={styles.sectionCardFlush}>
      <OverallCostMatrix
        rfq_id={currentRfqId}
        rfq_product_id={rfq_product_id}
        source={source}
        normalizeFilter={normalizeFilter ?? contextFilters.normalizeFilter}
        freightFilter={freightFilter ?? contextFilters.freightFilter}
        metrics={metricValues}
      />
    </div>
  );
};

export default OverallCostTab;
