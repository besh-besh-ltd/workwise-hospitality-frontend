import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";
import axios from "axios";

// This is the base URL for the AI server
  const aiServerBaseURL = process.env.NEXT_PUBLIC_AI_SERVER_URL || "https://test.letsworkwise.com/";
  const quotationAIServerUrl = process.env.NEXT_PUBLIC_QUOTATION_AI_SERVER_URL || "https://test.letsworkwise.com/";

export const getTerms = (values) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-terms`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const downloadRfqTermsPdf = (rfqId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const blob = await axiosInstance.get(`/rfq/terms-pdf?rfq_id=${rfqId}`, {
        responseType: "blob",
      });
      resolve(blob);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const handleUploadFile = (file, token=null) => {
  let payload = {};
  payload.file = file;
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.post(`/users/upload-file${token!=null ? '?token='+ token : ''}`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const handleUploadFileInFormData = (file, token = null) => {
  const formData = new FormData();
  
  // 👇 Append file with filename
  formData.append("file", file, `rfq-quote-${Date.now()}.xlsx`);

  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosFormData.post(`/users/upload-file${token ? `?token=${token}` : ''}`, formData);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};


export const vendorApproveList = (values) => {
 
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/users/vendorapprove-list`, { params: {variant_id: values }});
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const vendorTypes = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/vendor-types/`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const categoryList = (values) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/products/category-list`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getProductPriceStats = (values) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/product-price-stats`, values);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const categoryListById = (values) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`rfq/search-product-by-category`, values);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const bulkSearchVendorsByCategory = (payload, axiosConfig = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/bulk-search-vendors-by-category`, payload, axiosConfig);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const createRfq = (values) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/create`, values);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getDraftData = (fresh = false) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/draft${fresh ? '?fresh=true' : ''}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// Changes by Agnij 2025-06-17 [Improved error handling for draft RFQ retrieval]
export const getDraftById = (id, sheet_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-draft-by-id/${id}`, {params: {sheetId: sheet_id}});
      resolve(response);
    } catch (error) {
      console.error(`[getDraftById] Error fetching draft RFQ with ID ${id}:`, error);
      reject({ 
        message: error?.response?.data?.message || 'Error loading draft RFQ',
        status: error?.response?.data?.status || 3
      });
    }
  });
};

export const getVendorsForRFQProduct = (draftId, rfqProductId, filters) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-draft-vendors/${draftId}`, { ...filters }, { params: { rfqProductId } });
      resolve(response);
    } catch (error) {
      console.error(`[getVendorsForRFQProduct] Error fetching Vendors for RFQ Product with ID ${draftId}:`, error);
      reject({ 
        message: error?.response?.data?.message || 'Error loading draft RFQ',
        status: error?.response?.data?.status || 3
      });
    }
  });
};

export const getDraftRFQs = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Changes by Agnij 2025-05-24 [Updated to use real API instead of mock data]
      let response = await axiosInstance.post(`/rfq/get-draft-rfqs`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getProcessingRFQs = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Changes by Agnij 2025-05-24 [Updated to use real API instead of mock data]
      let response = await axiosInstance.post(`/rfq/get-processing-rfqs`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const saveDraft = (values, signal) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/save-draft`, values, signal ? { signal } : undefined);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};
