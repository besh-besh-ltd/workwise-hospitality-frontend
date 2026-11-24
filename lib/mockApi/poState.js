import { vendorsById } from "@/data/ihg/vendors";
import { itVendors, itLineItems, IT_RFQ_ID } from "@/data/ihg/itRfq";
import { lineItems as threadLineItems, rfq as threadRfq, contract as threadContract } from "@/data/ihg/thread";
import { peopleById, propertiesById } from "@/data/ihg/org";
import { vendorCards } from "@/data/ihg/orders";
import { vendorOf, storeKeepers, PO_DESK, STATUS_TEXT, SIGN_LIMIT, trackingOf, paymentDueOn, iso } from "@/data/ihg/poBook";

/**
 * One purchase order, five screens.
 *
 * The PO register, the PO detail, the legacy RFQ-scoped listing, the RFQ
 * lifecycle stage and the printed document each read a PO through a different
 * field vocabulary — `total_value` here, `total_amount` there, `line_subtotal`
 * somewhere else. When each screen built its own object they drifted, which is
 * exactly how the AI triage panel came to quote a different figure for the
 * golden-thread call-off than the register does.
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

/* ── the five seeded POs (data/ihg/orders.js) ────────────── */

const seedIso = (d) => (String(d).includes("T") ? d : `${d}T10:00:00.000Z`);

/**
 * Who the browser is signed in as, from the seeded token. Null on the server
 * or when nobody is signed in.
 */
export const viewerPersona = () => {
  if (typeof window === "undefined") return null;
  try {
    const token = window.localStorage.getItem("token") || "";
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Object.values(peopleById).find((p) => p.numericId === payload.sub) || null;
  } catch (_) {
    return null;
  }
};

/** The decision taken on a seeded PO in this session, if any. */
export const seededDecision = (session, po) => session?.poDecisions?.[po.id] || null;
const decisionRejected = (d) => String(d?.decision || "").startsWith("reject");

export const seededStatus = (session, po) => {
  const d = seededDecision(session, po);
  if (!d) return "pending";
  return decisionRejected(d) ? "rejected" : "approved";
};

/** How the register's Items cell reads: first item in caps, then "+N more". */
export const itemsLabelOf = (lines = []) =>
  lines.length === 0
    ? "—"
    : `${String(lines[0].name).toUpperCase()}${lines.length > 1 ? ` · +${lines.length - 1} more` : ""}`;

/** The people who can sign a seeded PO's financial approval — any one is enough. */
export const seededSigners = (po) => {
  const step = (po.chain || []).find((c) => Array.isArray(c.personIds));
  return (step ? step.personIds : [po.approverId]).map((id) => peopleById[id]).filter(Boolean);
};

const DOC_GROUPS = [
  { key: "po", title: "PO documents" },
  { key: "quote", title: "Vendor quote" },
  { key: "tech", title: "Technical evidence" },
  { key: "compliance", title: "Certificates & compliance" },
  { key: "contract", title: "Rate contract" },
  { key: "related", title: "Related orders" },
];

/**
 * The PO detail payload for a seeded PO.
 *
 * Every section the AI decision memo cites is filled from the PO's own
 * evidence in orders.js — RFQ context, quote comparison, technical evaluation,
 * documents and key dates — so an evidence chip always has a section to land
 * on, and that section says what the memo says it says.
 *
 * The financial step lists both people who can sign (rule ANY), so "waiting on
 * you" is true for whichever approver persona is looking. Once decided, the
 * signer shown is the viewer if they are on the roster — the session records
 * the decision but not who took it.
 */
