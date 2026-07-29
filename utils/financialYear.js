// frontend/utils/financialYear.js
// Indian Financial Year helpers. FY "YYYY-YY+1" runs 1 Apr YYYY → 31 Mar YYYY+1.
// Used by the FY filter on the RFQ / ARC / MR listing pages.

export const FY_START_YEAR = 2023; // earliest FY offered in the dropdown (bump as needed)

// The FY *start year* for a given date (Jan/Feb/Mar belong to the previous FY).
export function fyStartYearOf(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = d.getMonth(); // 0=Jan … 11=Dec
  return m >= 3 ? y : y - 1; // Apr (3) onward → this year; Jan–Mar → previous
}

// Canonical label, e.g. 2026 → "2026-27".
export function fyLabel(startYear) {
  const end = (startYear + 1) % 100;
  return `${startYear}-${String(end).padStart(2, "0")}`;
}

// Current FY label from today (or a supplied date).
export function currentFy(date = new Date()) {
  return fyLabel(fyStartYearOf(date));
}

// "2026-27" | 2026 → { from: "2026-04-01", to: "2027-03-31" } (inclusive calendar days).
export function fyToRange(fy) {
  const startYear = typeof fy === "number"
    ? fy
    : parseInt(String(fy).slice(0, 4), 10);
  if (!Number.isFinite(startYear)) return { from: "", to: "" };
  return { from: `${startYear}-04-01`, to: `${startYear + 1}-03-31` };
}

// Dropdown options, newest FY first, from FY_START_YEAR up to the current FY.
export function fyOptions(date = new Date()) {
  const latest = fyStartYearOf(date);
  const out = [];
  for (let y = latest; y >= FY_START_YEAR; y--) {
    out.push({ value: fyLabel(y), label: `FY ${fyLabel(y)}`, startYear: y });
  }
  return out;
}

// The current FY as a pre-applied date window — { from, to } for dateFrom/dateTo.
export function currentFyRange(date = new Date()) {
  return fyToRange(currentFy(date));
}

// The default FY-filter display state: the current financial year, pre-selected.
// Used as the initial selection on the RFQ / ARC / MR listing pages.
export function defaultFyState(date = new Date()) {
  return { mode: "fy", fy: currentFy(date), from: "", to: "" };
}