export const deleteDraft = (draft_id) => {
return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.delete(`/rfq/delete-draft/${draft_id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
}
export const addProductToDraft = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/rfq/add-product-to-draft`, payload);
      // Ensure we have a consistent response format
      if (response && !response.data && response.rfq_id) {
        response.data = { rfq_id: response.rfq_id };
      }

      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// Bulk: add multiple products in one call. Used by the Start RFQ wizard.
// payload: { is_tender, hotel_ids: [...], variants: [{ variant_id }, ...], rfq_id? }
export const addProductsToDraft = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/rfq/add-products-to-draft`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// Recommended products for Start RFQ wizard.
// payload: { hotel_ids: [...], variant_ids: [stagedVariantIds], limit? }
export const getRecommendedProducts = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/rfq/recommended-products`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const addProductToExistingRfq = async (payload) => {
    try {
      return await axiosInstance.post(`/rfq/add-product-to-rfq`, payload);
    } catch (error) {
      throw error;
    }
};

export const removeVendorFromDraft = (payload) => {
  return new Promise(async (resolve, reject)=> {
    try {
      const response = await axiosInstance.post(`/rfq/remove-vendor-from-draft`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  })
}

export const refreshVendors = (rfqId) => {
  return new Promise(async (resolve, reject)=> {
    try {
      const response = await axiosInstance.post(`/rfq/refresh-vendors`, { rfq_id: rfqId });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  })
}

export const previewRefreshVendors = (rfqId) => {
  return new Promise(async (resolve, reject)=> {
    try {
      const response = await axiosInstance.post(`/rfq/refresh-vendors`, { rfq_id: rfqId, preview: true });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  })
}

export const getRFQS = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/getBuyerRfq`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// Get RFQs/Tenders pending approval from current user
export const getPendingApprovalRFQs = (payload = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/pending-approvals`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getLifecycleSummary = (rfqId) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/lifecycle-summary/${rfqId}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getRFQById = (id, token, includeVendors = false) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `/rfq/getRfqById/${id}${
          token !== undefined
            ? `?token=${token}&includeVendors=${includeVendors}`
            : `?includeVendors=${includeVendors}`
        }`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const fetchQuoteHistory = (rfq_product_id, token = null) =>{
  return new Promise(async (resolve , reject) =>{
    try {
      const tokenParam = token ? `&token=${token}` : '';
      let response = await axiosInstance.get(`/rfq/get-quote-history?variant_id=${rfq_product_id}${tokenParam}`)
      resolve(response.data);
    } catch (error) {
      reject({message : error})
    }
  })
}

export const getVendorsByID = (values) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-vendors`, values);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getVendorsByRfqProduct = (rfq_product_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-vendors-by-rfq-product?rfq_product_id=${rfq_product_id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getVendorsForProduct = async (values) => {
  try {
    return await axiosInstance.post(`/rfq/get-vendors-for-product`, values);
  } catch (error) {
    throw error;
  }
};

export const getVendorDetailsByID = (id, { showContact = false } = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const url = `/users/vendor-profile/${id}${showContact ? '?showContact=true' : ''}`;
      let response = await axiosInstance.get(url);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getVendorRfqList = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/getMyRfq`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getVendorQuoteStatus = (rfq_id) => { 
  return new Promise(async (resolve , reject) =>{
    try {
      let response = await axiosInstance.get(`/rfq/get-vendor-quote-status/${rfq_id}`)
      resolve(response);
    } catch (error) {
      reject({message : error})
    }
  })
}
export const sendQuotation = (payload, token) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/quote/create${token !== undefined ? `?token=${token}` : ''}`, payload);
      resolve(response);
    } catch (error) {
      reject(error);
    }
  });
};

export const sendFollowUpEmail = (payload) => {
  return new Promise(async (resolve, reject) => {
    try { 
      let response = await axiosInstance.post(`/rfq/send-follow-up-emails`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const updateQuotation = (quote_id, payload, token) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.put(`/rfq/quote/update/${quote_id}${token !== undefined ? `?token=${token}` : ''}`, payload);
      resolve(response);
    } catch (error) {
      reject(error);
    }
  });
};

export const getQuotes = (id, TA_Filter, freightFilter, rfq_product_id, source, pageSource, include_negotiation) => {
  return new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();

      if (TA_Filter) queryParams.append("TA_Vendors", "TA");
      if (freightFilter) queryParams.append("no_freight", "true");
      if (pageSource) queryParams.append("pageSource", pageSource);
      if (rfq_product_id) queryParams.append("rfq_product_id", rfq_product_id);
      if (source) queryParams.append("source", source);
      if (include_negotiation) queryParams.append("include_negotiation", "true");

      let response = await axiosInstance.get(
        `/rfq/get-quotes/${id}${queryParams.toString() ? "?" + queryParams.toString() : ""}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// export const getTargetPriceHistory = (rfq_product_id) =>{
//   return new Promise (async (resolve , reject) =>{
//     try {
//       let response = await axiosInstance.get(`/rfq/targetPriceHistory/${rfq_product_id}`)
//       resolve(response.data)
//     } catch (error) {
//       reject({message : error})
//     }
//   })
// }

export const downloadQuotesDetails = (id, TA_Filter, freightFilter, rfq_product_id, source, normalize = false) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `/rfq/download-quote-results/${id}${
          TA_Filter || freightFilter ? "?" : ""
        }${TA_Filter ? "TA_Vendors=TA" : ""}${
          TA_Filter && freightFilter ? "&" : ""
        }${freightFilter ? "no_freight=true" : ""}`,
        {
          params: {
            rfq_product_id,
            source,
            normalize: normalize ? "1" : undefined,
          },
        }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getLastPurchaseDetails = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/rfq/get-lpr-lqr', {
        params: payload, // ✅ This is the correct way to pass query params
      });
      resolve(response.data);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getExistingPOByVendor = (vendor_id, rfq_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/rfq/get-existing-po', {
        params: {
          vendor_id,
          rfq_id
        },
      });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};


export const closeRFQ = (id, comment) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/close-rfq/${id}`, { comment });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const withdrawPublish = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/withdraw-publish/${id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const terminateRFQ = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/terminate/${id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const forcePublishRFQ = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/force-publish/${id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const sendReminder = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/send-reminder/${id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getVendorsForReminder = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/vendors-for-reminder/${id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const sendSelectiveReminder = (id, vendor_ids) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/send-selective-reminder/${id}`, { vendor_ids });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const createTenderPaymentOrder = (rfq_id, token = null) => {
  return axiosInstance.post(
    `/rfq/tender-payment/create-order${token ? `?token=${token}` : ''}`,
    { rfq_id }
  );
};

