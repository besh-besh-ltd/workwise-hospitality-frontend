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
// Scoped BU + Department options for the dashboard header filters (same
// role-scope matrix the analytics scope uses — dropdowns can't offer out-of-scope choices).
export const getDashboardFilterOptions = () => axiosInstance.get(`${BASE}/dashboard/filter-options`);
// Resolved MR approval chain for a scope (drives the create-page routing preview).
export const getApprovalPreview = (params = {}) => axiosInstance.get(`${BASE}/approval-preview`, { params });

// Contracted-item picker (drives the MR-create wizard).
export const searchContractedItems = ({ hotel_id, department_id, q = null, limit = 25 } = {}) =>
  axiosInstance.get(`${BASE}/search-contracted-items`, {
    params: { hotel_id, department_id, q, limit },
  });

// Create-form pickers — the user's accessible hotels + their mapped departments
// (server-derived from the authenticated user; no client company id needed).
export const getFormHotels      = () => axiosInstance.get(`${BASE}/form/hotels`);
export const getFormDepartments = (hotelId) =>
  axiosInstance.get(`${BASE}/form/departments`, { params: { hotel_id: hotelId } });

// CRUD.
export const getMrById   = (id) => axiosInstance.get(`${BASE}/${id}`);
export const createDraft = (payload) => axiosInstance.post(`${BASE}`, payload);
export const submit      = (id) => axiosInstance.post(`${BASE}/${id}/submit`, {});
export const cancel      = (id) => axiosInstance.post(`${BASE}/${id}/cancel`, {});
