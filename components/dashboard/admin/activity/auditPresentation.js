/**
 * Turning a row-level audit diff into something an administrator can read.
 *
 * The diffing was never the problem — unchanged columns are already dropped,
 * so a `tbl_users` UPDATE collapses from 28 columns to the one that moved.
 * What reached the screen was the raw material: a monospace `bid_end_date`, a
 * verbatim `2026-09-05 14:30:00`, a bare `true`, and `tbl_rfq_purchase_order
 * #528`. That is a database row, not an answer to "what changed?".
 *
 * Scope is set by measurement rather than by guesswork. Across staging's audit
 * history the fields that actually change are a short list — status, comment,
 * the RFQ dates, is_head_office, a few ids — so those are named, and anything
 * unnamed falls back to a humanised column name. Nothing is ever hidden for
 * want of a label: an unlabelled change is still a real change.
 *
 * `bid_end_date` → "Quote submission end date" already exists twice in this
 * codebase (rfqController.RFQ_FIELD_LABELS and RFQEditHistory's hand-copy of
 * it). This is the third surface that needs it; the RFQ pair should collapse
 * into this module when someone next touches them.
 */

/** Columns that record bookkeeping rather than the change itself. */
const NOISE_FIELDS = new Set([
  "updated_at",
  "updated_by",
  "created_at",
  "created_by",
  "timestamp",
  "modified_at",
  "version",
  // The record's own id is already in the block header ("User #445"), and on a
  // delete it renders as "Id 1041 → Empty", which says nothing.
  "id",
  "publish_attempts",
  "last_publish_attempt_at",
]);

export const isNoiseField = (field) => NOISE_FIELDS.has(field);

/**
 * Business names for the columns that move. Measured from the audit trail —
 * these are the fields that actually appear in a diff.
 */
const FIELD_LABELS = {
  // RFQ
  bid_end_date: "Quote submission end date",
  tender_publish_date: "Tender publish date",
  vendor_clarification_date: "Vendor clarification end date",
  ra_start_date: "Reverse auction start",
  ra_end_date: "Reverse auction end",
  rfq_type: "RFQ type",
  reverse_auction: "Reverse auction",
  tender_fees: "Tender fees",
  is_published: "Published",
  is_tender: "Tender",
  location: "Delivery location",
  company_name: "Company name",
  contact_name: "Contact name",
  contact_number: "Contact number",
  response_email: "Response email",
  // Organisation
  is_head_office: "Head office",
  is_deleted: "Archived",
  hospitality_company_id: "Company",
  hotel_id: "Business unit",
  department_id: "Department",
  process_id: "Process",
  region: "Region",
  // People and access
  user_type: "User type",
  role_id: "Role",
  permission_id: "Permission",
  mapping_type: "Mapping type",
  // Approvals
  decision_rule: "Decision rule",
  step_order: "Level",
  approver_source_type: "Approver source",
  approver_source_id: "Approver",
  approver_user_id: "Approver",
  current_step: "Current level",
  entity_type: "Applies to",
  removal_reason: "Reason for removal",
  // Evaluation and quoting
  buyer_marks: "Buyer's marks",
  buyer_id: "Evaluated by",
  score_timestamp: "Scored at",
  unit_price: "Unit price",
  total_price: "Total price",
};

/** Table names as the nouns an administrator would use. */
const TABLE_LABELS = {
  tbl_rfq: "RFQ",
  tbl_rfq_products: "RFQ product",
  tbl_rfq_products_specs: "Product specification",
  tbl_rfq_purchase_order: "Purchase order",
  tbl_rfq_product_target_price: "Target price",
  tbl_rfq_product_tech_evaluation: "Technical evaluation",
  tbl_rfq_product_tech_evaluation_clauses: "Evaluation clause",
  tbl_rfq_product_tech_evaluation_comments: "Evaluation comment",
  tbl_rfq_product_tech_evaluation_cleared_vendors: "Cleared vendor",
  tbl_rfq_product_tech_evaluation_vendors_response: "Vendor response",
  tbl_quotes: "Quote",
  tbl_quote_items: "Quote line",
  tbl_quote_finalization: "Award",
  tbl_users: "User",
  tbl_roles: "Role",
  tbl_role_permissions: "Role permission",
  tbl_user_role_scopes: "Role assignment",
  tbl_user_department: "Department membership",
  tbl_department: "Department",
  tbl_hospitality_companies: "Company",
  tbl_hospitality_company_hotels: "Business unit",
  tbl_hospitality_user_mappings: "Unit membership",
  tbl_approval_policies: "Approval workflow",
  tbl_approval_policy_steps: "Approval level",
  tbl_approval_processes: "Process",
  tbl_approval_instances: "Approval",
  tbl_approval_instance_steps: "Approval level",
  tbl_approval_step_approvers: "Approver",
};

const EM_DASH = "—";

const humanise = (s) =>
  String(s)
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());

export const labelForField = (field) => {
  if (!field) return EM_DASH;
  return FIELD_LABELS[field] || humanise(field);
};

export const labelForTable = (table) => {
  if (!table) return EM_DASH;
  return TABLE_LABELS[table] || humanise(String(table).replace(/^tbl_/, ""));
};

/** Columns whose value is a foreign key rather than a quantity. */
const isIdField = (field) => /(^|_)id$/.test(String(field || "")) && field !== "id";

/**
 * Flags, including the smallint ones Postgres hands back as 0/1 through JSONB.
 * Restricted to fields whose name says they are boolean — otherwise
 * `tender_fees: 1` would render as "Yes".
 */
const isFlagField = (field) => /^(is_|has_|can_)/.test(String(field || ""));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad2 = (n) => String(n).padStart(2, "0");

/**
 * A timestamp as written, not shifted.
 *
 * These values are read straight out of a row snapshot and the two columns
 * families in this database disagree about zone — buyer-entered dates are IST
 * wall clocks, CURRENT_TIMESTAMP columns are UTC. Reformatting the digits
 * without moving them is the only reading that is right for both; converting
 * would silently shift half of them by five and a half hours.
 */
const formatTimestamp = (raw) => {
  const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, hh, mi] = m;
  const h = Number(hh);
  const h12 = ((h + 11) % 12) + 1;
  return `${d} ${MONTHS[Number(mo) - 1]} ${y}, ${pad2(h12)}:${mi} ${h >= 12 ? "pm" : "am"}`;
};

/**
 * One cell of a before/after row.
 *
 * `labels` lets a caller supply resolved names for foreign keys —
 * `{ hotel_id: { 14: "The Orchid Pune" } }` — so "#14" can become the unit's
 * name where the server knows it.
 */
export const formatAuditValue = (field, value, { labels } = {}) => {
  if (value === null || value === undefined || value === "") return "Empty";

  const resolved = labels?.[field]?.[value];
  if (resolved) return String(resolved);

  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? "" : "s"}`;
  if (typeof value === "object") {
    const n = Object.keys(value).length;
    return `${n} field${n === 1 ? "" : "s"}`;
  }

  if (isFlagField(field)) {
    if (value === true || value === 1 || value === "1" || value === "true") return "Yes";
    if (value === false || value === 0 || value === "0" || value === "false") return "No";
  }

  if (typeof value === "string") {
    const asTime = formatTimestamp(value);
    if (asTime) return asTime;
  }

  if (isIdField(field) && (typeof value === "number" || /^\d+$/.test(String(value)))) {
    return `#${value}`;
  }

  return String(value);
};
