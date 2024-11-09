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







