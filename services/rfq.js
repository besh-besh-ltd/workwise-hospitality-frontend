import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";
import axios from "axios";

// This is the base URL for the AI server
  const aiServerBaseURL = process.env.NEXT_PUBLIC_AI_SERVER_URL || "https://test.letsworkwise.com/";

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

export const vendorApproveList = (values) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/users/vendorapprove-list`);
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

export const saveDraft = (values) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/save-draft`, values);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

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
export const getRFQById = (id, token) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/getRfqById/${id}${token !== undefined ? `?token=${token}` : ''}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

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

export const getVendorDetailsByID = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/users/vendor-profile/${id}`);
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

export const sendQuotation = (payload, token) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/quote/create${token !== undefined ? `?token=${token}` : ''}`, payload);
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
      reject({ message: error });
    }
  });
};

export const getQuotes = (id, TA_Filter, freightFilter) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-quotes/${id}${TA_Filter || freightFilter ? '?' : ''}${TA_Filter ? 'TA_Vendors=TA' : ''}${TA_Filter && freightFilter ? '&' : ''}${freightFilter ? 'no_freight=true' : ''}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const downloadQuotesDetails = (id, TA_Filter, freightFilter) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/download-quote-results/${id}${TA_Filter || freightFilter ? '?' : ''}${TA_Filter ? 'TA_Vendors=TA' : ''}${TA_Filter && freightFilter ? '&' : ''}${freightFilter ? 'no_freight=true' : ''}`);
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


export const closeRFQ = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/close-rfq/${id}`);
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


/* 
START :: AI server functions 
*/

// mart of magic serach boq to rfq, accept boq excel and return a json file url
// Send file to /boq_to_structured_boq_and_match and get task_id
export const getBOQexcelToJsonAI = (file) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);  

  return axios.post(`${aiServerBaseURL}/boq_to_structured_boq_and_match`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });
};


export const pollBOQResult = async (taskId, maxAttempts = 30, interval = 30000) => {
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
export const getSImplifiedVersionOfBOQ = (file) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  formData.append("file", file);

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

export const getMagicRFQPreview = (jsonFileUrl, availableSheets, customInstructions = '') => {

  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/magic-search-rfq-preview`, { jsonFileUrl, availableSheets, customInstructions });
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

export const getAllClauses = (rfq_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-clauses/${rfq_id}`);
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

export const fetchChatData = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-tech-comments`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const addChatComment = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/add-tech-comment`, payload);
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

export const fetchVendorAgreement = (payload) => {
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


export const updateRfq = (data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.put("/rfq/update", data); // no need for spread

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
