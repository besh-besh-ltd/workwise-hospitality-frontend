/** Money and date helpers. Indian conventions throughout — this is an India book. */

/** ₹1,84,24,00 → "₹18.42 L"; crores past a crore. Compact, for tiles and chips. */
export const inrCompact = (value) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${n}`;
};

/** Full lakh-crore grouping, for tables and totals where the exact figure matters. */
export const inr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const num = (value) => new Intl.NumberFormat("en-IN").format(Number(value) || 0);

/** "2026-06-28" → "28 Jun 2026" */
export const date = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export const pct = (value, digits = 0) => `${Number(value || 0).toFixed(digits)}%`;
