import axiosInstance from "@/lib/axios";

/* Every buyer-dashboard endpoint is a GET against /dashboard-v2/<path> with
 * `?hotel_ids&start_date&end_date` (+ widget-local params). The second
 * argument carries an AbortSignal so superseded requests are cancelled
 * (hooks/useDashboardQuery). A cancelled call rejects with `canceled: true`. */
const dashGet = (path) => (params, { signal } = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/dashboard-v2/${path}`, { params, signal });
      resolve(response);
    } catch (error) {
      const canceled = error?.name === "CanceledError" || error?.code === "ERR_CANCELED";
      reject({ message: error?.response?.data?.message || error.message, canceled });
    }
  });

// Runtime rollout switch for the role-aware dashboard (per buyer company).
// Returns { status, data: { v3_enabled: boolean } }.
export const getDashboardConfig = dashGet('config');

export const getActionCenterData = dashGet('action-center');

// Status banner hero on /dashboard/buyer. Returns
// { mode, counts, soonest_closing, weekly, greeting }.
export const getBuyerStatusBanner = dashGet('buyer-status-banner');

export const getProcurementSnapshot = dashGet('procurement-snapshot');

export const getNegotiationSavings = dashGet('negotiation-savings');

export const getCostIntelligence = dashGet('cost-intelligence');

export const getCategoryInsights = dashGet('category-insights');

// ABC (Pareto) analysis — classify items into A/B/C tiers by value.
// params: { hotel_ids, start_date, end_date, metric }
export const getAbcAnalysis = dashGet('abc-analysis');

export const getWorkflowEfficiency = dashGet('workflow-efficiency');

export const getSmartInsightsData = dashGet('smart-insights');

// Drill-downs behind Action Centre / banner. They take the same page filters
// as the card that opened them so the list matches the count.
export const getRejectedPOsDetail = dashGet('rejected-pos');

export const getPendingApprovalsDetail = dashGet('pending-approvals');

// No-response drill-down: published RFQs with zero quotes, split into
// { active, expired } by bid window (Sr 228).
export const getNoResponseDetail = dashGet('no-response');

/* ────────────────────────────────────────────────────────────
   Persona-targeted widget endpoints — role-aware dashboard v3.
   Backend enforces user×department×permission scoping.
   ──────────────────────────────────────────────────────────── */

// RFQ Creator
export const getMyDrafts                  = dashGet('my-drafts');
export const getMyActiveRfqs              = dashGet('my-active-rfqs');
export const getMyNoResponseRfqs          = dashGet('my-no-response-rfqs');
export const getMyRfqsBidClosedNoQuotes   = dashGet('my-rfqs-bid-closed-no-quotes');

// Technical Evaluator
export const getMyTechEvalsPending           = dashGet('my-tech-evals-pending');
export const getTechEvalsWithDisagreements   = dashGet('tech-evals-with-disagreements');
export const getTechEvalThroughput           = dashGet('tech-eval-throughput');

// Technical Approver
export const getMyTechApprovalsPending      = dashGet('my-tech-approvals-pending');
export const getTechApprovalOldestPending   = dashGet('tech-approval-oldest-pending');
export const getTechApprovalThroughput      = dashGet('tech-approval-throughput');

// Commercial Evaluator / N1
export const getMyQuoteCompares          = dashGet('my-quote-compares');
export const getMyActiveNegotiations     = dashGet('my-active-negotiations');
export const getSavingsPipeline          = dashGet('savings-pipeline');

// Commercial Approver
export const getMyCommercialApprovalsPending  = dashGet('my-commercial-approvals-pending');
export const getDealsWithPriceAnomalies       = dashGet('deals-with-price-anomalies');
export const getCommercialApprovalThroughput  = dashGet('commercial-approval-throughput');

// Awarding P1 / P2
export const getMyAwardApprovalsPending = dashGet('my-award-approvals-pending');
export const getRecentAwards            = dashGet('recent-awards');
export const getAwardValuePipeline      = dashGet('award-value-pipeline');
