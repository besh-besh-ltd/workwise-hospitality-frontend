// Shared helpers for the stock screens (stock list, item card, mark out,
// adjustments, setup, labels, scan home): routes, the movement and reason
// vocabulary, and the server refusals the stock API sends.
//
// Quantity maths and formatting come from the receive helpers (1/10000
// integer maths, so repeated scans never drift).

import { addQty, errorInfo, fmtQty, toQ } from "@/components/inventory/receive/receiveUtils";

// ── Routes ───────────────────────────────────────────────────────────────────
const BASE = "/dashboard/buyer/inventory";
const query = (params) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
};

export const stockRoutes = {
  overview: () => BASE,
  stock: ({ hotelId } = {}) => `${BASE}/stock${query({ hotelId })}`,
  item: (hotelId, invItemId) => `${BASE}/stock/${encodeURIComponent(hotelId)}/${encodeURIComponent(invItemId)}`,
  markOut: ({ hotelId, mode } = {}) => `${BASE}/out${query({ hotelId, mode })}`,
  adjustments: ({ hotelId, id } = {}) => `${BASE}/adjustments${query({ hotelId, id })}`,
  counts: () => `${BASE}/counts`,
  count: (id) => `${BASE}/counts/${encodeURIComponent(id)}`,
  receive: () => `${BASE}/receive`,
  grn: (id) => `${BASE}/grn/${encodeURIComponent(id)}`,
  setup: ({ tab, hotelId } = {}) => `${BASE}/setup${query({ tab, hotelId })}`,
  labels: ({ hotelId, items } = {}) =>
    `${BASE}/labels${query({ hotelId, items: Array.isArray(items) ? items.join(",") : items })}`,
  scan: () => `${BASE}/scan`,
};

/** A positive integer id from a route param, or null. */
export const toId = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// ── Vocabulary ───────────────────────────────────────────────────────────────
export const MOVEMENT_LABELS = {
  GRN_IN: "Received",
  RETURN_IN: "Returned to stock",
  ADJUST_IN: "Adjustment in",
  COUNT_IN: "Count gain",
  OPENING: "Opening stock",
  GRN_REVERSAL: "Receipt reversed",
  RTV_OUT: "Returned to vendor",
  MARK_OUT: "Marked out",
  ADJUST_OUT: "Adjustment out",
  COUNT_OUT: "Count loss",
};
export const movementLabel = (type) => MOVEMENT_LABELS[type] || type || "—";

/** Where a ledger row's document opens, when it has a page of its own. */
export const movementDocHref = (m) => {
  if (!m?.sourceId) return null;
  if (m.sourceType === "GRN") return stockRoutes.grn(m.sourceId);
  if (m.sourceType === "ADJ" && m.type !== "OPENING") return stockRoutes.adjustments({ id: m.sourceId });
  if (m.sourceType === "CNT") return stockRoutes.count(m.sourceId);
  return null;
};

// direction: "out" takes stock out (qty sent negative), "in" brings it in,
// "either" lets the person choose per line (backend sign rules, C3).
export const ADJUSTMENT_REASONS = [
  { value: "WASTAGE", label: "Wastage", direction: "out" },
  { value: "BREAKAGE", label: "Breakage", direction: "out" },
  { value: "EXPIRY", label: "Expired", direction: "out" },
  { value: "THEFT_LOSS", label: "Theft or loss", direction: "out" },
  { value: "FOUND", label: "Found", direction: "in" },
  { value: "CORRECTION", label: "Correction", direction: "either" },
];
export const reasonLabel = (code) =>
  ADJUSTMENT_REASONS.find((r) => r.value === code)?.label || (code === "OPENING" ? "Opening stock" : code || "—");
export const reasonDirection = (code) => ADJUSTMENT_REASONS.find((r) => r.value === code)?.direction || "either";

export const ADJUSTMENT_STATUS = {
  pending_approval: { label: "Pending approval", tone: "Warn" },
  posted: { label: "Posted", tone: "Ok" },
  rejected: { label: "Rejected", tone: "Bad" },
  draft: { label: "Draft", tone: "Neutral" },
};

// ── Quantities ───────────────────────────────────────────────────────────────
/** A signed quantity with a true minus sign ("−0.3", "+2"). */
export const fmtSigned = (n, { plus = false } = {}) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  if (num < 0) return `−${fmtQty(-num)}`;
  return `${plus && num > 0 ? "+" : ""}${fmtQty(num)}`;
};

/** Exact sum of quantities (stock units), via the 1/10000 integer maths. */
export const sumQty = (list) => list.reduce((acc, q) => addQty(acc, q), 0);
/** True when a typed quantity is a number > 0. */
export const isPositiveQty = (text) => {
  const q = toQ(text);
  return !Number.isNaN(q) && q > 0;
};

// ── Hotel levels (min ≤ reorder ≤ max) ──────────────────────────────────────
export const LEVEL_FIELDS = [
  { key: "minQty", label: "Min qty" },
  { key: "reorderLevel", label: "Reorder level" },
  { key: "maxQty", label: "Max qty" },
];

