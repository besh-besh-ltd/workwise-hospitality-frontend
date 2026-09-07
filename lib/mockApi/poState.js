import { vendorsById } from "@/data/ihg/vendors";
import { itVendors, itLineItems, IT_RFQ_ID } from "@/data/ihg/itRfq";
import { lineItems as threadLineItems, rfq as threadRfq } from "@/data/ihg/thread";
import { peopleById, propertiesById } from "@/data/ihg/org";

/**
 * One purchase order, five screens.
 *
 * The PO register, the PO detail, the legacy RFQ-scoped listing, the RFQ
 * lifecycle stage and the printed document each read a PO through a different
 * field vocabulary — `total_value` here, `total_amount` there, `line_subtotal`
 * somewhere else. When each screen built its own object they drifted, which is
 * exactly how the AI triage panel came to quote a different figure for #108215
 * than the register does.
 *
 * So the record lives in the session (see writeRoutes) and every screen gets a
 * PROJECTION of it from this file. Nothing here mutates; the mutators are in
 * writeRoutes, which is also why this module never imports it — that would be
 * a cycle, so the session is passed in.
 */

/* ── resolving the ids an award carries back to something printable ── */

/** Vendor display name from the numeric id used across the quote grids. */
export const vendorNameForId = (vendorId) => {
  const linen = Object.values(vendorsById).find((v, i) => 7101 + i === Number(vendorId));
  if (linen) return linen.name;
  const it = itVendors.find((v, i) => 7301 + i === Number(vendorId));
  return it ? it.name : "Awarded vendor";
};

/** The full vendor record, when the document needs a city and a GSTIN. */
export const vendorForId = (vendorId) => {
  const linen = Object.values(vendorsById).find((v, i) => 7101 + i === Number(vendorId));
  if (linen) return linen;
  const it = itVendors.find((v, i) => 7301 + i === Number(vendorId));
  return it || null;
};

/**
 * What a line actually is. `rfq_product_id` is a 1-based index into the RFQ's
 * items — the same convention techGroups and the compare grid use, so a PO line
 * names the same product the buyer awarded.
 */
export const lineDescriptor = (rfqNo, rfqProductId, totalValue) => {
  const items = String(rfqNo) === IT_RFQ_ID ? itLineItems : threadLineItems;
  const item = items[Number(rfqProductId) - 1];
  const qty = item?.annualQty || 1;
  const value = Number(totalValue) || 0;
  return {
    name: item?.name || `Line ${rfqProductId}`,
    spec: item?.spec || "",
    uom: item?.uom || "nos",
    qty,
    // Derived so the arithmetic on the printed order closes: rate × qty = amount.
    rate: qty ? Math.round((value / qty) * 100) / 100 : value,
    amount: value,
  };
};

export const rfqTitleFor = (rfqNo) =>
  String(rfqNo) === IT_RFQ_ID
    ? "Guest Network & Front-Desk Hardware Refresh — FY 2026-27"
    : threadRfq.title;

/* ── reading the store ───────────────────────────────────── */

/** Every PO that still exists — a draft absorbed by a merge is not one. */
export const activePos = (session) =>
  Object.values(session?.pos || {}).filter((po) => !po.merged_into);

export const poRecordById = (session, id) =>
  Object.values(session?.pos || {}).find((po) => String(po.id) === String(id)) || null;

export const poTotal = (po) =>
  (po?.lines || []).reduce((sum, l) => sum + (Number(l.total_value) || 0), 0);

export const poLines = (po) =>
  (po?.lines || []).map((l) => lineDescriptor(po.rfq_no, l.rfq_product_id, l.total_value));

/** PO number, made safe for a filename — the real format carries slashes. */
export const docFileName = (poNumber) =>
  `PO_${String(poNumber || "").replace(/[^\w.-]+/g, "-").replace(/^-|-$/g, "")}.pdf`;

/**
 * The label the app's own vocabulary uses (STATUS_LABELS, purchase-orders/shared.js).
 *
 * Note `approved` is where this demo stops. The legacy PO card has no `sent`
 * key and falls back to "Draft" for anything it doesn't know, so a PO marked
 * `sent` would read as a draft on the very screen the merge lives on. Issuing
 * to the vendor is shown as a dated step on the order instead.
 */
