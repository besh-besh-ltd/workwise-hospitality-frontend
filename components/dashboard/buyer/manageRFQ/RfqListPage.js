// RfqListPage — the buyer RFQ management listing, redesigned to match the Rate
// Contracts listing (/dashboard/buyer/rate-contracts/all) on the shared global
// arc_v2.css primitives. Unlike that page, filtering/faceting/pagination is
// SERVER-side and authoritative (POST /rfq/list-view): the client renders only
// what the server returns. Two RFQ-specific extras vs contracts: per-row action
// buttons (View / Edit / Clone) and a lifecycle hover tooltip on the status pill
// (stage + progress + the evaluators/approvers who can act).
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import Link from "next/link";
import { useRouter } from "next/router";
import moment from "moment";
import {
  Filter, Search, ChevronLeft, ChevronRight, Eye, Pencil, Copy as CopyIcon,
  FileText, Users, Plus,
} from "lucide-react";
import { getRfqListView } from "@/services/rfq";
import { canEditRfq } from "@/utils/sharedFunctions";
import CopyRFQModal from "./CopyRFQModal";

/* ─── status / lifecycle metadata (label · tone · tooltip copy · progress) ─── */
const STAGE_TOTAL = 10;
const STATUS_META = {
  DRAFT:                     { label: "Draft", tone: "draft", order: 0, desc: "Still a draft — not yet submitted for publishing." },
  RFQ_APPROVAL:              { label: "RFQ Approval", tone: "floated", order: 1, desc: "Awaiting approval before the RFQ is published to vendors." },
  AWAITING_QUOTES:           { label: "Awaiting Quotes", tone: "floated", order: 2, desc: "Published — waiting for vendors to submit their quotes." },
  TECHNICAL_AWAITING_QUOTES: { label: "Awaiting Quotes", tone: "floated", order: 2, desc: "Technical evaluation configured; waiting on vendor submissions." },
  TECHNICAL_EVALUATING:      { label: "Technical Evaluation", tone: "eval", order: 3, desc: "Vendors submitted — technical evaluation is in progress." },
  TECHNICAL_APPROVING:       { label: "Technical Approval", tone: "committee", order: 4, desc: "Technical evaluation done — awaiting technical approval." },
  TECHNICAL_REJECTED:        { label: "Technical Rejected", tone: "expiring", order: 3, desc: "Technical evaluation was rejected — it needs rework." },
  RFQ_STUCK_TECHNICAL:       { label: "Stuck · Technical", tone: "expiring", order: 3, desc: "All evaluated vendors failed technical evaluation." },
  RFQ_STUCK_COMMERCIAL:      { label: "Stuck · No Vendors", tone: "expiring", order: 2, desc: "The bid window closed with no eligible vendors." },
  COMMERCIAL_EVALUATION:     { label: "Commercial Evaluation", tone: "committee", order: 5, desc: "All products have technically cleared vendors, ready for commercial review." },
  NEGOTIATION_ONGOING:       { label: "Negotiation", tone: "eval", order: 6, desc: "A negotiation round is currently active with vendors." },
  QUOTATION_APPROVAL:        { label: "Quote Approval", tone: "committee", order: 7, desc: "Finalized quotes are awaiting approval." },
  AWAITING_PO:               { label: "Awaiting PO", tone: "awaiting", order: 8, desc: "Quotes finalized — purchase orders can now be raised." },
  PO_APPROVAL:               { label: "PO Approval", tone: "committee", order: 9, desc: "Purchase orders are pending approval." },
  PO_VENDOR_REJECTED:        { label: "PO Vendor Rejected", tone: "expiring", order: 8, desc: "A vendor rejected the purchase order." },
  APPROVED_COMPLETED:        { label: "Completed", tone: "active", order: 10, desc: "All purchase orders approved — this RFQ is complete." },
  CLOSED:                    { label: "Closed", tone: "expired", order: 0, desc: "This RFQ has been closed." },
  WITHDRAWN:                 { label: "Withdrawn", tone: "draft", order: 0, desc: "The publish request was withdrawn — back in draft." },
};
const metaFor = (key) => STATUS_META[key] || { label: key || "—", tone: "draft", order: 0, desc: "" };

const TABS = [
  { key: "all", label: "All" },
  { key: "drafts", label: "Drafts" },
  { key: "ongoing", label: "Ongoing" },
  { key: "approved", label: "Approved" },
  { key: "closed", label: "Closed" },
];

