import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Clock, ArrowRight, AlertTriangle } from "lucide-react";
import { getRejectedPOsDetail } from "@/services/dashboard";
import styles from "./PendingApprovalsModal.module.scss";

const formatCurrency = (value) => {
  if (!value || value === 0) return "₹0";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
};

const formatTime = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const hours = Math.round((now - d) / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

const RejectedPOsModal = ({ onClose }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getRejectedPOsDetail();
        setItems(res.data || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Rejected POs — Reassign Required</h3>
          <span className={styles.count}>{items.length}</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.emptyState}>Loading...</div>
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
                        {formatCurrency(item.po_value)}
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
