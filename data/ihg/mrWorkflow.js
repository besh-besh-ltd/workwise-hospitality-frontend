import { peopleById, propertiesById, properties } from "./org";
import { vendorsById, vendorNumericIdOf } from "./vendors";
import { allContracts } from "./contracts";
import { awardedRates } from "./orders";
import { lineItems as threadLineItems } from "./thread";
import { mrRecords, mrStaff, mrHods, mrValue, lineValue, L3_THRESHOLD } from "./requisitions";

/**
 * Material requisitions as they stand right now: the fixtures in
 * requisitions.js plus whatever was approved, rejected, raised or cancelled
 * during this demo session (sessionStorage, its own key, so a fresh tab is a
 * fresh demo).
 *
 * Every MR screen and the dashboard's approvals read from here, so "Pending
 * for me" on the MR list, the KPI tile and the dashboard modal are one list.
 */

const KEY = "ihg:mrSession";
const blank = () => ({ decisions: {}, created: [], cancelled: {} });

const load = () => {
  if (typeof window === "undefined") return blank();
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch (_) {
    return blank();
  }
};
const save = (s) => {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (_) {}
};

/* ── people ──────────────────────────────────────────────── */

const STAFF_FOR_PERSONA = { housekeeping: "rohan", purchase: "ananya", regional: "sameer", finance: "karan" };
const staff = (key) =>
  mrStaff[key] || (key === "karan" ? { name: peopleById.finance.name, role: peopleById.finance.title, personaId: "finance" } : { name: "—", role: "" });
const personaOfStaff = (key) => staff(key).personaId || null;

/** Which staff member signs a level of a given MR. */
const approverKey = (m, level) =>
  level === 1 ? mrHods[`${m.propertyId}:${m.department}`] : level === 2 ? "ananya" : "sameer";

const LEVEL_LABEL = { 1: "Department head", 2: "Procurement", 3: "Group head · above ₹25L" };

/* ── departments (numeric ids for the form and the filters) ── */

export const MR_DEPARTMENTS = [
  { id: 11, title: "Housekeeping" },
  { id: 12, title: "Food & Beverage" },
  { id: 13, title: "Engineering" },
  { id: 14, title: "Front Office" },
];
const deptId = (name) => MR_DEPARTMENTS.find((d) => d.title === name)?.id || 0;
const deptName = (id) => MR_DEPARTMENTS.find((d) => d.id === Number(id))?.title || "";
const propByNumeric = (n) => properties.find((p) => p.numericId === Number(n)) || null;

/* ── contracted catalogue (the create form's picker) ─────── */

const CHEM_LINES = {
  "chem-floor": { name: "Floor cleaner concentrate, pH-neutral", uom: "can", rate: 1240 },
  "chem-glass": { name: "Glass & mirror cleaner", uom: "can", rate: 860 },
  "chem-toilet": { name: "Toilet bowl cleaner, acidic", uom: "can", rate: 980 },
  "chem-sanitiser": { name: "Surface sanitiser, QAC-based", uom: "can", rate: 1450 },
};

/** Every line that can be bought off an in-force rate contract, by ARC. */
export const contractedItems = () => {
  const arc = (id) => allContracts.find((c) => c.id === id);
  const rows = [];
  const a14 = arc("ARC-2627-0014");
  if (a14) {
    Object.entries(awardedRates).forEach(([itemId, r], i) => {
      const item = threadLineItems.find((x) => x.id === itemId);
      rows.push({ arc: a14, itemId, name: item.name, uom: item.uom, rate: r.rate, vendorId: r.vendorId, department: "Housekeeping", line: i + 1 });
    });
  }
  const a88 = arc("ARC-2526-0088");
  if (a88) {
    Object.entries(CHEM_LINES).forEach(([itemId, c], i) => {
      rows.push({ arc: a88, itemId, name: c.name, uom: c.uom, rate: c.rate, vendorId: "greenleaf", department: "Housekeeping", line: i + 1 });
    });
  }
  return rows.map((r) => ({
    product_variant_id: r.itemId,
    arc_contract_id: r.arc.id,
    arc_contract_line_id: `${r.arc.id}:${r.line}`,
    current_rate: r.rate,
    uom: r.uom,
    variant_name: r.name,
    variant_slug: r.itemId,
    vendor_id: vendorNumericIdOf(r.vendorId),
    vendor_slug: r.vendorId,
    vendor_name: vendorsById[r.vendorId]?.name,
    arc_id: r.arc.id,
    arc_number: r.arc.id,
    arc_title: r.arc.title,
    remaining_qty: null,
    property_ids: r.arc.propertyIds,
    department: r.department,
  }));
};

