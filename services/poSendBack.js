import axiosInstance from "@/lib/axios";
import axiosFormData from "@/lib/axiosFormData";

// PO send-back: an approver asks a named person for information (the PO is held
// at the same level), and that person answers or the hold is withdrawn.
// Rejecting with a reason goes through handlePOApproval in services/po.js.
//
// The axiosInstance interceptor unwraps the {status, message, data} envelope, so
// `res.data` is the payload. axiosFormData unwraps one level earlier, so for it
// the payload is `res.data` of the envelope it returns. Vendors never receive
// any of this: every route is closed to them server-side.

// GET /po/:po_id/send-back/targets → { targets: [{ target_role, user:{id,name}|null,
// available, unavailable_reason? }] }. Callable by a PENDING approver on the step.
export const getSendBackTargets = async (po_id) => {
  const res = await axiosInstance.get(`/po/${po_id}/send-back/targets`);
  return res.data;
};

// GET /po/:po_id/send-backs → rows, newest first. The row with status 'OPEN' is
// the hold; the page derives "held" from that and from nothing else.
export const getSendBacks = async (po_id) => {
  const res = await axiosInstance.get(`/po/${po_id}/send-backs`);
  return res.data;
};

const appendFiles = (fd, files) => {
  (files || []).forEach((f) => fd.append("files", f));
};

// POST /po/:po_id/send-back (multipart) → 201 { send_back }.
export const createSendBack = async (po_id, { target_role, reason_category, comment, files }) => {
  const fd = new FormData();
  fd.append("target_role", target_role);
  fd.append("reason_category", reason_category);
  fd.append("comment", comment);
  appendFiles(fd, files);
  const res = await axiosFormData.post(`/po/${po_id}/send-back`, fd);
  return res.data;
};

// POST /po/send-back/:id/respond (multipart). Only the named person may call it.
export const respondToSendBack = async (id, { response_text, files }) => {
  const fd = new FormData();
  if (response_text) fd.append("response_text", response_text);
  appendFiles(fd, files);
  const res = await axiosFormData.post(`/po/send-back/${id}/respond`, fd);
  return res.data;
};

// POST /po/send-back/:id/withdraw. The requester, or any pending approver on the step.
export const withdrawSendBack = async (id, note) => {
  const res = await axiosInstance.post(`/po/send-back/${id}/withdraw`, note ? { note } : {});
  return res.data;
};
