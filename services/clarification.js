import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";

/**
 * Clarification Service
 * Handles API calls for tender clarification tickets
 */

/**
 * Get all clarifications for a tender
 * GET /rfq/clarifications/:rfq_id
 * @param {number} rfq_id - The tender/RFQ ID
 * @param {string} token - Optional token for vendor access
 */
export const getClarifications = (rfq_id, token = null) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/rfq/clarifications/${rfq_id}${token ? `?token=${token}` : ''}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/**
 * Check if there is an active/open clarification
 * GET /rfq/clarification/active/:rfq_id
 * @param {number} rfq_id - The tender/RFQ ID
 * @param {string} token - Optional token for vendor access
 */
export const getActiveClarification = (rfq_id, token = null) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/rfq/clarification/active/${rfq_id}${token ? `?token=${token}` : ''}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/**
 * Raise a new clarification (Vendor action)
 * POST /rfq/clarification/raise
 * @param {FormData} payload - FormData containing rfq_id, subject, question, and files
 * @param {string} token - Optional token for vendor access
 */
export const raiseClarification = (payload, token = null) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosFormData.post(
        `/rfq/clarification/raise${token ? `?token=${token}` : ''}`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/**
 * Send a message in an existing clarification thread (Both buyer and vendor)
 * POST /rfq/clarification/message
 * @param {FormData} payload - FormData containing clarification_id, message, and files
 * @param {string} token - Optional token for vendor access
 */
export const sendClarificationMessage = (payload, token = null) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosFormData.post(
        `/rfq/clarification/message${token ? `?token=${token}` : ''}`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/**
 * Resolve/Close a clarification (Buyer action)
 * POST /rfq/clarification/resolve
 * @param {FormData} payload - FormData containing clarification_id, and optional response/files for final message
 */
export const resolveClarification = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosFormData.post(
        `/rfq/clarification/resolve`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

/**
 * Check if there are any open clarifications (helper function)
 * Uses GET /rfq/clarification/active/:rfq_id
 *
 * @param {number} rfq_id - The tender/RFQ ID
 * @param {string} token - Optional token for vendor access
 * @returns {Promise<{
 *   hasOpen: boolean,
 *   isOwnClarification: boolean,
 *   isBuyer: boolean,
 *   clarification: object|null
 * }>}
 */
export const checkOpenClarification = async (rfq_id, token = null) => {
  try {
    const response = await getActiveClarification(rfq_id, token);
    const data = response?.data || response || {};
    return {
      hasOpen: data?.has_open || false,
      isOwnClarification: data?.is_own_clarification || false,
      isBuyer: data?.is_buyer || false,
      clarification: data?.data || null, // Clarification object (null if not owner/buyer)
    };
  } catch (error) {
    console.error("Error checking open clarifications:", error);
    return { hasOpen: false, isOwnClarification: false, isBuyer: false, clarification: null };
  }
};
