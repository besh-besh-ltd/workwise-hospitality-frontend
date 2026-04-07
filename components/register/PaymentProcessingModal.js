import React from "react";
import styles from "./Register.module.css";

const PaymentProcessingModal = ({
  show,
  title = "Payment is processing...",
  description = "Please do not refresh while we confirm your payment and activate your subscription.",
}) => {
  if (!show) return null;

  return (
    <div className={styles.processingOverlay}>
      <div className={styles.processingCard} role="status" aria-live="polite" aria-busy="true">
        <div className={styles.processingBadge}>
          <span className={styles.processingBadgeDot} />
          Secure payment verification
        </div>
        <div className={styles.processingSpinner} aria-hidden="true">
          <span />
        </div>
        <h3 className={styles.processingTitle}>{title}</h3>
        <p className={styles.processingText}>{description}</p>
        <div className={styles.processingFootnote}>Confirming payment details with Razorpay and activating your subscription.</div>
      </div>
    </div>
  );
};

export default PaymentProcessingModal;
