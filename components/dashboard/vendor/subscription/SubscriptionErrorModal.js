import React from "react";
import styles from "./Subscription.module.css";

const SubscriptionErrorModal = ({ onClose }) => {
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
        <div
          className={styles.successIcon}
          style={{
            background: "linear-gradient(135deg, #dc2626, #991b1b)"
          }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
               stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>

        <h4 className={styles.successTitle}>Something Went Wrong</h4>
        <p className={styles.successText}>
          Something went wrong during subscription modification. Our team has been
          notified and will get back to you shortly.
        </p>

        <button
          className={styles.btnGradient}
          onClick={onClose}
          style={{ width: "100%" }}
        >
          Close
        </button>
      </div>
    </>
  );
};

export default SubscriptionErrorModal;
