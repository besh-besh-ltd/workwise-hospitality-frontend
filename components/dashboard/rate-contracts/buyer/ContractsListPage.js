// Shared filterable contracts list. Used by:
//   /dashboard/buyer/rate-contracts/all
//   /dashboard/buyer/rate-contracts/drafts
//   /dashboard/buyer/rate-contracts/ongoing
//   /dashboard/buyer/rate-contracts/approved
//   /dashboard/buyer/rate-contracts/active
//   /dashboard/buyer/rate-contracts/ended
//
// Visual port of prototypes/arc_ui/buyer-contracts.html — same class names,
// same DOM hierarchy, same six filter groups (Status / BU / Category /
// Department / Product / Vendor), same card layout with badge + cc-meta +
// cc-right + cc-foot progress strips. Backend list() returns the joined +
// aggregated payload (category title, hotel name, item names, invited/
// submitted counts, awarded vendor names, committed/consumed value, call-
// off count) that powers every panel of the card.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";

// ──────────────────────────────────────────────────────────────────────────
//  Bucket mapping — the prototype groups the backend's fine-grained
//  statuses into 8 buckets that drive cards, badges, filters and sort.
// ──────────────────────────────────────────────────────────────────────────
function statusBucket(s) {
  if (!s) return "draft";
  if (s === "draft") return "draft";
  if (s === "floated" || s === "submission_closed") return "floated";
  if (
    s === "tech_eval_in_progress" ||
    s === "tech_eval_approved" ||
    s === "tech_eval_rejected" ||
    s === "comm_eval_in_progress"
  ) return "eval";
  if (s === "comm_eval_finalized" || s === "committee_review" || s === "committee_sent_back") return "committee";
  if (s === "committee_approved" || s === "contract_generated" || s === "awaiting_vendor_acceptance") return "awaiting";
  if (s === "contract_active") return "active";
  if (s === "expiring_soon") return "expiring";
  if (s === "expired" || s === "terminated" || s === "closed_no_award" || s === "committee_rejected") return "expired";
  return "draft";
}

const BUCKET_LABEL = {
  draft:     "Draft",
  floated:   "Floated",
  eval:      "In Evaluation",
  committee: "Committee Review",
  awaiting:  "Awaiting Vendor",
  active:    "Active",
  expiring:  "Expiring Soon",
  expired:   "Ended",
};

// Prototype's status-pill tone class — added to the pill element as a
// modifier so styles.css picks the right colour.
const BUCKET_TONE = {
  draft:     "draft",
  floated:   "floated",
  eval:      "eval",
  committee: "committee",
  awaiting:  "awaiting",
  active:    "active",
  expiring:  "expiring",
  expired:   "expired",
};

const BUCKET_ORDER_LIFECYCLE = {
  expiring: 0, active: 1, eval: 2, committee: 3, awaiting: 4, floated: 5, draft: 6, expired: 7,
};

const PRESET_TO_GROUP = {
  all: "all", drafts: "drafts", ongoing: "ongoing",
  approved: "approved", active: "active", ended: "ended",
};

const PRESET_LABEL = {
  all:      "All Rate Contracts",
  drafts:   "Drafts",
  ongoing:  "Ongoing Contracts",
  approved: "Approved Contracts",
  active:   "Active Contracts",
  ended:    "Ended Contracts",
};

const PRESET_SUB = {
  all:      "Search, filter and drill into every contract — by BU, category, product, vendor, or status.",
  drafts:   "Contracts you've started but not yet floated.",
  ongoing:  "Live tender lifecycle — floated, in evaluation, or under committee review.",
  approved: "Approved by committee, awaiting vendor signatures.",
  active:   "Live contracts with call-off enabled, including those expiring soon.",
  ended:    "Expired, terminated, or closed without award.",
};

// Route resolver — everything (except drafts) lands on the single lifecycle
// page; ?stage= hints jump straight to the stage matching the row's status,
// and the page itself falls back to its server-computed default stage.
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
//  Helpers — formatters & parsers
// ──────────────────────────────────────────────────────────────────────────

