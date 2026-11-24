import { raw } from "../index";
import detailRoutes from "../detailRoutes";
import listRoutes from "../listRoutes";
import { peopleById, propertiesById } from "@/data/ihg/org";
import { vendors, vendorNumericIdOf } from "@/data/ihg/vendors";
import { itVendors } from "@/data/ihg/itRfq";
import { quotesByVendor } from "@/data/ihg/quotes";
import { purchaseOrders } from "@/data/ihg/orders";
import { bookPos } from "@/data/ihg/poBook";
import {
  rfqBook, rfqBookById, bookProducts, negotiationRounds, arcNegotiationRounds, roundById, roundTotals,
  awardedVendorsOf, pendingApprovalsFor, threadAward, vendorName, vendorIdOf, actorName, rfqQueries,
  STAGE_LABEL,
} from "@/data/ihg/rfqBook";

/**
 * RFQs, negotiations, vendors — registers, details, rounds, vendor profiles, queries.
 *
 * Seed routes for the stand demo. Registered in routes.js AHEAD of the older
 * list/detail/write routes, so a path defined here overrides the same path
 * there (first match wins). Every figure must be derived from data/ihg/*
 * fixtures, never typed in. Where a handler only refines one RFQ it hands the
 * rest back to the original route (`fallThrough`), so session RFQs, the IT
 * RFQ's masking and the stand negotiator keep their own behaviour.
 */

const iso = (d) => (d ? new Date(`${d}T10:00:00.000Z`).toISOString() : null);
const orig = (method, path) =>
  [...detailRoutes, ...listRoutes].find((r) => r.method === method && r.path === path)?.handler;
const fallThrough = (method, path, ctx) => orig(method, path)?.(ctx);

