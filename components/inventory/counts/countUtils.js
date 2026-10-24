// Helpers shared by the count screens: routes, request ids, formatting of
// server figures (display only; no client-side stock maths), line order and
// the inventory error envelope.

export const COUNTS_PATH = "/dashboard/buyer/inventory/counts";
export const countPath = (id) => `${COUNTS_PATH}/${encodeURIComponent(id)}`;

/** A v4 UUID for clientEventId (crypto.randomUUID needs a secure context). */
export const newClientEventId = () => {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// ── Numbers ──────────────────────────────────────────────────────────────────
const MINUS = "−";
const isNum = (n) => n !== null && n !== undefined && n !== "" && Number.isFinite(Number(n));

const qtyFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 4 });
const moneyFormat = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "1,250.5"; "" for null (render nothing, never 0). */
export const fmtQty = (n) => (isNum(n) ? qtyFormat.format(Number(n)) : "");

/** "+2", "−3", "0"; "" for null. */
export const fmtSignedQty = (n) => {
  if (!isNum(n)) return "";
  const v = Number(n);
  if (v === 0) return "0";
  return `${v > 0 ? "+" : MINUS}${qtyFormat.format(Math.abs(v))}`;
};

/** "₹1,234.50"; "" for null. */
export const fmtMoney = (n) => (isNum(n) ? `${Number(n) < 0 ? MINUS : ""}₹${moneyFormat.format(Math.abs(Number(n)))}` : "");

/** "+₹45.00", "−₹180.00", "₹0.00"; "" for null. */
export const fmtSignedMoney = (n) => {
  if (!isNum(n)) return "";
  const v = Number(n);
  if (v === 0) return `₹${moneyFormat.format(0)}`;
  return `${v > 0 ? "+" : MINUS}₹${moneyFormat.format(Math.abs(v))}`;
};

export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ── Dates (instants from the server, shown in IST) ───────────────────────────
const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const dateFormat = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });

const toDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};
export const fmtDateTime = (iso) => {
  const d = toDate(iso);
  return d ? dateTimeFormat.format(d) : "";
};
export const fmtDate = (iso) => {
  const d = toDate(iso);
  return d ? dateFormat.format(d) : "";
};

// ── Labels ───────────────────────────────────────────────────────────────────
export const STATUS_META = {
  open: { label: "Counting", tone: "info" },
  submitted: { label: "Awaiting approval", tone: "warn" },
  approved: { label: "Approved", tone: "success" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};
export const statusMeta = (status) => STATUS_META[status] || { label: status || "Unknown", tone: "neutral" };

export const SCOPE_LABEL = { FULL: "Full count", SELECTED: "Selected items" };

// ── Line order ───────────────────────────────────────────────────────────────
/** Bin label (items without a bin last), then name, then id: the walk order. */
export const byBinThenName = (a, b) => {
  const ab = a.binLabel || null;
  const bb = b.binLabel || null;
  if (ab !== bb) {
    if (ab === null) return 1;
    if (bb === null) return -1;
    const c = ab.localeCompare(bb, "en", { numeric: true, sensitivity: "base" });
    if (c !== 0) return c;
  }
  const n = String(a.displayName || "").localeCompare(String(b.displayName || ""), "en", { sensitivity: "base" });
  if (n !== 0) return n;
  return (Number(a.id) || 0) - (Number(b.id) || 0);
};

// ── Server refusals ──────────────────────────────────────────────────────────
/**
 * The inventory error envelope `{status, message, code, details}` from a
 * rejected service call. `httpStatus` is null when no response came back
 * (dropped connection, timeout).
 */
export const errorInfo = (err) => {
  const response = err?.response || err?.message?.response || null;
  const data = response?.data || {};
  return {
    httpStatus: response?.status ?? null,
    code: typeof data.code === "string" ? data.code : null,
    details: data.details && typeof data.details === "object" ? data.details : {},
  };
};

/** Escape text before it goes into ConfirmationModal's HTML description. */
export const escapeHtml = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
