import React from "react";
import OverallCostMatrix from "@/components/dashboard/buyer/quoteCompare/tables/OverallCostMatrix";
import styles from "./QuoteCompareRevamp.module.scss";

const OverallCostTab = ({
  context,
  rfq,
  rfq_product_id,
  source,
  normalizeFilter,
  freightFilter,
  metrics,
}) => {
  const comparisonContext = context || {};
  const currentRfqId = rfq || comparisonContext?.rfq;
  const contextFilters = comparisonContext?.filters || {};
  const metricValues = metrics || comparisonContext?.metrics || {};

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
