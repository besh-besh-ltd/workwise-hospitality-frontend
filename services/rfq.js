import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";
import axios from "axios";

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

export const getDraftData = () => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/draft`);
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
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });  
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

export const updateQuotation = (quote_id, payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.put(`/rfq/quote/update/${quote_id}`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getQuotes = (id, TA_Filter) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-quotes/${id}${TA_Filter ? '?TA_Vendors=TA': ''}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const downloadQuotesDetails = (id, TA_Filter) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/download-quote-results/${id}${TA_Filter ? '?TA_Vendors=TA' : ''}`);
      resolve(response);
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

export const getMagicRFQPreview = (file) => {
  let payload = {};
  payload.file = file;
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.post(`/rfq/magic-search-rfq-preview`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};


export const getSImplifiedVersionOfBOQ = (file) => {
  let payload = {};
  payload.file = file;
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.post(`/rfq/boq/process-and-download`, payload);
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
      let response = await axiosInstance.post(`/rfq/get-clauses-of-product`, payload);
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
      let response = await axiosFormData.post(`/rfq/add-clause-using-file`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
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

      const response = await axiosInstance.put(
        `/rfq/update`,{...data}
      );

      resolve({
        success: true,
        status: response.status,
        data: response.data,
        message: "RFQ updated successfully"
      });
    } catch (error) {
      console.error("RFQ Update Error:", error);
      reject({
        success: false,
        status: error.response?.status || 500,
        message: error.response?.data?.message || "Failed to update RFQ",
        error: error
      });
    }
  });
};
