import React, { useId } from "react";
import { X, Wallet } from "lucide-react";
import useDialogA11y from "@/hooks/useDialogA11y";
import { formatMoneyExact as formatExact } from "@/components/dashboard/shared/format";
import styles from "./SpendBreakupModal.module.scss";

const SpendBreakupModal = ({ onClose, breakup, posIssued }) => {
  const base = Number(breakup?.base_excl_gst) || 0;
  const gst = Number(breakup?.total_gst) || 0;
  const total = Number(breakup?.total_incl_gst) || 0;
  const basePct = total > 0 ? Math.round((base / total) * 100) : 0;
  const gstPct = total > 0 ? 100 - basePct : 0;
  const dialogRef = useDialogA11y(onClose);
  const titleId = useId();

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <span className={styles.headIcon}>
            <Wallet size={15} />
          </span>
          <h3 className={styles.title} id={titleId}>Total spend breakup</h3>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.totalBlock}>
            <span className={styles.totalLabel}>Total amount (incl GST)</span>
            <span className={styles.totalValue}>{formatExact(total)}</span>
            {posIssued != null && (
              <span className={styles.totalMeta}>
                across {posIssued} committed purchase order{posIssued === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {/* Proportion bar: base vs GST */}
          <div className={styles.bar} role="img" aria-label={`Base ${basePct}%, GST ${gstPct}% of total spend`}>
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
            Committed POs only — approved or further along; drafts, POs pending
            approval, rejected and cancelled POs are excluded. GST is derived from
            purchase-order line charges.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SpendBreakupModal;