/** Who the browser is signed in as (same decoding as routes.js). */
const persona = () => {
  if (typeof window === "undefined") return peopleById.purchase;
  try {
    const p = JSON.parse(atob((localStorage.getItem("token") || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Object.values(peopleById).find((x) => x.numericId === p.sub) || peopleById.purchase;
  } catch (_) { return peopleById.purchase; }
};
const inScope = (r, who = persona()) => (r.propertyIds || []).some((p) => who.propertyIds.includes(p));
const hotelName = (ids) => (ids || []).map((p) => propertiesById[p]?.shortName).join(", ");
const allVendorRecords = () => [
  ...vendors.map((v) => ({ ...v, numericId: vendorNumericIdOf(v.id) })),
  ...itVendors.map((v, i) => ({ id: v.id, name: v.name, short: v.short, city: v.city, state: "", since: 2021, categories: ["IT infrastructure"], performance: { onTimePct: v.onTimePct, priorSpend: 0, contractsWon: 0, propertiesServed: 5 }, certifications: [{ name: "ISO 27001", status: "valid", expires: "2027-09-30" }], numericId: 7301 + i, it: true })),
];
const vendorRecord = (numericId) => allVendorRecords().find((v) => v.numericId === Number(numericId)) || null;

const ONGOING = new Set(["AWAITING_QUOTES", "COMMERCIAL_EVALUATION", "TECHNICAL_EVALUATING", "TECHNICAL_APPROVING", "NEGOTIATION_ONGOING", "QUOTATION_APPROVAL"]);
const APPROVED = new Set(["AWAITING_PO", "PO_APPROVAL", "APPROVED_COMPLETED"]);
const CLOSED = new Set(["CLOSED", "RFQ_STUCK_COMMERCIAL"]);
const bucketOf = (k) => (k === "DRAFT" ? "drafts" : k === "RFQ_APPROVAL" ? "approval" : ONGOING.has(k) ? "ongoing" : APPROVED.has(k) ? "approved" : CLOSED.has(k) ? "closed" : "ongoing");
const RFQ_TYPES = new Set(["RFQ", "TECHNICAL", "NEGOTIATION_QUOTE"]);

/* ── RFQ register row ─────────────────────────────────────────────────── */
const registerRow = (r, who) => {
  const mine = pendingApprovalsFor(who.id).find((a) => RFQ_TYPES.has(a.entity_type) && a.entity_rfq_no === r.id);
  return {
    id: Number(r.id),
    rfq_no: r.id,
    code: `RFQ-${r.id}`,
    title: r.title,
    status_key: r.statusKey,
    bucket: bucketOf(r.statusKey),
    bid_end_date: iso(r.closesOn),
    timestamp: iso(r.createdOn),
    hotel_name: hotelName(r.propertyIds),
    hotels: r.propertyIds.map((p) => ({ id: propertiesById[p].numericId, name: propertiesById[p].shortName })),
    department_title: r.department,
    invited_count: r.invited.length,
    submitted_count: r.quoted.length,
    categories: [{ title: r.category }],
    products: r.products.map((name, i) => ({ id: i + 1, name })),
    items_count: r.products.length,
    vendors_invited_names: r.invited.map(vendorName),
    created_by: peopleById[r.raisedBy]?.numericId || null,
    creator_name: actorName(r.raisedBy),
    estimated_value: r.value,
    is_pending_for_me: !!mine,
    can_approve: !!mine,
    pending_kind: mine ? "approval" : null,
    pending_reasons: mine ? [{ kind: "approval", code: mine.entity_type, label: STAGE_LABEL[r.statusKey] }] : [],
    action_holders: r.approval ? { type: "approval", label: "Waiting on", users: [{ id: peopleById[r.approval.approverId].numericId, name: peopleById[r.approval.approverId].name }] } : null,
    approval_entity_type: r.approval?.type || "RFQ",
  };
};

/** Rows the wizard published this session — from the original route, unchanged. */
const sessionRows = () =>
  (fallThrough("post", "/rfq/list-view", { body: { limit: 1000 } })?.rows || []).filter((x) => x.created_now);

const matchesFilters = (row, f = {}) => {
  const any = (sel, vals) => !sel?.length || vals.some((v) => sel.includes(String(v)));
  if (!any(f.status, [row.status_key])) return false;
  if (!any(f.buId, String(row.hotel_name || "").split(",").map((s) => s.trim()))) return false;
  if (!any(f.categoryId, (row.categories || []).map((c) => c.title || c))) return false;
  if (!any(f.departmentId, [row.department_title])) return false;
  if (!any(f.productId, (row.products || []).map((p) => p.name))) return false;
  if (!any(f.vendorId, row.vendors_invited_names || [])) return false;
  if (f.dateFrom && row.timestamp && row.timestamp.slice(0, 10) < f.dateFrom) return false;
  if (f.dateTo && row.timestamp && row.timestamp.slice(0, 10) > f.dateTo) return false;
  return true;
};

const facetsOf = (rows) => {
  const tally = (pick) => {
    const m = new Map();
    rows.forEach((r) => (pick(r) || []).forEach((k) => { if (k) m.set(k, (m.get(k) || 0) + 1); }));
    return [...m.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count);
  };
  return {
    status: tally((r) => [r.status_key]),
    buId: tally((r) => String(r.hotel_name || "").split(",").map((s) => s.trim())),
    categoryId: tally((r) => (r.categories || []).map((c) => c.title || c)),
    departmentId: tally((r) => [r.department_title]),
    productId: tally((r) => (r.products || []).map((p) => p.name)),
    vendorId: tally((r) => r.vendors_invited_names || []),
  };
};

const page = (rows, body = {}) => {
  const p = Number(body.page) || 1;
  const limit = Number(body.limit) || 20;
  const slice = rows.slice((p - 1) * limit, p * limit);
  return { rows: slice, total: rows.length, page: p, limit, data: slice, items: slice, total_items: rows.length };
};

const sortRows = (rows, sort) => {
  const s = [...rows];
  if (sort === "oldest") s.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  else if (sort === "deadline") s.sort((a, b) => String(a.bid_end_date || "9").localeCompare(String(b.bid_end_date || "9")));
  else s.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
  return s;
};

const rfqListView = ({ body = {} }) => {
  const who = persona();
  const search = String(body.search || "").toLowerCase();
  const base = [...sessionRows(), ...rfqBook.filter((r) => inScope(r, who)).map((r) => registerRow(r, who))]
    .filter((r) => !search || String(r.title).toLowerCase().includes(search) || String(r.rfq_no).includes(search))
    .filter((r) => matchesFilters(r, body.filters));
  const tabOf = {
    all: () => true,
    pending: (r) => r.is_pending_for_me,
    drafts: (r) => r.bucket === "drafts",
    approval: (r) => r.bucket === "approval",
    ongoing: (r) => r.bucket === "ongoing" || r.created_now,
    approved: (r) => r.bucket === "approved",
    closed: (r) => r.bucket === "closed",
  };
  const counts = Object.fromEntries(Object.entries(tabOf).map(([k, fn]) => [k, base.filter(fn).length]));
  const rows = sortRows(base.filter(tabOf[body.tab] || tabOf.all), body.sort);
  return {
    ...page(rows, body),
    facets: facetsOf(base),
    tab_counts: { ...counts, pending_breakdown: { approval: counts.pending, response: 0, evaluation: 0 } },
  };
};

/* ── the golden thread's award, applied to its comparison ─────────────── */
const threadAwarded = (view) => {
  const sameer = peopleById.regional;
  const ananya = peopleById.purchase;
  view.products.forEach((prod) => {
    const award = threadAward.find((a) => a.productId === Number(prod.id));
    if (!award) return;
    const vid = vendorNumericIdOf(award.vendor);
    const cell = prod.quotes?.[vid];
    if (cell) {
      // The finalised cell carries the negotiated rate, with the opening quote in its history.
      const ratio = award.rate / cell.base;
      const subtotal = award.rate * prod.qty;
      const charges = (cell.other_charges || []).map((c) => ({ ...c, amount: Math.round(c.amount * ratio) }));
      const chargeSum = charges.reduce((s, c) => s + c.amount, 0);
      const tax = Math.round(((subtotal + chargeSum) * cell.tax_pct) / 100);
      Object.assign(cell, {
        history: [{ round: 0, label: "Opening quote", unit_price: cell.base, total: cell.total, at: iso("2026-06-14") }, { round: 1, label: "NEG-535944-R1", unit_price: award.rate, total: subtotal + chargeSum + tax, at: iso("2026-07-09") }],
        base: award.rate, subtotal, other_charges: charges,
        freight: charges.find((c) => c.slug === "freight")?.amount || 0,
        packaging: charges.find((c) => c.slug === "packaging")?.amount || 0,
        tax_amt: tax, total: subtotal + chargeSum + tax,
        finalize: { ...(cell.finalize || {}), unit_price: award.rate, total_value: subtotal + chargeSum + tax },
      });
    }
    prod.state = "approved";
    prod.finalized_vendor = vid;
    prod.finalized_by = { name: ananya.name, at: iso("2026-07-13") };
    prod.awaiting_me = false;
    prod.approval = {
      current_approvers: [],
      trail: [
        { key: "sent", kind: "milestone", title: "Sent for approval", status: "done", by: ananya.name, when: iso("2026-07-13") },
        { key: "step-1", title: "L1 approval", status: "done", decision_rule: "ANY", when: iso("2026-07-15"), approvers: [{ user_id: sameer.numericId, name: sameer.name, status: "APPROVED", acted_at: iso("2026-07-15"), comment: "Award committee — approved into ARC-2627-0014." }] },
        { key: "outcome", kind: "terminal", title: "Approved", status: "done", by: sameer.name, when: iso("2026-07-15") },
      ],
    };
  });
  view.rfq = { ...view.rfq, status: "Awarded", deadline: `2026-06-30T17:00:00+05:30`, quotes_invited: 9, quotes_received: 6, rounds: { ended: 1, active: 0 } };
  view.bid_end_date = "2026-06-30T17:00:00+05:30";
  view.approval_chain = [{ num: 1, name: sameer.name, role: "Award committee" }];
  return view;
};

/* ── lifecycle for book RFQs ──────────────────────────────────────────── */
const lifecycleFor = (r) => {
  const rounds = negotiationRounds.filter((x) => x.rfqId === r.id);
  const k = r.statusKey;
  const published = !["DRAFT", "RFQ_APPROVAL"].includes(k);
  const awarded = APPROVED.has(k);
  const tech = ["TECHNICAL_EVALUATING", "TECHNICAL_APPROVING"].includes(k);
  const approver = r.approval ? peopleById[r.approval.approverId]?.name : null;
  const stage = (key, label, state, summary) => ({ key, label, state, summary });
  const poSummary = r.thread
    ? `Call-off PO #${r.poIds[0]} against ${r.arcId} — pending approval`
    : r.arcId && awarded ? `Awarded into ${r.arcId} — orders are call-offs` : awarded ? "Award approved — PO to be raised" : undefined;
  return {
    // Only the thread has a book-accurate comparison grid yet; the others open on
    // their overview so the sheet never shows another RFQ's products.
    default_stage: r.thread ? "negotiation-award" : "overview",
    stage: awarded ? "awarded" : k.toLowerCase(),
    stages: [
      stage("overview", "Overview", published ? "complete" : "active",
        k === "DRAFT" ? "Draft — not yet submitted" : k === "RFQ_APPROVAL" ? `Awaiting publish approval from ${approver}` : `Published · ${r.quoted.length} of ${r.invited.length} responded`),
      stage("technical", "Technical evaluation", tech ? "active" : (published && ["535921", "535928"].includes(r.id)) ? "complete" : "skipped",
        k === "TECHNICAL_APPROVING" ? `Scored · awaiting technical sign-off from ${approver}` : tech ? "Scoring in progress" : undefined),
      stage("negotiation-award", "Negotiation & award", !published || tech || CLOSED.has(k) ? (CLOSED.has(k) ? "skipped" : "locked") : awarded ? "complete" : "active",
        CLOSED.has(k) ? r.closeNote : awarded ? `${rounds.length} round${rounds.length === 1 ? "" : "s"} · awarded to ${awardedVendorsOf(r.id).map(vendorName).join(", ")}`
          : k === "QUOTATION_APPROVAL" ? `Finalised ${r.finalisedOn} · awaiting award approval from ${approver}`
          : rounds.length ? `${rounds.length} round${rounds.length === 1 ? "" : "s"} · ${rounds[rounds.length - 1].ref} ${rounds[rounds.length - 1].state.replace(/_/g, " ")}` : published ? "Quotes in — ready to negotiate or award" : undefined),
      stage("purchase-order", "Purchase order", awarded ? "active" : "locked", poSummary),
    ],
    permissions: { read: true, update: true },
  };
};

/* ── negotiation list rows ────────────────────────────────────────────── */
const roundRow = (x, who) => {
  const r = x.arcId ? { title: x.title, propertyIds: x.propertyIds, department: x.department } : rfqBookById[x.rfqId];
  const vendorsIn = [...new Set(x.lines.map((l) => l.vendor))];
  const responded = [...new Set(x.lines.filter((l) => l.achieved != null).map((l) => l.vendor))];
  const mine = x.state === "awaiting_approval" && x.approverId === who.id;
  return {
    round_id: x.id,
    id: x.id,
    round_number: x.n,
    stored_round_number: x.n,
    rfq_id: x.rfqId ? Number(x.rfqId) : null,
    rfq_no: x.rfqId || x.arcId,
    arc_id: x.arcId || null,
    arc_number: x.arcId || null,
    source_type: x.arcId ? "ARC" : "RFQ",
    parent_key: x.arcId ? `ARC:${x.arcId}` : `RFQ:${x.rfqId}`,
    title: r.title,
    neg_status: x.state,
    item_names: [...new Set(x.lines.map((l) => l.product))],
    invited_count: vendorsIn.length,
    quotes_received: responded.length,
    round_created_at: iso(x.createdOn),
    end_date: `${x.endOn} 12:30:00`,
    closed_at: x.closedOn ? iso(x.closedOn) : null,
    action_required: mine,
    action_label: mine ? "Your approval" : null,
    hotel_name: hotelName(r.propertyIds),
    department_title: r.department,
  };
};

const parentRows = (who) => {
  const all = [...negotiationRounds, ...arcNegotiationRounds].filter((x) => inScope(x.arcId ? x : rfqBookById[x.rfqId], who));
  const groups = {};
  all.forEach((x) => { const key = x.arcId ? `ARC:${x.arcId}` : `RFQ:${x.rfqId}`; (groups[key] = groups[key] || []).push(x); });
  const ORDER = ["awaiting_approval", "open_with_vendors", "ready_for_decision", "no_vendor_response", "concluded", "lapsed", "cancelled"];
  return Object.entries(groups).map(([key, rounds]) => {
    const first = rounds[0];
    const r = first.arcId ? { title: first.title, propertyIds: first.propertyIds, department: first.department } : rfqBookById[first.rfqId];
    const state = ORDER.find((s) => rounds.some((x) => x.state === s));
    const counts = Object.fromEntries(ORDER.map((s) => [s, rounds.filter((x) => x.state === s).length]));
    const lines = rounds.flatMap((x) => x.lines);
    const vendorSlugs = [...new Set(lines.map((l) => l.vendor))];
    const awarded = first.arcId ? [] : awardedVendorsOf(first.rfqId);
    const tot = rounds.map(roundTotals).reduce((a, t) => ({ baseline: a.baseline + t.baseline, saved: a.saved + t.saved }), { baseline: 0, saved: 0 });
    const aw = rounds.flatMap((x) => x.lines.filter((l) => awarded.includes(l.vendor)));
    const awBase = aw.reduce((s, l) => s + l.baseline * l.qty, 0);
    const awSaved = aw.reduce((s, l) => s + (l.achieved == null ? 0 : (l.baseline - l.achieved) * l.qty), 0);
    const mine = rounds.some((x) => x.state === "awaiting_approval" && x.approverId === who.id);
    const open = rounds.filter((x) => ["awaiting_approval", "open_with_vendors"].includes(x.state));
    return {
      parent_key: key,
      source_type: first.arcId ? "ARC" : "RFQ",
      rfq_id: first.rfqId ? Number(first.rfqId) : null,
      rfq_no: first.rfqId || first.arcId,
      arc_id: first.arcId || null,
      arc_number: first.arcId || null,
      title: r.title,
      neg_status: state,
      state_counts: counts,
      round_count: rounds.length,
      vendors: vendorSlugs.map((s) => ({ id: vendorIdOf(s), name: vendorName(s) })),
      vendor_count: vendorSlugs.length,
      item_names: [...new Set(lines.map((l) => l.product))],
      product_count: new Set(lines.map((l) => l.product)).size,
      quotes_received: rounds.reduce((s, x) => s + new Set(x.lines.filter((l) => l.achieved != null).map((l) => l.vendor)).size, 0),
      hotel_name: hotelName(r.propertyIds),
      department_title: r.department,
      first_round_at: iso(rounds[0].createdOn),
      last_activity_at: iso(rounds.map((x) => x.closedOn || x.approvedOn || x.createdOn).sort().pop()),
      next_deadline: open.length ? `${open[0].endOn} 12:30:00` : null,
      action_required: mine,
      action_label: mine ? "Your approval" : null,
      savings_pairs_counted: first.arcId ? 0 : lines.filter((l) => l.achieved != null).length,
      baseline_total: first.arcId ? 0 : tot.baseline,
      saved_value: first.arcId ? 0 : tot.saved,
      saved_pct: first.arcId || !tot.baseline ? null : Number(((tot.saved / tot.baseline) * 100).toFixed(2)),
      savings_pairs_counted_awarded: aw.length,
      baseline_total_awarded: awBase,
      saved_value_awarded: awSaved,
      saved_pct_awarded: awBase ? Number(((awSaved / awBase) * 100).toFixed(2)) : null,
      sort_at: rounds.map((x) => x.createdOn).sort().pop(),
    };
  });
};

const negListView = ({ body = {} }) => {
  const who = persona();
  const f = body.filters || {};
  const search = String(body.search || "").toLowerCase();
  if (body.groupBy === "round") {
    let rounds = [...negotiationRounds, ...arcNegotiationRounds]
      .filter((x) => !f.parentKey?.length || f.parentKey.includes(x.arcId ? `ARC:${x.arcId}` : `RFQ:${x.rfqId}`))
      .map((x) => roundRow(x, who));
    if (body.needsMyApproval) rounds = rounds.filter((x) => x.action_required);
    rounds.sort((a, b) => b.round_number - a.round_number);
    return page(rounds, body);
  }
  const all = parentRows(who);
  const closedStates = new Set(["no_vendor_response", "concluded", "lapsed", "cancelled"]);
  const sourceOk = (x) => !body.source || body.source === "all" || x.source_type === body.source;
  const scoped = all
    .filter((x) => !f.parentKey?.length || f.parentKey.includes(x.parent_key))
    .filter((x) => !search || String(x.title).toLowerCase().includes(search) || String(x.rfq_no).includes(search))
    .filter((x) => !f.status?.length || f.status.includes(x.neg_status))
    .filter((x) => !f.buId?.length || x.hotel_name.split(",").some((h) => f.buId.includes(h.trim())))
    .filter((x) => !f.departmentId?.length || f.departmentId.includes(x.department_title))
    .filter((x) => !f.productId?.length || x.item_names.some((n) => f.productId.includes(n)))
    .filter((x) => !f.vendorId?.length || x.vendors.some((v) => f.vendorId.includes(v.name)));
  const bySource = scoped.filter(sourceOk);
  const tabFn = { all: () => true, for_me: (x) => x.action_required, needs_attention: (x) => !closedStates.has(x.neg_status), closed: (x) => closedStates.has(x.neg_status) };
  let rows = bySource.filter(tabFn[body.tab] || tabFn.all);
  if (body.needsMyApproval) rows = rows.filter((x) => x.action_required);
  const sorters = {
    oldest: (a, b) => a.sort_at.localeCompare(b.sort_at),
    rounds: (a, b) => b.round_count - a.round_count,
    savings: (a, b) => b.saved_value - a.saved_value,
    status: (a, b) => a.neg_status.localeCompare(b.neg_status),
  };
  rows.sort(sorters[body.sort] || ((a, b) => b.sort_at.localeCompare(a.sort_at)));
  const tally = (pick) => {
    const m = new Map();
    bySource.forEach((x) => (pick(x) || []).forEach((k) => m.set(k, (m.get(k) || 0) + 1)));
    return [...m.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count);
  };
  return {
    ...page(rows, body),
    tab_counts: { all: bySource.length, needs_attention: bySource.filter(tabFn.needs_attention).length, closed: bySource.filter(tabFn.closed).length, for_me: bySource.filter(tabFn.for_me).length },
    source_counts: { all: scoped.length, RFQ: scoped.filter((x) => x.source_type === "RFQ").length, ARC: scoped.filter((x) => x.source_type === "ARC").length },
    facets: {
      status: tally((x) => [x.neg_status]).map((o) => ({ ...o, label: NEG_LABEL[o.key] || o.key })),
      buId: tally((x) => x.hotel_name.split(",").map((s) => s.trim())),
      departmentId: tally((x) => [x.department_title]),
      productId: tally((x) => x.item_names),
      vendorId: tally((x) => x.vendors.map((v) => v.name)),
    },
  };
};

const NEG_LABEL = { awaiting_approval: "Awaiting approval", open_with_vendors: "Open with vendors", ready_for_decision: "Ready for your decision", no_vendor_response: "Closed — no vendor response", concluded: "Concluded", lapsed: "Lapsed — never approved", cancelled: "Cancelled" };

/* ── round detail ─────────────────────────────────────────────────────── */
const roundDetail = (x) => {
  const who = persona();
  const isArc = !!x.arcId;
  const r = isArc ? { title: x.title, propertyIds: x.propertyIds, department: x.department } : rfqBookById[x.rfqId];
  const siblings = isArc ? arcNegotiationRounds.filter((y) => y.arcId === x.arcId) : negotiationRounds.filter((y) => y.rfqId === x.rfqId);
  const awarded = isArc ? [] : awardedVendorsOf(x.rfqId);
  const t = roundTotals(x);
  const creator = peopleById[x.createdBy] || { name: actorName(x.createdBy) };
  const approver = peopleById[x.approverId];
  const pending = x.state === "awaiting_approval";
  const lines = x.lines.map((l, i) => ({
    line_id: `${x.id}-${i}`, rfq_product_id: l.productId, product_name: l.product, vendor_id: vendorIdOf(l.vendor), vendor_name: vendorName(l.vendor),
    quantity: l.qty, uom: l.uom, baseline_unit_price: l.baseline, baseline_source: "previous_round", target_unit_price: l.target, target_mode: "value", target_field: "base_price",
    responded: l.achieved != null, achieved_unit_price: l.achieved, responded_at: l.achieved != null ? iso(x.closedOn || x.endOn) : null,
    vendor_approval_status: x.state === "concluded" ? (awarded.includes(l.vendor) ? "APPROVED" : "NOT_SELECTED") : null,
  }));
  const vendorSlugs = [...new Set(x.lines.map((l) => l.vendor))];
  return {
    round: {
      round_id: x.id, round_number: x.n, rounds_on_parent: siblings.length, rounds_on_products: siblings.length,
      state: x.state, status: x.status, source_type: isArc ? "ARC" : "RFQ", rfq_id: x.rfqId ? Number(x.rfqId) : null,
      created_by: { name: creator.name, email: creator.email || null, designation: creator.title || null },
      created_at: iso(x.createdOn), end_date: `${x.endOn} 12:30:00`, closed_at: x.closedOn ? iso(x.closedOn) : null,
      approved_at: x.approvedOn ? iso(x.approvedOn) : null, published_at: x.approvedOn ? iso(x.approvedOn) : null,
      has_approved_quote: x.state === "concluded" && awarded.length > 0, remarks: `${x.ref}`,
    },
    parent: { rfq_id: x.rfqId ? Number(x.rfqId) : null, rfq_no: x.rfqId || null, arc_id: x.arcId || null, arc_number: x.arcId || null, title: r.title, hotel_name: hotelName(r.propertyIds), department_name: r.department, company_name: "Workwise Hospitality" },
    lines,
    totals: {
      lines_total: lines.length, lines_responded: lines.filter((l) => l.responded).length,
      baseline_total: t.baseline, achieved_total: t.achieved, saved_value: t.saved, saved_pct: t.pct,
      target_total: x.lines.reduce((s, l) => s + l.target * l.qty, 0), lines_with_numeric_target: lines.length,
      vendors_total: vendorSlugs.length, vendors_responded: new Set(x.lines.filter((l) => l.achieved != null).map((l) => l.vendor)).size,
    },
    vendors: vendorSlugs.map((s) => {
      const vl = x.lines.filter((l) => l.vendor === s);
      const rec = vendors.find((v) => v.id === s);
      return {
        vendor_id: vendorIdOf(s), vendor_name: vendorName(s), email: rec ? `sales@${s}.in` : null,
        has_responded: vl.some((l) => l.achieved != null), last_responded_at: vl.some((l) => l.achieved != null) ? iso(x.closedOn || x.endOn) : null,
        lines: vl.length, lines_responded: vl.filter((l) => l.achieved != null).length,
        saved_value: vl.reduce((a, l) => a + (l.achieved == null ? 0 : (l.baseline - l.achieved) * l.qty), 0),
        approval_status: x.state === "concluded" ? (awarded.includes(s) ? "APPROVED" : "NOT_SELECTED") : null,
      };
    }),
    history: siblings.map((y) => ({ round_id: y.id, round_number: y.n, state: y.state, saved_value: roundTotals(y).saved, baseline_value: roundTotals(y).baseline, achieved_value: roundTotals(y).achieved, end_date: `${y.endOn} 12:30:00`, responded_count: new Set(y.lines.filter((l) => l.achieved != null).map((l) => l.vendor)).size, line_count: y.lines.length, is_current: y.id === x.id })),
    approval: {
      status: pending ? "PENDING" : "APPROVED",
      is_pending_for_me: pending && x.approverId === who.id,
      my_status: x.approverId === who.id ? (pending ? "PENDING" : "APPROVED") : null,
      pending_with: pending ? [{ user_id: approver.numericId, name: approver.name, email: approver.email }] : [],
      instances: [{
        status: pending ? "PENDING" : "APPROVED", current_step: 1, total_steps: 1, initiated_by: { name: creator.name },
        steps: [{ step_id: "s1", step_order: 1, status: pending ? "PENDING" : "APPROVED", decision_rule: "ANY", acted_at: pending ? null : iso(x.approvedOn), approvers: [{ user_id: approver.numericId, name: approver.name, email: approver.email, status: pending ? "PENDING" : "APPROVED", acted_at: pending ? null : iso(x.approvedOn) }] }],
      }],
    },
    actions: { can_approve: pending && x.approverId === who.id, can_reject: pending && x.approverId === who.id, can_view_quotes: true },
    cumulative: { saved_value: siblings.filter((y) => y.n <= x.n).reduce((s, y) => s + roundTotals(y).saved, 0), baseline_total: roundTotals(siblings[0]).baseline, rounds_counted: siblings.filter((y) => y.n <= x.n).length, from_round_number: 1, to_round_number: x.n },
    cycle: { sibling_count: 1 },
    scope: "round",
  };
};

/** Per-product round list ViewRFQ reads (bare array). */
const roundsForRfq = (rfqId, productId) =>
  negotiationRounds
    .filter((x) => x.rfqId === String(rfqId))
    .filter((x) => !productId || x.lines.some((l) => l.productId === productId))
    .map((x) => ({
      id: x.id, round_number: x.n, rfq_id: Number(rfqId), rfq_product_id: null,
      products: [...new Set(x.lines.map((l) => l.productId))].map((id) => ({ rfq_product_id: id })),
      status: x.status, created_by_name: actorName(x.createdBy), created_at: iso(x.createdOn), end_date: iso(x.endOn),
      vendors_invited: new Set(x.lines.map((l) => l.vendor)).size,
      vendors_responded: new Set(x.lines.filter((l) => l.achieved != null).map((l) => l.vendor)).size,
      savings_delivered: roundTotals(x).saved, note: x.ref,
    }));

/* ── vendor profile ───────────────────────────────────────────────────── */
const vendorSpend = (slug) => {
  // Business value = purchase orders raised with the vendor (queue + book),
  // excluding ones the approver or the vendor rejected. Awards are counted as
  // contracts, not added again — a call-off PO is already the award's money.
  const seen = new Set();
  const pos = [...purchaseOrders, ...bookPos]
    .filter((p) => p.vendorId === slug && !/reject/i.test(p.status || ""))
    .filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));
  const awards = [...(threadAward.some((l) => l.vendor === slug) ? ["ARC-2627-0014"] : []), ...rfqBook.filter((r) => !r.thread && r.awardedTo?.includes(slug)).map((r) => r.arcId || `RFQ #${r.id}`)];
  return { pos, poValue: pos.reduce((s, p) => s + p.value, 0), awardValue: 0, contracts: awards };
};
const rfqsOfVendor = (slug) => rfqBook.filter((r) => r.invited.includes(slug));

const vendorProfile = (v) => {
  const slug = v.id;
  const q = quotesByVendor[slug];
  return {
    id: v.numericId, user_id: v.numericId, company_name: v.name, vendor_name: v.name, status: 1,
    email: `sales@${slug.replace(/^it-/, "")}.in`, mobile: `+91 98${String(v.numericId).slice(-3)}0 ${String(10000 + v.numericId).slice(-5)}`,
    website: `www.${slug.replace(/^it-/, "")}.in`, established_year: v.since ? v.since - 9 : null,
    nature_of_business: v.it ? "Systems integrator" : "Manufacturer & supplier", type_of_business: "Private limited company",
    no_of_employess: 120 + (v.numericId % 7) * 45, turnover: 40 + (v.numericId % 9) * 12, gstin: v.gst || null,
    profile: `${v.name} — ${(v.categories || []).join(", ")}. Based in ${v.city}${v.state ? `, ${v.state}` : ""}; on Workwise Hospitality's approved vendor list since ${v.since}.${v.risk?.note ? ` ${v.risk.note}` : ""}`,
    location: [{ city_name: v.city, state_name: v.state, country_name: "India" }],
    subscribed_categories: (v.categories || []).map((c, i) => ({ item_id: i + 1, title: c, item_type: "category" })),
    compliance_docs: [
      { document_type: "pan", document_number: v.gst ? v.gst.slice(2, 12) : null, document_url: "#" },
      v.gst ? { document_type: "gst", document_number: v.gst, document_url: "#" } : null,
      { document_type: "msme", document_number: `UDYAM-${(v.state || "MH").slice(0, 2).toUpperCase()}-03-00${v.numericId}`, document_url: "#" },
    ].filter(Boolean),
    bank_details: { account_holder_name: v.name, bank_name: "HDFC Bank", account_number_masked: `XXXXXX${String(v.numericId * 7).slice(-4)}`, ifsc_code: "HDFC0000240" },
    vendor_info: (v.certifications || []).map((c, i) => ({ id: i + 1, file_type: "certification", file_name: `${c.name} (${c.status}, expires ${c.expires}).pdf`, file_url: "#", created_at: iso("2026-04-01"), is_approved: c.status === "valid" })),
    spoc_details: [{ id: 1, name: q ? "Sales desk" : "Key accounts", role: "Key account manager", email: `kam@${slug.replace(/^it-/, "")}.in`, mobile: "+91 98200 41000" }],
  };
};

/* ── queries ──────────────────────────────────────────────────────────── */
const sentQueries = () => {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.sessionStorage.getItem("ww-demo-queries") || "{}"); } catch (_) { return {}; }
};
const threadOf = (rfqId, slug) => [
  ...(rfqQueries[rfqId]?.[slug] || []).map(([direction, created_at, message_text], i) => ({ message_id: `${rfqId}-${slug}-${i}`, direction, created_at, message_text, sender_name: direction === "sent" ? "Ananya Rao" : vendorName(slug), files: [] })),
  ...(sentQueries()[`${rfqId}:${vendorIdOf(slug)}`] || []),
];

