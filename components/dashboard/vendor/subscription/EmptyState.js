import React from "react";
import { FiPackage } from "react-icons/fi";
import styles from "./Subscription.module.css";

const EmptyState = () => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <FiPackage />
      </div>
      <h3 className={styles.emptyTitle}>No Active Subscription</h3>
      <p className={styles.emptyText}>
        Please contact support to set up your hospitality vendor subscription.
      </p>
    </div>
  );
};

export default EmptyState;
