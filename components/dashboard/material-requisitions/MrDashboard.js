// MR Dashboard — single source of truth for material-requisition analytics.
// KPI tiles, status mix, value-by-department, 6-month trend, urgency split,
// approval cycle time, overdue alert, top requesters and a recent feed.
// Data: GET /v1/mr/analytics (+ /v1/mr/kpis fallback).

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as MrApi from "@/services/mr";
import { MrDashboardSkeleton } from "./MrSkeletons";

// ── Date-range presets → { created_from, created_to } (inclusive YYYY-MM-DD).
// Indian fiscal year starts April 1. The server treats created_to as inclusive
// (it converts to an exclusive next-day boundary). "all" omits both bounds.
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// FY start year for a date: Jan–Mar (months 0–2) belong to the previous FY.
const fyStartYear = (d) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);

const DATE_PRESETS = [
  { key: "fytd", label: "Financial YTD" },
  { key: "last_year", label: "Last financial year" },
  { key: "this_month", label: "This month" },
  { key: "this_quarter", label: "This quarter" },
  { key: "all", label: "All time" },
  { key: "custom", label: "Custom range…" },
];

function presetToRange(preset, customFrom, customTo, now = new Date()) {
  switch (preset) {
    case "fytd": {
      const y = fyStartYear(now);
      return { created_from: `${y}-04-01`, created_to: iso(now) };
    }
    case "last_year": {
      const y = fyStartYear(now);
      return { created_from: `${y - 1}-04-01`, created_to: `${y}-03-31` };
    }
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { created_from: iso(from), created_to: iso(now) };
    }
    case "this_quarter": {
      const qStartMonth = Math.floor(now.getMonth() / 3) * 3; // Jan/Apr/Jul/Oct
      const from = new Date(now.getFullYear(), qStartMonth, 1);
      return { created_from: iso(from), created_to: iso(now) };
    }
    case "custom":
      return { created_from: customFrom || null, created_to: customTo || null };
    case "all":
    default:
      return { created_from: null, created_to: null };
  }
}

const fmtL = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return "₹" + (v / 10000000).toFixed(2) + " Cr";
  if (v >= 100000) return "₹" + (v / 100000).toFixed(2) + " L";
  if (v >= 1000) return "₹" + (v / 1000).toFixed(1) + "k";
  return "₹" + v.toLocaleString("en-IN");
};
const fmtDate = (s) => { try { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }); } catch { return "—"; } };
const monthLabel = (ym) => { try { const [y, m] = ym.split("-"); return new Date(y, m - 1, 1).toLocaleDateString("en-IN", { month: "short" }); } catch { return ym; } };

// status → display
const ST = {
  draft:            { label: "Draft",     tone: "neutral", color: "var(--fg-3)" },
  pending_approval: { label: "Pending",   tone: "warn",    color: "var(--warn)" },
  approved:         { label: "Approved",  tone: "violet",  color: "var(--violet)" },
  po_released:      { label: "PO released",tone: "success",color: "var(--success)" },
  rejected:        { label: "Rejected",   tone: "danger",  color: "var(--danger)" },
  cancelled:       { label: "Cancelled",  tone: "danger",  color: "var(--danger)" },
};
const STATUS_ORDER = ["draft", "pending_approval", "approved", "po_released", "rejected", "cancelled"];

const Svg = ({ d, w = 18, sw = 2 }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: d }} />
);
const I = {
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  truck: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
  rupee: '<path d="M6 3h12"/><path d="M6 8h12"/><path d="m6 13 8.5 8"/><path d="M6 13h3"/><path d="M9 13c6.667 0 6.667-10 0-10"/>',
  alert: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
};

