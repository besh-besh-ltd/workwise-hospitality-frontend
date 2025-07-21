import axiosInstance from "@/lib/axios";

export const getPoData = async (rfq_id, params) => {
  const res = await axiosInstance.get(`/po/rfq/${rfq_id}`, { params });
  return res.data;
};

export const getPoDetails = async (po_id) => {
  const res = await axiosInstance.get(`/po/${po_id}`);
  return res.data;
};

export const handlePOApproval = async (po_id, data) => {
  const res = await axiosInstance.post(`/po/approve/${po_id}`, data);
  return res.data;
};