/* ── current state ───────────────────────────────────────── */

const levelsFor = (m) => (mrValue(m) > L3_THRESHOLD ? [1, 2, 3] : [1, 2]);

/** One MR with the session applied: outcome, decided steps, where it waits. */
const resolve = (m, s) => {
  const approvals = [...(m.approvals || []), ...(s.decisions[m.id] || [])];
  const levels = levelsFor(m);
  let outcome = m.outcome;
  let currentLevel = null;
  if (s.cancelled[m.id]) outcome = "cancelled";
  else if (outcome === "pending") {
    if (approvals.some((a) => a.decision === "REJECTED")) outcome = "rejected";
    else {
      currentLevel = levels.find((lv) => !approvals.some((a) => a.level === lv && a.decision === "APPROVED")) || null;
      if (!currentLevel) outcome = "approved";
    }
  }
  const lastAt = approvals.length ? approvals[approvals.length - 1].on : `${m.raisedOn}T09:00:00`;
  return { ...m, approvals, levels, outcome, currentLevel, waitingSince: lastAt, value: mrValue(m) };
};

/** Every MR, fixtures and session-raised, as it stands now. */
export const currentMrs = () => {
  const s = load();
  return [...mrRecords, ...(s.created || [])].map((m) => resolve(m, s));
};
export const findMr = (id) => currentMrs().find((m) => m.id === id) || null;

/** The MRs a persona can see — their properties. */
export const mrsInScope = (personaId) => {
  const p = peopleById[personaId] || peopleById.purchase;
  return currentMrs().filter((m) => p.propertyIds.includes(m.propertyId));
};

/** Who the MR is waiting on, as a persona id (null when it is a non-login HOD). */
export const waitingOnPersona = (m) =>
  m.outcome === "pending" && m.currentLevel ? personaOfStaff(approverKey(m, m.currentLevel)) : null;

// Past its required-by date and still not on a released PO.
const isOverdue = (m) => (m.outcome === "pending" || m.outcome === "approved") && m.requiredBy < todayIso();
const todayIso = () => new Date().toISOString().slice(0, 10);
const hoursSince = (iso) => Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 3600000));

/* ── the dashboard contract ──────────────────────────────── */

/** MR approvals waiting on this persona, in the PendingApprovalsModal shape. */
export const pendingApprovalsFor = (personaId) =>
  currentMrs()
    .filter((m) => waitingOnPersona(m) === personaId)
    .sort((a, b) => a.waitingSince.localeCompare(b.waitingSince))
    .map((m) => ({
      entity_type: "MR",
      entity_id: m.id,
      entity_title: m.title,
      metadata: { mr_number: m.id },
      waiting_hours: hoursSince(m.waitingSince),
      hotel_name: propertiesById[m.propertyId]?.name,
    }));

/** Notification-worthy MR events in this persona's scope, newest first. */
export const activityFor = (personaId) => {
  const out = [];
  mrsInScope(personaId).forEach((m) => {
    const link = `/dashboard/buyer/material-requisitions/${m.id}`;
    const where = propertiesById[m.propertyId]?.shortName;
    if (m.outcome !== "draft") {
      out.push({ at: `${m.raisedOn}T09:00:00.000Z`, title: `${m.id} raised`, message: `${staff(m.raisedBy).name} raised "${m.title}" at ${where} · ₹${m.value.toLocaleString("en-IN")}`, link, kind: "mr_raised" });
    }
    m.approvals.filter((a) => !a.auto).forEach((a) => {
      out.push({
        at: new Date(a.on).toISOString(),
        title: `${m.id} ${a.decision === "REJECTED" ? "rejected" : "approved"} at level ${a.level}`,
        message: `${staff(a.by).name} ${a.decision === "REJECTED" ? "rejected" : "approved"} "${m.title}"${a.comment ? ` — ${a.comment}` : ""}`,
        link,
        kind: a.decision === "REJECTED" ? "mr_rejected" : "mr_approved",
      });
    });
    if (m.outcome === "pending" && waitingOnPersona(m) === personaId) {
      out.push({ at: new Date(m.waitingSince).toISOString(), title: `${m.id} needs your approval`, message: `"${m.title}" · ${where} · level ${m.currentLevel} of ${m.levels.length}`, link, kind: "mr_pending" });
    }
    if (m.rfq) out.push({ at: `${m.rfq.on}T12:00:00.000Z`, title: `${m.id} converted to RFQ #${m.rfq.id}`, message: m.rfq.title, link, kind: "mr_converted" });
    (m.callOffs || []).forEach((c) => out.push({ at: new Date(c.on).toISOString(), title: `PO #${c.poId} released for ${m.id}`, message: `"${m.title}" · ${where}`, link, kind: "mr_po_released" }));
    if (m.outcome === "cancelled" && m.cancelledOn) out.push({ at: new Date(m.cancelledOn).toISOString(), title: `${m.id} cancelled`, message: m.cancelNote || m.title, link, kind: "mr_cancelled" });
  });
  return out.sort((a, b) => b.at.localeCompare(a.at));
};