export const seededPoDetail = (po, session) => {
  const vendor = vendorsById[po.vendorId] || {};
  const card = vendorCards[po.vendorId] || {};
  const raiser = peopleById[po.raisedBy];
  const property = propertiesById[po.propertyId];
  const decided = seededDecision(session, po);
  const status = seededStatus(session, po);
  const ok = status === "approved";
  const signers = seededSigners(po);
  const viewer = viewerPersona();
  const actor = decided ? signers.find((p) => p.id === viewer?.id) || signers[0] : null;

  const person = (p, st, extra = {}) => ({
    user_id: p.numericId,
    name: p.name,
    email: p.email,
    status: st,
    removed: false,
    ...extra,
  });

  const confirmations = (po.chain || [])
    .filter((c) => String(c.role).includes("confirmed") && peopleById[c.personId])
    .map((c) => ({
      status: "done",
      title: c.role,
      by: peopleById[c.personId].name,
      when: seedIso(c.on),
      policy: null,
      level: 1,
      decision_rule: "ANY",
      approvers: [person(peopleById[c.personId], "APPROVED", { effective_status: "APPROVED", acted_at: seedIso(c.on) })],
      approver_summary: { total_active: 1, approved: 1, rejected: 0, pending: 0, removed: 0 },
      step_added_mid_flight: false,
      step_removed_mid_flight: false,
    }));

  const financial = {
    status: decided ? (ok ? "done" : "rejected") : "current",
    title: "Financial approval",
    by: actor ? actor.name : null,
    when: decided ? decided.at : null,
    reason: decided && !ok ? decided.remarks || null : null,
    policy: `Any one of ${signers.map((p) => p.name).join(" or ")}`,
    level: confirmations.length + 1,
    decision_rule: "ANY",
    approvers: signers.map((p) =>
      decided && p === actor
        ? person(p, ok ? "APPROVED" : "REJECTED", {
            effective_status: ok ? "APPROVED" : "REJECTED",
            acted_at: decided.at,
            comment: decided.remarks || undefined,
          })
        : decided
        ? person(p, "PENDING")
        : person(p, "PENDING", { effective_status: "PENDING" })
    ),
    approver_summary: {
      total_active: signers.length,
      approved: decided && ok ? 1 : 0,
      rejected: decided && !ok ? 1 : 0,
      pending: decided ? 0 : signers.length,
      removed: 0,
    },
    step_added_mid_flight: false,
    step_removed_mid_flight: false,
  };

  const workflow = [
    { status: "done", title: "PO created", by: raiser.name, when: seedIso(po.raisedOn), policy: null },
    { status: "done", title: "PO initiated", by: raiser.name, when: seedIso(po.raisedOn), policy: null },
    ...confirmations,
    financial,
  ].map((w, i) => ({ step: i + 1, ...w }));

  const docUrl = `/api/po/${po.id}/document`;
  const files = (po.docs || []).map((d) =>
    d.group === "po" ? { group: "po", name: `PO ${po.id}.pdf`, url: docUrl, label: "Purchase order" } : d
  );
  const documentGroups = DOC_GROUPS.map((g) => ({
    key: g.key,
    title: g.title,
    files: files.filter((f) => f.group === g.key).map((f) => ({ name: f.name, url: f.url || null, label: f.label })),
  })).filter((g) => g.files.length > 0);

  const winner = po.value;
  const comparison = (po.compare || []).map((c) => {
    const v = vendorsById[c.vendorId] || {};
    return {
      vendor: v.name || c.vendorId,
      gstin: v.gst || null,
      amount: Math.round((winner + c.extra) * 100) / 100,
      delivery_days: c.deliveryDays,
      delta_pct: c.extra ? Number(((c.extra / winner) * 100).toFixed(1)) : 0,
      is_winner: !c.extra,
    };
  });

  const techEval = (po.techEval || []).map((t) => {
    const max = t.clauses.reduce((s, c) => s + c.max, 0);
    const got = t.clauses.reduce((s, c) => s + c.got, 0);
    const pct = max ? Math.round((got / max) * 100) : null;
    return {
      product: t.product,
      round: t.round,
      percentage: pct,
      status: pct != null && pct >= t.mark ? "passed" : "failed",
      minimum_passing_score: t.mark,
      approver: peopleById[t.approverId]?.name || null,
      approved_at: t.on,
      clauses: t.clauses.map((c) => ({ clause_text: c.text, max_marks: c.max, obtained_marks: c.got })),
    };
  });

  const r = po.rfq || {};
  const keyDates = [
    { k: "Raised", v: seedIso(po.raisedOn) },
    { k: "Expected delivery", v: seedIso(po.dates.delivery), soon: true },
    { k: "Payment terms", v: po.dates.paymentNote },
  ];
  if (po.contractId === threadContract.id) keyDates.push({ k: "Contract term ends", v: seedIso(threadContract.termEnd) });

  return {
    id: Number(po.id),
    po_number: po.id,
    status,
    status_label: decided ? (ok ? "Approved" : "Rejected") : po.status,
    awaiting_me: !decided,
    current_step_label: decided ? "Completed" : "Financial approval",
    current_approvers: decided ? [] : signers.map((p) => ({ name: p.name })),
    total_value: po.value,
    pricing: { subtotal: po.subtotal, tax: po.tax, total: po.value },
    vendor: {
      name: vendor.name,
      tagline: card.tagline,
      gstin: vendor.gst,
      phone: card.phone,
      email: card.email,
      past_orders: card.priorPos,
      on_time_delivery: vendor.performance?.onTimePct,
      flags: po.vendorFlags || [],
      city: vendor.city,
      gst: vendor.gst,
      on_time_pct: vendor.performance?.onTimePct,
    },
    rfq: {
      number: r.number,
      // Only an RFQ the demo can open gets an id — the id is what shows "Open RFQ".
      id: r.id ? Number(r.id) : undefined,
      title: r.title,
      business_unit: property?.name,
      department: "Housekeeping",
      vendors_participated: r.quoted,
      vendors_invited: r.invited,
      rounds: r.rounds,
      finalized_by: peopleById[r.finalizedBy]?.name,
      finalized_date: r.finalizedOn ? seedIso(r.finalizedOn) : null,
    },
    hotel: { name: property?.name },
    hotel_name: property?.name,
    items: po.lines.map((l) => ({
      name: l.name,
      size: l.size,
      spec: l.spec,
      comment: l.comment,
      quantity: l.qty,
      unit_price: l.rate,
      gst: l.gst,
      unit: l.unit,
      charges_meta: { other_charges: [] },
    })),
    workflow,
    docs: [{ type: "po", name: `PO_${po.id}.pdf`, url: docUrl }],
    document_groups: documentGroups,
    poPdfUrl: docUrl,
    comparison,
    // Milestone rows read { num, name, due, pct, amount }.
    payment_terms: [
      { num: 1, name: "On delivery and GRN acceptance", due: `${po.dates.paymentDays} days from GRN`, pct: 100, amount: po.value },
    ],
    tech_eval: techEval,
    // Key-date rows read { k, v, soon } — not { label, value }.
    key_dates: keyDates,
    activity: [],
    decision_checks: [],
    global_charges: [],
    budget: po.budget || null,
    created_at: seedIso(po.raisedOn),
    initiator: { name: raiser.name, email: raiser.email },
  };
};

