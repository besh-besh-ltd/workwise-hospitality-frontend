import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";

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

export const handleUploadFile = (file) => {
  let payload = {};
  payload.file = file;
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.post(`/users/upload-file`, payload);
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

export const getQuotes = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-quotes/${id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const downloadQuotesDetails = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/download-quote-results/${id}`);
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

export const getRfqDetails = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-details`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const sendQueryMessage = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosFormData.post(`/rfq/send-query-message`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const listQueryMessages = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/list-query-messages`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const listQueries = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/list-queries`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getAllClauses = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/get-clauses`,payload);
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

export const removeClause = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.delete(`/rfq/remove-clause`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const fetchChatData = (clause_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-comments/${clause_id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const addChatComment = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/add-comment`, payload);
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

export const fetchTechEvaluationRfqList = (user_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-tech-evaluation-rfqs/${user_id}`);
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
// export const getVendorDetails = (payload) => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       let response = await axiosInstance.post(`/rfq/get-vendor-names`,payload);
//       resolve(response);
//     } catch (error) {
//       reject({ message: error });
//     }
//   });
// };

// export const getVendorResponses = (payload) => {
//   return new Promise(async (resolve, reject) => {
//     try {
//       let response = await axiosInstance.post(`/rfq/get-vendor-responses`,payload);
//       resolve(response);
//     } catch (error) {
//       reject({ message: error });
//     }
//   });
// };

export const addComment = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.post(`/rfq/add-comment`,payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getAllComments = (clause_id) => {
  return new Promise(async (resolve, reject) => {
    try {
      let response = await axiosInstance.get(`/rfq/get-comments/${clause_id}`);
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

