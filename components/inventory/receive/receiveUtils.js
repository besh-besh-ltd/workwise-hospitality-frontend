// Shared helpers for the receive screens: quantity maths in 1/10000 units (the
// server's numeric(18,4), so no float drift), formatting, unit rules, request
// ids, the server's error envelope, and the GrnInput builder.

import { getApiErrorMessage } from "@/utils/apiError";
import { formatNegotiationDateTime } from "@/utils/negotiationTime";

// ── Quantities ───────────────────────────────────────────────────────────────
const SCALE = 10000;

/** Text or number → 1/10000 integer; NaN when it is not a number. */
export const toQ = (v) => {
  if (v === null || v === undefined) return 0;
  const s = String(v).replace(/,/g, "").trim();
  if (s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * SCALE) : NaN;
};
export const fromQ = (q) => q / SCALE;
/** Exact a + b / a − b at 4 decimal places. */
export const addQty = (a, b) => fromQ(toQ(a) + toQ(b));
export const subQty = (a, b) => fromQ(toQ(a) - toQ(b));
/** A quantity typed by hand: a number ≥ 0, else null. Blank is 0. */
export const parseQty = (text) => {
  const q = toQ(text);
  if (Number.isNaN(q) || q < 0) return null;
  return fromQ(q);
};
/** The text an input shows for a quantity ("6", "98.5"). */
export const qtyText = (n) => String(fromQ(toQ(n)));
/** Display: Indian grouping, up to 4 decimals ("1,250", "98.5"). */
export const fmtQty = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("en-IN", { maximumFractionDigits: 4 });
};
export const fmtQtyUnit = (n, unit) => `${fmtQty(n)}${unit ? ` ${unit}` : ""}`;

// Units that are weighed or measured rather than counted: a scan cannot mean
// "one more", so it opens the qty pad instead (spec §10.2).
const DECIMAL_UNITS = new Set([
  "kg", "kgs", "kilo", "kilos", "kilogram", "kilograms", "g", "gm", "gms", "gram", "grams", "gr", "mg",
  "l", "lt", "ltr", "ltrs", "litre", "litres", "liter", "liters", "ml",
  "m", "mtr", "mtrs", "meter", "meters", "metre", "metres", "cm", "mm", "ft", "feet",
  "sqft", "sq ft", "sqm", "sq m", "cbm", "ton", "tons", "tonne", "tonnes", "quintal",
]);
export const isDecimalUnit = (unit) =>
  DECIMAL_UNITS.has(String(unit || "").trim().toLowerCase().replace(/\.$/, ""));

// ── Money and dates ──────────────────────────────────────────────────────────
export const inr = (n) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** 'YYYY-MM-DD' → '24 Oct 2026' (a calendar day: no time zone involved). */
export const fmtDay = (day) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(day || ""));
  if (!m) return "—";
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
};
/** An ISO instant shown in IST. */
export const fmtInstant = (iso) => formatNegotiationDateTime(iso);
/** Today's calendar day in IST (receipts are dated in hotel time). */
export const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);

/** Whole days from `from` to `to` ('YYYY-MM-DD'), or null. */
export const daysBetween = (from, to) => {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
};

