import React, { useId } from "react";
import Link from "next/link";
import { X, Clock, ArrowRight, AlertTriangle } from "lucide-react";
import { getRejectedPOsDetail } from "@/services/dashboard";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import useDialogA11y from "@/hooks/useDialogA11y";
import { formatMoney } from "@/components/dashboard/shared/format";
import styles from "./PendingApprovalsModal.module.scss";

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const hours = Math.round((now - d) / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const RejectedPOsModal = ({ onClose, filters }) => {
  // Same filters as the Action Centre count, so the list matches it.
  const { data, loading, error, refetch } = useDashboardQuery(getRejectedPOsDetail, filters, {
    errorMessage: "Could not load rejected POs",
  });
  const items = Array.isArray(data) ? data : [];
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
          <h3 className={styles.title} id={titleId}>Rejected POs — Reassign Required</h3>
          <span className={styles.count}>{items.length}</span>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.emptyState}>Loading...</div>
          ) : error ? (
            <div className={styles.emptyState} role="alert">
              <div className={styles.emptyTitle}>Couldn&apos;t load this list</div>
              <div className={styles.emptyHint}>
                {error}{" "}
                <button type="button" className={styles.retryLink} onClick={refetch}>
                  Retry
                </button>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>No rejected POs pending reassignment</div>
          ) : (
            <div className={styles.group}>
              <div className={styles.groupHeader}>
                <AlertTriangle size={14} style={{ color: "#db0a0a" }} />
                <span className={styles.groupLabel}>Vendor Rejected</span>
                <span className={styles.groupCount}>{items.length}</span>
              </div>
              <div className={styles.groupItems}>
                {items.map((item) => (
                  <Link
                    key={item.po_id}
                    href={`/dashboard/buyer/purchase-order?rfq=${item.rfq_id}&po=${item.po_id}`}
                    className={styles.item}
                    onClick={onClose}
                  >
                    <div className={styles.itemInfo}>
                      <span className={styles.itemTitle}>
                        {item.rfq_title || `RFQ #${item.rfq_no}`}
                      </span>
                      <span className={styles.itemHotel}>
                        {item.vendor_company || item.vendor_name}
                        {item.hotel_name ? ` · ${item.hotel_name}` : ""}
                      </span>
                    </div>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemStep}>
                        {formatMoney(item.po_value)}
                      </span>
                      {item.rejected_at && (
                        <span className={styles.itemWait}>
                          <Clock size={11} />
                          {formatTime(item.rejected_at)}
                        </span>
                      )}
                    </div>
                    <ArrowRight size={14} className={styles.itemArrow} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RejectedPOsModal;
