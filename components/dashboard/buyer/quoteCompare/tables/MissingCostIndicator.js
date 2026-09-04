import React from "react";
import styles from "./QuoteCompareTables.module.scss";

const MissingCostIndicator = ({ parts = [] }) => {
  if (!parts || parts.length === 0) return null;

  return (
    <div className={styles.missing}>
      {parts.map((part) => (
        <span key={part} className={styles.missingLabel}>
          Missing {part}
        </span>
      ))}
    </div>
  );
};

export default MissingCostIndicator;
