import React from "react";
import { Modal } from "react-bootstrap";
import { addCommasToNumber, formatDisplayDate } from "@/utils/sharedFunctions";
import styles from "./FinalizeHistoryModal.module.scss";

// History entries carry engine output on quote_info.engine when the page hit
// /rfq/quote-compare/:id; otherwise fall back to the persisted total_price.
const lineEngineTotal = (info) => {
  if (!info) return 0;
  const fromEngine = Number(info.engine?.total);
  if (Number.isFinite(fromEngine) && fromEngine > 0) return fromEngine;
  return Number(info.total_price) || 0;
};

const formatPrice = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v) || v <= 0) return '—';
  return `Rs. ${addCommasToNumber(Math.round(v))}`;
};

const initialsFor = (name) => {
  if (!name) return '?';
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
};

const formatTimestamp = (date) =>
  date ? formatDisplayDate(date, { includeTime: true, includeSeconds: true }) : '—';

const FinalizeHistoryModal = ({ show, onHide, history }) => {
  const items = Array.isArray(history) ? history : [];

  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      contentClassName={styles.content}
      dialogClassName={styles.dialog}
    >
      <div className={styles.head}>
        <div className={styles.headTopRow}>
          <span className={styles.kicker}>Finalization History</span>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onHide}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <h2 className={styles.title}>Previously finalized vendors</h2>
        <p className={styles.subtitle}>
          A chronological log of vendors that were finalized for this product
          before the current selection. Useful to trace decisions and any
          changes made along the way.
        </p>
      </div>

      <div className={styles.body}>
        {items.length > 0 ? (
          <>
            <div className={styles.summary}>
              <span className={styles.summaryDot} />
              <span>
                {items.length} previous finalization{items.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className={styles.timeline}>
              {items.map((entry, index) => {
                const vendorName = entry.vendor_name || `Vendor #${entry.vendor_id ?? '—'}`;
                return (
                  <div className={styles.entry} key={`${entry.vendor_id || 'v'}_${index}`}>
                    <div className={styles.entryHead}>
                      <div className={styles.entryVendor}>
                        <span className={styles.avatar}>{initialsFor(vendorName)}</span>
                        <div>
                          <p className={styles.vendorName}>{vendorName}</p>
                          {entry.vendor_id != null && (
                            <p className={styles.vendorId}>ID #{entry.vendor_id}</p>
                          )}
                        </div>
                      </div>
                      <div className={styles.price}>
                        <p className={styles.priceLabel}>Quoted</p>
                        <p className={styles.priceValue}>
                          {formatPrice(lineEngineTotal(entry.quote_info))}
                        </p>
                      </div>
                    </div>

                    <div className={styles.metaGrid}>
                      <div className={styles.metaCell}>
                        <span className={styles.metaLabel}>Finalized at</span>
                        <span className={styles.metaValue}>
                          {formatTimestamp(entry.finalized_at)}
                        </span>
                      </div>
                      <div className={styles.metaCell}>
                        <span className={styles.metaLabel}>Changed at</span>
                        <span className={styles.metaValue}>
                          {formatTimestamp(entry.changed_at)}
                        </span>
                      </div>
                      <div className={styles.metaCell}>
                        <span className={styles.metaLabel}>Changed by</span>
                        <span className={styles.metaValue}>
                          {entry.changed_by || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>📜</span>
            <div>No previous finalizations found for this product.</div>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnSecondary}`}
          onClick={onHide}
        >
          Close
        </button>
      </div>
    </Modal>
  );
};

export default FinalizeHistoryModal;
