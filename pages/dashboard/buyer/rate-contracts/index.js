// Buyer · Rate Contracts dashboard.
// Faithful port of prototypes/arc_ui/buyer-dashboard.html. Sections,
// DOM hierarchy and class names mirror the prototype 1:1; all rollups
// (lifecycle distribution donut, spend by category / BU / vendor / product /
// sub-category, expiries, activity, KPI tiles) are derived from the
// enriched listContracts() payload returned by the backend.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";
import { Seg } from "@/components/dashboard/shared";

const RANGE_OPTIONS = [
  { label: "QTD",      value: "qtd"  },
  { label: "FY 26",    value: "fy26" },
  { label: "All-time", value: "all"  },
];

// ──────────────────────────────────────────────────────────────────────────
//  Helpers
// ──────────────────────────────────────────────────────────────────────────

const STATUS_BUCKETS = ["active","expiring","eval","committee","awaiting","floated","draft","expired"];

function statusBucket(s) {
  if (!s) return "draft";
  if (s === "draft") return "draft";
  if (s === "floated" || s === "submission_closed") return "floated";
  if (s === "tech_eval_in_progress" || s === "tech_eval_approved" || s === "tech_eval_rejected" || s === "comm_eval_in_progress") return "eval";
  if (s === "comm_eval_finalized" || s === "committee_review" || s === "committee_sent_back") return "committee";
  if (s === "committee_approved" || s === "contract_generated" || s === "awaiting_vendor_acceptance") return "awaiting";
  if (s === "contract_active") return "active";
  if (s === "expiring_soon") return "expiring";
  if (s === "expired" || s === "terminated" || s === "closed_no_award" || s === "committee_rejected") return "expired";
  return "draft";
}

const BUCKET_LABEL = {
  active:    "Active",
  expiring:  "Expiring · 60d",
  eval:      "In evaluation",
  committee: "Committee review",
  awaiting:  "Awaiting sign",
  floated:   "Floated",
  draft:     "Draft",
  expired:   "Expired",
};

const BUCKET_COLOR = {
  active:    "#15803d",
  expiring:  "#b45309",
  eval:      "#2563eb",
  committee: "#6d28d9",
  awaiting:  "#4338ca",
  floated:   "#0f766e",
  draft:     "#a1a1aa",
  expired:   "#a1a1aa",
};

const CATEGORY_PALETTE = ["#15803d","#2563eb","#b45309","#4338ca","#6d28d9","#0f766e","#be123c","#0369a1"];

function fmtL(n) {
  const v = Number(n || 0);
  if (!isFinite(v)) return "₹0";
  if (Math.abs(v) >= 1e7) return "₹" + (v / 1e7).toFixed(2) + "Cr";
  if (Math.abs(v) >= 1e5) return "₹" + (v / 1e5).toFixed(2) + "L";
  if (Math.abs(v) >= 1e3) return "₹" + (v / 1e3).toFixed(1) + "k";
  return "₹" + v.toFixed(0);
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (_) { return []; }
  }
  return [];
}

function maxOf(rows) {
  return Math.max(1, ...rows.map((r) => Number(r.value || 0)));
}

