import axiosInstance from "@/lib/axios";

export const getUnits = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/units`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const addCustomUnit = (payload) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.post(`/units`, payload);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};

export const deleteCustomUnit = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.delete(`/units/${id}`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};