/* ── the rest of the PO book (data/ihg/poBook.js) ────────── */

const LIFECYCLE = [
  { key: "sentOn", title: "Sent to vendor" },
  { key: "acceptedOn", title: "Vendor accepted" },
  { key: "dispatchedOn", title: "Dispatched" },
  { key: "deliveredOn", title: "Delivered" },
  { key: "grnOn", title: "Goods received (GRN)" },
  { key: "invoiceOn", title: "Invoice received" },
  { key: "paidOn", title: "Payment released" },
];

/**
 * The PO detail for an order already past (or out of) approval. Built on the
 * same projection as the five queue orders, with the decision read from the
 * record instead of the session, then the vendor and delivery lifecycle
 * appended to the audit trail — one step per dated milestone, the first
 * undated one current.
 */
export const bookPoDetail = (po) => {
  const rejected = po.status === "rejected";
  const approver = peopleById[po.approverId];
  const bigTicket = po.value > SIGN_LIMIT;
  const asQueued = {
    ...po,
    chain: [
      { personId: po.raisedBy, role: "Raised", state: "done", on: po.raisedOn },
      { personIds: [po.approverId], role: bigTicket ? "Group head approval" : "Financial approval", state: "done" },
    ],
    dates: { delivery: po.expectedOn || po.raisedOn, paymentDays: po.paymentDays, paymentNote: `${po.paymentDays} days from GRN` },
    docs: [{ group: "po" }, { group: "quote", name: `Quote_${po.rfq?.number}.pdf`, label: "Vendor quote · final" }],
  };
  const fakeSession = {
    poDecisions: {
      [po.id]: rejected
        ? { decision: "rejected", at: iso(po.rejectedOn), remarks: po.rejectReason }
        : { decision: "approved", at: iso(po.approvedOn) },
    },
  };
  const d = seededPoDetail(asQueued, fakeSession);
  const v = vendorOf(po.vendorId) || {};
  const vname = v.name || po.vendorId;
  const receiver = storeKeepers[po.propertyId];
  const t = trackingOf(po);

  const workflow = d.workflow.map((w) => (w.title === "Financial approval" && bigTicket ? { ...w, title: "Group head approval", policy: `Above ₹25L — ${approver?.name}` } : w));
  if (!rejected) {
    let current = false;
    LIFECYCLE.forEach((s) => {
      const when = po[s.key];
      if (s.key === "acceptedOn" && po.status === "rejected_by_vendor") {
        workflow.push({ status: "rejected", title: "Vendor rejected", by: vname, when: po.vendorRejectedOn, reason: po.vendorRejectReason, policy: null });
        workflow.push({ status: "current", title: "Reassign to another vendor", by: peopleById.purchase?.name, when: null, policy: "Buyer action" });
        current = true;
        return;
      }
      if (po.status === "rejected_by_vendor" && current) return;
      const by = s.key === "sentOn" ? "System" : ["acceptedOn", "dispatchedOn", "invoiceOn"].includes(s.key) ? vname : s.key === "deliveredOn" || s.key === "grnOn" ? receiver : PO_DESK;
      if (when) workflow.push({ status: "done", title: s.title, by, when: iso(when), policy: null });
      else if (!current) { current = true; workflow.push({ status: "current", title: s.title, by: null, when: null, policy: s.key === "grnOn" ? `${receiver} · ${propertiesById[po.propertyId]?.store || "store"}` : null }); }
      else workflow.push({ status: "pending", title: s.title, by: null, when: null, policy: null });
    });
    if (po.status === "completed") workflow.push({ status: "done", title: "PO closed", by: "System", when: iso(po.paidOn), policy: null });
  }

  const activity = workflow
    .filter((w) => w.when && w.status !== "pending")
    .map((w) => ({
      type: w.status === "rejected" ? "rejected" : /approval|accepted|GRN|closed/i.test(w.title) ? "approved" : "comment",
      who: w.by || "System",
      msg: w.status === "rejected" ? `${w.title.toLowerCase()} — “${w.reason || ""}”` : w.title.toLowerCase(),
      when: w.when,
      dot: w.status === "done" ? "ok" : undefined,
    }))
    .reverse();

  const keyDates = [
    { k: "Raised", v: iso(po.raisedOn) },
    po.approvedOn && { k: "Approved", v: iso(po.approvedOn) },
    po.expectedOn && { k: "Expected delivery", v: iso(po.expectedOn), soon: t?.grn_status === "overdue" },
    po.deliveredOn && { k: "Delivered", v: iso(po.deliveredOn) },
    po.grnOn && { k: "GRN posted", v: iso(po.grnOn) },
    po.invoiceOn && { k: `Invoice${po.invoiceNo ? ` ${po.invoiceNo}` : ""}`, v: iso(po.invoiceOn) },
    paymentDueOn(po) && !po.paidOn && { k: "Payment due", v: iso(paymentDueOn(po)), soon: t?.payment_status === "overdue" },
    po.paidOn && { k: "Paid", v: iso(po.paidOn) },
    { k: "Payment terms", v: `${po.paymentDays} days · ${po.paymentDays === 45 ? "MSME" : "standard"}` },
  ].filter(Boolean);

  const grnDocs = [
    po.grnOn && { group: "po", name: `GRN_${po.id}.pdf`, label: `Goods receipt · ${receiver}` },
    po.invoiceOn && { group: "po", name: `Invoice_${po.invoiceNo || po.id}.pdf`, label: "Vendor invoice" },
  ].filter(Boolean);
  const documentGroups = d.document_groups.map((g) => (g.key === "po" ? { ...g, files: [...g.files, ...grnDocs.map(({ name, label }) => ({ name, label, url: null }))] } : g));

  const statusLabel = STATUS_TEXT[po.status] || po.status;
  return {
    ...d,
    status: po.status,
    status_label: statusLabel,
    awaiting_me: false,
    current_step_label: (workflow.find((w) => w.status === "current") || {}).title || statusLabel,
    current_approvers: [],
    vendor: {
      ...d.vendor,
      name: vname,
      tagline: `${(v.categories || []).join(" & ")} · ${v.city}, ${v.state} · vendor since ${v.since}`,
      gstin: v.gst, gst: v.gst, city: v.city,
      on_time_delivery: v.performance?.onTimePct, on_time_pct: v.performance?.onTimePct,
      flags: po.note ? [{ label: po.note, type: "neutral" }] : [],
    },
    rfq: { ...d.rfq, department: po.dept },
    workflow: workflow.map((w, i) => ({ ...w, step: i + 1 })),
    activity,
    key_dates: keyDates,
    document_groups: documentGroups,
    payment_terms: [{ num: 1, name: "On delivery and GRN acceptance", due: `${po.paymentDays} days from GRN`, pct: 100, amount: po.value }],
    vendor_rejection_reason: po.vendorRejectReason || null,
    vendor_action_at: po.acceptedOn ? iso(po.acceptedOn) : po.vendorRejectedOn || null,
    tracking: t,
  };
};

