// ARC v2 — frontend service client. Wraps the /v1/arc-v2/* endpoints exposed
// by backend/app/routes/arc_v2/*. Mirrors the existing service-file pattern
// (one named export per route, promise-returning, errors surface via Axios's
// global interceptor).

import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";

const BASE = "/arc-v2";

// ============================================================
// Buyer — listing + dashboard + wizard
// ============================================================

export const listContracts = (params = {}) =>
  axiosInstance.get(`${BASE}`, { params });

// Server-authoritative listing: search / facet / sort / paginate + Pending-for-me.
export const getContractsListView = (payload = {}) =>
  axiosInstance.post(`${BASE}/list-view`, payload);

export const getDashboardKpis = (params = {}) =>
  axiosInstance.get(`${BASE}/kpis`, { params });

export const getDepartmentsForCategory = ({ category_id, hospitality_company_id } = {}) =>
  axiosInstance.get(`${BASE}/category-departments`, {
    params: { category_id, hospitality_company_id },
  });

// Departments the user is mapped to in a given hotel (ARC create picker).
export const getDepartmentsForHotel = ({ hotel_id } = {}) =>
  axiosInstance.get(`${BASE}/hotel-departments`, { params: { hotel_id } });

export const getSubCategories = (categoryId) =>
  axiosInstance.get(`${BASE}/sub-categories`, { params: { category_id: categoryId } });

// Wizard pickers — categories, hotels, variants, eligible vendors.
export const listRootCategories = () => axiosInstance.get(`${BASE}/categories`);
export const listAccessibleHotels = () => axiosInstance.get(`${BASE}/hotels`);
export const searchVariants = ({ category_id, sub_category_ids, q, page, limit } = {}) =>
  axiosInstance.get(`${BASE}/variants`, {
    params: {
      category_id,
      sub_category_ids: Array.isArray(sub_category_ids) && sub_category_ids.length > 0
        ? sub_category_ids.join(',') : undefined,
      q: q || undefined,
      page,
      limit,
    },
  });
export const listEligibleVendors = ({ category_id, hotel_id } = {}) =>
  axiosInstance.get(`${BASE}/eligible-vendors`, { params: { category_id, hotel_id } });

export const getContractDetail = (id) => axiosInstance.get(`${BASE}/${id}`);
// Lifecycle spine for the single authoritative ARC page — computed stage
// states + the caller's per-ARC permissions.
export const getLifecycle      = (id) => axiosInstance.get(`${BASE}/${id}/lifecycle`);
export const getActiveSummary  = (id) => axiosInstance.get(`${BASE}/${id}/active-summary`);
// Contracted vendor's uploaded compliance docs (base64) for the bundle download.
export const getVendorDocumentsBundle = (contractId) => axiosInstance.get(`${BASE}/contracts/${contractId}/vendor-documents`);

export const createDraft = (payload) => axiosInstance.post(`${BASE}`, payload);
export const updateDraft = (id, patch) => axiosInstance.patch(`${BASE}/${id}`, patch);
export const publish    = (id) => axiosInstance.post(`${BASE}/${id}/publish`, {});
export const withdraw   = (id) => axiosInstance.post(`${BASE}/${id}/withdraw`, {});
export const terminate  = (id, reason) => axiosInstance.post(`${BASE}/${id}/terminate`, { reason });

// ============================================================
// Buyer — Tech evaluation
// ============================================================

export const setupTechEval = (itemId, payload) =>
  axiosInstance.post(`${BASE}/evaluation/items/${itemId}/tech-eval`, payload);

export const getTechEvalForItem = (itemId) =>
  axiosInstance.get(`${BASE}/evaluation/items/${itemId}/tech-eval`);

// NOTE: the buyer-records-vendor-response path was REMOVED — vendors now
// self-author technical responses + evidence (two-envelope flow). The buyer
// ONLY scores them via scoreResponse (which now also carries mandatory_passed
// for mandatory clauses).
export const scoreResponse = (payload) =>
  axiosInstance.post(`${BASE}/evaluation/tech-eval/score`, payload);

