// Labels and helpers shared by the coverage, routing and "Assigned to me"
// pages. Values mirror backend/app/constants/vendorNetwork.js exactly.

import { formatDisplayDate } from "@/utils/sharedFunctions";

// Coverage resolver specificity (services/vendorNetwork/coverage.js): HOTEL 3, CITY 2, STATE 1.
export const SPECIFICITY_LABEL = { 3: "Hotel rule", 2: "City rule", 1: "State rule" };

export const SCOPE_TYPES = ["STATE", "CITY", "HOTEL"];
export const SCOPE_LABEL = { STATE: "State", CITY: "City", HOTEL: "Hotel" };
export const MODE_LABEL = { INCLUDE: "Include", EXCLUDE: "Exclude" };

export const ROUTING_MODES = ["ADMIN_ROUTES", "AUTO_SINGLE_MATCH"];
export const ROUTING_MODE_LABEL = {
  ADMIN_ROUTES: "Admin routes",
  AUTO_SINGLE_MATCH: "Auto-route single match",
};

export const SUBJECT_LABEL = { RFQ: "RFQ", ARC_HOTEL: "Rate contract" };

export const ASSIGNMENT_STATUS = {
  PENDING: { label: "Pending", tone: "info" },
  ACCEPTED: { label: "Accepted", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  TIMED_OUT: { label: "Timed out", tone: "warn" },
  REVOKED: { label: "Revoked", tone: "neutral" },
  SUPERSEDED: { label: "Superseded", tone: "neutral" },
};

export const DECLINE_REASONS = ["NO_STOCK", "CANNOT_MEET_DEADLINE", "OUT_OF_AREA", "OTHER"];
export const DECLINE_REASON_LABEL = {
  NO_STOCK: "No stock",
  CANNOT_MEET_DEADLINE: "Can't meet the deadline",
  OUT_OF_AREA: "Outside our area",
  OTHER: "Other",
};

/**
 * A server timestamp (TIMESTAMPTZ, ISO with offset) in the viewer's local time,
 * or the naive-IST bid_end_date text as the vendor RFQ pages show it: both go
 * through the same formatDisplayDate those pages use.
 */
export const fmtDateTime = (value) => (value ? formatDisplayDate(value, { includeTime: true }) : "—");

/** The key of one routing subject: type + id + hotel (null for an RFQ). */
export const subjectKey = (type, id, hotelId) => `${type}:${id}:${hotelId ?? 0}`;

/** "Hotel rule · covers every hotel · preference 2" for one ranked candidate. */
export function candidateWhy(c, totalHotels) {
  const parts = [SPECIFICITY_LABEL[c.specificity] || "Coverage rule"];
  const covered = Array.isArray(c.hotels_covered) ? c.hotels_covered.length : 0;
  if (c.covers_all_hotels) parts.push(covered > 1 ? `covers all ${covered} hotels` : "covers the hotel");
  else if (totalHotels) parts.push(`covers ${covered} of ${totalHotels} hotels`);
  else parts.push(`covers ${covered} hotel${covered === 1 ? "" : "s"}`);
  if (c.preference_rank != null) parts.push(`preference ${c.preference_rank}`);
  return parts.join(" · ");
}

// Routing refusals whose server sentence does not say what to do next. Every
// other refusal shows the server's message (networkErrorMessage).
export const ROUTING_ERROR_OVERRIDES = {
  NOT_FOUND: "This item can no longer be routed. The queue has been refreshed.",
  ASSIGNEE_NOT_ELIGIBLE:
    "That entity can't take work right now: it must be active, not the principal, and have an active seat.",
  ALREADY_ACCEPTED: "That entity has already accepted this item. Pick a different entity to reassign it.",
  ORG_ALREADY_QUOTED: "Your network has already quoted on this RFQ, so it can't be routed again.",
  GROUP_ARC_ONLY: "Fulfilment routing is available for group rate contracts only.",
  CONFLICT: "Someone else routed this item at the same time. The queue has been refreshed; check it and retry.",
  QUOTE_SUBMITTED:
    "The entity has already submitted a quote on this RFQ. It must regret its quote before the assignment can be revoked or reassigned.",
};
