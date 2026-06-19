// All MRs — faceted listing page. Mirrors the "All Rate Contracts" page
// (ContractsListPage): status tabs + left filter sidebar (Status / BU /
// Department / Category / Product / Vendor / Urgency) + right listing with
// search + sort. All filtering is client-side over one enriched fetch.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as MrApi from "@/services/mr";
import { getStoredHospitalityContext } from "@/utils/hospitalityContext";
import { MrAllSkeleton } from "./MrSkeletons";

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
const asArray = (v) => (Array.isArray(v) ? v : []);

// status → bucket (one of the tab keys)
const BUCKET = {
  draft: "drafts", pending_approval: "pending", approved: "approved",
  po_released: "po_released", rejected: "cancelled", cancelled: "cancelled",
};
const BUCKET_LABEL = {
  drafts: "Draft", pending: "Pending approval", approved: "Approved",
  po_released: "PO released", cancelled: "Cancelled / rejected",
};
// bucket → card tone (status-pill / cc-badge variant)
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
  { key: "drafts", label: "Drafts" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "po_released", label: "PO released" },
  { key: "cancelled", label: "Cancelled" },
];

const Svg = ({ d, w = 14, sw = 2 }) => (
  <svg width={w} height={w} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
       dangerouslySetInnerHTML={{ __html: d }} />
);

