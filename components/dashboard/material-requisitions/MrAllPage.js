// All MRs — server-authoritative faceted listing (POST /mr/list-view). Search,
// filtering, faceting, sorting and pagination are all computed server-side; the
// client renders only what the server returns. Mirrors the RFQ Management
// listing (RfqListPage) on the shared arc_v2.css primitives, plus a
// "Pending for me" tab driven by MR approvals waiting on the current user.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getMrListView } from "@/services/mr";

const fmtL = (n) => {
  const v = Number(n) || 0;
  if (v >= 100000) return "₹" + (v / 100000).toFixed(2) + " L";
  return "₹" + v.toLocaleString("en-IN");
};
const fmtDate = (s) => {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
};

const BUCKET_LABEL = {
  drafts: "Draft", pending: "Awaiting approval", approved: "Approved",
  po_released: "Released PO", cancelled: "Cancelled / rejected",
};
const BUCKET_TONE = {
  drafts: "draft", pending: "eval", approved: "committee", po_released: "active", cancelled: "expired",
};
const BADGE_D = {
  drafts:      '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  pending:     '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  approved:    '<polyline points="20 6 9 17 4 12"/>',
  po_released: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>',
  cancelled:   '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
};

const TABS = [
  { key: "all", label: "All" },
  { key: "for_me", label: "Pending for me" },
  { key: "drafts", label: "Drafts" },
  { key: "pending", label: "Awaiting approval" },
  { key: "approved", label: "Approved" },
  { key: "po_released", label: "Released PO" },
  { key: "cancelled", label: "Cancelled" },
];

const FACETS = [
  { group: "status", label: "Status" },
  { group: "buId", label: "Business unit" },
  { group: "departmentId", label: "Department" },
  { group: "categoryId", label: "Category" },
  { group: "productId", label: "Product" },
  { group: "vendorId", label: "Vendor" },
  { group: "urgency", label: "Urgency" },
];
const EMPTY_FILTERS = { status: [], buId: [], departmentId: [], categoryId: [], productId: [], vendorId: [], urgency: [] };

const Svg = ({ d, w = 14, sw = 2 }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
       dangerouslySetInnerHTML={{ __html: d }} />
);
const buCodeFor = (name) => (name ? name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase() : "—");

