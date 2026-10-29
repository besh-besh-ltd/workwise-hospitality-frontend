// A PO "on hold" is an open information request to a named person. The backend
// sends it per PO as `hold`; the RFQ-level state is derived here (ruling R18),
// so the timeline and the PO cards always word it identically.
import { REASON_LABELS } from "@/components/dashboard/buyer/purchase-orders/sendBackReasons";

export const reasonLabel = (code) => (code ? REASON_LABELS[code] || REASON_LABELS.OTHER : null);

// "On hold, waiting on {name} for: {reason}"
export function holdLine(hold) {
  if (!hold) return null;
  const who = hold.target?.name || "someone";
  const why = reasonLabel(hold.reason_category);
  return `On hold, waiting on ${who}${why ? ` for: ${why}` : ""}`;
}

const time = (h) => new Date(h?.since).getTime() || 0;

// Summary across a stage's POs: the oldest hold's line plus "+N more".
// null when nothing is held (or on a payload that predates `hold`).
export function holdSummary(pos) {
  const holds = (Array.isArray(pos) ? pos : []).map((p) => p?.hold).filter(Boolean);
  if (!holds.length) return null;
  const oldest = [...holds].sort((a, b) => time(a) - time(b))[0];
  const more = holds.length - 1;
  return { line: `${holdLine(oldest)}${more > 0 ? ` +${more} more` : ""}` };
}
