import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Clock, ArrowRight } from "lucide-react";
import { getPendingApprovalsDetail } from "@/services/dashboard";
import styles from "./PendingApprovalsModal.module.scss";

// Build the deep-link for an RFQ-lifecycle approval — they all now live as
// stage tabs on the single rfq-management-details page. `focus=approval` tells
// ViewRFQ to scroll its Approve/Reject decision card into view, so an approver
// arriving from this queue lands on the control instead of hunting for it (the
// card sits beside the stage rail and renders on every stage).
const rfqStage = (stage) => (e) => {
  const rfqId = e.metadata?.rfq_id || e.entity_id;
  return `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${rfqId}&stage=${stage}&focus=approval`;
};
// Build the deep-link for an ARC (rate contract) approval — stage tabs on the
// single rate-contracts/[id] page. arc_id is resolved server-side (an
// amendment's entity_id is the amendment, not the contract).
const arcStage = (stage, tab) => (e) => {
  const arcId = e.arc_id || e.entity_id;
  return `/dashboard/buyer/rate-contracts/${arcId}?stage=${stage}${tab ? `&tab=${tab}` : ""}`;
};

// One config per approval type the engine can raise. `tone` keys a small colour
// dot so the queue is scannable; `getUrl` lands the user on the exact tab where
// they act.
const ENTITY_CONFIG = {
  RFQ:               { label: "RFQ approval",            tone: "blue",   getUrl: rfqStage("overview") },
  TENDER:            { label: "Tender approval",         tone: "green",  getUrl: rfqStage("overview") },
  TECHNICAL:         { label: "Technical evaluation",    tone: "slate",  getUrl: rfqStage("technical") },
  NEGOTIATION:       { label: "Negotiation approval",    tone: "amber",  getUrl: rfqStage("negotiation-award") },
  NEGOTIATION_QUOTE: { label: "Award approval",          tone: "violet", getUrl: rfqStage("negotiation-award") },
  PO:                { label: "Purchase order approval", tone: "rose",   getUrl: rfqStage("purchase-order") },
  ARC_PUBLISH:       { label: "Rate contract — publish",   tone: "blue",   getUrl: arcStage("overview") },
  ARC_TECH:          { label: "Rate contract — technical", tone: "cyan",   getUrl: arcStage("technical") },
  ARC_COMMITTEE:     { label: "Rate contract — committee", tone: "violet", getUrl: arcStage("awarding") },
  ARC_AMENDMENT:     { label: "Rate contract — amendment", tone: "amber",  getUrl: arcStage("active", "amendments") },
  MR:                { label: "Material requisition",      tone: "green",  getUrl: (e) => `/dashboard/buyer/material-requisitions/${e.entity_id}` },
};

const TONE_DOT = {
  blue: "#2563eb", green: "#15803d", slate: "#64748b", amber: "#b45309",
  violet: "#7c3aed", rose: "#e11d48", cyan: "#0891b2", neutral: "#71717a",
};

const formatWait = (hours) => {
  if (!hours || hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h waiting`;
  const days = Math.round(hours / 24);
  return `${days}d waiting`;
};

const getTitle = (item) => {
  const m = item.metadata || {};
  if (typeof item.entity_type === "string" && item.entity_type.startsWith("ARC")) {
    return item.arc_title || item.arc_number || `Rate contract #${item.arc_id || item.entity_id}`;
  }
  if (item.entity_type === "MR") return m.mr_number || `Requisition #${item.entity_id}`;
  if (item.entity_title) return item.entity_title;
  if (m.rfq_title) return m.rfq_title;
  if (m.rfq_number) return `RFQ #${m.rfq_number}`;
  if (item.entity_rfq_no) return `RFQ #${item.entity_rfq_no}`;
  return `#${item.entity_id}`;
};

// Returns a short identifier string shown in the meta line beneath the title,
// so both the number and the title are visible for every approval type.
const getNumber = (item) => {
  if (typeof item.entity_type === "string" && item.entity_type.startsWith("ARC")) {
    return item.arc_number || (item.arc_id ? `Rate contract #${item.arc_id}` : null);
  }
  if (item.entity_type === "MR") return null; // MR number already IS the title
  if (item.entity_rfq_no) return `RFQ #${item.entity_rfq_no}`;
  const m = item.metadata || {};
  if (m.rfq_number) return `RFQ #${m.rfq_number}`;
  return null;
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

  // Preserve a stable, sensible group order (sourcing → contracts → orders).
  const ORDER = ["RFQ", "TENDER", "TECHNICAL", "NEGOTIATION", "NEGOTIATION_QUOTE", "ARC_PUBLISH", "ARC_TECH", "ARC_COMMITTEE", "ARC_AMENDMENT", "MR", "PO"];
  const grouped = items.reduce((acc, item) => {
    (acc[item.entity_type] = acc[item.entity_type] || []).push(item);
    return acc;
  }, {});
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    const ia = ORDER.indexOf(a); const ib = ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <h3 className={styles.title}>Waiting on you</h3>
            <p className={styles.sub}>Approvals and reviews where you&apos;re the current decision-maker.</p>
          </div>
          {items.length > 0 && <span className={styles.count}>{items.length}</span>}
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
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
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyTitle}>Nothing needs you right now</div>
              <div className={styles.emptyHint}>Approvals assigned to you will appear here.</div>
            </div>
          ) : (
            groupKeys.map((type) => {
              const entries = grouped[type];
              const config = ENTITY_CONFIG[type] || {
                label: type.replace(/_/g, " "),
                tone: "neutral",
                getUrl: () => "/dashboard/buyer",
              };
              return (
                <div key={type} className={styles.group}>
                  <div className={styles.groupHeader}>
                    <span className={styles.dot} style={{ background: TONE_DOT[config.tone] || TONE_DOT.neutral }} />
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
                          <span className={styles.itemMetaLine}>
                            {getNumber(item) && <span>{getNumber(item)}</span>}
                            {getNumber(item) && <span className={styles.sep}>·</span>}
                            {item.hotel_name && <span>{item.hotel_name}</span>}
                            {item.hotel_name && <span className={styles.sep}>·</span>}
                            <span className={styles.itemWait}><Clock size={11} />{formatWait(item.waiting_hours)}</span>
                          </span>
                        </div>
                        {item.total_steps > 1 && (
                          <span className={styles.itemStep}>Step {item.current_step}/{item.total_steps}</span>
                        )}
                        <span className={styles.reviewBtn}>Review <ArrowRight size={13} /></span>
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