// ── Request ids ──────────────────────────────────────────────────────────────
/** A v4 UUID for clientEventId (crypto.randomUUID needs a secure context). */
export const newClientEventId = () => {
  const c = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (c?.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// ── Server refusals ──────────────────────────────────────────────────────────
/**
 * The inventory error envelope `{status, message, code, details}` from a
 * rejected service call, plus a display-safe message.
 */
export const errorInfo = (err, fallback) => {
  const data = err?.response?.data || err?.message?.response?.data || {};
  return {
    httpStatus: err?.response?.status ?? err?.message?.response?.status ?? null,
    code: data.code || null,
    details: data.details && typeof data.details === "object" ? data.details : {},
    message: getApiErrorMessage(err, fallback),
  };
};

// ── Rejection reasons (backend REJECTION_REASONS) ────────────────────────────
export const REJECTION_REASONS = [
  { value: "damaged", label: "Damaged" },
  { value: "quality", label: "Quality issue" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "short_shelf_life", label: "Short shelf life" },
  { value: "temperature", label: "Temperature" },
  { value: "excess", label: "Excess qty" },
  { value: "other", label: "Other" },
];
export const rejectionLabel = (value) => REJECTION_REASONS.find((r) => r.value === value)?.label || value || "—";

// ── Receive form state ───────────────────────────────────────────────────────
export const HEADER_FIELDS = [
  "receivedAt", "vendorChallanNo", "vendorChallanDate", "vendorInvoiceNo", "vendorInvoiceDate",
  "ewayBillNo", "vehicleNo", "remarks",
];

export const blankHeader = () => ({
  dispatchId: "",
  receivedAt: istToday(),
  vendorChallanNo: "",
  vendorChallanDate: "",
  vendorInvoiceNo: "",
  vendorInvoiceDate: "",
  ewayBillNo: "",
  vehicleNo: "",
  remarks: "",
});

/** Fresh entry state for one ReceiveContext line. */
export const blankLine = (ctxLine, { departmentId = null } = {}) => ({
  received: "",
  rejected: "",
  reason: "",
  batchNo: "",
  mfgDate: "",
  expiryDate: "",
  markOut: !!ctxLine?.defaultMarkOutOnArrival,
  departmentId: departmentId != null ? String(departmentId) : "",
  uomFactor: "",
  mapToInvItemId: null,
  matchDecided: false,
  remarks: "",
  scannedAt: 0,
});

/** Entry state from a saved draft line (server Grn line). */
export const lineFromDraft = (d, ctxLine, defaults) => {
  const base = blankLine(ctxLine, defaults);
  return {
    ...base,
    received: d.receivedQty ? qtyText(d.receivedQty) : "",
    rejected: d.rejectedQty ? qtyText(d.rejectedQty) : "",
    reason: d.rejectionReason || "",
    batchNo: d.batchNo || "",
    mfgDate: d.mfgDate || "",
    expiryDate: d.expiryDate || "",
    markOut: d.markOutDepartmentId != null ? true : base.markOut,
    departmentId: d.markOutDepartmentId != null ? String(d.markOutDepartmentId) : base.departmentId,
    uomFactor: d.uomFactor != null && ctxLine?.needsUomFactor ? qtyText(d.uomFactor) : "",
    mapToInvItemId: d.invItemId && ctxLine && !ctxLine.invItemId ? d.invItemId : null,
    matchDecided: !!(d.invItemId && ctxLine && !ctxLine.invItemId),
    remarks: d.remarks || "",
  };
};

/** Received / rejected / accepted (accepted = received − rejected) as numbers. */
export const lineQty = (entry) => {
  const received = parseQty(entry?.received);
  const rejected = parseQty(entry?.rejected);
  if (received === null || rejected === null) return { received, rejected, accepted: null, valid: false };
  const accepted = subQty(received, rejected);
  return { received, rejected, accepted, valid: accepted >= 0 };
};

const textOrNull = (v) => {
  const s = typeof v === "string" ? v.trim() : v;
  return s === "" || s === undefined ? null : s;
};

/** GrnInput lines: every line with something received or rejected. */
export const buildLinesPayload = (ctxLines, entries, { allowMarkOut = true } = {}) => {
  const out = [];
  for (const l of ctxLines) {
    const e = entries[l.poLineId];
    if (!e) continue;
    const { received, rejected, accepted, valid } = lineQty(e);
    if (!valid || (received === 0 && rejected === 0)) continue;
    const factor = e.uomFactor !== "" ? parseQty(e.uomFactor) : null;
    out.push({
      poLineId: l.poLineId,
      receivedQty: received,
      acceptedQty: accepted,
      rejectedQty: rejected,
      rejectionReason: rejected > 0 ? textOrNull(e.reason) : null,
      uomFactor: factor && factor > 0 ? factor : null,
      mapToInvItemId: e.mapToInvItemId || null,
      markOutDepartmentId: allowMarkOut && e.markOut && e.departmentId ? Number(e.departmentId) : null,
      batchNo: l.trackExpiry ? textOrNull(e.batchNo) : null,
      mfgDate: l.trackExpiry ? textOrNull(e.mfgDate) : null,
      expiryDate: l.trackExpiry ? textOrNull(e.expiryDate) : null,
      remarks: textOrNull(e.remarks),
    });
  }
  return out;
};

/** GrnInput (without post / clientEventId). */
export const buildGrnInput = ({ poId, hotelId, header, ctxLines, entries, allowMarkOut }) => {
  const input = {
    poId: Number(poId),
    hotelId: Number(hotelId),
    dispatchId: header.dispatchId ? Number(header.dispatchId) : null,
    lines: buildLinesPayload(ctxLines, entries, { allowMarkOut }),
  };
  for (const key of HEADER_FIELDS) input[key] = textOrNull(header[key]);
  return input;
};

/**
 * Checks a receiver can fix before posting. Returns {[poLineId]: message} plus
 * `form` for a form-level problem, or null when the receipt can be posted.
 */
export const validateForPost = (ctxLines, entries, { allowMarkOut = true } = {}) => {
  const errors = {};
  let any = false;
  for (const l of ctxLines) {
    const e = entries[l.poLineId];
    if (!e) continue;
    const { received, rejected, accepted, valid } = lineQty(e);
    if (received === null || rejected === null) {
      errors[l.poLineId] = "Enter a number";
      continue;
    }
    if (!valid) {
      errors[l.poLineId] = "Rejected can't be more than received";
      continue;
    }
    if (received > 0) any = true;
    if (rejected > 0 && !e.reason) errors[l.poLineId] = "Pick a reason for the rejected qty";
    else if (accepted > 0 && l.trackExpiry && !e.expiryDate) errors[l.poLineId] = "Enter the expiry date";
    else if (allowMarkOut && accepted > 0 && e.markOut && !e.departmentId) {
      errors[l.poLineId] = "Pick the department to mark out to";
    } else if (e.uomFactor !== "" && !(parseQty(e.uomFactor) > 0)) {
      errors[l.poLineId] = "The unit conversion must be more than 0";
    }
  }
  if (!any && !Object.keys(errors).length) errors.form = "Enter a received qty on at least one line";
  return Object.keys(errors).length ? errors : null;
};

/** True when the form holds anything worth saving as a draft. */
export const hasContent = (header, entries) =>
  Object.values(entries).some((e) => e && (toQ(e.received) > 0 || toQ(e.rejected) > 0)) ||
  ["vendorChallanNo", "vendorInvoiceNo", "ewayBillNo", "vehicleNo", "remarks"].some((k) => String(header[k] || "").trim());

// ── Routes ───────────────────────────────────────────────────────────────────
const BASE = "/dashboard/buyer/inventory";
export const routes = {
  awaiting: () => `${BASE}/receive`,
  receive: (poId, { hotelId, dispatchId } = {}) => {
    const q = new URLSearchParams();
    if (hotelId) q.set("hotelId", String(hotelId));
    if (dispatchId) q.set("dispatch", String(dispatchId));
    const s = q.toString();
    return `${BASE}/receive/${encodeURIComponent(poId)}${s ? `?${s}` : ""}`;
  },
  grn: (id) => `${BASE}/grn/${encodeURIComponent(id)}`,
  grnRegister: ({ poId } = {}) => `${BASE}/grn${poId ? `?poId=${encodeURIComponent(poId)}` : ""}`,
  po: (poId) => `/dashboard/buyer/purchase-orders/${encodeURIComponent(poId)}`,
};
