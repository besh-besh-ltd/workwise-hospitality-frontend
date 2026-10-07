// The GST split of a call-off PO (Vendor Networks spec §6.4): the backend's PO detail
// sends pricing.tax_breakdown = [{ label, rate, amount }] — CGST + SGST (or UTGST)
// within a state, IGST across states, or one legacy "GST" row when either state is
// unknown. RFQ POs carry no breakdown.

const SPLIT_LABELS = new Set(["CGST", "SGST", "UTGST", "IGST"]);

const fmtRate = (rate) => {
  if (rate == null || rate === "") return "";
  const n = Number(rate);
  return Number.isFinite(n) ? ` ${Number(n.toFixed(3))}%` : "";
};

/**
 * Rows to print instead of a single GST line: [{ key, label, amount }] such as
 * "CGST 9%" / "SGST 9%" or "IGST 18%". null when the PO has no split to show (no
 * breakdown, or only the single legacy GST row), so callers keep their existing line.
 */
export function gstSplitRows(pricing) {
  const rows = Array.isArray(pricing?.tax_breakdown) ? pricing.tax_breakdown : [];
  if (!rows.some((r) => SPLIT_LABELS.has(r?.label))) return null;
  return rows.map((r, i) => ({
    key: `${r.label}-${r.rate ?? "na"}-${i}`,
    label: `${r.label}${fmtRate(r.rate)}`,
    amount: Number(r.amount) || 0,
  }));
}
