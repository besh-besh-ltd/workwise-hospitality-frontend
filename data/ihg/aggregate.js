import * as poArea from "./poBook";
import * as mrArea from "./mrWorkflow";
import * as rfqArea from "./rfqBook";
import * as arcArea from "./contracts";
import { pendingPos } from "./orders";
import { peopleById, properties, propertiesById } from "./org";
import { vendorsById } from "./vendors";
import { DEMO_TODAY } from "@/lib/demoClock";

/**
 * The dashboard's cross-module view: one place that asks every area what is
 * waiting on a persona and what has happened in their scope.
 *
 * Each area owns its own list (PO → poBook.js, MR → mrWorkflow.js, RFQ and
 * negotiation → rfqBook.js, rate contracts → contracts.js). This file only
 * concatenates and counts them, so the action centre, the approvals modal, the
 * sidebar pills, the banner and the notifications inbox can never disagree
 * with the screens they link to.
 *
 * Area modules are read through their namespaces and checked at call time:
 * an area that has not exported its function yet falls back to its existing
 * fixtures (PO → the pendingPos queue in orders.js) rather than to a number.
 */

const DAY = 86400000;
const day = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00.000Z`).getTime();
const daysBetween = (a, b) => Math.round((day(b) - day(a)) / DAY);
const daysFromToday = (d) => daysBetween(DEMO_TODAY, d);
const r2 = (n) => Math.round(n * 100) / 100;
const fn = (mod, name) => (mod && typeof mod[name] === "function" ? mod[name] : null);

/* ── scope ───────────────────────────────────────────────────── */

/** The properties a persona's dashboard covers, narrowed by the BU filter. */
export const scopeOf = (personaId, hotelIds = "") => {
  const own = peopleById[personaId]?.propertyIds || properties.map((p) => p.id);
  const picked = String(hotelIds || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!picked.length) return own;
  const ids = properties.filter((p) => picked.includes(String(p.numericId)) || picked.includes(p.id)).map((p) => p.id);
  const narrowed = own.filter((id) => ids.includes(id));
  return narrowed.length ? narrowed : own;
};
const touches = (scope, propertyIds = []) => propertyIds.some((p) => scope.includes(p));

/** Inclusive date window from the dashboard's range control. */
const inPeriod = (d, q = {}) => {
  if (!d) return false;
  const v = String(d).slice(0, 10);
  if (q.start_date && v < q.start_date) return false;
  if (q.end_date && v > q.end_date) return false;
  return true;
};

/* ── fallbacks (an area that has not exported yet) ──────────── */

const poPendingFallback = (personaId, decisions = {}) =>
  peopleById[personaId]?.can.approvePO
    ? pendingPos
        .filter((po) => !decisions[po.id])
        .filter((po) => (po.chain || []).some((c) => (c.personIds || [c.personId]).includes(personaId) && c.state === "pending"))
        .map((po) => ({
          entity_type: "PO",
          entity_id: Number(po.id),
          entity_title: `${po.ref} · ${po.title}`,
          metadata: { rfq_number: po.rfq?.number, rfq_title: po.rfq?.title },
          waiting_hours: (po.pendingDays || 0) * 24,
          hotel_name: propertiesById[po.propertyId]?.name,
        }))
    : [];

/* ── the four areas ──────────────────────────────────────────── */

/**
 * How each area is asked. The PO area needs the session's decisions so an
 * order approved in the demo leaves every list at once.
 */
const AREAS = [
  {
    key: "PO",
    module: "data/ihg/poBook.js",
    approvals: (id, o) => {
      const f = fn(poArea, "pendingApprovalsFor");
      return f ? f(id, pendingPos, o.poDecisions || {}) : poPendingFallback(id, o.poDecisions || {});
    },
    activity: (id, o) => {
      const f = fn(poArea, "activityFor");
      return f ? f(id, pendingPos, o.poDecisions || {}) : [];
    },
    wired: () => ({ approvals: !!fn(poArea, "pendingApprovalsFor"), activity: !!fn(poArea, "activityFor") }),
  },
  {
    key: "MR",
    module: "data/ihg/mrWorkflow.js",
    approvals: (id) => fn(mrArea, "pendingApprovalsFor")?.(id) || [],
    activity: (id) => fn(mrArea, "activityFor")?.(id) || [],
    wired: () => ({ approvals: !!fn(mrArea, "pendingApprovalsFor"), activity: !!fn(mrArea, "activityFor") }),
  },
  {
    key: "RFQ",
    module: "data/ihg/rfqBook.js",
    approvals: (id) => fn(rfqArea, "pendingApprovalsFor")?.(id) || [],
    activity: (id) => fn(rfqArea, "activityFor")?.(id) || [],
    wired: () => ({ approvals: !!fn(rfqArea, "pendingApprovalsFor"), activity: !!fn(rfqArea, "activityFor") }),
  },
  {
    key: "ARC",
    module: "data/ihg/contracts.js",
    approvals: (id) => fn(arcArea, "pendingApprovalsFor")?.(id) || [],
    activity: (id) => fn(arcArea, "activityFor")?.(id) || [],
    wired: () => ({ approvals: !!fn(arcArea, "pendingApprovalsFor"), activity: !!fn(arcArea, "activityFor") }),
  },
];

/** Which area exports are live and which fell back — for the report and debugging. */
export const wiring = () => Object.fromEntries(AREAS.map((a) => [a.key, { module: a.module, ...a.wired() }]));

/**
 * Every approval waiting on this persona, across all areas, longest wait
 * first. `approval_id` is the modal's row key, so it must be unique.
 */
export const pendingApprovalsFor = (personaId, opts = {}) =>
  AREAS.flatMap((a) => a.approvals(personaId, opts).map((item) => ({ area: a.key, ...item })))
    .map((item) => ({ approval_id: `${item.entity_type}-${item.entity_id}`, ...item }))
    .sort((a, b) => (b.waiting_hours || 0) - (a.waiting_hours || 0));

/** The same list counted by entity type — the sidebar's pills. */
export const approvalCountsFor = (personaId, opts = {}) => {
  const counts = {};
  pendingApprovalsFor(personaId, opts).forEach((i) => {
    counts[i.entity_type] = (counts[i.entity_type] || 0) + 1;
  });
  return Object.entries(counts).map(([entity_type, count]) => ({ entity_type, count }));
};

/** Every event in this persona's scope, newest first. */
export const activityFor = (personaId, opts = {}) =>
  AREAS.flatMap((a) => a.activity(personaId, opts).map((e) => ({ area: a.key, ...e })))
    .filter((e) => e.at && e.link)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)));

/* ── RFQs ────────────────────────────────────────────────────── */

const rfqRows = () => rfqArea.rfqBook || [];
const PUBLISHED = (r) => !!r.publishedOn && !["DRAFT", "RFQ_APPROVAL"].includes(r.statusKey);
const DONE = ["APPROVED_COMPLETED", "AWAITING_PO", "PO_APPROVAL", "CLOSED", "RFQ_STUCK_COMMERCIAL"];
const hotelNames = (ids = []) => ids.map((p) => propertiesById[p]?.shortName).filter(Boolean).join(", ");

export const rfqsInScope = (personaId, q = {}) => {
  const scope = scopeOf(personaId, q.hotel_ids);
  return rfqRows().filter((r) => touches(scope, r.propertyIds));
};

/** Published RFQs with no vendor quote yet — split by whether the window is still open. */
export const noResponseRfqs = (personaId, q = {}) => {
  const rows = rfqsInScope(personaId, q)
    .filter((r) => PUBLISHED(r) && (r.quoted || []).length === 0 && r.statusKey !== "CLOSED")
    .map((r) => ({
      id: Number(r.id),
      rfq_no: r.id,
      title: r.title,
      invited_vendor_count: (r.invited || []).length,
      hotel_name: hotelNames(r.propertyIds),
      bid_end_date: r.closesOn,
    }));
  return {
    active: rows.filter((r) => r.bid_end_date && daysFromToday(r.bid_end_date) >= 0),
    expired: rows.filter((r) => !r.bid_end_date || daysFromToday(r.bid_end_date) < 0),
  };
};

/** Open RFQs whose bid window closes within 3 days of today. */
export const rfqsEndingSoon = (personaId, q = {}) =>
  rfqsInScope(personaId, q)
    .filter((r) => r.statusKey === "AWAITING_QUOTES" && r.closesOn)
    .filter((r) => {
      const d = daysFromToday(r.closesOn);
      return d >= 0 && d <= 3;
    })
    .sort((a, b) => a.closesOn.localeCompare(b.closesOn));

/* ── POs ─────────────────────────────────────────────────────── */

/** Every PO on the books in this persona's (and the BU filter's) scope, decisions applied. */
export const posInScope = (personaId, q = {}, opts = {}) => {
  const all = fn(poArea, "allPoRecords");
  const rows = all ? all(pendingPos, opts.poDecisions || {}, personaId) : pendingPos;
  const filtered = String(q.hotel_ids || "").trim();
  if (!filtered) return rows;
  const scope = scopeOf(personaId, q.hotel_ids);
  return rows.filter((p) => scope.includes(p.propertyId));
};

/** The BU filter applied to PO rows (records carry propertyId, modal rows hotel_name). */
const poScopeFilter = (personaId, q) => {
  if (!String(q.hotel_ids || "").trim()) return () => true;
  const scope = scopeOf(personaId, q.hotel_ids);
  return (p) => scope.includes(p.propertyId) || scope.some((s) => propertiesById[s]?.name === p.hotel_name);
};

/** POs the vendor turned down that the desk has to reassign. */
export const vendorRejectedPosFor = (personaId, q = {}) => {
  const f = fn(poArea, "vendorRejectedPos");
  return f ? f(personaId).filter(poScopeFilter(personaId, q)) : [];
};

/** POs sent to vendors, awaiting their acceptance. */
export const posAwaitingAcceptanceFor = (personaId, q = {}) => {
  const f = fn(poArea, "posAwaitingAcceptance");
  return f ? f(personaId).filter(poScopeFilter(personaId, q)) : [];
};

const isCommitted = (p) => (fn(poArea, "isCommitted") ? poArea.isCommitted(p) : false);

/* ── the action centre and banner ────────────────────────────── */

export const actionCentreFor = (personaId, q = {}, opts = {}) => {
  const noResp = noResponseRfqs(personaId, q);
  return {
    pending_approvals: pendingApprovalsFor(personaId, opts).length,
    rejected_vendors: vendorRejectedPosFor(personaId, q).length,
    rfqs_awaiting: noResp.active.length + noResp.expired.length,
    rfqs_ending_soon: rfqsEndingSoon(personaId, q).length,
    pos_awaiting: posAwaitingAcceptanceFor(personaId, q).length,
  };
};

/* ── snapshot, spend, categories ─────────────────────────────── */

/** Approved POs raised in the period: what "spend" means on this dashboard. */
const spendPos = (personaId, q, opts) => posInScope(personaId, q, opts).filter((p) => isCommitted(p) && inPeriod(p.raisedOn, q));

export const procurementSnapshotFor = (personaId, q = {}, opts = {}) => {
  const rfqs = rfqsInScope(personaId, q);
  const active = rfqs.filter((r) => PUBLISHED(r) && !DONE.includes(r.statusKey));
  const closed = rfqs.filter((r) => DONE.includes(r.statusKey) && inPeriod(r.finalisedOn || r.closesOn, q));
  const turned = rfqs.filter((r) => r.publishedOn && r.finalisedOn && inPeriod(r.finalisedOn, q));
  const avgTurn = turned.length
    ? turned.reduce((s, r) => s + daysBetween(r.publishedOn, r.finalisedOn), 0) / turned.length
    : 0;
  const pos = spendPos(personaId, q, opts);
  const total = r2(pos.reduce((s, p) => s + p.value, 0));
  const base = r2(pos.reduce((s, p) => s + (p.subtotal || 0), 0));
  return {
    active_rfqs: active.length,
    closed_rfqs: closed.length,
    pos_issued: pos.length,
    total_spend: total,
    avg_turnaround: Number(avgTurn.toFixed(1)),
    spend_breakup: { base_excl_gst: base, total_gst: r2(total - base), total_incl_gst: total },
  };
};

export const categorySpendFor = (personaId, q = {}, opts = {}) => {
  const pos = spendPos(personaId, q, opts);
  const buckets = {};
  if (q.dimension === "subcategory") {
    pos.forEach((p) => p.lines.forEach((l) => {
      buckets[l.name] = (buckets[l.name] || 0) + l.amount;
    }));
  } else {
    pos.forEach((p) => {
      const k = p.dept || "Other";
      buckets[k] = (buckets[k] || 0) + p.value;
    });
  }
  const total = Object.values(buckets).reduce((s, v) => s + v, 0);
  const rows = Object.entries(buckets)
    .map(([category_name, spend]) => ({ category_name, spend_amount: r2(spend), percentage: total ? Number(((spend / total) * 100).toFixed(1)) : 0 }))
    .sort((a, b) => b.spend_amount - a.spend_amount);
  return { categories: rows.length > 8 ? rows.slice(0, 8) : rows, total_spend: r2(total) };
};

/** Spend lines rolled up by item, ranked, with the A/B/C split at 70% / 90%. */
export const abcFor = (personaId, q = {}, opts = {}) => {
  const byItem = {};
  spendPos(personaId, q, opts).forEach((p) => p.lines.forEach((l) => {
    const cur = byItem[l.name] || { name: l.name, value: 0, volume: 0 };
    cur.value += l.amount;
    cur.volume += l.qty;
    byItem[l.name] = cur;
  }));
  const key = q.metric === "volume" ? "volume" : "value";
  const items = Object.values(byItem).sort((a, b) => b[key] - a[key]);
  const total = items.reduce((s, i) => s + i[key], 0);
  let run = 0;
  const ranked = items.map((it, i) => {
    const before = run;
    run += it[key];
    const cls = total && before / total < 0.7 ? "A" : total && before / total < 0.9 ? "B" : "C";
    return { ...it, value: r2(it.value), rank: i + 1, class: cls, product_variant_id: `abc-${i + 1}` };
  });
  const classes = ["A", "B", "C"].map((c) => {
    const rows = ranked.filter((r) => r.class === c);
    const v = rows.reduce((s, r) => s + r.value, 0);
    const vol = rows.reduce((s, r) => s + r.volume, 0);
    const m = key === "volume" ? vol : v;
    return {
      class: c,
      item_count: rows.length,
      item_pct: ranked.length ? Math.round((rows.length / ranked.length) * 100) : 0,
      value: r2(v),
      volume: vol,
      metric_pct: total ? Math.round((m / total) * 100) : 0,
    };
  });
  return { classes, items: ranked, total_items: ranked.length };
};

/* ── price benchmarking (cost intelligence) ──────────────────── */

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Items bought more than once, by spend; for the selected one, the rate paid month by month. */
export const costIntelligenceFor = (personaId, q = {}, opts = {}) => {
  const pos = posInScope(personaId, q, opts).filter((p) => isCommitted(p) || p.status === "pending_approval");
  const byItem = {};
  pos.forEach((p) => p.lines.forEach((l) => {
    const k = slug(l.name);
    (byItem[k] = byItem[k] || { name: l.name, rows: [], spend: 0 }).rows.push({ on: p.raisedOn, rate: l.rate, vendorId: p.vendorId, poId: p.id });
    byItem[k].spend += l.amount;
  }));
  const top = Object.entries(byItem)
    .filter(([, v]) => v.rows.length > 1)
    .sort((a, b) => b[1].spend - a[1].spend)
    .slice(0, 8);
  const top_products = top.map(([id, v]) => ({ product_variant_id: id, product_name: v.name }));
  const pick = byItem[q.product_variant_id] || (top[0] && top[0][1]);
  if (!pick) return { top_products, price_trend: null, benchmark: null, vendor_comparison: [] };
  const rows = [...pick.rows].sort((a, b) => String(a.on).localeCompare(String(b.on)));
  const months = [...new Set(rows.map((r) => String(r.on).slice(0, 7)))];
  const rateIn = (m) => rows.filter((r) => String(r.on).slice(0, 7) === m).map((r) => r.rate);
  const latest = rows[rows.length - 1];
  const earlier = rows.slice(0, -1);
  const best = Math.min(...earlier.map((r) => r.rate));
  const byVendor = {};
  rows.forEach((r) => (byVendor[r.vendorId] = byVendor[r.vendorId] || []).push(r.rate));
  const vendorRows = Object.entries(byVendor)
    .map(([v, rates]) => ({ vendor_name: vendorsById[v]?.name || poArea.vendorOf?.(v)?.name || v, avg_price: r2(rates.reduce((s, x) => s + x, 0) / rates.length) }))
    .sort((a, b) => a.avg_price - b.avg_price)
    .slice(0, 4)
    .map((v, i) => ({ ...v, is_best: i === 0 }));
  return {
    top_products,
    granularity: "month",
    price_trend: {
      labels: months.map((m) => `${m}-01`),
      min: months.map((m) => Math.min(...rateIn(m))),
      avg: months.map((m) => r2(rateIn(m).reduce((s, x) => s + x, 0) / rateIn(m).length)),
      max: months.map((m) => Math.max(...rateIn(m))),
    },
    benchmark: {
      benchmark_price: best,
      current_price: latest.rate,
      vs_benchmark_pct: best ? Number((((latest.rate - best) / best) * 100).toFixed(1)) : 0,
    },
    vendor_comparison: vendorRows,
  };
};

/* ── negotiation savings ─────────────────────────────────────── */

/** The RFQ area's round results, narrowed to the RFQs this persona can see. */
export const negotiationSavingsFor = (personaId, q = {}) => {
  const f = fn(rfqArea, "negotiationSavings");
  if (!f) return { market_baseline: 0, negotiated_total: 0, total_savings: 0, rfqs: [] };
  const scope = scopeOf(personaId, q.hotel_ids);
  const byId = rfqArea.rfqBookById || {};
  const rows = (f().byRfq || []).filter((r) => touches(scope, byId[r.rfqId]?.propertyIds || []));
  const baseline = r2(rows.reduce((s, r) => s + r.baseline, 0));
  const saved = r2(rows.reduce((s, r) => s + r.saved, 0));
  return {
    market_baseline: baseline,
    negotiated_total: r2(baseline - saved),
    total_savings: saved,
    savings_percent: baseline ? Number(((saved / baseline) * 100).toFixed(1)) : 0,
    rounds: rows.reduce((s, r) => s + r.rounds, 0),
    rfqs: rows,
  };
};

/* ── workflow efficiency ─────────────────────────────────────── */

/** Average dwell per lifecycle stage, from the records' own dates. In-flight items count up to today. */
export const workflowEfficiencyFor = (personaId, q = {}, opts = {}) => {
  const rfqs = rfqsInScope(personaId, q);
  const rounds = (rfqArea.negotiationRounds || []).filter((x) => rfqs.some((r) => r.id === x.rfqId));
  const pos = posInScope(personaId, q, opts);
  const stage = (stage_name, spans) => {
    const ok = spans.filter((d) => d != null && d >= 0);
    return ok.length ? { stage_name, avg_dwell_time_hours: Math.round((ok.reduce((s, d) => s + d, 0) / ok.length) * 24), rfq_count: ok.length } : null;
  };
  const sinceOrToday = (a, b) => (a ? daysBetween(a, b || DEMO_TODAY) : null);
  return {
    stages: [
      stage("rfq_approval", rfqs.filter((r) => r.createdOn && (r.publishedOn || r.statusKey === "RFQ_APPROVAL")).map((r) => sinceOrToday(r.createdOn, r.publishedOn))),
      stage("quote_wait", rfqs.filter((r) => r.publishedOn && r.closesOn && daysFromToday(r.closesOn) <= 0).map((r) => daysBetween(r.publishedOn, r.closesOn))),
      stage("tech_approval", rfqs.filter((r) => r.approval?.type === "TECHNICAL").map((r) => sinceOrToday(r.approval.since))),
      stage("negotiation", rounds.filter((x) => x.createdOn).map((x) => sinceOrToday(x.createdOn, x.closedOn))),
      stage("commercial_approval", rfqs.filter((r) => r.approval?.type === "NEGOTIATION_QUOTE").map((r) => sinceOrToday(r.approval.since))),
      stage("po_approval", pos.filter((p) => p.raisedOn && (p.approvedOn || p.status === "pending_approval")).map((p) => sinceOrToday(p.raisedOn, p.approvedOn))),
      stage("vendor_action", pos.filter((p) => p.sentOn && (p.acceptedOn || p.status === "acceptance_pending")).map((p) => sinceOrToday(p.sentOn, p.acceptedOn))),
    ].filter(Boolean),
  };
};

/* ── smart insights ──────────────────────────────────────────── */

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const lakh = (n) => `₹${(n / 100000).toFixed(2)}L`;

/** Three to five true statements about this persona's book, each pointing at its record. */
export const smartInsightsFor = (personaId, q = {}, opts = {}) => {
  const out = [];
  const approvals = pendingApprovalsFor(personaId, opts);
  const oldest = approvals[0];
  if (oldest) {
    const days = Math.round((oldest.waiting_hours || 0) / 24);
    out.push({
      type: "price_alert",
      title: `${approvals.length} approval${approvals.length === 1 ? "" : "s"} waiting on you`,
      description: `Longest wait: <b>${oldest.entity_title || oldest.metadata?.mr_number || oldest.arc_title || oldest.entity_id}</b>, ${days} day${days === 1 ? "" : "s"}.`,
      action_label: "Review",
      action_url: approvalLink(oldest),
    });
  }
  const rejected = vendorRejectedPosFor(personaId, q);
  if (rejected.length) {
    const r = rejected[0];
    out.push({
      type: "price_alert",
      title: `${rejected.length} PO${rejected.length === 1 ? "" : "s"} turned down by the vendor`,
      description: `${r.vendor_company} rejected PO #${r.po_number} (${lakh(r.po_value)}) for ${r.hotel_name}. It needs reassigning.`,
      action_label: "Reassign",
      action_url: `/dashboard/buyer/purchase-orders/${r.po_number}`,
    });
  }
  const ending = rfqsEndingSoon(personaId, q)[0];
  if (ending) {
    out.push({
      type: "general",
      title: `RFQ #${ending.id} closes in ${daysFromToday(ending.closesOn)} days`,
      description: `${ending.title}: ${(ending.quoted || []).length} of ${(ending.invited || []).length} invited vendors have quoted.`,
      action_label: "Open RFQ",
      action_url: `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${ending.id}`,
    });
  }
  const sav = negotiationSavingsFor(personaId, q);
  const topSav = (sav.rfqs || []).slice().sort((a, b) => b.saved - a.saved)[0];
  if (topSav && topSav.saved > 0) {
    out.push({
      type: "vendor_optimization",
      title: `Negotiation saved ${lakh(sav.total_savings)} across ${sav.rfqs.length} RFQ${sav.rfqs.length === 1 ? "" : "s"}`,
      description: `Largest: RFQ #${topSav.rfqId} ${topSav.title}, ${inr(topSav.saved)} (${topSav.pct}%) over ${topSav.rounds} round${topSav.rounds === 1 ? "" : "s"}.`,
      action_label: "See rounds",
      action_url: `/dashboard/buyer/negotiation/${topSav.rfqId}`,
    });
  }
  const scope = scopeOf(personaId, q.hotel_ids);
  const expiring = (arcArea.portfolio || [])
    .filter((c) => touches(scope, c.propertyIds || []) && c.termEnd && daysFromToday(c.termEnd) >= 0 && daysFromToday(c.termEnd) <= 120)
    .filter((c) => (arcArea.LIVE_STATUSES || []).includes(c.status))
    .sort((a, b) => a.termEnd.localeCompare(b.termEnd))[0];
  if (expiring) {
    out.push({
      type: "spend_trend",
      title: `${expiring.id} ends in ${daysFromToday(expiring.termEnd)} days`,
      description: `${expiring.title} runs to ${expiring.termEnd}. Start the renewal before call-offs fall back to spot buying.`,
      action_label: "Open contract",
      action_url: `/dashboard/buyer/rate-contracts/${expiring.id}`,
    });
  }
  return { insights: out.slice(0, 5) };
};

