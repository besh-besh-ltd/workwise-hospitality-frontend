// RFQ items closed without award — labels and small rules shared by the RFQ
// detail page, the close dialogs, the RFQ list and the vendor quote screens.
// The server is the source of truth (backend app/services/rfq/rfqItemClosure.js);
// this file only names what it returns.

/** Reasons a buyer can pick when closing items (server ITEM_CLOSE_REASONS). */
export const ITEM_CLOSE_REASONS = [
  { value: "no_quotes_received", label: "No quotes received" },
  { value: "all_vendors_regretted", label: "All vendors regretted" },
  { value: "technically_disqualified", label: "No vendor passed technical evaluation" },
  { value: "quotes_not_acceptable", label: "Quotes not acceptable (price or terms)" },
  { value: "requirement_cancelled", label: "Requirement cancelled" },
  { value: "sourced_elsewhere", label: "Sourced elsewhere" },
  { value: "other", label: "Other (add remarks)" },
];

const REASON_LABELS = {
  ...Object.fromEntries(ITEM_CLOSE_REASONS.map((r) => [r.value, r.label])),
  // Set by Close RFQ on items still open at the time.
  rfq_closed: "Closed with the RFQ",
};

export const itemCloseReasonLabel = (code) => (code ? REASON_LABELS[code] || code : null);

/** finalization_status the server sends for an item closed without award. */
export const CLOSED_FINALIZATION_STATUS = "Closed without award";

/** The item was closed without award (buyer or vendor payload). */
export const isItemClosed = (product) =>
  !!product?.closed_at || product?.finalization_status === CLOSED_FINALIZATION_STATUS;

/**
 * The item has a finalized vendor. A positive list: any other value (including
 * a closed item's) is NOT finalized.
 */
export const isItemFinalized = (finalizationStatus) =>
  finalizationStatus === "You are finalized" || finalizationStatus === "Another vendor is finalized";

/** Nothing more can happen on the item: a vendor is finalized, or it was closed. */
export const isItemSettled = (product) =>
  isItemFinalized(product?.finalization_status) || isItemClosed(product);

/** Why an item cannot be closed (server closeBlockers). */
export const CLOSE_BLOCKER_TEXT = {
  already_closed: "Already closed",
  awarded: "Already awarded",
  award_pending: "Award approval is pending",
  po_approval_pending: "Purchase order approval is pending",
  tech_approval_pending: "Technical approval is pending",
  tech_eval_pending: "Technical evaluation is in progress",
  negotiation_approval_pending: "Negotiation round approval is pending",
  negotiation_round: "A negotiation round is open",
  reverse_auction_running: "Reverse auction is running",
  rfq_not_live: "The RFQ is not live",
};

/** Blockers that need no explaining: the item is already finished. */
const SETTLED_BLOCKERS = new Set(["already_closed", "awarded"]);

/** Items the buyer may expect to close but can't yet, so the dialog says why. */
export const blockedItemsToExplain = (items) =>
  (items || []).filter(
    (i) => !i.closable && (i.blockers || []).some((b) => !SETTLED_BLOCKERS.has(b))
  );

/**
 * The RFQ's outcome from its items, for labels:
 *   fully_awarded → "Fully awarded"
 *   partially_awarded → "Partially awarded (3 of 5)"
 *   not_awarded → "Not awarded"
 *   in_progress → null (the stage says it), or "2 closed without award"
 *                 when some items are already closed
 */
export function awardOutcomeLabel(outcome, items) {
  const total = Number(items?.total) || 0;
  const awarded = Number(items?.awarded) || 0;
  const closed = Number(items?.closed_no_award) || 0;
  switch (outcome) {
    case "fully_awarded":
      return "Fully awarded";
    case "partially_awarded":
      return total ? `Partially awarded (${awarded} of ${total})` : "Partially awarded";
    case "not_awarded":
      return "Not awarded";
    case "in_progress":
      return closed > 0 ? `${closed} closed without award` : null;
    default:
      return null;
  }
}
