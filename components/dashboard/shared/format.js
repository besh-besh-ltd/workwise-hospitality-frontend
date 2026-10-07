/* Money formatting for every buyer-dashboard surface — one implementation
 * instead of a copy per card (each copy handled negatives and bad input
 * differently). Indian grouping: K / L (lakh) / Cr (crore). */

const MINUS = "−";
const RUPEE = "₹";
const trimZeros = (s) => s.replace(/\.?0+$/, "");

// Pick the unit AFTER rounding, so 99,999 reads "₹1L" rather than "₹100.0K".
const compactPositive = (n) => {
  const cr = n / 1e7;
  if (Number(cr.toFixed(2)) >= 1) return `${RUPEE}${trimZeros(cr.toFixed(2))}Cr`;
  const l = n / 1e5;
  if (Number(l.toFixed(2)) >= 1) return `${RUPEE}${trimZeros(l.toFixed(2))}L`;
  if (Math.round(n) >= 1000) return `${RUPEE}${(n / 1e3).toFixed(1)}K`;
  return `${RUPEE}${Math.round(n).toLocaleString("en-IN")}`;
};

/**
 * Compact INR: 0 → "₹0", 1234 → "₹1.2K", 150000 → "₹1.5L", 3.4e7 → "₹3.4Cr".
 * Negative values keep the sign in front of the symbol: "−₹1.5L".
 * null / undefined / NaN / non-numeric → `empty` ("—" by default), so a
 * missing figure is never shown as a real ₹0.
 */
export const formatMoney = (value, { empty = "—" } = {}) => {
  if (value === null || value === undefined || value === "") return empty;
  const n = Number(value);
  if (!Number.isFinite(n)) return empty;
  if (n === 0) return `${RUPEE}0`;
  const body = compactPositive(Math.abs(n));
  return n < 0 ? `${MINUS}${body}` : body;
};

/** Exact INR with Indian grouping: 1234567 → "₹12,34,567". */
export const formatMoneyExact = (value, { empty = "—" } = {}) => {
  if (value === null || value === undefined || value === "") return empty;
  const n = Number(value);
  if (!Number.isFinite(n)) return empty;
  const abs = `${RUPEE}${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
  return n < 0 ? `${MINUS}${abs}` : abs;
};
