import React, { useId } from "react";
import Link from "next/link";
import { X, Clock, ArrowRight, FileText, AlertTriangle } from "lucide-react";
import { getNoResponseDetail } from "@/services/dashboard";
import { rfqDetail } from "@/components/dashboard/shared/dashboardLinks";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import useDialogA11y from "@/hooks/useDialogA11y";
import styles from "./PendingApprovalsModal.module.scss";

// Format a bid_end_date string into a short relative hint.
const formatDeadline = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const days = Math.round((d - now) / 86400000);
  if (days === 0) return "Closes today";
  if (days > 0) return `Closes in ${days}d`;
  return `Closed ${Math.abs(days)}d ago`;
};

// One bucket section: header + clickable RFQ rows.
const Section = ({ items, label, color, onClose }) => {
  if (!items.length) return null;
  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        {color === "#db0a0a" ? (
          <AlertTriangle size={14} style={{ color }} />
        ) : (
          <FileText size={14} style={{ color }} />
        )}
        <span className={styles.groupLabel}>{label}</span>
        <span className={styles.groupCount}>{items.length}</span>
      </div>
      <div className={styles.groupItems}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={rfqDetail(item.id)}
            className={styles.item}
            onClick={onClose}
          >
            <div className={styles.itemInfo}>
              <span className={styles.itemTitle}>
                {item.title || `RFQ #${item.rfq_no}`}
              </span>
              <span className={styles.itemMetaLine}>
                {item.invited_vendor_count
                  ? <span>{item.invited_vendor_count} vendor{item.invited_vendor_count === 1 ? "" : "s"} invited</span>
                  : <span>No vendor responses yet</span>}
                {item.regret_count > 0 && <span className={styles.sep}>·</span>}
                {item.regret_count > 0 && <span>{item.regret_count} regret{item.regret_count === 1 ? "" : "s"}</span>}
                {item.hotel_name && <span className={styles.sep}>·</span>}
                {item.hotel_name && <span>{item.hotel_name}</span>}
                {item.bid_end_date && <span className={styles.sep}>·</span>}
                {item.bid_end_date && (
                  <span className={styles.itemWait}>
                    <Clock size={11} />
                    {formatDeadline(item.bid_end_date)}
                  </span>
                )}
              </span>
            </div>
            <span className={styles.reviewBtn}>View <ArrowRight size={13} /></span>
          </Link>
        ))}
      </div>
    </div>
  );
};

const NoResponseModal = ({ onClose, filters }) => {
  const { data: payload, loading, error, refetch } = useDashboardQuery(getNoResponseDetail, filters, {
    errorMessage: "Could not load RFQs awaiting a response",
  });
  const data = payload || { active: [], expired: [] };
  const dialogRef = useDialogA11y(onClose);
  const titleId = useId();

  const total = (data.active?.length || 0) + (data.expired?.length || 0);

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
          <div className={styles.headerMain}>
            <h3 className={styles.title} id={titleId}>RFQs Awaiting Vendor Response</h3>
            <p className={styles.sub}>Published RFQs that haven&apos;t received any vendor quotes yet.</p>
          </div>
          {total > 0 && <span className={styles.count}>{total}</span>}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className={styles.body}>
          {loading ? (
            [0, 1].map((g) => (
              <div key={g} className={styles.group}>
                <div className={styles.groupHeader}>
                  <span className={styles.skel} style={{ width: 7, height: 7, borderRadius: 99 }} />
                  <span className={styles.skel} style={{ width: 140, height: 10 }} />
                </div>
                <div className={styles.groupItems}>
                  {Array.from({ length: g === 0 ? 2 : 1 }).map((_, i) => (
                    <div key={i} className={styles.itemSkel}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className={styles.skel} style={{ width: "62%", height: 12, marginBottom: 8 }} />
                        <span className={styles.skel} style={{ width: "42%", height: 9 }} />
                      </div>
                      <span className={styles.skel} style={{ width: 60, height: 14, borderRadius: 6 }} />
                    </div>
                  ))}
                </div>
              </div>
            ))
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
          ) : total === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>No RFQs awaiting a response</div>
              <div className={styles.emptyHint}>Published RFQs with zero vendor quotes will show here.</div>
            </div>
          ) : (
            <>
              <Section
                items={data.active || []}
                label="Bid window open"
                color="#2E5BA8"
                onClose={onClose}
              />
              <Section
                items={data.expired || []}
                label="Bid window expired"
                color="#db0a0a"
                onClose={onClose}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NoResponseModal;
