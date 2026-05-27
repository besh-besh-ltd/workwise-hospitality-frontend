import axiosInstance from "@/lib/axios";

export const getActionCenterData = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/action-center', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getProcurementSnapshot = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/procurement-snapshot', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getNegotiationSavings = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/negotiation-savings', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getCostIntelligence = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/cost-intelligence', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getCategoryInsights = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/category-insights', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getWorkflowEfficiency = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/workflow-efficiency', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getSmartInsightsData = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/smart-insights', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getRejectedPOsDetail = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/rejected-pos');
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getPendingApprovalsDetail = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/pending-approvals', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

/* ────────────────────────────────────────────────────────────
   Persona-targeted widget endpoints — role-aware dashboard v3.
   Each method mirrors the convention above: GET against
   /dashboard-v2/<path>?hotel_ids&start_date&end_date — backend
   enforces user×department×permission scoping.
   ──────────────────────────────────────────────────────────── */

const personaGet = (path) => (params) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/dashboard-v2/${path}`, { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });

// RFQ Creator
export const getMyDrafts                  = personaGet('my-drafts');
export const getMyActiveRfqs              = personaGet('my-active-rfqs');
export const getMyNoResponseRfqs          = personaGet('my-no-response-rfqs');
export const getMyRfqsBidClosedNoQuotes   = personaGet('my-rfqs-bid-closed-no-quotes');

// Technical Evaluator
export const getMyTechEvalsPending           = personaGet('my-tech-evals-pending');
export const getTechEvalsWithDisagreements   = personaGet('tech-evals-with-disagreements');
export const getTechEvalThroughput           = personaGet('tech-eval-throughput');

// Technical Approver
export const getMyTechApprovalsPending      = personaGet('my-tech-approvals-pending');
export const getTechApprovalOldestPending   = personaGet('tech-approval-oldest-pending');
export const getTechApprovalThroughput      = personaGet('tech-approval-throughput');

// Commercial Evaluator / N1 Negotiator
export const getMyQuoteCompares          = personaGet('my-quote-compares');
export const getMyActiveNegotiations     = personaGet('my-active-negotiations');
export const getSavingsPipeline          = personaGet('savings-pipeline');

// Commercial Approver
export const getMyCommercialApprovalsPending  = personaGet('my-commercial-approvals-pending');
export const getDealsWithPriceAnomalies       = personaGet('deals-with-price-anomalies');
export const getCommercialApprovalThroughput  = personaGet('commercial-approval-throughput');

// Awarding P1 / P2
export const getMyAwardApprovalsPending = personaGet('my-award-approvals-pending');
export const getRecentAwards            = personaGet('recent-awards');
export const getAwardValuePipeline      = personaGet('award-value-pipeline');