export const verifyTenderPayment = (payload, token = null) => {
  return axiosInstance.post(
    `/rfq/tender-payment/verify${token ? `?token=${token}` : ''}`,
    payload
  );
};

// export const sendFollowUpToBuyer = (payload) =>{
//   return new Promise(async (resolve , reject) =>{
//     try {
// }

export const finalizeQuotation = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/finalize`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};



export const updateTargetPrice = ({ productId, vendorIds, targetPrice , rfq_id}) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post('/rfq/negotiate', { productId, vendorIds, targetPrice , rfq_id});
      resolve(response.data);
    } catch (error) {
      reject(error.response?.data || { message: error.message });
    }
  });
};
/* 
START :: Initiate magic search
*/
export const persistMagicSearchJob = async (file_name, type = 'rfq', raw_file_url) => {
  const payload = {
    file_name,
    type,
    raw_file_url
  }
  let response = await axiosInstance.post(`/rfq/initiate-magic-search`, payload);
  return response;
};

export const handleCostEstimation = async (file_name, type = 'rfq', userData) => {
  const payload = {
    file_name,
    type,
    ...userData,
  }
  let response = await axiosInstance.post(`/rfq/estimate-cost`, payload);
  return response;
};

export const handleTenderSummary = async (file_name, userData) => {
  const payload = {
    file_name,
    ...userData,
  }
  let response = await axiosInstance.post(`/rfq/tender-summary`, payload);
  return response;
};

export const handleTechnicalSummary = async (file, userData) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // Add user data if provided
  if (userData) {
    Object.keys(userData).forEach(key => {
      formData.append(key, userData[key]);
    });
  }
  
  let response = await axiosFormData.post(`/rfq/technical-summary`, formData);
  return response;
};



/* 
START :: AI server functions 
*/

// mart of magic serach boq to rfq, accept boq excel and return a json file url
// Send file to /boq_to_structured_boq_and_match and get task_id
export const getBOQexcelToJsonAI = (file, webhook, customInstructions = "") => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);  
  if (customInstructions) {
    formData.append("custom_instructions", customInstructions);
  }
  if(webhook)
    formData.append("webhook", webhook);

  return axios.post(`${aiServerBaseURL}/boq_to_structured_boq_and_match`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
};

export const startCostEstimationProcess = (file, webhook) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);  
  if(webhook)
    formData.append("webhook", webhook);

  return axios.post(`${aiServerBaseURL}/estimate-cost`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
};


export const pollBOQResult = async (taskId, maxAttempts = 240, interval = 30000) => {
  const token = localStorage.getItem("token");

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await axios.get(`${aiServerBaseURL}/boq_result/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.status === 'success' || response.data.status === 'partial_success') {
        return response.data; // Final result
      } else if (response.data.status === 'error') {
        return response.data.message || 'Server returned error' 
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    } catch (err) {
      console.error("Polling error:", err);
      return err
    }
  }

  return {message: "Timeout: Task did not complete in expected time."};
};


