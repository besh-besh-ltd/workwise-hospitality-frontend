// Vendor networks — frontend service client. Wraps the /v1/vendor-network/*
// endpoints exposed by backend/app/routes/vendorNetwork/vendorNetworkRoutes.js.
// Mirrors services/arc_v2.js (one named export per route, promise-returning,
// errors surface via Axios's global interceptor).
//
// Scope is always derived server-side from the session (the acting entity and
// its org). Ids passed here are only *targets* the server re-verifies.

import axiosInstance from "@/lib/axios";

const BASE = "/vendor-network";

// ============================================================
// Acting entity
// ============================================================

// Returns { data: { token, acting_entity_id } }. The new token keeps the old expiry.
export const switchEntity = (entityVendorId) =>
  axiosInstance.post(`${BASE}/switch-entity`, { entity_vendor_id: entityVendorId });

// ============================================================
// Org
// ============================================================

export const createOrg = ({ name } = {}) => axiosInstance.post(`${BASE}/org`, { name });
export const getOrg = () => axiosInstance.get(`${BASE}/org`);
// { name?, routing_mode?, routing_timeout_hours? }
export const updateOrg = (payload = {}) => axiosInstance.patch(`${BASE}/org`, payload);

// ============================================================
// Entities + link invites
// ============================================================

export const getEntitySuggestions = () => axiosInstance.get(`${BASE}/entities/suggestions`);
// { relationship, target_vendor_id } or { relationship, target_email }
export const createLinkInvite = (payload = {}) =>
  axiosInstance.post(`${BASE}/entities/link-invites`, payload);
export const cancelLinkInvite = (id) => axiosInstance.delete(`${BASE}/entities/link-invites/${id}`);
export const leaveNetwork = () => axiosInstance.post(`${BASE}/entities/self/leave`);
export const createEntity = (payload = {}) => axiosInstance.post(`${BASE}/entities`, payload);
// { status?, preference_rank? }
export const updateEntity = (vendorId, payload = {}) =>
  axiosInstance.patch(`${BASE}/entities/${vendorId}`, payload);
export const deleteEntity = (vendorId) => axiosInstance.delete(`${BASE}/entities/${vendorId}`);

// Answered by the invited (target) entity.
export const listIncomingLinkInvites = () => axiosInstance.get(`${BASE}/link-invites/incoming`);
export const acceptLinkInvite = (id) => axiosInstance.post(`${BASE}/link-invites/${id}/accept`);
export const declineLinkInvite = (id) => axiosInstance.post(`${BASE}/link-invites/${id}/decline`);

// ============================================================
// People (type-11 logins)
// ============================================================

export const listMembers = () => axiosInstance.get(`${BASE}/members`);
export const inviteMember = (payload = {}) => axiosInstance.post(`${BASE}/members`, payload);
export const updateMember = (id, payload = {}) => axiosInstance.patch(`${BASE}/members/${id}`, payload);
export const resendMemberInvite = (id) => axiosInstance.post(`${BASE}/members/${id}/resend`);

// PUBLIC (no session): the emailed token is the credential.
// Preview → { email, org_name, entity_name, expired } or HTTP 410.
export const previewMemberInvite = (token) =>
  axiosInstance.get(`${BASE}/member-invites/${encodeURIComponent(token)}`);
// → 200, or HTTP 410 when expired / already used.
export const acceptMemberInvite = ({ token, password } = {}) =>
  axiosInstance.post(`${BASE}/member-invites/accept`, { token, password });

// ============================================================
// Coverage
// ============================================================

export const lookupCoverageStates = () => axiosInstance.get(`${BASE}/coverage/lookup/states`);
export const lookupCoverageCities = (stateId) =>
  axiosInstance.get(`${BASE}/coverage/lookup/cities`, { params: { state_id: stateId } });
export const lookupCoverageHotels = (q = "") =>
  axiosInstance.get(`${BASE}/coverage/lookup/hotels`, { params: { q: q || undefined } });
export const getCoverage = (vendorId, { category_id } = {}) =>
  axiosInstance.get(`${BASE}/coverage/${vendorId}`, { params: { category_id } });
// { rules: [...] } — replaces the entity's rule set.
export const putCoverage = (vendorId, payload = {}) =>
  axiosInstance.put(`${BASE}/coverage/${vendorId}`, payload);

// ============================================================
// Routing
// ============================================================

export const getRoutingQueue = () => axiosInstance.get(`${BASE}/routing/queue`);
// status: optional array or comma list of assignment statuses.
export const getAssignedToMe = ({ status } = {}) =>
  axiosInstance.get(`${BASE}/routing/assigned-to-me`, {
    params: { status: Array.isArray(status) ? status.join(",") || undefined : status || undefined },
  });
// { subject_type, subject_id, hotel_id?, assignee_vendor_id }
export const assignSubject = (payload = {}) => axiosInstance.post(`${BASE}/routing/assign`, payload);
export const revokeAssignment = (id) => axiosInstance.post(`${BASE}/routing/${id}/revoke`);
// { decision, reason?, note? }
export const respondToAssignment = (id, payload = {}) =>
  axiosInstance.post(`${BASE}/routing/${id}/respond`, payload);

// ============================================================
// HQ dashboard
// ============================================================

export const getNetworkDashboardSummary = () => axiosInstance.get(`${BASE}/dashboard/summary`);
// { page, page_size, entity_vendor_id, status }
export const getNetworkDashboardPos = (params = {}) =>
  axiosInstance.get(`${BASE}/dashboard/pos`, { params });
export const getNetworkDashboardContracts = (params = {}) =>
  axiosInstance.get(`${BASE}/dashboard/contracts`, { params });

// ============================================================
// Seats
// ============================================================

export const paySeats = ({ seat_ids } = {}) => axiosInstance.post(`${BASE}/seats/pay`, { seat_ids });
// { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export const verifySeatsPayment = (payload = {}) =>
  axiosInstance.post(`${BASE}/seats/verify-payment`, payload);
