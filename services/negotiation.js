import axiosInstance from "@/lib/axios";

/**
 * Create a new negotiation round
 */
export const createNegotiationRound = ({ rfq_id, target_price, end_date }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post('/negotiation/rounds', {
        rfq_id,
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
 * Get all rounds for an RFQ
 */
export const getNegotiationRounds = (rfq_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/negotiation/rounds/${rfq_id}`);
      resolve(response.data);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get active round for an RFQ
 */
export const getActiveNegotiationRound = (rfq_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/negotiation/rounds/${rfq_id}/active`);
      resolve(response.data);
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
      const response = await axiosInstance.post(`/negotiation/rounds/${round_id}/approve`, {
        remarks
      });
      resolve(response.data);
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
      const response = await axiosInstance.post(`/negotiation/rounds/${round_id}/reject`, {
        remarks
      });
      resolve(response.data);
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
      const response = await axiosInstance.get(`/negotiation/rounds/${round_id}/quotes`);
      resolve(response.data);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Vendor submits quote for a round
 */
export const submitVendorRoundQuote = ({ round_id, rfq_product_id, quoted_price, previous_price }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/negotiation/rounds/${round_id}/quote`, {
        rfq_product_id,
        quoted_price,
        previous_price
      });
      resolve(response.data);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

