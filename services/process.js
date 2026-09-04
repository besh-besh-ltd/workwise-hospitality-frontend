import axiosInstance from "@/lib/axios";

export const createApprovalProcess = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/general/hospitality/approval/processes`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getApprovalProcesses = (params = {}) =>
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
        `/general/hospitality/approval/processes${queryString ? `?${queryString}` : ""}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const updateApprovalProcess = (id, patch) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.put(
        `/general/hospitality/approval/processes/${id}`,
        patch
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const deleteApprovalProcess = (id) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.delete(
        `/general/hospitality/approval/processes/${id}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
