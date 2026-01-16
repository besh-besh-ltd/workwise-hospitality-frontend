import axiosInstance from "@/lib/axios";

/**
 * Create a new negotiation round (product-specific)
 */
export const createNegotiationRound = ({ rfq_id, rfq_product_id, target_price, end_date }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post('/negotiation/rounds', {
        rfq_id,
        rfq_product_id,
        target_price,
        end_date
      });
      resolve(response.data);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get all rounds for an RFQ (optionally filtered by product)
 */
export const getNegotiationRounds = (rfq_id, rfq_product_id = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const url = rfq_product_id 
        ? `/negotiation/rounds/${rfq_id}?rfq_product_id=${rfq_product_id}`
        : `/negotiation/rounds/${rfq_id}`;
      // axiosInstance interceptor already returns response.data, so response is { status: 1, data: [...] }
      const response = await axiosInstance.get(url);
      resolve(response); // Return the full response object { status: 1, data: [...] }
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get active round for a product
 */
export const getActiveNegotiationRound = (rfq_id, rfq_product_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      // axiosInstance interceptor already returns response.data, so response is { status: 1, data: {...} }
      const response = await axiosInstance.get(`/negotiation/rounds/${rfq_id}/active?rfq_product_id=${rfq_product_id}`);
      resolve(response); // Return the full response object { status: 1, data: {...} }
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get all active rounds for an RFQ (all products)
 */
export const getAllActiveNegotiationRounds = (rfq_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      // axiosInstance interceptor already returns response.data, so response is { status: 1, data: [...] }
      const response = await axiosInstance.get(`/negotiation/rounds/${rfq_id}/active-all`);
      resolve(response); // Return the full response object { status: 1, data: [...] }
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Approve a negotiation round
 */
export const approveNegotiationRound = (round_id, remarks = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      // axiosInstance interceptor already returns response.data, so response is { status: 1, data: {...}, message: "..." }
      const response = await axiosInstance.post(`/negotiation/rounds/${round_id}/approve`, {
        remarks
      });
      resolve(response); // Return the full response object
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Reject a negotiation round
 */
export const rejectNegotiationRound = (round_id, remarks) => {
  return new Promise(async (resolve, reject) => {
    try {
      // axiosInstance interceptor already returns response.data, so response is { status: 1, data: {...}, message: "..." }
      const response = await axiosInstance.post(`/negotiation/rounds/${round_id}/reject`, {
        remarks
      });
      resolve(response); // Return the full response object
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Close a negotiation round
 */
export const closeNegotiationRound = (round_id, action) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/negotiation/rounds/${round_id}/close`, {
        action
      });
      resolve(response.data);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get quotes for a round
 */
export const getRoundQuotes = (round_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      // axiosInstance interceptor already returns response.data, so response is { status: 1, data: [...] }
      const response = await axiosInstance.get(`/negotiation/rounds/${round_id}/quotes`);
      resolve(response); // Return the full response object { status: 1, data: [...] }
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Vendor submits quote for a round
 */
export const submitVendorRoundQuote = ({ round_id, quoted_price, previous_price }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/negotiation/rounds/${round_id}/quote`, {
        quoted_price,
        previous_price
      });
      resolve(response.data);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get vendor's negotiation status for a specific product
 */
export const getVendorNegotiationStatus = (rfq_id, rfq_product_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/negotiation/rounds/${rfq_id}/product/${rfq_product_id}/vendor-status`);
      resolve(response); // Return the full response object { status: 1, data: {...} }
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get all vendor's negotiation statuses for an RFQ
 */
export const getAllVendorNegotiationStatus = (rfq_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/negotiation/rounds/${rfq_id}/vendor-status`);
      resolve(response); // Return the full response object { status: 1, data: [...] }
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Submit selected quotes for approval (tender workflow)
 * Creates an approval workflow instance for the product
 * @param {Object} params - The submission parameters
 * @param {number} params.rfq_id - RFQ ID
 * @param {number} params.rfq_product_id - RFQ Product ID
 * @param {Array<number>} params.quote_ids - Array of selected quote IDs
 * @param {string} [params.remarks] - Optional remarks for the approval
 */
export const submitQuotesForApproval = ({ rfq_id, rfq_product_id, quote_ids, remarks }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {
        rfq_id,
        rfq_product_id,
        quote_ids
      };
      if (remarks) {
        payload.remarks = remarks;
      }
      const response = await axiosInstance.post(`/negotiation/quotes/submit-for-approval`, payload);
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get quote approval status for a product
 */
export const getQuoteApprovalStatus = (rfq_product_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/negotiation/quotes/${rfq_product_id}/approval-status`);
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Approve negotiation quotes (for hierarchy approvers)
 * @param {number} rfq_product_id - RFQ Product ID
 * @param {string} remarks - Optional approval remarks
 */
export const approveNegotiationQuotes = (rfq_product_id, remarks = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {};
      if (remarks) payload.remarks = remarks;
      const response = await axiosInstance.post(
        `/negotiation/quotes/${rfq_product_id}/approve`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Reject negotiation quotes (for hierarchy approvers)
 * @param {number} rfq_product_id - RFQ Product ID
 * @param {string} remarks - Rejection reason (required)
 */
export const rejectNegotiationQuotes = (rfq_product_id, remarks) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/negotiation/quotes/${rfq_product_id}/reject`,
        { remarks }
      );
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

