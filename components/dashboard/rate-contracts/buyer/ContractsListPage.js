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

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import Link from "next/link";
import * as ArcApi from "@/services/arc_v2";
import { fyToRange, currentFyRange, defaultFyState } from "@/utils/financialYear";
import FyFilter from "@/components/shared/FyFilter";

// ──────────────────────────────────────────────────────────────────────────
//  Bucket mapping — the prototype groups the backend's fine-grained
//  statuses into 8 buckets that drive cards, badges, filters and sort.
// ──────────────────────────────────────────────────────────────────────────
function statusBucket(s) {
  if (!s) return "draft";
  if (s === "draft") return "draft";
  // Pre-live publish-approval states sit under the Drafts tab (creator-owned,
  // not yet floated). A finer per-row chip label distinguishes them below.
  if (s === "pending_publish_approval" || s === "publish_rejected") return "draft";
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

// Finer per-row chip override for the two publish-approval states (they share
// the "draft" bucket but deserve a distinct label + tone on the card).
function statusChipOverride(status) {
  if (status === "pending_publish_approval") return { label: "Pending approval", tone: "committee" };
  if (status === "publish_rejected")         return { label: "Publish rejected", tone: "expired" };
  return null;
}

const PRESET_TO_GROUP = {
  all: "all", drafts: "drafts", ongoing: "ongoing",
  approved: "approved", active: "active", ended: "ended",
};

const PRESET_LABEL = {
  all:      "All Rate Contracts",
  pending:  "Pending for me",
  drafts:   "Drafts",
  ongoing:  "Ongoing Contracts",
  approved: "Approved Contracts",
  active:   "Active Contracts",
  ended:    "Ended Contracts",
};

const PRESET_SUB = {
  all:      "Search, filter and drill into every contract — by BU, category, product, vendor, or status.",
  pending:  "Rate contracts waiting on your approval right now.",
  drafts:   "Contracts you've started but not yet floated.",
  ongoing:  "Live tender lifecycle — floated, in evaluation, or under committee review.",
  approved: "Approved by committee, awaiting vendor signatures.",
  active:   "Live contracts with released-PO enabled, including those expiring soon.",
  ended:    "Expired, terminated, or closed without award.",
};

// Route resolver — everything (except drafts) lands on the single lifecycle
// page; ?stage= hints jump straight to the stage matching the row's status,
// and the page itself falls back to its server-computed default stage.
function detailHref(row, bucket) {
  // Publish-approval states land on the overview (pending chain / rejection
  // reason + re-publish), NOT the edit wizard.
  if (row.status === "pending_publish_approval" || row.status === "publish_rejected")
    return `/dashboard/buyer/rate-contracts/${row.id}`;
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
//  Awarded-vendor hover tooltip — portal popover listing each awarded vendor
//  with their company name. Positioned above the trigger when there's more
//  room there, else below; never covers the trigger.
// ──────────────────────────────────────────────────────────────────────────
function VendorTooltip({ vendors, anchor }) {
  if (!anchor || typeof document === "undefined") return null;
  const W = 264;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.max(8, Math.min(anchor.left, vw - W - 8));
  const above = anchor.top > (vh - anchor.bottom);
  const pos = above ? { bottom: Math.max(8, vh - anchor.top + 8) } : { top: anchor.bottom + 8 };
  const shown = vendors.slice(0, 10);
  const extra = vendors.length - shown.length;
  return createPortal(
    <div style={{ position: "fixed", left, ...pos, zIndex: 4000, width: W, background: "#fff", border: "1px solid #ebebe6", borderRadius: 11, boxShadow: "0 10px 30px -10px rgba(15,15,14,0.22), 0 2px 8px rgba(15,15,14,0.06)", overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ padding: "9px 13px", borderBottom: "1px solid #f4f4f1", fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#a1a1aa" }}>
        Awarded vendor{vendors.length === 1 ? "" : "s"} · {vendors.length}
      </div>
      <div style={{ padding: "6px 0" }}>
        {shown.map((v, i) => (
          <div key={v.id ?? i} style={{ padding: "5px 13px", display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: "#18181b", lineHeight: 1.3 }}>{v.name || `Vendor #${v.id}`}</span>
            {v.company ? <span style={{ fontSize: 11, color: "#71717a", lineHeight: 1.3 }}>{v.company}</span> : null}
          </div>
        ))}
        {extra > 0 && <div style={{ padding: "4px 13px 2px", fontSize: 11, color: "#a1a1aa" }}>+{extra} more</div>}
      </div>
      <div style={{ padding: "8px 13px", borderTop: "1px solid #f4f4f1", fontSize: 10.5, fontWeight: 500, color: "var(--primary)" }}>
        Click to open the Commercial tab →
      </div>
    </div>,
    document.body,
  );
}

// "Vendor: Name +N" cell — hover shows the awarded-vendor tooltip (names +
// companies); click jumps straight to the contract's Commercial stage
// (intercepting the row-level <Link>, which would otherwise open the default
// stage).
function VendorCell({ vendors, commercialHref }) {
  const router = useRouter();
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);
  if (!vendors.length) return null;
  const primary = vendors[0]?.name || `Vendor #${vendors[0]?.id}`;
  const go = (e) => { e.preventDefault(); e.stopPropagation(); setAnchor(null); router.push(commercialHref); };
  return (
    <span
      ref={ref}
      role="button"
      tabIndex={0}
      title=""
      onMouseEnter={() => { if (ref.current) setAnchor(ref.current.getBoundingClientRect()); }}
      onMouseLeave={() => setAnchor(null)}
      onClick={go}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") go(e); }}
      style={{ cursor: "pointer" }}
    >
      Vendor: <span className="em">{primary}</span>{vendors.length > 1 ? ` +${vendors.length - 1}` : ""}
      {anchor && <VendorTooltip vendors={vendors} anchor={anchor} />}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
//  Page component
// ──────────────────────────────────────────────────────────────────────────
// Maps each tab bucket → the lifecycle bucket keys (from statusBucket()) it
// should contain. Counts and tab-filtering both walk this map so the tab row,
// counts and filtered rows stay consistent.
const TAB_TO_BUCKETS = {
  all:      null,    // no filter — show everything
  pending:  "@pending", // special — rows where pending_for_user is true
  drafts:   ["draft"],
  ongoing:  ["floated", "eval", "committee"],
  approved: ["awaiting"],
  active:   ["active", "expiring"],
  ended:    ["expired"],
};

const TABS = [
  { key: "all",      label: "All" },
  { key: "pending",  label: "Pending for me" },
  { key: "drafts",   label: "Drafts" },
  { key: "ongoing",  label: "Ongoing" },
  { key: "approved", label: "Approved" },
  { key: "active",   label: "Active" },
  { key: "ended",    label: "Ended" },
];

export default function ContractsListPage({ filterPreset = "all" }) {
  // Default view is scoped to the current financial year; the user can switch to
  // another FY, a custom range, or "All financial years" in the FY filter.
  const [filters, setFilters] = useState(() => {
    const r = currentFyRange();
    return { status: [], buId: [], categoryId: [], departmentId: [], productId: [], vendorId: [], dateFrom: r.from, dateTo: r.to };
  });
  const [fy, setFy] = useState(defaultFyState());
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("recent");
  const [activeTab, setActiveTab] = useState(filterPreset);
  const [page, setPage] = useState(1);
  const [resp, setResp] = useState({ rows: [], facets: {}, tab_counts: {}, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);

  // Keep tab in sync when the route preset changes (e.g. user lands on /active
  // directly via an old bookmark).
  useEffect(() => { setActiveTab(filterPreset); setPage(1); }, [filterPreset]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Server is authoritative (POST /arc-v2/list-view): tabs, faceting, search,
  // sort and pagination are all computed server-side — refetch on any change.
  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    ArcApi.getContractsListView({ tab: activeTab, search: debounced, sort, filters, page, limit: 20 })
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
  }, [activeTab, debounced, sort, filters, page]);

  const { facets, tab_counts: tabCounts, total } = resp;
  const filtered = resp.rows;
  const totalPages = Math.max(1, Math.ceil(total / (resp.limit || 20)));

  // ── filter options come straight from the server facets (already counted
  //    over the tab scope, OR-within / AND-across) ─────────────────────
  const statusOptions = facets.status || [];
  const buOptions = useMemo(() => (facets.buId || []).map((o) => ({ ...o, sub: buCodeFor(o.label) })), [facets.buId]);
  const categoryOptions = facets.categoryId || [];
  const departmentOptions = facets.departmentId || [];
  const productOptions = facets.productId || [];
  const vendorOptions = facets.vendorId || [];

  // ── mutators ───────────────────────────────────────────────────────
  function toggle(group, key) {
    setPage(1);
    setFilters((f) => {
      const cur = f[group] || [];
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      return { ...f, [group]: next };
    });
  }
  function isOn(group, key) { return (filters[group] || []).includes(key); }
  function resetAll() {
    const r = currentFyRange();
    setFilters({ status: [], buId: [], categoryId: [], departmentId: [], productId: [], vendorId: [], dateFrom: r.from, dateTo: r.to });
    setFy(defaultFyState());
    setSearch("");
  }
  const activeFilterCount =
    filters.status.length + filters.buId.length + filters.categoryId.length +
    filters.departmentId.length + filters.productId.length + filters.vendorId.length +
    (filters.dateFrom || filters.dateTo ? 1 : 0);
  function applyFy(next) {
    setFy(next);
    setPage(1);
    const range = next.mode === "fy" ? fyToRange(next.fy)
                : next.mode === "custom" ? { from: next.from || "", to: next.to || "" }
                : { from: "", to: "" };
    setFilters((f) => ({ ...f, dateFrom: range.from, dateTo: range.to }));
  }

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
    if (row.action_required) cls += " needs-action";
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
        <div className="flex items-center gap-2">
          <Link href="/dashboard/buyer/rate-contracts/manual-entry" className="btn btn-secondary btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
            Manual entry
          </Link>
          <Link href="/dashboard/buyer/rate-contracts/create" className="btn btn-blue btn-sm">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New contract
          </Link>
        </div>
      </div>

      <div className="tab-row">
        {TABS.map((t) => (
          <button key={t.key}
                  type="button"
                  className={"tab" + (activeTab === t.key ? " active" : "")}
                  onClick={() => { setActiveTab(t.key); setPage(1); }}>
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
          {(filters.dateFrom || filters.dateTo) && (
            <span className="af-chip">
              <span>{fy.mode === "fy" ? "FY " + fy.fy : "Created: " + (filters.dateFrom || "…") + " → " + (filters.dateTo || "…")}</span>
              <button type="button" className="x-btn" onClick={() => applyFy({ mode: "none", fy: "", from: "", to: "" })} aria-label="Remove">×</button>
            </span>
          )}
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
          <FyFilter value={fy} onChange={applyFy} />
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
              <span className="em mono">{total}</span> {total === 1 ? "contract" : "contracts"}
            </div>
            <div className="lt-right">
              <div className="search-input" style={{ width: 280 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input className="input" placeholder="Search by title, number, category…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select-mini" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
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
              const chipOverride = statusChipOverride(row.status);
              const tone = chipOverride ? chipOverride.tone : BUCKET_TONE[bucket];
              const chipLabel = chipOverride ? chipOverride.label : BUCKET_LABEL[bucket];
              const termStart = fmtDate(row.contract_start_at);
              const termEnd = fmtDate(row.contract_end_at);
              const subEnd = fmtDate(row.submission_end_at);
              const itemNames = asArray(row.item_names);
              const awardedVendorNames = asArray(row.awarded_vendor_names);
              // Paired {id,name,company} objects for the hover tooltip; fall
              // back to name+id pairs if the backend didn't supply the objects.
              const awardedVendors = (() => {
                const objs = asArray(row.awarded_vendors);
                if (objs.length) return objs;
                const ids = asArray(row.awarded_vendor_ids);
                return awardedVendorNames.map((name, i) => ({ id: ids[i], name }));
              })();
              const commercialHref = `/dashboard/buyer/rate-contracts/${row.id}?stage=commercial`;
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
                          {row.action_required && row.action_label && (
                            <span className="needs-action-pill">{row.action_label}</span>
                          )}
                        </div>
                        <div className="cc-sub">
                          {row.category_title && (<><span>{row.category_title}</span><span className="sep">·</span></>)}
                          {row.hotel_name && (
                            <>
                              <span><span className="mono fw-600">{buCodeFor(row.hotel_name)}</span> <span>{row.hotel_name}</span></span>
                            </>
                          )}
                          {row.department_title && (<><span className="sep">·</span><span>{row.department_title}</span></>)}
                          {awardedVendors.length > 0 && (
                            <>
                              <span className="sep">·</span>
                              <VendorCell vendors={awardedVendors} commercialHref={commercialHref} />
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
                        <span className="dot" /><span>{chipLabel}</span>
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
                          <span className="mono">{pct}%</span> · <span className="mono">{fmtL(row.consumed_value)}</span> of <span className="mono">{fmtL(row.committed_value)}</span> committed <span className="text-fg-4">(excl. taxes)</span>
                        </span>
                      </div>
                      {row.call_off_count > 0 && (
                        <span className="fs-12 text-fg-3">
                          <span className="mono fw-600 text-fg">{row.call_off_count}</span> Released PO{row.call_off_count === 1 ? "" : "s"}
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

          {totalPages > 1 && !loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
              <span style={{ fontSize: 12.5, color: "#71717a", padding: "0 8px" }}>Page {page} of {totalPages}</span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
            </div>
          )}
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
