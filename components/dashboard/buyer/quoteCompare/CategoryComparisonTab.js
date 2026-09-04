import React from "react";
import CategoryComparisonMatrix from "@/components/dashboard/buyer/quoteCompare/tables/CategoryComparisonMatrix";
import QuoteVisibilityLockPanel from "@/components/dashboard/buyer/quoteCompare/QuoteVisibilityLockPanel";
import styles from "./QuoteCompareRevamp.module.scss";

const CategoryComparisonTab = ({
  context,
  rfq,
  rfq_product_id,
  source,
  TA_Filter,
  normalizeFilter,
  freightFilter,
  productNegotiationData,
  quoteVisibility,
}) => {
  const comparisonContext = context || {};
  const currentRfqId = rfq || comparisonContext?.rfq;
  const contextFilters = comparisonContext?.filters || {};
  const negotiationsMap = productNegotiationData || comparisonContext?.maps?.productNegotiationData || {};
  const visibility = quoteVisibility || comparisonContext?.quoteVisibility || null;

  if (visibility?.locked) {
    return (
      <div className={styles.sectionCardFlush}>
        <QuoteVisibilityLockPanel
          title="Category Comparison Unlocks After Deadline"
          message="Category totals and vendor rankings stay hidden until the quote submission deadline has fully passed in IST."
          deadline={visibility.deadline}
          remainingMs={visibility.remainingMs}
        />
      </div>
    );
  }

  return (
    <div className={styles.sectionCardFlush}>
      <CategoryComparisonMatrix
        rfq_id={currentRfqId}
        rfq_product_id={rfq_product_id}
        source={source}
        TA_Filter={TA_Filter ?? contextFilters.TA_Filter}
        normalizeFilter={normalizeFilter ?? contextFilters.normalizeFilter}
        freightFilter={freightFilter ?? contextFilters.freightFilter}
        productNegotiationData={negotiationsMap}
      />
    </div>
  );
};

export default CategoryComparisonTab;
