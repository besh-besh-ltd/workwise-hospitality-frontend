import React from "react";
import styles from "./QuoteCompareRevamp.module.scss";

const ComparisonTabs = ({ activeTab, onChange }) => {
  const tabs = [
    { key: "product", label: "Product Wise Comparison" },
    { key: "category", label: "Category Wise Comparison" },
    { key: "cost", label: "Overall Cost Comparison" },
  ];

  return (
    <div className={styles.tabs} role="tablist" aria-label="Quote comparison tabs">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${styles.tabButton} ${isActive ? styles.tabButtonActive : ""}`}
            onClick={() => onChange(tab.key)}
            id={`${tab.key}_tab-quote_tabs-quote_compare_page`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default ComparisonTabs;
