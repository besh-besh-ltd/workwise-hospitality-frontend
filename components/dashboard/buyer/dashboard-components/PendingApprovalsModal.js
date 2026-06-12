import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Clock, ArrowRight, FileText, ShoppingCart, Handshake, ClipboardCheck } from "lucide-react";
import { getPendingApprovalsDetail } from "@/services/dashboard";
import styles from "./PendingApprovalsModal.module.scss";

const ENTITY_CONFIG = {
  RFQ: {
    label: "RFQ Approval",
    icon: FileText,
    color: "#2E5BA8",
    getUrl: (e) => `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${e.entity_id}`,
  },
  TENDER: {
    label: "Tender Approval",
    icon: FileText,
    color: "#428B41",
    getUrl: (e) => `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${e.entity_id}`,
  },
  TECHNICAL: {
    label: "Technical Evaluation",
    icon: ClipboardCheck,
    color: "#607d8b",
    getUrl: (e) => `/dashboard/buyer/technical-evaluation?rfq_id=${e.metadata?.rfq_id || e.entity_id}`,
  },
  NEGOTIATION: {
    label: "Negotiation Approval",
    icon: Handshake,
    color: "#ffa500",
    getUrl: (e) => `/dashboard/buyer/quote-compare?rfq=${e.metadata?.rfq_id || e.entity_id}&tab=product`,
  },
  NEGOTIATION_QUOTE: {
    label: "Negotiation Quote Approval",
    icon: Handshake,
    color: "#9c27b0",
    getUrl: (e) => `/dashboard/buyer/quote-compare?rfq=${e.metadata?.rfq_id || e.entity_id}&tab=product`,
  },
  PO: {
    label: "Purchase Order Approval",
    icon: ShoppingCart,
    color: "#e91e63",
    getUrl: (e) => `/dashboard/buyer/purchase-order?rfq=${e.metadata?.rfq_id || e.entity_id}`,
  },
};

const formatWait = (hours) => {
  if (!hours || hours < 1) return "Just now";
  if (hours < 24) return `${Math.round(hours)}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const getTitle = (item) => {
  const m = item.metadata;
  if (m?.rfq_title) return m.rfq_title;
  if (m?.rfq_number) return `RFQ #${m.rfq_number}`;
  if (item.entity_rfq_no) return `RFQ #${item.entity_rfq_no}`;
  return `#${item.entity_id}`;
};

const PendingApprovalsModal = ({ onClose, filters }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPendingApprovalsDetail({
          start_date: filters?.start_date,
          end_date: filters?.end_date,
        });
        setItems(res.data || []);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grouped = items.reduce((acc, item) => {
    const key = item.entity_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>Pending Approvals</h3>
          <span className={styles.count}>{items.length}</span>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <div className={styles.emptyState}>Loading approvals...</div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>No pending approvals</div>
          ) : (
            Object.entries(grouped).map(([type, entries]) => {
              const config = ENTITY_CONFIG[type] || {
                label: type.replace(/_/g, " "),
                icon: FileText,
                color: "#777",
                getUrl: () => "/dashboard/buyer",
              };
              const Icon = config.icon;

              return (
                <div key={type} className={styles.group}>
                  <div className={styles.groupHeader}>
                    <Icon size={14} style={{ color: config.color }} />
                    <span className={styles.groupLabel}>{config.label}</span>
                    <span className={styles.groupCount}>{entries.length}</span>
                  </div>
                  <div className={styles.groupItems}>
                    {entries.map((item) => (
                      <Link
                        key={item.approval_id}
                        href={config.getUrl(item)}
                        className={styles.item}
                        onClick={onClose}
                      >
                        <div className={styles.itemInfo}>
                          <span className={styles.itemTitle}>{getTitle(item)}</span>
                          {item.hotel_name && (
                            <span className={styles.itemHotel}>{item.hotel_name}</span>
                          )}
                        </div>
                        <div className={styles.itemMeta}>
                          <span className={styles.itemStep}>
                            Step {item.current_step}/{item.total_steps}
                          </span>
                          <span className={styles.itemWait}>
                            <Clock size={11} />
                            {formatWait(item.waiting_hours)}
                          </span>
                        </div>
                        <ArrowRight size={14} className={styles.itemArrow} />
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalsModal;