// Compact multi-select checklist dropdown for the header BU/Department filters.
// Options are server-scoped (filter-options endpoint) — the user can only ever
// pick BUs/departments they can already read.
function MultiFilter({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  const toggle = (val) => {
    const v = String(val);
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  const count = selected.length;
  const summary = count === 0 ? `All ${label.toLowerCase()}` : `${count} selected`;
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        className="select-mini"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", whiteSpace: "nowrap" }}
      >
        <span style={{ color: count ? "var(--fg)" : "var(--fg-3)" }}>{label}: {summary}</span>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 4px)", left: 0, minWidth: 220, maxHeight: 280, overflowY: "auto", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "var(--shadow-md)", padding: 6 }}>
          {options.length === 0 && <div style={{ fontSize: 12.5, color: "var(--fg-4, #a1a1aa)", padding: "8px 8px" }}>No options in scope.</div>}
          {count > 0 && (
            <button type="button" onClick={() => onChange([])} style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 8px", background: "none", border: "none", color: "var(--primary, #2563eb)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Clear</button>
          )}
          {options.map((o) => {
            const v = String(o.value);
            const on = selected.includes(v);
            // .filter-opt hides the native checkbox and renders .fo-box as the
            // visible control (arc_v2.css). Selected rows also get a tinted
            // background + accent/bold text so the selection reads at a glance.
            return (
              <label key={v} className="filter-opt mr-filter-opt" title={o.label} data-on={on ? "1" : undefined} style={{ padding: "6px 8px", borderRadius: 6, background: on ? "rgba(37,99,235,0.08)" : "transparent" }}>
                <input type="checkbox" checked={on} onChange={() => toggle(v)} />
                <span className="fo-box" />
                <span className="fo-text" style={{ fontSize: 13, color: on ? "var(--primary, #2563eb)" : "var(--fg)", fontWeight: on ? 600 : 400 }}>{o.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MrDashboard() {
  const [a, setA] = useState(null);
  const [loading, setLoading] = useState(true);

  // Header filters (in-component state, reset on visit). Default date = FYTD.
  const [buIds, setBuIds] = useState([]);
  const [deptIds, setDeptIds] = useState([]);
  const [datePreset, setDatePreset] = useState("fytd");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [opts, setOpts] = useState({ hotels: [], departments: [] });
  const seq = useRef(0);

  // Scoped BU + Department option lists (single source of truth = readScopeFor).
  useEffect(() => {
    let cancelled = false;
    MrApi.getDashboardFilterOptions()
      .then((res) => {
        if (cancelled) return;
        const d = res?.data || res || {};
        setOpts({ hotels: Array.isArray(d.hotels) ? d.hotels : [], departments: Array.isArray(d.departments) ? d.departments : [] });
      })
      .catch(() => { if (!cancelled) setOpts({ hotels: [], departments: [] }); });
    return () => { cancelled = true; };
  }, []);

  // Re-fetch analytics whenever the filters change. seq guard ignores stale
  // responses when several filter changes race.
  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    const { created_from, created_to } = presetToRange(datePreset, customFrom, customTo);
    const params = {};
    if (buIds.length) params.hotel_ids = buIds.join(",");
    if (deptIds.length) params.department_ids = deptIds.join(",");
    if (created_from) params.created_from = created_from;
    if (created_to) params.created_to = created_to;
    MrApi.getAnalytics(params)
      .then((res) => { if (id === seq.current) setA(res?.data || res || null); })
      .catch(() => { if (id === seq.current) setA(null); })
      .finally(() => { if (id === seq.current) setLoading(false); });
  }, [buIds, deptIds, datePreset, customFrom, customTo]);

  const buOptions = useMemo(
    () => (opts.hotels || []).map((h) => ({ value: h.id, label: h.name || `Hotel ${h.id}` })),
    [opts.hotels]
  );
  const deptOptions = useMemo(
    () => (opts.departments || []).map((d) => ({ value: d.id, label: d.title || `Dept ${d.id}` })),
    [opts.departments]
  );

  const t = a?.totals || {};
  const byStatus = useMemo(() => {
    const map = {};
    (a?.by_status || []).forEach((r) => { map[r.status] = { count: r.count, value: Number(r.value) }; });
    return STATUS_ORDER.filter((s) => map[s]).map((s) => ({ status: s, ...map[s], ...ST[s] }));
  }, [a]);
  const statusTotalCount = byStatus.reduce((s, r) => s + r.count, 0) || 1;
  const donutStops = useMemo(() => {
    let acc = 0; const stops = [];
    byStatus.forEach((r) => { const from = (acc / statusTotalCount) * 100; acc += r.count; const to = (acc / statusTotalCount) * 100; stops.push(`${r.color} ${from}% ${to}%`); });
    return stops.length ? `conic-gradient(${stops.join(",")})` : "conic-gradient(var(--surface-3) 0 100%)";
  }, [byStatus, statusTotalCount]);

  const deptMax = Math.max(1, ...(a?.by_department || []).map((d) => d.count));
  const monthMax = Math.max(1, ...(a?.by_month || []).map((m) => m.count));
  const urgency = useMemo(() => {
    const map = {}; (a?.by_urgency || []).forEach((r) => { map[r.urgency] = r.count; });
    return ["urgent", "normal", "low"].map((k) => ({ key: k, count: map[k] || 0 }));
  }, [a]);
  const urgencyTotal = urgency.reduce((s, r) => s + r.count, 0) || 1;

  // Full-page skeleton only on the very first load. Once data has arrived once,
  // keep the header + filter bar mounted and just dim the body during re-fetch
  // (so changing a filter doesn't blank the whole page including the filters).
  if (loading && a === null) return <MrDashboardSkeleton />;

  return (
    <div className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Material Requisitions · Dashboard</h1>
          <p className="page-sub">Single source of truth — demand volume, approval throughput, spend and bottlenecks across all MRs.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/buyer/material-requisitions/all" className="btn btn-lg">View all MRs</Link>
          <Link href="/dashboard/buyer/material-requisitions/create" className="btn btn-blue btn-lg">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Raise new MR
          </Link>
        </div>
      </div>

      {/* HEADER FILTER BAR — Business Unit + Department (scoped multi-select) +
          Date range preset. Filters can only NARROW within the user's scope. */}
      <div className="mr-filter-bar flex items-center gap-2 flex-wrap" style={{ marginTop: 4 }}>
        <MultiFilter label="Business unit" options={buOptions} selected={buIds} onChange={setBuIds} />
        <MultiFilter label="Department" options={deptOptions} selected={deptIds} onChange={setDeptIds} />
        <select className="select-mini" value={datePreset} onChange={(e) => setDatePreset(e.target.value)} aria-label="Date range">
          {DATE_PRESETS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </select>
        {datePreset === "custom" && (
          <>
            <input type="date" className="select-mini" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} aria-label="From date" />
            <span style={{ color: "var(--fg-4, #a1a1aa)", fontSize: 13 }}>→</span>
            <input type="date" className="select-mini" value={customTo} onChange={(e) => setCustomTo(e.target.value)} aria-label="To date" />
          </>
        )}
        {(buIds.length > 0 || deptIds.length > 0 || datePreset !== "fytd") && (
          <button type="button" className="select-mini" style={{ cursor: "pointer", color: "var(--primary, #2563eb)" }}
            onClick={() => { setBuIds([]); setDeptIds([]); setDatePreset("fytd"); setCustomFrom(""); setCustomTo(""); }}>
            Reset
          </button>
        )}
        {loading && <span style={{ fontSize: 12, color: "var(--fg-4, #a1a1aa)" }}>Updating…</span>}
      </div>

      {/* PRIMARY KPIs */}
      <section className="kpi-grid">
        <div className="kpi-tile accent">
          <div className="kt-row"><div className="kt-label">Total MRs</div><div className="kt-ic"><Svg d={I.list} /></div></div>
          <div className="kt-val mono">{t.all || 0}</div>
          <div className="kt-sub">all requisitions in scope</div>
        </div>
        <Link href="/dashboard/buyer/material-requisitions/all?tab=for_me" className="kpi-tile warn" title="View MRs pending your approval" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="kt-row"><div className="kt-label">Pending approval</div><div className="kt-ic"><Svg d={I.clock} /></div></div>
          <div className="kt-val mono">{t.pending_approval || 0}</div>
          <div className="kt-sub">{fmtL(t.pending_value)} awaiting a decision</div>
        </Link>
        <div className="kpi-tile success">
          <div className="kt-row"><div className="kt-label">PO released</div><div className="kt-ic"><Svg d={I.truck} /></div></div>
          <div className="kt-val mono">{t.po_released || 0}</div>
          <div className="kt-sub">{fmtL(t.po_released_value)} converted to Released POs</div>
        </div>
        <div className="kpi-tile violet">
          <div className="kt-row"><div className="kt-label">Total demand value</div><div className="kt-ic"><Svg d={I.rupee} /></div></div>
          <div className="kt-val mono">{fmtL(t.total_value)}</div>
          <div className="kt-sub">estimated across all MRs</div>
        </div>
      </section>

      {/* SECONDARY METRICS */}
      <section className="mrd-metrics">
        <div className="mrd-metric">
          <div className="mm-ic violet"><Svg d={I.check} w={16} /></div>
          <div><div className="mm-val mono">{t.approved || 0}</div><div className="mm-label">Approved · ready for PO</div></div>
        </div>
        <div className="mrd-metric">
          <div className="mm-ic success"><Svg d={I.trend} w={16} /></div>
          <div><div className="mm-val mono">{a?.conversion_rate != null ? a.conversion_rate + "%" : "—"}</div><div className="mm-label">Approval → PO conversion</div></div>
        </div>
        <div className="mrd-metric">
          <div className="mm-ic blue"><Svg d={I.clock} w={16} /></div>
          <div><div className="mm-val mono">{a?.avg_approval_days != null ? a.avg_approval_days + "d" : "—"}</div><div className="mm-label">Avg approval time</div></div>
        </div>
        <div className={"mrd-metric" + (a?.overdue_count > 0 ? " is-alert" : "")}>
          <div className="mm-ic danger"><Svg d={I.alert} w={16} /></div>
          <div><div className="mm-val mono">{a?.overdue_count || 0}</div><div className="mm-label">Overdue · past required-by</div></div>
        </div>
      </section>

      {/* STATUS MIX + TREND */}
      <div className="mrd-2col">
        <section className="section-card">
          <div className="section-head"><h2><span className="ic"><Svg d={I.list} w={14} /></span> Requisitions by status</h2></div>
          <div className="section-body">
            <div className="mrd-donut-wrap">
              <div className="mrd-donut" style={{ background: donutStops }}><div className="mrd-donut-hole"><div className="mono">{t.all || 0}</div><div className="mrd-donut-sub">MRs</div></div></div>
              <div className="mrd-legend">
                {byStatus.map((r) => (
                  <div key={r.status} className="mrd-leg-row">
                    <span className="mrd-leg-dot" style={{ background: r.color }} />
                    <span className="mrd-leg-label">{r.label}</span>
                    <span className="mrd-leg-count mono">{r.count}</span>
                    <span className="mrd-leg-val mono">{fmtL(r.value)}</span>
                  </div>
                ))}
                {byStatus.length === 0 && <div className="fs-12 text-fg-4">No MRs yet</div>}
              </div>
            </div>
          </div>
        </section>

        <section className="section-card">
          <div className="section-head"><h2><span className="ic"><Svg d={I.trend} w={14} /></span> Demand trend · last 6 months</h2></div>
          <div className="section-body">
            <div className="mrd-trend">
              {(a?.by_month || []).map((m) => (
                <div key={m.month} className="mrd-trend-col">
                  <div className="mrd-trend-bar-wrap"><div className="mrd-trend-bar" style={{ height: `${Math.max(6, (m.count / monthMax) * 100)}%` }} title={`${m.count} MRs`} /></div>
                  <div className="mrd-trend-n mono">{m.count}</div>
                  <div className="mrd-trend-m">{monthLabel(m.month)}</div>
                </div>
              ))}
              {(a?.by_month || []).length === 0 && <div className="fs-12 text-fg-4" style={{ alignSelf: "center" }}>No activity yet</div>}
            </div>
          </div>
        </section>
      </div>

      {/* DEPARTMENT VALUE + URGENCY/REQUESTERS */}
      <div className="mrd-2col">
        <section className="section-card">
          <div className="section-head"><h2><span className="ic"><Svg d={I.rupee} w={14} /></span> Demand by department</h2></div>
          <div className="section-body">
            {(a?.by_department || []).slice(0, 8).map((d) => (
              <div key={d.department_id} className="mrd-bar-row">
                <div className="mrd-bar-label" title={d.department_name}>{d.department_name || "—"}</div>
                <div className="mrd-bar-track"><div className="mrd-bar-fill" style={{ width: `${(d.count / deptMax) * 100}%` }} /></div>
                <div className="mrd-bar-meta"><span className="mono">{d.count}</span> · <span className="mono">{fmtL(d.value)}</span></div>
              </div>
            ))}
            {(a?.by_department || []).length === 0 && <div className="fs-12 text-fg-4">No departments yet</div>}
          </div>
        </section>

        <section className="section-card">
          <div className="section-head"><h2><span className="ic"><Svg d={I.alert} w={14} /></span> Urgency &amp; top requesters</h2></div>
          <div className="section-body">
            <div className="mrd-urgency">
              {urgency.map((u) => (
                <div key={u.key} className={"mrd-urg " + u.key}>
                  <div className="mrd-urg-row"><span className="mrd-urg-label">{u.key[0].toUpperCase() + u.key.slice(1)}</span><span className="mono">{u.count}</span></div>
                  <div className="mrd-urg-bar"><div className="mrd-urg-fill" style={{ width: `${(u.count / urgencyTotal) * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="mrd-requesters">
              {(a?.top_requesters || []).map((r) => (
                <div key={r.raised_by} className="mrd-req-row">
                  <span className="mrd-req-av">{(r.raised_by_name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</span>
                  <span className="mrd-req-name">{r.raised_by_name || "Unknown"}</span>
                  <span className="mono fw-600">{r.count}</span>
                </div>
              ))}
              {(a?.top_requesters || []).length === 0 && <div className="fs-12 text-fg-4">No requesters yet</div>}
            </div>
          </div>
        </section>
      </div>

      {/* RECENT */}
      <section className="section-card">
        <div className="section-head"><h2><span className="ic"><Svg d={I.clock} w={14} /></span> Recent requisitions</h2><Link href="/dashboard/buyer/material-requisitions/all" className="mrd-viewall">View all <span aria-hidden="true">→</span></Link></div>
        <div className="section-body" style={{ padding: 0 }}>
          {(a?.recent || []).map((r) => {
            const s = ST[r.status] || ST.draft;
            return (
              <Link key={r.id} href={`/dashboard/buyer/material-requisitions/${r.id}`} className="mrd-recent-row">
                <span className={"status-pill " + s.tone} style={{ flexShrink: 0 }}><span className="dot" /><span>{s.label}</span></span>
                <span className="mrd-recent-title"><span className="em">{r.title || "(Untitled)"}</span> <span className="cc-num">#{r.mr_number}</span></span>
                <span className="mrd-recent-meta">{r.department_name || ""}{r.hotel_name ? " · " + r.hotel_name : ""}</span>
                <span className="mono fw-600 text-fg" style={{ flexShrink: 0 }}>{fmtL(r.total_est_value)}</span>
                <span className="fs-12 text-fg-4" style={{ flexShrink: 0 }}>{fmtDate(r.created_at)}</span>
              </Link>
            );
          })}
          {(a?.recent || []).length === 0 && <div className="empty-state"><h2>No requisitions yet</h2><p>Raised MRs will appear here.</p></div>}
        </div>
      </section>
    </div>
  );
}