/* ── routes ───────────────────────────────────────────────────────────── */
const rfqRoutes = [
  { method: "post", path: "/rfq/list-view", handler: rfqListView },
  {
    method: "post",
    path: "/rfq/get-draft-rfqs",
    // StartRFQ checks `res.status === 1` on the peeled body, so this IS the envelope.
    handler: ({ body = {} }) => {
      const res = rfqListView({ body: { tab: "drafts", page: body.page, limit: body.limit || 5 } });
      return raw({ status: 1, data: res.rows, total_items: res.total, total: res.total });
    },
  },
  {
    method: "get",
    path: "/rfq/get-draft-by-id/:id",
    handler: (ctx) => {
      const r = rfqBookById[String(ctx.params.id)];
      const base = fallThrough("get", "/rfq/get-draft-by-id/:id", ctx);
      if (!r || !base) return base;
      const owner = peopleById[r.raisedBy] || peopleById.purchase;
      return {
        ...base,
        rfq_form_data: { ...base.rfq_form_data, title: r.title, contact_name: owner.name, spoc_name: owner.name, spoc_email: owner.email },
        rfq_products: bookProducts(r.id).map((p) => ({
          id: p.id, product_id: p.id, product_variant_id: p.id, name: p.name, variant: p.name, unit: p.uom, quantity: p.qty, comment: "",
          spec: [{ title: "Quantity", value: p.qty }, { title: "Unit", value: p.uom }], specs: [{ title: "Quantity", value: p.qty }, { title: "Unit", value: p.uom }],
          vendors: [], datasheet_file: [], spec_file: [], qap_file: [],
        })),
        mappedHotels: r.propertyIds.map((pid) => ({ hotel_id: propertiesById[pid].numericId, hotel_name: propertiesById[pid].name, hospitality_company_id: 1, company_name: "Workwise Hospitality" })),
      };
    },
  },
  {
    method: "get",
    path: "/rfq/draft",
    // A fresh draft. CreateRFQ asks for one on first render, before the router
    // has read ?draft_id=, and puts rfq_form_data straight into the store; the
    // old fixture returned null, which crashed the form (reading 'terms').
    // Same defaults as a reopened draft, with no products yet.
    handler: (ctx) => {
      const base = fallThrough("get", "/rfq/get-draft-by-id/:id", { ...ctx, params: { id: "new" } });
      if (!base) return { rfq_id: null, rfq_form_data: { terms: [], term_and_condition_files: [] }, rfq_products: [], mappedHotels: [] };
      return { ...base, rfq_id: null, rfq_products: [] };
    },
  },
  {
    method: "get",
    path: "/rfq/getRfqById/:id",
    handler: (ctx) => {
      const id = String(ctx.params.id);
      const base = fallThrough("get", "/rfq/getRfqById/:id", ctx);
      const r = rfqBookById[id];
      if (!r || r.it || !base) return base;
      if (r.thread) return { ...base, created_at: iso(r.createdOn), bid_end_date: iso(r.closesOn), status: 2, lifecycle_stage: "awarded", po_completed: false };
      const owner = peopleById[r.raisedBy];
      return {
        ...base,
        id: Number(id), rfq_no: id, title: r.title, department_name: r.department,
        hotel_id: propertiesById[r.propertyIds[0]].numericId, hotel_ids: r.propertyIds.map((p) => propertiesById[p].numericId),
        hotel_name: hotelName(r.propertyIds), location: propertiesById[r.propertyIds[0]].address,
        contact_name: actorName(r.raisedBy), contact_number: owner?.phone || base.contact_number,
        bid_end_date: iso(r.closesOn), tender_publish_date: iso(r.publishedOn), created_at: iso(r.createdOn),
        is_published: !["DRAFT", "RFQ_APPROVAL"].includes(r.statusKey), is_quotes_present: r.quoted.length > 0,
        status: CLOSED.has(r.statusKey) || APPROVED.has(r.statusKey) ? 2 : 1,
        close_comment: r.closeNote || null, lifecycle_stage: r.statusKey.toLowerCase(),
        unseen_query_count: 0,
        products: bookProducts(id).map((p) => {
          const spec = [{ title: "Quantity", value: String(p.qty) }, { title: "Unit", value: p.uom }, { title: "Specification", value: p.name }];
          return { id: p.id, product_id: p.id, name: p.name, product_details: [{ name: p.name, product_name: p.name }], variant: p.name, quantity: p.qty, unit: p.uom, spec, product_specs: spec, vendors_count: r.invited.length, participated_vendors_count: r.quoted.length };
        }),
      };
    },
  },
  {
    method: "get",
    path: "/rfq/:id/lifecycle",
    handler: (ctx) => {
      const r = rfqBookById[String(ctx.params.id)];
      if (r?.it) {
        const out = fallThrough("get", "/rfq/:id/lifecycle", ctx);
        const ov = out?.stages?.find((x) => x.key === "overview");
        if (ov) ov.summary = `Published · ${r.quoted.length} of ${r.invited.length} responded · bidding closed`;
        return out;
      }
      if (!r) return fallThrough("get", "/rfq/:id/lifecycle", ctx);
      return lifecycleFor(r);
    },
  },
  {
    method: "get",
    path: "/rfq/quote-comparison-view/:id",
    handler: (ctx) => {
      const out = fallThrough("get", "/rfq/quote-comparison-view/:id", ctx);
      if (String(ctx.params.id) !== "535944" || !out?.value) return out;
      return raw(threadAwarded(out.value));
    },
  },
  {
    method: "get",
    path: "/negotiation/rounds/:id/approval-bundle",
    handler: ({ params }) => {
      const id = String(params.id);
      const who = persona();
      const rounds = negotiationRounds.filter((x) => x.rfqId === id);
      const instances = Object.fromEntries(rounds.map((x) => {
        const a = peopleById[x.approverId];
        const pending = x.state === "awaiting_approval";
        return [String(x.id), [{ status: pending ? "PENDING" : "APPROVED", can_user_approve: pending && x.approverId === who.id, approver: { user_id: a.numericId, name: a.name }, acted_at: pending ? null : iso(x.approvedOn) }]];
      }));
      const award = rfqBookById[id];
      const quoteInstances = award?.approval?.type === "NEGOTIATION_QUOTE" || APPROVED.has(award?.statusKey)
        ? { [id]: [{ status: award.approval ? "PENDING" : "APPROVED", can_user_approve: award.approval?.approverId === who.id }] }
        : {};
      return {
        negotiation_instances: instances,
        negotiation_quote_instances: quoteInstances,
        rounds_history: rounds.map((x) => ({ id: x.id, round_number: x.n, status: x.state === "awaiting_approval" ? "PENDING_APPROVAL" : x.status, end_date: `${x.endOn} 12:30:00`, created_at: iso(x.createdOn) })),
      };
    },
  },
  {
    method: "get",
    path: "/negotiation/rounds/:id/active-all",
    handler: (ctx) => {
      const id = String(ctx.params.id);
      if (!negotiationRounds.some((x) => x.rfqId === id)) return fallThrough("get", "/negotiation/rounds/:id/active-all", ctx);
      const rounds = roundsForRfq(id);
      return { rounds, active: rounds.find((x) => x.status === "ACTIVE") || null, total_rounds: rounds.length, prior_rounds: rounds.length };
    },
  },
  {
    method: "get",
    path: "/negotiation/rounds/:id/detail",
    handler: ({ params }) => {
      const x = roundById(params.id);
      return x ? roundDetail(x) : undefined;
    },
  },
  {
    method: "get",
    path: "/negotiation/rounds/:id",
    handler: (ctx) => {
      const id = String(ctx.params.id);
      if (!negotiationRounds.some((x) => x.rfqId === id)) return fallThrough("get", "/negotiation/rounds/:id", ctx);
      const pid = Number((String(ctx.config?.url || "").match(/rfq_product_id=(\d+)/) || [])[1]);
      return roundsForRfq(id, pid || null);
    },
  },
  { method: "post", path: "/negotiation/list-view", handler: negListView },

  /* vendor master + profiles */
  {
    method: "get",
    path: "/vendors/master",
    handler: () =>
      allVendorRecords().map((v) => {
        const spend = vendorSpend(v.id);
        const rfqs = rfqsOfVendor(v.id);
        const props = new Set(rfqs.flatMap((r) => r.propertyIds));
        const certs = v.certifications || [];
        return {
          id: v.numericId, slug: v.id, name: v.name, city: v.city, state: v.state, since: v.since, categories: v.categories || [],
          properties: [...props].map((p) => propertiesById[p].shortName),
          status: certs.some((c) => c.status === "expired") ? "Flagged" : "Approved",
          documents_valid: certs.filter((c) => c.status === "valid").length, documents_total: certs.length + 2,
          rfqs_invited: rfqs.length, rfqs_quoted: rfqs.filter((r) => r.quoted.includes(v.id)).length,
          business_value: spend.poValue + spend.awardValue, on_time_pct: v.performance?.onTimePct ?? null,
          risk: v.risk?.level || "low",
        };
      }),
  },
  {
    method: "get",
    path: "/users/vendor-profile/:id/engagement",
    handler: ({ params }) => {
      const v = vendorRecord(params.id);
      if (!v) return undefined;
      const spend = vendorSpend(v.id);
      const rfqs = rfqsOfVendor(v.id);
      return { rfqs_participated: rfqs.filter((r) => r.quoted.includes(v.id)).length, rfqs_invited: rfqs.length, pos_released: spend.pos.length, total_value: spend.poValue + spend.awardValue, po_value: spend.poValue, award_value: spend.awardValue, contracts_awarded: spend.contracts.length };
    },
  },
  {
    method: "get",
    path: "/users/vendor-profile/:id",
    handler: ({ params }) => {
      const v = vendorRecord(params.id);
      return v ? raw({ data: vendorProfile(v), subscription: null, logged_In: true }) : undefined;
    },
  },
  {
    method: "get",
    path: "/rfq/get-past-rfqs/:id",
    handler: ({ params }) => {
      const v = vendorRecord(params.id);
      return (v ? rfqsOfVendor(v.id) : []).map((r) => ({ id: Number(r.id), rfq_no: r.id, name: `${r.title} — ${r.quoted.includes(v.id) ? "quoted" : "invited"} · ${STAGE_LABEL[r.statusKey]}` }));
    },
  },
  {
    method: "get",
    path: "/users/get-vendor-payment-terms",
    handler: ({ config }) => {
      const id = Number((String(config?.url || "").match(/vendor_id=(\d+)/) || [])[1]);
      const v = vendorRecord(id);
      const q = v ? quotesByVendor[v.id] : null;
      const days = Number(String(q?.paymentTerms || "30").match(/\d+/)?.[0] || 30);
      return [
        { value: "100%", type: "credit", days, comment: q?.paymentTerms || `${days} days from GRN against a valid tax invoice` },
      ];
    },
  },

  /* queries */
  {
    method: "post",
    path: "/rfq/get-details",
    handler: ({ body }) => {
      const r = rfqBookById[String(body?.rfq_id)];
      return { rfq_id: Number(body?.rfq_id), rfq_no: String(body?.rfq_id), title: r?.title, is_tender: 0, created_by: peopleById.purchase.numericId, contact_name: actorName(r?.raisedBy), company_name: "Workwise Hospitality" };
    },
  },
  {
    method: "post",
    path: "/rfq/list-queries",
    handler: ({ body }) => {
      const id = String(body?.rfq_id);
      const r = rfqBookById[id];
      const q = String(body?.user_name || "").toLowerCase();
      return (r?.quoted || [])
        .map((slug) => {
          const msgs = threadOf(id, slug);
          const last = msgs[msgs.length - 1];
          return { user_id: vendorIdOf(slug), company_name: vendorName(slug), user_name: vendorName(slug), last_message: last?.message_text || null, unseen_count: last?.direction === "received" ? 1 : 0, last_at: last?.created_at || "" };
        })
        .filter((v) => !q || v.company_name.toLowerCase().includes(q))
        .sort((a, b) => String(b.last_at).localeCompare(String(a.last_at)));
    },
  },
  {
    method: "post",
    path: "/rfq/list-query-messages",
    handler: ({ body }) => {
      const id = String(body?.rfq_id);
      const slug = (rfqBookById[id]?.quoted || []).find((s) => vendorIdOf(s) === Number(body?.receiver_id));
      return slug ? threadOf(id, slug) : [];
    },
  },
  {
    method: "post",
    path: "/rfq/send-query-message",
    handler: ({ body }) => {
      const get = (k) => (body && typeof body.get === "function" ? body.get(k) : body?.[k]);
      const key = `${get("rfq_id")}:${get("receiver_id")}`;
      const store = sentQueries();
      store[key] = [...(store[key] || []), { message_id: `s-${Date.now()}`, direction: "sent", created_at: new Date().toISOString(), message_text: String(get("message_text") || ""), sender_name: persona().name, files: [] }];
      try { window.sessionStorage.setItem("ww-demo-queries", JSON.stringify(store)); } catch (_) { /* private mode */ }
      return raw({ status: 1, message: "Sent" });
    },
  },
];

export default rfqRoutes;
