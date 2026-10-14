// Purchase Requisition — frontend service client for /v1/pr/*.
// Every function resolves to the unwrapped response body (the axios instance
// returns response.data), exactly like services/mr.js.

import axiosInstance from "@/lib/axios";

const BASE = "/pr";

// Pickers.
export const getFormHotels = () => axiosInstance.get(`${BASE}/form/hotels`);
export const getFormDepartments = (hotelId) =>
  axiosInstance.get(`${BASE}/form/departments`, { params: { hotel_id: hotelId } });
export const searchItems = (params = {}) => axiosInstance.get(`${BASE}/search-items`, { params });
export const searchCategories = (q) => axiosInstance.get(`${BASE}/categories`, { params: { q } });

// Listing, KPIs, duplicate check.
export const listPrs = (params = {}) => axiosInstance.get(`${BASE}`, { params });
export const getPrKpis = () => axiosInstance.get(`${BASE}/kpis`);
export const getDuplicates = (params = {}) => axiosInstance.get(`${BASE}/duplicates`, { params });

// Requester lifecycle.
export const getPr = (id) => axiosInstance.get(`${BASE}/${id}`);
export const createPr = (body) => axiosInstance.post(`${BASE}`, body);
export const updatePr = (id, body) => axiosInstance.put(`${BASE}/${id}`, body);
export const submitPr = (id) => axiosInstance.post(`${BASE}/${id}/submit`, {});
export const withdrawPr = (id) => axiosInstance.post(`${BASE}/${id}/withdraw`, {});
export const cancelPr = (id, reason) => axiosInstance.post(`${BASE}/${id}/cancel`, { reason });
export const copyPr = (id) => axiosInstance.post(`${BASE}/${id}/copy`, {});
export const sendBackPr = (id, note) => axiosInstance.post(`${BASE}/${id}/send-back`, { note });

// Approval routing preview.
export const previewRouting = (body) => axiosInstance.post(`${BASE}/routing-preview`, body);
export const previewRoutingForPr = (id) => axiosInstance.get(`${BASE}/${id}/routing-preview`);

// Technical review.
export const getReviewQueue = () => axiosInstance.get(`${BASE}/review-queue`);
export const completeReview = (id, reviewId, note) =>
  axiosInstance.post(`${BASE}/${id}/reviews/${reviewId}/complete`, { note });
export const sendBackReview = (id, reviewId, note) =>
  axiosInstance.post(`${BASE}/${id}/reviews/${reviewId}/send-back`, { note });
export const updateLineSpec = (id, lineId, specification) =>
  axiosInstance.put(`${BASE}/${id}/lines/${lineId}/specification`, { specification });
export const addClause = (id, lineId, body) =>
  axiosInstance.post(`${BASE}/${id}/lines/${lineId}/clauses`, body);
export const deleteClause = (id, lineId, clauseId) =>
  axiosInstance.delete(`${BASE}/${id}/lines/${lineId}/clauses/${clauseId}`);

// Attachments + comments.
export const addAttachment = (id, body) => axiosInstance.post(`${BASE}/${id}/attachments`, body);
export const deleteAttachment = (id, attId) => axiosInstance.delete(`${BASE}/${id}/attachments/${attId}`);
// `body` is the comment text (or an already-shaped { body } object).
export const addComment = (id, body) =>
  axiosInstance.post(`${BASE}/${id}/comments`, typeof body === "string" ? { body } : body);

// Buyer pool + conversion.
export const getPool = (params = {}) => axiosInstance.get(`${BASE}/pool`, { params });
export const getBuyers = (hotelId) => axiosInstance.get(`${BASE}/buyers`, { params: { hotel_id: hotelId } });
export const assignPr = (id, buyerId) => axiosInstance.post(`${BASE}/${id}/assign`, { buyer_id: buyerId });
export const mapLine = (id, lineId, variantId) =>
  axiosInstance.post(`${BASE}/${id}/lines/${lineId}/map`, { variant_id: variantId });
export const requestCatalogItem = (id, lineId, body) =>
  axiosInstance.post(`${BASE}/${id}/lines/${lineId}/catalog-request`, body);
export const closeLine = (id, lineId, reason) =>
  axiosInstance.post(`${BASE}/${id}/lines/${lineId}/close`, { reason });
export const cancelLine = (id, lineId, reason) =>
  axiosInstance.post(`${BASE}/${id}/lines/${lineId}/cancel`, { reason });
export const convertLines = (body) => axiosInstance.post(`${BASE}/convert`, body);

// Company admin: category -> reviewing department.
export const getReviewRouting = () => axiosInstance.get(`${BASE}/admin/review-routing`);
export const saveReviewRouting = (body) => axiosInstance.post(`${BASE}/admin/review-routing`, body);
export const deleteReviewRouting = (id) => axiosInstance.delete(`${BASE}/admin/review-routing/${id}`);