// Evaluator-side ownership/permission-checked evidence proxy URL (no raw S3).
export const techEvidenceUrl = (fileId) =>
  `${BASE}/evaluation/tech-eval/evidence/${fileId}`;

// Tech-eval approval — chain view + approve/reject/amend (approver-only;
// amend = { marks: [{ response_id, buyer_marks, buyer_remark }] }).
export const getTechEvalApproval = (arcId) =>
  axiosInstance.get(`${BASE}/evaluation/${arcId}/tech-eval/approval`);
export const techEvalDecide = (arcId, body) =>
  axiosInstance.post(`${BASE}/evaluation/${arcId}/tech-eval/decide`, body);

export const submitTechEval = (arcId) =>
  axiosInstance.post(`${BASE}/evaluation/${arcId}/tech-eval/submit`, {});

// ============================================================
// Buyer — Commercial evaluation (with split-award reconciliation)
// ============================================================

export const getCommEval = (arcId) => axiosInstance.get(`${BASE}/evaluation/${arcId}/comm-eval`);

export const saveAllocation = (arcId, { item_id, allocations }) =>
  axiosInstance.post(`${BASE}/evaluation/${arcId}/comm-eval/allocation`, { item_id, allocations });

export const finalizeCommEval = (arcId) =>
  axiosInstance.post(`${BASE}/evaluation/${arcId}/comm-eval/finalize`, {});

export const sendBackCommEval = (arcId, reason) =>
  axiosInstance.post(`${BASE}/evaluation/${arcId}/comm-eval/send-back`, { reason });

// Vendor-clarification resolution (commercial evaluator) — scoped field edit.
export const reviseClarification = (arcId, clarificationId, { value, response }) =>
  axiosInstance.post(`${BASE}/evaluation/${arcId}/comm-eval/clarification/${clarificationId}/revise`, { value, response });
export const upholdClarification = (arcId, clarificationId, { response }) =>
  axiosInstance.post(`${BASE}/evaluation/${arcId}/comm-eval/clarification/${clarificationId}/uphold`, { response });

// ============================================================
// Buyer — Committee
// ============================================================

export const getCommitteeView = (arcId) => axiosInstance.get(`${BASE}/committee/${arcId}`);
// decision: 'approve' | 'reject' (reject = send back; comment mandatory).
export const decideCommittee  = (arcId, body) => axiosInstance.post(`${BASE}/committee/${arcId}/decide`, body);

// ============================================================
// Vendor portal — quote submission + contract acceptance
// ============================================================

export const vendorListRequests        = () => axiosInstance.get(`${BASE}/vendor/requests`);
export const vendorGetRequestDetail    = (arcId) => axiosInstance.get(`${BASE}/vendor/requests/${arcId}`);
export const vendorSaveQuoteDraft      = (payload) => axiosInstance.post(`${BASE}/vendor/quote/draft`, payload);
export const vendorSubmitQuote         = (arcId) => axiosInstance.post(`${BASE}/vendor/quote/submit`, { arc_id: arcId });
export const vendorWithdrawQuote       = (arcId) => axiosInstance.post(`${BASE}/vendor/quote/withdraw`, { arc_id: arcId });

// ── Vendor — Technical envelope (two-envelope flow) ──────────────────────
// Self-author clause responses + evidence, sealed BEFORE the commercial quote
// (hard two-step when the ARC requires technical responses).
export const vendorGetTechClauses        = (arcId) => axiosInstance.get(`${BASE}/vendor/requests/${arcId}/tech-clauses`);
export const vendorSaveTechEnvelopeDraft = (payload) => axiosInstance.post(`${BASE}/vendor/tech-envelope/draft`, payload);
export const vendorUploadTechEvidence    = (clauseId, formData) => axiosFormData.post(`${BASE}/vendor/tech-envelope/clause/${clauseId}/file`, formData);
export const vendorDeleteTechEvidence    = (fileId) => axiosInstance.delete(`${BASE}/vendor/tech-envelope/file/${fileId}`);
export const vendorSubmitTechEnvelope    = (arcId) => axiosInstance.post(`${BASE}/vendor/tech-envelope/submit`, { arc_id: arcId });

