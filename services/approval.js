import axiosInstance from "@/lib/axios";

export const createApprovalPolicy = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/general/hospitality/approval/policies`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const updateApprovalPolicy = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/general/hospitality/approval/policies`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getApprovalPolicies = (params = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
          queryParams.append(key, params[key]);
        }
      });
      const queryString = queryParams.toString();
      const response = await axiosInstance.get(
        `/general/hospitality/approval/policies${queryString ? `?${queryString}` : ""}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getApprovalPolicy = (policyId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/general/hospitality/approval/policies/${policyId}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const deleteApprovalPolicy = (policyId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.delete(
        `/general/hospitality/approval/policies/${policyId}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const findMatchingPolicy = (params) =>
  new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== "") {
          queryParams.append(key, params[key]);
        }
      });
      const response = await axiosInstance.get(
        `/general/hospitality/approval/policies/match?${queryParams.toString()}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

