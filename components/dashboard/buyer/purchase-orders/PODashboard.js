import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Download,
  FileText,
  Clock,
  Check,
  IndianRupee,
  AlignJustify,
  Search,
  Eye,
  UserCheck,
} from "lucide-react";
import { getPOKpis, getPODashboardList, getPOAwaiting, downloadPOListExcel } from "@/services/po";
import WwAiPanel from "@/components/wwai/WwAiPanel";
import { buildPoDecisionQueuePlan } from "@/lib/wwai/panels/poDecision";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import { VendorFilter, DateFilter, EMPTY_DATE_FILTER, rangeOf } from "./FilterMenus";
import styles, {
  avatarClass,
  initialsOf,
  statusLabel,
  statusTone,
  inr,
  toLakh,
  fmtDateTime,
  relAgo,
  Sk,
} from "./shared";

const PO_ROUTE = "/dashboard/buyer/purchase-orders";
const PAGE_LIMIT = 10;

/* `key`  → list `status` query param value (server-driven)
   `count`→ key in the response `status_counts` object */
const STATUS_TABS = [
  { key: "all", label: "All", count: "all" },
  { key: "action-required", label: "Pending for me", count: "action_required" },
  { key: "approved", label: "Approved", count: "approved" },
  { key: "rejected", label: "Rejected", count: "rejected" },
];

