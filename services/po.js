import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";

export const getPoData = async (rfq_id, params) => {
  const res = await axiosInstance.get(`/po/rfq/${rfq_id}`, { params });
  return res;
};

export const getPoDetails = async (po_id, token) => {
  const res = await axiosInstance.get(`/po/${po_id}`, { params: { token } });
  return res.data; 
};

export const updatePODetails = async (po_id, payload) => {
  const res = await axiosInstance.put(`/po/${po_id}`, payload);
  return res.data;
};

export const handlePOApproval = async (po_id, data) => {
  const res = await axiosInstance.post(`/po/approve/${po_id}`, data);
  return res;
};

export const handlePOInitialization = async (po_id) => {
  const res = await axiosInstance.get(`/po/initiate/${po_id}`);
  return res;
};

// Merge N draft POs of the same vendor on the same RFQ into one.
// `po_ids` is the full set (including keep_po_id); backend rejects mixed
// vendors / statuses / RFQs / tenants.
export const mergeDraftPOs = async ({ keep_po_id, po_ids }) => {
  const res = await axiosInstance.post(`/po/merge-drafts`, { keep_po_id, po_ids });
  return res;
};

export const handleCreateMilestone = async (payload) => {
  const res = await axiosInstance.post('/po/milestones', payload);
  return res;
};

export const handleEditMilestone = async (id, payload) => {
  const res = await axiosInstance.put(`/po/milestones/${id}`, payload);
  return res;
};

export const handleDeleteMilestone = async (id) => {
  const res = await axiosInstance.delete(`/po/milestones/${id}`);
  return res;
};

export const handleGetTasks = async (po_id, filters) => {
  const res = await axiosInstance.get(`/po/${po_id}/tasks`, { params: filters });
  return res;
};

export const handleCreateTask = async (payload) => {
  const res = await axiosInstance.post('/po/tasks', payload);
  return res;
};

export const handleEditTask = async (id, payload) => {
  const res = await axiosInstance.put(`/po/tasks/${id}`, payload);
  return res;
};

export const handleDeleteTask = async (id) => {
  const res = await axiosInstance.delete(`/po/tasks/${id}`);
  return res;
};

export const handleUpdateHSN = async (id, hsn_codes) => {
  const res = await axiosInstance.post(`/po/updateHSN/${id}`, { hsn_codes });
  return res;
}

export const handleUpdateGST = async (id, value) => {
  const res = await axiosInstance.post(`/po/updateGST/${id}`, { value });
  return res;
}

export const handleRaiseInvoice = async (po_id, invoice_url) => {
  const res = await axiosInstance.post(`/po/raiseInvoice`, { po_id, invoice_url });
  return res;
}

export const handleMarkGRN = async (payload, token) => {
  const res = await axiosInstance.post(`/po/markGRN`, payload, { params: { token }});
  return res;
}

export const handleMarkDispatched = async (po_id) => {
  const res = await axiosInstance.post(`/po/markDispatched`, { po_id });
  return res;
}

export const handleAddSiteRep = async (payload) => {
  const res = await axiosInstance.post(`/po/addSiteRepresentative`, payload);
  return res;
}

export const handleRegeneratePO = async (po_id) => {
  const res = await axiosInstance.post(`/po/regenerate/${po_id}`);
  return res.data;
};

export const handleUploadPODocument = async (po_id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await axiosFormData.post(`/po/upload-pdf/${po_id}`, formData);
  return res.data;
};

export const handleAcceptPO = async (po_id) => {
  const res = await axiosInstance.post(`/po/accept/${po_id}`);
  return res;
};

export const handleRejectPO = async (po_id, reason) => {
  const res = await axiosInstance.post(`/po/reject/${po_id}`, { reason });
  return res;
};

/* ─────────────────────────────────────────────────────────────────────────
   New Purchase Order dashboard module (cross-RFQ aggregation endpoints).
   Powers /dashboard/buyer/purchase-orders (Dashboard / Detail / Tracking /
   Analytics). All are read-only and scoped server-side from req.user + the
   hospitality headers injected by the axios interceptor — callers never pass
   a company/hotel id. The interceptor already unwraps response.data, so `res`
   is the response body.
   ───────────────────────────────────────────────────────────────────────── */

// GET /po/list → { data[], total_items, page, limit, status_counts }
// params: { status, search, page, limit, sort }
export const getPODashboardList = async (params) => {
  const res = await axiosInstance.get(`/po/list`, { params });
  return res;
};

// GET /po/dashboard/kpis → { activeCount, awaitingYou, awaitingOldestDays,
//   inTransit, vendorAccepted, vendorAcceptancePending, avgDeliveryDays,
//   approvedThisMonth, approvedDeltaPct, totalValueMTD, totalValueDeltaPct }
export const getPOKpis = async () => {
  const res = await axiosInstance.get(`/po/dashboard/kpis`);
  return res;
};

// GET /po/awaiting → { data[] } — POs pending the logged-in user's approval
export const getPOAwaiting = async () => {
  const res = await axiosInstance.get(`/po/awaiting`);
  return res;
};

// GET /po/detail/:po_id → returns the contract-shaped detail object (the
// endpoint wraps it as { data }, which the interceptor surfaces as res.data).
export const getPODetailFull = async (po_id) => {
  const res = await axiosInstance.get(`/po/detail/${po_id}`);
  return res.data;
};

// GET /po/tracking → { data[], total_items, tab_counts }
// params: { tab, search, page, limit }
export const getPOTracking = async (params) => {
  const res = await axiosInstance.get(`/po/tracking`, { params });
  return res;
};

// GET /po/analytics → { kpis, spend_trend, status_dist, bottlenecks,
//   top_vendors, savings, compliance, spend_by_dept, queue_health }
// params: { period }
export const getPOAnalytics = async (params) => {
  const res = await axiosInstance.get(`/po/analytics`, { params });
  return res;
};

/* ─────────────────────────────────────────────────────────────────────────
   Vendor-facing Purchase Order module (vendor's own POs across all buyers).
   Scoped server-side from req.user — callers never pass a vendor id. The
   axios interceptor unwraps response.data, so each call resolves to the body
   ({ status, message, data }).
   ───────────────────────────────────────────────────────────────────────── */

export const getVendorPoDashboard = () => axiosInstance.get(`/po/vendor/dashboard`);
export const getVendorPoListView  = (body) => axiosInstance.post(`/po/vendor/list-view`, body);
export const getVendorPoDetail    = (poId) => axiosInstance.get(`/po/vendor/detail/${poId}`);
export const getVendorPoPdf        = (poId) => axiosInstance.get(`/po/vendor/detail/${poId}/pdf`);