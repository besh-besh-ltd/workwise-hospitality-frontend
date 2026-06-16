import React from "react";
import { X, Wallet } from "lucide-react";
import styles from "./SpendBreakupModal.module.scss";

// Exact INR amount (detail view) — e.g. ₹12,34,567.
const formatExact = (value) =>
  `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

const SpendBreakupModal = ({ onClose, breakup, posIssued }) => {
  const base = Number(breakup?.base_excl_gst) || 0;
  const gst = Number(breakup?.total_gst) || 0;
  const total = Number(breakup?.total_incl_gst) || 0;
  const basePct = total > 0 ? Math.round((base / total) * 100) : 0;
  const gstPct = total > 0 ? 100 - basePct : 0;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.headIcon}>
            <Wallet size={15} />
          </span>
          <h3 className={styles.title}>Total spend breakup</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.totalBlock}>
            <span className={styles.totalLabel}>Total amount (incl GST)</span>
            <span className={styles.totalValue}>{formatExact(total)}</span>
            {posIssued != null && (
              <span className={styles.totalMeta}>
                across {posIssued} purchase order{posIssued === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Proportion bar: base vs GST */}
          <div className={styles.bar}>
            <div className={styles.barBase} style={{ width: `${basePct}%` }} />
            <div className={styles.barGst} style={{ width: `${gstPct}%` }} />
          </div>

          <div className={styles.rows}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>
                <span className={`${styles.dot} ${styles.dotBase}`} />
                Base price (excl GST)
              </span>
              <span className={styles.rowValue}>{formatExact(base)}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.rowLabel}>
                <span className={`${styles.dot} ${styles.dotGst}`} />
                Total GST
              </span>
              <span className={styles.rowValue}>{formatExact(gst)}</span>
            </div>
            <div className={`${styles.row} ${styles.rowTotal}`}>
              <span className={styles.rowLabel}>Total (incl GST)</span>
              <span className={styles.rowValue}>{formatExact(total)}</span>
            </div>
          </div>

          <p className={styles.note}>
            GST is derived from purchase-order line charges. Figures cover approved
            POs in the selected business units and period.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpendBreakupModal;