/* ─── facet group (server provides {key,label,count}) ─── */
const FACET_COLLAPSED = 5;
function FilterGroup({ label, group, options, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false);
  if (!options || options.length === 0) return null;
  const shown = expanded ? options : options.slice(0, FACET_COLLAPSED);
  const extra = options.length - FACET_COLLAPSED;
  return (
    <div className="filter-group">
      <div className="fg-label">{label}</div>
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
        {extra > 0 && (
          <button type="button" onClick={() => setExpanded((v) => !v)} style={{ marginTop: 5, padding: "3px 2px", background: "none", border: "none", color: "var(--primary, #2563eb)", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", width: "fit-content" }}>
            {expanded ? "Show less" : `Show ${extra} more`}
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSkeleton() {
  const ROWS = [5, 3, 3, 3, 5, 5, 3];
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

export default function MrAllPage({ filterPreset = "all" }) {
  const [tab, setTab] = useState(TABS.some((t) => t.key === filterPreset) ? filterPreset : "all");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const [resp, setResp] = useState({ rows: [], facets: {}, tab_counts: {}, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    getMrListView({ tab, search: debounced, sort, filters, page, limit: 20 })
      .then((res) => {
        if (id !== seq.current) return;
        const d = res?.data || {};
        setResp({
          rows: Array.isArray(d.rows) ? d.rows : [],
          facets: d.facets || {},
          tab_counts: d.tab_counts || {},
          total: d.total || 0,
          limit: d.limit || 20,
        });
      })
      .catch(() => { if (id === seq.current) setResp({ rows: [], facets: {}, tab_counts: {}, total: 0, limit: 20 }); })
      .finally(() => { if (id === seq.current) setLoading(false); });
  }, [tab, debounced, sort, filters, page]);

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

  const { rows, facets, tab_counts, total, limit } = resp;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">All Material Requisitions</h1>
          <p className="page-sub">Search, filter and drill into every MR — by BU, department, category, product, vendor, urgency or status.</p>
        </div>
        <Link href="/dashboard/buyer/material-requisitions/create" className="btn btn-blue btn-lg">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Raise new MR
        </Link>
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
              <Svg d='<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>' /> Filters
            </h3>
            {activeCount > 0 && <button type="button" className="reset-link" onClick={resetAll}>Reset</button>}
          </div>
          <div>
            {loading && !hasFacets ? (
              <FilterSkeleton />
            ) : (
              <>
                {FACETS.map((f) => (
                  <FilterGroup
                    key={f.group}
                    label={f.label}
                    group={f.group}
                    options={facets[f.group] || []}
                    selected={filters[f.group] || []}
                    onToggle={toggle}
                  />
                ))}
                {!hasFacets && <div style={{ fontSize: 12.5, color: "#a1a1aa", padding: "10px 2px" }}>No filters available.</div>}
              </>
            )}
          </div>
        </aside>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="list-toolbar">
            <div className="lt-left"><span className="em mono">{total}</span> {total === 1 ? "MR" : "MRs"}</div>
            <div className="lt-right">
              <div className="search-input" style={{ width: 280 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="input" placeholder="Search by title, number, requester…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select-mini" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                <option value="recent">Most recent</option>
                <option value="oldest">Oldest first</option>
                <option value="value">Highest value</option>
                <option value="required">Required-by soonest</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="contract-list" style={{ marginTop: 12 }}>
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
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 9, flexShrink: 0 }}>
                      <span className="arc-sk" style={{ display: "block", width: 124, height: 22, borderRadius: 999 }} />
                      <span className="arc-sk" style={{ display: "block", width: 66, height: 13 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="empty-state" style={{ padding: "56px 24px" }}>
              <div className="ic"><Svg d='<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>' w={24} sw={1.8} /></div>
              <h2>No MRs found</h2>
              <p>{activeCount > 0 || debounced ? "Try clearing some filters or your search." : "Raise your first material requisition to get started."}</p>
            </div>
          ) : (
            <div className="contract-list">
              {rows.map((r) => {
                const bucket = r.bucket || "drafts";
                const tone = BUCKET_TONE[bucket];
                const vendors = (r.vendors || []).map((v) => v.name).filter(Boolean);
                const items = r.item_names || [];
                return (
                  <Link key={r.id} href={`/dashboard/buyer/material-requisitions/${r.id}`} className={`contract-card${r.action_required ? " needs-action" : ""}`}>
                    <div className="cc-head">
                      <div className="cc-left">
                        <div className={`cc-badge ${tone}`}><Svg d={BADGE_D[bucket]} w={20} /></div>
                        <div className="cc-meta">
                          <div className="cc-title">
                            <span>{r.title || "(Untitled MR)"}</span>
                            <span className="cc-num">#{r.mr_number || r.id}</span>
                            <span className={"mr-urgency-pill " + (r.urgency || "normal")}>{r.urgency || "normal"}</span>
                            {r.action_required && r.action_label && <span className="needs-action-pill">{r.action_label}</span>}
                          </div>
                          <div className="cc-sub">
                            {r.department_name && <><span>{r.department_name}</span><span className="sep">·</span></>}
                            {r.hotel_name && <span><span className="mono fw-600">{buCodeFor(r.hotel_name)}</span> <span>{r.hotel_name}</span></span>}
                            {vendors.length > 0 && <><span className="sep">·</span><span>Vendor: <span className="em">{vendors[0]}</span>{vendors.length > 1 ? ` +${vendors.length - 1}` : ""}</span></>}
                            {r.required_by_date && <><span className="sep">·</span><span>By <span className="em mono">{fmtDate(r.required_by_date)}</span></span></>}
                            <span className="sep">·</span><span>Raised by <span className="em">{r.raised_by_name || "—"}</span></span>
                          </div>
                          {items.length > 0 && (
                            <div className="cc-tags">
                              {items.slice(0, 3).map((n, i) => <span key={i} className="bu-tag" title={n}><span>{n}</span></span>)}
                              {items.length > 3 && <span className="bu-tag">+<span>{items.length - 3}</span> more</span>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="cc-right">
                        <span className={`status-pill ${tone}`}><span className="dot" /><span>{BUCKET_LABEL[bucket]}</span></span>
                        {r.total_est_value != null && Number(r.total_est_value) > 0 && (
                          <span className="mono fw-700 text-fg fs-13">{fmtL(r.total_est_value)}</span>
                        )}
                        {Number(r.call_off_count) > 0 && (
                          <span className="fs-12 text-fg-3">{r.call_off_count} Released PO{Number(r.call_off_count) === 1 ? "" : "s"}</span>
                        )}
                      </div>
                    </div>
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
