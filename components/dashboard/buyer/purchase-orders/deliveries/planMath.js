// Quantity and date helpers for the Deliveries tab.
//
// Quantities are handled as integers of 1/10000, the backend's numeric(18,4)
// scale (planService.parseQty), so sums, remainders and splits never drift
// through floating point: 0.1 + 0.2 must allocate exactly 0.3 kg.

export const SCALE = 10000;

const QTY_INPUT = /^\d+(\.\d{1,4})?$/;

/** A quantity (number or decimal string) as 1/10000 units; NaN when it isn't one. */
export function toQ(value) {
  if (value === null || value === undefined) return 0;
  const s = String(value).trim();
  if (s === "") return 0;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return Math.round(Number(s) * SCALE);
}

/** True when a typed quantity is blank or a non-negative number with at most 4 decimals. */
export const isQtyInput = (value) => {
  const s = String(value ?? "").trim();
  return s === "" || QTY_INPUT.test(s);
};

/** 1/10000 units back to an exact decimal string ("12.5", "3", "0.0001"). */
export function qtyString(q) {
  const neg = q < 0;
  const a = Math.abs(q);
  const whole = Math.floor(a / SCALE);
  const frac = a % SCALE;
  const s = frac ? `${whole}.${String(frac).padStart(4, "0").replace(/0+$/, "")}` : String(whole);
  return neg ? `-${s}` : s;
}

/** Display form of a quantity: Indian grouping, up to 4 decimals. */
export const fmtQty = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 4 });
};

/** Display form of 1/10000 units. */
export const fmtQ = (q) => fmtQty(q / SCALE);

/**
 * Split `q` (1/10000 units) into `n` shares, the remainder on the first one.
 * A whole quantity splits in whole units (10 → 4, 3, 3); a fractional one in
 * 1/10000 units.
 */
export function splitEvenly(q, n) {
  if (!n || n < 1) return [];
  const unit = q % SCALE === 0 ? SCALE : 1;
  const units = Math.round(q / unit);
  const base = Math.floor(units / n);
  const rem = units - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + rem : base) * unit);
}

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written YYYY-MM-DD. */
export function isDay(value) {
  const m = DAY.exec(String(value ?? ""));
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

/** 'YYYY-MM-DD' plus `days` calendar days (no time zone involved). */
export function addDays(day, days) {
  const m = DAY.exec(day);
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + days));
  return d.toISOString().slice(0, 10);
}

/** "Hotel A-1 · Phase 2", or "To be allocated · Phase 1" for the unallocated row. */
export const deliveryLabel = (d) => `${d.hotelName || "To be allocated"} · Phase ${d.phaseNo}`;

/** Open delivery statuses: something is still expected. */
export const isOpenDelivery = (d) => d.status === "open" || d.status === "partial";

/**
 * Per delivery line, the qty the buyer short-closed by hand and has not
 * reopened (close rows minus reopen rows). Rows written by a CREDIT return
 * (rtvId set) are left out: credited qty can't be reopened.
 * @returns {Map<number, number>} deliveryLineId → 1/10000 units
 */
export function manualShortClosed(shortCloses = []) {
  const net = new Map();
  for (const r of shortCloses) {
    if (r.rtvId != null) continue;
    const q = toQ(r.qty);
    if (!Number.isFinite(q)) continue;
    const sign = r.action === "reopen" ? -1 : 1;
    net.set(r.deliveryLineId, (net.get(r.deliveryLineId) || 0) + sign * q);
  }
  return net;
}

export const SHORT_CLOSE_REASONS = [
  { code: "vendor_cannot_supply", label: "Vendor cannot supply" },
  { code: "no_longer_needed", label: "No longer needed" },
  { code: "substituted", label: "Substituted" },
  { code: "price_dispute", label: "Price dispute" },
  { code: "other", label: "Other" },
];

export const reasonLabel = (code) => SHORT_CLOSE_REASONS.find((r) => r.code === code)?.label || code || "—";
