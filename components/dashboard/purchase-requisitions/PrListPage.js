// Purchase requisitions — list. Everything (filtering, facet counts, paging) is
// server-side: GET /pr returns the page, `total`, and facet counts that do NOT
// change when a facet filter is applied (they count over tab + search only).
// The client only sends the filters and renders what comes back.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import * as PrApi from "@/services/pr";
import PrStatusPill from "./PrStatusPill";
import PrProgressPill from "./PrProgressPill";
import { STATUS_LABEL, errorCopy, errorStatus, formatINR } from "./prFormat";
import { nowWithLabel } from "./prDetail";
import {
  purchaseRequisition, purchaseRequisitionCreate, materialRequisition,
} from "@/components/dashboard/shared/dashboardLinks";

const PAGE_SIZE = 20;
const TABS = [
  { key: "mine", label: "Mine" },
  { key: "all", label: "All I can see" },
  // Exactly what the "Awaiting me" KPI counts: returned PRs I raised, reviews I
  // can complete, current approval steps waiting on me (GET /pr?tab=awaiting).
  { key: "awaiting", label: "Waiting on me" },
];
const tabFromQuery = (q) => (TABS.some((t) => t.key === q) ? q : "mine");
const STATUS_ORDER = ["draft", "in_review", "pending_approval", "returned", "approved", "rejected", "cancelled"];
const TYPE_LABEL = { goods: "Goods", service: "Service", capex: "Capex" };
const URGENCY_LABEL = { low: "Low", normal: "Normal", urgent: "Urgent" };
const NO_FILTERS = { status: "", hotel_id: "", department_id: "", pr_type: "", urgency: "" };

