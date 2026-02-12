import axiosInstance from "@/lib/axios";

/**
 * Get list of RFQs for ARC Committee
 */
export const getArcRfqList = (params = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.project_id) queryParams.append('project_id', params.project_id);
      if (params.is_tender !== undefined) queryParams.append('is_tender', params.is_tender);
      if (params.module_keys) queryParams.append('module_keys', params.module_keys);

      const url = `/arc/rfqs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await axiosInstance.get(url);
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get full tender lifecycle data
 * @param {number} rfq_id - RFQ ID
 * @param {number} rfq_product_id - Optional product ID for product-specific ARC
 */
export const getTenderLifecycle = (rfq_id, rfq_product_id = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      let url = `/arc/tender/${rfq_id}`;
      if (rfq_product_id) {
        url += `?rfq_product_id=${rfq_product_id}`;
      }
      const response = await axiosInstance.get(url);
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Perform ARC action (approve/reject/send to)
 * @param {number} rfq_id - RFQ ID
 * @param {string} action - Action type (approve/reject/send_to)
 * @param {string} target_stage - Target stage for send_to action
 * @param {string} remarks - Remarks
 * @param {number} rfq_product_id - Optional product ID for product-level ARC
 * @param {number} approval_instance_id - Optional approval instance ID
 * @param {number} approval_instance_step_id - Optional approval instance step ID
 */
export const performArcAction = (rfq_id, action, target_stage = null, remarks = null, rfq_product_id = null, approval_instance_id = null, approval_instance_step_id = null, department_id = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {
        action,
        target_stage,
        remarks,
        rfq_product_id,
        approval_instance_id,
        approval_instance_step_id
      };
      if (department_id) payload.department_id = department_id;
      const response = await axiosInstance.post(`/arc/tender/${rfq_id}/action`, payload);
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get ARC document URL from approval instance
 * @param {number} approval_instance_id - Approval instance ID
 */
export const getArcDocument = (approval_instance_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/arc/document/${approval_instance_id}`);
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

