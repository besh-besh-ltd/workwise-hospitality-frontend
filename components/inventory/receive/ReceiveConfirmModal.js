import React, { useId } from "react";
import { Modal } from "react-bootstrap";
import { Loader2, X } from "lucide-react";
import { fmtQtyUnit, lineQty, rejectionLabel, subQty } from "./receiveUtils";
import styles from "./receive.module.scss";

// Last look before posting: per line, what is accepted into stock, what goes
// back as rejected (and why), and what stays open on the PO afterwards. Units
// differ per line, so nothing is summed across lines.
//
// Props: { show, lines (ReceiveContext lines), entries, hotelName, busy, onConfirm, onHide }

const ReceiveConfirmModal = ({ show, lines = [], entries = {}, hotelName, busy = false, onConfirm, onHide }) => {
  const titleId = useId();
  const rows = lines
    .map((l) => ({ line: l, entry: entries[l.poLineId], ...lineQty(entries[l.poLineId]) }))
    .filter((r) => r.entry && r.valid && (r.received > 0 || r.rejected > 0));
  const withRejects = rows.filter((r) => r.rejected > 0).length;
  const stillOpen = rows.filter((r) => subQty(r.line.openAtHotel, r.accepted) > 0).length;

  return (
    <Modal
      show={show}
      onHide={busy ? undefined : onHide}
      backdrop={busy ? "static" : true}
      keyboard={!busy}
      centered
      size="lg"
      aria-labelledby={titleId}
      dialogClassName={styles.sheetDialog}
      contentClassName={styles.sheet}
    >
      <div className={styles.sheetHead}>
        <div>
          <h2 id={titleId} className={styles.sheetTitle}>Post this receipt?</h2>
          <div className={styles.sheetSub}>
            Accepted goods go into stock{hotelName ? ` at ${hotelName}` : ""}. A posted receipt can only be undone by a reversal.
          </div>
        </div>
        <button type="button" className={styles.sheetClose} onClick={onHide} disabled={busy} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className={styles.sheetBody}>
        <div className={styles.summaryStrip}>
          <span><strong>{rows.length}</strong> line{rows.length === 1 ? "" : "s"}</span>
          <span><strong>{withRejects}</strong> with rejections</span>
          <span><strong>{stillOpen}</strong> still open after this</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className={styles.modalTable}>
            <thead>
              <tr>
                <th>Item</th>
                <th className={styles.num}>Accepted</th>
                <th className={styles.num}>Rejected</th>
                <th className={styles.num}>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ line, entry, accepted, rejected }) => {
                const remaining = Math.max(0, subQty(line.openAtHotel, accepted));
                return (
                  <tr key={line.poLineId}>
                    <td>
                      <div className={styles.itName}>{line.productName}</div>
                      {rejected > 0 && <div className={styles.muted}>{rejectionLabel(entry.reason)}</div>}
                    </td>
                    <td className={styles.num} data-label="Accepted">{fmtQtyUnit(accepted, line.unit)}</td>
                    <td className={styles.num} data-label="Rejected">{fmtQtyUnit(rejected, line.unit)}</td>
                    <td className={styles.num} data-label="Remaining">{fmtQtyUnit(remaining, line.unit)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className={styles.sheetFoot}>
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onHide} disabled={busy}>
          Keep editing
        </button>
        <button type="button" className={`${styles.btn} ${styles.btnSuccess}`} onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 size={14} className={styles.spin} aria-hidden="true" />}
          Confirm and post
        </button>
      </div>
    </Modal>
  );
};

export default ReceiveConfirmModal;
