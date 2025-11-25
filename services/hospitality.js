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


