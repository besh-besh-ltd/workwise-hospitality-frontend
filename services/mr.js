// Material Requisition — frontend service client. Wraps /v1/mr/* endpoints
// exposed by backend/app/routes/mr/index.js. Contracted-items-only per phase:
// the picker (searchContractedItems) is the only source of truth for which
// items can be added to an MR.

import axiosInstance from "@/lib/axios";

const BASE = "/mr";

// Listing + dashboard counts + full analytics.
export const listMrs = (params = {}) => axiosInstance.get(`${BASE}`, { params });
// Server-authoritative listing: search/facet/sort/paginate + Pending-for-me.
export const getMrListView = (payload = {}) => axiosInstance.post(`${BASE}/list-view`, payload);
export const getDashboardKpis = (params = {}) => axiosInstance.get(`${BASE}/kpis`, { params });
export const getAnalytics = (params = {}) => axiosInstance.get(`${BASE}/analytics`, { params });
// Resolved MR approval chain for a scope (drives the create-page routing preview).
export const getApprovalPreview = (params = {}) => axiosInstance.get(`${BASE}/approval-preview`, { params });

// Contracted-item picker (drives the MR-create wizard).
export const searchContractedItems = ({ hotel_id, department_id, q = null, limit = 25 } = {}) =>
  axiosInstance.get(`${BASE}/search-contracted-items`, {
    params: { hotel_id, department_id, q, limit },
  });

// CRUD.
export const getMrById   = (id) => axiosInstance.get(`${BASE}/${id}`);
export const createDraft = (payload) => axiosInstance.post(`${BASE}`, payload);
export const submit      = (id) => axiosInstance.post(`${BASE}/${id}/submit`, {});
export const cancel      = (id) => axiosInstance.post(`${BASE}/${id}/cancel`, {});
