// NegotiationRoundsModal — minimal-theme negotiation rounds history, used ONLY
// by ViewRFQ. Matches the RFQ details page aesthetic (white surface, soft
// borders, Geist Mono for ₹/dates). The shared react-bootstrap
// NegotiationRoundHistoryModal is left untouched for its other consumers.
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Calendar, Clock, User } from "lucide-react";
import { formatDisplayDate } from "@/utils/sharedFunctions";
import styles from "./NegotiationRoundsModal.module.scss";

const fmtDate = (d) => (d ? formatDisplayDate(d, { includeTime: true }) : "—");
const fmtPrice = (p) =>
  p == null || p === ""
    ? "—"
    : `₹${parseFloat(p).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

// Effective status — a rejected approval overrides the round status.
const effStatus = (round) => {
  if (round.approvals?.some((a) => a.status === "REJECTED")) return "REJECTED";
  return round.status;
};

const STATUS_TONE = {
  COMPLETED: "success",
  ACTIVE: "info",
  PENDING_APPROVAL: "warn",
  REJECTED: "danger",
  CANCELLED: "danger",
  EXPIRED: "danger",
};
const STATUS_LABEL = {
  COMPLETED: "Completed",
  ACTIVE: "Active",
  PENDING_APPROVAL: "Pending approval",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const NegotiationRoundsModal = ({ open, onClose, rounds, productName }) => {
  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const list = Array.isArray(rounds) ? rounds : [];
  // Newest round first.
  const sorted = [...list].sort(
    (a, b) => (b.round_number || 0) - (a.round_number || 0),
  );

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.head}>
          <div className={styles.headText}>
            <div className={styles.eyebrow}>Negotiation rounds</div>
            <h2 className={styles.title}>{productName || "Product"}</h2>
            <div className={styles.sub}>
              {sorted.length} round{sorted.length === 1 ? "" : "s"} for this product
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className={styles.body}>
          {sorted.length === 0 ? (
            <div className={styles.empty}>No negotiation rounds found.</div>
          ) : (
            <div className={styles.roundList}>
              {sorted.map((round, idx) => {
                const status = effStatus(round);
                const tone = STATUS_TONE[status] || "neutral";
                const label = STATUS_LABEL[status] || status || "—";
                return (
                  <div key={round.id || idx} className={styles.round}>
                    <div className={styles.roundTop}>
                      <div className={styles.roundLeft}>
                        <span className={styles.roundNum}>
                          {round.round_number ?? idx + 1}
                        </span>
                        <div className={styles.roundHead}>
                          <div className={styles.roundTitle}>
                            Round {round.round_number ?? idx + 1}
                          </div>
                          {round.created_by_name && (
                            <div className={styles.roundBy}>
                              <User size={11} strokeWidth={2} />
                              By {round.created_by_name}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className={`${styles.pill} ${styles[tone]}`}>{label}</span>
                    </div>

                    <div className={styles.roundMeta}>
                      <div className={styles.metaCell}>
                        <div className={styles.metaKey}>Target price</div>
                        <div className={`${styles.metaVal} ${styles.mono}`}>
                          {fmtPrice(round.target_price)}
                        </div>
                      </div>
                      <div className={styles.metaCell}>
                        <div className={styles.metaKey}>
                          <Calendar size={10} strokeWidth={2} /> End date
                        </div>
                        <div className={`${styles.metaVal} ${styles.mono}`}>
                          {fmtDate(round.end_date)}
                        </div>
                      </div>
                      <div className={styles.metaCell}>
                        <div className={styles.metaKey}>
                          <Clock size={10} strokeWidth={2} /> Created
                        </div>
                        <div className={`${styles.metaVal} ${styles.mono}`}>
                          {fmtDate(round.created_at)}
                        </div>
                      </div>
                    </div>

                    {round.remarks && (
                      <div className={styles.remarks}>{round.remarks}</div>
                    )}

                    {round.approvals && round.approvals.length > 0 && (
                      <div className={styles.approvals}>
                        <div className={styles.approvalsKey}>Approvals</div>
                        {round.approvals.map((a, ai) => (
                          <div key={a.id || ai} className={styles.approvalRow}>
                            <span className={styles.approverName}>
                              {a.approver_name || "Unknown"}
                            </span>
                            <span
                              className={`${styles.pill} ${
                                a.status === "APPROVED"
                                  ? styles.success
                                  : a.status === "REJECTED"
                                    ? styles.danger
                                    : styles.warn
                              }`}
                            >
                              {a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className={styles.foot}>
          <button type="button" className={styles.footBtn} onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default NegotiationRoundsModal;
