// PR step thresholds ("only when the PR value is at least X").
//
// Money is a decimal STRING end to end: up to 16 integer digits and 2 decimals
// does not survive a float, so nothing here ever calls Number()/parseFloat().

const MIN_AMOUNT_RE = /^\d{1,16}(\.\d{1,2})?$/;

/** Blank is valid (no threshold); otherwise digits with at most 2 decimals, never negative. */
export const isValidMinAmount = (value) => {
  if (value === null || value === undefined) return true;
  const v = String(value).trim();
  return v === "" || MIN_AMOUNT_RE.test(v);
};

/** What goes on the wire: the trimmed string, or null when blank. */
export const normalizeMinAmount = (value) => {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  return v === "" ? null : v;
};

/** "12500000.5" -> "₹1,25,00,000.5" (Indian grouping, string-safe). */
export const formatMinAmount = (value) => {
  const v = normalizeMinAmount(value);
  if (v === null || !MIN_AMOUNT_RE.test(v)) return v === null ? "" : `₹${v}`;
  const [int, dec] = v.split(".");
  const head = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  const grouped = int.length > 3 ? `${head},${int.slice(-3)}` : int;
  return `₹${grouped}${dec !== undefined ? `.${dec}` : ""}`;
};

export const MIN_AMOUNT_ERROR = "Enter an amount of 0 or more with at most 2 decimals.";
