// Purchase requisition formatting + error copy.
//
// Money and quantities arrive as NUMERIC strings. Nothing here touches float
// arithmetic: values are split into integer and fraction digits and handled as
// BigInt, so ₹ 12,50,00,000.75 stays exact. The server recomputes every total;
// lineValue() only drives the live total while the user types.

import { getApiErrorMessage } from "@/utils/apiError";

const DECIMAL = /^(\d+)(?:\.(\d*))?$/;

// "  12.50 " | 12.5 -> { int: "12", frac: "50" } | null
const parseDecimal = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  const m = DECIMAL.exec(s);
  return m ? { int: m[1], frac: m[2] || "" } : null;
};

const groupIndian = (digits) => {
  const d = digits.replace(/^0+(?=\d)/, "");
  if (d.length <= 3) return d;
  const last3 = d.slice(-3);
  const rest = d.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
};

/** "1250000.75" -> "₹12,50,000.75"; whole amounts show no decimals. */
export const formatINR = (v) => {
  const p = parseDecimal(v);
  if (!p) return "—";
  // Round to paise (half-up) on the digit string.
  let paise = BigInt(p.int + (p.frac + "00").slice(0, 2));
  if (p.frac.length > 2 && p.frac.charCodeAt(2) >= 53) paise += 1n; // third digit >= '5'
  const s = paise.toString().padStart(3, "0");
  const rupees = s.slice(0, -2);
  const pp = s.slice(-2);
  return `₹${groupIndian(rupees)}${pp === "00" ? "" : `.${pp}`}`;
};

/** "0.500" -> "0.5", "12.000" -> "12". */
export const formatQty = (v) => {
  const p = parseDecimal(v);
  if (!p) return "";
  const frac = p.frac.replace(/0+$/, "");
  const int = p.int.replace(/^0+(?=\d)/, "");
  return frac ? `${int}.${frac}` : int;
};

/**
 * ROUND(qty * price, 2) as a "123.45" string, half-up, via BigInt.
 * Returns null while either input is blank or not a number.
 */
export const lineValue = (qty, price) => {
  const q = parseDecimal(qty);
  const pr = parseDecimal(price);
  if (!q || !pr) return null;
  const scale = q.frac.length + pr.frac.length;
  let prod = BigInt(q.int + q.frac) * BigInt(pr.int + pr.frac); // scale digits after the point
  if (scale > 2) {
    const div = 10n ** BigInt(scale - 2);
    const half = div / 2n;
    prod = (prod + half) / div;
  } else if (scale < 2) {
    prod *= 10n ** BigInt(2 - scale);
  }
  const s = prod.toString().padStart(3, "0");
  return `${s.slice(0, -2)}.${s.slice(-2)}`;
};

/**
 * Exact sum of NUMERIC strings at the widest scale among the terms:
 * ["2.500", "3"] -> "5.500" (BigInt, never float). null when the list is
 * empty or any term is blank / not a number.
 */
export const sumDecimals = (values) => {
  const parts = (values || []).map(parseDecimal);
  if (!parts.length || parts.some((p) => !p)) return null;
  const scale = Math.max(...parts.map((p) => p.frac.length));
  const total = parts.reduce((acc, p) => acc + BigInt(p.int + p.frac.padEnd(scale, "0")), 0n);
  if (!scale) return total.toString();
  const s = total.toString().padStart(scale + 1, "0");
  return `${s.slice(0, -scale)}.${s.slice(-scale)}`;
};

export const STATUS_LABEL = {
  draft: "Draft",
  in_review: "In technical review",
  pending_approval: "Pending approval",
  returned: "Returned",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

export const PROGRESS_LABEL = {
  pending: "Awaiting approval",
  in_pool: "In purchase queue",
  needs_mapping: "Needs catalog mapping",
  awaiting_catalog: "Awaiting catalog item",
  in_sourcing: "In sourcing",
  ordered: "Ordered",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const HEADER_PROGRESS_LABEL = {
  in_queue: "In queue",
  partly_in_sourcing: "Partly in sourcing",
  in_sourcing: "In sourcing",
  partly_ordered: "Partly ordered",
  ordered: "Ordered",
  completed: "Completed",
};

export const ERROR_COPY = {
  PR_NO_POLICY: "No approval chain is set up for purchase requisitions at this hotel. Ask your admin to add one.",
  PR_STEP_UNRESOLVED: "An approval step has nobody assigned. Ask your admin to fix the PR approval chain.",
  // Viewer-neutral: the last reviewer completing a review sees this too, not only the requester.
  PR_NO_INDEPENDENT_APPROVER: "No approver other than the requester is available for this PR — contact your admin.",
  PR_NO_REVIEWER: "No technical reviewer is set up for one of the departments. Ask your admin.",
  PR_LINE_ON_CONTRACT: "This item is on an active rate contract. Raise a Material Requisition instead.",
  PR_VARIANT_NOT_USABLE: "This catalog item can't be used right now.",
  PR_STATE_CONFLICT: "This PR changed since you opened it. Refresh to see the latest.",
  PR_LINE_NOT_CONVERTIBLE: "Some selected lines can't be converted.",
  PR_UNIT_MISMATCH: "The same item is requested in different units. Select lines with one unit.",
  PR_HOTEL_MISMATCH: "An RFQ is for one hotel. Select lines from a single hotel.",
  PR_SPEC_TOO_LONG: "The combined specification for one item is too long for an RFQ (max 1000 characters). Convert those lines in separate RFQs.",
};

const NETWORK_COPY = "Couldn't reach the server. Check your connection and try again.";

// Services in this app sometimes reject with the AxiosError itself, sometimes
// wrapped as { message: AxiosError }. Find the error body in either shape.
// THE helper for reading a failed PR / approval call's body — use it, don't copy it.
export const errorBody = (err) => {
  if (!err || typeof err !== "object") return null;
  return err.response?.data || err.data || err.message?.response?.data || (err.code || err.status !== undefined ? err : null);
};

/** HTTP status of a failed call (either shape), or null when there was no response. */
export const errorStatus = (err) => {
  const s = err?.response?.status ?? err?.message?.response?.status;
  return typeof s === "number" ? s : null;
};

const isNetworkError = (err) => {
  const e = err?.message && typeof err.message === "object" ? err.message : err;
  if (!e || typeof e !== "object") return false;
  if (e.response) return false;
  return e.isAxiosError === true || e.message === "Network Error" || e.code === "ERR_NETWORK";
};

/**
 * Human copy for any failure from /pr/* (body { status:0, code, message }) or
 * the generic approval endpoint (body { status:3, message }). Known codes map
 * to ERROR_COPY; otherwise the server message; otherwise a safe default.
 */
export const errorCopy = (err) => {
  const body = errorBody(err);
  const code = body?.code;
  if (code && ERROR_COPY[code]) return ERROR_COPY[code];
  if (isNetworkError(err)) return NETWORK_COPY;
  if (typeof body?.message === "string" && body.message.trim()) return body.message.trim();
  return getApiErrorMessage(err);
};
