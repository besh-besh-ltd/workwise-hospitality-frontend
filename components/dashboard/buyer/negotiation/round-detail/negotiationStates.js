// The negotiation state vocabulary — ONE table, both surfaces.
//
// The listing and the round-detail page used to disagree about what a round
// was for 89.5% of production rows: the listing rendered a derived
// `neg_status` while the page read the raw `status` column, so a row labelled
// "Cancelled" in the list opened a page headed "Expired". They also disagreed
// about CASE — "Pending Approval" in the list, "Pending approval" on the page.
//
// The server now derives the state (negotiationModel.deriveNegotiationState)
// and sends it as `neg_status` on listing rows and `round.state` on the detail
// payload. This file is the client mirror of that table: the same seven keys,
// the same labels, verbatim. It exists so the copy lives in ONE place and so a
// payload that predates the server change still renders something honest.
//
// LABELS ARE SENTENCE CASE. Do not Title-Case them back.

export const NEG_STATE = {
  AWAITING_APPROVAL: "awaiting_approval",
  OPEN_WITH_VENDORS: "open_with_vendors",
  READY_FOR_DECISION: "ready_for_decision",
  NO_VENDOR_RESPONSE: "no_vendor_response",
  CONCLUDED: "concluded",
  LAPSED: "lapsed",
  CANCELLED: "cancelled",
};

/**
 * `tone`  → arc_v2 `.status-pill` variant
 * `badge` → arc_v2 `.cc-badge` / hero chip variant
 * `order` → lifecycle sort order
 */
export const NEG_STATE_PRESENTATION = {
  [NEG_STATE.AWAITING_APPROVAL]: {
    key: NEG_STATE.AWAITING_APPROVAL,
    label: "Awaiting your approval",
    description: "Waiting for an internal approver before vendors are notified.",
    tone: "committee",
    badge: "committee",
    heroChip: "committee",
    order: 0,
    pulse: true,
  },
  [NEG_STATE.OPEN_WITH_VENDORS]: {
    key: NEG_STATE.OPEN_WITH_VENDORS,
    label: "Open with vendors",
    description: "Vendors invited and can still submit revised prices.",
    tone: "active",
    badge: "active",
    heroChip: "active",
    order: 1,
    pulse: false,
  },
  [NEG_STATE.READY_FOR_DECISION]: {
    key: NEG_STATE.READY_FOR_DECISION,
    label: "Ready for your decision",
    description:
      "Window closed and vendors responded — choose which quotes to take forward.",
    tone: "awaiting",
    badge: "awaiting",
    heroChip: "eval",
    order: 2,
    pulse: true,
  },
  [NEG_STATE.NO_VENDOR_RESPONSE]: {
    key: NEG_STATE.NO_VENDOR_RESPONSE,
    label: "Closed — no vendor response",
    description: "Window closed, no vendor replied. Nothing to evaluate.",
    tone: "closed",
    badge: "expired",
    heroChip: "expired",
    order: 3,
    pulse: false,
  },
  [NEG_STATE.CONCLUDED]: {
    key: NEG_STATE.CONCLUDED,
    label: "Concluded",
    description: "Quotes from this round were selected and approved.",
    tone: "success",
    badge: "active",
    heroChip: "active",
    order: 4,
    pulse: false,
  },
  [NEG_STATE.LAPSED]: {
    key: NEG_STATE.LAPSED,
    label: "Lapsed — never approved",
    description:
      "The approval deadline passed before anyone approved it, so this round never reached vendors.",
    tone: "expired",
    badge: "expired",
    heroChip: "expired",
    order: 5,
    pulse: false,
  },
  [NEG_STATE.CANCELLED]: {
    key: NEG_STATE.CANCELLED,
    label: "Cancelled",
    description: "Someone cancelled this round deliberately.",
    tone: "danger",
    badge: "expired",
    heroChip: "rejected",
    order: 6,
    pulse: false,
  },
};

/** Display order for tabs and the legend. */
export const NEG_STATE_SEQUENCE = Object.values(NEG_STATE_PRESENTATION)
  .slice()
  .sort((a, b) => a.order - b.order)
  .map((s) => s.key);

const UNKNOWN_STATE = {
  key: null,
  label: "Unknown",
  description: "This round is in a state the application does not recognise.",
  tone: "neutral",
  badge: "draft",
  heroChip: "draft",
  order: 9,
  pulse: false,
};

