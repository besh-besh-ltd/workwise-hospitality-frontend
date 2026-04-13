import React from "react";
import { FiFileText } from "react-icons/fi";
import styles from "./Subscription.module.css";

const OpenRfqsModal = ({ onAcknowledge }) => {
  return (
    <>
      <div
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
          zIndex: 10001, maxWidth: "440px", width: "90%",
          animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <div className={styles.successIcon}>
          <FiFileText size={28} color="#fff" />
        </div>

        <h4 className={styles.successTitle}>
          Added to Active RFQs
        </h4>
        <p className={styles.successText}>
          Some active RFQs have products in the categories you selected. You have been
          automatically added to them so you can start submitting quotes right away.
        </p>
        <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", margin: "0 0 20px", lineHeight: 1.4 }}>
          This will not affect your participation in any future RFQs.
        </p>

        <button
          className={styles.btnGradient}
          onClick={onAcknowledge}
          style={{ width: "100%" }}
        >
          Okay, I Understand
        </button>
      </div>
    </>
  );
};

export default OpenRfqsModal;