/* ── shapes the MR screens read ──────────────────────────── */

export const BUCKET = { draft: "drafts", pending: "pending", approved: "approved", po_released: "po_released", rejected: "cancelled", cancelled: "cancelled" };
export const API_STATUS = { draft: "draft", pending: "pending_approval", approved: "approved", po_released: "po_released", rejected: "rejected", cancelled: "cancelled" };

const iso = (d) => new Date(d.length === 10 ? `${d}T09:00:00` : d).toISOString();

const lineRow = (l, i) => {
  const arc = l.arcId ? allContracts.find((c) => c.id === l.arcId) : null;
  return {
    id: i + 1,
    product_name: l.name,
    variant_name: l.name,
    variant_slug: l.itemId,
    uom: l.uom,
    quantity: l.qty,
    note: l.note || l.spec || null,
    matched_unit_rate: l.rate,
    estimated_value: lineValue(l),
    arc_contract_id: arc ? arc.id : null,
    arc_id: arc ? arc.id : null,
    arc_number: arc ? arc.id : null,
    vendor_id: arc ? vendorNumericIdOf(l.vendorId) : null,
    vendor_name: arc ? vendorsById[l.vendorId]?.name : null,
  };
};

/** One list row (POST /mr/list-view). */
export const listRow = (m, personaId) => {
  const mine = waitingOnPersona(m) === personaId;
  const vendors = [...new Set(m.lines.filter((l) => l.arcId).map((l) => l.vendorId))].map((v) => ({ id: vendorNumericIdOf(v), name: vendorsById[v]?.name }));
  return {
    id: m.id,
    mr_number: m.id,
    title: m.title,
    status: API_STATUS[m.outcome],
    bucket: BUCKET[m.outcome],
    urgency: m.urgency,
    department_id: deptId(m.department),
    department_name: m.department,
    hotel_id: propertiesById[m.propertyId]?.numericId,
    hotel_name: propertiesById[m.propertyId]?.name,
    required_by_date: iso(m.requiredBy),
    created_at: iso(m.raisedOn),
    raised_by_name: staff(m.raisedBy).name,
    item_names: m.lines.map((l) => l.name),
    vendors,
    total_est_value: m.value,
    call_off_count: (m.callOffs || []).length,
    action_required: mine,
    action_label: mine ? `Your approval · L${m.currentLevel}` : null,
    overdue: isOverdue(m),
  };
};

/** The detail page payload (GET /mr/:id). */
export const detailPayload = (m, personaId) => {
  const p = propertiesById[m.propertyId];
  const raiser = staff(m.raisedBy);
  const submitted = m.outcome !== "draft";
  const notes = [m.justification];
  if (m.rfq) notes.push(`Converted to RFQ #${m.rfq.id} (${m.rfq.title}) on ${new Date(m.rfq.on).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`);
  if (m.po) notes.push(`Call-off PO #${m.po.id} raised ${new Date(m.po.on).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} against the resulting rate contract — ${m.po.status.toLowerCase()}.`);
  if (m.outcome === "cancelled" && m.cancelNote) notes.push(`Cancelled: ${m.cancelNote}`);

  let approval = null;
  if (submitted) {
    const engineStatus = m.outcome === "pending" ? "PENDING" : m.outcome === "rejected" ? "REJECTED" : m.outcome === "cancelled" ? "CANCELLED" : "APPROVED";
    const steps = m.levels.map((lv) => {
      const a = m.approvals.find((x) => x.level === lv);
      const key = approverKey(m, lv);
      const who = a ? staff(a.by) : staff(key);
      return {
        id: `${m.id}:L${lv}`,
        step_order: lv,
        decision_rule: "ANY",
        status: a ? a.decision : engineStatus === "REJECTED" || engineStatus === "CANCELLED" ? "SKIPPED" : "PENDING",
        approvers: [{
          user_name: who.name,
          user_designation: `${LEVEL_LABEL[lv]} · ${who.role}`,
          status: a ? a.decision : "PENDING",
          comment: a ? (a.auto ? "Raised by the department head — level auto-approved." : a.comment || null) : null,
          acted_at: a ? iso(a.on) : null,
        }],
      };
    });
    approval = {
      id: `mr:${m.id}`,
      status: engineStatus,
      current_step: m.currentLevel || m.levels.length,
      total_steps: m.levels.length,
      can_user_approve: m.outcome === "pending" && waitingOnPersona(m) === personaId,
      user_approval_step_id: m.currentLevel ? `${m.id}:L${m.currentLevel}` : null,
      steps,
    };
  }

  return {
    mr: {
      id: m.id,
      mr_number: m.id,
      title: m.title,
      status: API_STATUS[m.outcome],
      urgency: m.urgency,
      hotel_name: p?.name,
      hotel_code: p?.id?.toUpperCase(),
      department_name: m.department,
      cost_centre: `${m.department} · ${p?.shortName}`,
      raised_by_name: raiser.name,
      raised_by_role: raiser.role,
      created_at: iso(m.raisedOn),
      submitted_at: submitted ? iso(m.raisedOn) : null,
      required_by_date: iso(m.requiredBy),
      justification: notes.filter(Boolean).join(" "),
    },
    items: m.lines.map(lineRow),
    approval,
    callOffs: (m.callOffs || []).map((c) => ({ po_id: c.poId, po_number: `PO #${c.poId}`, released_at: iso(c.on) })),
  };
};

/* ── dashboard analytics (GET /mr/analytics) ─────────────── */

