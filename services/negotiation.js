import axiosInstance from "@/lib/axios";

/**
 * Create a new negotiation round (product-specific)
 */
export const createNegotiationRound = ({
  rfq_id, rfq_product_id, target_price, end_date, vendor_ids,
  negotiation_fields, target_base_price,
  target_freight, target_freight_mode,
  target_packaging, target_packaging_mode,
  target_delivery_date,
  target_payment_terms, target_vendor_tc, target_comments,
  vendor_targets,
  is_rfq_level,
}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {
        rfq_id,
        rfq_product_id,
        // Backward compat: send target_price as base price target
        target_price: target_base_price || target_price || null,
        end_date
      };
      if (is_rfq_level) payload.is_rfq_level = true;
      if (vendor_ids && vendor_ids.length > 0) {
        payload.vendor_ids = vendor_ids;
      }
      if (negotiation_fields && negotiation_fields.length > 0) {
        payload.negotiation_fields = negotiation_fields;
      }
      if (target_base_price != null && target_base_price !== '') {
        payload.target_base_price = parseFloat(target_base_price);
      }
      if (target_freight != null && target_freight !== '') {
        payload.target_freight = parseFloat(target_freight);
        payload.target_freight_mode = target_freight_mode || 'percentage';
      }
      if (target_packaging != null && target_packaging !== '') {
        payload.target_packaging = parseFloat(target_packaging);
        payload.target_packaging_mode = target_packaging_mode || 'percentage';
      }
      if (target_delivery_date) {
        payload.target_delivery_date = target_delivery_date;
      }
      if (target_payment_terms) {
        payload.target_payment_terms = target_payment_terms;
      }
      if (target_vendor_tc) {
        payload.target_vendor_tc = target_vendor_tc;
      }
      if (target_comments) {
        payload.target_comments = target_comments;
      }
      if (vendor_targets) {
        payload.vendor_targets = vendor_targets;
      }
      const response = await axiosInstance.post('/negotiation/rounds', payload);
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get all rounds for an RFQ (optionally filtered by product)
 */
export const getNegotiationRounds = (rfq_id, rfq_product_id = null, token = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const params = new URLSearchParams();
      if (rfq_product_id) params.set('rfq_product_id', rfq_product_id);
      if (token) params.set('token', token);
      const qs = params.toString();
      const url = `/negotiation/rounds/${rfq_id}${qs ? `?${qs}` : ''}`;
      const response = await axiosInstance.get(url);
      resolve(response);
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
export const getAllActiveNegotiationRounds = (rfq_id, token = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const tokenParam = token ? `?token=${token}` : '';
      const response = await axiosInstance.get(`/negotiation/rounds/${rfq_id}/active-all${tokenParam}`);
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Approve a negotiation round
 */
export const approveNegotiationRound = (round_id, remarks = null, department_id = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = { remarks };
      if (department_id) payload.department_id = department_id;
      // axiosInstance interceptor already returns response.data, so response is { status: 1, data: {...}, message: "..." }
      const response = await axiosInstance.post(`/negotiation/rounds/${round_id}/approve`, payload);
      resolve(response); // Return the full response object
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Reject a negotiation round
 */
export const rejectNegotiationRound = (round_id, remarks, department_id = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = { remarks };
      if (department_id) payload.department_id = department_id;
      // axiosInstance interceptor already returns response.data, so response is { status: 1, data: {...}, message: "..." }
      const response = await axiosInstance.post(`/negotiation/rounds/${round_id}/reject`, payload);
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
      resolve(response);
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
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get vendor's negotiation status for a specific product
 */
export const getVendorNegotiationStatus = (rfq_id, rfq_product_id, token = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const tokenParam = token ? `?token=${token}` : '';
      const response = await axiosInstance.get(`/negotiation/rounds/${rfq_id}/product/${rfq_product_id}/vendor-status${tokenParam}`);
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

/**
 * Get all vendor's negotiation statuses for an RFQ
 */
export const getAllVendorNegotiationStatus = (rfq_id, token = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const tokenParam = token ? `?token=${token}` : '';
      const response = await axiosInstance.get(`/negotiation/rounds/${rfq_id}/vendor-status${tokenParam}`);
      resolve(response);
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
export const submitQuotesForApproval = ({ rfq_id, rfq_product_id, quote_ids, quote_source, remarks, department_id }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {
        rfq_id,
        rfq_product_id,
        quote_ids,
        quote_source: quote_source || 'negotiation' // 'negotiation' or 'regular'
      };
      if (remarks) {
        payload.remarks = remarks;
      }
      if (department_id) {
        payload.department_id = department_id;
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
export const approveNegotiationQuotes = (rfq_product_id, remarks = null, department_id = null, existing_po_id = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = {};
      if (remarks) payload.remarks = remarks;
      if (department_id) payload.department_id = department_id;
      if (existing_po_id) payload.existing_po_id = existing_po_id;
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
export const rejectNegotiationQuotes = (rfq_product_id, remarks, department_id = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const payload = { remarks };
      if (department_id) payload.department_id = department_id;
      const response = await axiosInstance.post(
        `/negotiation/quotes/${rfq_product_id}/reject`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

export const getNegotiationApprovalBundle = (rfq_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/negotiation/rounds/${rfq_id}/approval-bundle`
      );
      resolve(response);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};

