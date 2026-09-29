import React, { useId } from "react";
import Link from "next/link";
import { X, Clock, ArrowRight } from "lucide-react";
import { getPendingApprovalsDetail } from "@/services/dashboard";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import useDialogA11y from "@/hooks/useDialogA11y";
import { approvalHref } from "@/components/dashboard/shared/dashboardLinks";
import styles from "./PendingApprovalsModal.module.scss";

// Every row links through approvalHref — the one place that knows where an
// approver acts on each approval type (RFQ detail stage + decision card, PO
// detail, negotiation round approve page, rate-contract stage, MR page). The
// backend resolves rfq_id / po_id / arc_id per type (SPEC rule 6), so no id is
// ever guessed from entity_id here.
export const approvalRowHref = (item) =>
  approvalHref(item.entity_type, {
    rfqId: item.rfq_id ?? item.rfq_ref_id,
    poId: item.po_id,
    arcId: item.arc_id,
    mrId: item.entity_type === "MR" ? item.entity_id : undefined,
    entityId: item.entity_id,
  });

// One label + tone per approval type the engine can raise; `tone` keys a small
// colour dot so the queue is scannable.
const ENTITY_CONFIG = {
  RFQ:               { label: "RFQ approval",            tone: "blue" },
  TENDER:            { label: "Tender approval",         tone: "green" },
  TECHNICAL:         { label: "Technical evaluation",    tone: "slate" },
  NEGOTIATION:       { label: "Negotiation round",       tone: "amber" },
  NEGOTIATION_QUOTE: { label: "Negotiated quote",        tone: "violet" },
  PO:                { label: "Purchase order approval", tone: "rose" },
  ARC_PUBLISH:       { label: "Rate contract — publish",   tone: "blue" },
  ARC_TECH:          { label: "Rate contract — technical", tone: "cyan" },
  ARC_COMMITTEE:     { label: "Rate contract — committee", tone: "violet" },
  ARC_AMENDMENT:     { label: "Rate contract — amendment", tone: "amber" },
  MR:                { label: "Material requisition",      tone: "green" },
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
  if (item.entity_type === "PO" && item.po_number) return `PO ${item.po_number}`;
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
  // Same filters as the card that opened it (BU included), so the list
  // matches the count the user clicked on.
  const { data, loading, error, refetch } = useDashboardQuery(getPendingApprovalsDetail, filters, {
    errorMessage: "Could not load your approvals",
  });
  const items = Array.isArray(data) ? data : [];
  const dialogRef = useDialogA11y(onClose);
  const titleId = useId();

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
            <h3 className={styles.title} id={titleId}>Waiting on you</h3>
            <p className={styles.sub}>Approvals and reviews where you&apos;re the current decision-maker.</p>
          </div>
          {items.length > 0 && <span className={styles.count}>{items.length}</span>}
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={17} />
          </button>
        </div>

        <div className={styles.body} aria-busy={loading}>
          {loading ? (
            <>
            <div className={styles.loadingNote} role="status">
              <span className={styles.loadingSpinner} aria-hidden="true" />
              Loading your pending approvals…
            </div>
            {[0, 1].map((g) => (
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
            ))}
            </>
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
                        key={item.item_key || item.approval_id}
                        href={approvalRowHref(item)}
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
                            {item.instance_count > 1 && <span className={styles.sep}>·</span>}
                            {item.instance_count > 1 && <span>{item.instance_count} products</span>}
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
