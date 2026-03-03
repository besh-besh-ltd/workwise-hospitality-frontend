import React from "react";
import { addCommasToNumber } from "@/utils/sharedFunctions";
import styles from "./QuoteCompareRevamp.module.scss";

const formatCurrency = (value) => `Rs. ${addCommasToNumber(Math.round(value || 0))}`;

const QuoteCompareKpiStrip = ({ metrics = {} }) => {
  const cards = [
    {
      label: "L1 Total",
      value: formatCurrency(metrics.l1Total),
      sub: "Lowest quote per product",
    },
    {
      label: "Finalized Total",
      value: formatCurrency(metrics.finalizedTotal),
      sub: "Selected vendors combined",
    },
    {
      label: "Baseline Total",
      value: formatCurrency(metrics.baselineTotal),
      sub: "Last purchase/quote reference",
    },
    {
      label: "Potential Savings",
      value: formatCurrency(metrics.savings),
      sub: metrics.savings >= 0 ? "Vs baseline" : "Higher than baseline",
    },
    {
      label: "Risk Flags",
      value: `${metrics.missingCostQuotes || 0} incomplete quotes`,
      sub: `${metrics.regretsCount || 0} regrets`,
    },
    {
      label: "Coverage",
      value: `${metrics.vendorsCount || 0} vendors`,
      sub: `${metrics.productsCount || 0} products`,
    },
  ];

  return (
    <div className={styles.kpiGrid}>
      {cards.map((card) => (
        <div className={styles.kpiCard} key={card.label}>
          <span className={styles.kpiLabel}>{card.label}</span>
          <div className={styles.kpiValue}>{card.value}</div>
          <div className={styles.kpiSub}>{card.sub}</div>
        </div>
      ))}
    </div>
  );
};

export default QuoteCompareKpiStrip;
