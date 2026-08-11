// VendorPoOrders — the vendor "Purchase orders" listing page. Mirrors the buyer
// PO dashboard's "All purchase orders" table (PODashboard.js) for theme parity:
// same shared CSS-module primitives, the same tabs-row-with-counts, status pill,
// filter bar, table header/rows, and pagination. Filtering/faceting/pagination is
// SERVER-side and authoritative (POST /po/vendor/list-view) — the same pattern as
// RfqListPage.js: debounced search (~400ms), refetch on tab/filter/search/page.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import {
  Download,
  AlignJustify,
  Search,
  Filter,
  Eye,
  FileText,
  ChevronDown,
} from "lucide-react";
import { getVendorPoListView, downloadVendorPoExcel } from "@/services/po";
import styles, { inr, fmtDateTime, relAgo, Sk } from "@/components/dashboard/buyer/purchase-orders/shared";

const PO_ROUTE = "/dashboard/vendor/purchase-orders";
const PAGE_LIMIT = 20;

/* Tabs map to the vendor buckets returned in `tab_counts`. `key` drives the
   server `tab` param; `count` is the matching key in `tab_counts`. */
const TABS = [
  { key: "all", label: "All", count: "all" },
  { key: "awaiting", label: "Awaiting me", count: "awaiting" },
  { key: "fulfilment", label: "In fulfilment", count: "fulfilment" },
  { key: "invoiced", label: "Invoiced", count: "invoiced" },
  { key: "completed", label: "Completed", count: "completed" },
  { key: "rejected", label: "Rejected", count: "rejected" },
];

/* Vendor-friendly status labels for the pill (distinct from the buyer copy). */
const VENDOR_STATUS_LABELS = {
  acceptance_pending: "Awaiting you",
  sent: "Awaiting you",
  approved: "Accepted",
  dispatched: "Dispatched",
  invoice_raised: "Invoice raised",
  GRN: "Received",
  delivered: "Received",
  completed: "Completed",
  rejected_by_vendor: "Rejected",
  rejected: "Rejected",
  cancelled: "Cancelled",
  draft: "Draft",
  pending: "Pending",
  pending_approval: "Pending",
};
const vendorStatusLabel = (s) => VENDOR_STATUS_LABELS[s] || (s ? String(s) : "—");

/* Map each raw status to one of the statusPill tone classes that exist in
   PurchaseOrders.module.scss (warn=pending, success=approved/completed, etc.). */
const VENDOR_STATUS_TONE = {
  acceptance_pending: "pending",
  sent: "pending",
  approved: "approved",
  dispatched: "dispatched",
  invoice_raised: "info",
  GRN: "completed",
  delivered: "completed",
  completed: "completed",
  rejected_by_vendor: "rejected",
  rejected: "rejected",
  cancelled: "cancelled",
  draft: "draft",
  pending: "pending",
  pending_approval: "pending",
};
const vendorStatusTone = (s) => {
  const key = VENDOR_STATUS_TONE[s];
  if (key === "info") return styles.statusInfo || styles.dispatched;
  return (key && styles[key]) || styles.draft;
};

