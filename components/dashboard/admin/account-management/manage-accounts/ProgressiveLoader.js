import React from "react";
import { BsCheckCircleFill, BsCircle } from "react-icons/bs";
import styles from "./ManageAccounts.module.scss";

const ProgressiveLoader = ({ steps = [] }) => {
  return (
    <div className={styles.progressiveLoaderWrap}>
      <div className={styles.progressiveLoaderCard}>
        <h4 className={styles.progressiveLoaderTitle}>Loading user data...</h4>
        {steps.map((step, i) => (
          <div key={i} className={styles.loadingStep}>
            <div className={styles.stepIcon}>
              {step.status === "complete" ? (
                <BsCheckCircleFill size={18} className={styles.stepIconComplete} />
              ) : step.status === "active" ? (
                <div className={styles.miniSpinner} />
              ) : (
                <BsCircle size={16} className={styles.stepIconPending} />
              )}
            </div>
            <span
              className={`${styles.stepText} ${
                step.status === "complete"
                  ? styles.stepTextComplete
                  : step.status === "active"
                  ? styles.stepTextActive
                  : ""
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressiveLoader;
