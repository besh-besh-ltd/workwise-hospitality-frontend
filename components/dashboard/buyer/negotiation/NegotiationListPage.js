// Negotiation landing list — server-authoritative (POST /negotiation/list-view).
// Search, faceting, filtering, sorting and pagination are all computed
// server-side; the client renders only what the server returns. Mirrors the
// RFQ Management listing (RfqListPage) on the shared arc_v2.css primitives,
// plus a "Pending for me" tab driven by NEGOTIATION / NEGOTIATION_QUOTE
// approvals waiting on the current user.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getNegotiationListView } from "@/services/negotiation";

// ── buckets ────────────────────────────────────────────────────────────────
function statusBucket(s) {
  switch (s) {
    case "pending_approval":  return "pending";
    case "active":            return "active";
    case "awaiting_decision": return "awaiting";
    case "completed":         return "completed";
    case "cancelled":         return "cancelled";
    default:                  return "pending";
  }
}
const BUCKET_LABEL = { pending: "Pending Approval", active: "Active", awaiting: "Awaiting Decision", completed: "Completed", cancelled: "Cancelled" };
const BUCKET_TONE  = { pending: "committee", active: "active", awaiting: "awaiting", completed: "success", cancelled: "danger" };
const BUCKET_BADGE = { pending: "committee", active: "active", awaiting: "awaiting", completed: "active", cancelled: "expired" };

