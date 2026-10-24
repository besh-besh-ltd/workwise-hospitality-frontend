import React from "react";
import Link from "next/link";
import { Modal } from "react-bootstrap";
import {
  AlertTriangle, ArrowLeft, Building2, CheckCircle2, CloudOff, FileText, Info, Loader2, PackageCheck, PackageOpen,
  RefreshCw, Trash2, X,
} from "lucide-react";
import { routes } from "./receiveUtils";
import styles from "./receive.module.scss";

// The receive screen's non-form states (loading, error, blocked, pick a
// hotel, queued offline, posted), the notice strip above the form and the
// discard-draft sheet.
// Presentational only: ReceivePage decides which one shows.

export const BLOCKED_COPY = {
  received: {
    title: "Everything on this PO has been received",
    sub: "Nothing is left to receive here. Its goods receipts show what came in.",
    ok: true,
  },
  closed_short: {
    title: "This PO was closed short",
    sub: "The buyer closed the rest of this order, so nothing is left to receive.",
    ok: true,
  },
  not_ready: { title: "This PO can't be received yet", sub: null },
  not_found: { title: "Purchase order not found", sub: "It may have been removed, or it isn't at a hotel you receive for." },
  forbidden: { title: "You can't receive this PO", sub: null },
  no_hotel: { title: "No hotel to receive at", sub: "None of this PO's hotels is one you receive for." },
};

/** Eyebrow link back to the awaiting list. */
export const ReceiveEyebrow = () => (
  <div className={styles.eyebrow}>
    <Link href={routes.awaiting()}>
      <ArrowLeft size={12} aria-hidden="true" /> Awaiting deliveries
    </Link>
  </div>
);

/** Page chrome for the non-form states. */
export const ReceiveFrame = ({ title, sub = null, children }) => (
  <div className={styles.page}>
    <section className={styles.pageHeader}>
      <div className={styles.pageHeaderInner}>
        <div className={styles.headMain}>
          <ReceiveEyebrow />
          <h1 className={styles.pageTitle}>
            {title ? <span className={styles.titleMono}>{title}</span> : "Receive goods"}
          </h1>
          {sub}
        </div>
      </div>
    </section>
    <main className={styles.pageBody}>{children}</main>
  </div>
);

const BackToAwaiting = () => (
  <Link href={routes.awaiting()} className={`${styles.btn} ${styles.btnSecondary}`}>
    Back to awaiting deliveries
  </Link>
);

export const LoadingState = () => (
  <div className={styles.card} aria-busy="true" aria-label="Loading the purchase order">
    <div className={styles.cardBody}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={styles.sk} style={{ width: `${88 - i * 14}%`, marginBottom: 14 }} />
      ))}
    </div>
  </div>
);

export const ErrorState = ({ message, onRetry }) => (
  <div className={styles.stateCard} role="alert">
    <div className={styles.stateIc}><PackageOpen size={20} aria-hidden="true" /></div>
    <h2 className={styles.stateTitle}>Couldn&apos;t load this PO</h2>
    <p className={styles.stateSub}>{message}</p>
    <div className={styles.stateActions}>
      <button type="button" className={`${styles.btn} ${styles.btnPrimary}`} onClick={onRetry}>
        <RefreshCw size={14} aria-hidden="true" /> Try again
      </button>
    </div>
  </div>
);

export const BlockedState = ({ reason, message, poId }) => {
  const copy = BLOCKED_COPY[reason] || BLOCKED_COPY.not_ready;
  return (
    <div className={styles.stateCard}>
      <div className={`${styles.stateIc} ${copy.ok ? styles.stateIcOk : ""}`}>
        {copy.ok ? <CheckCircle2 size={20} aria-hidden="true" /> : <PackageOpen size={20} aria-hidden="true" />}
      </div>
      <h2 className={styles.stateTitle}>{copy.title}</h2>
      <p className={styles.stateSub}>{copy.sub || message || "Check with the buyer."}</p>
      <div className={styles.stateActions}>
        {(reason === "received" || reason === "closed_short") && poId != null && (
          <Link href={routes.grnRegister({ poId })} className={`${styles.btn} ${styles.btnPrimary}`}>
            View its GRNs
          </Link>
        )}
        <BackToAwaiting />
      </div>
    </div>
  );
};

export const PickHotelState = ({ choices = [], onPick }) => (
  <div className={styles.stateCard} style={{ maxWidth: 720 }}>
    <div className={styles.stateIc}><Building2 size={20} aria-hidden="true" /></div>
    <h2 className={styles.stateTitle}>Which hotel is receiving?</h2>
    <p className={styles.stateSub}>This PO delivers to more than one hotel. Pick the one these goods arrived at.</p>
    <div className={styles.hotelPicker}>
      {choices.map((h) => (
        <button key={h.id} type="button" className={styles.hotelBtn} onClick={() => onPick(h.id)}>
          <Building2 size={16} aria-hidden="true" />
          <span>{h.name}</span>
        </button>
      ))}
    </div>
  </div>
);

