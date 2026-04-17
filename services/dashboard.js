import axiosInstance from "@/lib/axios";

export const getActionCenterData = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/action-center', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getProcurementSnapshot = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/procurement-snapshot', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getNegotiationSavings = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/negotiation-savings', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getCostIntelligence = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/cost-intelligence', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getCategoryInsights = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/category-insights', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getWorkflowEfficiency = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/workflow-efficiency', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getSmartInsightsData = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/smart-insights', { params });
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};

export const getPendingApprovalsDetail = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get('/dashboard-v2/pending-approvals');
      resolve(response);
    } catch (error) {
      reject({ message: error?.response?.data?.message || error.message });
    }
  });
};