const TABS = [
  { key: "all",       label: "All" },
  { key: "for_me",    label: "Pending for me" },
  { key: "pending",   label: "Pending Approval" },
  { key: "active",    label: "Active" },
  { key: "awaiting",  label: "Awaiting Decision" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const FACETS = [
  { group: "rfqId", label: "RFQ" },
  { group: "status", label: "Status" },
  { group: "buId", label: "Business unit" },
  { group: "departmentId", label: "Department" },
  { group: "productId", label: "Product" },
  { group: "vendorId", label: "Vendor" },
];
const EMPTY_FILTERS = { rfqId: [], status: [], buId: [], departmentId: [], productId: [], vendorId: [] };

// Status-aware destination: ARC rows link to ARC negotiation pages;
// RFQ rows use the existing negotiation / quote-comparison routes.
function detailHref(row, bucket) {
  if (row.source_type === "ARC") {
    return bucket === "pending"
      ? `/dashboard/buyer/rate-contracts/${row.arc_id}/negotiation/${row.round_id}/approve`
      : `/dashboard/buyer/rate-contracts/${row.arc_id}?stage=commercial`;
  }
  // RFQ (unchanged):
  if (bucket === "pending") return `/dashboard/buyer/negotiation/${row.rfq_id}/approve`;
  return `/dashboard/buyer/quote-comparison?rfq=${row.rfq_id}`;
}

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(typeof d === "string" && !d.includes("Z") && !d.includes("+") ? d.replace(" ", "T") + "Z" : d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (_) { return []; } }
  return [];
}
function buCodeFor(name) {
  if (!name) return "—";
  const parts = String(name).replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0] + (parts[2]?.[0] || "")).toUpperCase();
}
function BadgeIcon({ bucket }) {
  const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (bucket) {
    case "active":   return (<svg {...p}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>);
    case "awaiting": return (<svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
    case "committee":return (<svg {...p}><path d="M14 9l-4 4" /><path d="M5 14l5-5" /><path d="M15 4l5 5" /><path d="M11 19l8-8" /><path d="M3 21h6" /></svg>);
    case "expired":  return (<svg {...p}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>);
    default:         return (<svg {...p}><circle cx="12" cy="12" r="10" /></svg>);
  }
}

/* ─── facet group (server provides {key,label,count}) ─── */
const FACET_COLLAPSED = 5;
// Facets with more than this many options get a debounced in-group search box
// (RFQ / Vendor / Product), so long lists stay navigable.
const FACET_SEARCHABLE = 8;

function FilterGroup({ label, group, options, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  // In-group option search. `q` updates on every keystroke (controlled input);
  // `query` is the debounced value that actually filters the options.
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [q]);

  if (!options || options.length === 0) return null;
  const searchable = options.length > FACET_SEARCHABLE;
  const matches = searchable && query
    ? options.filter((o) => String(o.label || o.key).toLowerCase().includes(query))
    : options;
  // Collapse to the first few only when not actively searching.
  const collapsed = !expanded && !(searchable && query);
  const shown = collapsed ? matches.slice(0, FACET_COLLAPSED) : matches;
  const extra = matches.length - FACET_COLLAPSED;
  return (
    <div className="filter-group">
      <div className="fg-label">{label}</div>
      {searchable && (
        <div className="search-input" style={{ width: "100%", margin: "2px 0 8px" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            className="input"
            placeholder={`Search ${String(label).toLowerCase()}…`}
            value={q}
            onChange={(e) => { setQ(e.target.value); setExpanded(false); }}
          />
        </div>
      )}
      <div className="fg-options">
        {shown.map((opt) => {
          const on = selected.includes(String(opt.key));
          return (
            <label key={opt.key} className="filter-opt" title={opt.label || opt.key}>
              <input type="checkbox" checked={on} onChange={() => onToggle(group, String(opt.key))} />
              <span className="fo-box" />
              <span className="fo-text">{opt.label || opt.key}</span>
              <span className="fo-count">{opt.count}</span>
            </label>
          );
        })}
        {shown.length === 0 && (
          <div style={{ fontSize: 12, color: "#a1a1aa", padding: "4px 2px" }}>No matches.</div>
        )}
        {!query && extra > 0 && (
          <button type="button" onClick={() => setExpanded((v) => !v)} style={{ marginTop: 5, padding: "3px 2px", background: "none", border: "none", color: "var(--primary, #2563eb)", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", width: "fit-content" }}>
            {expanded ? "Show less" : `Show ${extra} more`}
          </button>
        )}
      </div>
    </div>
  );
}
function FilterSkeleton() {
  const ROWS = [4, 3, 3, 5, 5];
  return (
    <>
      {FACETS.map((f, gi) => (
        <div key={f.group} className="filter-group">
          <div className="fg-label"><span className="arc-sk" style={{ display: "inline-block", width: 84, height: 9, borderRadius: 4 }} /></div>
          <div className="fg-options">
            {Array.from({ length: ROWS[gi] || 3 }).map((_, i) => (
              <div key={i} className="filter-opt" style={{ cursor: "default" }}>
                <span className="arc-sk" style={{ display: "block", width: 14, height: 14, borderRadius: 4, flexShrink: 0 }} />
                <span className="arc-sk" style={{ display: "block", flex: 1, height: 11, borderRadius: 4, maxWidth: 150 }} />
                <span className="arc-sk" style={{ display: "block", width: 16, height: 9, borderRadius: 4, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

const SOURCES = [
  { key: "all", label: "All" },
  { key: "RFQ", label: "RFQ" },
  { key: "ARC", label: "Rate Contracts" },
];

// ── page ────────────────────────────────────────────────────────────────────
export default function NegotiationListPage() {
  const [tab, setTab] = useState("all");
  const [source, setSource] = useState("all");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const [resp, setResp] = useState({ rows: [], facets: {}, tab_counts: {}, source_counts: { all: 0, RFQ: 0, ARC: 0 }, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    getNegotiationListView({ tab, source, search: debounced, sort, filters, page, limit: 20 })
      .then((res) => {
        if (id !== seq.current) return;
        const d = res?.data || {};
        setResp({
          rows: Array.isArray(d.rows) ? d.rows : [],
          facets: d.facets || {},
          tab_counts: d.tab_counts || {},
          source_counts: d.source_counts || { all: 0, RFQ: 0, ARC: 0 },
          total: d.total || 0,
          limit: d.limit || 20,
        });
      })
      .catch(() => { if (id === seq.current) setResp({ rows: [], facets: {}, tab_counts: {}, source_counts: { all: 0, RFQ: 0, ARC: 0 }, total: 0, limit: 20 }); })
      .finally(() => { if (id === seq.current) setLoading(false); });
  }, [tab, source, debounced, sort, filters, page]);

  const toggle = (group, key) => {
    setPage(1);
    setFilters((prev) => {
      const cur = prev[group] || [];
      return { ...prev, [group]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key] };
    });
  };
  const resetAll = () => { setFilters(EMPTY_FILTERS); setSearch(""); setPage(1); };
  const activeCount = useMemo(() => Object.values(filters).reduce((n, a) => n + a.length, 0), [filters]);
  const hasFacets = useMemo(() => FACETS.some((f) => (resp.facets[f.group] || []).length > 0), [resp.facets]);

  const { rows, facets, tab_counts, source_counts, total, limit } = resp;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Negotiations</h1>
          <p className="page-sub">Every negotiation round — track rounds, vendor participation and approvals.</p>
        </div>
      </div>

      <div className="tab-row" style={{ marginBottom: 4 }}>
        {SOURCES.map((s) => (
          <button key={s.key} type="button" className={"tab" + (source === s.key ? " active" : "")} onClick={() => { setSource(s.key); setPage(1); }}>
            {s.label} <span className="ct">{source_counts[s.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="tab-row">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={"tab" + (tab === t.key ? " active" : "")} onClick={() => { setTab(t.key); setPage(1); }}>
            {t.label} <span className="ct">{tab_counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="contracts-layout">
        <aside className="filter-sidebar">
          <div className="fs-head">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontSize: 13.5, fontWeight: 600 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg> Filters
            </h3>
            {activeCount > 0 && <button type="button" className="reset-link" onClick={resetAll}>Reset</button>}
          </div>
          <div>
            {loading && !hasFacets ? (
              <FilterSkeleton />
            ) : (
              <>
                {FACETS.map((f) => (
                  <FilterGroup key={f.group} label={f.label} group={f.group} options={facets[f.group] || []} selected={filters[f.group] || []} onToggle={toggle} />
                ))}
                {!hasFacets && <div style={{ fontSize: 12.5, color: "#a1a1aa", padding: "10px 2px" }}>No filters available.</div>}
              </>
            )}
          </div>
        </aside>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="list-toolbar">
            <div className="lt-left"><span className="em mono">{total}</span> {total === 1 ? "round" : "rounds"}</div>
            <div className="lt-right">
              <div className="search-input" style={{ width: 280 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="input" placeholder="Search by title or number…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select-mini" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                <option value="recent">Most recent</option>
                <option value="oldest">Oldest first</option>
                <option value="status">Lifecycle order</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="contract-card">
                  <div className="cc-head">
                    <div className="cc-left">
                      <span className="arc-sk" style={{ display: "block", width: 48, height: 48, borderRadius: 11, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="arc-sk" style={{ display: "block", width: "46%", height: 16, marginBottom: 9 }} />
                        <span className="arc-sk" style={{ display: "block", width: "70%", height: 11, marginBottom: 11 }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <span className="arc-sk" style={{ display: "block", width: 84, height: 18, borderRadius: 999 }} />
                          <span className="arc-sk" style={{ display: "block", width: 110, height: 18, borderRadius: 999 }} />
                        </div>
                      </div>
                    </div>
                    <span className="arc-sk" style={{ display: "block", width: 124, height: 22, borderRadius: 999, flexShrink: 0 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="empty-state" style={{ padding: "56px 24px" }}>
              <div className="ic">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9l-4 4" /><path d="M5 14l5-5" /><path d="M15 4l5 5" /><path d="M11 19l8-8" /><path d="M3 21h6" /></svg>
              </div>
              <h2>No negotiations found</h2>
              <p>{activeCount > 0 || debounced ? "Try clearing some filters or your search." : "Negotiations appear here once you start a round on an RFQ."}</p>
            </div>
          ) : (
            <div className="contract-list">
              {rows.map((row) => {
                const bucket = statusBucket(row.neg_status);
                const tone = BUCKET_TONE[bucket];
                const badge = BUCKET_BADGE[bucket];
                const itemNames = asArray(row.item_names);
                const vendors = asArray(row.vendors);
                const pulse = bucket === "pending" || bucket === "awaiting";
                const invited = Number(row.invited_count || 0);
                const quoted = Number(row.quotes_received || 0);
                const sBar = invited ? Math.round((quoted / invited) * 100) : 0;
                const endDate = fmtDate(row.end_date);
                const closedDate = fmtDate(row.closed_at);
                return (
                  <Link key={row.round_id} href={detailHref(row, bucket)} className={`contract-card${row.action_required ? " needs-action" : ""}`}>
                    <div className="cc-head">
                      <div className="cc-left">
                        <div className={`cc-badge ${badge}`}><BadgeIcon bucket={badge} /></div>
                        <div className="cc-meta">
                          <div className="cc-title">
                            <span>{row.title || (row.is_tender ? "Tender" : "RFQ")}</span>
                            <span className="cc-num">#{row.rfq_no || row.rfq_id}</span>
                            <span className="cc-num">{row.source_type === "ARC" ? "ARC" : "RFQ"}</span>
                            {row.action_required && row.action_label && <span className="needs-action-pill">{row.action_label}</span>}
                          </div>
                          <div className="cc-sub">
                            {row.hotel_name && (<span><span className="mono fw-600">{buCodeFor(row.hotel_name)}</span> <span>{row.hotel_name}</span></span>)}
                            {row.department_title && (<><span className="sep">·</span><span>{row.department_title}</span></>)}
                            {vendors.length > 0 && (<><span className="sep">·</span><span>Vendor: <span className="em">{vendors[0]?.name}</span>{vendors.length > 1 ? ` +${vendors.length - 1}` : ""}</span></>)}
                            <span className="sep">·</span>
                            <span>Round <span className="mono fw-600">{row.round_number || 1}</span>{Number(row.total_rounds) > 1 ? ` of ${row.total_rounds}` : ""}</span>
                          </div>
                          {itemNames.length > 0 && (
                            <div className="cc-tags">
                              {itemNames.slice(0, 3).map((name, i) => (<span key={i} className="bu-tag" title={name}><span>{name}</span></span>))}
                              {itemNames.length > 3 && (<span className="bu-tag">+<span>{itemNames.length - 3}</span> more</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="cc-right">
                        <span className={`status-pill ${tone}${pulse ? " pulse" : ""}`}><span className="dot" /><span>{BUCKET_LABEL[bucket]}</span></span>
                        {(bucket === "active" || bucket === "awaiting") && invited > 0 && (
                          <span className="text-fg-3 fs-12"><span className="mono fw-600 text-fg">{quoted} of {invited}</span> quoted</span>
                        )}
                        {bucket === "completed" && closedDate && (<span className="mono text-fg-3 fs-12">Closed {closedDate}</span>)}
                      </div>
                    </div>
                    {(bucket === "active" || bucket === "awaiting") && invited > 0 && (
                      <div className="cc-foot">
                        <div className="flex items-center gap-3">
                          <span className="fs-12 text-fg-3">Participation</span>
                          <div className="progress-bar">
                            <div className={`fill ${bucket === "awaiting" ? "warn" : ""}`} style={{ width: Math.min(100, sBar) + "%" }} />
                          </div>
                          <span className="progress-label">
                            <span className="mono">{quoted} of {invited}</span> vendors quoted
                            {endDate && (<> · {bucket === "active" ? "ends" : "ended"} <span className="fw-600 text-fg">{endDate}</span></>)}
                          </span>
                        </div>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {totalPages > 1 && !loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
              <span style={{ fontSize: 12.5, color: "#71717a", padding: "0 8px" }}>Page {page} of {totalPages}</span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