export const QueuedState = ({ pendingCount = 0 }) => (
  <div className={styles.stateCard} role="status">
    <div className={styles.stateIc}><CloudOff size={20} aria-hidden="true" /></div>
    <h2 className={styles.stateTitle}>Saved on this device</h2>
    <p className={styles.stateSub}>
      There is no connection right now. The receipt posts by itself when the signal is back
      {pendingCount > 0 ? ` (${pendingCount} waiting)` : ""}.
    </p>
    <div className={styles.stateActions}>
      <BackToAwaiting />
    </div>
  </div>
);

/** Props: { grn, warnings[], hotelName, lineName(poLineId), canReceiveMore, onReceiveMore } */
export const PostedState = ({ grn, warnings = [], hotelName, lineName, canReceiveMore, onReceiveMore }) => (
  <div className={styles.stateCard} role="status">
    <div className={`${styles.stateIc} ${styles.stateIcOk}`}><PackageCheck size={20} aria-hidden="true" /></div>
    <h2 className={styles.stateTitle}>Receipt posted</h2>
    <p className={styles.stateSub}>
      {grn?.grnNumber ? <span className={styles.mono}>{grn.grnNumber}</span> : null}
      {grn?.grnNumber ? <br /> : null}
      Accepted goods are in stock{hotelName ? ` at ${hotelName}` : ""}.
    </p>
    {warnings.length > 0 && (
      <ul className={styles.successList} aria-label="Warnings">
        {warnings.map((w, i) => (
          <li key={`${w.poLineId}-${w.code}-${i}`} className={styles.lineWarn}>
            <strong>{lineName(w.poLineId) || "Line"}</strong>
            <span>{w.message}</span>
          </li>
        ))}
      </ul>
    )}
    <div className={styles.stateActions}>
      {grn?.id != null && (
        <Link href={routes.grn(grn.id)} className={`${styles.btn} ${styles.btnPrimary}`}>
          <FileText size={14} aria-hidden="true" /> View GRN
        </Link>
      )}
      {canReceiveMore && (
        <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onReceiveMore}>
          Receive another delivery
        </button>
      )}
      <BackToAwaiting />
    </div>
  </div>
);

/**
 * One-line message above the form: {tone: "note"|"warn", text, grnId?}.
 * `grnId` adds a View GRN link; `onDismiss` adds a close button.
 */
export const ReceiveNotice = ({ notice, onDismiss }) => {
  if (!notice) return null;
  const warn = notice.tone === "warn";
  return (
    <div className={`${styles.lineMsg} ${warn ? styles.lineWarn : styles.lineNote} ${styles.notice}`} role="status">
      {warn ? <AlertTriangle size={14} aria-hidden="true" /> : <Info size={14} aria-hidden="true" />}
      <span className={styles.noticeText}>{notice.text}</span>
      {notice.grnId != null && (
        <Link href={routes.grn(notice.grnId)} className={styles.btnLink}>View GRN</Link>
      )}
      {onDismiss && (
        <button type="button" className={styles.btnLink} onClick={onDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
};

/** "Discard this draft?" */
export const DiscardDraftModal = ({ busy, onConfirm, onHide }) => (
  <Modal
    show
    onHide={busy ? undefined : onHide}
    backdrop={busy ? "static" : true}
    keyboard={!busy}
    centered
    aria-labelledby="receive-discard-title"
    dialogClassName={styles.sheetDialog}
    contentClassName={styles.sheet}
  >
    <div className={styles.sheetHead}>
      <div>
        <h2 id="receive-discard-title" className={styles.sheetTitle}>Discard this draft?</h2>
        <div className={styles.sheetSub}>
          The quantities, notes and files saved for this receipt are deleted. Nothing has gone into stock yet.
        </div>
      </div>
      <button type="button" className={styles.sheetClose} onClick={onHide} disabled={busy} aria-label="Close">
        <X size={18} aria-hidden="true" />
      </button>
    </div>
    <div className={styles.sheetFoot}>
      <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={onHide} disabled={busy}>
        Keep it
      </button>
      <button type="button" className={`${styles.btn} ${styles.btnDanger}`} onClick={onConfirm} disabled={busy}>
        {busy ? <Loader2 size={14} className={styles.spin} aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
        Discard draft
      </button>
    </div>
  </Modal>
);
