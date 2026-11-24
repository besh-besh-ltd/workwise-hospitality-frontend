/**
 * Rate contracts — portfolio, stages, spend, create form.
 *
 * Seed routes for the stand demo. Registered in routes.js AHEAD of the older
 * list/detail/write routes, so a path defined here overrides the same path
 * there (first match wins). Every figure must be derived from data/ihg/*
 * fixtures, never typed in.
 *
 * Source of truth: data/ihg/contracts.js (the portfolio) and the call-off POs
 * in data/ihg/orders.js. Fixed paths (/categories, /hotels, …) are declared
 * before /arc-v2/:id, which would otherwise swallow them.
 */
import { peopleById, propertiesById, properties, company } from "@/data/ihg/org";
import { vendorsById } from "@/data/ihg/vendors";
import {
  portfolio, contractsById, arcCategories, TECH_EVAL_ARC_ID, committedValue, estimatedValue, consumedValue,
  callOffsFor, awardedVendors, isAwarded, pendingArcIdsFor, visibleTo, arcEvents, daysFromToday,
} from "@/data/ihg/contracts";
import { withArcTechApproval, isApproverView } from "../arcTechEval";

/* ── who is signed in ──────────────────────────────────────── */
const persona = () => {
  if (typeof window === "undefined") return peopleById.purchase;
  try {
    const p = JSON.parse(atob((localStorage.getItem("token") || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Object.values(peopleById).find((x) => x.numericId === p.sub) || peopleById.purchase;
  } catch (_) { return peopleById.purchase; }
};

const vendorIndex = Object.keys(vendorsById);
const vNum = (slug) => 7101 + vendorIndex.indexOf(slug);
const vName = (slug) => vendorsById[slug]?.name || slug;
const hotelNum = (pid) => propertiesById[pid]?.numericId;
const hotelName = (pid) => propertiesById[pid]?.shortName;
const iso = (d) => (d ? new Date(d.length > 10 ? `${d}:00+05:30` : `${d}T10:00:00+05:30`).toISOString() : null);
const naive = (d) => (d ? `${d}:00` : null);
const DEPTS = { housekeeping: { id: 21, title: "Housekeeping" }, fnb: { id: 22, title: "Food & Beverage" }, "front-office": { id: 23, title: "Front Office" } };
const catOf = (c) => arcCategories.find((x) => x.title === c.category);
const subOf = (c) => catOf(c)?.subs.find((s) => s.title === c.sub);
const person = (id) => peopleById[id];

/* ── status → bucket (mirrors ContractsListPage.statusBucket) ─ */
const bucketOf = (s) => {
  if (["draft", "pending_publish_approval", "publish_rejected"].includes(s)) return "draft";
  if (["floated", "submission_closed"].includes(s)) return "floated";
  if (["tech_eval_in_progress", "tech_eval_approved", "tech_eval_rejected", "comm_eval_in_progress"].includes(s)) return "eval";
  if (["comm_eval_finalized", "committee_review", "committee_sent_back"].includes(s)) return "committee";
  if (["committee_approved", "contract_generated", "awaiting_vendor_acceptance"].includes(s)) return "awaiting";
  if (s === "contract_active") return "active";
  if (s === "expiring_soon") return "expiring";
  return "expired";
};
const TAB_BUCKETS = { drafts: ["draft"], ongoing: ["floated", "eval", "committee"], approved: ["awaiting"], active: ["active", "expiring"], ended: ["expired"] };
const BUCKET_LABEL = { draft: "Draft", floated: "Floated", eval: "In Evaluation", committee: "Committee Review", awaiting: "Awaiting Vendor", active: "Active", expiring: "Expiring Soon", expired: "Ended" };

/** Vendors who submitted a quote. */
const submittedOf = (c) => {
  if (c.submitted) return c.submitted;
  if (["draft", "pending_publish_approval"].includes(c.status)) return [];
  if (c.status === "closed_no_award") return c.invited.filter((v) => !c.declined.includes(v)).slice(0, 1);
  return c.invited.filter((v) => !c.declined.includes(v));
};

/** Evaluator work waiting on the persona (a card pill, not an approval). */
const evalActionFor = (c, p) => {
  if (p.id !== c.ownerId) return null;
  if (c.status === "comm_eval_in_progress") return "Commercial evaluation";
  if (c.status === "submission_closed") return "Start evaluation";
  return null;
};

const sumBy = (triples) => {
  const m = new Map();
  triples.forEach(([id, name, value]) => { const e = m.get(id) || { id, name, value: 0 }; e.value += value; m.set(id, e); });
  return Array.from(m.values());
};

/* ── the register row ─────────────────────────────────────── */
const arcRow = (c, p = persona()) => {
  const pending = pendingArcIdsFor(p.id).has(c.id);
  const evalAction = evalActionFor(c, p);
  const vendors = awardedVendors(c).filter(() => isAwarded(c));
  const callOffs = callOffsFor(c);
  const lastEvent = arcEvents().find((e) => e.arcId === c.id);
  return {
    id: c.id,
    arc_number: c.id,
    title: c.title,
    status: c.status,
    category_id: catOf(c)?.id,
    category_title: c.category,
    sub_category_title: c.sub,
    department_id: DEPTS[c.dept].id,
    department_title: DEPTS[c.dept].title,
    hotel_id: hotelNum(c.propertyIds[0]),
    hotel_name: c.propertyIds.length > 1 ? `${hotelName(c.propertyIds[0])} +${c.propertyIds.length - 1}` : hotelName(c.propertyIds[0]),
    hotel_ids: c.propertyIds.map(hotelNum),
    hotel_names: c.propertyIds.map(hotelName),
    is_group: c.propertyIds.length > 1,
    contract_start_at: iso(c.termStart),
    contract_end_at: iso(c.termEnd),
    submission_start_at: naive(c.window[0]),
    submission_end_at: naive(c.window[1]),
    committed_value: isAwarded(c) ? committedValue(c) : 0,
    estimated_value: estimatedValue(c),
    consumed_value: consumedValue(c),
    invited_count: c.invited.length,
    submitted_count: submittedOf(c).length,
    call_off_count: callOffs.length,
    // Released-PO spend split by property and by product, from the call-off lines.
    calloff_by_hotel: sumBy(callOffs.flatMap(({ po, lines }) => lines.map((x) => [hotelNum(po.propertyId), hotelName(po.propertyId), x.line.value]))),
    calloff_by_item: sumBy(callOffs.flatMap(({ lines }) => lines.map((x) => [x.item?.id, x.item?.name || x.line.name, x.line.value]))),
    awarded_vendors: vendors.map((v) => ({ id: vNum(v), name: vName(v), company: `${vendorsById[v]?.city}, ${vendorsById[v]?.state}` })),
    awarded_vendor_names: vendors.map(vName),
    awarded_vendor_ids: vendors.map(vNum),
    item_names: c.items.map((i) => i.name),
    product_variant_ids: c.items.map((i) => i.id),
    active_amendments: 0,
    requested_amendments: c.amendment && c.amendment.chain.some((s) => s.state === "pending") ? 1 : 0,
    action_required: pending || !!evalAction,
    pending_for_user: pending,
    action_label: pending ? "Approval needed" : evalAction,
    created_by_name: person(c.ownerId).name,
    created_at: iso(c.createdOn),
    updated_at: lastEvent?.at || iso(c.createdOn),
  };
};

const visibleRows = (p = persona()) => portfolio.filter((c) => visibleTo(c, p.id)).map((c) => arcRow(c, p));

/** The FY window: a contract is in the window when its term overlaps it. */
const inWindow = (r, from, to) => {
  if (!from && !to) return true;
  const s = (r.contract_start_at || r.created_at).slice(0, 10);
  const e = (r.contract_end_at || r.created_at).slice(0, 10);
  return (!to || s <= to) && (!from || e >= from);
};

const listView = (body = {}) => {
  const p = persona();
  const f = body.filters || {};
  const tab = body.tab || "all";
  const all = visibleRows(p).filter((r) => inWindow(r, f.dateFrom, f.dateTo));
  const tab_counts = { all: all.length, pending: all.filter((r) => r.pending_for_user).length };
  Object.entries(TAB_BUCKETS).forEach(([t, b]) => { tab_counts[t] = all.filter((r) => b.includes(bucketOf(r.status))).length; });
  const tabRows = tab === "all" ? all : tab === "pending" ? all.filter((r) => r.pending_for_user) : all.filter((r) => (TAB_BUCKETS[tab] || []).includes(bucketOf(r.status)));

  const tally = (pick) => {
    const m = new Map();
    tabRows.forEach((r) => pick(r).forEach(([key, label]) => {
      if (key == null) return;
      const k = String(key);
      const e = m.get(k) || { key: k, label, count: 0 };
      e.count += 1; m.set(k, e);
    }));
    return Array.from(m.values()).sort((a, b) => b.count - a.count);
  };
  const facets = {
    status: tally((r) => [[bucketOf(r.status), BUCKET_LABEL[bucketOf(r.status)]]]),
    buId: tally((r) => r.hotel_ids.map((id, i) => [id, r.hotel_names[i]])),
    categoryId: tally((r) => [[r.category_id, r.category_title]]),
    departmentId: tally((r) => [[r.department_id, r.department_title]]),
    productId: tally((r) => r.product_variant_ids.map((id, i) => [id, r.item_names[i]])),
    vendorId: tally((r) => r.awarded_vendor_ids.map((id, i) => [id, r.awarded_vendor_names[i]])),
  };
  const has = (arr, v) => !arr?.length || arr.map(String).includes(String(v));
  const q = String(body.search || "").trim().toLowerCase();
  let rows = tabRows.filter((r) =>
    has(f.status, bucketOf(r.status)) &&
    (!f.buId?.length || r.hotel_ids.some((id) => f.buId.map(String).includes(String(id)))) &&
    has(f.categoryId, r.category_id) && has(f.departmentId, r.department_id) &&
    (!f.productId?.length || r.product_variant_ids.some((id) => f.productId.map(String).includes(String(id)))) &&
    (!f.vendorId?.length || r.awarded_vendor_ids.some((id) => f.vendorId.map(String).includes(String(id)))) &&
    (!q || `${r.title} ${r.arc_number} ${r.category_title} ${r.hotel_names.join(" ")}`.toLowerCase().includes(q)));
  const ORDER = { expiring: 0, active: 1, eval: 2, committee: 3, awaiting: 4, floated: 5, draft: 6, expired: 7 };
  if (body.sort === "value") rows.sort((a, b) => (b.committed_value || b.estimated_value) - (a.committed_value || a.estimated_value));
  else if (body.sort === "expiry") rows.sort((a, b) => ORDER[bucketOf(a.status)] - ORDER[bucketOf(b.status)]);
  else rows.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  const limit = Number(body.limit) || 20;
  const page = Number(body.page) || 1;
  return { rows: rows.slice((page - 1) * limit, page * limit), facets, tab_counts, total: rows.length, page, limit };
};

/* ── permissions per persona ──────────────────────────────── */
const permissionsFor = (c, p) => {
  if (c.id === TECH_EVAL_ARC_ID) {
    // The prototypes' own permission set (see arcTechEval.withArcTechApproval).
    return { arc: ["read", "create", "update", "admin"], technical: ["read", "update", "score", "submit"], te: ["read", "update", "score", "submit"], "arc-tech": ["read", "evaluate"], "arc-comm": ["read"], "arc-committee": ["read"], commercial: ["read"], awarding: ["read"], negotiation: ["read"] };
  }
  if (p.id === "purchase") return { arc: ["read", "create", "admin"], "arc-tech": ["read", "evaluate"], "arc-comm": ["read", "evaluate"], "arc-committee": ["read"] };
  if (p.id === "regional") return { arc: ["read"], "arc-tech": ["read"], "arc-comm": ["read"], "arc-committee": ["read", "approve"] };
  return { arc: ["read"], "arc-tech": ["read"], "arc-comm": ["read"], "arc-committee": ["read"] };
};

/* ── the contract record (GET /arc-v2/:id, lifecycle.arc) ─── */
const arcRecord = (c) => {
  const p = c.propertyIds.map((id) => propertiesById[id]);
  return {
    id: c.id,
    arc_number: c.id,
    title: c.title,
    status: c.status,
    type: "product",
    description: `Internal ref: ${c.id}`,
    category_id: catOf(c)?.id,
    category_title: c.category,
    sub_category_ids: subOf(c) ? [subOf(c).id] : [],
    department_id: DEPTS[c.dept].id,
    department_title: DEPTS[c.dept].title,
    hotel_id: p[0].numericId,
    hotel_name: p.length > 1 ? `${p[0].shortName} + ${p.length - 1} more` : p[0].shortName,
    hotel_code: p[0].shortName.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase(),
    hotel_city: p[0].city,
    is_group: p.length > 1,
    hotels: p.map((h) => ({ hotel_id: h.numericId, name: h.shortName, city: h.city })),
    company_name: company.name,
    eligibility_type: "invite",
    submission_start_at: naive(c.window[0]),
    submission_end_at: naive(c.window[1]),
    contract_start_at: iso(c.termStart),
    contract_end_at: iso(c.termEnd),
    committed_value: isAwarded(c) ? committedValue(c) : 0,
    estimated_value: estimatedValue(c),
    payment_terms_expected: "45 days from GRN",
    delivery_expected: "Within 21 days of call-off, to the property store",
    penalty_clause: "0.5% of the call-off value per day of delay, capped at 5%",
    sample_required: true,
    technical_response_required: c.id === TECH_EVAL_ARC_ID,
    escalation_clause_json: { type: "annual", cap_pct: 5 },
    created_by: person(c.ownerId).numericId,
    created_by_name: person(c.ownerId).name,
    buyer_name: person(c.ownerId).name,
    buyer_email: person(c.ownerId).email,
    buyer_designation: person(c.ownerId).title,
    created_at: iso(c.createdOn),
    updated_at: arcEvents().find((e) => e.arcId === c.id)?.at || iso(c.createdOn),
    committee_approved_at: c.committeeOn ? iso(c.committeeOn) : null,
    closed_reason: c.closedReason || null,
  };
};

const arcItems = (c) => c.items.map((i) => ({
  id: i.id,
  arc_item_id: i.id,
  product_variant_id: i.id,
  name: i.name,
  variant_name: i.name,
  variant_slug: i.spec.split(" · ")[0],
  uom: i.uom,
  quantity: i.qty,
  indicative_qty: i.qty,
  committed_qty: isAwarded(c) ? i.qty : null,
  spec_text: i.spec,
  specification: i.spec,
  target_price: i.rate,
  tech_eval: null,
}));

const invitationsOf = (c) => {
  const sub = submittedOf(c);
  return c.invited.map((v, idx) => ({
    id: Number(`${c.items[0].id}${idx}`),
    vendor_id: vNum(v),
    vendor_name: vName(v),
    vendor_company: vName(v),
    vendor_email: vendorsById[v]?.email || `${v}@vendor.in`,
    status: c.declined.includes(v) ? "declined" : sub.includes(v) ? "submitted" : "invited",
    invited_at: naive(c.window[0]),
    responded_at: sub.includes(v) ? naive(`${c.window[1].slice(0, 10)}T1${idx % 8}:${10 + idx * 4}`) : null,
  }));
};

/* ── lifecycle (mirrors arcLifecycleModel.deriveStages) ───── */
const stageOf = (key, label, state, reason, extra = {}) => ({ key, label, state, reason, counts: {}, approval: null, clarifications_open: 0, negotiation_in_progress: false, ...extra });

const lifecycle = (c) => {
  const p = persona();
  const s = c.status;
  const pre = ["draft", "pending_publish_approval"].includes(s);
  const closed = !pre && s !== "floated";
  const tech = c.id === TECH_EVAL_ARC_ID;
  const sub = submittedOf(c);
  const pubPending = c.publish && s === "pending_publish_approval";
  const owner = person(c.ownerId);
  const ownerPeople = [{ user_id: owner.numericId, name: owner.name, email: owner.email }];

  const overview = stageOf("overview", "Overview", closed ? "complete" : "active",
    pubPending ? "pending_publish_approval" : closed ? "window_closed" : s === "draft" ? "draft" : "window_open", {
      counts: { invited: c.invited.length, submitted: sub.length, declined: c.declined.length },
      window: { submission_start_at: naive(c.window[0]), submission_end_at: naive(c.window[1]), closed },
      publish_approval: pubPending ? { instance_id: 8800 + c.items[0].id, status: "PENDING", current_step: 1, can_user_approve: p.id === c.publish.personId } : null,
      actors: pubPending ? { action_taker: { role: "Buyer (creator)", people: ownerPeople }, approver: { role: "ARC Approver", status: "PENDING", step_label: "Level 1 of 1 · any one approves", people: [{ user_id: person(c.publish.personId).numericId, name: person(c.publish.personId).name, designation: person(c.publish.personId).title, status: "PENDING" }], can_user_approve: p.id === c.publish.personId }, next_stage: { key: "technical", label: "Technical Evaluation" } } : undefined,
    });

  const techDone = ["comm_eval_in_progress", "committee_review", "awaiting_vendor_acceptance", "contract_active", "expiring_soon"].includes(s);
  let technical;
  if (!closed) technical = stageOf("technical", "Technical Evaluation", "locked", "window_open");
  else if (tech) technical = stageOf("technical", "Technical Evaluation", "active", "scoring_in_progress", { counts: { vendors_in_play: 5, vendors_fully_scored: 0, total_participating: 8, on_hold: 3, clauses_total: 5 } });
  else technical = stageOf("technical", "Technical Evaluation", "skipped", "no_clauses_configured");

  let commercial;
  const techSettled = closed && !tech;
  if (!techSettled || s === "closed_no_award") commercial = stageOf("commercial", "Commercial", s === "closed_no_award" ? "skipped" : "locked", s === "closed_no_award" ? "closed_no_award" : "technical_incomplete");
  else if (s === "submission_closed") commercial = stageOf("commercial", "Commercial", "active", "not_started", { counts: { items_total: c.items.length, items_allocated: 0 } });
  else if (s === "comm_eval_in_progress") commercial = stageOf("commercial", "Commercial", "active", "allocation_in_progress", { counts: { items_total: c.items.length, items_allocated: 2 }, comm_evaluation: { id: 9100 + c.items[0].id, status: "in_progress" } });
  else commercial = stageOf("commercial", "Commercial", "complete", "finalized", { counts: { items_total: c.items.length, items_allocated: c.items.length }, comm_evaluation: { id: 9100 + c.items[0].id, status: "finalized" } });

  let awarding;
  const cur = c.committee?.chain.find((x) => x.state === "pending");
  if (s === "committee_review") {
    const ap = person(cur.personId);
    const lvl = c.committee.chain.indexOf(cur) + 1;
    awarding = stageOf("awarding", "Awarding", "active", "committee_in_review", {
      approval: { instance_id: 8900 + c.items[0].id, status: "PENDING", current_step: lvl, can_user_approve: p.id === cur.personId },
      actors: { action_taker: { role: "Commercial evaluator", people: ownerPeople }, approver: { role: "ARC Committee", status: "PENDING", step_label: `Level ${lvl} of ${c.committee.chain.length} · any one approves`, people: [{ user_id: ap.numericId, name: ap.name, designation: ap.title, status: "PENDING" }], can_user_approve: p.id === cur.personId }, next_stage: { key: "active", label: "Contract Active" } },
    });
  } else if (isAwarded(c)) awarding = stageOf("awarding", "Awarding", "complete", "contracts_generated", { approval: { instance_id: 8900 + c.items[0].id, status: "APPROVED", current_step: 1, can_user_approve: false } });
  else awarding = stageOf("awarding", "Awarding", "locked", "commercial_incomplete");

  let active;
  if (s === "closed_no_award") active = stageOf("active", "Contract Active", "ended", "closed_no_award");
  else if (["contract_active", "expiring_soon"].includes(s)) active = stageOf("active", "Contract Active", "active", "live", { counts: { contracts_total: awardedVendors(c).length, contracts_accepted: awardedVendors(c).length } });
  else if (s === "awaiting_vendor_acceptance") active = stageOf("active", "Contract Active", "active", "awaiting_vendor_acceptance", { counts: { contracts_total: awardedVendors(c).length, contracts_accepted: 0 } });
  else active = stageOf("active", "Contract Active", "locked", "not_awarded");

  const stages = [overview, technical, commercial, awarding, active];
  let default_stage = "overview";
  stages.forEach((st) => { if (["active", "partial", "ended"].includes(st.state)) default_stage = st.key; });

  const payload = {
    arc: arcRecord(c),
    current_status: s,
    default_stage,
    stages,
    permissions: permissionsFor(c, p),
    invitations: [],
    items: arcItems(c),
  };
  return tech ? withArcTechApproval(payload) : payload;
};

/* ── quotes, awards (commercial / committee) ──────────────── */
const quoteRate = (c, item, v, k) => {
  if (item.vendor === v && item.rate) return item.rate;
  const base = item.rate || 400;
  return Math.round(base * (1.04 + 0.03 * k));
};
const quoteLines = (c) => {
  const sub = submittedOf(c);
  const out = [];
  sub.forEach((v, k) => c.items.forEach((item, j) => {
    const rate = quoteRate(c, item, v, (k + j) % 3);
    out.push({
      quote_id: 9300 + k, quote_line_id: Number(`${item.id}${k}`), vendor_id: vNum(v), vendor_name: vName(v), arc_item_id: item.id,
      rate, gst_pct: 12, charges: 0, lead_time_days: 14 + k * 3, moq: 50, submitted_at: naive(c.window[1].slice(0, 10) + "T12:00"),
      line_pricing: { base: rate, base_tax: Math.round(rate * 0.12 * 100) / 100, total: Math.round(rate * 1.12 * 100) / 100 },
      rate_source: "LANDED",
    });
  }));
  return out;
};
const awardsOf = (c) => {
  const lines = quoteLines(c);
  const allocatedItems = c.status === "comm_eval_in_progress" ? c.items.slice(0, 2) : c.items;
  return allocatedItems.filter((i) => i.vendor).map((i, idx) => {
    const ql = lines.find((l) => l.arc_item_id === i.id && l.vendor_id === vNum(i.vendor));
    return {
      id: 9500 + i.id, arc_item_id: i.id, awarded_vendor_id: vNum(i.vendor), vendor_name: vName(i.vendor), awarded_quote_line_id: ql?.quote_line_id,
      allocated_qty: i.qty, l_rank: "L1", is_l1_default: true,
      awarded_quote_snapshot: { rate: i.rate, gst_pct: 12, lead_time_days: 14 + idx * 3, charges: 0 },
    };
  });
};

const commEval = (c) => ({
  comm_evaluation: ["submission_closed"].includes(c.status) ? null : { id: 9100 + c.items[0].id, status: c.status === "comm_eval_in_progress" ? "in_progress" : "finalized" },
  items: arcItems(c),
  quotes: quoteLines(c),
  awards: c.status === "submission_closed" ? [] : awardsOf(c),
  clarifications: [],
  qualified_by_item: {},
});

const approvalSteps = (chain, label) => chain.map((s, i) => {
  const who = person(s.personId);
  return {
    step_order: i + 1, decision_rule: "ANY", status: s.state === "approved" ? "APPROVED" : "PENDING", label,
    approvers: [{ user_id: who.numericId, user_name: who.name, user_designation: who.title, status: s.state === "approved" ? "APPROVED" : "PENDING", acted_at: s.on ? iso(s.on) : null, comment: s.state === "approved" ? "Approved." : null }],
  };
});

const committeeView = (c) => {
  const p = persona();
  const chain = c.committee ? c.committee.chain : c.committeeOn ? [{ personId: "regional", state: "approved", on: c.committeeOn }] : [];
  const cur = chain.find((s) => s.state === "pending");
  return {
    arc: arcRecord(c),
    comm_evaluation: { id: 9100 + c.items[0].id, status: "finalized", finalized_at: iso(c.finalizedOn || c.committeeOn) },
    awards: awardsOf(c),
    items: arcItems(c),
    approval_instance: chain.length ? { id: 8900 + c.items[0].id, status: cur ? "PENDING" : "APPROVED", current_step: cur ? chain.indexOf(cur) + 1 : chain.length } : null,
    approval: chain.length ? {
      instance_id: 8900 + c.items[0].id, status: cur ? "PENDING" : "APPROVED", current_step: cur ? chain.indexOf(cur) + 1 : chain.length,
      total_steps: chain.length, can_user_approve: !!cur && cur.personId === p.id, completed_at: cur ? null : iso(c.committeeOn),
      steps: approvalSteps(chain, "Award committee"),
    } : null,
  };
};

/* ── active summary (Contract Active stage, call-off page) ─ */
const activeSummary = (c) => {
  const vendors = awardedVendors(c);
  const signed = ["contract_active", "expiring_soon"].includes(c.status);
  const callOffs = callOffsFor(c);
  const contracts = vendors.map((v, k) => {
    const cid = 9700 + c.items[0].id * 10 + k;
    const lines = c.items.filter((i) => i.vendor === v);
    return {
      contract: {
        id: cid, vendor_id: vNum(v), vendor_name: vName(v), vendor_email: vendorsById[v]?.email || `${v}@vendor.in`,
        status: signed ? "active" : "pending_acceptance", generated_at: iso(c.committeeOn || c.sentOn),
        signed_by_vendor_at: signed ? iso(c.signedOn) : null, document_hash: signed ? `sha256:${cid.toString(16)}a9c4` : null,
      },
      consumption: lines.map((i) => {
        const used = callOffs.reduce((s, co) => s + co.lines.filter((x) => x.item?.id === i.id).reduce((t, x) => t + x.line.qty, 0), 0);
        return {
          arc_contract_line_id: cid * 10 + c.items.indexOf(i), arc_item_id: i.id, product_variant_id: i.id, variant_name: i.name, variant_slug: i.spec.split(" · ")[0],
          uom: i.uom, spec_text: i.spec, indicative_qty: i.qty, unit_rate: i.rate, gst_pct: 12, charges: 0,
          payment_terms: "45 days from GRN", delivery_terms: "Within 21 days of call-off",
          committed_qty: i.qty, consumed_qty: used, remaining_qty: i.qty - used, pct_used: Math.round((used / i.qty) * 10000) / 100,
          effective_unit_rate: i.rate, effective_committed_qty: i.qty, sub_category_title: c.sub,
          awarded_quote_snapshot: { rate: i.rate, gst_pct: 12 },
        };
      }),
    };
  });
  const lineIdOf = (item) => {
    const k = vendors.indexOf(item?.vendor);
    return k < 0 ? null : (9700 + c.items[0].id * 10 + k) * 10 + c.items.indexOf(item);
  };
  const callOffRows = [];
  callOffs.forEach(({ po, lines }) => lines.forEach(({ line, item }) => callOffRows.push({
    call_off_id: Number(`${po.id}${lines.indexOf(lines.find((x) => x.line === line))}`), po_id: Number(po.id), po_number: po.id, po_status: po.status,
    total_value: po.value, vendor_id: vNum(po.vendorId), vendor_name: vName(po.vendorId), mr_id: null, mr_number: null,
    arc_contract_id: item ? 9700 + c.items[0].id * 10 + vendors.indexOf(item.vendor) : null, arc_contract_line_id: lineIdOf(item),
    arc_item_id: item?.id, variant_name: item?.name || line.name, uom: item?.uom || "pcs", quantity: line.qty, price_applied: line.rate,
    released_at: iso(po.raisedOn), hotel_id: hotelNum(po.propertyId), hotel_name: hotelName(po.propertyId),
  })));
  const am = c.amendment;
  const amendments = am ? [{
    id: am.id, arc_contract_id: 9700 + c.items[0].id * 10 + vendors.indexOf(am.vendor), vendor_id: vNum(am.vendor), vendor_name: vName(am.vendor),
    amendment_type: am.type, status: "requested", reason: am.reason, requested_by: vNum(am.vendor), requested_by_name: vName(am.vendor),
    created_at: iso(am.requestedOn), amendment_from: iso(am.from), amendment_to: iso(am.to),
    payload: { arc_contract_line_id: lineIdOf(c.items.find((i) => i.id === am.itemId)), new_rate: am.newRate },
    current_step: am.chain.findIndex((s) => s.state === "pending") + 1,
    approval_chain: am.chain.map((s, i) => ({ step: i + 1, role: i === 0 ? "Procurement review" : "Finance approval", approver_user_ids: [person(s.personId).numericId], approver_names: [person(s.personId).name], status: s.state === "approved" ? "APPROVED" : "PENDING", acted_at: s.on ? iso(s.on) : null })),
    edit_history: [],
  }] : [];
  const events = arcEvents().filter((e) => e.arcId === c.id).map((e, i) => ({
    id: 9900 + i, event_type: e.kind.toUpperCase(), actor_id: e.who ? person(e.who)?.numericId : null, actor_name: e.who ? person(e.who)?.name : "System", payload: { title: e.title, message: e.message }, at: e.at,
  }));
  return { arc: arcRecord(c), contracts, events, callOffs: callOffRows, amendments, addendums: [] };
};

/* ── reference data for the create / manual-entry forms ───── */
const UNITS = ["pcs", "kg", "g", "tonne", "L", "mL", "m", "cm", "mm", "m²", "m³", "pack", "set", "box", "roll", "bottle", "hr", "day"].map((name, i) => ({ id: i + 1, name, is_default: true }));

/** The catalogue: every product on a contract, under its category. */
const variants = () => {
  const seen = new Map();
  portfolio.forEach((c) => c.items.forEach((i) => {
    const key = `${c.category}|${i.name.toLowerCase()}`;
    if (!seen.has(key)) seen.set(key, { id: 50000 + seen.size + 1, name: i.name, slug: i.spec.split(" · ")[0], uom: i.uom, category_id: catOf(c)?.id, sub_category_id: subOf(c)?.id, sub_category_title: c.sub });
  }));
  return Array.from(seen.values());
};

const vendorsForCategory = (categoryId) => {
  const slugs = new Set();
  portfolio.filter((c) => catOf(c)?.id === Number(categoryId)).forEach((c) => c.invited.forEach((v) => slugs.add(v)));
  return Array.from(slugs).map((v) => ({ id: vNum(v), name: vName(v), company: vName(v), email: vendorsById[v]?.email || `${v}@vendor.in`, city: vendorsById[v]?.city, gst: vendorsById[v]?.gst }));
};

/* ── KPIs ─────────────────────────────────────────────────── */
const kpis = () => {
  const rows = visibleRows();
  const by = (b) => rows.filter((r) => bucketOf(r.status) === b).length;
  const counts = {
    total: rows.length, draft: by("draft"), floated: by("floated"), eval: by("eval"), committee: by("committee"),
    awaiting: by("awaiting"), active: by("active"), expiring: by("expiring"), expired: by("expired"),
    pending: rows.filter((r) => r.pending_for_user).length,
  };
  return {
    counts,
    ...counts,
    in_evaluation: counts.eval,
    committed_value: rows.reduce((s, r) => s + r.committed_value, 0),
    consumed_value: rows.reduce((s, r) => s + r.consumed_value, 0),
  };
};

/** A contract by its number; links from other modules open it whatever the viewer's scope. */
const find = (id) => contractsById[id];

/* ── session decisions (approve / send back) ──────────────── */
const ok = (message) => ({ status: 1, message });

const arcRoutes = [
  /* register + dashboard */
  { method: "post", path: "/arc-v2/list-view", handler: ({ body }) => listView(body) },
  { method: "get", path: "/arc-v2", handler: () => { const rows = visibleRows(); return { data: rows, rows, total: rows.length, page: 1, limit: 200 }; } },
  { method: "get", path: "/arc-v2/kpis", handler: () => kpis() },

  /* reference data */
  { method: "get", path: "/arc-v2/categories", handler: () => ({ categories: arcCategories.map(({ id, title }) => ({ id, title })) }) },
  { method: "get", path: "/arc-v2/sub-categories", handler: ({ query }) => ({ sub_categories: (arcCategories.find((c) => c.id === Number(query.category_id))?.subs || []) }) },
  { method: "get", path: "/arc-v2/hotels", handler: () => ({ hotels: properties.filter((h) => persona().propertyIds.includes(h.id)).map((h) => ({ id: h.numericId, name: h.name, title: h.shortName, city: h.city, code: h.shortName.split(" ").map((w) => w[0]).join("").slice(0, 3).toUpperCase() })) }) },
  { method: "get", path: "/arc-v2/hotel-departments", handler: () => ({ departments: Object.values(DEPTS) }) },
  { method: "get", path: "/arc-v2/category-departments", handler: () => ({ departments: Object.values(DEPTS) }) },
  {
    method: "get", path: "/arc-v2/variants",
    handler: ({ query }) => {
      const q = String(query.q || "").toLowerCase();
      const subs = [].concat(query.sub_category_ids || []).map(Number).filter(Boolean);
      const rows = variants().filter((v) => v.category_id === Number(query.category_id) && (!q || v.name.toLowerCase().includes(q)) && (!subs.length || subs.includes(v.sub_category_id)));
      return { variants: rows, total: rows.length };
    },
  },
  { method: "get", path: "/arc-v2/eligible-vendors", handler: ({ query }) => ({ vendors: vendorsForCategory(query.category_id) }) },
  { method: "get", path: "/arc-v2/manual/all-vendors", handler: ({ query }) => ({ vendors: vendorsForCategory(query.category_id) }) },
  { method: "get", path: "/units", handler: () => UNITS },
  { method: "get", path: "/arc-v2/amendments", handler: () => ({ items: portfolio.flatMap((c) => activeSummary(c).amendments), total: portfolio.filter((c) => c.amendment).length }) },

  /* a contract */
  { method: "get", path: "/arc-v2/:id/lifecycle", handler: ({ params }) => (find(params.id) ? lifecycle(find(params.id)) : undefined) },
  { method: "get", path: "/arc-v2/:id/active-summary", handler: ({ params }) => (find(params.id) ? activeSummary(find(params.id)) : undefined) },
  {
    method: "get", path: "/arc-v2/:id/publish-approval",
    handler: ({ params }) => {
      const c = find(params.id);
      if (!c?.publish) return { approval: null };
      return { approval: { instance_id: 8800 + c.items[0].id, status: "PENDING", current_step: 1, total_steps: 1, steps: approvalSteps([{ personId: c.publish.personId, state: "pending" }], "Publish approval") } };
    },
  },
  {
    method: "get", path: "/arc-v2/:id",
    handler: ({ params }) => {
      const c = find(params.id);
      if (!c) return undefined;
      return { arc: arcRecord(c), items: arcItems(c), invitations: invitationsOf(c), quotes: submittedOf(c).map((v, k) => ({ id: 9300 + k, vendor_id: vNum(v), submitted_at: naive(`${c.window[1].slice(0, 10)}T12:00`) })) };
    },
  },
  { method: "get", path: "/arc-v2/evaluation/:id/comm-eval", handler: ({ params }) => (find(params.id) ? commEval(find(params.id)) : undefined) },
  { method: "get", path: "/arc-v2/committee/:id", handler: ({ params }) => (find(params.id) ? committeeView(find(params.id)) : undefined) },
  { method: "get", path: "/arc-v2/evaluation/:id/comm-eval/negotiation/rounds", handler: () => ({ rounds: [], items: [], total: 0 }) },

  /* decisions — recorded as successes; the engine-side state is the portfolio */
  { method: "post", path: "/arc-v2/:id/publish-approval/decide", handler: () => ok("Decision recorded") },
  { method: "post", path: "/arc-v2/committee/:id/decide", handler: () => ok("Approval recorded") },
  { method: "post", path: "/arc-v2/amendments/:id/review", handler: () => ok("Review recorded") },
];

export const _arc = { lifecycle, listView, kpis, isApproverView, daysFromToday };

export default arcRoutes;
