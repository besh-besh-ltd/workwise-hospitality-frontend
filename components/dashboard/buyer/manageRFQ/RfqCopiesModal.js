// RfqCopiesModal — lists every RFQ copied from this one, used ONLY by ViewRFQ.
// Reuses the NegotiationRoundsModal theme module so it matches the RFQ details
// page aesthetic exactly (white surface, soft borders, portal + Esc/scroll-lock).
import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import moment from "moment";
import { X, Copy as CopyIcon, MapPin, Calendar, ArrowUpRight } from "lucide-react";
import styles from "./NegotiationRoundsModal.module.scss";

const RfqCopiesModal = ({ open, onClose, copies, parentTitle }) => {
  // Close on Escape + lock body scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const list = Array.isArray(copies) ? copies : [];

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
            <div className={styles.eyebrow}>RFQ lineage</div>
            <h2 className={styles.title}>Copies of this RFQ</h2>
            <div className={styles.sub}>
              {list.length} cop{list.length === 1 ? "y" : "ies"} spawned
              {parentTitle ? <> from <strong>{parentTitle}</strong></> : null}
            </div>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={16} strokeWidth={2} />
          </button>
        </header>

        <div className={styles.body}>
          {list.length === 0 ? (
            <div className={styles.empty}>No copies found.</div>
          ) : (
            <div className={styles.roundList}>
              {list.map((copy, idx) => (
                <Link
                  key={copy.id || idx}
                  href={`/dashboard/buyer/rfq-management-details?type=buyer-view&id=${copy.id}`}
                  className={styles.round}
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                  onClick={onClose}
                >
                  <div className={styles.roundTop} style={{ marginBottom: 0 }}>
                    <div className={styles.roundLeft}>
                      <span className={styles.roundNum}><CopyIcon size={13} strokeWidth={2} /></span>
                      <div className={styles.roundHead}>
                        <div className={styles.roundTitle}>
                          RFQ #{copy.rfq_no}{copy.title ? ` — ${copy.title}` : ""}
                        </div>
                        <div className={styles.roundBy}>
                          {copy.hotel_name && <MapPin size={11} strokeWidth={2} />}
                          {copy.hotel_name && <span>{copy.hotel_name}</span>}
                          {copy.hotel_name && copy.timestamp && <span style={{ color: "#d4d4d8" }}>·</span>}
                          {copy.timestamp && <Calendar size={11} strokeWidth={2} />}
                          {copy.timestamp && <span>{moment(copy.timestamp).format("DD MMM YYYY")}</span>}
                        </div>
                      </div>
                    </div>
                    <span className={`${styles.pill} ${styles.info}`}>
                      Open <ArrowUpRight size={11} strokeWidth={2.4} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <footer className={styles.foot}>
          <button type="button" className={styles.footBtn} onClick={onClose}>Close</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};

export default RfqCopiesModal;