//  accept a unstructure boq excel and return a structure boq excel url
export const getSImplifiedVersionOfBOQ = (file, webhook) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);

  if(webhook)
    formData.append("webhook", webhook);

  return axios.post(`${aiServerBaseURL}/boq_to_structured_boq`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
};


/* 
 END :: AI server functions 
*/

export const getMagicRFQPreview = (jsonFileUrl, availableSheets) => {

  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/magic-search-rfq-preview`, { jsonFileUrl, availableSheets });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};


export const getPastRFQS = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-past-rfqs/${id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const provideReview = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/users/create-vendor-review`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getRfqDetails = (payload, token = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-details${token==null ? ``: `?token=`+token}`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const broadcastMessage = (payload, token = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.post(
        `/rfq/send-query-message-to-vendor${token == null ? '' : `?token=${token}`}`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const sendQueryMessage = (payload,token=null ) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.post(`/rfq/send-query-message${token==null ? ``: `?token=`+token}`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const listQueryMessages = (payload,token=null) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/list-query-messages${token==null ? `` : `?token=`+token}`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const listQueries = (payload, token=null) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/list-queries${token==null ? `` : `?token=`+token}`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getAllClauses = (rfq_id, pageSource) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `/rfq/get-clauses/${rfq_id}?pageSource=${pageSource}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};


export const getClausesByRfqProductId = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Changes by Agnij 2025-09-05 [Improved error handling for clause API]
      // Validate payload to prevent 400 errors
      if (!payload || !payload.rfq_product_id) {
        // Return empty data instead of rejecting to prevent component errors
        resolve({ data: [] });
        return;
      }
      let response = await axiosInstance.post(`/rfq/get-clauses-of-product`, payload);
      resolve(response);
    } catch (error) {
      // For 400 errors, return empty array instead of rejecting
      if (error.response && error.response.status === 400) {
        resolve({ data: [] });
      } else {
        reject({ message: error });
      }
    }
  });
};

export const replaceTechEvalVendor = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/replace-tech-eval-vendor`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getNextVendorsForTechEval = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-next-vendors-for-tech-eval`, { params });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getClausesByRfqVendorSide = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-clauses-of-product-vendor-side`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
  
}

export const addClauseUsingFile = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Changes by Agnij 2024-05-14 [Improved response handling]
      let response = await axiosFormData.post(`/rfq/add-clause-using-file`, payload);
      // Make sure we're resolving the data property of the response
      resolve(response?.data || response);
    } catch (error) {
      console.error("Error in addClauseUsingFile:", error);
      // Enhanced error handling
      if (error.response) {
        reject({ message: error.response.data?.message || "Server error", data: error.response.data });
      } else if (error.request) {
        reject({ message: "No response from server" });
      } else {
        reject({ message: error.message || "Unknown error" });
      }
    }
  });
};

export const addClause = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/add-clause`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const updateClause = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.put(`/rfq/update-clause`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const removeClause = (clause_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.delete(`/rfq/remove-clause/${clause_id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const updateMinimumPassingScore = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/update-minimum-passing-score`, payload);
      // Return the data object directly for easier handling
      resolve(response.data || response);
    } catch (error) {
      reject({ 
        message: error.response?.data?.message || error.message || "Failed to update minimum passing score",
        status: error.response?.data?.status || 0
      });
    }
  });
};

export const updateBuyerMarks = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/update-buyer-marks`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const fetchChatData = (payload , token) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-tech-comments?token=${token}`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const addChatComment = (payload, token) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(
        `/rfq/add-tech-comment?token=${token}`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};


export const fetchVendorSelectionOption = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-vendor-names`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// New unified function for RFQs (GET, params in query)
export const getRfqs = async (params) => {
  const res = await axiosInstance.get(`/rfq/get-rfqs`, { params });
  return res.data;
};

export const getTechEvalUsers = async (project_id) => {
  const res = await axiosInstance.get(`/rfq/tech-eval-users/${project_id}`);
  const body = res?.data;
  // Backend responds as: { status: 1, data: [ { id, name, email }, ... ] }
  // Always return the array so callers can use it directly.
  return body?.data || body || [];
};


export const fetchTechEvaluationRfqList = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      
      let response = await axiosInstance.post(`/rfq/get-tech-evaluation-rfqs`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const addVendorAgreement = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/add-vendor-response`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const fetchVendorAgreement = (payload) => {  //Not being used anywhere  .
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-vendor-responses`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const addToTA = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/tech-evaluation-cleared-vendors`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getTechClearedVendorsResult = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-tech-evaluation-result`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};


//  not in use anywhere, we can remove this from backend as well
export const getSummarisedDeviation = (rfq_id) => {
  return new Promise ( async (resolve , reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-summarised-deviation`,{ rfq_id })
      resolve(response.data);
    } catch (error) {
      reject({message : error})
    }
  })
}

