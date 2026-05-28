import React from "react";
import moment from "moment";
import styles from "./PurchaseOrders.module.scss";

/* Map the prototype avatar slug (e.g. "av-indigo" or "indigo") to the
   CSS-module class. Falls back to a deterministic pick from the initials so
   real data without an avatar field still gets a stable colour. */
const AVATAR_CLASSES = {
  "av-sky": styles.avSky,
  "av-warm": styles.avWarm,
  "av-green": styles.avGreen,
  "av-rose": styles.avRose,
  "av-indigo": styles.avIndigo,
  "av-zinc": styles.avZinc,
  sky: styles.avSky,
  warm: styles.avWarm,
  green: styles.avGreen,
  rose: styles.avRose,
  indigo: styles.avIndigo,
  zinc: styles.avZinc,
};
const AVATAR_CYCLE = [styles.avIndigo, styles.avRose, styles.avGreen, styles.avWarm, styles.avSky, styles.avZinc];

export const avatarClass = (slug, seed = "") => {
  if (slug && AVATAR_CLASSES[slug]) return AVATAR_CLASSES[slug];
  let h = 0;
  const s = String(seed || slug || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_CYCLE[h % AVATAR_CYCLE.length];
};

export const initialsOf = (name = "") =>
  String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase() || "?";

/* Human label for EVERY raw PO status enum value. */
export const STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending approval",
  pending_approval: "Pending approval",
  acceptance_pending: "Awaiting vendor",
  approved: "Approved",
  sent: "Sent to vendor",
  invoice_raised: "Invoice raised",
  dispatched: "Dispatched",
  GRN: "Goods received",
  delivered: "Delivered",
  completed: "Completed",
  rejected: "Rejected",
  rejected_by_vendor: "Rejected by vendor",
  cancelled: "Cancelled",
};

export const statusLabel = (s) => STATUS_LABELS[s] || (s ? String(s) : "—");

/* Map every raw status to one of the statusPill tone classes that exist in
   PurchaseOrders.module.scss (.draft/.pending/.approved/.dispatched/.completed/
   .rejected/.cancelled and the --info-toned reuse below). */
const STATUS_TONE = {
  draft: "draft",
  pending: "pending",
  pending_approval: "pending",
  acceptance_pending: "pending",
  approved: "approved",
  sent: "info",
  invoice_raised: "info",
  dispatched: "dispatched",
  GRN: "completed",
  delivered: "completed",
  completed: "completed",
  rejected: "rejected",
  rejected_by_vendor: "rejected",
  cancelled: "cancelled",
};

/* Returns the CSS-module class for a status pill (falls back to neutral draft). */
export const statusTone = (s) => {
  const key = STATUS_TONE[s];
  if (key === "info") return styles.statusInfo || styles.dispatched;
  return (key && styles[key]) || styles.draft;
};

/* INR with Indian digit grouping + ₹ prefix, e.g. ₹1,56,100. */
export const inr = (n) => {
  const num = Number(n);
  if (!isFinite(num)) return "₹0";
  return `₹${Math.round(num).toLocaleString("en-IN")}`;
};

/* Lakh display for the KPI total-value card: value/100000 with "L" suffix. */
export const toLakh = (n) => {
  const num = Number(n) || 0;
  const l = num / 100000;
  return l % 1 === 0 ? l.toFixed(0) : l.toFixed(2);
};

/* ISO/string → "27 May 2026 · 02:15 AM" (datetime) or "27 May 2026" (date-only).
   Null/invalid → "—". Normalises the "YYYY-MM-DD HH:mm" (no-T) backend shape. */
const normaliseDateInput = (v) => {
  let s = String(v);
  if (/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) s = s.replace(" ", "T");
  return s;
};

export const fmtDateTime = (v) => {
  if (!v) return "—";
  const m = moment(normaliseDateInput(v));
  return m.isValid() ? m.format("DD MMM YYYY · hh:mm A") : "—";
};

export const fmtDateOnly = (v) => {
  if (!v) return "—";
  const m = moment(normaliseDateInput(v));
  return m.isValid() ? m.format("DD MMM YYYY") : "—";
};

/* Looks like an ISO/date string? Format date-only; otherwise return the value
   unchanged (key_dates "v" may already be a human label, not an ISO string). */
export const fmtMaybeDate = (v) => {
  if (v == null || v === "") return "—";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}([T\s]|$)/.test(s)) {
    const m = moment(normaliseDateInput(s));
    if (m.isValid()) return m.format("DD MMM YYYY");
  }
  return s;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ISO → "02 May 26" (matches the prototype). includeTime → "02 May · 10:55 AM". */
export const fmtDate = (iso, { includeTime = false } = {}) => {
  if (!iso) return "";
  let s = String(iso);
  if (/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) s = s.replace(" ", "T");
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const mon = MONTHS[d.getMonth()];
  if (includeTime) {
    let h = d.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const mins = String(d.getMinutes()).padStart(2, "0");
    return `${day} ${mon} · ${String(h).padStart(2, "0")}:${mins} ${ampm}`;
  }
  const yr = String(d.getFullYear()).slice(2);
  return `${day} ${mon} ${yr}`;
};

export const relAgo = (iso) => {
  if (!iso) return "";
  let s = String(iso);
  if (/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) s = s.replace(" ", "T");
  const d = new Date(s);
  if (isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 49) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

/* Skeleton line/block helper. */
export const Sk = ({ w = "100%", h = 12, r, style }) => (
  <span className={styles.sk} style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

export default styles;
