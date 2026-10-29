import React from "react";
import { FileText, Paperclip, Trash2 } from "lucide-react";
import styles from "./receive.module.scss";

// Pieces the receive screens share: GRN status pills, attachment kinds and
// the attachment list, and the receiver's hotels for the list filters.

// ── GRN status ───────────────────────────────────────────────────────────────
export const GRN_STATUS = {
  draft: { label: "Draft", tone: "pillNeutral" },
  posted: { label: "Posted", tone: "pillOk" },
  partially_reversed: { label: "Partly reversed", tone: "pillWarn" },
  reversed: { label: "Reversed", tone: "pillBad" },
};

/** Dot + label + tint. `map` defaults to GRN_STATUS (RTVs pass their own). */
export const StatusPill = ({ status, map = GRN_STATUS }) => {
  const s = map[status] || { label: status, tone: "pillNeutral" };
  return (
    <span className={`${styles.pill} ${styles[s.tone]}`}>
      <span className={styles.dot} />
      {s.label}
    </span>
  );
};

// ── Attachments ──────────────────────────────────────────────────────────────
export const ATTACHMENT_KINDS = [
  { value: "CHALLAN", label: "Challan" },
  { value: "INVOICE", label: "Invoice" },
  { value: "PHOTO", label: "Photo" },
  { value: "OTHER", label: "Other" },
];
export const kindLabel = (k) => ATTACHMENT_KINDS.find((x) => x.value === k)?.label || "File";

/** "Attach as" select over ATTACHMENT_KINDS. */
export const AttachKindSelect = ({ value, onChange }) => (
  <select
    className={styles.select}
    style={{ width: "auto" }}
    aria-label="Attach as"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    {ATTACHMENT_KINDS.map((k) => (
      <option key={k.value} value={k.value}>{k.label}</option>
    ))}
  </select>
);

/**
 * Uploaded files (links) and files waiting to upload (`pendingFiles`, for a
 * screen that uploads after posting). `onDelete(attachment)` / `onRemovePending(index)` show the
 * remove buttons; `empty` renders when there is nothing.
 */
export const AttachmentList = ({ attachments = [], pendingFiles = [], onDelete, onRemovePending, empty = null }) => {
  if (attachments.length + pendingFiles.length === 0) return empty;
  return (
    <ul className={styles.attList}>
      {attachments.map((a) => {
        const name = a.fileName || kindLabel(a.kind);
        return (
          <li key={a.id} className={styles.attItem}>
            <FileText size={14} aria-hidden="true" />
            <a href={a.url} target="_blank" rel="noopener noreferrer">{name}</a>
            <span className={`${styles.pill} ${styles.pillNeutral}`}>{kindLabel(a.kind)}</span>
            {onDelete && (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm} ${styles.iconBtn}`}
                onClick={() => onDelete(a)}
                aria-label={`Remove ${name}`}
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            )}
          </li>
        );
      })}
      {pendingFiles.map((p, i) => (
        <li key={`p-${i}`} className={styles.attItem}>
          <Paperclip size={14} aria-hidden="true" />
          <span className={styles.attPending}>{p.file.name}</span>
          <span className={`${styles.pill} ${styles.pillNeutral}`}>Uploads on post</span>
          {onRemovePending && (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm} ${styles.iconBtn}`}
              onClick={() => onRemovePending(i)}
              aria-label={`Remove ${p.file.name}`}
            >
              <Trash2 size={13} aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};

// ── Hotels ───────────────────────────────────────────────────────────────────
/**
 * The hotel filter's choices from a list's answer (`hotels` on GET
 * /receive/awaiting and GET /grn): exactly the hotels the server lets this
 * user read receipts at, not their company mappings. null when absent.
 */
export const hotelsOf = (res) =>
  Array.isArray(res?.hotels) ? res.hotels.map((h) => ({ id: Number(h.id), name: h.name || `Hotel ${h.id}` })) : null;

/** "All my hotels" filter; renders nothing for a single-hotel user. */
export const HotelFilter = ({ id, hotels, value, onChange }) => {
  if (hotels.length <= 1) return null;
  return (
    <div>
      <label className={styles.srOnly} htmlFor={id}>Hotel</label>
      <select id={id} className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">All my hotels</option>
        {hotels.map((h) => (
          <option key={h.id} value={String(h.id)}>{h.name}</option>
        ))}
      </select>
    </div>
  );
};
