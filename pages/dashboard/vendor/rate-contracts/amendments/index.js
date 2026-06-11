// Vendor — My Amendments. Every amendment request the vendor has raised,
// across all rate contracts, in one filterable workspace. Mirrors the buyer
// All-Contracts page: tab row (All / Active / Requested / Rejected), filter
// rail on the left (Business unit / Contract / Type), search across RC id,
// RC title, BU name, AMD id and reason. Data: GET /v1/arc-v2/vendor/amendments.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const TYPE_LABEL = {
  price:       "Price revision",
  qty:         "Quantity revision",
  term:        "Term extension",
  item_add:    "Item addition",
  item_remove: "Item removal",
};

// Status → display bucket. "Active" = approved by the buyer chain (pending
// go-live or currently live); ended/voided only surface under All.
const STATUS_VIEW = {
  requested: { bucket: "requested", label: "Requested",       tone: "warn",    pulse: true  },
  approved:  { bucket: "active",    label: "Approved",        tone: "success", pulse: false },
  live:      { bucket: "active",    label: "Live",            tone: "success", pulse: false },
  rejected:  { bucket: "rejected",  label: "Rejected",        tone: "danger",  pulse: false },
  ended:     { bucket: "past",      label: "Ended",           tone: "neutral", pulse: false },
  voided:    { bucket: "past",      label: "Voided",          tone: "neutral", pulse: false },
};

const TABS = [
  { key: "all",       label: "All" },
  { key: "active",    label: "Active" },
  { key: "requested", label: "Requested" },
  { key: "rejected",  label: "Rejected" },
];

// BU code from hotel name — same derivation the buyer list uses.
function buCodeFor(name) {
  if (!name) return "—";
  const parts = String(name).replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0] + (parts[2]?.[0] || "")).toUpperCase();
}

function TypeIcon({ type }) {
  const p = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "price")
    return (<svg {...p}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>);
  if (type === "qty")
    return (<svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>);
  if (type === "term")
    return (<svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
  return (<svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>);
}

