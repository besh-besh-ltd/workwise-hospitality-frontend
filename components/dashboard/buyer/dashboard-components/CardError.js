import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import styles from "./CardError.module.scss";

const CardError = ({ onRetry, inline }) => {
  if (inline) {
    return (
      <div className={styles.inlineBar}>
        <AlertCircle size={14} />
        <span className={styles.inlineText}>Couldn't load this data</span>
        <button className={styles.inlineRetry} onClick={onRetry}>
          <RefreshCw size={11} />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <div className={styles.iconWrap}>
          <AlertCircle size={18} />
        </div>
        <p className={styles.message}>Couldn't load this data</p>
        <button className={styles.retryBtn} onClick={onRetry}>
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>
    </div>
  );
};

export default CardError;
