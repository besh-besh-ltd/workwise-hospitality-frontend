/* Vendor-friendly status labels for the pill (distinct from the buyer copy). */
export const VENDOR_STATUS_LABELS = {
  acceptance_pending: "Awaiting you",
  sent: "Awaiting you",
  approved: "Accepted",
  dispatched: "Dispatched",
  invoice_raised: "Invoice raised",
  GRN: "Received",
  delivered: "Received",
  completed: "Completed",
  rejected_by_vendor: "Rejected",
  rejected: "Rejected",
  cancelled: "Cancelled",
  draft: "Draft",
  pending: "Pending",
  pending_approval: "Pending",
};
export const vendorStatusLabel = (s) => VENDOR_STATUS_LABELS[s] || (s ? String(s) : "—");