const FACETS = [
  { group: "status", label: "Status" },
  { group: "buId", label: "Business Unit" },
  { group: "categoryId", label: "Category" },
  { group: "departmentId", label: "Department" },
  { group: "productId", label: "Product" },
  { group: "vendorId", label: "Vendor" },
];
const EMPTY_FILTERS = { status: [], buId: [], categoryId: [], departmentId: [], productId: [], vendorId: [] };

const fmtDate = (d) => (d ? moment(d).format("DD MMM YYYY") : "—");

/* ─── lifecycle hover tooltip (the RFQ-specific extra) — compact + theme-aligned ─── */
const TONE_DOT = { draft: "#71717a", active: "#16a34a", expiring: "#b45309", eval: "#b45309", committee: "#7c3aed", awaiting: "#4338ca", floated: "#2563eb", expired: "#a1a1aa" };

function LifecycleTooltip({ statusKey, actionHolders, anchor }) {
  if (!anchor || typeof document === "undefined") return null;
  const meta = metaFor(statusKey);
  const dot = TONE_DOT[meta.tone] || "#6366f1";
  const segs = 12;
  const filled = Math.max(0, Math.min(segs, Math.round((meta.order / STAGE_TOTAL) * segs)));
  const users = Array.isArray(actionHolders?.users) ? actionHolders.users : [];
  const W = 280;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const left = Math.max(8, Math.min(anchor.right - W, vw - W - 8));
  // Prefer above when there's more room there; anchor the tooltip's BOTTOM 8px
  // above the pill (via `bottom`) so it can never cover the pill — no height
  // estimation needed. Otherwise drop it 8px below.
  const above = anchor.top > (vh - anchor.bottom);
  const pos = above ? { bottom: Math.max(8, vh - anchor.top + 8) } : { top: anchor.bottom + 8 };

  return createPortal(
    <div style={{ position: "fixed", left, ...pos, zIndex: 4000, width: W, background: "#fff", border: "1px solid #ebebe6", borderRadius: 11, boxShadow: "0 10px 30px -10px rgba(15,15,14,0.22), 0 2px 8px rgba(15,15,14,0.06)", overflow: "hidden", pointerEvents: "none" }}>
      <div style={{ padding: "11px 13px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: dot, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#18181b", letterSpacing: "-0.01em" }}>{meta.label}</span>
        </div>
        {meta.desc && <div style={{ fontSize: 11.5, color: "#71717a", lineHeight: 1.45 }}>{meta.desc}</div>}
      </div>
      {meta.order > 0 && (
        <div style={{ padding: "9px 13px", borderTop: "1px solid #f4f4f1" }}>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: segs }).map((_, i) => (
              <span key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < filled ? dot : "#ececec" }} />
            ))}
          </div>
        </div>
      )}
      {users.length > 0 && (
        <div style={{ padding: "9px 13px 11px", borderTop: "1px solid #f4f4f1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#a1a1aa", marginBottom: 7 }}>
            <Users size={11} strokeWidth={2} />
            {actionHolders?.label || "Who can act"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 12px" }}>
            {users.slice(0, 8).map((u, i) => (
              <div key={u.id || i} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <span style={{ width: 5, height: 5, borderRadius: 99, background: "#16a34a", flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: "#3f3f46", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</span>
              </div>
            ))}
            {users.length > 8 && <span style={{ fontSize: 11, color: "#a1a1aa" }}>+{users.length - 8} more</span>}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

/* ─── status pill that opens the lifecycle tooltip on hover ─── */
function StatusPill({ statusKey, actionHolders }) {
  const [anchor, setAnchor] = useState(null);
  const ref = useRef(null);
  const meta = metaFor(statusKey);
  const open = () => { if (ref.current) setAnchor(ref.current.getBoundingClientRect()); };
  return (
    <>
      <span
        ref={ref}
        className={`status-pill ${meta.tone}`}
        style={{ cursor: "default" }}
        onMouseEnter={open}
        onMouseLeave={() => setAnchor(null)}
      >
        <span className="dot" />
        {meta.label}
        {Array.isArray(actionHolders?.users) && actionHolders.users.length > 0 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 4, opacity: 0.85 }}>
            <Users size={11} strokeWidth={2} />{actionHolders.users.length}
          </span>
        )}
      </span>
      {anchor && <LifecycleTooltip statusKey={statusKey} actionHolders={actionHolders} anchor={anchor} />}
    </>
  );
}

/* ─── one facet group in the left sidebar ─── */
const FACET_COLLAPSED = 5;
function FilterGroup({ label, group, options, selected, onToggle, mapLabel }) {
  const [expanded, setExpanded] = useState(false);
  if (!options || options.length === 0) return null;
  // Top-N by count (server already sorts desc); the rest hide behind "Show more"
  // so long facets never need a scrollbar.
  const shown = expanded ? options : options.slice(0, FACET_COLLAPSED);
  const extra = options.length - FACET_COLLAPSED;
  return (
    <div className="filter-group">
      <div className="fg-label">{label}</div>
      <div className="fg-options">
        {shown.map((opt) => {
          const text = mapLabel ? mapLabel(opt.key) : (opt.label || opt.key);
          const on = selected.includes(String(opt.key));
          return (
            <label key={opt.key} className="filter-opt" title={text}>
              <input type="checkbox" checked={on} onChange={() => onToggle(group, String(opt.key))} />
              <span className="fo-box" />
              <span className="fo-text">{text}</span>
              <span className="fo-count">{opt.count}</span>
            </label>
          );
        })}
        {extra > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            style={{ marginTop: 5, padding: "3px 2px", background: "none", border: "none", color: "var(--primary, #2563eb)", fontSize: 12, fontWeight: 500, cursor: "pointer", textAlign: "left", width: "fit-content" }}
          >
            {expanded ? "Show less" : `Show ${extra} more`}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── main page ─── */
export default function RfqListPage() {
  const router = useRouter();
  const currentUser = useSelector((state) => state.userProfile);
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);

  const [resp, setResp] = useState({ rows: [], facets: {}, tab_counts: {}, total: 0, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [cloneRfq, setCloneRfq] = useState(null);
  const seq = useRef(0);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch whenever any query input changes (server is authoritative).
  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    getRfqListView({ tab, search: debounced, sort, filters, page, limit: 20 })
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

  const { rows, facets, tab_counts, total, limit } = resp;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <main className="main-body">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 className="page-h1">RFQ Management</h1>
          <div className="page-sub">Track and manage every RFQ across its lifecycle.</div>
        </div>
        <Link href="/dashboard/buyer/start-rfq" className="btn btn-blue btn-sm">
          <Plus size={14} strokeWidth={2.4} /> New RFQ
        </Link>
      </div>

      {/* Tabs sit above the whole filter + listing layout (matches contracts). */}
      <div className="tab-row">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`tab ${tab === t.key ? "active" : ""}`} onClick={() => { setTab(t.key); setPage(1); }}>
            {t.label}
            <span className="ct">{tab_counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="contracts-layout">
        {/* LEFT — facet sidebar */}
        <aside className="filter-sidebar">
          <div className="fs-head">
            <h3 style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontSize: 13.5, fontWeight: 600 }}>
              <Filter size={14} strokeWidth={2} /> Filters
            </h3>
            {activeCount > 0 && <button type="button" className="reset-link" onClick={resetAll}>Reset</button>}
          </div>
          <div>
            {FACETS.map((f) => (
              <FilterGroup
                key={f.group}
                label={f.label}
                group={f.group}
                options={facets[f.group] || []}
                selected={filters[f.group] || []}
                onToggle={toggle}
                mapLabel={f.group === "status" ? (k) => metaFor(k).label : undefined}
              />
            ))}
            {FACETS.every((f) => !(facets[f.group] || []).length) && !loading && (
              <div style={{ fontSize: 12.5, color: "#a1a1aa", padding: "10px 2px" }}>No filters available.</div>
            )}
          </div>
        </aside>

        {/* RIGHT — toolbar + rows + pagination */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="list-toolbar">
            <div className="lt-left">
              <span className="em">{total}</span> {total === 1 ? "RFQ" : "RFQs"}
            </div>
            <div className="lt-right">
              <div className="search-input">
                <Search size={14} strokeWidth={2} />
                <input className="input" placeholder="Search by title or number…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select-mini" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                <option value="recent">Most recent</option>
                <option value="oldest">Oldest first</option>
                <option value="deadline">Quote deadline</option>
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
                          <span className="arc-sk" style={{ display: "block", width: 72, height: 18, borderRadius: 999 }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 9, flexShrink: 0 }}>
                      <span className="arc-sk" style={{ display: "block", width: 124, height: 22, borderRadius: 999 }} />
                      <span className="arc-sk" style={{ display: "block", width: 66, height: 11 }} />
                      <span className="arc-sk" style={{ display: "block", width: 132, height: 28, borderRadius: 8 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="empty-state" style={{ padding: "56px 24px" }}>
              <h2>No RFQs found</h2>
              <p>{activeCount > 0 || debounced ? "Try clearing some filters or your search." : "Create your first RFQ to get started."}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rows.map((r) => <RfqRow key={r.id} row={r} currentUser={currentUser} onClone={() => setCloneRfq(r)} />)}
            </div>
          )}

          {totalPages > 1 && !loading && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft size={14} strokeWidth={2} />
              </button>
              <span style={{ fontSize: 12.5, color: "#71717a", padding: "0 8px" }}>Page {page} of {totalPages}</span>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight size={14} strokeWidth={2} />
              </button>
            </div>
          )}
        </div>
      </div>

      <CopyRFQModal show={!!cloneRfq} onClose={() => setCloneRfq(null)} sourceRfq={cloneRfq} />
    </main>
  );
}

/* ─── one RFQ row (card) ─── */
function RfqRow({ row, onClone, currentUser }) {
  const meta = metaFor(row.status_key);
  const cats = Array.isArray(row.categories) ? row.categories : [];
  const products = Array.isArray(row.products) ? row.products : [];
  const detailHref = `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${row.id}`;
  const edit = canEditRfq(row, currentUser); // same gate the detail/edit page uses

  return (
    <div className={`contract-card is-${meta.tone}`}>
      <div className="cc-head">
        <div className="cc-left">
          <div className={`cc-badge ${meta.tone}`}><FileText size={20} strokeWidth={2} /></div>
          <div className="cc-meta">
            <div className="cc-title">
              <Link href={detailHref} style={{ color: "inherit", textDecoration: "none" }}>{row.title || `RFQ #${row.rfq_no}`}</Link>
              <span className="cc-num">#{row.rfq_no}</span>
            </div>
            <div className="cc-sub">
              {cats.length > 0 && <><span className="em">{cats.map((c) => c.title).join(", ")}</span><span className="sep">·</span></>}
              {row.hotel_name && <><span>{row.hotel_name}</span><span className="sep">·</span></>}
              {row.department_title && <><span>{row.department_title}</span><span className="sep">·</span></>}
              <span>Created {fmtDate(row.timestamp)}</span>
              {row.bid_end_date && <><span className="sep">·</span><span>Closes {fmtDate(row.bid_end_date)}</span></>}
            </div>
            {products.length > 0 && (
              <div className="cc-tags">
                {products.slice(0, 4).map((p) => <span key={p.id} className="bu-tag">{p.name}</span>)}
                {products.length > 4 && <span className="bu-tag">+{products.length - 4} more</span>}
              </div>
            )}
          </div>
        </div>
        {/* Status pill stays top-right; quotes + actions sit at the bottom-right. */}
        <div className="cc-right" style={{ alignSelf: "stretch", justifyContent: "space-between" }}>
          <StatusPill statusKey={row.status_key} actionHolders={row.action_holders} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
            <div style={{ fontSize: 12, color: "var(--fg-3, #71717a)" }}>
              <span className="mono fw-600">{row.submitted_count ?? 0}</span>/{row.invited_count ?? 0} quotes
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <Link href={detailHref} className="btn btn-secondary btn-sm" title="View"><Eye size={13} strokeWidth={2} /> View</Link>
              {edit.allowed ? (
                <Link href={`/dashboard/buyer/rfq-management-edit?id=${row.id}`} className="btn btn-secondary btn-sm" title="Edit"><Pencil size={13} strokeWidth={2} /></Link>
              ) : (
                // Custom tooltip (immediate on hover) — same pattern as EditRfqButton.
                // The d-inline-block span is the hover target since the disabled
                // button doesn't fire mouse events.
                <OverlayTrigger placement="top" overlay={<Tooltip id={`edit-disabled-${row.id}`}>{edit.reason}</Tooltip>}>
                  <span className="d-inline-block">
                    <button type="button" className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.55, cursor: "not-allowed" }}><Pencil size={13} strokeWidth={2} /></button>
                  </span>
                </OverlayTrigger>
              )}
              <button type="button" className="btn btn-secondary btn-sm" title="Clone" onClick={onClone}><CopyIcon size={13} strokeWidth={2} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
