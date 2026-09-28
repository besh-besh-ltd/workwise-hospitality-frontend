/* ────────────────────────────────────────────────────────────
   Dashboard deep links — the ONLY place a dashboard widget
   should build a URL.
   ────────────────────────────────────────────────────────────
 *
 * Every function returns a path under /dashboard/buyer that exists in
 * pages/ and whose page reads every query param emitted here. That contract
 * is enforced by dashboardLinks.test.js (static route + param check), so a
 * link that 404s or silently lands on an unfiltered list fails CI instead of
 * reaching a user.
 *
 * API (examples):
 *
 *   rfqDetail(512)                         /dashboard/buyer/rfq-management-details?id=512
 *   rfqDetail(512, { stage: "technical" }) …&id=512&stage=technical
 *   resumeDraft(512)                       /dashboard/buyer/rfq-management-edit?draft_id=512
 *   rfqList({ tab: "pending", status: ["RFQ_APPROVAL"] })
 *                                          /dashboard/buyer/rfq-management?tab=pending&status=RFQ_APPROVAL
 *   rfqListView("closing_soon")            /dashboard/buyer/rfq-management?tab=ongoing&status=AWAITING_QUOTES,TECHNICAL_AWAITING_QUOTES&sort=deadline
 *   rfqListForStage("negotiation")         /dashboard/buyer/rfq-management?status=NEGOTIATION_ONGOING
 *   techEval({ rfqId: 9, rfqProductId: 4 }) /dashboard/buyer/technical-evaluation?rfq_id=9&prod_id=4
 *   quoteCompare(9)                        /dashboard/buyer/quote-compare?rfq=9
 *   negotiationForRfq(9)                   /dashboard/buyer/negotiation/9
 *   negotiationList({ needsMyApproval: true })
 *                                          /dashboard/buyer/negotiation?needs_my_approval=1
 *   negotiationRoundApproval(9)            /dashboard/buyer/negotiation/9/approve
 *   poDetail(77)                           /dashboard/buyer/purchase-orders/77
 *   poList({ status: "action-required" })  /dashboard/buyer/purchase-orders?status=action-required
 *   poTracking({ tab: "active" })          /dashboard/buyer/purchase-orders/tracking?tab=active
 *   arcContract(5, { stage: "technical" }) /dashboard/buyer/rate-contracts/5?stage=technical
 *   materialRequisition(3)                 /dashboard/buyer/material-requisitions/3
 *   approvalHref("PO", { poId: 77 })       /dashboard/buyer/purchase-orders/77
 *   approvalQueue("RFQ")                   /dashboard/buyer/rfq-management?tab=pending&status=RFQ_APPROVAL
 *   reports()                              /dashboard/buyer/reports
 *
 * Unknown / missing ids return the safest list page rather than a broken
 * detail URL ("…?id=undefined").
 */

const BASE = "/dashboard/buyer";