const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(`${String(s).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const sumCounts = (o) => Object.values(o || {}).reduce((n, v) => n + (Number(v) || 0), 0);

function FacetGroup({ label, options, selected, onToggle }) {
  if (!options.length) return null;
  return (
    <div className="filter-group">
      <div className="fg-label">{label}</div>
      <div className="fg-options">
        {options.map((o) => (
          <label key={o.key} className="filter-opt" title={o.label}>
            <input type="checkbox" checked={selected === o.key} onChange={() => onToggle(o.key)} />
            <span className="fo-box" />
            <span className="fo-text">{o.label}</span>
            <span className="fo-count">{o.count}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone, href, onClick }) {
  const body = (
    <>
      <div className="kt-row"><div className="kt-label">{label}</div></div>
      <div className="kt-val mono">{value}</div>
      <div className="kt-sub">{sub}</div>
    </>
  );
  if (href) {
    return <Link href={href} className={`kpi-tile ${tone}`} style={{ textDecoration: "none", color: "inherit" }}>{body}</Link>;
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`kpi-tile ${tone}`}
        style={{ textAlign: "left", font: "inherit", color: "inherit", cursor: "pointer" }}>
        {body}
      </button>
    );
  }
  return <div className={`kpi-tile ${tone}`}>{body}</div>;
}

export default function PrListPage() {
  const meId = useSelector((s) => s.userProfile)?.id;
  const router = useRouter();
  const query = router?.query || {};
  const queryTab = router?.isReady ? tabFromQuery(query.tab) : null;
  const [tab, setTab] = useState(() => queryTab || "mine");
  // A deep link (?tab=awaiting from the dashboard / approvals) picks the tab once the router is ready.
  useEffect(() => { if (queryTab) setTab(queryTab); }, [queryTab]);
  const [filters, setFilters] = useState(NO_FILTERS);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  const [data, setData] = useState({ rows: [], total: 0, facets: {}, facet_labels: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { forbidden, message }
  const [kpis, setKpis] = useState(null);
  const seq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    PrApi.getPrKpis()
      .then((r) => { if (!cancelled) setKpis(r?.data || null); })
      .catch(() => { if (!cancelled) setKpis(null); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const id = ++seq.current;
    const params = { tab, page, page_size: PAGE_SIZE };
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
    if (q) params.q = q;
    setLoading(true);
    setError(null);
    PrApi.listPrs(params)
      .then((res) => {
        if (id !== seq.current) return;
        const d = res?.data || {};
        setData({
          rows: Array.isArray(d.rows) ? d.rows : [],
          total: Number(d.total) || 0,
          facets: d.facets || {},
          facet_labels: d.facet_labels || {},
        });
      })
      .catch((err) => {
        if (id !== seq.current) return;
        setError({ forbidden: errorStatus(err) === 403, message: errorCopy(err) });
      })
      .finally(() => { if (id === seq.current) setLoading(false); });
  }, [tab, filters, q, page, reload]);

  const setFilter = useCallback((key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: f[key] === value ? "" : value }));
  }, []);
  const changeTab = (t) => { setTab(t); setPage(1); };
  const resetAll = () => { setFilters(NO_FILTERS); setSearch(""); setQ(""); setPage(1); };

  const { rows, total, facets, facet_labels } = data;
  const activeCount = Object.values(filters).filter(Boolean).length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const statusCounts = facets.status || {};
  const idOptions = (group) =>
    Object.entries(facets[group] || {}).map(([key, count]) => ({
      key, count, label: facet_labels?.[group]?.[key] || `#${key}`,
    }));
  const enumOptions = (group, labels) =>
    Object.entries(facets[group] || {}).map(([key, count]) => ({ key, count, label: labels[key] || key }));

  if (error?.forbidden) {
    return (
      <div className="main-body">
        <div className="empty-state" style={{ padding: "56px 24px" }}>
          <h2>You don't have access to purchase requisitions</h2>
          <p>Ask your admin to grant you the purchase requisition permissions for your hotel and department.</p>
        </div>
      </div>
    );
  }

  const awaiting = Number(kpis?.awaiting_me) || 0;

  return (
    <div className="main-body">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="page-h1">Purchase requisitions</h1>
          <p className="page-sub">Request items that aren't on a rate contract and follow them through review, approval and sourcing.</p>
        </div>
        <Link href={purchaseRequisitionCreate()} className="btn btn-blue btn-lg">New requisition</Link>
      </div>

      {kpis && (
        <section className="kpi-grid">
          <Kpi tone="accent" label="Open" value={kpis.open ?? 0} sub="not yet approved" />
          <Kpi
            tone="warn" label="Awaiting me" value={awaiting} sub="reviews and approvals for you"
            onClick={awaiting > 0 ? () => changeTab("awaiting") : undefined}
          />
          <Kpi tone="violet" label="In purchase queue" value={kpis.in_purchase_queue ?? 0} sub="approved, with the buyers" />
          <Kpi
            tone="success" label="Avg days to approval"
            value={kpis.avg_days_to_approval == null ? "—" : kpis.avg_days_to_approval}
            sub="approved in the last 90 days"
          />
        </section>
      )}

      <div className="tab-row">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={"tab" + (tab === t.key ? " active" : "")} onClick={() => changeTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-row" style={{ marginTop: 10 }}>
        <button type="button" className={"tab" + (!filters.status ? " active" : "")} onClick={() => setFilter("status", filters.status)}>
          All <span className="ct">{sumCounts(statusCounts)}</span>
        </button>
        {STATUS_ORDER.filter((s) => statusCounts[s] != null).map((s) => (
          <button key={s} type="button" className={"tab" + (filters.status === s ? " active" : "")} onClick={() => setFilter("status", s)}>
            {STATUS_LABEL[s]} <span className="ct">{statusCounts[s]}</span>
          </button>
        ))}
      </div>

      <div className="contracts-layout">
        <aside className="filter-sidebar">
          <div className="fs-head">
            <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>Filters</h3>
            {(activeCount > 0 || q) && <button type="button" className="reset-link" onClick={resetAll}>Reset</button>}
          </div>
          <FacetGroup label="Hotel" options={idOptions("hotel")} selected={filters.hotel_id} onToggle={(k) => setFilter("hotel_id", k)} />
          <FacetGroup label="Department" options={idOptions("department")} selected={filters.department_id} onToggle={(k) => setFilter("department_id", k)} />
          <FacetGroup label="Type" options={enumOptions("pr_type", TYPE_LABEL)} selected={filters.pr_type} onToggle={(k) => setFilter("pr_type", k)} />
          <FacetGroup label="Urgency" options={enumOptions("urgency", URGENCY_LABEL)} selected={filters.urgency} onToggle={(k) => setFilter("urgency", k)} />
        </aside>

        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <div className="list-toolbar">
            <div className="lt-left"><span className="em mono">{total}</span> {total === 1 ? "requisition" : "requisitions"}</div>
            <div className="lt-right">
              <div className="search-input" style={{ width: 280 }}>
                <input
                  className="input" placeholder="Search by number, title or item…" value={search}
                  onChange={(e) => setSearch(e.target.value)} aria-label="Search requisitions"
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="empty-state" style={{ padding: "56px 24px" }}>
              <h2>{error.message}</h2>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReload((n) => n + 1)}>Try again</button>
            </div>
          ) : loading && rows.length === 0 ? (
            <div className="contract-list">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="contract-card"><span className="arc-sk" style={{ display: "block", width: "60%", height: 16 }} /></div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            activeCount > 0 || q ? (
              <div className="empty-state" style={{ padding: "56px 24px" }}>
                <h2>No requisitions match</h2>
                <p>Try clearing some filters or your search.</p>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: "56px 24px" }}>
                <h2>No purchase requisitions yet</h2>
                <p>
                  Request anything that isn't on a rate contract. Reviewers check the spec, approvers sign off, and the purchase
                  team sources it.
                </p>
                <p>
                  Items that are on a rate contract go through a{" "}
                  <Link href={materialRequisition()}>Material Requisition</Link> instead.
                </p>
                <Link href={purchaseRequisitionCreate()} className="btn btn-blue btn-sm">New requisition</Link>
              </div>
            )
          ) : (
            <div className="contract-list" style={{ opacity: loading ? 0.6 : 1 }}>
              {rows.map((r) => (
                <Link key={r.id} href={purchaseRequisition(r.id)} className="contract-card">
                  <div className="cc-head">
                    <div className="cc-left">
                      <div className="cc-meta">
                        <div className="cc-title">
                          <span>{r.title || "(Untitled)"}</span>
                          <span className="cc-num">{r.pr_number}</span>
                        </div>
                        <div className="cc-sub">
                          <span>{[r.hotel_name, r.department_name].filter(Boolean).join(" · ")}</span>
                          <span className="sep">·</span><span>Need by <span className="em mono">{fmtDate(r.required_by_date)}</span></span>
                          <span className="sep">·</span><span>Now with <span className="em">{nowWithLabel(r, meId) || "—"}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className="cc-right">
                      <PrStatusPill status={r.status} />
                      {r.header_progress && <PrProgressPill progress={r.header_progress} header />}
                      <span className="mono fw-700 text-fg fs-13">{r.estimated_total == null ? "—" : formatINR(r.estimated_total)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && !error && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6 }}>
              <button type="button" aria-label="Previous page" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
              <span style={{ fontSize: 12.5, color: "#71717a", padding: "0 8px" }}>Page {page} of {totalPages}</span>
              <button type="button" aria-label="Next page" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
