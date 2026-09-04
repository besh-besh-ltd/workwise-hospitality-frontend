import React from "react";
import styles from "./QuoteCompareTables.module.scss";

const RegretStateCell = ({ reason = "Not provided" }) => {
  return (
    <div className={styles.regretCell}>
      <div className={styles.value}>Regret</div>
      <div className={styles.valueSub}>{reason}</div>
    </div>
  );
};

export default RegretStateCell;