/** Serialise a flat params object, skipping empty values. Arrays → comma list. */
const qs = (params = {}) => {
  const parts = [];
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || v === false) return;
    const val = Array.isArray(v) ? v.filter((x) => x !== undefined && x !== null && x !== "").join(",") : v === true ? "1" : String(v);
    if (val === "") return;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(val).replace(/%2C/g, ",")}`);
  });
  return parts.length ? `?${parts.join("&")}` : "";
};

const hasId = (id) => id !== undefined && id !== null && id !== "" && String(id) !== "undefined" && String(id) !== "null";

/* ─── RFQ ─────────────────────────────────────────────────── */

/** Lifecycle stage tabs on the RFQ detail page (rfqLifecycleShaper keys). */
export const RFQ_DETAIL_STAGES = ["overview", "technical", "negotiation-award", "purchase-order"];

/** RFQ list status keys (server `_statusKey`, RfqListPage STATUS_META). */
export const RFQ_STATUS_KEYS = [
  "DRAFT", "RFQ_APPROVAL", "AWAITING_QUOTES", "TECHNICAL_AWAITING_QUOTES", "TECHNICAL_EVALUATING",
  "TECHNICAL_APPROVING", "TECHNICAL_REJECTED", "RFQ_STUCK_TECHNICAL", "RFQ_STUCK_COMMERCIAL",
  "COMMERCIAL_EVALUATION", "NEGOTIATION_ONGOING", "QUOTATION_APPROVAL", "AWAITING_PO", "PO_APPROVAL",
  "PO_VENDOR_REJECTED", "APPROVED_COMPLETED", "CLOSED", "WITHDRAWN",
];

/** RFQ list tabs accepted by POST /rfq/list-view. */
export const RFQ_LIST_TABS = ["all", "pending", "drafts", "approval", "ongoing", "approved", "closed"];

export const rfqDetail = (rfqId, { stage, focus } = {}) => {
  if (!hasId(rfqId)) return rfqList();
  return `${BASE}/rfq-management-details${qs({
    id: rfqId,
    stage: RFQ_DETAIL_STAGES.includes(stage) ? stage : undefined,
    focus,
  })}`;
};

/** Reopen a saved draft in the create wizard (CreateRFQ reads `draft_id`). */
export const resumeDraft = (rfqId) =>
  hasId(rfqId) ? `${BASE}/rfq-management-edit${qs({ draft_id: rfqId })}` : rfqListView("draft");

/**
 * RFQ listing, pre-filtered. All filters are server-side (list-view):
 *   tab    one of RFQ_LIST_TABS
 *   status array of RFQ_STATUS_KEYS (OR)
 *   bu     array of hotel ids (Business Unit facet)
 *   search free text (rfq no / title)
 *   sort   recent | oldest | deadline
 * Any deep-link filter opens the list across all financial years (queues are
 * never date-filtered — SPEC rule 2).
 */
export const rfqList = ({ tab, status, bu, search, sort } = {}) => {
  const statuses = (Array.isArray(status) ? status : status ? [status] : []).filter((s) => RFQ_STATUS_KEYS.includes(s));
  return `${BASE}/rfq-management${qs({
    tab: RFQ_LIST_TABS.includes(tab) ? tab : undefined,
    status: statuses,
    bu: Array.isArray(bu) ? bu : bu ? [bu] : undefined,
    search,
    sort: ["recent", "oldest", "deadline"].includes(sort) ? sort : undefined,
  })}`;
};

/** Named views the dashboard links to. */
export const RFQ_LIST_VIEWS = {
  all: {},
  pending_for_me: { tab: "pending" },
  draft: { tab: "drafts" },
  awaiting_approval: { tab: "approval" },
  my_rfq_approvals: { tab: "pending", status: ["RFQ_APPROVAL"] },
  no_response: { tab: "ongoing", status: ["AWAITING_QUOTES", "TECHNICAL_AWAITING_QUOTES"] },
  closing_soon: { tab: "ongoing", status: ["AWAITING_QUOTES", "TECHNICAL_AWAITING_QUOTES"], sort: "deadline" },
  bid_closed_no_quotes: { status: ["RFQ_STUCK_COMMERCIAL"] },
  ended_no_quotes: { status: ["RFQ_STUCK_COMMERCIAL"] },
  tech_evaluation: { status: ["TECHNICAL_EVALUATING"] },
  my_tech_evaluations: { tab: "pending", status: ["TECHNICAL_EVALUATING"] },
  tech_approval: { status: ["TECHNICAL_APPROVING"] },
  my_tech_approvals: { tab: "pending", status: ["TECHNICAL_APPROVING"] },
  quote_compare: { status: ["COMMERCIAL_EVALUATION"] },
  negotiation: { status: ["NEGOTIATION_ONGOING"] },
  quote_approval: { status: ["QUOTATION_APPROVAL"] },
  my_quote_approvals: { tab: "pending", status: ["QUOTATION_APPROVAL"] },
  awarded: { status: ["AWAITING_PO"] },
  po_approval: { status: ["PO_APPROVAL"] },
  completed: { tab: "approved" },
  closed: { tab: "closed" },
};

export const rfqListView = (view, extra = {}) => rfqList({ ...(RFQ_LIST_VIEWS[view] || {}), ...extra });

/**
 * Map a dashboard stage label to the list. Accepts the persona endpoints'
 * legacy stage names (awaiting_approval, bidding, quote_compare, negotiation,
 * awarded) AND raw lifecycle status keys (e.g. "NEGOTIATION_ONGOING").
 */
const STAGE_TO_VIEW = {
  draft: "draft",
  awaiting_approval: "awaiting_approval",
  bidding: "no_response",
  awaiting_quotes: "no_response",
  tech_evaluation: "tech_evaluation",
  technical: "tech_evaluation",
  tech_approval: "tech_approval",
  quote_compare: "quote_compare",
  commercial: "quote_compare",
  negotiation: "negotiation",
  quote_approval: "quote_approval",
  awarded: "awarded",
  po_approval: "po_approval",
  completed: "completed",
  closed: "closed",
  ended_no_quotes: "ended_no_quotes",
};
export const rfqListForStage = (stage) => {
  if (RFQ_STATUS_KEYS.includes(stage)) return rfqList({ status: [stage] });
  const view = STAGE_TO_VIEW[String(stage || "").toLowerCase()];
  return view ? rfqListView(view) : rfqList();
};

/* ─── Technical evaluation / quote compare / negotiation ──── */

/** `prod_id` is the rfq_product_id the page auto-expands (it also accepts `product_id`). */
export const techEval = ({ rfqId, rfqProductId } = {}) =>
  `${BASE}/technical-evaluation${qs({ rfq_id: hasId(rfqId) ? rfqId : undefined, prod_id: hasId(rfqId) && hasId(rfqProductId) ? rfqProductId : undefined })}`;

export const quoteCompare = (rfqId, { rfqProductId } = {}) =>
  hasId(rfqId) ? `${BASE}/quote-compare${qs({ rfq: rfqId, rfq_product_id: hasId(rfqProductId) ? rfqProductId : undefined })}` : rfqListView("quote_compare");

/** Level-2 negotiation page: every round of one RFQ. */
export const negotiationForRfq = (rfqId) =>
  hasId(rfqId) ? `${BASE}/negotiation/${encodeURIComponent(rfqId)}` : negotiationList();

/**
 * Negotiation listing. `tab` = all | needs_attention | closed;
 * `needsMyApproval` = the "Needs my approval" toggle; `search` free text.
 */
export const negotiationList = ({ tab, needsMyApproval, search } = {}) =>
  `${BASE}/negotiation${qs({
    tab: ["all", "needs_attention", "closed"].includes(tab) ? tab : undefined,
    needs_my_approval: needsMyApproval ? true : undefined,
    search,
  })}`;

/** Approve / reject a pending negotiation round for an RFQ. */
export const negotiationRoundApproval = (rfqId) =>
  hasId(rfqId) ? `${BASE}/negotiation/${encodeURIComponent(rfqId)}/approve` : negotiationList({ needsMyApproval: true });

/* ─── Purchase orders ─────────────────────────────────────── */

/** PO detail — approvers approve/reject here (PODetail `decide`). */
export const poDetail = (poId) => (hasId(poId) ? `${BASE}/purchase-orders/${encodeURIComponent(poId)}` : poList());

/** PO dashboard list tabs accepted by the page + GET /po-dashboard list. */
export const PO_LIST_STATUSES = ["all", "action-required", "draft", "approved", "rejected"];
export const poList = ({ status, search } = {}) =>
  `${BASE}/purchase-orders${qs({ status: PO_LIST_STATUSES.includes(status) ? status : undefined, search })}`;

/** PO tracking tabs: active | awaiting-grn | payment | completed | all. */
export const PO_TRACKING_TABS = ["active", "awaiting-grn", "payment", "completed", "all"];
export const poTracking = ({ tab, search } = {}) =>
  `${BASE}/purchase-orders/tracking${qs({ tab: PO_TRACKING_TABS.includes(tab) ? tab : undefined, search })}`;

/* ─── Rate contracts / MR / reports ──────────────────────── */

export const arcContract = (arcId, { stage, tab } = {}) =>
  hasId(arcId) ? `${BASE}/rate-contracts/${encodeURIComponent(arcId)}${qs({ stage, tab })}` : `${BASE}/rate-contracts`;

export const materialRequisition = (mrId) =>
  hasId(mrId) ? `${BASE}/material-requisitions/${encodeURIComponent(mrId)}` : `${BASE}/material-requisitions`;

export const reports = () => `${BASE}/reports`;

/* ─── Approvals ───────────────────────────────────────────── */

const RFQ_APPROVAL_STAGE = {
  RFQ: "overview",
  TENDER: "overview",
  TECHNICAL: "technical",
  NEGOTIATION_QUOTE: "negotiation-award",
  PO: "purchase-order",
};
const ARC_APPROVAL_STAGE = {
  ARC_PUBLISH: { stage: "overview" },
  ARC_TECH: { stage: "technical" },
  ARC_COMMITTEE: { stage: "awarding" },
  ARC_AMENDMENT: { stage: "active", tab: "amendments" },
};

/**
 * Where an approver ACTS on one pending approval.
 *   entityType  approval instance entity_type
 *   ids         { rfqId, poId, arcId, mrId, entityId }
 * Prod id shapes (SPEC rule 6): TECHNICAL/NEGOTIATION_QUOTE carry the RFQ in
 * metadata — pass it as rfqId; PO.entity_id is the PO id.
 */
export const approvalHref = (entityType, { rfqId, poId, arcId, mrId, entityId } = {}) => {
  const type = String(entityType || "").toUpperCase();
  if (type === "PO") {
    if (hasId(poId || entityId)) return poDetail(poId || entityId);
    return rfqId ? rfqDetail(rfqId, { stage: "purchase-order", focus: "approval" }) : approvalQueue("PO");
  }
  if (type === "NEGOTIATION") return negotiationRoundApproval(rfqId);
  if (RFQ_APPROVAL_STAGE[type]) {
    const id = type === "RFQ" || type === "TENDER" ? rfqId || entityId : rfqId;
    return hasId(id) ? rfqDetail(id, { stage: RFQ_APPROVAL_STAGE[type], focus: "approval" }) : approvalQueue(type);
  }
  if (ARC_APPROVAL_STAGE[type]) return arcContract(arcId || entityId, ARC_APPROVAL_STAGE[type]);
  if (type === "MR") return materialRequisition(mrId || entityId);
  return rfqListView("pending_for_me");
};

/** The list where a user sees ALL of their pending approvals of one type. */
export const approvalQueue = (entityType) => {
  switch (String(entityType || "").toUpperCase()) {
    case "RFQ":
    case "TENDER":
      return rfqListView("my_rfq_approvals");
    case "TECHNICAL":
      return rfqListView("my_tech_approvals");
    case "NEGOTIATION_QUOTE":
      return rfqListView("my_quote_approvals");
    case "NEGOTIATION":
      return negotiationList({ needsMyApproval: true });
    case "PO":
      return poList({ status: "action-required" });
    default:
      return rfqListView("pending_for_me");
  }
};

/** Every builder, for the route-contract test. */
export const ALL_LINK_BUILDERS = {
  rfqDetail, resumeDraft, rfqList, rfqListView, rfqListForStage, techEval, quoteCompare,
  negotiationForRfq, negotiationList, negotiationRoundApproval, poDetail, poList, poTracking,
  arcContract, materialRequisition, reports, approvalHref, approvalQueue,
};
