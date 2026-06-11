// Single source for ARC lifecycle status pills. Reused across list pages,
// detail pages, and the active dashboard. Status enum mirrors backend
// tbl_arc.status (see plan §4.1).

import styles from "./StatusBadge.module.scss";

const LABELS = {
  draft:                       { label: "Draft",                  tone: "muted" },
  floated:                     { label: "Floated",                tone: "info" },
  submission_closed:           { label: "Submission Closed",      tone: "info" },
  tech_eval_in_progress:       { label: "Tech Evaluation",        tone: "warning" },
  tech_eval_approved:          { label: "Tech Eval Approved",     tone: "warning" },
  tech_eval_rejected:          { label: "Tech Eval Rejected",     tone: "danger" },
  comm_eval_in_progress:       { label: "Commercial Eval",        tone: "warning" },
  comm_eval_finalized:         { label: "Awaiting Committee",     tone: "warning" },
  committee_review:            { label: "Committee Review",       tone: "warning" },
  committee_approved:          { label: "Committee Approved",     tone: "success" },
  committee_sent_back:         { label: "Sent Back",              tone: "warning" },
  committee_rejected:          { label: "Committee Rejected",     tone: "danger" },
  contract_generated:          { label: "Contract Generated",     tone: "success" },
  awaiting_vendor_acceptance:  { label: "Awaiting Vendor Sign",   tone: "warning" },
  contract_active:             { label: "Active",                 tone: "success" },
  expiring_soon:               { label: "Expiring Soon",          tone: "warning" },
  expired:                     { label: "Expired",                tone: "muted" },
  terminated:                  { label: "Terminated",             tone: "danger" },
  closed_no_award:             { label: "Closed (No Award)",      tone: "muted" },

  // MR statuses too — same component, single import.
  pending_approval:            { label: "Pending Approval",       tone: "warning" },
  approved:                    { label: "Approved",               tone: "success" },
  po_released:                 { label: "PO Released",            tone: "success" },
  rejected:                    { label: "Rejected",               tone: "danger" },
  cancelled:                   { label: "Cancelled",              tone: "muted" },

  // Vendor contract pseudo-statuses for the vendor portal.
  generated:                   { label: "Generated",              tone: "info" },
  awaiting_acceptance:         { label: "Awaiting Acceptance",    tone: "warning" },
  active:                      { label: "Active",                 tone: "success" },
  declined:                    { label: "Declined",               tone: "danger" },
};

export default function StatusBadge({ status, size = "md" }) {
  const entry = LABELS[status] || { label: status, tone: "muted" };
  const cls = `${styles.badge} ${styles[entry.tone]} ${size === "sm" ? styles.sm : ""}`;
  return <span className={cls}>{entry.label}</span>;
}
