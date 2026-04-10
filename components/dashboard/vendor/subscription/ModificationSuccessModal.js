import React from "react";
import styles from "./Subscription.module.css";

const ModificationSuccessModal = ({ data, onClose }) => {
  if (!data) return null;

  const isFree = !data.amount || data.amount === 0;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)", zIndex: 10000,
          animation: "fadeIn 0.3s ease"
        }}
      />
      <div
        className={styles.confirmModal}
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10001, maxWidth: "440px",
          animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <div className={styles.successIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h4 className={styles.successTitle}>
          {data.is_modification ? "Subscription Updated!" : "Subscription Renewed!"}
        </h4>
        <p className={styles.successText}>
          {isFree
            ? "Your subscription changes have been applied successfully."
            : "Your payment has been processed and subscription has been updated with newer items."}
        </p>

        <div className={styles.successDetails}>
          {data.expiry_date && (
            <div className={styles.successRow}>
              <span className={styles.successLabel}>Valid Until</span>
              <span className={styles.successValue}>{data.expiry_date}</span>
            </div>
          )}
          {!isFree && data.amount != null && (
            <div className={styles.successRow}>
              <span className={styles.successLabel}>Amount Paid</span>
              <span className={styles.successValue}>
                ₹{Number(data.amount).toLocaleString("en-IN")}
              </span>
            </div>
          )}
          {data.added_categories?.length > 0 && (
            <div className={styles.successRow}>
              <span className={styles.successLabel}>Added</span>
              <span className={styles.successValue}>
                {data.added_categories.join(", ")}
              </span>
            </div>
          )}
          {data.removed_categories?.length > 0 && (
            <div className={styles.successRow}>
              <span className={styles.successLabel}>Removed</span>
              <span className={styles.successValue}>
                {data.removed_categories.join(", ")}
              </span>
            </div>
          )}
          {data.categories?.length > 0 && (
            <div className={styles.successRow}>
              <span className={styles.successLabel}>Categories</span>
              <span className={styles.successValue}>
                {data.categories.join(", ")}
              </span>
            </div>
          )}
          {data.hotels?.length > 0 && (
            <div className={styles.successRow}>
              <span className={styles.successLabel}>Business Units</span>
              <span className={styles.successValue}>
                {data.hotels.join(", ")}
              </span>
            </div>
          )}
        </div>

        <button
          className={styles.btnGradient}
          onClick={onClose}
          style={{ width: "100%" }}
        >
          Continue
        </button>
      </div>
    </>
  );
};

export default ModificationSuccessModal;
