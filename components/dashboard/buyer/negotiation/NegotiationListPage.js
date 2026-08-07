// Negotiation landing list — server-authoritative (POST /negotiation/list-view).
// Search, faceting, filtering, sorting and pagination are all computed
// server-side; the client renders only what the server returns. Mirrors the
// RFQ Management listing (RfqListPage) on the shared arc_v2.css primitives,
// plus a "Needs my approval" toggle driven by NEGOTIATION /
// NEGOTIATION_QUOTE approvals waiting on the current user.
//
// ── RFQ-FIRST ──────────────────────────────────────────────────────────────
// This list is at the PARENT grain: one row per RFQ, one per rate contract.
// It used to be one row per negotiation round, and production carries 886
// rounds across 124 RFQs (median 2 rounds, max 138) — RFQ 512 alone filled
// seven pages with rows a reader could only tell apart by their round number.
// Collapsed, the same data is 124 rows over 7 pages, and every question a
// buyer actually asks ("how much did this RFQ save?", "how many rounds did it
// take?", "is anything waiting on me?") is answerable from one row.
//
// The round grain has not gone anywhere: it is the same endpoint with
// `groupBy: 'round'`, and it is what the per-RFQ page (level 2) renders.

import { useEffect, useMemo, useRef, useState } from "react";
import { getNegotiationListView } from "@/services/negotiation";
import {
  NEG_STATE_PRESENTATION,
  NEG_STATE_GROUPS,
} from "./round-detail/negotiationStates";
import ParentCard from "./list/ParentCard";

// ── the seven states ───────────────────────────────────────────────────────
// Labels, descriptions and tones all come from the shared table so this list
// and the round-detail page cannot drift apart again.
//
// The tabs bucket on the parent's ROLL-UP state (`neg_status`), which is the
// state of its most urgent round. That is what makes the tab counts sum to the
// total and keeps any one RFQ off two tabs at once.
//
// "Pending for me" used to sit in this row as if it were a state. It is not —
// it is a property of whoever is looking, and an RFQ can be "Awaiting your
// approval" AND waiting on someone else. It is now the toggle below the tabs.
// Three tabs, not eight. The seven state labels are sentence-length and the
// strip wrapped onto a second line on an ordinary laptop; per user the median
// number of NON-EMPTY status tabs was 2. The seven states are still filterable
// individually — they moved to the Status facet in the sidebar, where the
// per-state counts live alongside every other facet.
const TABS = [
  { key: "all", label: "All" },
  ...NEG_STATE_GROUPS.map((g) => ({ key: g.key, label: g.label })),
];

// The RFQ facet is gone: at this grain every row IS an RFQ, so it offered 124
// single-count options next to 124 rows.
//
// Status is BACK as a facet. It was removed when the tab strip partitioned the
// same field state-by-state; now that the strip carries three groups, this is
// the only place the seven per-state counts exist. The server has always
// emitted facets.status and always honoured filters.status — only the UI went
// away.
const FACETS = [
  { group: "status", label: "Status" },
  { group: "buId", label: "Business unit" },
  { group: "departmentId", label: "Department" },
  { group: "productId", label: "Product" },
  { group: "vendorId", label: "Vendor" },
];
const EMPTY_FILTERS = { status: [], buId: [], departmentId: [], productId: [], vendorId: [] };
/* ─── facet group (server provides {key,label,count}) ─── */
const FACET_COLLAPSED = 5;
// Facets with more than this many options get a debounced in-group search box
// (Vendor / Product), so long lists stay navigable.
const FACET_SEARCHABLE = 8;