function FilterGroup({ label, options, group, isOn, toggle, buCode = false }) {
  const [expanded, setExpanded] = useState(false);
  const empty = !options || options.length === 0;
  // Top 5 by count; the rest hide behind "Show more" (no scrollbar).
  const shown = expanded ? options : (options || []).slice(0, 5);
  const extra = (options ? options.length : 0) - 5;
  return (
    <div className="filter-group">
      <div className="fg-label">{label}</div>
      <div className="fg-options">
        {empty ? <div className="fg-empty">No options</div> : (
          <>
            {shown.map((opt) => (
              <label key={opt.key} className="filter-opt">
                <input type="checkbox" checked={isOn(group, opt.key)} onChange={() => toggle(group, opt.key)} />
                <span className="fo-box" />
                <span className="fo-text" title={opt.label}>
                  {buCode && opt.sub
                    ? <><span className="mono fw-600">{opt.sub}</span> <span style={{ color: "var(--fg-3)" }}>{opt.label}</span></>
                    : opt.label}
                </span>
                <span className="fo-count">{opt.count}</span>
              </label>
            ))}
            {extra > 0 && (
              <button type="button" onClick={() => setExpanded((v) => !v)} style={{ marginTop: 5, padding: "3px 2px", background: "none", border: "none", color: "var(--primary)", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", width: "fit-content" }}>
                {expanded ? "Show less" : `Show ${extra} more`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const buCodeFor = (name) => (name ? name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3).toUpperCase() : "—");

export default function MrAllPage({ filterPreset = "all" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(filterPreset);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [filters, setFilters] = useState({
    status: [], buId: [], departmentId: [], categoryId: [], productId: [], vendorId: [], urgency: [],
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const ctx = getStoredHospitalityContext() || {};
    const params = { page: 1, limit: 200, statusGroup: "all" };
    if (ctx.hospitality_company_id) params.hospitality_company_id = ctx.hospitality_company_id;
    if (ctx.hotel_id) params.hotel_ids = String(ctx.hotel_id);
    MrApi.listMrs(params)
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data || res;
        setRows(Array.isArray(payload?.data) ? payload.data : (payload?.data?.data || []));
      })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const tabCounts = useMemo(() => {
    const c = { all: rows.length };
    rows.forEach((r) => { const b = BUCKET[r.status] || "drafts"; c[b] = (c[b] || 0) + 1; });
    return c;
  }, [rows]);

  const tabRows = useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter((r) => (BUCKET[r.status] || "drafts") === activeTab);
  }, [rows, activeTab]);

  // ── facet options (client-derived from tabRows) ──
  const statusOptions = useMemo(() => {
    const c = {};
    tabRows.forEach((r) => { const b = BUCKET[r.status] || "drafts"; c[b] = (c[b] || 0) + 1; });
    return ["drafts", "pending", "approved", "po_released", "cancelled"].filter((k) => c[k]).map((k) => ({ key: k, label: BUCKET_LABEL[k], count: c[k] }));
  }, [tabRows]);

  const facetFrom = (keyOf, labelOf, subOf) => {
    const map = new Map();
    tabRows.forEach((r) => {
      const k = keyOf(r);
      if (k == null || k === "") return;
      const cur = map.get(String(k)) || { key: String(k), label: labelOf(r), sub: subOf ? subOf(r) : undefined, count: 0 };
      cur.count += 1; map.set(String(k), cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  };
  const arrFacet = (idsKey, namesKey) => {
    const map = new Map();
    tabRows.forEach((r) => {
      const ids = asArray(r[idsKey]); const names = asArray(r[namesKey]);
      ids.forEach((id, i) => {
        if (id == null) return;
        const cur = map.get(String(id)) || { key: String(id), label: names[i] || `#${id}`, count: 0 };
        cur.count += 1; map.set(String(id), cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  };

  const buOptions = useMemo(() => facetFrom((r) => r.hotel_id, (r) => r.hotel_name || `Hotel #${r.hotel_id}`, (r) => buCodeFor(r.hotel_name)), [tabRows]);
  const deptOptions = useMemo(() => facetFrom((r) => r.department_id, (r) => r.department_name || `Dept #${r.department_id}`), [tabRows]);
  const catOptions = useMemo(() => arrFacet("category_ids", "category_titles"), [tabRows]);
  const productOptions = useMemo(() => arrFacet("product_variant_ids", "item_names"), [tabRows]);
  const vendorOptions = useMemo(() => arrFacet("vendor_ids", "vendor_names"), [tabRows]);
  const urgencyOptions = useMemo(() => {
    const c = {};
    tabRows.forEach((r) => { const u = r.urgency || "normal"; c[u] = (c[u] || 0) + 1; });
    return ["urgent", "normal", "low"].filter((k) => c[k]).map((k) => ({ key: k, label: k[0].toUpperCase() + k.slice(1), count: c[k] }));
  }, [tabRows]);

  const isOn = (g, k) => (filters[g] || []).includes(k);
  const toggle = (g, k) => setFilters((f) => {
    const cur = f[g] || [];
    return { ...f, [g]: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] };
  });
  const activeFilterCount = Object.values(filters).reduce((s, a) => s + a.length, 0);
  const resetAll = () => setFilters({ status: [], buId: [], departmentId: [], categoryId: [], productId: [], vendorId: [], urgency: [] });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = tabRows.filter((r) => {
      if (filters.status.length && !filters.status.includes(BUCKET[r.status] || "drafts")) return false;
      if (filters.buId.length && !filters.buId.includes(String(r.hotel_id))) return false;
      if (filters.departmentId.length && !filters.departmentId.includes(String(r.department_id))) return false;
      if (filters.urgency.length && !filters.urgency.includes(r.urgency || "normal")) return false;
      if (filters.categoryId.length) { const ids = asArray(r.category_ids).map(String); if (!ids.some((id) => filters.categoryId.includes(id))) return false; }
      if (filters.productId.length) { const ids = asArray(r.product_variant_ids).map(String); if (!ids.some((id) => filters.productId.includes(id))) return false; }
      if (filters.vendorId.length) { const ids = asArray(r.vendor_ids).map(String); if (!ids.some((id) => filters.vendorId.includes(id))) return false; }
      if (term) {
        const hay = `${r.title || ""} ${r.mr_number || ""} ${r.department_name || ""} ${r.hotel_name || ""} ${r.raised_by_name || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    list = list.slice().sort((a, b) => {
      if (sort === "value") return Number(b.total_est_value || 0) - Number(a.total_est_value || 0);
      if (sort === "required") return new Date(a.required_by_date || "2999") - new Date(b.required_by_date || "2999");
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
    return list;
  }, [tabRows, filters, search, sort]);

  if (loading) return <MrAllSkeleton />;

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
          <button key={t.key} type="button" className={"tab" + (activeTab === t.key ? " active" : "")} onClick={() => setActiveTab(t.key)}>
            {t.label} <span className="ct">{tabCounts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="contracts-layout">
        <aside className="filter-sidebar">
          <div className="fs-head">
            <h3><Svg d='<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>' /> Filters</h3>
            {activeFilterCount > 0 && <span className="reset-link" onClick={resetAll}>Reset</span>}
          </div>
          <FilterGroup label="Status"        options={statusOptions}  group="status"       isOn={isOn} toggle={toggle} />
          <FilterGroup label="Business unit" options={buOptions}      group="buId"         isOn={isOn} toggle={toggle} buCode />
          <FilterGroup label="Department"    options={deptOptions}    group="departmentId" isOn={isOn} toggle={toggle} />
          <FilterGroup label="Category"      options={catOptions}     group="categoryId"   isOn={isOn} toggle={toggle} />
          <FilterGroup label="Product"       options={productOptions} group="productId"    isOn={isOn} toggle={toggle} scrollable />
          <FilterGroup label="Vendor"        options={vendorOptions}  group="vendorId"     isOn={isOn} toggle={toggle} scrollable />
          <FilterGroup label="Urgency"       options={urgencyOptions} group="urgency"      isOn={isOn} toggle={toggle} />
        </aside>

        <div>
          <div className="list-toolbar">
            <div className="lt-left"><span className="em mono">{filtered.length}</span> of <span className="mono">{tabRows.length}</span> MRs</div>
            <div className="lt-right">
              <div className="search-input" style={{ width: 280 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="input" placeholder="Search by title, number, requester…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select-mini" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">Most recent</option>
                <option value="value">Highest value</option>
                <option value="required">Required-by soonest</option>
              </select>
            </div>
          </div>

          <div className="contract-list" style={{ marginTop: 12 }}>
            {filtered.map((r) => {
              const bucket = BUCKET[r.status] || "drafts";
              const tone = BUCKET_TONE[bucket];
              const vendors = asArray(r.vendor_names);
              const items = asArray(r.item_names);
              return (
                <Link key={r.id} href={`/dashboard/buyer/material-requisitions/${r.id}`} className="contract-card">
                  <div className="cc-head">
                    <div className="cc-left">
                      <div className={`cc-badge ${tone}`}><Svg d={BADGE_D[bucket]} w={20} /></div>
                      <div className="cc-meta">
                        <div className="cc-title">
                          <span>{r.title || "(Untitled MR)"}</span>
                          <span className="cc-num">#{r.mr_number || r.id}</span>
                          <span className={"mr-urgency-pill " + (r.urgency || "normal")}>{r.urgency || "normal"}</span>
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
            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="ic"><Svg d='<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>' w={24} sw={1.8} /></div>
                <h2>No MRs match these filters</h2>
                <p>Try another tab, clear a filter, or adjust the search.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
