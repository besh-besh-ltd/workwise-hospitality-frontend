// Negotiation landing list — every RFQ currently in negotiation, grouped by
// negotiation status. Visual port of the All Rate Contracts page
// (components/dashboard/rate-contracts/buyer/ContractsListPage.js): same global
// arc_v2.css classes (tab-row, filter-sidebar, contract-card, status-pill, …),
// same fetch-once-then-filter-client-side architecture. Data comes from
// GET /negotiation/rfqs (negotiationModel.getNegotiationRfqList), which returns
// one row per in-negotiation RFQ with an effective `neg_status` we bucket here.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listNegotiationRfqs } from "@/services/negotiation";

// ── buckets ────────────────────────────────────────────────────────────────
// The backend already collapses round status into an effective neg_status;
// we map it 1:1 onto the six tab buckets that drive cards, badges and filters.
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

const BUCKET_LABEL = {
  pending:   "Pending Approval",
  active:    "Active",
  awaiting:  "Awaiting Decision",
  completed: "Completed",
  cancelled: "Cancelled",
};

// status-pill colour modifier (classes defined in arc_v2.css).
const BUCKET_TONE = {
  pending:   "committee",
  active:    "active",
  awaiting:  "awaiting",
  completed: "success",
  cancelled: "danger",
};

// cc-badge tone + BadgeIcon key (arc_v2.css only ships these badge tones).
const BUCKET_BADGE = {
  pending:   "committee",
  active:    "active",
  awaiting:  "awaiting",
  completed: "active",
  cancelled: "expired",
};

const BUCKET_ORDER_LIFECYCLE = {
  pending: 0, active: 1, awaiting: 2, completed: 3, cancelled: 4,
};

const TABS = [
  { key: "all",       label: "All" },
  { key: "pending",   label: "Pending Approval" },
  { key: "active",    label: "Active" },
  { key: "awaiting",  label: "Awaiting Decision" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const TAB_TO_BUCKETS = {
  all:       null,
  pending:   ["pending"],
  active:    ["active"],
  awaiting:  ["awaiting"],
  completed: ["completed"],
  cancelled: ["cancelled"],
};

// Status-aware destination: a pending-approval round goes straight to its
// approve screen; everything else opens the RFQ's Quote Comparison page where
// negotiation is run (start another round, end actions, quote approval).
function detailHref(row, bucket) {
  if (bucket === "pending") return `/dashboard/buyer/negotiation/${row.rfq_id}/approve`;
  return `/dashboard/buyer/quote-comparison?rfq=${row.rfq_id}`;
}

// ── helpers (ported from the reference) ─────────────────────────────────────
function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(typeof d === "string" && !d.includes("Z") && !d.includes("+")
    ? d.replace(" ", "T") + "Z" : d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (_) { return []; }
  }
  return [];
}

function buCodeFor(name) {
  if (!name) return "—";
  const parts = String(name).replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0] + (parts[2]?.[0] || "")).toUpperCase();
}