const VendorPoOrders = () => {
  const router = useRouter();

  const [tab, setTab] = useState("all");
  const [typeFilter, setTypeFilter] = useState(""); // "" = all, else facet key
  const [typeOpen, setTypeOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);

  const [resp, setResp] = useState({ rows: [], facets: {}, tab_counts: {}, total: 0, limit: PAGE_LIMIT });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const seq = useRef(0);
  const typeRef = useRef(null);

  // The exact body the list view is being fetched with, minus paging — the
  // Export must be the whole filtered set, not the page on screen.
  const queryBody = useMemo(
    () => ({ tab, search: debounced, filters: { type: typeFilter || undefined } }),
    [tab, debounced, typeFilter],
  );

  // Debounce the search box (~400ms) and reset to page 1 on a new query.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Close the Type dropdown on outside click.
  useEffect(() => {
    if (!typeOpen) return;
    const onDown = (e) => {
      if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [typeOpen]);

  // Fetch whenever any query input changes (server is authoritative).
  useEffect(() => {
    const id = ++seq.current;
    setLoading(true);
    getVendorPoListView({ ...queryBody, page, limit: PAGE_LIMIT })
      .then((res) => {
        if (id !== seq.current) return;
        const d = res?.data || {};
        setResp({
          rows: Array.isArray(d.rows) ? d.rows : [],
          facets: d.facets || {},
          tab_counts: d.tab_counts || {},
          total: d.total || 0,
          limit: d.limit || PAGE_LIMIT,
        });
      })
      .catch(() => {
        if (id === seq.current) setResp({ rows: [], facets: {}, tab_counts: {}, total: 0, limit: PAGE_LIMIT });
      })
      .finally(() => {
        if (id === seq.current) setLoading(false);
      });
  }, [queryBody, page]);

  // Export is scoped server-side to the calling vendor, so this can only ever
  // produce the caller's own orders.
  const onExport = useCallback(async () => {
    setExporting(true);
    try {
      await downloadVendorPoExcel(queryBody);
    } catch (e) {
      toast.error(e?.message || "Could not export your orders");
    } finally {
      setExporting(false);
    }
  }, [queryBody]);

  const goToDetail = (id) => router.push(`${PO_ROUTE}/${id}`);

  const { rows, facets, tab_counts, total, limit } = resp;
  const typeFacets = Array.isArray(facets.type) ? facets.type : [];
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const showingFrom = total === 0 ? 0 : (page - 1) * limit + 1;
  const showingTo = Math.min(page * limit, total);
  const activeTypeLabel = useMemo(
    () => typeFacets.find((f) => f.key === typeFilter)?.label || "Type",
    [typeFacets, typeFilter],
  );
  const hasQuery = !!debounced || !!typeFilter;

  return (
    <div className={styles.page}>
      {/* Page header */}
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.eyebrow}>
            <span className={styles.dot} /> Live · Updated just now
          </div>
          <div className={styles.pageTitleRow}>
            <div>
              <h1 className={styles.pageTitle}>Purchase orders</h1>
              <p className={styles.pageSub}>
                Every order across all your buyers — act, fulfil, and track in one place.
              </p>
            </div>
            <div className={styles.headerActions}>
              <button
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                type="button"
                onClick={onExport}
                disabled={exporting}
              >
                <Download size={13} />
                {exporting ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <main className={styles.pageBody}>
        <section className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <div className={styles.hLeft}>
              <div className={styles.ic}>
                <AlignJustify size={13} />
              </div>
              <h2>Purchase orders</h2>
              <span className={styles.pill}>{total} total</span>
            </div>
            <div className={styles.hRight}>
              <div className={styles.searchInput} style={{ width: 240 }}>
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Search PO #, buyer…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filter bar — tabs (left) + Type filter (right) */}
          <div className={styles.filterBar}>
            <div className={styles.left}>
              <div className={styles.statusTabs}>
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={tab === t.key ? styles.stActive : undefined}
                    onClick={() => {
                      setTab(t.key);
                      setPage(1);
                    }}
                  >
                    {t.label}
                    <span className={styles.n}>{tab_counts[t.count] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.right}>
              <div ref={typeRef} style={{ position: "relative" }}>
                <button
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                  type="button"
                  onClick={() => setTypeOpen((v) => !v)}
                  style={typeFilter ? { borderColor: "var(--accent)", color: "var(--accent)" } : undefined}
                >
                  <Filter size={12} />
                  {activeTypeLabel}
                  <ChevronDown size={12} />
                </button>
                {typeOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 6px)",
                      right: 0,
                      zIndex: 50,
                      minWidth: 160,
                      background: "var(--surface)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: 10,
                      boxShadow: "0 10px 30px -10px rgba(15,15,14,0.22), 0 2px 8px rgba(15,15,14,0.06)",
                      padding: 5,
                    }}
                  >
                    <TypeOption
                      label="All types"
                      active={typeFilter === ""}
                      onClick={() => {
                        setTypeFilter("");
                        setPage(1);
                        setTypeOpen(false);
                      }}
                    />
                    {typeFacets.map((f) => (
                      <TypeOption
                        key={f.key}
                        label={f.label}
                        active={typeFilter === f.key}
                        onClick={() => {
                          setTypeFilter(f.key);
                          setPage(1);
                          setTypeOpen(false);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className={styles.poTableWrap}>
            <table className={styles.poTable}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>PO #</th>
                  <th>Buyer / Hotel</th>
                  <th className={styles.thRight}>Value</th>
                  <th>Created</th>
                  <th className={styles.thRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td colSpan={6}>
                        <Sk h={20} />
                      </td>
                    </tr>
                  ))
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className={styles.emptyState}>
                        <div className={styles.ic}>
                          <FileText size={20} />
                        </div>
                        <div className={styles.ttl}>
                          {hasQuery ? "No results for these filters" : "No purchase orders"}
                        </div>
                        <div className={styles.sub}>
                          {hasQuery
                            ? "Try changing filters or clearing the search."
                            : "Orders from your buyers will show up here."}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => (
                    <tr key={p.id} onClick={() => goToDetail(p.id)}>
                      <td>
                        <span className={`${styles.statusPill} ${vendorStatusTone(p.status)}`}>
                          <span className={styles.dot} />
                          {vendorStatusLabel(p.status)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.poNum}>#{p.po_number || p.id}</div>
                        <span
                          className={`${styles.pill} ${p.is_call_off ? styles.pillInfo : styles.pillNeutral}`}
                          style={{ marginTop: 4 }}
                        >
                          {p.is_call_off ? "Released Order" : "RFQ"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.vName} style={{ fontSize: "12.5px", color: "var(--fg)" }}>
                          {p.buyer_name || "—"}
                        </div>
                        {p.hotel_name && <div className={styles.ago}>{p.hotel_name}</div>}
                      </td>
                      <td className={styles.tdRight}>
                        <div className={styles.amount}>{inr(p.total_value)}</div>
                      </td>
                      <td>
                        <div className={styles.mono} style={{ fontSize: "12.5px", color: "var(--fg-2)" }}>
                          {fmtDateTime(p.created_at)}
                        </div>
                        <div className={styles.ago}>{relAgo(p.created_at)}</div>
                      </td>
                      <td className={styles.tdRight}>
                        <div className={styles.rowActions}>
                          <button
                            className={styles.iconBtn}
                            title="View"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              goToDetail(p.id);
                            }}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className={styles.pagination}>
              <span>
                Showing <span className={`${styles.mono} ${styles.strong}`}>{showingFrom}</span>–
                <span className={`${styles.mono} ${styles.strong}`}>{showingTo}</span> of{" "}
                <span className={`${styles.mono} ${styles.strong}`}>{total}</span> POs
              </span>
              <div className={styles.pages}>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ‹
                </button>
                {(() => {
                  // Windowed page strip centered on the current page so every
                  // page stays reachable (not just the first 5).
                  const WINDOW = 5;
                  let start = Math.max(1, page - Math.floor(WINDOW / 2));
                  const end = Math.min(totalPages, start + WINDOW - 1);
                  start = Math.max(1, end - WINDOW + 1);
                  return Array.from({ length: end - start + 1 }, (_, i) => start + i).map((pg) => (
                    <button
                      key={pg}
                      type="button"
                      className={pg === page ? styles.pgActive : undefined}
                      onClick={() => setPage(pg)}
                    >
                      {pg}
                    </button>
                  ));
                })()}
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const TypeOption = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      display: "block",
      width: "100%",
      textAlign: "left",
      padding: "7px 10px",
      borderRadius: 7,
      border: "none",
      background: active ? "var(--surface-3)" : "transparent",
      color: active ? "var(--fg)" : "var(--fg-2)",
      fontSize: "12.5px",
      fontWeight: active ? 600 : 500,
      cursor: "pointer",
    }}
  >
    {label}
  </button>
);

export default VendorPoOrders;