function daysUntil(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.ceil((dt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function shortDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function timeAgo(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  const diff = Date.now() - dt.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.round(hrs / 24);
  if (days < 30) return days + "d ago";
  return Math.round(days / 30) + "mo ago";
}

function buCodeFor(name) {
  if (!name) return "—";
  const parts = String(name).replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0] + (parts[2]?.[0] || "")).toUpperCase();
}

function initialsFor(name) {
  if (!name) return "??";
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

function categoryColorFor(name) {
  if (!name) return "#71717a";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return CATEGORY_PALETTE[Math.abs(h) % CATEGORY_PALETTE.length];
}

function detailHref(row, bucket) {
  if (bucket === "draft")     return `/dashboard/buyer/rate-contracts/create?c=${row.id}`;
  if (bucket === "floated")   return `/dashboard/buyer/rate-contracts/${row.id}`;
  if (bucket === "eval") {
    if (row.status && row.status.startsWith("comm_eval"))
      return `/dashboard/buyer/rate-contracts/${row.id}?stage=commercial`;
    return `/dashboard/buyer/rate-contracts/${row.id}?stage=technical`;
  }
  if (bucket === "committee") return `/dashboard/buyer/rate-contracts/${row.id}?stage=awarding`;
  return `/dashboard/buyer/rate-contracts/${row.id}?stage=active`;
}

// ──────────────────────────────────────────────────────────────────────────
//  Page component
// ──────────────────────────────────────────────────────────────────────────

export default function BuyerRateContractsDashboard() {
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState(null);
  const [range, setRange] = useState("fy26");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      ArcApi.listContracts({ statusGroup: "all", page: 1, limit: 200 }),
      ArcApi.getDashboardKpis(),
    ]).then(([listRes, kpiRes]) => {
      if (cancelled) return;
      const payload = listRes?.data || listRes;
      const list = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
      setRows(list);
      setCounts(kpiRes?.data?.counts || kpiRes?.counts || null);
    }).catch(() => {
      if (!cancelled) { setRows([]); setCounts(null); }
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // ── derived state (memoised) ──────────────────────────────────────────
  const c = useMemo(() => {
    const counts = Object.fromEntries(STATUS_BUCKETS.map((b) => [b, 0]));
    let totalCommittedValue = 0;
    let totalConsumedValue = 0;
    let totalCallOffs = 0;
    rows.forEach((r) => {
      const b = statusBucket(r.status);
      counts[b] = (counts[b] || 0) + 1;
      totalCommittedValue += Number(r.committed_value || 0);
      totalConsumedValue += Number(r.consumed_value || 0);
      totalCallOffs += Number(r.call_off_count || 0);
    });
    return {
      ...counts,
      all: rows.length,
      totalCommittedValue, totalConsumedValue, totalCallOffs,
      totalSavingsVsTarget: 0, // not available in API yet
    };
  }, [rows]);

  const donutSegments = useMemo(() => {
    const order = ["active","expiring","eval","committee","awaiting","floated","expired"];
    const segs = order.map((k) => ({
      key: k, label: BUCKET_LABEL[k], value: c[k] || 0, color: BUCKET_COLOR[k],
    })).filter((s) => s.value > 0);
    const total = segs.reduce((s, x) => s + x.value, 0);
    return { segs, total };
  }, [c]);

  const donutGradient = useMemo(() => {
    const { segs, total } = donutSegments;
    if (!total) return "var(--surface-3)";
    let acc = 0;
    const stops = segs.map((s) => {
      const start = (acc / total) * 360;
      acc += s.value;
      const end = (acc / total) * 360;
      return `${s.color} ${start.toFixed(3)}deg ${end.toFixed(3)}deg`;
    });
    return `conic-gradient(from -90deg, ${stops.join(", ")})`;
  }, [donutSegments]);

  // Spend by category — restricted to active + expiring (the prototype's filter).
  const spendCat = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const b = statusBucket(r.status);
      if (b !== "active" && b !== "expiring") return;
      const cat = r.category_title || "Uncategorised";
      const v = Number(r.committed_value || 0);
      const cur = map.get(cat) || { category: cat, value: 0 };
      cur.value += v;
      map.set(cat, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [rows]);

  const spendCatTotal = useMemo(() => spendCat.reduce((s, x) => s + x.value, 0), [spendCat]);

  const topBus = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const id = r.hotel_id;
      if (id == null) return;
      const name = r.hotel_name || `Hotel #${id}`;
      const v = Number(r.committed_value || 0);
      const cur = map.get(id) || { buId: id, name, code: buCodeFor(name), value: 0 };
      cur.value += v;
      map.set(id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [rows]);

  const topVendors = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const ids = asArray(r.awarded_vendor_ids);
      const names = asArray(r.awarded_vendor_names);
      if (!ids.length) return;
      const share = Number(r.committed_value || 0) / ids.length;
      ids.forEach((vid, idx) => {
        if (vid == null) return;
        const name = names[idx] || `Vendor #${vid}`;
        const cur = map.get(vid) || { vendorId: vid, name, initials: initialsFor(name), value: 0 };
        cur.value += share;
        map.set(vid, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [rows]);

  const topProducts = useMemo(() => {
    const map = new Map();
    rows.forEach((r) => {
      const ids = asArray(r.product_variant_ids);
      const names = asArray(r.item_names);
      if (!ids.length) return;
      const share = Number(r.committed_value || 0) / ids.length;
      ids.forEach((pid, idx) => {
        if (pid == null) return;
        const name = names[idx] || `Variant #${pid}`;
        const cur = map.get(pid) || { itemId: pid, name, value: 0, count: 0 };
        cur.value += share;
        cur.count += 1;
        map.set(pid, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [rows]);

  const expiries = useMemo(() => {
    return rows
      .map((r) => ({ contract: r, days: daysUntil(r.contract_end_at) }))
      .filter((x) => {
        if (x.days == null) return false;
        const b = statusBucket(x.contract.status);
        return (b === "active" || b === "expiring") && x.days >= 0 && x.days <= 60;
      })
      .sort((a, b) => a.days - b.days)
      .slice(0, 6);
  }, [rows]);

  const activity = useMemo(() => {
    // Synthetic feed from row.updated_at + bucket — surfaced until we have
    // an event-log endpoint.
    return rows
      .slice()
      .filter((r) => r.updated_at)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 7)
      .map((r) => {
        const b = statusBucket(r.status);
        let icon = "check", tone = "", text = "moved into " + BUCKET_LABEL[b];
        if (b === "draft")     { icon = "pen";   tone = "violet"; text = "started a new draft"; }
        if (b === "floated")   { icon = "send";  tone = "info";   text = "floated to vendors"; }
        if (b === "eval")      { icon = "pen";   tone = "violet"; text = "advanced to evaluation"; }
        if (b === "committee") { icon = "gavel"; tone = "violet"; text = "sent to committee review"; }
        if (b === "awaiting")  { icon = "send";  tone = "info";   text = "awaiting vendor sign"; }
        if (b === "active")    { icon = "check"; tone = "success"; text = "went live"; }
        if (b === "expiring")  { icon = "alert"; tone = "warn";   text = "expiring within 60 days"; }
        if (b === "expired")   { icon = "alert"; tone = "";       text = "expired"; }
        return {
          icon, tone, text,
          who: r.created_by_name || "System",
          meta: r.arc_number ? "#" + r.arc_number + " · " + (r.title || "") : (r.title || ""),
          contract: r.id,
          at: timeAgo(r.updated_at),
        };
      });
  }, [rows]);

  const nextAction = useMemo(() => {
    // First row in committee_review / awaiting_vendor_acceptance / eval — the user's likely next click.
    const prio = ["committee_review", "comm_eval_finalized", "tech_eval_approved", "tech_eval_in_progress", "comm_eval_in_progress", "awaiting_vendor_acceptance"];
    for (const status of prio) {
      const hit = rows.find((r) => r.status === status);
      if (hit) {
        const b = statusBucket(hit.status);
        return {
          title: hit.title,
          number: hit.arc_number || hit.id,
          status: b,
          myAction: b === "committee" ? "approve" : (b === "eval" ? (hit.status?.startsWith("comm_eval") ? "evaluate-commercial" : "evaluate-technical") : "review"),
          row: hit,
        };
      }
    }
    return null;
  }, [rows]);

  if (loading) return <DashboardSkeleton />;
  return (
    <main className="main-body">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Rate Contracts · Dashboard</h1>
          <p className="page-sub">Live numbers across your Annual Rate Contracts — spend, vendors, BUs, and what's coming next.</p>
        </div>
        <div className="flex items-center gap-2">
          <Seg options={RANGE_OPTIONS} value={range} onChange={setRange} />
          <Link href="/dashboard/buyer/rate-contracts/all" className="btn btn-secondary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            All contracts
          </Link>
          <Link href="/dashboard/buyer/rate-contracts/manual-entry" className="btn btn-secondary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
            </svg>
            Manual entry
          </Link>
        </div>
      </div>

      {/* ── Action banner ──────────────────────────────────────── */}
      {nextAction && (
        <section className="action-center">
          <div className="ac-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            </svg>
          </div>
          <div className="ac-body">
            <div className="ac-title">Your turn — <span>{nextAction.title}</span></div>
            <div className="ac-sub">
              <strong>{BUCKET_LABEL[nextAction.status]}</strong> ·{" "}
              <span>{nextAction.myAction === "approve" ? "committee vote pending" : nextAction.myAction === "evaluate-commercial" ? "commercial evaluation" : nextAction.myAction === "evaluate-technical" ? "technical evaluation" : "review pending"}</span>
              {" · "}<span className="mono">#{nextAction.number}</span>
            </div>
          </div>
          <div className="ac-actions">
            <Link className="btn btn-warn" href={detailHref(nextAction.row, nextAction.status)}>Open now →</Link>
          </div>
        </section>
      )}

      {/* ── KPI tiles ─────────────────────────────────────────── */}
      <section className="kpi-grid">
        <div className="kpi-tile accent">
          <div className="kt-row">
            <div className="kt-label">Total ARCs</div>
            <div className="kt-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
          </div>
          <div className="kt-val mono">{c.all}</div>
          <div className="kt-sub">
            <span className="em">{c.active + c.expiring}</span> active ·{" "}
            <span className="em">{c.floated + c.eval + c.committee + c.awaiting}</span> in pipeline
          </div>
        </div>
        <div className="kpi-tile success">
          <div className="kt-row">
            <div className="kt-label">Active contracts</div>
            <div className="kt-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </div>
          <div className="kt-val mono">{c.active}</div>
          <div className="kt-sub">
            <span className="em mono">{c.totalCallOffs}</span> Released POs ·{" "}
            <span className="em mono">{c.expiring} expiring</span>
          </div>
        </div>
        <div className="kpi-tile violet">
          <div className="kt-row">
            <div className="kt-label">Committed value</div>
            <div className="kt-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/></svg>
            </div>
          </div>
          <div className="kt-val mono">
            <span className="cur">₹</span>
            <span>{((c.totalCommittedValue || 0) / 1e7).toFixed(2)}</span>
            <span className="cur"> Cr</span>
          </div>
          <div className="kt-sub">
            <span>across {c.active + c.expiring + c.awaiting} contracts</span>
          </div>
        </div>
        <div className="kpi-tile warn">
          <div className="kt-row">
            <div className="kt-label">Consumed YTD</div>
            <div className="kt-ic">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
          </div>
          <div className="kt-val mono">
            <span className="cur">₹</span>
            <span>{((c.totalConsumedValue || 0) / 1e7).toFixed(2)}</span>
            <span className="cur"> Cr</span>
          </div>
          <div className="kt-sub">
            <span className="em mono">{c.totalCommittedValue ? Math.round((c.totalConsumedValue / c.totalCommittedValue) * 100) : 0}%</span>{" "}of committed drawn
          </div>
        </div>
      </section>

      {/* ── Lifecycle distribution ───────────────────────────── */}
      <section className="dash-panel">
        <div className="dash-panel-head">
          <h3>
            <span className="ic">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
            </span>
            Lifecycle distribution
          </h3>
          <div className="h-sub"><span className="mono">{donutSegments.total}</span> contracts in flight</div>
        </div>
        <div className="dash-panel-body">
          <div className="donut-wrap">
            <div className="donut">
              <div className="donut-ring" style={{ background: donutGradient }} />
              <div className="donut-hole" />
              <div className="donut-center">
                <div className="dc-val">{donutSegments.total}</div>
                <div className="dc-lbl">Contracts</div>
              </div>
            </div>
            <div className="donut-legend">
              {donutSegments.segs.map((seg) => (
                <div key={seg.key} className="donut-row">
                  <span className="dt" style={{ background: seg.color }} />
                  <span className="nm">{seg.label}</span>
                  <span className="ct-bar">
                    <span className="ct-fill" style={{ width: (seg.value / donutSegments.total * 100) + "%", background: seg.color }} />
                  </span>
                  <span className="ct">{seg.value}</span>
                </div>
              ))}
              {donutSegments.segs.length === 0 && (
                <div className="donut-row"><span className="nm" style={{ color: "var(--fg-3)" }}>No contracts in flight yet.</span></div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Spend by category ─────────────────────────────── */}
      <section className="dash-panel">
        <div className="dash-panel-head">
          <h3>
            <span className="ic">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </span>
            Spend by category
          </h3>
          <div className="h-sub">Active + expiring · committed value</div>
        </div>
        <div className="dash-panel-body">
          <div className="rank-list">
            {spendCat.filter((r) => r.value > 0).map((row, idx) => (
              <div key={row.category} className={`rank-row ${idx === 0 ? "r1" : idx === 1 ? "r2" : idx === 2 ? "r3" : ""}`}>
                <div className="rk">{String(idx + 1).padStart(2, "0")}</div>
                <div className="rl">
                  <div className="rl-name">{row.category}</div>
                  <div className="rl-bar">
                    <div className="fill" style={{ width: (row.value / maxOf(spendCat) * 100) + "%", background: categoryColorFor(row.category) }} />
                  </div>
                </div>
                <div className="rv">
                  <span>{fmtL(row.value)}</span>
                  <span className="sub">{spendCatTotal ? Math.round(row.value / spendCatTotal * 100) : 0}% of total</span>
                </div>
              </div>
            ))}
            {spendCat.filter((r) => r.value > 0).length === 0 && (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="ic">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                </div>
                <h2>No category spend yet</h2>
                <p>Once active contracts have committed value, the spend rollup will appear here.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 3-column: Top BUs · Top Vendors · Top Products ── */}
      <section className="dash-grid cols-3">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <span className="ic">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>
              </span>
              Top business units
            </h3>
            <div className="h-sub">by committed value</div>
          </div>
          <div className="dash-panel-body">
            <div className="rank-list">
              {topBus.filter((r) => r.value > 0).map((row, idx) => (
                <div key={row.buId} className={`rank-row ${idx === 0 ? "r1" : idx === 1 ? "r2" : idx === 2 ? "r3" : ""}`}>
                  <div className="rk">{row.code}</div>
                  <div className="rl">
                    <div className="rl-name">{row.name}</div>
                    <div className="rl-bar"><div className="fill" style={{ width: (row.value / maxOf(topBus) * 100) + "%" }} /></div>
                  </div>
                  <div className="rv">{fmtL(row.value)}</div>
                </div>
              ))}
              {topBus.filter((r) => r.value > 0).length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg></div>
                  <h2>No BU spend yet</h2>
                  <p>Top business units by committed value will appear once contracts go live.</p>
                </div>
              )}
            </div>
          </div>
          <div className="dash-panel-foot">
            <span>Drill by BU</span>
            <Link href="/dashboard/buyer/rate-contracts/all">View contracts →</Link>
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <span className="ic">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
              </span>
              Top vendors
            </h3>
            <div className="h-sub">by awarded value</div>
          </div>
          <div className="dash-panel-body">
            <div className="rank-list">
              {topVendors.filter((r) => r.value > 0).map((row, idx) => (
                <div key={row.vendorId} className={`rank-row ${idx === 0 ? "r1" : idx === 1 ? "r2" : idx === 2 ? "r3" : ""}`}>
                  <div className="rk"><span>{row.initials}</span></div>
                  <div className="rl">
                    <div className="rl-name">{row.name}</div>
                    <div className="rl-bar"><div className="fill" style={{ width: (row.value / maxOf(topVendors) * 100) + "%" }} /></div>
                  </div>
                  <div className="rv">{fmtL(row.value)}</div>
                </div>
              ))}
              {topVendors.filter((r) => r.value > 0).length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
                  <h2>No vendor awards yet</h2>
                  <p>Vendor rankings appear once contracts are awarded.</p>
                </div>
              )}
            </div>
          </div>
          <div className="dash-panel-foot">
            <span>Drill by vendor</span>
            <Link href="/dashboard/buyer/rate-contracts/all">View contracts →</Link>
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <span className="ic">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4v10l8 4 8-4z"/><polyline points="4 7 12 11 20 7"/><line x1="12" y1="11" x2="12" y2="21"/></svg>
              </span>
              Top products
            </h3>
            <div className="h-sub">by committed spend</div>
          </div>
          <div className="dash-panel-body">
            <div className="rank-list">
              {topProducts.filter((r) => r.value > 0).map((row, idx) => (
                <div key={row.itemId} className={`rank-row ${idx === 0 ? "r1" : idx === 1 ? "r2" : idx === 2 ? "r3" : ""}`}>
                  <div className="rk">{String(idx + 1).padStart(2, "0")}</div>
                  <div className="rl">
                    <div className="rl-name">{row.name}</div>
                    <div className="rl-sub"><span className="mono">{row.count}× across contracts</span></div>
                    <div className="rl-bar"><div className="fill" style={{ width: (row.value / maxOf(topProducts) * 100) + "%" }} /></div>
                  </div>
                  <div className="rv">{fmtL(row.value)}</div>
                </div>
              ))}
              {topProducts.filter((r) => r.value > 0).length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4v10l8 4 8-4z"/></svg></div>
                  <h2>No product spend yet</h2>
                  <p>Top products show up once contracts have committed line value.</p>
                </div>
              )}
            </div>
          </div>
          <div className="dash-panel-foot">
            <span>Drill by product</span>
            <Link href="/dashboard/buyer/rate-contracts/all">View contracts →</Link>
          </div>
        </div>
      </section>

      {/* ── 2-column: Upcoming expiries · Recent activity ── */}
      <section className="dash-grid">
        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <span className="ic">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              Expiring in next 60 days
            </h3>
            <div className="h-sub"><span className="mono">{expiries.length}</span> contracts</div>
          </div>
          <div className="dash-panel-body">
            {expiries.length === 0 && (
              <div className="empty-state" style={{ padding: 24 }}>
                <div className="ic">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h2>Nothing expiring soon</h2>
                <p>All active contracts have over 60 days remaining.</p>
              </div>
            )}
            {expiries.map((x) => {
              const b = statusBucket(x.contract.status);
              return (
                <div key={x.contract.id} className="expiry-row">
                  <div>
                    <div className="er-title">{x.contract.title}</div>
                    <div className="er-meta">
                      <span className="mono">#{x.contract.arc_number || x.contract.id}</span> ·{" "}
                      <span>{buCodeFor(x.contract.hotel_name)}</span> ·{" "}
                      <span>{x.contract.category_title || "—"}</span> · ends{" "}
                      <span className="mono">{shortDate(x.contract.contract_end_at) || "—"}</span>
                    </div>
                  </div>
                  <div className={`er-days ${x.days <= 30 ? "danger" : ""}`}>
                    <span>{x.days}</span>d
                    <span className="lbl">remaining</span>
                  </div>
                  <div className="er-action">
                    <Link href={detailHref(x.contract, b)}>Renew →</Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dash-panel">
          <div className="dash-panel-head">
            <h3>
              <span className="ic">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </span>
              Recent activity
            </h3>
            <div className="h-sub">Across all contracts</div>
          </div>
          <div className="dash-panel-body">
            <div className="activity-feed">
              {activity.length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="ic">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                  </div>
                  <h2>No recent activity</h2>
                  <p>Updates across your contracts will appear here.</p>
                </div>
              )}
              {activity.map((a, idx) => (
                <div key={idx} className="activity-item">
                  <div className={`ai-ic ${a.tone}`}>
                    <ActivityIcon name={a.icon} />
                  </div>
                  <div className="ai-body">
                    <div className="ai-text"><span className="em">{a.who}</span> <span>{a.text}</span></div>
                    <div className="ai-meta">
                      {a.contract ? (
                        <Link href={`/dashboard/buyer/rate-contracts/${a.contract}`}>{a.meta}</Link>
                      ) : (
                        <span>{a.meta}</span>
                      )}
                    </div>
                  </div>
                  <div className="ai-time">{a.at}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Activity-feed inline SVG sprite, keyed by icon name.
// ──────────────────────────────────────────────────────────────────────────
function ActivityIcon({ name }) {
  const p = { width: 13, height: 13, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "truck": return (<svg {...p}><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>);
    case "check": return (<svg {...p}><polyline points="20 6 9 17 4 12"/></svg>);
    case "plus":  return (<svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>);
    case "gavel": return (<svg {...p}><path d="M14 9l-4 4"/><path d="M5 14l5-5"/><path d="M15 4l5 5"/><path d="M11 19l8-8"/></svg>);
    case "alert": return (<svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>);
    case "send":  return (<svg {...p}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>);
    case "pen":   return (<svg {...p}><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>);
    default:      return (<svg {...p}><polyline points="20 6 9 17 4 12"/></svg>);
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  Skeleton — shape-aware load state mirroring the dashboard layout.
// ──────────────────────────────────────────────────────────────────────────
const SkBar = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

function DashboardSkeleton() {
  return (
    <main className="main-body">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <SkBar w={260} h={26} style={{ marginBottom: 10 }} />
          <SkBar w={420} h={13} />
        </div>
        <div className="flex items-center gap-2">
          <SkBar w={180} h={32} r={8} />
          <SkBar w={120} h={30} r={6} />
          <SkBar w={120} h={30} r={6} />
        </div>
      </div>

      {/* KPI strip */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="arc-sk-kpi">
            <SkBar w={38} h={38} r={10} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <SkBar w="55%" h={18} style={{ marginBottom: 6 }} />
              <SkBar w="40%" h={10} />
            </div>
          </div>
        ))}
      </section>

      {/* Two-column body: donut + spend list */}
      <section style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div className="arc-sk-tile">
          <SkBar w={160} h={14} style={{ marginBottom: 14 }} />
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 220 }}>
            <SkBar w={180} h={180} r={999} />
          </div>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <SkBar w={12} h={12} r={3} />
                <SkBar w={90} h={11} />
              </div>
            ))}
          </div>
        </div>
        <div className="arc-sk-tile">
          <SkBar w={140} h={14} style={{ marginBottom: 14 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < 4 ? "1px dashed var(--border)" : "none" }}>
              <SkBar w={22} h={22} r={6} />
              <SkBar w="50%" h={14} style={{ flex: 1 }} />
              <SkBar w={70} h={14} />
            </div>
          ))}
        </div>
      </section>

      {/* Three-column rankings strip */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
        {Array.from({ length: 3 }).map((_, c) => (
          <div key={c} className="arc-sk-tile">
            <SkBar w={120} h={14} style={{ marginBottom: 14 }} />
            {Array.from({ length: 4 }).map((__, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < 3 ? "1px dashed var(--border)" : "none" }}>
                <SkBar w={20} h={11} r={3} />
                <SkBar w="55%" h={13} style={{ flex: 1 }} />
                <SkBar w={56} h={13} />
              </div>
            ))}
          </div>
        ))}
      </section>

      {/* Activity feed */}
      <section className="arc-sk-tile">
        <SkBar w={160} h={14} style={{ marginBottom: 14 }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ display: "flex", gap: 11, padding: "12px 0", borderBottom: i < 3 ? "1px dashed var(--border)" : "none" }}>
            <SkBar w={24} h={24} r={7} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <SkBar w="65%" h={13} style={{ marginBottom: 6 }} />
              <SkBar w={120} h={10} />
            </div>
            <SkBar w={60} h={10} />
          </div>
        ))}
      </section>
    </main>
  );
}