// Dashboard rollups — counts, totals, spend ranks, recent call-offs, activity.
export const vendorGetDashboard          = (params = {}) => axiosInstance.get(`${BASE}/vendor/dashboard`, { params });
export const vendorListPendingAcceptance = () => axiosInstance.get(`${BASE}/vendor/pending-acceptance`);
export const vendorListActiveContracts   = () => axiosInstance.get(`${BASE}/vendor/active`);
export const vendorGetContract           = (id) => axiosInstance.get(`${BASE}/vendor/contracts/${id}`);
export const vendorRequestOtp            = (id) => axiosInstance.post(`${BASE}/vendor/contracts/${id}/otp/request`, {});
export const vendorVerifyOtp             = (id, code) => axiosInstance.post(`${BASE}/vendor/contracts/${id}/otp/verify`, { code });
export const vendorDeclineContract       = (id, reason) => axiosInstance.post(`${BASE}/vendor/contracts/${id}/decline`, { reason });
// Raise a pre-signature clarification: items = [{ arc_contract_line_id, field, comment }].
export const vendorRequestClarification  = (id, items) => axiosInstance.post(`${BASE}/vendor/contracts/${id}/clarification`, { items });
// All of the vendor's amendment requests across contracts (My Amendments page).
export const vendorListAmendments        = () => axiosInstance.get(`${BASE}/vendor/amendments`);

// Addendum re-signing — the vendor signs the approved amendment's addendum
// (sign-to-activate gate) before its effects bind. OTP reuses the contract
// signature flow, scoped to the addendum id.
export const vendorListAddendums         = () => axiosInstance.get(`${BASE}/vendor/addendums`);
export const vendorRequestAddendumOtp    = (id) => axiosInstance.post(`${BASE}/vendor/addendums/${id}/otp/request`, {});
export const vendorVerifyAddendumOtp     = (id, code) => axiosInstance.post(`${BASE}/vendor/addendums/${id}/otp/verify`, { code });
export const vendorDeclineAddendum       = (id, reason) => axiosInstance.post(`${BASE}/vendor/addendums/${id}/decline`, { reason });

// Amendments — request + list live now; approve/reject ship with the
// committee gate (Phase C, still 501).
//
// requestAmendment payload shape:
//   {
//     arc_contract_id, amendment_type, amendment_from, amendment_to?,
//     reason, payload: { … type-specific fields … }
//   }
// type-specific payload:
//   price       : { arc_contract_line_id, new_rate }
//   qty         : { arc_contract_line_id, new_qty }
//   item_add    : { product_variant_id, new_qty, new_rate }
//   item_remove : { arc_contract_line_id }
//   term        : { }  (amendment_from = new end date)
// Vendor-side — vendor portal page POSTs here to request an amendment.
export const requestAmendment        = (payload)         => axiosInstance.post(`${BASE}/amendments/request`, payload);
// Buyer-side — list (active + requested) and the single review endpoint
// that drives approve / reject / edit-then-approve transitions.
export const listAmendments          = (params = {})     => axiosInstance.get(`${BASE}/amendments`, { params });
export const reviewAmendment         = (amendmentId, body) => axiosInstance.post(`${BASE}/amendments/${amendmentId}/review`, body);
// Legacy aliases — backend returns 501 → use reviewAmendment instead.
export const approveAmendment        = (amendmentId)     => axiosInstance.post(`${BASE}/amendments/${amendmentId}/approve`, {});
export const rejectAmendment         = (amendmentId, r)  => axiosInstance.post(`${BASE}/amendments/${amendmentId}/reject`, { reason: r });
