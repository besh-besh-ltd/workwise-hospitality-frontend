import axiosInstance from "@/lib/axios";

export const getPoData = async (rfq_id, params) => {
  const res = await axiosInstance.get(`/po/rfq/${rfq_id}`, { params });
  return res;
};

export const getPoDetails = async (po_id) => {
  const res = await axiosInstance.get(`/po/${po_id}`);
  return res.data;
};

export const handlePOApproval = async (po_id, data) => {
  const res = await axiosInstance.post(`/po/approve/${po_id}`, data);
  return res;
};

export const handleCreateMilestone = async (payload) => {
  const res = await axiosInstance.post('/po/milestones', payload);
  return res;
};

export const handleEditMilestone = async (id, payload) => {
  const res = await axiosInstance.put(`/po/milestones/${id}`, payload);
  return res;
};

export const handleDeleteMilestone = async (id) => {
  const res = await axiosInstance.delete(`/po/milestones/${id}`);
  return res;
};

export const handleCreateTask = async (payload) => {
  const res = await axiosInstance.post('/po/tasks', payload);
  return res;
};

export const handleEditTask = async (id, payload) => {
  const res = await axiosInstance.put(`/po/tasks/${id}`, payload);
  return res;
};

export const handleDeleteTask = async (id) => {
  const res = await axiosInstance.delete(`/po/tasks/${id}`);
  return res;
};