const PODashboard = () => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);

  // Derive all of the user's hotel ids (cross-RFQ page → use everything).
  const hotelIds = useMemo(() => {
    const mappings = userProfile?.hospitality_mappings || [];
    return mappings.map((m) => m.hospitality_hotel_id).filter(Boolean);
  }, [userProfile]);

  const { canRead, loading: permissionsLoading } = useModulePermissions({
    moduleKey: "awarding",
    hotelIds,
    departmentId: null,
  });

  const [kpis, setKpis] = useState(null);
  const [awaiting, setAwaiting] = useState([]);
  const [list, setList] = useState([]);
  const [statusCounts, setStatusCounts] = useState({});
  const [vendorFacets, setVendorFacets] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [vendorId, setVendorId] = useState(null);
  const [dateFilter, setDateFilter] = useState(EMPTY_DATE_FILTER);
  const [page, setPage] = useState(1);
  const fetchSeq = useRef(0);

  // The filters the server is currently applying. Shared verbatim by the list
  // fetch and the Export call, so the file is always the table.
  const dateRange = rangeOf(dateFilter);
  const queryParams = useMemo(
    () => ({
      status: activeTab,
      search: debouncedSearch || undefined,
      vendor_id: vendorId || undefined,
      date_from: dateRange.from || undefined,
      date_to: dateRange.to || undefined,
    }),
    [activeTab, debouncedSearch, vendorId, dateRange.from, dateRange.to]
  );

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Initial load: KPIs + awaiting (only need to fetch once).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [k, a] = await Promise.all([getPOKpis(), getPOAwaiting()]);
        if (!active) return;
        setKpis(k || {});
        setAwaiting(Array.isArray(a?.data) ? a.data : []);
      } catch (e) {
        if (active) {
          setKpis({});
          setAwaiting([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const fetchList = useCallback(async () => {
    // Applying a filter fires a second request (the page reset). Without a
    // sequence guard the slower of the two wins, and the user sees the
    // UNFILTERED table come back — indistinguishable from a filter that does
    // nothing, which is the bug being fixed here.
    const id = ++fetchSeq.current;
    setListLoading(true);
    try {
      const res = await getPODashboardList({
        ...queryParams,
        page,
        limit: PAGE_LIMIT,
        sort: "DESC",
      });
      if (id !== fetchSeq.current) return;
      setList(Array.isArray(res?.data) ? res.data : []);
      setStatusCounts(res?.status_counts || {});
      // Facet-invariant: the vendor list is scoped but not filtered, so the
      // dropdown does not shrink out from under the user as they narrow.
      if (Array.isArray(res?.vendors)) setVendorFacets(res.vendors);
      setTotalItems(res?.total_items ?? 0);
    } catch (e) {
      if (id === fetchSeq.current) setList([]);
    } finally {
      if (id === fetchSeq.current) setListLoading(false);
    }
  }, [queryParams, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Reset to page 1 whenever any filter changes — staying on page 7 of a
  // now-2-page result is the classic "the filter did nothing" report.
  useEffect(() => {
    setPage(1);
  }, [queryParams]);

  // Export what the user is looking at. The server re-runs the same scoped
  // query, so this can never widen the row set.
  const onExport = useCallback(async () => {
    setExporting(true);
    try {
      await downloadPOListExcel({ ...queryParams, sort: "DESC" });
    } catch (e) {
      toast.error(e?.message || "Could not export purchase orders");
    } finally {
      setExporting(false);
    }
  }, [queryParams]);

  const goToDetail = (id) => router.push(`${PO_ROUTE}/${id}`);

  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_LIMIT));
  const showingFrom = totalItems === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const showingTo = Math.min(page * PAGE_LIMIT, totalItems);

  if (permissionsLoading || (loading && !kpis)) {
    return <DashboardSkeleton />;
  }

  if (!canRead) {
    return (
      <div className={styles.page}>
        <div className={styles.pageBody}>
          <AccessDeniedPage
            title="Access Denied"
            message="You do not have permission to view Purchase Orders. Contact your administrator to request access."
            showBackButton={false}
          />
        </div>
      </div>
    );
  }

  const k = kpis || {};

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
                Approve, monitor, and track every PO across all RFQs from one place.
              </p>
            </div>
            {/* "Reports" used to sit beside Export and did nothing at all.
                There is no reports surface to send it to, so it is gone rather
                than stubbed — a button that opens a "coming soon" toast is
                still a broken button. */}
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

      {/* AI approval queue — the prototype's triage panel, carried across
          whole: the per-PO call, what the queue is worth, and review time
          saved. */}
      <WwAiPanel
        id="ai-queue"
        className="po-ai-panel"
        title="AI approval queue"
        sub="5 POs waiting on you · ₹58,03,372.00 held"
        runLabel="Triage my queue"
        buildPlan={() => buildPoDecisionQueuePlan()}
      />


      {/* Body */}
      <main className={styles.pageBody}>
        {/* KPI strip */}
        <section className={styles.kpiStrip}>
          <Kpi
            label="Active POs"
            value={k.activeCount ?? 0}
            icon={<FileText size={13} />}
            meta={<>across all RFQs</>}
          />
          <Kpi
            urgent
            label="Awaiting your approval"
            value={k.awaitingYou ?? 0}
            icon={<Clock size={13} />}
            meta={
              k.awaitingOldestDays != null ? (
                <>
                  oldest pending{" "}
                  <span style={{ color: "var(--warn)", fontWeight: 600 }}>
                    {k.awaitingOldestDays} day{k.awaitingOldestDays === 1 ? "" : "s"}
                  </span>
                </>
              ) : (
                <>nothing overdue</>
              )
            }
          />
          <Kpi
            label="Vendor acceptance"
            value={k.vendorAccepted ?? 0}
            icon={<UserCheck size={13} />}
            meta={
              <>
                accepted ·{" "}
                <span style={{ color: "var(--warn)", fontWeight: 600 }}>
                  {k.vendorAcceptancePending ?? 0} pending
                </span>
              </>
            }
          />
          <Kpi
            label="Approved this month"
            value={k.approvedThisMonth ?? 0}
            icon={<Check size={13} />}
            meta={<DeltaMeta pct={k.approvedDeltaPct} />}
          />
          <Kpi
            label="Total PO value · MTD"
            value={
              <>
                <span className={styles.cur}>₹</span>
                {toLakh(k.totalValueMTD)}
                <span className={styles.suffix}>L</span>
              </>
            }
            icon={<IndianRupee size={13} />}
            meta={<DeltaMeta pct={k.totalValueDeltaPct} />}
          />
        </section>

        {/* Awaiting your approval */}
        <section id="awaiting" className={styles.sectionCard} style={{ marginBottom: 22 }}>
          <div className={styles.sectionHead}>
            <div className={styles.hLeft}>
              <div
                className={styles.ic}
                style={{ background: "var(--warn-soft)", color: "var(--warn)", borderColor: "rgba(180,83,9,0.18)" }}
              >
                <Clock size={13} />
              </div>
              <h2>Awaiting your approval</h2>
              <span className={`${styles.pill} ${styles.pillWarn} ${styles.pulse}`}>
                <span className={styles.pdot} />
                {awaiting.length} need action
              </span>
            </div>
          </div>

          {awaiting.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.ic}>
                <Check size={20} />
              </div>
              <div className={styles.ttl}>You're all caught up</div>
              <div className={styles.sub}>No purchase orders are waiting on your approval.</div>
            </div>
          ) : (
            <div className={styles.awaitingGrid}>
              {awaiting.map((p) => (
                <div
                  key={p.id}
                  className={styles.awaitingCard}
                  onClick={() => goToDetail(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && goToDetail(p.id)}
                >
                  <div className={styles.aHead}>
                    <div>
                      <div className={styles.aNum}>PO #{p.po_number || p.id}</div>
                      <div className={styles.aRfq}>
                        RFQ #{p.rfq_no} · {p.rfq_title}
                      </div>
                    </div>
                    {p.waiting_days != null && (
                      <span className={styles.aSince}>{p.waiting_days}d waiting</span>
                    )}
                  </div>
                  <div className={styles.aVendor}>{p.vendor?.name}</div>
                  <div className={styles.aItems}>
                    {p.items_count != null && (
                      <>
                        {p.items_count} line item{p.items_count === 1 ? "" : "s"} ·{" "}
                      </>
                    )}
                    {p.items_label}
                  </div>
                  {Array.isArray(p.flags) && p.flags.length > 0 && (
                    <div className={styles.aFlags}>
                      {p.flags.map((f) => (
                        <span key={f} className={`${styles.pill} ${styles.pillOutline}`}>
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className={styles.aFoot}>
                    <div className={styles.aAmount}>{inr(p.total_value)}</div>
                    <div className={styles.aCta}>
                      <button
                        className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          goToDetail(p.id);
                        }}
                      >
                        <Check size={11} strokeWidth={2.4} />
                        Review
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* All purchase orders */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <div className={styles.hLeft}>
              <div className={styles.ic}>
                <AlignJustify size={13} />
              </div>
              <h2>All purchase orders</h2>
              <span className={styles.pill}>{totalItems} total</span>
            </div>
            <div className={styles.hRight}>
              <div className={styles.searchInput} style={{ width: 240 }}>
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Search PO #, vendor, RFQ…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filter bar */}
          <div className={styles.filterBar}>
            <div className={styles.left}>
              <div className={styles.statusTabs}>
                {STATUS_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={activeTab === t.key ? styles.stActive : undefined}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                    <span className={styles.n}>{statusCounts[t.count] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.right}>
              <VendorFilter
                styles={styles}
                vendors={vendorFacets}
                value={vendorId}
                onChange={setVendorId}
              />
              <DateFilter styles={styles} value={dateFilter} onChange={setDateFilter} />
            </div>
          </div>

          {/* Table */}
          <div className={styles.poTableWrap}>
            <table className={styles.poTable}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>PO #</th>
                  <th>RFQ</th>
                  <th>Vendor</th>
                  <th>Items</th>
                  <th className={styles.thRight}>Value</th>
                  <th>Initiator</th>
                  <th>Created</th>
                  <th className={styles.thRight}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listLoading && list.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`sk-${i}`}>
                      <td colSpan={9}>
                        <Sk h={20} />
                      </td>
                    </tr>
                  ))
                ) : list.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className={styles.emptyState}>
                        <div className={styles.ic}>
                          <FileText size={20} />
                        </div>
                        <div className={styles.ttl}>No purchase orders match</div>
                        <div className={styles.sub}>Try changing filters or clearing the search.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  list.map((p) => (
                    <tr key={p.id} onClick={() => goToDetail(p.id)}>
                      <td>
                        <span className={`${styles.statusPill} ${statusTone(p.status)}`}>
                          <span className={styles.dot} />
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td>
                        <div className={styles.poNum}>#{p.po_number || p.id}</div>
                        {(p.status === "pending_approval" ||
                          p.status === "pending" ||
                          p.status === "acceptance_pending") &&
                          Array.isArray(p.current_approvers) &&
                          p.current_approvers.length > 0 && (
                            <div className={styles.pendingLine}>
                              {p.current_step_label ? `on ${p.current_step_label} — ` : ""}
                              {p.current_approvers.map((a) => a.name).join(", ")}
                            </div>
                          )}
                      </td>
                      <td>
                        <span className={styles.rfqLink} onClick={(e) => e.stopPropagation()}>
                          #{p.rfq_no}
                        </span>
                      </td>
                      <td>
                        <div className={styles.vendorCell}>
                          <div className={`${styles.vAvatar} ${avatarClass(null, p.vendor?.name)}`}>
                            {p.vendor?.short || initialsOf(p.vendor?.name)}
                          </div>
                          <div>
                            <div className={styles.vName}>{p.vendor?.name}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "12.5px", color: "var(--fg)" }}>{p.items_label}</div>
                        <div className={styles.ago}>
                          {p.items_count} item{p.items_count === 1 ? "" : "s"}
                          {p.quantity != null && <> · {Number(p.quantity).toLocaleString("en-IN")} qty</>}
                        </div>
                      </td>
                      <td className={styles.tdRight}>
                        <div className={styles.amount}>{inr(p.total_value)}</div>
                      </td>
                      <td>
                        {p.initiator ? (
                          <div className={styles.initiator}>
                            <div className={`${styles.iniAvatar} ${avatarClass(null, p.initiator.name)}`}>
                              {p.initiator.initials || initialsOf(p.initiator.name)}
                            </div>
                            <span>{p.initiator.name}</span>
                          </div>
                        ) : (
                          <span className={styles.ago}>—</span>
                        )}
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
          {totalItems > 0 && (
            <div className={styles.pagination}>
              <span>
                Showing <span className={`${styles.mono} ${styles.strong}`}>{showingFrom}</span>–
                <span className={`${styles.mono} ${styles.strong}`}>{showingTo}</span> of{" "}
                <span className={`${styles.mono} ${styles.strong}`}>{totalItems}</span> POs
              </span>
              <div className={styles.pages}>
                <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ‹
                </button>
                {Array.from({ length: totalPages })
                  .slice(0, 5)
                  .map((_, i) => {
                    const pg = i + 1;
                    return (
                      <button
                        key={pg}
                        type="button"
                        className={pg === page ? styles.pgActive : undefined}
                        onClick={() => setPage(pg)}
                      >
                        {pg}
                      </button>
                    );
                  })}
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

const Kpi = ({ label, value, icon, meta, urgent }) => (
  <div className={`${styles.kpiCard} ${urgent ? styles.kpiUrgent : ""}`}>
    <div className={styles.kHead}>
      <span className={styles.kLabel}>{label}</span>
      <div className={styles.kIc}>{icon}</div>
    </div>
    <div className={styles.kValue}>{value}</div>
    {meta != null && <div className={styles.kMeta}>{meta}</div>}
  </div>
);

const DeltaMeta = ({ pct }) => {
  if (pct == null) return <span>vs last month</span>;
  const up = Number(pct) >= 0;
  return (
    <>
      <span className={`${styles.delta} ${up ? styles.deltaUp : styles.deltaDown}`}>
        {up ? "↑" : "↓"} {Math.abs(Number(pct))}%
      </span>
      <span>vs last month</span>
    </>
  );
};

const DashboardSkeleton = () => (
  <div className={styles.page}>
    <section className={styles.pageHeader}>
      <div className={styles.pageHeaderInner}>
        <Sk w={160} h={11} style={{ marginBottom: 10 }} />
        <Sk w={260} h={24} style={{ marginBottom: 8 }} />
        <Sk w={420} h={13} />
      </div>
    </section>
    <main className={styles.pageBody}>
      <section className={styles.kpiStrip}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={styles.kpiCard}>
            <Sk w={90} h={11} style={{ marginBottom: 12 }} />
            <Sk w={60} h={22} style={{ marginBottom: 8 }} />
            <Sk w={110} h={11} />
          </div>
        ))}
      </section>
      <div className={styles.skCard} style={{ marginBottom: 22 }}>
        <Sk w={200} h={16} style={{ marginBottom: 16 }} />
        <Sk h={120} />
      </div>
      <div className={styles.skCard}>
        <Sk w={200} h={16} style={{ marginBottom: 16 }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Sk key={i} h={20} style={{ marginBottom: 10 }} />
        ))}
      </div>
    </main>
  </div>
);

export default PODashboard;