// Legacy inputs this file still has to understand:
//   • the five-bucket `neg_status` the listing used before this change
//   • the raw tbl_negotiation_rounds.status column
//   • the AWAITING_DECISION pseudo-status from getEffectiveRoundStatus
//
// A legacy value can only ever be mapped to its closest new state — the extra
// information the new taxonomy carries (did anyone respond? was a quote
// approved?) is not in the string. `deriveNegotiationState` below is the
// honest path and is used whenever the counts ARE available.
const LEGACY_STATE_ALIASES = {
  // previous derived buckets
  pending_approval: NEG_STATE.AWAITING_APPROVAL,
  active: NEG_STATE.OPEN_WITH_VENDORS,
  awaiting_decision: NEG_STATE.READY_FOR_DECISION,
  completed: NEG_STATE.CONCLUDED,
  // raw column values
  draft: NEG_STATE.AWAITING_APPROVAL,
  ended: NEG_STATE.READY_FOR_DECISION,
  closed: NEG_STATE.READY_FOR_DECISION,
  expired: NEG_STATE.LAPSED,
  cancelled: NEG_STATE.CANCELLED,
  rejected: NEG_STATE.CANCELLED,
  // getEffectiveRoundStatus output
  awaiting: NEG_STATE.READY_FOR_DECISION,
};

/** Coerce any status-ish string to one of the seven keys, or null. */
export function toNegState(value) {
  const k = String(value ?? "").trim().toLowerCase();
  if (!k) return null;
  if (NEG_STATE_PRESENTATION[k]) return k;
  return LEGACY_STATE_ALIASES[k] ?? null;
}

export function negStatePresentation(value) {
  const key = toNegState(value);
  return key ? NEG_STATE_PRESENTATION[key] : UNKNOWN_STATE;
}

/**
 * Client mirror of the server ladder (negotiationModel.deriveNegotiationState).
 * Used only when the payload carries a raw status plus the counts — never to
 * second-guess a state the server already derived.
 */
export function deriveNegotiationState({
  status,
  endDate = null,
  responseCount = 0,
  hasApprovedQuote = false,
} = {}) {
  const raw = String(status ?? "").trim().toUpperCase();
  if (raw === "DRAFT" || raw === "PENDING_APPROVAL") return NEG_STATE.AWAITING_APPROVAL;
  if (raw === "EXPIRED") return NEG_STATE.LAPSED;
  if (raw === "CANCELLED" || raw === "REJECTED") return NEG_STATE.CANCELLED;

  // Naive DB timestamps are UTC — the same normalisation roundDetailModel does.
  let endMs = null;
  if (endDate) {
    const s = String(endDate);
    const iso = !s.includes("Z") && !/[+-]\d{2}:?\d{2}$/.test(s) ? s.replace(" ", "T") + "Z" : s;
    const t = new Date(iso).getTime();
    endMs = Number.isNaN(t) ? null : t;
  }
  const windowOpen = endMs == null || endMs > Date.now();
  if (raw === "ACTIVE" && windowOpen) return NEG_STATE.OPEN_WITH_VENDORS;
  if (raw === "COMPLETED") return NEG_STATE.CONCLUDED;

  if (Number(responseCount || 0) === 0) return NEG_STATE.NO_VENDOR_RESPONSE;
  if (hasApprovedQuote) return NEG_STATE.CONCLUDED;
  return NEG_STATE.READY_FOR_DECISION;
}

/** States where the round is finished and the page renders it as history. */
export function isTerminalState(value) {
  const k = toNegState(value);
  return (
    k === NEG_STATE.CANCELLED ||
    k === NEG_STATE.LAPSED ||
    k === NEG_STATE.NO_VENDOR_RESPONSE ||
    k === NEG_STATE.CONCLUDED
  );
}

/**
 * States that never reached a vendor, so the page must not present their
 * targets as a negotiation that "failed" — nothing was ever asked of anyone.
 */
export function neverReachedVendors(value) {
  const k = toNegState(value);
  return k === NEG_STATE.LAPSED || k === NEG_STATE.AWAITING_APPROVAL;
}

/**
 * Tab groups for the listing strip.
 *
 * Eight sentence-length status tabs wrapped onto a second line, and per user
 * the median number of NON-EMPTY status tabs is 2 (max 5). Membership mirrors
 * the server's NEG_PARENT_ACTION_STATES and is DERIVED from isTerminalState,
 * so there is no third hand-written copy of the split to drift.
 *
 * awaiting_approval and open_with_vendors read as 0 parents in production right
 * now, and are deliberately INSIDE needs_attention rather than dropped: they
 * are short-lived (median dwell 133 min and 258 min respectively) and they are
 * the only two states that ever need a human.
 */
export const NEG_STATE_GROUPS = [
  {
    key: "needs_attention",
    label: "Needs attention",
    members: new Set(NEG_STATE_SEQUENCE.filter((k) => !isTerminalState(k))),
  },
  {
    key: "closed",
    label: "Closed",
    members: new Set(NEG_STATE_SEQUENCE.filter((k) => isTerminalState(k))),
  },
];

/** Which group a state belongs to, or null for an unrecognised value. */
export function groupOfState(value) {
  const k = toNegState(value);
  return NEG_STATE_GROUPS.find((g) => g.members.has(k))?.key || null;
}
