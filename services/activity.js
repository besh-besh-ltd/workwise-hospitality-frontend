import axiosInstance from "@/lib/axios";

/**
 * The company activity trail.
 *
 * Scope is never passed from here. The backend derives which companies the
 * caller may see from the session, and a parameter that could widen that would
 * make the endpoint an information-disclosure hole rather than an audit trail.
 * Everything below only narrows.
 */

export const getActivity = (params = {}) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/activity`, { params });
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getActivityFacets = () =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/activity/facets`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });

export const getActivityChanges = (id) =>
  new Promise(async (resolve, reject) => {
    try {
      const response = await axiosInstance.get(`/activity/${id}/changes`);
      resolve(response);
    } catch (error) {
      reject({ message: error });
    }
  });
