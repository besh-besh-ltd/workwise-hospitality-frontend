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
 */
export const getTenderLifecycle = (rfq_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/arc/tender/${rfq_id}`);
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Perform ARC action (approve/reject/send to)
 */
export const performArcAction = (rfq_id, action, target_stage = null, remarks = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/arc/tender/${rfq_id}/action`, {
        action,
        target_stage,
        remarks
      });
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

