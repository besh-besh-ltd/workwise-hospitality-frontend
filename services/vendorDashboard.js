import axiosInstance from "@/lib/axios";

export const getVendorOpportunities = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/vendor-dashboard/opportunities', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getVendorPerformance = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/vendor-dashboard/performance', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getVendorInsights = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/vendor-dashboard/insights', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};
