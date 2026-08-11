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

// GET /po/:po_id/initiators → { can_initiate, initiators[], total }
// The people who hold `awarding.create` / `.update` on THIS PO's own business
// unit — i.e. who a viewer who cannot initiate a stuck draft should call. The
// list excludes the viewer and is capped server-side at 25 (`total` is the true
// uncapped count); out-of-scope callers get a 404, which every caller must treat
// as "show nothing", never as a page error. The interceptor unwraps the
// envelope, so `res.data` is the payload above.
export const getPOInitiators = async (po_id) => {
  const res = await axiosInstance.get(`/po/${po_id}/initiators`);
  return res.data;
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

/* ─────────────────────────────────────────────────────────────────────────
   Excel exports.

   The server builds the workbook from the caller's own scoped query, so these
   helpers only pass the filters the page is currently showing — they never
   send rows, ids or a company/hotel id. Whatever the user can see is what
   lands in the file, and nothing else.

   The response interceptor unwraps `response.data`, which for
   responseType:"blob" IS the Blob, so `res` here is already the file. The
   filename is composed client-side rather than read off Content-Disposition:
   that header is not exposed to cross-origin XHR by default and the value
   would silently degrade to the endpoint path.
   ───────────────────────────────────────────────────────────────────────── */

const stamp = () => new Date().toISOString().slice(0, 10);

// Turns a Blob into a save dialog. Kept here (not in a component) so every PO
// surface downloads the same way.
const saveBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in Safari; one tick is enough.
  setTimeout(() => window.URL.revokeObjectURL(url), 0);
};

// GET /po/export — buyer "All purchase orders", honouring status/search/vendor/date.
export const downloadPOListExcel = async (params) => {
  const blob = await axiosInstance.get(`/po/export`, { params, responseType: "blob" });
  saveBlob(blob, `purchase-orders_${stamp()}.xlsx`);
};

// GET /po/tracking/export — buyer PO tracking, honouring tab/search/vendor/date.
export const downloadPOTrackingExcel = async (params) => {
  const blob = await axiosInstance.get(`/po/tracking/export`, { params, responseType: "blob" });
  saveBlob(blob, `po-tracking_${stamp()}.xlsx`);
};

// GET /po/analytics/export — one sheet per chart for the selected period.
export const downloadPOAnalyticsExcel = async (params) => {
  const blob = await axiosInstance.get(`/po/analytics/export`, { params, responseType: "blob" });
  saveBlob(blob, `po-analytics_${stamp()}.xlsx`);
};

// POST /po/vendor/export — the vendor's own order book (same body as list-view).
export const downloadVendorPoExcel = async (body) => {
  const blob = await axiosInstance.post(`/po/vendor/export`, body, { responseType: "blob" });
  saveBlob(blob, `my-purchase-orders_${stamp()}.xlsx`);
};
export const getVendorPoDetail    = (poId) => axiosInstance.get(`/po/vendor/detail/${poId}`);
export const getVendorPoPdf        = (poId) => axiosInstance.get(`/po/vendor/detail/${poId}/pdf`);