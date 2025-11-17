import axiosInstance from "@/lib/axios";

export const getHierarchy = async (hierarchy_type) => {
  const res = await axiosInstance.get(`/general/hierarchy`, {
    params: { type: hierarchy_type },
  });
  return res;
};

export const createHierarchy = async (hierarchy_type, approvers) => {
  const res = await axiosInstance.post(`/general/hierarchy`, {
    type: hierarchy_type,
    approvers,
  });
  return res;
};

export const updateHierarchy = async (hierarchy_type, approvers, removableApprovers, hierarchy_id) => {
  const res = await axiosInstance.put(`/general/hierarchy`, {
    type: hierarchy_type,
    approvers,
    removableApprovers,
    hierarchy_id
  });
  return res;
};

export const updateHierarchyProjectMapping = async (hierarchy_id, hierarchy_type, project_id) => {
  const res = await axiosInstance.post(`/general/mapHierarchyToProject`, {
    hierarchy_id,
    hierarchy_type,
    project_id,
  });
  return res;
};

export const updateDefaultHierarchy = async (hierarchy_id, hierarchy_type) => {
  const res = await axiosInstance.post(`/general/setDefaultHierarchy`, {
    hierarchy_id,
    hierarchy_type,
  });
  return res;
};

export const getHierarchyTypes = async (hierarchy_id, hierarchy_type) => {
  const res = await axiosInstance.get(`/general/hierarchyTypes`, {
    hierarchy_id,
    hierarchy_type,
  });
  return res;
};