export const STATUS_LABEL = {
  draft: "Draft",
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
};

/* ── the printed order ───────────────────────────────────── */

/**
 * The document is served by an API route, which runs on the server and so
 * cannot see sessionStorage — where every PO raised during the demo lives. So
 * the order carries itself: initiate encodes the payload into the URL, and the
 * route renders from that when present. Survives a reload and a cold tab,
 * unlike a blob: URL, and needs no storage inheritance — which matters because
 * the "Download PO" link is rel="noopener".
 */
export const encodeDoc = (payload) => {
  const json = JSON.stringify(payload);
  const b64 = typeof window === "undefined"
    ? Buffer.from(json, "utf8").toString("base64")
    : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

export const decodeDoc = (encoded) => {
  try {
    const b64 = String(encoded).replace(/-/g, "+").replace(/_/g, "/");
    const json = typeof window === "undefined"
      ? Buffer.from(b64, "base64").toString("utf8")
      : decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
};

/** Everything the printed order needs, and nothing else — this rides in a URL. */
export const docPayloadFor = (po) => {
  const vendor = vendorForId(po.finalized_vendor_id);
  const lines = poLines(po);
  return {
    n: po.po_number,
    d: po.initiated_at,
    r: po.rfq_no,
    t: rfqTitleFor(po.rfq_no),
    v: vendorNameForId(po.finalized_vendor_id),
    vc: vendor?.city || "",
    vg: vendor?.gstin || vendor?.gst || "",
    b: peopleById.purchase?.name || "",
    l: lines.map((l) => [l.name, l.uom, l.qty, l.rate, l.amount]),
  };
};

export const docUrlFor = (po) =>
  `/api/po/${po.id}/document?d=${encodeDoc(docPayloadFor(po))}`;

/* ── projections ─────────────────────────────────────────── */

/**
 * A row on the cross-RFQ PO register (`GET /po/list`, `/po/awaiting`).
 */
export const toListRow = (po) => {
  const vendorName = vendorNameForId(po.finalized_vendor_id);
  const lines = poLines(po);
  const total = poTotal(po);
  const decided = po.status === "approved" || po.status === "rejected";
  return {
    id: Number(po.id),
    po_number: po.po_number || String(po.id),
    status: po.status,
    status_label: STATUS_LABEL[po.status] || po.status,
    total_value: total,
    vendor: { name: vendorName },
    vendor_name: vendorName,
    finalized_vendor_id: po.finalized_vendor_id,
    finalized_vendor_name: vendorName,
    rfq_id: Number(po.rfq_no),
    rfq_no: po.rfq_no,
    rfq_title: rfqTitleFor(po.rfq_no),
    items_count: lines.length,
    items_label: `${lines.length} item${lines.length === 1 ? "" : "s"}`,
    quantity: lines.reduce((s, l) => s + (l.qty || 0), 0),
    product_details: lines.map((l, i) => ({ id: i + 1, name: l.name, quantity: l.qty })),
    covers_all_products: po.covers_all_products !== false,
    created_at: po.created_at,
    // Only an order that has actually been initiated is waiting on anyone.
    awaiting_me: po.status === "pending_approval",
    waiting_days: 0,
    current_step_label: po.status === "draft" ? "Not yet initiated" : "Financial approval",
    current_approvers: [{ name: peopleById.finance?.name }],
    initiator: { name: peopleById.purchase?.name },
    initiated_by: peopleById.purchase?.name,
    hotel_name: propertiesById["ic-mumbai"]?.shortName,
    project_details: po.project_name ? { name: po.project_name } : null,
    poPdfUrl: po.doc_url || null,
    flags: [],
    decided,
    raised_this_session: true,
  };
};

/** The same PO as the legacy, RFQ-scoped listing reads it (POCard/POListing). */
export const toLegacyRow = (po, canApprove) => {
  const row = toListRow(po);
  return {
    ...row,
    is_approver: !!canApprove,
    line_subtotal: row.total_value,
    global_charges: [],
    unit: "nos",
  };
};
