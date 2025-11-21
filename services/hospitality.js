import axiosInstance from "@/lib/axios";

export const getHospitalityCompanies = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/users/hospitality/companies`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const createHospitalityCompany = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/users/hospitality/company`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const updateHospitalityCompany = (companyId, payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.put(
        `/users/hospitality/company/${companyId}`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const getHospitalityHotels = (companyId) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(
        `/users/hospitality/company/${companyId}/hotels`
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const createHospitalityHotel = (companyId, payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/users/hospitality/company/${companyId}/hotels`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const mapHospitalityUsers = (companyId, payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/users/hospitality/company/${companyId}/map-users`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const mapHospitalityProjects = (companyId, payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(
        `/users/hospitality/company/${companyId}/map-projects`,
        payload
      );
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};


