// Plain-language reasons a rejected PO cannot be restored. Codes come from the
// backend's recovery guards (vendor undo and buyer send-back share them).
const COPY = {
  UNDO_WINDOW_EXPIRED: "The 24-hour window to undo has passed.",
  RFQ_CLOSED: "The RFQ has been closed.",
  PRODUCT_REAWARDED: "Some items on this order have been awarded to another vendor.",
  REPLACEMENT_PO_EXISTS: "A newer purchase order already covers some items on this order.",
  AWARD_APPROVAL_PENDING: "A new award for some items is waiting for approval.",
  NEGOTIATION_IN_PROGRESS: "A negotiation round is open or awaiting approval for some items.",
  VENDOR_NOT_QUALIFIED: "The vendor no longer passes the technical evaluation for some items.",
  AWARD_HISTORY_MISSING: "The original award could not be found.",
  CONTRACT_NOT_ACTIVE: "The rate contract is no longer active.",
  CONTRACT_QUANTITY_EXCEEDED: "The rate contract no longer has enough quantity left.",
  REQUISITION_CHANGED: "The requisition has changed since the rejection.",
  NOT_REJECTED_BY_VENDOR: "This order is no longer in the rejected state.",
};

const DEFAULT_COPY = "This order can't be restored right now.";

export const recoveryBlockerMessage = (code) =>
  Object.prototype.hasOwnProperty.call(COPY, code) ? COPY[code] : DEFAULT_COPY;