/**
 * Legacy-screen fields (/dashboard/buyer/purchase-order reads a flat PO), laid
 * over a detail payload so the same order reads the same on both screens.
 */
export const withLegacyFields = (detail, po) => ({
  ...detail,
  // The full PO screen for this order. The legacy RFQ-scoped screen hands over
  // to it: its flat-PO detail cannot render a delivery lifecycle.
  detail_route: `/dashboard/buyer/purchase-orders/${po.id}`,
  rfq_id: Number(po.rfq?.id || po.rfq?.number),
  rfq_no: po.rfq?.number,
  rfq_title: po.rfq?.title,
  finalized_vendor_name: detail.vendor?.name,
  finalized_vendor_email: detail.vendor?.email,
  finalized_vendor_phone: detail.vendor?.phone,
  initiated_by_name: detail.initiator?.name,
  initiated_by_email: detail.initiator?.email,
  line_subtotal: po.subtotal,
  quantity: po.lines.reduce((s, l) => s + l.qty, 0),
  product_details: po.lines.map((l, i) => ({ id: i + 1, name: l.name, product_name: l.name, quantity: l.qty, unit_price: l.rate, unit: l.unit, gst: l.gst, total: l.amount })),
  buyer_business_unit: propertiesById[po.propertyId]?.name,
  approval_history: [],
  documents: [],
  global_charges: [],
});