// ── page ─────────────────────────────────────────────────────────────────────
export default function VendorMyAmendmentsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [filters, setFilters] = useState({ buId: [], contractId: [], type: [] });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ArcApi.vendorListAmendments()
      .then((res) => {
        if (cancelled) return;
        setRows(res?.data?.amendments || []);
      })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const viewOf = (r) => STATUS_VIEW[r.status] || { bucket: "past", label: r.status, tone: "neutral", pulse: false };

  const tabCounts = useMemo(() => ({
    all:       rows.length,
    active:    rows.filter((r) => viewOf(r).bucket === "active").length,
    requested: rows.filter((r) => viewOf(r).bucket === "requested").length,
    rejected:  rows.filter((r) => viewOf(r).bucket === "rejected").length,
  }), [rows]);

  const tabRows = useMemo(() => {
    if (activeTab === "all") return rows;
    return rows.filter((r) => viewOf(r).bucket === activeTab);
  }, [rows, activeTab]);

  // ── derived filter options ──────────────────────────────────────────
  const buOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      if (r.hotel_id == null) return;
      const k = String(r.hotel_id);
      const cur = map.get(k) || { key: k, label: r.hotel_name || `Hotel #${r.hotel_id}`, sub: buCodeFor(r.hotel_name), count: 0 };
      cur.count += 1;
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tabRows]);

  const contractOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      const k = String(r.arc_contract_id);
      const cur = map.get(k) || { key: k, label: `${r.arc_number || `RC-${r.arc_contract_id}`}${r.arc_title ? " · " + r.arc_title : ""}`, count: 0 };
      cur.count += 1;
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tabRows]);

  const typeOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      const k = String(r.amendment_type);
      const cur = map.get(k) || { key: k, label: TYPE_LABEL[k] || k, count: 0 };
      cur.count += 1;
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tabRows]);

  // ── filter + sort ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = tabRows.filter((r) => {
      if (filters.buId.length && !filters.buId.includes(String(r.hotel_id))) return false;
      if (filters.contractId.length && !filters.contractId.includes(String(r.arc_contract_id))) return false;
      if (filters.type.length && !filters.type.includes(String(r.amendment_type))) return false;
      if (term) {
        const hay = `amd-${r.id} ${r.arc_number || ""} ${r.arc_title || ""} ${r.hotel_name || ""} ${r.category_title || ""} ${TYPE_LABEL[r.amendment_type] || r.amendment_type || ""} ${r.reason || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    if (sort === "effective") {
      list = list.slice().sort((a, b) => new Date(a.amendment_from || 0) - new Date(b.amendment_from || 0));
    } else {
      list = list.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    return list;
  }, [tabRows, filters, search, sort]);

  // ── mutators ───────────────────────────────────────────────────────
  function toggle(group, key) {
    setFilters((f) => {
      const cur = f[group] || [];
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      return { ...f, [group]: next };
    });
  }
  function isOn(group, key) { return (filters[group] || []).includes(key); }
  function resetAll() {
    setFilters({ buId: [], contractId: [], type: [] });
    setSearch("");
  }
  const activeFilterCount = filters.buId.length + filters.contractId.length + filters.type.length;

  function activeChips() {
    const chips = [];
    filters.buId.forEach((k) => {
      const opt = buOptions.find((o) => o.key === k);
      chips.push({ group: "buId", key: k, label: "BU: " + (opt?.sub || opt?.label || k) });
    });
    filters.contractId.forEach((k) => {
      const opt = contractOptions.find((o) => o.key === k);
      chips.push({ group: "contractId", key: k, label: "Contract: " + (opt?.label || k) });
    });
    filters.type.forEach((k) => {
      chips.push({ group: "type", key: k, label: "Type: " + (TYPE_LABEL[k] || k) });
    });
    return chips;
  }

  return (
    <main className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">My Amendments</h1>
          <p className="page-sub">
            Every amendment you've requested, across all rate contracts — track approval
            progress, see what's live, and review past outcomes.
          </p>
        </div>
        <Link href="/dashboard/vendor/rate-contracts/amendments/request" className="btn btn-blue btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Request Amendment
        </Link>
      </div>

      <div className="section-card">
        <div className="section-head" style={{ padding: "10px 14px" }}>
          <div className="tab-row">
            {TABS.map((t) => (
              <button key={t.key}
                      type="button"
                      className={"tab" + (activeTab === t.key ? " active" : "")}
                      onClick={() => setActiveTab(t.key)}>
                {t.label} <span className="ct">{tabCounts[t.key] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {(activeFilterCount > 0 || search) && (
        <div className="active-filters">
          <span className="af-label">Filters</span>
          {activeChips().map((ch) => (
            <span key={ch.group + "." + ch.key} className="af-chip">
              <span>{ch.label}</span>
              <button type="button" className="x-btn" onClick={() => toggle(ch.group, ch.key)} aria-label="Remove">×</button>
            </span>
          ))}
          {search && (
            <span className="af-chip">
              Search: "<span>{search}</span>"
              <button type="button" className="x-btn" onClick={() => setSearch("")}>×</button>
            </span>
          )}
          <span className="af-clear" onClick={resetAll}>Clear all</span>
        </div>
      )}

      <div className="contracts-layout">
        {/* LEFT — filter sidebar */}
        <aside className="filter-sidebar">
          <div className="fs-head">
            <h3>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              Filters
            </h3>
            {activeFilterCount > 0 && (<span className="reset-link" onClick={resetAll}>Reset</span>)}
          </div>

          <FilterGroup label="Business unit" options={buOptions}       group="buId"       isOn={isOn} toggle={toggle} buCode />
          <FilterGroup label="Contract"      options={contractOptions} group="contractId" isOn={isOn} toggle={toggle} scrollable />
          <FilterGroup label="Type"          options={typeOptions}     group="type"       isOn={isOn} toggle={toggle} />
        </aside>

        {/* RIGHT — listing */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="list-toolbar">
            <div className="lt-left">
              <span className="em mono">{filtered.length}</span> of <span className="mono">{tabRows.length}</span> amendments
            </div>
            <div className="lt-right">
              <div className="search-input" style={{ width: 280 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input className="input" placeholder="Search RC id, title, BU, AMD…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select-mini" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">Most recent</option>
                <option value="effective">Effective date</option>
              </select>
            </div>
          </div>

          <div className="contract-list">
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="arc-sk" style={{ display: "block", width: 130, height: 11, marginBottom: 8 }} />
                        <span className="arc-sk" style={{ display: "block", width: "45%", height: 18, marginBottom: 10 }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <span className="arc-sk" style={{ display: "block", width: 100, height: 16, borderRadius: 999 }} />
                          <span className="arc-sk" style={{ display: "block", width: 140, height: 16, borderRadius: 999 }} />
                        </div>
                      </div>
                      <span className="arc-sk" style={{ display: "block", width: 84, height: 22, borderRadius: 999, flexShrink: 0 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filtered.map((am) => {
              const view = viewOf(am);
              const totalSteps = Number(am.total_steps) || (Array.isArray(am.chain) ? am.chain.length : 0);
              const effFrom = fmtDate(am.amendment_from);
              const effTo = fmtDate(am.amendment_to);
              return (
                <Link key={am.id}
                      href={`/dashboard/vendor/rate-contracts/${am.arc_contract_id}?tab=amendments`}
                      className="contract-card">
                  <div className="cc-head">
                    <div className="cc-left">
                      <div className={`cc-badge ${view.bucket === "active" ? "active" : view.bucket === "requested" ? "floated" : view.bucket === "rejected" ? "expired" : "draft"}`}>
                        <TypeIcon type={am.amendment_type} />
                      </div>
                      <div className="cc-meta">
                        <div className="cc-title">
                          <span>{TYPE_LABEL[am.amendment_type] || am.amendment_type}</span>
                          <span className="cc-num">AMD-{am.id}</span>
                        </div>
                        <div className="cc-sub">
                          <span><span className="mono fw-600">{am.arc_number || `RC-${am.arc_contract_id}`}</span>{am.arc_title ? ` · ${am.arc_title}` : ""}</span>
                          {am.hotel_name && (
                            <>
                              <span className="sep">·</span>
                              <span><span className="mono fw-600">{buCodeFor(am.hotel_name)}</span> {am.hotel_name}</span>
                            </>
                          )}
                          {am.category_title && (<><span className="sep">·</span><span>{am.category_title}</span></>)}
                          {effFrom && (
                            <>
                              <span className="sep">·</span>
                              <span>Effective: <span className="em">{effFrom}{effTo ? ` → ${effTo}` : ""}</span></span>
                            </>
                          )}
                        </div>
                        <div className="cc-sub" style={{ marginTop: 3 }}>
                          {am.payload?.new_rate != null && (<span>New rate <span className="mono em">₹{am.payload.new_rate}</span></span>)}
                          {am.payload?.new_qty != null && (<span>New qty <span className="mono em">{am.payload.new_qty}</span></span>)}
                          {am.reason && (
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 420, display: "inline-block", verticalAlign: "bottom" }}>
                              {(am.payload?.new_rate != null || am.payload?.new_qty != null) ? " · " : ""}{am.reason}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="cc-right">
                      <span className={`status-pill ${view.tone}${view.pulse ? " pulse" : ""}`}>
                        <span className="dot" /><span>{view.label}</span>
                      </span>
                      {view.bucket === "requested" && totalSteps > 0 && (
                        <span className="text-fg-3 fs-12">
                          Approval level <span className="mono fw-600 text-fg">{Math.min(Number(am.current_step) || 1, totalSteps)} / {totalSteps}</span>
                        </span>
                      )}
                      <span className="mono text-fg-3 fs-12">{fmtDate(am.created_at)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}

            {!loading && filtered.length === 0 && (
              <div className="empty-state">
                <div className="ic">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                <h2>{rows.length === 0 ? "No amendment requests yet" : "No amendments match these filters"}</h2>
                <p>
                  {rows.length === 0
                    ? "Raise your first request — pick a contract, the change you need, and the effective window."
                    : "Try removing a filter or clearing the search box."}
                </p>
                {rows.length === 0 && (
                  <Link href="/dashboard/vendor/rate-contracts/amendments/request" className="btn btn-blue btn-sm" style={{ marginTop: 12 }}>
                    Request Amendment
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── filter group (same shape as the buyer list page) ────────────────────────
function FilterGroup({ label, options, group, isOn, toggle, buCode = false, scrollable = false }) {
  const isEmpty = !options || options.length === 0;
  return (
    <div className="filter-group">
      <div className="fg-label">{label}</div>
      <div
        className="fg-options"
        style={scrollable && !isEmpty ? { maxHeight: 200, overflowY: "auto" } : undefined}
      >
        {isEmpty ? (
          <div className="fg-empty">No options yet</div>
        ) : (
          options.map((opt) => (
            <label key={opt.key} className="filter-opt">
              <input type="checkbox" checked={isOn(group, opt.key)} onChange={() => toggle(group, opt.key)} />
              <span className="fo-box" />
              <span className="fo-text" title={opt.label}>
                {buCode && opt.sub ? (
                  <>
                    <span className="mono fw-600">{opt.sub}</span>{" "}
                    <span style={{ color: "var(--fg-3)" }}>{opt.label}</span>
                  </>
                ) : (
                  opt.label
                )}
              </span>
              <span className="fo-count">{opt.count}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
