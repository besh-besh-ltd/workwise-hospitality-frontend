import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Clock, ArrowRight, FileText, AlertTriangle } from "lucide-react";
import { getNoResponseDetail } from "@/services/dashboard";
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
            href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${item.id}`}
            className={styles.item}
            onClick={onClose}
          >
            <div className={styles.itemInfo}>
              <span className={styles.itemTitle}>
                {item.title || `RFQ #${item.rfq_no}`}
              </span>
              <span className={styles.itemHotel}>
                {item.invited_vendor_count
                  ? `${item.invited_vendor_count} vendor(s) invited`
                  : "No vendor responses yet"}
                {item.hotel_name ? ` · ${item.hotel_name}` : ""}
              </span>
            </div>
            <div className={styles.itemMeta}>
              {item.bid_end_date && (
                <span className={styles.itemWait}>
                  <Clock size={11} />
                  {formatDeadline(item.bid_end_date)}
                </span>
              )}
            </div>
            <ArrowRight size={14} className={styles.itemArrow} />
          </Link>
        ))}
      </div>
    </div>
  );
};

const NoResponseModal = ({ onClose, filters }) => {
  const [data, setData] = useState({ active: [], expired: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getNoResponseDetail({
          hotel_ids: filters?.hotel_ids,
          start_date: filters?.start_date,
          end_date: filters?.end_date,
        });
        setData(res.data || { active: [], expired: [] });
      } catch {
        setData({ active: [], expired: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = (data.active?.length || 0) + (data.expired?.length || 0);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>RFQs Awaiting Vendor Response</h3>
          <span className={styles.count}>{total}</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.emptyState}>Loading...</div>
          ) : total === 0 ? (
            <div className={styles.emptyState}>No RFQs awaiting a response</div>
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