export const fetchDeviationPreviews = (rfq_product_id, user_id, token) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(
        `/rfq/get-deviation-previews${token ? `?token=${token}` : ''}`,
        { rfq_product_id, user_id }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getRfqChartData = (filter, project_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/rfq-chart-data?chart_filter=${filter}${project_id ? `&project=${project_id}` : ``}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getTopVendorsandProducts = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/users/dashboard-top-vendors-and-products`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getFinalizedVendorsList = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/users/dashboard-finalized-vendors`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getFinalizedProductsList = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/users/dashboard-finalized-products`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getAnalyticsChartData = (filter, type, product_id, vendor_ids) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(
        `/users/get-dashboard-Analytics?chart_filter=${filter}&data_type=${type}${ product_id ? `&product=${product_id}` : `` }${ vendor_ids ? `&vendor=${vendor_ids}` : `` }`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const searchVendorByName = (vendor_name) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/users/dashboard-search-vendor`, {vendor_name});
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};


// WH-69: PUT /rfq/update — payload shape is now { rfq_id, snapshot } where
// `snapshot` is the complete intended state of the RFQ. Backend computes the
// diff and writes one tbl_rfq_change_history row per changed field.
export const updateRfq = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.put("/rfq/update", data);

      resolve({
        success: true,
        status: response.status,
        data: response.data,
        message: "RFQ updated successfully"
      });

    } catch (error) {
      console.error("RFQ Update Error:", {
        message: error.message,
        status: error.response?.status,
        responseData: error.response?.data,
        requestData: data,
      });

      reject({
        success: false,
        status: error.response?.status || 500,
        message: error.response?.data?.message || "Failed to update RFQ",
        error: error
      });
    }
  });
};

// WH-69: edit history feed for the new "Edit History" panel on the RFQ
// details page. Returns { sessions: [...] } grouped newest first.
export const getRfqEditHistory = (rfqId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rfq/${rfqId}/edit-history`);
      resolve(response);
    } catch (error) {
      reject({
        message: error?.response?.data?.message || 'Failed to load edit history',
        status: error?.response?.data?.status || 3
      });
    }
  });
};
export const getDraftRfqSheets = (rfqId) => {
  return new Promise(async (resolve, reject) => {
    try {      
      let response = await axiosInstance.get('/rfq/draft-sheets', { 
        params: { rfqId }
      });
      resolve(response);
    } catch (error) {
      reject({ 
        message: error?.response?.data?.message || 'Error loading RFQ sheets',
        status: error?.response?.data?.status || 3
      });
    }
  });
};

// Changes by Agnij 2025-09-04 [Fixed API integration for getting draft RFQ sheet data]
export const getDraftRfqSheetWise = (rfqId, sheetId) => {
  return new Promise(async (resolve, reject) => {
    try {      
      const params = { rfqId };
      if (sheetId) {
        params.sheetId = sheetId;
      }
      
      let response = await axiosInstance.get('/rfq/draft-sheet-wise', { params });      
      resolve(response);
    } catch (error) {      
      if (error.response && error.response.status === 500) {
        resolve({
          data: {
            status: 2, // Partial success
            message: 'Server error while fetching sheet data, using available data',
            data: error.response.data || []
          }
        });
        return;
      }
      
      reject({ 
        message: error?.response?.data?.message || 'Error loading sheet data',
        status: error?.response?.data?.status || 3
      });
    }
  });
};

// Changes by Agnij 2025-05-25 [Fixed Magic Search processing API integration]
export const processMagicSearchDraft = (rfqId, sheetId) => {
  return new Promise(async (resolve, reject) => {
    try {      
      // Using query parameters directly in URL as the server expects them there
      let response = await axiosInstance.post(`/rfq/process-magic-search-draft?rfqId=${rfqId}&sheetId=${sheetId}`);
      
      resolve(response);
    } catch (error) {
      if (error.response) {
        if (error.response.status === 500) {
          resolve({
            data: {
              status: 2, // Partial success
              message: 'Server error while processing sheet, using available data',
              data: error.response.data || {}
            }
          });
          return;
        }
      }
      resolve({
        data: {
          status: 0, // Error status
          success: false,
          message: error?.response?.data?.message || 'Error processing sheet data',
          error: error?.message || 'Unknown error'
        }
      });
    }
  });
};

// Handle excel saving in database
export const saveExcelInDB = (rfq_id, file_path) => {
  const payload = {
    rfq_id,
    file_path,
  }

  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/save-excel`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getCostEstimationData = (persistent_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-cost-estimation/${persistent_id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

/** Extracts quotation from given quotation document in respective to given rfq data */
export const extractQuotation = (quotation_document, rfq_data) => {
  if(!quotation_document || !rfq_data) throw new Error("Missing required payload, aborting extraction");

  const formData = new FormData();
  formData.append("file", quotation_document);
  formData.append("rfq_json", JSON.stringify(rfq_data));
  formData.append("mode", "vlm")

  return axios.post(`${quotationAIServerUrl}/extract_quotation`, formData);
};

/** Get technical evaluation dashboard summary for an RFQ */
export const getTechEvalDashboard = (rfq_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/technical/dashboard/${rfq_id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error?.message || "Failed to fetch dashboard data" });
    }
  });
};

