import React from "react";
import styles from "./HospitalityManager.module.css";

const EmptyState = ({ icon, title, description, buttonText, onButtonClick }) => {
  return (
    <div className={styles.emptyState}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <h3 className={styles.emptyTitle}>{title}</h3>
      {description && <p className={styles.emptyDescription}>{description}</p>}
      {buttonText && onButtonClick && (
        <button type="button" className={styles.primaryBtn} onClick={onButtonClick}>
          {buttonText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
