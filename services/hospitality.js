import axiosInstance from "@/lib/axios";

export const getHospitalityCompanies = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/hospitality/companies`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const createHospitalityCompany = (payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const updateHospitalityCompany = (companyId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.put(
        `/hospitality/company/${companyId}`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getHospitalityHotels = (companyId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/hospitality/company/${companyId}/hotels`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const createHospitalityHotel = (companyId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company/${companyId}/hotels`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const mapHospitalityUsers = (companyId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company/${companyId}/map-users`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const mapHospitalityProjects = (companyId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/hospitality/company/${companyId}/map-projects`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getCompanyUserMappings = (
  companyId,
  { mappingType, hotelId } = {}
) =>
  new Promise(async (resolve, reject) => {
    try {
      const params = new URLSearchParams();
      if (mappingType !== undefined && mappingType !== null) {
        params.append('mapping_type', mappingType);
      }
      if (hotelId) {
        params.append('hotel_id', hotelId);
      }

      const queryString = params.toString();
      const response = await axiosInstance.get(
        `/hospitality/company/${companyId}/user-mappings${
          queryString ? `?${queryString}` : ''
        }`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getMappedUserIds = (companyId, mappingType, hotelId = null) =>
  new Promise(async (resolve, reject) => {
    try {
      const params = new URLSearchParams({ mapping_type: mappingType });
      if (hotelId) params.append('hotel_id', hotelId);
      const response = await axiosInstance.get(
        `/hospitality/company/${companyId}/mapped-user-ids?${params.toString()}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getMappedProjectIds = (companyId, mappingType, hotelId = null) =>
  new Promise(async (resolve, reject) => {
    try {
      const params = new URLSearchParams({ mapping_type: mappingType });
      if (hotelId) params.append('hotel_id', hotelId);
      const response = await axiosInstance.get(
        `/hospitality/company/${companyId}/mapped-project-ids?${params.toString()}`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getProjectMappings = (projectId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/hospitality/project/${projectId}/mappings`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getUserMappings = (userId) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/hospitality/user/${userId}/mappings`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const deleteProjectMapping = (projectId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.delete(
        `/hospitality/project/${projectId}/mapping`,
        { data: payload }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const deleteUserMapping = (userId, payload) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.delete(
        `/hospitality/user/${userId}/mapping`,
        { data: payload }
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });


