import { raw } from "../index";
import { demoSession, isRejection } from "../writeRoutes";
import { activePos, toListRow, toLegacyRow, itemsLabelOf, seededSigners, bookPoDetail, withLegacyFields, seededPoDetail } from "../poState";
import listRoutes from "../listRoutes";
import detailRoutes from "../detailRoutes";
import rfqSeedRoutes from "./rfqRoutes";
import arcSeedRoutes from "./arcRoutes";
import { peopleById, propertiesById, departments } from "@/data/ihg/org";
import { pendingPos, getPo } from "@/data/ihg/orders";
import {
  allPoRecords, bookPos, bookPosById, vendorOf, scopeFor, STATUS_TEXT, APPROVED_STATUSES, REJECTED_STATUSES,
  isSpend, isCommitted, isTrackable, trackingOf, isGrnOverdue, paymentDueOn, pendingApprovalsFor,
  vendorRejectedPos, posAwaitingAcceptance, approvedThisMonth, DEMO_TODAY_ISO, iso,
} from "@/data/ihg/poBook";

/**
 * Purchase orders — lifecycle beyond pending approval, tracking, analytics, vendor rejections.
 *
 * Seed routes for the stand demo. Registered in routes.js AHEAD of the older
 * list/detail/write routes, so a path defined here overrides the same path
 * there (first match wins). Every figure is derived from data/ihg/orders.js
 * (the approval queue) and data/ihg/poBook.js (everything else), never typed.
 */

const persona = () => {
  if (typeof window === "undefined") return peopleById.purchase;
  try {
    const p = JSON.parse(atob((localStorage.getItem("token") || "").split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return Object.values(peopleById).find((x) => x.numericId === p.sub) || peopleById.purchase;
  } catch (_) { return peopleById.purchase; }
};

const decisions = () => demoSession.poDecisions || {};
const records = (me = persona()) => allPoRecords(pendingPos, decisions(), me.id);
const r1 = (n) => Math.round(n * 10) / 10;
const r2 = (n) => Math.round(n * 100) / 100;
const DAY = 86400000;
const dayMs = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00.000Z`).getTime();
const ym = (d) => String(d || "").slice(0, 7);
const TODAY_YM = DEMO_TODAY_ISO.slice(0, 7);
const LAST_YM = "2026-07";

/** A different route for the same method + path, after this module — so a PO-only variant can hand everything else on. */
const matchPath = (pattern, path) => {
  const p = pattern.split("/").filter(Boolean);
  const a = path.split("/").filter(Boolean);
  if (p.length !== a.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i += 1) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = a[i];
    else if (p[i] !== a[i]) return null;
  }
  return params;
};
const passOn = (method, path, ctx) => {
  for (const r of [...rfqSeedRoutes, ...arcSeedRoutes, ...listRoutes, ...detailRoutes]) {
    if (r.method !== method) continue;
    const params = matchPath(r.path, path);
    if (params) return r.handler({ ...ctx, params });
  }
  return undefined;
};

/* ── register rows ───────────────────────────────────────── */

const register = (p) => {
  const v = vendorOf(p.vendorId);
  const queued = p.status === "pending_approval";
  const status = p.status === "approved_internal" ? "approved" : queued ? "pending" : p.status;
  return {
    id: Number(p.id),
    po_number: p.id,
    status,
    status_label: STATUS_TEXT[p.status] || p.status,
    total_value: p.value,
    vendor: { name: v?.name || "—", short: v?.short },
    vendor_id: p.vendorId,
    vendor_name: v?.name || "—",
    rfq_id: Number(p.rfq?.id || p.rfq?.number),
    rfq_no: p.rfq?.number,
    rfq_title: p.rfq?.title || p.title,
    items_count: p.lines.length,
    items_label: itemsLabelOf(p.lines),
    quantity: p.lines.reduce((s, l) => s + (l.qty || 0), 0),
    created_at: iso(p.raisedOn),
    waiting_days: queued ? p.pendingDays : null,
    current_step_label: queued ? "Financial approval" : STATUS_TEXT[p.status],
    current_approvers: queued ? seededSigners(p).map((x) => ({ name: x.name })) : [],
    initiator: { name: peopleById[p.raisedBy]?.name },
    hotel_name: propertiesById[p.propertyId]?.shortName,
    flags: [],
  };
};

/** POs raised in this demo session (drafts and initiated), shaped for the register. */
const sessionRows = () => activePos(demoSession).map(toListRow);

const mineIds = (me) => new Set(pendingApprovalsFor(me.id, pendingPos, decisions()).map((x) => String(x.entity_id)));

const facetVendors = (rows) =>
  Object.values(rows.reduce((acc, r) => {
    const k = r.vendor_id || r.vendor_name;
    acc[k] = acc[k] || { id: k, vendor_id: k, name: r.vendor_name, count: 0 };
    acc[k].count += 1;
    return acc;
  }, {})).sort((a, b) => b.count - a.count);

const applyFacets = (rows, query) => {
  const q = String(query.search || "").trim().toLowerCase();
  return rows.filter((r) =>
    (!query.vendor_id || String(r.vendor_id) === String(query.vendor_id)) &&
    (!query.date_from || String(r.created_at) >= String(query.date_from)) &&
    (!query.date_to || String(r.created_at).slice(0, 10) <= String(query.date_to).slice(0, 10)) &&
    (!q || [r.po_number, r.rfq_no, r.rfq_title, r.vendor_name].some((x) => String(x || "").toLowerCase().includes(q))));
};

const paged = (rows, query) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  return rows.slice((page - 1) * limit, page * limit);
};

/* ── KPIs ────────────────────────────────────────────────── */

const pctDelta = (curr, prev) => (!prev ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100));

const poKpis = (me) => {
  const recs = records(me);
  const mine = pendingApprovalsFor(me.id, pendingPos, decisions());
  const minePending = me.can.approvePO ? sessionRows().filter((p) => p.status === "pending_approval") : [];
  const approvedNow = approvedThisMonth(pendingPos, decisions(), me.id, TODAY_YM).length;
  const approvedPrev = approvedThisMonth(pendingPos, decisions(), me.id, LAST_YM).length;
  const raisedIn = (m) => recs.filter((p) => isSpend(p) && ym(p.raisedOn) === m).reduce((s, p) => s + p.value, 0);
  const ids = new Set(mine.map((x) => String(x.entity_id)));
  const heldPos = pendingPos.filter((p) => ids.has(String(p.id)));
  return {
    // Every PO still open: in approval, out with the vendor or not yet paid.
    activeCount: recs.filter((p) => !REJECTED_STATUSES.has(p.status) && p.status !== "completed").length + sessionRows().length,
    awaitingYou: mine.length + minePending.length,
    awaitingOldestDays: Math.max(0, ...heldPos.map((p) => p.pendingDays)),
    inTransit: recs.filter((p) => p.status === "dispatched").length,
    // As the product counts them: accepted = vendor said yes, not yet shipped; pending = sent, no answer.
    vendorAccepted: recs.filter((p) => p.status === "approved").length,
    vendorAcceptancePending: recs.filter((p) => p.status === "acceptance_pending").length,
    avgDeliveryDays: r1(avg(recs.filter((p) => p.deliveredOn).map((p) => (dayMs(p.deliveredOn) - dayMs(p.raisedOn)) / DAY))),
    approvedThisMonth: approvedNow,
    approvedDeltaPct: pctDelta(approvedNow, approvedPrev),
    totalValueMTD: r2(raisedIn(TODAY_YM)),
    totalValueDeltaPct: pctDelta(raisedIn(TODAY_YM), raisedIn(LAST_YM)),
    heldValue: r2(heldPos.reduce((s, p) => s + p.value, 0) + minePending.reduce((s, p) => s + (Number(p.total_value) || 0), 0)),
  };
};

function avg(xs) { return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0; }

/* ── tracking ────────────────────────────────────────────── */

const trackingRow = (p) => ({ ...register(p), ...trackingOf(p) });

const TRACK_TABS = {
  active: (r) => !r.completed,
  "awaiting-grn": (r) => r.grn_status !== "done" && r.current_stage !== "paid",
  payment: (r) => r.invoice_status === "done" && r.payment_status !== "done",
  completed: (r) => r.completed,
  all: () => true,
};

const trackingKpis = (rows, recs) => {
  const inTransit = recs.filter((p) => p.status === "dispatched");
  return {
    in_transit: inTransit.length,
    earliest_eta: inTransit.map((p) => p.expectedOn).sort()[0] || null,
    grn_overdue: recs.filter((p) => isGrnOverdue(p)).length,
    payments_due_value: r2(recs.filter((p) => p.status === "invoice_raised").reduce((s, p) => s + p.value, 0)),
    payments_due_count: recs.filter((p) => p.status === "invoice_raised").length,
    payments_overdue: rows.filter((r) => r.payment_status === "overdue").length,
    completed: recs.filter((p) => p.status === "completed").length,
  };
};

/* ── analytics ───────────────────────────────────────────── */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** Reporting windows ending on demo today, and the window before each. */
const PERIODS = {
  "this-week": { from: "2026-08-10", prevFrom: "2026-08-03", prevTo: "2026-08-09" },
  "this-month": { from: "2026-08-01", prevFrom: "2026-07-01", prevTo: "2026-07-31" },
  "this-quarter": { from: "2026-07-01", prevFrom: "2026-04-01", prevTo: "2026-05-14" },
  ytd: { from: "2026-04-01", prevFrom: "2025-04-01", prevTo: "2025-08-14" },
};
const STATUS_ORDER = ["pending_approval", "approved_internal", "acceptance_pending", "approved", "dispatched", "delivered", "GRN", "invoice_raised", "completed", "rejected_by_vendor", "rejected"];
const DONUT_KEY = { pending_approval: "pending", approved_internal: "approved", acceptance_pending: "pending", approved: "approved", dispatched: "dispatched", delivered: "delivered", GRN: "delivered", invoice_raised: "delivered", completed: "completed", rejected: "rejected", rejected_by_vendor: "rejected" };

const hours = (a, b) => (a && b ? (dayMs(b) - dayMs(a)) / 3600000 : null);
const stageTime = (label, sub, xs) => {
  const hrs = avg(xs.filter((x) => x != null));
  const status = hrs > 72 ? "slow" : hrs > 24 ? "warn" : "ok";
  return { stage: label, sub, time: hrs >= 24 ? `${(hrs / 24).toFixed(1)}d` : `${hrs.toFixed(1)}h`, status };
};

const poAnalytics = (me, period) => {
  const recs = records(me);
  const win = PERIODS[period] || PERIODS["this-month"];
  const inWin = (p, from, to = DEMO_TODAY_ISO) => p.raisedOn >= from && p.raisedOn <= to;
  const spend = recs.filter(isSpend);
  const totalSpend = spend.filter((p) => inWin(p, win.from)).reduce((s, p) => s + p.value, 0);
  const prevSpend = spend.filter((p) => inWin(p, win.prevFrom, win.prevTo)).reduce((s, p) => s + p.value, 0);
  const approved = recs.filter((p) => p.approvedOn && p.raisedOn && APPROVED_STATUSES.has(p.status));
  const cycle = avg(approved.map((p) => (dayMs(p.approvedOn) - dayMs(p.raisedOn)) / DAY));
  const delivered = recs.filter((p) => p.deliveredOn && p.expectedOn);
  const onTime = delivered.filter((p) => p.deliveredOn <= p.expectedOn).length;
  const saved = (p) => (p.savingsPct ? p.value * p.savingsPct / (100 - p.savingsPct) : 0);
  const committedInWin = recs.filter((p) => isCommitted(p) && inWin(p, win.from));
  const savingsTotal = committedInWin.reduce((s, p) => s + saved(p), 0);
  const savingsBy = (via) => committedInWin.filter((p) => (p.savingsVia || "negotiation") === via).reduce((s, p) => s + saved(p), 0);
  const vendorIds = [...new Set(recs.filter(isCommitted).map((p) => p.vendorId))];
  const categories = new Set(vendorIds.flatMap((id) => vendorOf(id)?.categories || []));

  // Six months ending this one — committed value by the month it was raised.
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(Date.UTC(2026, 7 - 5 + i, 1)); return d.toISOString().slice(0, 7); });
  const spendTrend = months.map((m) => ({
    month: MONTHS[Number(m.slice(5)) - 1],
    value: r2(spend.filter((p) => ym(p.raisedOn) === m).reduce((s, p) => s + p.value, 0)),
    current: m === TODAY_YM,
  }));

  const byStatus = STATUS_ORDER.map((st) => {
    const xs = recs.filter((p) => p.status === st);
    return { key: DONUT_KEY[st], status: st, label: STATUS_TEXT[st], count: xs.length, value: r2(xs.reduce((s, p) => s + p.value, 0)), committed: !REJECTED_STATUSES.has(st) };
  }).filter((s) => s.count > 0);
  const n = byStatus.reduce((s, x) => s + x.count, 0);
  byStatus.forEach((s) => { s.pct = n ? Math.round((s.count / n) * 1000) / 10 : 0; });

  const top = Object.values(recs.filter(isCommitted).reduce((acc, p) => {
    const v = vendorOf(p.vendorId) || {};
    acc[p.vendorId] = acc[p.vendorId] || { name: v.name, short: (v.short || v.name || "").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase(), orders: 0, value: 0, otd: v.performance?.onTimePct || null };
    acc[p.vendorId].orders += 1;
    acc[p.vendorId].value = r2(acc[p.vendorId].value + p.value);
    return acc;
  }, {})).sort((a, b) => b.value - a.value).slice(0, 6).map((v) => ({ ...v, on_time: v.otd >= 90 }));

  const committed = recs.filter(isCommitted);
  const pct = (xs, f) => (xs.length ? Math.round((xs.filter(f).length / xs.length) * 100) : 0);
  const tone = (x) => (x >= 90 ? "ok" : x >= 60 ? "warn" : "danger");
  const certOk = (p) => !(vendorOf(p.vendorId)?.certifications || []).some((c) => c.status === "expired");
  const compliance = [
    { name: "Raised from a competitive RFQ", pct: pct(committed, (p) => !!p.rfq?.number) },
    { name: "Supplier certificates valid", pct: pct(recs.filter((p) => !REJECTED_STATUSES.has(p.status)), certOk) },
    { name: "Delivered on or before the promised date", pct: pct(delivered, (p) => p.deliveredOn <= p.expectedOn) },
    { name: "GRN posted within 2 days of delivery", pct: pct(recs.filter((p) => p.deliveredOn && (p.grnOn || dayMs(DEMO_TODAY_ISO) - dayMs(p.deliveredOn) > 2 * DAY)), (p) => p.grnOn && dayMs(p.grnOn) - dayMs(p.deliveredOn) <= 2 * DAY) },
  ].map((c) => ({ ...c, tone: tone(c.pct) }));

  const deptSpend = departments.map((d) => ({
    name: d.name,
    value: r2(spend.filter((p) => inWin(p, win.from) && p.dept === d.name).reduce((s, p) => s + p.value, 0)),
  })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
  const deptTotal = deptSpend.reduce((s, d) => s + d.value, 0);

  const propertySpend = Object.values(propertiesById).map((pr) => ({
    name: pr.shortName,
    value: r2(spend.filter((p) => inWin(p, win.from) && p.propertyId === pr.id).reduce((s, p) => s + p.value, 0)),
  })).filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

  const waiting = pendingPos.filter((p) => !decisions()[p.id] && scopeFor(me.id).includes(p.propertyId)).map((p) => p.pendingDays);
  return {
    kpis: {
      total_spend: r2(totalSpend),
      spend_delta_pct: pctDelta(totalSpend, prevSpend),
      avg_approval_cycle_days: r1(cycle),
      approval_cycle_delta: 0,
      on_time_delivery_pct: delivered.length ? Math.round((onTime / delivered.length) * 100) : 0,
      otd_basis: `${onTime} of ${delivered.length} deliveries`,
      otd_delta: 0,
      cost_savings: r2(savingsTotal),
      savings_pct: committedInWin.length ? r1((savingsTotal / (committedInWin.reduce((s, p) => s + p.value, 0) + savingsTotal)) * 100) : 0,
      active_vendors: vendorIds.length,
      vendor_categories: categories.size,
    },
    spend_trend: spendTrend,
    status_dist: byStatus,
    bottlenecks: [
      stageTime("Financial approval", "raised → approved, up to ₹25L", approved.filter((p) => p.value <= 2500000).map((p) => hours(p.raisedOn, p.approvedOn))),
      stageTime("Group head approval", "raised → approved, above ₹25L", approved.filter((p) => p.value > 2500000).map((p) => hours(p.raisedOn, p.approvedOn))),
      stageTime("Vendor acceptance", "sent → accepted", recs.map((p) => hours(p.sentOn, p.acceptedOn))),
      stageTime("Delivery", "accepted → delivered", recs.map((p) => hours(p.acceptedOn, p.deliveredOn))),
      stageTime("GRN posting", "delivered → goods received", recs.map((p) => hours(p.deliveredOn, p.grnOn))),
    ].filter((b) => b.time !== "0.0h"),
    top_vendors: top,
    savings: {
      total: r2(savingsTotal),
      delta_pct: committedInWin.length ? r1((savingsTotal / (committedInWin.reduce((s, p) => s + p.value, 0) + savingsTotal)) * 100) : 0,
      rounds: { negotiation: r2(savingsBy("negotiation")), comparison: r2(savingsBy("comparison")), alt: r2(savingsBy("alt")) },
    },
    compliance,
    spend_by_dept: deptSpend.map((d) => ({ ...d, pct: deptTotal ? Math.round((d.value / deptTotal) * 100) : 0 })),
    spend_by_property: propertySpend,
    queue_health: {
      under_24h: waiting.filter((d) => d < 1).length,
      d1_to_3: waiting.filter((d) => d >= 1 && d <= 3).length,
      over_3d: waiting.filter((d) => d > 3).length,
      oldest_days: Math.max(0, ...waiting),
      avg_approval_days: r1(cycle),
    },
  };
};

/* ── the legacy, RFQ-scoped screen (/dashboard/buyer/purchase-order) ── */

const rfqKey = (p) => String(p.rfq?.id || p.rfq?.number);

const poRoutes = [
  {
    method: "get",
    path: "/po/list",
    handler: ({ query }) => {
      const me = persona();
      const mine = mineIds(me);
      const all = [...sessionRows(), ...records(me).map(register)];
      const rows = applyFacets(all, query);
      const buckets = {
        all: () => true,
        "action-required": (r) => mine.has(String(r.id)) || (me.can.approvePO && r.raised_this_session && r.status === "pending_approval"),
        approved: (r) => APPROVED_STATUSES.has(r.status) || r.status === "approved",
        rejected: (r) => REJECTED_STATUSES.has(r.status),
      };
      const pick = buckets[String(query.status || "all")] || buckets.all;
      const shown = rows.filter(pick);
      return raw({
        data: paged(shown, query),
        total_items: shown.length,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        vendors: facetVendors(all),
        status_counts: {
          all: rows.length,
          action_required: rows.filter(buckets["action-required"]).length,
          pending: rows.filter((r) => r.status === "pending" || r.status === "pending_approval").length,
          approved: rows.filter(buckets.approved).length,
          rejected: rows.filter(buckets.rejected).length,
          draft: rows.filter((r) => r.status === "draft").length,
        },
      });
    },
  },
  { method: "get", path: "/po/dashboard/kpis", handler: () => raw(poKpis(persona())) },
  {
    method: "get",
    path: "/po/tracking",
    handler: ({ query }) => {
      const me = persona();
      const recs = records(me).filter(isTrackable);
      const all = recs.map(trackingRow);
      const rows = applyFacets(all, query);
      const tab = TRACK_TABS[String(query.tab || "active")] || TRACK_TABS.active;
      const shown = rows.filter(tab);
      return raw({
        data: paged(shown, query),
        total_items: shown.length,
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 10,
        tab_counts: Object.fromEntries(Object.entries(TRACK_TABS).map(([k, f]) => [k, rows.filter(f).length])),
        vendors: facetVendors(all),
        kpis: trackingKpis(all, recs),
      });
    },
  },
  { method: "get", path: "/po/analytics", handler: ({ query }) => raw(poAnalytics(persona(), query.period)) },
  {
    method: "get",
    path: "/po/detail/:id",
    handler: (ctx) => {
      const po = bookPosById[ctx.params.id];
      return po ? bookPoDetail(po) : passOn("get", `/po/detail/${ctx.params.id}`, ctx);
    },
  },
  {
    // Legacy detail. The queue and book orders get the flat fields the legacy
    // PODetails destructures, laid over the same projection the new screen reads.
    method: "get",
    path: "/po/:poId",
    handler: (ctx) => {
      const id = ctx.params.poId;
      if (!/^\d+$/.test(String(id))) return passOn("get", `/po/${id}`, ctx);
      const po = bookPosById[id];
      if (po) return withLegacyFields(bookPoDetail(po), po);
      const queued = getPo(id);
      if (queued) return withLegacyFields(seededPoDetail(queued, demoSession), queued);
      return passOn("get", `/po/${id}`, ctx);
    },
  },
  {
    method: "get",
    path: "/po/rfq/:rfqId",
    handler: ({ params }) => {
      const me = persona();
      const canApprove = !!me.can.approvePO;
      const mine = mineIds(me);
      const fromBook = records(me)
        .filter((p) => rfqKey(p) === String(params.rfqId))
        .map((p) => ({
          ...register(p),
          status: p.status === "pending_approval" ? "pending_approval" : p.status === "approved_internal" ? "approved" : p.status,
          is_approver: mine.has(String(p.id)),
          line_subtotal: p.subtotal,
          global_charges: [],
          unit: p.lines[0]?.unit || "pcs",
          finalized_vendor_name: vendorOf(p.vendorId)?.name,
          vendor_action_at: p.acceptedOn ? iso(p.acceptedOn) : p.vendorRejectedOn || null,
          vendor_rejection_reason: p.vendorRejectReason || null,
          product_details: p.lines.map((l, i) => ({ id: i + 1, name: l.name, quantity: l.qty })),
        }));
      const session = activePos(demoSession)
        .filter((po) => String(po.rfq_no) === String(params.rfqId))
        .map((po) => toLegacyRow(po, canApprove));
      const rows = [...session, ...fromBook];
      return raw({ data: rows, total: rows.length, approval_level: canApprove ? 2 : 1 });
    },
  },
  {
    /**
     * The RFQ list the legacy PO screen's sidebar reads (`po: true`). PO flags
     * are laid onto every RFQ that has an order on the book; any other call to
     * this path is handed on unchanged to the RFQ area's route.
     */
    method: "get",
    path: "/rfq/get-rfqs",
    handler: (ctx) => {
      const base = passOn("get", "/rfq/get-rfqs", ctx);
      const q = ctx.query || {};
      if (!(q.po === true || q.po === "true" || q.module_keys === "po")) return base;
      const me = persona();
      const mine = mineIds(me);
      const list = Array.isArray(base) ? base : Array.isArray(base?.data) ? base.data : [];
      const byRfq = {};
      [...records(me)].forEach((p) => { (byRfq[rfqKey(p)] = byRfq[rfqKey(p)] || []).push(p); });
      activePos(demoSession).forEach((po) => { (byRfq[String(po.rfq_no)] = byRfq[String(po.rfq_no)] || []).push({ ...po, status: po.status, session: true }); });
      const flags = (pos) => ({
        has_draft_po: pos.some((p) => p.status === "draft"),
        approval_required: pos.some((p) => p.status === "pending_approval" && (p.session || mine.has(String(p.id)))),
        has_po_rejection: pos.some((p) => p.status === "rejected_by_vendor"),
        has_pending_po_approval: pos.some((p) => p.status === "pending_approval" || p.status === "acceptance_pending"),
        po_completed: pos.length > 0 && pos.every((p) => p.status === "completed"),
        po_count: pos.length,
      });
      const seen = new Set();
      const rows = list
        .filter((r) => byRfq[String(r.rfq_no || r.id)])
        .map((r) => { seen.add(String(r.rfq_no || r.id)); return { ...r, ...flags(byRfq[String(r.rfq_no || r.id)]) }; });
      Object.entries(byRfq).forEach(([key, pos]) => {
        if (seen.has(key)) return;
        const p = pos[0];
        rows.push({
          id: Number(key), rfq_no: key, code: `RFQ-${key}`, title: p.rfq?.title || p.title || `RFQ #${key}`,
          status: 1, hotel_name: propertiesById[p.propertyId]?.shortName, department_title: p.dept,
          created_at: iso(p.raisedOn), ...flags(pos),
        });
      });
      return rows;
    },
  },
  {
    method: "get",
    path: "/dashboard-v2/rejected-pos",
    handler: () => vendorRejectedPos(persona().id),
  },
  {
    // The legacy PO screen's approver/site-rep pickers.
    method: "get",
    path: "/users/company-users",
    handler: () => Object.values(peopleById).map((p) => ({ id: p.numericId, name: p.name, email: p.email, phone: p.phone, designation: p.title })),
  },
];

/* What the dashboard area reads, re-exported with the session applied. */
export const poPendingApprovalsFor = (personaId) => pendingApprovalsFor(personaId, pendingPos, decisions());
export const poVendorRejected = (personaId) => vendorRejectedPos(personaId);
export const poAwaitingAcceptance = (personaId) => posAwaitingAcceptance(personaId);
export const poApprovedThisMonth = (personaId) => approvedThisMonth(pendingPos, decisions(), personaId);
export { bookPos, isRejection, paymentDueOn };

export default poRoutes;
