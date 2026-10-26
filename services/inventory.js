import axios from "axios";
import axiosInstance from "@/lib/axios";

// Inventory module client. The shared axios instance's response interceptor
// returns the response body, so `res` below is `{status, message, data}` and
// every function here returns `res.data` (the payload) as the API contract says.
const BASE = "/inventory";

const unwrap = (res) => res?.data;
// Explicit `params` win over any `config.params`.
const get = async (path, params, config) =>
  unwrap(await axiosInstance.get(`${BASE}${path}`, { ...config, params: { ...config?.params, ...params } }));
const post = async (path, body, config) => unwrap(await axiosInstance.post(`${BASE}${path}`, body, config));
const put = async (path, body, config) => unwrap(await axiosInstance.put(`${BASE}${path}`, body, config));
const patch = async (path, body, config) => unwrap(await axiosInstance.patch(`${BASE}${path}`, body, config));
const del = async (path, config) => unwrap(await axiosInstance.delete(`${BASE}${path}`, config));

// Multipart: the shared instance defaults to JSON, which would make axios
// stringify the FormData. `false` removes the header so the browser sets
// multipart/form-data with its boundary. Slow uploads/imports get a long timeout.
const UPLOAD_CONFIG = { headers: { "Content-Type": false }, timeout: 120000 };
const fileForm = (file, kind) => {
  const form = new FormData();
  form.append("file", file);
  if (kind !== undefined && kind !== null) form.append("kind", kind);
  return form;
};

// The outbox's sends (a receipt post, a mark-out, a count save): a 401 still
// opens the session-expired dialog, and also rejects (lib/axios) instead of
// never settling, so the queued event waits for sign-in, known unrecorded.
const OUTBOX_SEND = Object.freeze({ settleOn401: true });

// ── Plan and short-close ─────────────────────────────────────────────────────
export const getPoDeliveries = (poId) => get(`/po/${poId}/deliveries`);
export const savePoDeliveryPlan = (poId, deliveries) => put(`/po/${poId}/deliveries`, { deliveries });
export const patchDeliveryDueDate = (poId, deliveryId, dueDate) =>
  patch(`/po/${poId}/deliveries/${deliveryId}`, { dueDate });
export const shortClosePo = (poId, payload) => post(`/po/${poId}/short-close`, payload);
export const reopenShortClose = (poId, payload) => post(`/po/${poId}/short-close/reopen`, payload);

// ── Receive / GRN ────────────────────────────────────────────────────────────
export const getAwaitingDeliveries = (params) => get("/receive/awaiting", params);
export const getReceiveContext = (poId, hotelId) =>
  get(`/receive/po/${poId}`, hotelId ? { hotelId } : undefined);
// post:true is the receipt post (the outbox's grn_post); a draft save is not.
export const createGrn = (input) => post("/grn", input, input?.post === true ? OUTBOX_SEND : undefined);
export const updateGrn = (id, input) => put(`/grn/${id}`, input);
export const postGrn = (id, clientEventId) => post(`/grn/${id}/post`, { clientEventId });
export const discardGrn = (id) => del(`/grn/${id}`);
export const getGrn = (id) => get(`/grn/${id}`);
export const listGrns = (params) => get("/grn", params);
export const reverseGrn = (id, payload) => post(`/grn/${id}/reverse`, payload);
export const uploadGrnAttachment = (id, file, kind) =>
  post(`/grn/${id}/attachments`, fileForm(file, kind), UPLOAD_CONFIG);
export const deleteGrnAttachment = (id, attId) => del(`/grn/${id}/attachments/${attId}`);
export const getGrnPdf = (id) => get(`/grn/${id}/pdf`);

// ── Return to vendor ─────────────────────────────────────────────────────────
export const createRtv = (payload) => post("/rtv", payload);
export const dispatchRtv = (id, payload) => post(`/rtv/${id}/dispatch`, payload);
export const closeRtv = (id, payload) => post(`/rtv/${id}/close`, payload);
export const cancelRtv = (id) => post(`/rtv/${id}/cancel`);
export const getRtv = (id) => get(`/rtv/${id}`);

// ── Vendor ───────────────────────────────────────────────────────────────────
export const getVendorPoDeliveries = (poId) => get(`/vendor/po/${poId}/deliveries`);
export const createDispatch = (poId, payload) => post(`/vendor/po/${poId}/dispatches`, payload);
export const cancelDispatch = (poId, id) => post(`/vendor/po/${poId}/dispatches/${id}/cancel`);

