import axiosInstance from "@/lib/axios";

export const createApprovalPolicy = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/general/hospitality/approval/policies`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const updateApprovalPolicy = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/general/hospitality/approval/policies`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getApprovalPolicies = (params = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
          queryParams.append(key, params[key]);
        }
      });
      const queryString = queryParams.toString();
      const response = await axiosInstance.get(
        `/general/hospitality/approval/policies${queryString ? `?${queryString}` : ""}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getApprovalPolicy = (policyId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/general/hospitality/approval/policies/${policyId}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const deleteApprovalPolicy = (policyId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.delete(
        `/general/hospitality/approval/policies/${policyId}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const findMatchingPolicy = (params) =>
  new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
          queryParams.append(key, params[key]);
        }
      });
      const response = await axiosInstance.get(
        `/general/hospitality/approval/policies/match?${queryParams.toString()}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

// ============================================
// Approval Instance Management APIs
// ============================================

/**
 * Get approval instances for a specific entity (RFQ or Tender)
 * @param {string} entityType - 'RFQ' or 'TENDER'
 * @param {number} entityId - ID of the entity
 */
export const getEntityApprovalInstances = (entityType, entityId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/general/hospitality/approval/entity/${entityType}/${entityId}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/**
 * Get detailed approval instance with steps and approvers
 * @param {number} instanceId - Approval instance ID
 */
export const getApprovalInstanceDetails = (instanceId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/general/hospitality/approval/instance/${instanceId}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/**
 * Submit approval action (approve or reject)
 * @param {object} payload - { approval_instance_id, approval_instance_step_id, action: 'APPROVE'|'REJECT', comment }
 */
export const submitApprovalAction = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/general/hospitality/approval/action`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/**
 * Cancel an approval instance
 * @param {object} payload - { instance_id, reason }
 */
export const cancelApproval = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/general/hospitality/approval/cancel`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getPendingApprovalCounts = (params = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
          queryParams.append(key, params[key]);
        }
      });
      const queryString = queryParams.toString();
      const response = await axiosInstance.get(
        `/general/hospitality/approval/pending/counts${queryString ? `?${queryString}` : ""}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getDepartmentSubGraphPreview = (policyId, params = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/general/hospitality/approval/policies/${policyId}/department-preview`,
        { params }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getPendingImpact = (policyId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/general/hospitality/approval/policies/${policyId}/pending-impact`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getInstanceChangeHistory = (instanceId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/general/hospitality/approval/instance/${instanceId}/change-history`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

// Predict whether the calling user will be the FINAL approver for an
// about-to-be-created approval instance. Used by the QC merge-PO gate so
// only the final approver gets the merge prompt at finalize time.
export const willBeFinalApprover = (params = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
          queryParams.append(key, params[key]);
        }
      });
      const queryString = queryParams.toString();
      const response = await axiosInstance.get(
        `/general/hospitality/approval/will-be-final-approver${queryString ? `?${queryString}` : ""}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

// Group ARC Hierarchy approver-options. Returns roles + users filtered to
// holders of the matching <entity>.approve permission. Users are
// network-scope-filtered (only is_network_scope=1 grants count).
//
// Use this in the Global ARC wizard instead of fetching ALL company
// users + ALL roles — it ensures the picker only shows valid candidates
// per stage (TENDER / TECHNICAL / NEGOTIATION / NEGOTIATION_QUOTE / ARC).
//
// Returns: { entity_type, permission, roles: [{id, title}], users: [{id, name, email}] }
export const getGlobalArcApproverOptions = (entityType) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/general/hospitality/approval/global-arc/approver-options/${entityType}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

// BU-scope sister of getGlobalArcApproverOptions — used by the per-hotel
// hierarchy wizard. Filters role/user pickers to those holding
// <entity>.approve via BU-scope grants matching the supplied hotel.
// Network-scope holders are excluded (they govern Group ARC only).
//
// Returns: { entity_type, permission, roles: [{id, title, users:[...]}], users: [{id, name, email}] }
export const getBuApproverOptions = (entityType, { hotelId } = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const params = {};
      if (hotelId != null) params.hotel_id = hotelId;
      const response = await axiosInstance.get(
        `/general/hospitality/approval/bu-approver-options/${entityType}`,
        { params }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

