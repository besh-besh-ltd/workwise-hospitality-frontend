import React from "react";
import styles from "./QuoteCompareTables.module.scss";

const EmptyValue = ({ children = "--" }) => {
  return <span className={styles.empty}>{children}</span>;
};

export default EmptyValue;