// ── Setup ────────────────────────────────────────────────────────────────────
export const listItems = (params) => get("/items", params);
export const createItem = (payload) => post("/items", payload);
export const updateItem = (id, payload) => put(`/items/${id}`, payload);
export const mapVariantToItem = (id, productVariantId) => post(`/items/${id}/variants`, { productVariantId });
export const suggestItems = (productVariantId) => get("/items/suggest", { productVariantId });
export const getItemUoms = (id) => get(`/items/${id}/uoms`);
export const saveItemUoms = (id, uoms) => put(`/items/${id}/uoms`, { uoms });
export const addItemBarcode = (id, payload) => post(`/items/${id}/barcodes`, payload);
export const deleteItemBarcode = (id, barcodeId) => del(`/items/${id}/barcodes/${barcodeId}`);
export const listHotelItems = (params) => get("/hotel-items", params);
export const saveHotelItem = (hotelId, invItemId, payload) => put(`/hotel-items/${hotelId}/${invItemId}`, payload);
export const getCompanySettings = () => get("/settings/company");
export const saveCompanySettings = (payload) => put("/settings/company", payload);
export const getHotelSettings = (hotelId) => get(`/settings/hotel/${hotelId}`);
export const saveHotelSettings = (hotelId, payload) => put(`/settings/hotel/${hotelId}`, payload);
export const getCategoryDefaults = () => get("/category-defaults");
export const saveCategoryDefaults = (rows) => put("/category-defaults", { rows });
export const previewOpeningStock = (hotelId, file) =>
  post(`/opening/${hotelId}/preview`, fileForm(file), UPLOAD_CONFIG);
export const postOpeningStock = (hotelId, payload) => post(`/opening/${hotelId}/post`, payload);

// ── Stock ────────────────────────────────────────────────────────────────────
export const getStock = (params) => get("/stock", params);
export const getStockItem = (hotelId, invItemId) => get(`/stock/${hotelId}/items/${invItemId}`);
export const getStockLedger = (hotelId, invItemId, params) =>
  get(`/stock/${hotelId}/items/${invItemId}/ledger`, params);
export const postOut = (payload) => post("/out", payload, OUTBOX_SEND);
export const listOut = (params) => get("/out", params);
export const getOut = (id) => get(`/out/${id}`);
export const createAdjustment = (payload) => post("/adjustments", payload);
export const approveAdjustment = (id) => post(`/adjustments/${id}/approve`);
export const rejectAdjustment = (id, reason) => post(`/adjustments/${id}/reject`, { reason });
export const listAdjustments = (params) => get("/adjustments", params);
export const getAdjustment = (id) => get(`/adjustments/${id}`);
export const startCount = (payload) => post("/counts", payload);
export const getCount = (id) => get(`/counts/${id}`);
export const saveCountLines = (id, lines) => put(`/counts/${id}/lines`, { lines }, OUTBOX_SEND);
export const submitCount = (id) => post(`/counts/${id}/submit`);
// `unitCosts` ({[lineId]: number > 0}) only when the server asked for them.
export const approveCount = (id, reasons, unitCosts) =>
  post(`/counts/${id}/approve`, unitCosts ? { reasons, unitCosts } : { reasons });
export const cancelCount = (id) => post(`/counts/${id}/cancel`);
export const listCounts = (params) => get("/counts", params);
export const getInventoryOverview = (params) => get("/overview", params);

// ── Scan, labels, short links, reorder ───────────────────────────────────────
export const resolveScan = (code, context) => get("/scan/resolve", { code, context });
export const printItemLabels = (payload) => post("/labels/items", payload, { timeout: 60000 });
export const printGrnLabels = (grnId, payload) => post(`/labels/grn/${grnId}`, payload, { timeout: 60000 });
export const resolveShortLink = (t, id) => get("/s/resolve", { t, id });
export const getReorder = (hotelId) => get("/reorder", hotelId ? { hotelId } : undefined);
export const createReorderMrDraft = (payload) => post("/reorder/mr-draft", payload);

// ── Site-rep token (public) ──────────────────────────────────────────────────
// The token views are opened from an emailed link by someone with no account.
// They must NOT use the shared axios instance: it would attach a stale buyer
// JWT, and its 401 handler opens SessionExpiredModal and never settles. This
// dedicated instance sends only X-Receive-Token and rejects normally.
const tokenClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 30000,
});
tokenClient.interceptors.response.use((response) => response.data);

const tokenConfig = (token, extra = {}) => ({
  ...extra,
  headers: { ...(extra.headers || {}), "X-Receive-Token": token },
});

export const getTokenReceiveContext = async (token) =>
  unwrap(await tokenClient.get(`${BASE}/token/receive-context`, tokenConfig(token)));
export const postTokenGrn = async (token, input) =>
  unwrap(await tokenClient.post(`${BASE}/token/grn`, input, tokenConfig(token)));
export const uploadTokenGrnAttachment = async (token, id, file, kind) =>
  unwrap(
    await tokenClient.post(
      `${BASE}/token/grn/${id}/attachments`,
      fileForm(file, kind),
      tokenConfig(token, { timeout: 120000, headers: { "Content-Type": false } })
    )
  );

// Buyer-side: revoke a site-rep link for a PO (normal authenticated call).
// With `tokenId` only that person's link is revoked; without it, every live link.
export const revokeSiteRep = (poId, tokenId) =>
  post(`/po/${poId}/site-rep/revoke`, tokenId ? { tokenId } : undefined);
