import axiosInstance from "@/lib/axios";

export const getDepartments = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/departments`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getRoles = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/roles`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getRolePermissions = (roleId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/rbac/roles/${roleId}/permissions`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getUserRoleScopes = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/users/${userId}/roles`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getUserDepartments = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/users/${userId}/departments`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getAllPermissions = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/permissions`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const createCustomRole = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/rbac/roles`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const updateCustomRole = (roleId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.put(`/rbac/roles/${roleId}`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getMyPermissions = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/rbac/me/permissions`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getBulkPermissions = (moduleKey, hotelIds = []) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/rbac/me/permissions/bulk`, {
        key: moduleKey,
        hotel_ids: hotelIds
      });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