function FilterGroup({ label, group, options, selected, onToggle, optionTitle }) {
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
    <div className="filter-group" data-testid={`facet-${group}`}>
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
            <label key={opt.key} className="filter-opt" title={(optionTitle && optionTitle(opt)) || opt.label || opt.key}>
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
  const ROWS = [4, 3, 5, 5];
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

/** What the total is counting, in the unit the source tab selected. */
function totalLabel(total, source) {
  const one = total === 1;
  if (source === "ARC") return one ? "rate contract" : "rate contracts";
  if (source === "RFQ") return one ? "RFQ" : "RFQs";
  return one ? "RFQ or rate contract" : "RFQs & rate contracts";
}

// ── page ────────────────────────────────────────────────────────────────────
export default function NegotiationListPage() {
  const [tab, setTab] = useState("all");
  // Orthogonal to `tab`: "needs my approval" is a fact about the viewer, not a
  // state of the RFQ, so it composes with any status tab instead of replacing
  // it. Sent to the server as `needsMyApproval`; the legacy `tab: "for_me"`
  // form is still sent when no status tab is chosen so the toggle keeps
  // working against a server that has not been updated yet.
  const [needsMyApproval, setNeedsMyApproval] = useState(false);
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
    getNegotiationListView({
      // Explicit, not inherited from the server default: this page renders
      // parent rows and would render nothing legible from round rows.
      groupBy: "parent",
      tab: needsMyApproval && tab === "all" ? "for_me" : tab,
      needsMyApproval,
      source,
      search: debounced,
      sort,
      filters,
      page,
      limit: 20,
    })
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
  }, [tab, needsMyApproval, source, debounced, sort, filters, page]);

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
          <p className="page-sub">
            Every RFQ with a negotiation — rounds, vendor participation, approvals and what it saved.
          </p>
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
          <button
            key={t.key}
            type="button"
            className={"tab" + (tab === t.key ? " active" : "")}
            title={
              t.key === "all"
                ? "Every RFQ in negotiation you can see."
                : `${(NEG_STATE_GROUPS.find((g) => g.key === t.key)?.members || new Set())
                      .size ? [...NEG_STATE_GROUPS.find((g) => g.key === t.key).members]
                        .map((k) => NEG_STATE_PRESENTATION[k].label).join(" · ") : ""}. An RFQ appears under the state of its most urgent round.`
            }
            onClick={() => { setTab(t.key); setPage(1); }}
          >
            {t.label} <span className="ct">{tab_counts[t.key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Orthogonal to the tabs above — an RFQ's state and whether it is
          waiting on YOU are two different questions. */}
      <div className="list-toolbar" style={{ marginBottom: 4 }}>
        <label
          className="filter-opt"
          style={{ cursor: "pointer", margin: 0 }}
          title="Only RFQs where an approval step is currently assigned to you."
          data-testid="needs-my-approval-toggle"
        >
          <input
            type="checkbox"
            checked={needsMyApproval}
            onChange={() => { setNeedsMyApproval((v) => !v); setPage(1); }}
          />
          <span className="fo-box" />
          <span className="fo-text">Needs my approval</span>
          <span className="fo-count">{tab_counts.for_me ?? 0}</span>
        </label>
        <span className="fs-12 text-fg-3">
          Statuses describe the RFQ. This describes you — combine it with any tab.
        </span>
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
                  <FilterGroup
                    key={f.group}
                    label={f.label}
                    group={f.group}
                    options={facets[f.group] || []}
                    selected={filters[f.group] || []}
                    onToggle={toggle}
                    // The status options carry each state's own description, so
                    // the explanatory copy the legend used to hold is still one
                    // hover away instead of being a second collapsed panel.
                    optionTitle={f.group === "status"
                      ? (opt) => NEG_STATE_PRESENTATION[opt.key]?.description
                      : undefined}
                  />
                ))}
                {!hasFacets && <div style={{ fontSize: 12.5, color: "#a1a1aa", padding: "10px 2px" }}>No filters available.</div>}
              </>
            )}
          </div>
        </aside>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="list-toolbar">
            <div className="lt-left"><span className="em mono">{total}</span> {totalLabel(total, source)}</div>
            <div className="lt-right">
              <div className="search-input" style={{ width: 280 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input className="input" placeholder="Search by title or number…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="select-mini" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}>
                <option value="recent">Most recent</option>
                <option value="oldest">Oldest first</option>
                <option value="status">Lifecycle order</option>
                <option value="rounds">Most rounds</option>
                <option value="savings">Biggest saving</option>
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
              {rows.map((row) => (
                <ParentCard key={row.parent_key || `${row.source_type}:${row.rfq_id ?? row.arc_id}`} row={row} />
              ))}
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
