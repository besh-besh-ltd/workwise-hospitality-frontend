// frontend/utils/negotiationTime.js
// ----------------------------------------------------------------------------
// THE ONE FORMATTER for every timestamp on a negotiation surface.
//
// Why this file exists, and why it is not `formatDisplayDate`:
//
// Four independent copies of the same three-line "naive DB timestamps are UTC"
// parser grew in the negotiation tree — roundDetailModel, parentRow,
// negotiationStates and ApproveRoundPage — each with a near-identical comment,
// none shared. The copies made the area look fixed. The bug lived in the
// fourteen places where none of them was imported and the code just called
// `moment(raw)` or `new Date(raw)`, which read a naive UTC string as local wall
// clock and rendered a 12:30 PM IST deadline as 07:00 AM. That is ticket 1.
//
// `utils/sharedFunctions.formatDisplayDate` is NOT the answer. Its contract is
// the opposite one — "backend sends dates in IST without timezone suffix, parse
// as local time" — which is right for its 78 call sites across 34 files and
// wrong for every negotiation timestamp. Changing it would move every RFQ bid
// deadline in the product 5h30m late. Negotiation gets its own helper; that is
// this file.
//
// TIMEZONE: pinned to Asia/Kolkata, deadlines suffixed "IST".
// Two people in two zones reading two different times off one deadline IS
// ticket 1 again, and the vendor's own notification email already quotes the
// deadline in IST. So this does not render in the viewer's zone — it renders
// the one time everybody in the negotiation is working to.
//
// IST is a fixed +05:30 with no DST, so the shift is arithmetic rather than an
// Intl lookup: deterministic, and identical under every test runner and every
// browser locale.

export const NEGOTIATION_TIMEZONE = "Asia/Kolkata";

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const EM_DASH = "—";

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * A negotiation timestamp as a real instant, or null when it is unusable.
 *
 * A bare `"2026-08-13 07:00:00"` off a `timestamp without time zone` column is
 * UTC (the backend now labels these, but older payloads and cached responses
 * still carry the naive form, so both are accepted). Anything already carrying
 * `Z` or an offset is honoured as written — this is idempotent on ISO input.
 */
export function parseNegotiationTime(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  const s = String(raw);
  const iso = !s.includes("Z") && !/[+-]\d{2}:?\d{2}$/.test(s) ? s.replace(" ", "T") + "Z" : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Calendar/clock fields of an instant AS READ IN IST. */
function istParts(d) {
  const shifted = new Date(d.getTime() + IST_OFFSET_MS);
  return {
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth(),
    year: shifted.getUTCFullYear(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

/** "13 Aug 2026" — IST calendar date. */
export function formatNegotiationDate(raw, fallback = EM_DASH) {
  const d = parseNegotiationTime(raw);
  if (!d) return fallback;
  const { day, month, year } = istParts(d);
  return `${pad2(day)} ${MON[month]} ${year}`;
}

/** "13 Aug 2026, 12:30 PM" — IST wall clock. */
export function formatNegotiationDateTime(raw, fallback = EM_DASH) {
  const d = parseNegotiationTime(raw);
  if (!d) return fallback;
  const { day, month, year, hours, minutes } = istParts(d);
  const h12 = ((hours + 11) % 12) + 1;
  return `${pad2(day)} ${MON[month]} ${year}, ${pad2(h12)}:${pad2(minutes)} ${hours >= 12 ? "PM" : "AM"}`;
}

/**
 * "13 Aug 2026, 12:30 PM IST" — for a moment somebody has to ACT before.
 *
 * The suffix is not decoration. A deadline is the one timestamp where a
 * reader in another zone doing the conversion in their head gets it wrong,
 * and the vendor's email already says IST.
 */
export function formatNegotiationDeadline(raw, fallback = EM_DASH) {
  const formatted = formatNegotiationDateTime(raw, null);
  return formatted == null ? fallback : `${formatted} IST`;
}

/** "in 3 days" / "2 days ago", or null when the timestamp is unusable. */
export function negotiationRelative(raw, now = Date.now()) {
  const d = parseNegotiationTime(raw);
  if (!d) return null;
  const diff = d.getTime() - now;
  const abs = Math.abs(diff);
  const day = 86400000;
  const unit =
    abs < 3600000
      ? [Math.round(abs / 60000), "minute"]
      : abs < day
      ? [Math.round(abs / 3600000), "hour"]
      : [Math.round(abs / day), "day"];
  const [n, u] = unit;
  const plural = n === 1 ? u : `${u}s`;
  return diff >= 0 ? `in ${n} ${plural}` : `${n} ${plural} ago`;
}

/**
 * The `min` for an `<input type="datetime-local">`, in the viewer's LOCAL zone.
 *
 * LOCAL, deliberately — unlike everything else here. The control itself reads
 * and writes local wall clock, so a `min` built from `toISOString().slice(0,16)`
 * (UTC) is 5h30m adrift of the thing it is constraining and lets an Indian
 * buyer pick a deadline up to 5h30m in the past. Mirrors the pattern
 * ArcStepReview.js already had right.
 *
 * `offsetMs` pushes the floor forward — pass 5 * 60 * 1000 for "at least five
 * minutes out".
 */
export function localDateTimeInputMin(offsetMs = 0) {
  const d = new Date(Date.now() + offsetMs);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(
    d.getHours()
  )}:${pad2(d.getMinutes())}`;
}

/**
 * The inverse of the above: what instant does a `<input type="datetime-local">`
 * value denote?
 *
 * `"2026-08-13T12:30"` is LOCAL wall clock, so it must NOT go through
 * parseNegotiationTime — that would read it as 12:30 UTC and land 5h30m late.
 * The distinction is the seam ticket 1 fell through: StepReview takes
 * `formData.end_date` from the wizard (this shape) and from the API (a UTC
 * instant) and used one parser for both. Two shapes, two parsers, named.
 */
export function parseLocalDateTimeInput(value) {
  if (!value) return null;
  // ES2016+: a date-time form with no offset is parsed as local time.
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * "13 Aug 2026, 07:00 UTC" — the wizard's "this is what will be stored" hint.
 *
 * The only place negotiation renders UTC rather than IST, and it is deliberate:
 * it tells the buyer what the server will hold, right under the local control
 * they just typed into.
 */
export function formatUtcDateTime(raw, fallback = EM_DASH) {
  const d = raw instanceof Date ? raw : parseNegotiationTime(raw);
  if (!d || Number.isNaN(d.getTime())) return fallback;
  return `${pad2(d.getUTCDate())} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad2(
    d.getUTCHours()
  )}:${pad2(d.getUTCMinutes())} UTC`;
}