// Lifecycle badge — inline SVGs keyed by the cc-badge bucket.
function BadgeIcon({ bucket }) {
  const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (bucket) {
    case "active":
      return (<svg {...p}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>);
    case "awaiting":
      return (<svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
    case "committee":
      return (<svg {...p}><path d="M14 9l-4 4" /><path d="M5 14l5-5" /><path d="M15 4l5 5" /><path d="M11 19l8-8" /><path d="M3 21h6" /></svg>);
    case "expired":
      return (<svg {...p}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>);
    default:
      return (<svg {...p}><circle cx="12" cy="12" r="10" /></svg>);
  }
}

// ── page ────────────────────────────────────────────────────────────────────
export default function NegotiationListPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [activeTab, setActiveTab] = useState("all");
  const [filters, setFilters] = useState({
    status: [], buId: [], departmentId: [], productId: [], vendorId: [],
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listNegotiationRfqs()
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data ?? res;
        const list = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
        setRows(list);
      })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const tabCounts = useMemo(() => {
    const acc = { all: rows.length };
    TABS.forEach((t) => {
      if (t.key === "all") return;
      const allow = TAB_TO_BUCKETS[t.key];
      acc[t.key] = rows.filter((r) => allow.includes(statusBucket(r.neg_status))).length;
    });
    return acc;
  }, [rows]);

  const tabRows = useMemo(() => {
    const allow = TAB_TO_BUCKETS[activeTab];
    if (!allow) return rows;
    return rows.filter((r) => allow.includes(statusBucket(r.neg_status)));
  }, [rows, activeTab]);

  // ── derived filter options ──────────────────────────────────────────
  const statusOptions = useMemo(() => {
    const counts = {};
    tabRows.forEach((r) => {
      const b = statusBucket(r.neg_status);
      counts[b] = (counts[b] || 0) + 1;
    });
    const order = ["pending", "active", "awaiting", "completed", "cancelled"];
    return order.filter((k) => counts[k]).map((k) => ({ key: k, label: BUCKET_LABEL[k], count: counts[k] }));
  }, [tabRows]);

  const buOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      if (r.hotel_id == null) return;
      const k = String(r.hotel_id);
      const cur = map.get(k) || { key: k, label: r.hotel_name || `Hotel #${r.hotel_id}`, sub: buCodeFor(r.hotel_name) || "—", count: 0 };
      cur.count += 1;
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tabRows]);

  const departmentOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      if (r.department_id == null) return;
      const k = String(r.department_id);
      const cur = map.get(k) || { key: k, label: r.department_title || `Department #${r.department_id}`, count: 0 };
      cur.count += 1;
      map.set(k, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tabRows]);

  // Products are keyed by name (the list payload carries item names, not ids).
  const productOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      asArray(r.item_names).forEach((name) => {
        if (!name) return;
        const k = String(name);
        const cur = map.get(k) || { key: k, label: name, count: 0 };
        cur.count += 1;
        map.set(k, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tabRows]);

  const vendorOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      asArray(r.vendors).forEach((v) => {
        if (v?.id == null) return;
        const k = String(v.id);
        const cur = map.get(k) || { key: k, label: v.name || `Vendor #${v.id}`, count: 0 };
        cur.count += 1;
        map.set(k, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tabRows]);

  // ── filter + sort ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = tabRows.filter((r) => {
      const bucket = statusBucket(r.neg_status);
      if (filters.status.length && !filters.status.includes(bucket)) return false;
      if (filters.buId.length && !filters.buId.includes(String(r.hotel_id))) return false;
      if (filters.departmentId.length && !filters.departmentId.includes(String(r.department_id))) return false;
      if (filters.productId.length) {
        const names = asArray(r.item_names).map(String);
        if (!names.some((n) => filters.productId.includes(n))) return false;
      }
      if (filters.vendorId.length) {
        const ids = asArray(r.vendors).map((v) => String(v?.id));
        if (!ids.some((id) => filters.vendorId.includes(id))) return false;
      }
      if (term) {
        const hay = `${r.title || ""} ${r.rfq_no || ""} ${r.hotel_name || ""} ${r.department_title || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    if (sort === "status") {
      list = list.slice().sort((a, b) => {
        const ba = BUCKET_ORDER_LIFECYCLE[statusBucket(a.neg_status)] ?? 9;
        const bb = BUCKET_ORDER_LIFECYCLE[statusBucket(b.neg_status)] ?? 9;
        return ba - bb;
      });
    } else {
      list = list.slice().sort((a, b) => {
        const ax = a.latest_round_created_at ? new Date(a.latest_round_created_at).getTime() : 0;
        const bx = b.latest_round_created_at ? new Date(b.latest_round_created_at).getTime() : 0;
        if (bx !== ax) return bx - ax;
        return Number(b.rfq_id) - Number(a.rfq_id);
      });
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
    setFilters({ status: [], buId: [], departmentId: [], productId: [], vendorId: [] });
    setSearch("");
  }
  const activeFilterCount =
    filters.status.length + filters.buId.length +
    filters.departmentId.length + filters.productId.length + filters.vendorId.length;

  function activeChips() {
    const chips = [];
    filters.status.forEach((k) => chips.push({ group: "status", key: k, label: "Status: " + BUCKET_LABEL[k] }));
    filters.buId.forEach((k) => {
      const opt = buOptions.find((o) => o.key === k);
      chips.push({ group: "buId", key: k, label: "BU: " + (opt?.sub || opt?.label || k) });
    });
    filters.departmentId.forEach((k) => {
      const opt = departmentOptions.find((o) => o.key === k);
      chips.push({ group: "departmentId", key: k, label: "Department: " + (opt?.label || k) });
    });
    filters.productId.forEach((k) => chips.push({ group: "productId", key: k, label: "Product: " + k }));
    filters.vendorId.forEach((k) => {
      const opt = vendorOptions.find((o) => o.key === k);
      chips.push({ group: "vendorId", key: k, label: "Vendor: " + (opt?.label || k) });
    });
    return chips;
  }

  function cardClass(row) {
    const b = statusBucket(row.neg_status);
    let cls = "contract-card";
    if (b === "active") cls += " is-active";
    else if (b === "awaiting") cls += " is-expiring";
    return cls;
  }

  return (
    <main className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Negotiations</h1>
          <p className="page-sub">Every RFQ in negotiation — track each round by status, then jump in to approve, negotiate, or close.</p>
        </div>
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

          <FilterGroup label="Status"        options={statusOptions}     group="status"       isOn={isOn} toggle={toggle} />
          <FilterGroup label="Business unit" options={buOptions}         group="buId"         isOn={isOn} toggle={toggle} buCode />
          <FilterGroup label="Department"    options={departmentOptions} group="departmentId" isOn={isOn} toggle={toggle} />
          <FilterGroup label="Product"       options={productOptions}    group="productId"    isOn={isOn} toggle={toggle} scrollable />
          <FilterGroup label="Vendor"        options={vendorOptions}     group="vendorId"     isOn={isOn} toggle={toggle} scrollable />
        </aside>

        {/* RIGHT — listing */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="list-toolbar">
            <div className="lt-left">
              <span className="em mono">{filtered.length}</span> of <span className="mono">{tabRows.length}</span> negotiations
            </div>
            <div className="lt-right">
              <div className="search-input" style={{ width: 280 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input className="input" placeholder="Search by title, RFQ number, hotel…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select-mini" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">Most recent</option>
                <option value="status">Status order</option>
              </select>
            </div>
          </div>

          <div className="contract-list">
            {loading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="arc-sk" style={{ display: "block", width: 110, height: 11, marginBottom: 8 }} />
                        <span className="arc-sk" style={{ display: "block", width: "55%", height: 20, marginBottom: 10 }} />
                        <div style={{ display: "flex", gap: 8 }}>
                          <span className="arc-sk" style={{ display: "block", width: 92, height: 18, borderRadius: 999 }} />
                          <span className="arc-sk" style={{ display: "block", width: 120, height: 18, borderRadius: 999 }} />
                        </div>
                      </div>
                      <span className="arc-sk" style={{ display: "block", width: 78, height: 22, borderRadius: 999, flexShrink: 0 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filtered.map((row) => {
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
                <Link key={row.rfq_id} href={detailHref(row, bucket)} className={cardClass(row)}>
                  <div className="cc-head">
                    <div className="cc-left">
                      <div className={`cc-badge ${badge}`}>
                        <BadgeIcon bucket={badge} />
                      </div>
                      <div className="cc-meta">
                        <div className="cc-title">
                          <span>{row.title || (row.is_tender ? "Tender" : "RFQ")}</span>
                          <span className="cc-num">#{row.rfq_no || row.rfq_id}</span>
                        </div>
                        <div className="cc-sub">
                          {row.hotel_name && (
                            <span><span className="mono fw-600">{buCodeFor(row.hotel_name)}</span> <span>{row.hotel_name}</span></span>
                          )}
                          {row.department_title && (<><span className="sep">·</span><span>{row.department_title}</span></>)}
                          {vendors.length > 0 && (
                            <>
                              <span className="sep">·</span>
                              <span>Vendor: <span className="em">{vendors[0]?.name}</span>{vendors.length > 1 ? ` +${vendors.length - 1}` : ""}</span>
                            </>
                          )}
                          <span className="sep">·</span>
                          <span>Round <span className="mono fw-600">{row.latest_round_number || 1}</span>{Number(row.total_rounds) > 1 ? ` of ${row.total_rounds}` : ""}</span>
                        </div>
                        {itemNames.length > 0 && (
                          <div className="cc-tags">
                            {itemNames.slice(0, 3).map((name, i) => (
                              <span key={i} className="bu-tag" title={name}><span>{name}</span></span>
                            ))}
                            {itemNames.length > 3 && (
                              <span className="bu-tag">+<span>{itemNames.length - 3}</span> more</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="cc-right">
                      <span className={`status-pill ${tone}${pulse ? " pulse" : ""}`}>
                        <span className="dot" /><span>{BUCKET_LABEL[bucket]}</span>
                      </span>
                      {(bucket === "active" || bucket === "awaiting") && invited > 0 && (
                        <span className="text-fg-3 fs-12">
                          <span className="mono fw-600 text-fg">{quoted} of {invited}</span> quoted
                        </span>
                      )}
                      {bucket === "completed" && closedDate && (
                        <span className="mono text-fg-3 fs-12">Closed {closedDate}</span>
                      )}
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

            {!loading && filtered.length === 0 && (
              <div className="empty-state">
                <div className="ic">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 9l-4 4" /><path d="M5 14l5-5" /><path d="M15 4l5 5" /><path d="M11 19l8-8" /><path d="M3 21h6" />
                  </svg>
                </div>
                <h2>No negotiations match these filters</h2>
                <p>Try removing a filter, switching tabs, or clearing the search box.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// Filter group — repeated in the sidebar; mirrors the Rate Contracts component.
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
