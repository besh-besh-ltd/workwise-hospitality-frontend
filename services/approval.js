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

