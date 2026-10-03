import axiosInstance from "@/lib/axios";
import { cachedRequest, dedupeInFlight, sessionScopeKey } from "@/utils/requestCache";

// The unscoped call is the department master list (the same for every page in
// a session) — cache it for the TTL. A scoped call (hotel_id + resource) is
// answered from the user's role scopes, which an admin can change, so it is
// only de-duplicated while in flight, never kept.
export const getDepartments = (params = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const hasParams = params && Object.keys(params).length > 0;
      const fetcher = () => axiosInstance.get(`/rbac/departments`, { params });
      const response = hasParams
        ? await dedupeInFlight(`departments|${sessionScopeKey()}|${JSON.stringify(params)}`, fetcher)
        : await cachedRequest(`departments|${sessionScopeKey()}`, fetcher);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getRoles = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/roles`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getRolePermissions = (roleId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/rbac/roles/${roleId}/permissions`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getUserRoleScopes = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/users/${userId}/roles`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getBatchUserRoleScopes = (userIds) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/rbac/users/batch-roles?user_ids=${userIds.join(',')}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getUserDepartments = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/users/${userId}/departments`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getBatchUserDepartments = (userIds) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/rbac/users/batch-departments?user_ids=${userIds.join(',')}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getAllPermissions = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/permissions`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const createCustomRole = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/rbac/roles`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const updateCustomRole = (roleId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.put(`/rbac/roles/${roleId}`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getMyPermissions = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/me/permissions`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

// Several components on one page routinely ask the identical question in the
// same tick (two useModulePermissions hooks for the same module and hotel, a
// page and its embedded stage, ...). Identical concurrent requests share ONE
// in-flight POST; nothing is kept once it settles, so every page load still
// gets fresh grants.
export const getBulkPermissions = (moduleKey, hotelIds = [], departmentId = null) =>
  new Promise(async (resolve, reject) => {
    try {
      const payload = {
        key: moduleKey,
        hotel_ids: hotelIds
      };
      if (departmentId) payload.department_id = departmentId;
      const hotelKey = [...(hotelIds || [])].map(String).sort().join(",");
      const response = await dedupeInFlight(
        `permissions-bulk|${sessionScopeKey()}|${moduleKey}|${hotelKey}|${departmentId || ""}`,
        () => axiosInstance.post(`/rbac/me/permissions/bulk`, payload)
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/**
 * Fetch the user's dashboard widget permissions for a set of business units.
 *
 * Thin wrapper around `getBulkPermissions("dashboard", hotelIds)` — returns
 * a flat array of permission names (the part after `dashboard.`) that the
 * user has in at least one of the supplied hotels. Pass an empty array
 * to fetch grants across all the user's accessible hotels.
 *
 * Used by the role-aware buyer dashboard to decide which widgets to render
 * for the currently-selected BU(s).
 *
 * Response shape (handled here, callers get a clean string[]):
 *   legacy: { permissions: { dashboard: ["my_drafts", "action_center", ...] } }
 *   Shape A: { permissions: { dashboard: { actions: [...], scope: {...} } } }
 * Both are tolerated — dashboard widgets aren't process-scoped, so we only
 * need the `actions` list either way.
 */
export const getDashboardPermissions = (hotelIds = []) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await getBulkPermissions("dashboard", hotelIds);
      const data = response?.data?.data || response?.data || {};
      const permissionsObj = data?.permissions || data || {};
      const entry = permissionsObj?.dashboard;
      const list = Array.isArray(entry) ? entry : (entry?.actions || []);
      resolve(Array.isArray(list) ? list : []);
    } catch (error) {
      reject({ message: error });
    }
  });