const ymOf = (d) => d.slice(0, 7);
const addMonths = (ym, n) => {
  const [y, mo] = ym.split("-").map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export const analyticsFor = (personaId, q = {}) => {
  const hotelIds = q.hotel_ids ? String(q.hotel_ids).split(",").map(Number) : [];
  const deptIds = q.department_ids ? String(q.department_ids).split(",").map(Number) : [];
  const from = q.created_from || null;
  const to = q.created_to || todayIso();
  const rows = mrsInScope(personaId).filter((m) =>
    (!hotelIds.length || hotelIds.includes(propertiesById[m.propertyId]?.numericId)) &&
    (!deptIds.length || deptIds.includes(deptId(m.department))) &&
    (!from || m.raisedOn >= from) && m.raisedOn <= to);

  const sumV = (xs) => xs.reduce((s, m) => s + m.value, 0);
  const of = (o) => rows.filter((m) => m.outcome === o);
  const ORDER = ["draft", "pending", "approved", "po_released", "rejected", "cancelled"];
  const by_status = ORDER.map((o) => ({ status: API_STATUS[o], count: of(o).length, value: sumV(of(o)) })).filter((r) => r.count > 0);

  // Six months ending at the range end, never reaching before its start.
  const endYm = ymOf(to);
  let months = Array.from({ length: 6 }, (_, i) => addMonths(endYm, i - 5));
  if (from) months = months.filter((ym) => ym >= ymOf(from));
  const by_month = months.map((ym) => ({ month: ym, count: rows.filter((m) => ymOf(m.raisedOn) === ym).length }));

  const by_department = MR_DEPARTMENTS.map((d) => {
    const xs = rows.filter((m) => m.department === d.title);
    return { department_id: d.id, department_name: d.title, count: xs.length, value: sumV(xs) };
  }).filter((d) => d.count > 0).sort((a, b) => b.value - a.value);

  const by_urgency = ["urgent", "normal", "low"].map((u) => ({ urgency: u, count: rows.filter((m) => m.urgency === u).length }));

  const req = {};
  rows.forEach((m) => { req[m.raisedBy] = (req[m.raisedBy] || 0) + 1; });
  const top_requesters = Object.entries(req)
    .map(([k, n]) => ({ raised_by: k, raised_by_name: staff(k).name, count: n }))
    .sort((a, b) => b.count - a.count || a.raised_by_name.localeCompare(b.raised_by_name))
    .slice(0, 5);

  const done = rows.filter((m) => m.outcome === "approved" || m.outcome === "po_released");
  const cycle = done.map((m) => {
    const last = m.approvals.filter((a) => a.decision === "APPROVED").map((a) => a.on).sort().pop();
    return last ? (new Date(last) - new Date(`${m.raisedOn}T09:00:00`)) / 86400000 : null;
  }).filter((d) => d != null);

  const pending = of("pending");
  const released = of("po_released");
  return {
    totals: {
      all: rows.length,
      pending_approval: pending.length,
      pending_value: sumV(pending),
      po_released: released.length,
      po_released_value: sumV(released),
      approved: of("approved").length,
      total_value: sumV(rows),
    },
    conversion_rate: done.length ? Math.round((released.length / done.length) * 100) : null,
    avg_approval_days: cycle.length ? Number((cycle.reduce((s, d) => s + d, 0) / cycle.length).toFixed(1)) : null,
    overdue_count: rows.filter(isOverdue).length,
    by_status,
    by_month,
    by_department,
    by_urgency,
    top_requesters,
    recent: [...rows].sort((a, b) => b.raisedOn.localeCompare(a.raisedOn) || b.id.localeCompare(a.id)).slice(0, 8).map((m) => ({
      id: m.id, mr_number: m.id, title: m.title, status: API_STATUS[m.outcome],
      department_name: m.department, hotel_name: propertiesById[m.propertyId]?.shortName,
      total_est_value: m.value, created_at: iso(m.raisedOn),
    })),
  };
};

/* ── list view (POST /mr/list-view) ──────────────────────── */

const SORTS = {
  recent: (a, b) => b.raisedOn.localeCompare(a.raisedOn) || b.id.localeCompare(a.id),
  oldest: (a, b) => a.raisedOn.localeCompare(b.raisedOn) || a.id.localeCompare(b.id),
  value: (a, b) => b.value - a.value,
  required: (a, b) => a.requiredBy.localeCompare(b.requiredBy),
};
const BUCKET_LABEL = { drafts: "Draft", pending: "Awaiting approval", approved: "Approved", po_released: "Released PO", cancelled: "Cancelled / rejected" };

export const listViewFor = (personaId, body = {}) => {
  const f = body.filters || {};
  const term = String(body.search || "").toLowerCase();
  const scoped = mrsInScope(personaId).filter((m) =>
    (!f.dateFrom || m.raisedOn >= f.dateFrom) && (!f.dateTo || m.raisedOn <= f.dateTo) &&
    (!term || [m.id, m.title, staff(m.raisedBy).name, m.department].join(" ").toLowerCase().includes(term)));
  const rows = scoped.map((m) => ({ m, r: listRow(m, personaId) }));

  const has = (arr, v) => !arr || !arr.length || arr.map(String).includes(String(v));
  const faceted = rows.filter(({ r, m }) =>
    has(f.status, r.bucket) && has(f.buId, r.hotel_id) && has(f.departmentId, r.department_id) &&
    has(f.urgency, r.urgency) && (!f.vendorId?.length || r.vendors.some((v) => has(f.vendorId, v.id))) &&
    (!f.productId?.length || m.lines.some((l) => has(f.productId, l.itemId))));

  const tab = body.tab || "all";
  const inTab = ({ r }) => tab === "all" || (tab === "for_me" ? r.action_required : r.bucket === tab);
  const tab_counts = { all: faceted.length, for_me: 0, drafts: 0, pending: 0, approved: 0, po_released: 0, cancelled: 0 };
  faceted.forEach(({ r }) => { tab_counts[r.bucket] += 1; if (r.action_required) tab_counts.for_me += 1; });

  const count = (keyOf, labelOf) => {
    const map = new Map();
    rows.forEach((x) => [].concat(keyOf(x)).forEach((k) => {
      const e = map.get(String(k)) || { key: String(k), label: labelOf(x, k), count: 0 };
      e.count += 1; map.set(String(k), e);
    }));
    return [...map.values()].sort((a, b) => b.count - a.count);
  };
  const facets = {
    status: count(({ r }) => r.bucket, (_, k) => BUCKET_LABEL[k]),
    buId: count(({ r }) => r.hotel_id, ({ r }) => r.hotel_name),
    departmentId: count(({ r }) => r.department_id, ({ r }) => r.department_name),
    productId: count(({ m }) => [...new Set(m.lines.map((l) => l.itemId))], ({ m }, k) => m.lines.find((l) => l.itemId === k)?.name),
    vendorId: count(({ r }) => r.vendors.map((v) => v.id), ({ r }, k) => r.vendors.find((v) => String(v.id) === String(k))?.name),
    urgency: count(({ r }) => r.urgency, (_, k) => k[0].toUpperCase() + k.slice(1)),
  };

  const limit = Number(body.limit) || 20;
  const page = Math.max(1, Number(body.page) || 1);
  const list = faceted.filter(inTab).sort((a, b) => (SORTS[body.sort] || SORTS.recent)(a.m, b.m)).map(({ r }) => r);
  return { rows: list.slice((page - 1) * limit, page * limit), facets, tab_counts, total: list.length, limit, page };
};

/* ── filter options and the create form ──────────────────── */

export const filterOptionsFor = (personaId) => {
  const p = peopleById[personaId] || peopleById.purchase;
  return {
    hotels: properties.filter((h) => p.propertyIds.includes(h.id)).map((h) => ({ id: h.numericId, name: h.name })),
    departments: MR_DEPARTMENTS,
  };
};

export const formHotelsFor = (personaId) => {
  const p = peopleById[personaId] || peopleById.purchase;
  return properties.filter((h) => p.propertyIds.includes(h.id)).map((h) => ({ id: h.numericId, name: h.name, code: h.id.toUpperCase() }));
};

export const contractedItemsFor = ({ hotel_id, department_id, q }) => {
  const prop = propByNumeric(hotel_id);
  const dept = deptName(department_id);
  const term = String(q || "").toLowerCase();
  return contractedItems().filter((r) =>
    prop && r.property_ids.includes(prop.id) && r.department === dept &&
    (!term || `${r.variant_name} ${r.variant_slug} ${r.vendor_name}`.toLowerCase().includes(term)));
};

export const approvalPreview = () => ({
  found: true,
  steps: [1, 2, 3].map((lv) => ({ step_order: lv, approver_label: LEVEL_LABEL[lv], approver_source_type: "USER", decision_rule: "ANY" })),
});

/* ── writes ──────────────────────────────────────────────── */

export const createMr = (personaId, body = {}) => {
  const s = load();
  const all = [...mrRecords, ...s.created];
  const next = Math.max(...all.map((m) => Number(m.id.slice(-4)))) + 1;
  const id = `MR-2627-${String(next).padStart(4, "0")}`;
  const prop = propByNumeric(body.hotel_id) || propertiesById[(peopleById[personaId] || peopleById.purchase).propertyIds[0]];
  const catalogue = contractedItems();
  const lines = (body.items || []).map((it) => {
    const c = catalogue.find((x) => x.product_variant_id === it.product_variant_id && x.arc_id === it.arc_contract_id) || {};
    return { itemId: it.product_variant_id, name: c.variant_name || it.product_variant_id, uom: it.uom || c.uom, qty: Number(it.quantity) || 0, rate: Number(it.matched_unit_rate) || c.current_rate || 0, arcId: c.arc_id || null, vendorId: c.vendor_slug || null, note: it.note || null };
  });
  const today = todayIso();
  const record = {
    id,
    title: body.title || "Untitled MR",
    propertyId: prop.id,
    department: deptName(body.department_id) || "Housekeeping",
    raisedBy: STAFF_FOR_PERSONA[personaId] || "ananya",
    raisedOn: today,
    requiredBy: body.required_by_date || today,
    urgency: body.urgency || "normal",
    outcome: "draft",
    justification: body.justification || "",
    approvals: [],
    lines,
  };
  s.created.push(record);
  save(s);
  return record;
};

export const submitMr = (id) => {
  const s = load();
  const rec = s.created.find((m) => m.id === id);
  if (!rec) return null;
  rec.outcome = "pending";
  // The raiser's own level clears itself when they are its approver.
  if (approverKey(rec, 1) === rec.raisedBy) rec.approvals.push({ level: 1, by: rec.raisedBy, on: new Date().toISOString(), decision: "APPROVED", auto: true });
  save(s);
  return rec;
};

export const cancelMr = (id) => {
  const s = load();
  s.cancelled[id] = new Date().toISOString();
  save(s);
  return true;
};

/** Approve / reject at the MR's current level, as the signed-in persona. */
export const decideMr = (id, personaId, action, comment) => {
  const m = findMr(id);
  if (!m || m.outcome !== "pending" || waitingOnPersona(m) !== personaId) return null;
  const s = load();
  const entry = { level: m.currentLevel, by: STAFF_FOR_PERSONA[personaId], on: new Date().toISOString(), decision: action === "REJECT" ? "REJECTED" : "APPROVED", comment: comment || null };
  const rec = s.created.find((x) => x.id === id);
  if (rec) rec.approvals.push(entry);
  else s.decisions[id] = [...(s.decisions[id] || []), entry];
  save(s);
  return findMr(id);
};