/* ── links ───────────────────────────────────────────────────── */

/** Where an approval row lands — POs on their own detail page. */
export const approvalLink = (e) => {
  const t = e.entity_type;
  if (t === "PO") return `/dashboard/buyer/purchase-orders/${e.entity_id}`;
  if (t === "MR") return `/dashboard/buyer/material-requisitions/${e.entity_id}`;
  if (String(t).startsWith("ARC")) return `/dashboard/buyer/rate-contracts/${e.arc_id || e.entity_id}`;
  const rfqId = e.metadata?.rfq_id || e.entity_rfq_no || e.entity_id;
  return `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${rfqId}`;
};

/* ── notifications ───────────────────────────────────────────── */

/**
 * The inbox: every area's activity for this persona. Anything from before
 * yesterday counts as read, so the unread pill means "since yesterday".
 */
export const notificationsFor = (personaId, opts = {}) =>
  activityFor(personaId, opts).map((e, i) => ({
    id: i + 1,
    title: e.title,
    message: e.message,
    body: e.message,
    category: e.kind,
    type: e.kind,
    created_at: e.at,
    action_url: e.link,
    redirect_url: e.link,
    url: e.link,
    is_read: daysFromToday(String(e.at).slice(0, 10)) < -1 ? 1 : 0,
  }));

export default { pendingApprovalsFor, activityFor, approvalCountsFor, wiring };