export const levelsForm = (levels) => ({
  minQty: levels?.minQty != null ? String(levels.minQty) : "",
  reorderLevel: levels?.reorderLevel != null ? String(levels.reorderLevel) : "",
  maxQty: levels?.maxQty != null ? String(levels.maxQty) : "",
  binLabel: levels?.binLabel || "",
});

const parseLevel = (text) => {
  const t = String(text ?? "").trim();
  if (t === "") return { value: null };
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return { error: "Enter zero or more" };
  return { value: n };
};

/** {payload} or {errors} for the levels form (server rule: min ≤ reorder ≤ max). */
export const checkLevels = (form) => {
  const errors = {};
  const out = {};
  for (const f of LEVEL_FIELDS) {
    const p = parseLevel(form[f.key]);
    if (p.error) errors[f.key] = p.error;
    else out[f.key] = p.value;
  }
  if (!errors.minQty && !errors.reorderLevel && out.minQty != null && out.reorderLevel != null && out.minQty > out.reorderLevel) {
    errors.minQty = "Min qty can't be more than the reorder level";
  }
  if (!errors.reorderLevel && !errors.maxQty && out.reorderLevel != null && out.maxQty != null && out.reorderLevel > out.maxQty) {
    errors.reorderLevel = "Reorder level can't be more than the max qty";
  }
  if (!errors.minQty && !errors.maxQty && out.minQty != null && out.maxQty != null && out.minQty > out.maxQty) {
    errors.minQty = errors.minQty || "Min qty can't be more than the max qty";
  }
  const bin = String(form.binLabel ?? "").trim();
  if (bin.length > 40) errors.binLabel = "Keep the bin to 40 characters";
  out.binLabel = bin || null;
  return Object.keys(errors).length ? { errors } : { payload: out };
};

// ── Server refusals ──────────────────────────────────────────────────────────
/** LOCKED {countId, countNumber}: an open count freezes the hotel's stock. */
export const freezeMessage = (details) =>
  `Stock is frozen while count ${details?.countNumber || ""} is open`.replace(/\s+/g, " ");

/**
 * Per-line problems out of a NEGATIVE_STOCK / VALIDATION refusal, keyed by
 * invItemId. `sentIds` is the payload's line order, so a line named only by
 * its index still lands on the right row.
 * @returns {{[invItemId:number]: {message:string, available?:number, requested?:number, maxReturnable?:number}}}
 */
export const lineProblems = (info, sentIds, { uomOf = () => "", verb = "marks out" } = {}) => {
  const out = {};
  const idFor = (l) => {
    if (l?.invItemId != null) return Number(l.invItemId);
    if (Number.isInteger(l?.index) && sentIds[l.index] != null) return Number(sentIds[l.index]);
    return null;
  };
  const d = info?.details || {};
  if (info?.code === "NEGATIVE_STOCK") {
    const short = Array.isArray(d.lines) && d.lines.length ? d.lines : [d];
    for (const l of short) {
      const id = idFor(l);
      if (id == null) continue;
      const uom = uomOf(id);
      out[id] = {
        message: `Only ${fmtQty(l.available)}${uom ? ` ${uom}` : ""} in stock; this session ${verb} ${fmtQty(l.requested)}.`,
        available: Number(l.available),
        requested: Number(l.requested),
      };
    }
  } else if (info?.code === "VALIDATION" && d.field === "lines") {
    const id = idFor(d);
    if (id != null) {
      out[id] = { message: info.message };
      if (d.maxReturnable != null) out[id].maxReturnable = Number(d.maxReturnable);
    }
  } else if (info?.code === "NOT_FOUND" && d.invItemId != null) {
    out[Number(d.invItemId)] = { message: "This item isn't available at this hotel." };
  }
  return out;
};

/**
 * What to say when approving or rejecting an adjustment is refused (C3:
 * FORBIDDEN SELF_APPROVAL, CONFLICT {status}, LOCKED, NEGATIVE_STOCK,
 * VALIDATION lines for a gain with no cost).
 */
export const adjustmentRefusal = (info) => {
  const d = info?.details || {};
  if (info?.code === "FORBIDDEN" && d.reason === "SELF_APPROVAL") {
    return "Another approver must approve your own adjustment";
  }
  if (info?.code === "FORBIDDEN") return "You can't approve adjustments at this hotel";
  if (info?.code === "CONFLICT") return "This adjustment is no longer waiting for approval";
  if (info?.code === "LOCKED") return freezeMessage(d);
  if (info?.code === "NEGATIVE_STOCK") {
    const l = Array.isArray(d.lines) && d.lines.length ? d.lines[0] : d;
    if (l?.available != null && l?.requested != null) {
      return `Only ${fmtQty(l.available)} of ${l.itemName || "an item"} in stock; this adjustment takes out ${fmtQty(l.requested)}.`;
    }
  }
  return info?.message || "Something went wrong";
};

export { errorInfo };
