import axiosInstance from "@/lib/axios";
import { cachedRequest, invalidateRequestCache, sessionScopeKey } from "@/utils/requestCache";

// Reference data: cached per session (custom units are tenant-scoped, so the
// key carries the session/company scope) and shared across every component
// that asks during the TTL. add/delete below invalidate it.
const UNITS_CACHE_PREFIX = "units|";

export const getUnits = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await cachedRequest(
        `${UNITS_CACHE_PREFIX}${sessionScopeKey()}`,
        () => axiosInstance.get(`/units`)
      );
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
      invalidateRequestCache(UNITS_CACHE_PREFIX);
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
      invalidateRequestCache(UNITS_CACHE_PREFIX);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
};