// Prototype's fmtL — Lakh formatting with C/L/k suffix.
function fmtL(n) {
  const v = Number(n);
  if (v == null || isNaN(v)) return "₹0";
  if (Math.abs(v) >= 1e7) return "₹" + (v / 1e7).toFixed(2) + "Cr";
  if (Math.abs(v) >= 1e5) return "₹" + (v / 1e5).toFixed(2) + "L";
  if (Math.abs(v) >= 1e3) return "₹" + (v / 1e3).toFixed(1) + "k";
  return "₹" + v.toFixed(0);
}

function fmtDate(d) {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

// Backend returns json_agg arrays as native arrays (pg-promise unwraps) or
// strings depending on driver path. Normalise.
function asArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed : []; } catch (_) { return []; }
  }
  return [];
}

// Derive a BU "code" from a hotel name — the prototype shows e.g. "BAB" /
// "Burj Al Arab". We don't store a code column, so use the initials of the
// first one or two significant words.
function buCodeFor(name) {
  if (!name) return "—";
  const parts = String(name).replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0] + (parts[2]?.[0] || "")).toUpperCase();
}

function consumptionPct(row) {
  const a = Number(row.consumed_value || 0);
  const b = Number(row.committed_value || 0);
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

// ──────────────────────────────────────────────────────────────────────────
//  Lifecycle badge — inline SVGs from the prototype, keyed by bucket.
// ──────────────────────────────────────────────────────────────────────────
function BadgeIcon({ bucket }) {
  const p = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (bucket) {
    case "active":
    case "awaiting":
      return (<svg {...p}><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>);
    case "eval":
      return (<svg {...p}><path d="M5 21h14" /><path d="M12 4v17" /><path d="M5 4l-2 5c0 2 1 3 2 3s2-1 2-3l-2-5z" /><path d="M19 4l-2 5c0 2 1 3 2 3s2-1 2-3l-2-5z" /></svg>);
    case "committee":
      return (<svg {...p}><path d="M14 9l-4 4" /><path d="M5 14l5-5" /><path d="M15 4l5 5" /><path d="M11 19l8-8" /><path d="M3 21h6" /></svg>);
    case "floated":
      return (<svg {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>);
    case "draft":
      return (<svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>);
    case "expiring":
      return (<svg {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>);
    case "expired":
      return (<svg {...p}><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>);
    default:
      return (<svg {...p}><circle cx="12" cy="12" r="10" /></svg>);
  }
}

// ──────────────────────────────────────────────────────────────────────────
//  Page component
// ──────────────────────────────────────────────────────────────────────────
// Maps each tab bucket → the lifecycle bucket keys (from statusBucket()) it
// should contain. Counts and tab-filtering both walk this map so the tab row,
// counts and filtered rows stay consistent.
const TAB_TO_BUCKETS = {
  all:      null, // no filter — show everything
  drafts:   ["draft"],
  ongoing:  ["floated", "eval", "committee"],
  approved: ["awaiting"],
  active:   ["active", "expiring"],
  ended:    ["expired"],
};

const TABS = [
  { key: "all",      label: "All" },
  { key: "drafts",   label: "Drafts" },
  { key: "ongoing",  label: "Ongoing" },
  { key: "approved", label: "Approved" },
  { key: "active",   label: "Active" },
  { key: "ended",    label: "Ended" },
];

export default function ContractsListPage({ filterPreset = "all" }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [activeTab, setActiveTab] = useState(filterPreset);
  const [filters, setFilters] = useState({
    status: [], buId: [], categoryId: [], departmentId: [], productId: [], vendorId: [],
  });

  // Keep tab in sync when the route preset changes (e.g. user lands on /active
  // directly via an old bookmark).
  useEffect(() => { setActiveTab(filterPreset); }, [filterPreset]);

  // Always fetch the full set — the tab + filter system is purely client-side
  // so users can hop between tabs without refetching, and tab counts are
  // accurate against the same data the rows render from.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    ArcApi.listContracts({ statusGroup: "all", page: 1, limit: 200 })
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data || res;
        const list = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
        setRows(list);
      })
      .catch(() => { if (!cancelled) setRows([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Count rows per tab against the full dataset (not the chip-filtered view)
  // so users see what's available before drilling in.
  const tabCounts = useMemo(() => {
    const acc = { all: rows.length };
    TABS.forEach((t) => {
      if (t.key === "all") return;
      const allow = TAB_TO_BUCKETS[t.key];
      acc[t.key] = rows.filter((r) => allow.includes(statusBucket(r.status))).length;
    });
    return acc;
  }, [rows]);

  // Rows narrowed by the active tab — feeds into the chip-filter pipeline.
  const tabRows = useMemo(() => {
    const allow = TAB_TO_BUCKETS[activeTab];
    if (!allow) return rows;
    return rows.filter((r) => allow.includes(statusBucket(r.status)));
  }, [rows, activeTab]);

  // ── derived filter options ──────────────────────────────────────────
  const statusOptions = useMemo(() => {
    const counts = {};
    tabRows.forEach((r) => {
      const b = statusBucket(r.status);
      counts[b] = (counts[b] || 0) + 1;
    });
    const order = ["active", "expiring", "floated", "eval", "committee", "awaiting", "draft", "expired"];
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

  const categoryOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      if (r.category_id == null) return;
      const k = String(r.category_id);
      const cur = map.get(k) || { key: k, label: r.category_title || `Category #${r.category_id}`, count: 0 };
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

  const productOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      const ids = asArray(r.product_variant_ids);
      const names = asArray(r.item_names);
      ids.forEach((id, idx) => {
        if (id == null) return;
        const k = String(id);
        const cur = map.get(k) || { key: k, label: names[idx] || `Variant #${id}`, count: 0 };
        cur.count += 1;
        map.set(k, cur);
      });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tabRows]);

  const vendorOptions = useMemo(() => {
    const map = new Map();
    tabRows.forEach((r) => {
      const ids = asArray(r.awarded_vendor_ids);
      const names = asArray(r.awarded_vendor_names);
      ids.forEach((id, idx) => {
        if (id == null) return;
        const k = String(id);
        const cur = map.get(k) || { key: k, label: names[idx] || `Vendor #${id}`, count: 0 };
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
      const bucket = statusBucket(r.status);
      if (filters.status.length && !filters.status.includes(bucket)) return false;
      if (filters.buId.length && !filters.buId.includes(String(r.hotel_id))) return false;
      if (filters.categoryId.length && !filters.categoryId.includes(String(r.category_id))) return false;
      if (filters.departmentId.length && !filters.departmentId.includes(String(r.department_id))) return false;
      if (filters.productId.length) {
        const ids = asArray(r.product_variant_ids).map(String);
        if (!ids.some((id) => filters.productId.includes(id))) return false;
      }
      if (filters.vendorId.length) {
        const ids = asArray(r.awarded_vendor_ids).map(String);
        if (!ids.some((id) => filters.vendorId.includes(id))) return false;
      }
      if (term) {
        const hay = `${r.title || ""} ${r.arc_number || ""} ${r.category_title || ""} ${r.hotel_name || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    if (sort === "expiry") {
      list = list.slice().sort((a, b) => {
        const ba = BUCKET_ORDER_LIFECYCLE[statusBucket(a.status)] ?? 9;
        const bb = BUCKET_ORDER_LIFECYCLE[statusBucket(b.status)] ?? 9;
        return ba - bb;
      });
    } else if (sort === "value") {
      list = list.slice().sort((a, b) => Number(b.committed_value || 0) - Number(a.committed_value || 0));
    } else {
      list = list.slice().sort((a, b) => {
        const ax = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bx = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (bx !== ax) return bx - ax;
        return String(b.id).localeCompare(String(a.id));
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
    setFilters({ status: [], buId: [], categoryId: [], departmentId: [], productId: [], vendorId: [] });
    setSearch("");
  }
  const activeFilterCount =
    filters.status.length + filters.buId.length + filters.categoryId.length +
    filters.departmentId.length + filters.productId.length + filters.vendorId.length;

  function activeChips() {
    const chips = [];
    filters.status.forEach((k) => chips.push({ group: "status", key: k, label: "Status: " + BUCKET_LABEL[k] }));
    filters.buId.forEach((k) => {
      const opt = buOptions.find((o) => o.key === k);
      chips.push({ group: "buId", key: k, label: "BU: " + (opt?.sub || opt?.label || k) });
    });
    filters.categoryId.forEach((k) => {
      const opt = categoryOptions.find((o) => o.key === k);
      chips.push({ group: "categoryId", key: k, label: "Category: " + (opt?.label || k) });
    });
    filters.departmentId.forEach((k) => {
      const opt = departmentOptions.find((o) => o.key === k);
      chips.push({ group: "departmentId", key: k, label: "Department: " + (opt?.label || k) });
    });
    filters.productId.forEach((k) => {
      const opt = productOptions.find((o) => o.key === k);
      chips.push({ group: "productId", key: k, label: "Product: " + (opt?.label || k) });
    });
    filters.vendorId.forEach((k) => {
      const opt = vendorOptions.find((o) => o.key === k);
      chips.push({ group: "vendorId", key: k, label: "Vendor: " + (opt?.label || k) });
    });
    return chips;
  }

  function cardClass(row) {
    const b = statusBucket(row.status);
    let cls = "contract-card";
    if (b === "active") cls += " is-active";
    else if (b === "expiring") cls += " is-expiring";
    return cls;
  }

  return (
    <main className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">{PRESET_LABEL[activeTab] || "Rate Contracts"}</h1>
          <p className="page-sub">{PRESET_SUB[activeTab] || PRESET_SUB.all}</p>
        </div>
        <Link href="/dashboard/buyer/rate-contracts/create" className="btn btn-blue btn-sm">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New contract
        </Link>
      </div>

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
          <FilterGroup label="Category"      options={categoryOptions}   group="categoryId"   isOn={isOn} toggle={toggle} />
          <FilterGroup label="Department"    options={departmentOptions} group="departmentId" isOn={isOn} toggle={toggle} />
          <FilterGroup label="Product"       options={productOptions}    group="productId"    isOn={isOn} toggle={toggle} scrollable />
          <FilterGroup label="Vendor"        options={vendorOptions}     group="vendorId"     isOn={isOn} toggle={toggle} scrollable />
        </aside>

        {/* RIGHT — listing */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="list-toolbar">
            <div className="lt-left">
              <span className="em mono">{filtered.length}</span> of <span className="mono">{tabRows.length}</span> contracts
            </div>
            <div className="lt-right">
              <div className="search-input" style={{ width: 280 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input className="input" placeholder="Search by title, number, category…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select-mini" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recent">Most recent</option>
                <option value="value">Highest value</option>
                <option value="expiry">Lifecycle order</option>
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
                          <span className="arc-sk" style={{ display: "block", width: 80,  height: 18, borderRadius: 999 }} />
                        </div>
                      </div>
                      <span className="arc-sk" style={{ display: "block", width: 78, height: 22, borderRadius: 999, flexShrink: 0 }} />
                    </div>
                    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <div key={j}>
                          <span className="arc-sk" style={{ display: "block", width: 70, height: 9, marginBottom: 6 }} />
                          <span className="arc-sk" style={{ display: "block", width: "75%", height: 15 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loading && filtered.map((row) => {
              const bucket = statusBucket(row.status);
              const tone = BUCKET_TONE[bucket];
              const termStart = fmtDate(row.contract_start_at);
              const termEnd = fmtDate(row.contract_end_at);
              const subEnd = fmtDate(row.submission_end_at);
              const itemNames = asArray(row.item_names);
              const awardedVendorNames = asArray(row.awarded_vendor_names);
              const pulse = bucket === "committee" || bucket === "awaiting" || bucket === "eval";
              const pct = consumptionPct(row);
              const submittedOverInvited = `${row.submitted_count || 0} of ${row.invited_count || 0}`;
              const sBar = row.invited_count
                ? Math.round((Number(row.submitted_count || 0) / Number(row.invited_count)) * 100)
                : 0;
              const href = Number(row.requested_amendments) > 0 && (bucket === "active" || bucket === "expiring")
                ? `/dashboard/buyer/rate-contracts/${row.id}?stage=active&tab=amendments`
                : detailHref(row, bucket);
              return (
                <Link key={row.id} href={href} className={cardClass(row)}>
                  <div className="cc-head">
                    <div className="cc-left">
                      <div className={`cc-badge ${bucket}`}>
                        <BadgeIcon bucket={bucket} />
                      </div>
                      <div className="cc-meta">
                        <div className="cc-title">
                          <span>{row.title || "(Untitled)"}</span>
                          <span className="cc-num">#{row.arc_number || row.id}</span>
                        </div>
                        <div className="cc-sub">
                          {row.category_title && (<><span>{row.category_title}</span><span className="sep">·</span></>)}
                          {row.hotel_name && (
                            <>
                              <span><span className="mono fw-600">{buCodeFor(row.hotel_name)}</span> <span>{row.hotel_name}</span></span>
                            </>
                          )}
                          {row.department_title && (<><span className="sep">·</span><span>{row.department_title}</span></>)}
                          {awardedVendorNames.length > 0 && (
                            <>
                              <span className="sep">·</span>
                              <span>Vendor: <span className="em">{awardedVendorNames[0]}</span>{awardedVendorNames.length > 1 ? ` +${awardedVendorNames.length - 1}` : ""}</span>
                            </>
                          )}
                          {(termStart && termEnd) && (
                            <>
                              <span className="sep">·</span>
                              <span>Term: <span>{termStart}</span> → <span>{termEnd}</span></span>
                            </>
                          )}
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
                      {Number(row.requested_amendments) > 0 && (
                        <span className="your-action" style={{ fontSize: 10, padding: "3px 9px" }}>
                          {row.requested_amendments} amendment{Number(row.requested_amendments) === 1 ? "" : "s"} pending
                        </span>
                      )}
                      {Number(row.requested_amendments) === 0 && Number(row.active_amendments) > 0 && (
                        <span className="status-pill amended" style={{ fontSize: 10.5 }}>
                          <span className="dot" />{row.active_amendments} amendment{Number(row.active_amendments) === 1 ? "" : "s"} live
                        </span>
                      )}
                      {(bucket === "active" || bucket === "expiring" || bucket === "expired") && row.committed_value > 0 && (
                        <span className="mono text-fg-3 fs-12">{fmtL(row.committed_value)} committed</span>
                      )}
                      {bucket === "floated" && row.invited_count > 0 && (
                        <span className="text-fg-3 fs-12">
                          <span className="mono fw-600 text-fg">{submittedOverInvited}</span> responses
                        </span>
                      )}
                    </div>
                  </div>
                  {(bucket === "active" || bucket === "expiring" || bucket === "expired") && row.committed_value > 0 && (
                    <div className="cc-foot">
                      <div className="flex items-center gap-3">
                        <span className="fs-12 text-fg-3">Consumption</span>
                        <div className="progress-bar">
                          <div
                            className={`fill ${pct >= 110 ? "danger" : pct >= 90 ? "warn" : ""}`}
                            style={{ width: Math.min(100, pct) + "%" }}
                          />
                        </div>
                        <span className="progress-label">
                          <span className="mono">{pct}%</span> · <span className="mono">{fmtL(row.consumed_value)}</span> of <span className="mono">{fmtL(row.committed_value)}</span>
                        </span>
                      </div>
                      {row.call_off_count > 0 && (
                        <span className="fs-12 text-fg-3">
                          <span className="mono fw-600 text-fg">{row.call_off_count}</span> call-off PO{row.call_off_count === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  )}
                  {bucket === "floated" && row.invited_count > 0 && (
                    <div className="cc-foot">
                      <div className="flex items-center gap-3">
                        <span className="fs-12 text-fg-3">Submission</span>
                        <div className="progress-bar">
                          <div className="fill warn" style={{ width: sBar + "%" }} />
                        </div>
                        <span className="progress-label">
                          <span className="mono">{submittedOverInvited}</span> vendors
                          {subEnd && (<> · closes <span className="fw-600 text-fg">{subEnd}</span></>)}
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
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                </div>
                <h2>No contracts match these filters</h2>
                <p>Try removing a filter or clearing the search box.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Filter group — repeated 6× in the sidebar. `buCode` mode shows the
//  prototype's two-line label (CODE + name). `scrollable` caps height
//  for long lists (Product / Vendor).
// ──────────────────────────────────────────────────────────────────────────
function FilterGroup({ label, options, group, isOn, toggle, buCode = false }) {
  const [expanded, setExpanded] = useState(false);
  const isEmpty = !options || options.length === 0;
  // Top 5 by count; the rest hide behind "Show more" (no scrollbar).
  const shown = expanded ? options : (options || []).slice(0, 5);
  const extra = (options ? options.length : 0) - 5;
  return (
    <div className="filter-group">
      <div className="fg-label">{label}</div>
      <div className="fg-options">
        {isEmpty ? (
          <div className="fg-empty">No options yet</div>
        ) : (
          <>
            {shown.map((opt) => (
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
