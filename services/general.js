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

export const updateHierarchy = async (hierarchy_type, approvers, removableApprovers) => {
  const res = await axiosInstance.put(`/general/hierarchy`, {
    type: hierarchy_type,
    approvers,
    removableApprovers
  });
  return res;
};
