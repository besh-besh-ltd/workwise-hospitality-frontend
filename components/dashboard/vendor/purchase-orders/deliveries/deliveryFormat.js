// Labels and quantity arithmetic for the vendor's Deliveries section and its
// dispatch note. Quantities are numeric(18,4) on the server; sums here are
// done on integers scaled by 10,000 (as the server does) so 2.5 + 0.1 never
// prints as 2.6000000000000001.

const SCALE = 10000;

/** A quantity as an integer number of ten-thousandths. Non-numbers are 0. */
export const toQ = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * SCALE) : 0;
};
export const fromQ = (q) => q / SCALE;

/** "1,250.5": Indian grouping, up to 4 decimals, nothing trailing. */
export const qtyText = (v) => {
  if (v == null || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 4 });
};

/** A scaled quantity as an input value: "17.5", or "" for nothing. */
export const qtyInput = (q) => (q > 0 ? String(fromQ(q)) : "");

/** Today as YYYY-MM-DD in the browser's zone (the vendor's own calendar day). */
export const todayIso = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const laterDay = (a, b) => (!a ? b : !b ? a : a > b ? a : b);

export const REJECTION_LABELS = Object.freeze({
  damaged: "Damaged",
  quality: "Quality issue",
  wrong_item: "Wrong item",
  short_shelf_life: "Short shelf life",
  temperature: "Temperature breach",
  excess: "Excess quantity",
  other: "Other",
});

export const SHORT_CLOSE_LABELS = Object.freeze({
  vendor_cannot_supply: "Vendor cannot supply",
  no_longer_needed: "No longer needed",
  substituted: "Substituted",
  price_dispute: "Price dispute",
  other: "Other",
});

/* tone: the PO module's pill modifiers (pillSuccess / pillWarn / pillInfo /
   pillNeutral). */
export const DELIVERY_STATUS = Object.freeze({
  open: { label: "Open", tone: "pillNeutral" },
  partial: { label: "Part received", tone: "pillInfo" },
  received: { label: "Received", tone: "pillSuccess" },
  short_closed: { label: "Short-closed", tone: "pillNeutral" },
});

export const DISPATCH_STATUS = Object.freeze({
  in_transit: { label: "In transit", tone: "pillInfo" },
  received: { label: "Received", tone: "pillSuccess" },
  cancelled: { label: "Withdrawn", tone: "pillNeutral" },
});

export const GRN_STATUS = Object.freeze({
  posted: { label: "Received", tone: "pillSuccess" },
  partially_reversed: { label: "Partly reversed", tone: "pillWarn" },
  reversed: { label: "Reversed", tone: "pillWarn" },
});

export const RTV_DISPOSITION = Object.freeze({
  REPLACE: "For replacement",
  CREDIT: "Against credit note",
});

export const RTV_STATUS = Object.freeze({
  dispatched: { label: "Sent back", tone: "pillWarn" },
  closed: { label: "Closed", tone: "pillNeutral" },
});

export const RECEIPT_STATUS = Object.freeze({
  not_received: { label: "Nothing received yet", tone: "pillNeutral" },
  partial: { label: "Part received", tone: "pillInfo" },
  received: { label: "All received", tone: "pillSuccess" },
  closed_short: { label: "Closed short", tone: "pillNeutral" },
});

export const UNSPLIT_LABEL = "Not yet split by hotel";

/** "Lotus Konark · Phase 2", or "Not yet split by hotel · Phase 1". */
export const deliveryLabel = (d = {}) =>
  `${d.hotelId == null ? UNSPLIT_LABEL : d.hotelName || "Hotel"} · Phase ${d.phaseNo ?? "—"}`;

/** A plan line worth a row: something planned, or something already happened. */
export const lineHasActivity = (l = {}) =>
  toQ(l.plannedQty) > 0 || toQ(l.acceptedQty) > 0 || toQ(l.rejectedQty) > 0 || toQ(l.shortClosedQty) > 0;

/** A delivery the vendor can still send goods against. */
export const isOpenDelivery = (d = {}) =>
  d.status !== "received" &&
  d.status !== "short_closed" &&
  (d.lines || []).some((l) => toQ(l.openQty) > 0);

/** {poLineId → scaled open qty} of one delivery (phase). */
export const phaseOpen = (delivery) => {
  const out = new Map();
  for (const l of delivery?.lines || []) {
    const id = Number(l.poLineId);
    out.set(id, (out.get(id) || 0) + Math.max(0, toQ(l.openQty)));
  }
  return out;
};

/**
 * {poLineId → scaled qty} a dispatch may carry, as the server caps it: at a
 * hotel, what is open in that hotel's phases plus the share not yet split by
 * hotel; with no hotel, what is open on each PO line.
 */
export const openCaps = (data, hotelId) => {
  const out = new Map();
  if (hotelId == null) {
    for (const l of data?.poLines || []) out.set(Number(l.id), Math.max(0, toQ(l.openQty)));
    return out;
  }
  for (const d of data?.deliveries || []) {
    if (d.hotelId != null && Number(d.hotelId) !== Number(hotelId)) continue;
    for (const [id, q] of phaseOpen(d)) out.set(id, (out.get(id) || 0) + q);
  }
  return out;
};