/** Submit technical evaluation for approval - creates an approval workflow instance */
export const submitTechEvalForApproval = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/tech-eval/submit-for-approval`, payload);
      resolve(response);
    } catch (error) {
      // Check both 'message' and 'error' fields from backend response
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || "Failed to submit for approval";
      reject({ message: errorMsg });
    }
  });
};

/**
 * Get technical evaluation workflow status
 * Returns current round, passed/failed vendors, and workflow completion status
 * @param {number} rfq_product_id - The RFQ product ID
 */
export const getTechEvalStatus = (rfq_product_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/tech-eval/status/${rfq_product_id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error?.message || "Failed to fetch workflow status" });
    }
  });
};

/**
 * Get technical evaluation history (all rounds with vendor details)
 * @param {number} rfq_product_id - The RFQ product ID
 */
export const getTechEvalHistory = (rfq_product_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/tech-eval/history/${rfq_product_id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error?.message || "Failed to fetch evaluation history" });
    }
  });
};

/**
 * Submit approval action for technical evaluation (custom endpoint)
 * Similar to NEGOTIATION custom approval actions
 * @param {Object} payload - { approval_instance_id, approval_instance_step_id, action, comment }
 */
export const submitTechEvalApprovalAction = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/tech-eval/approval/action`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error?.message || "Failed to submit approval action" });
    }
  });
};

/**
 * Submit approval action for RFQ/Tender (custom endpoint)
 * Records approval in RFQ/Tender context instead of generic approval
 * @param {number} rfqId - The RFQ/Tender ID
 * @param {Object} payload - { approval_instance_id, approval_instance_step_id, action, comment }
 */
export const submitRFQApprovalAction = (rfqId, payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/${rfqId}/approve-action`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error?.message || "Failed to submit approval action" });
    }
  });
};

// Charge Names CRUD
export const getChargeNames = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/charge-names`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const deleteQuoteFile = (file_url) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/users/delete-file`, { file_urls: [file_url] });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const createChargeName = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/charge-names`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const updateChargeName = (id, payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.put(`/rfq/charge-names/${id}`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const deleteChargeName = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.delete(`/rfq/charge-names/${id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// RFQ Copy: server creates a DRAFT clone of source_rfq_id pre-populated with
// all products, specs, files, tech-eval clauses, and re-resolves vendors
// against target_hotel_id's current eligible pool. Returns { new_rfq_id,
// new_rfq_no, copied_from } — caller redirects to the CreateRFQ wizard with
// ?draft_id=<new_rfq_id> so the buyer can review and submit.
export const copyRfq = ({ source_rfq_id, target_hotel_id }) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/copy`, {
        source_rfq_id,
        target_hotel_id,
      });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

// Returns { copied_from, copies[] } for the RFQ details page lineage UI.
// Filtered server-side by the caller's accessible hotels — never leaks
// cross-tenant lineage.
export const getRfqLineage = (rfq_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/${rfq_id}/lineage`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};