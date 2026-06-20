import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  Activity,
  Truck,
  AlertTriangle,
  IndianRupee,
  Check,
  Download,
  Monitor,
  Search,
  ChevronDown,
  ExternalLink,
  MoreHorizontal,
  FileText,
  MessageCircle,
  Filter,
  Calendar,
  CheckCheck,
  Info,
} from "lucide-react";
import { getPOTracking, handleMarkDispatched } from "@/services/po";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import { formatToINRShort, formatDisplayDate } from "@/utils/sharedFunctions";
import styles from "./POTracking.module.scss";

const PO_BASE = "/dashboard/buyer/purchase-orders";
const PAGE_LIMIT = 10;

const STAGE_LABELS = {
  approved: "Approved",
  sent: "PO sent",
  ack: "Acknowledged",
  dispatched: "Dispatched",
  delivered: "Delivered",
  grn: "GRN received",
  invoiced: "Invoiced",
  paid: "Paid",
};

const TABS = [
  { key: "active", label: "Active" },
  { key: "awaiting-grn", label: "Awaiting GRN" },
  { key: "payment", label: "Payment due" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
];

const AVATAR_CLASS = {
  "av-indigo": styles.avIndigo,
  "av-rose": styles.avRose,
  "av-green": styles.avGreen,
  "av-warm": styles.avWarm,
  "av-zinc": styles.avZinc,
  "av-sky": styles.avSky,
};

// Cycle deterministic avatar tones when the API doesn't supply one.
const FALLBACK_AVATARS = [styles.avIndigo, styles.avWarm, styles.avGreen, styles.avRose, styles.avZinc, styles.avSky];

const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

const POTracking = () => {
  const router = useRouter();
  const userProfile = useSelector((state) => state.userProfile);

  const [activeTab, setActiveTab] = useState("active");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState({});

  const [data, setData] = useState(null); // full response body
  const [loading, setLoading] = useState(true);

  // hotelIds derived from redux userProfile.hospitality_mappings (same pattern as PurchaseOrders.js)
  const hotelIds = useMemo(() => {
    const mappings = userProfile?.hospitality_mappings || [];
    return mappings.map((m) => m.hospitality_hotel_id).filter(Boolean);
  }, [userProfile]);

  const { canRead, canUpdate, loading: permissionsLoading } = useModulePermissions({
    moduleKey: "awarding",
    hotelIds,
    departmentId: null,
    enabled: hotelIds.length > 0,
  });

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchTracking = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await getPOTracking({ tab: activeTab, search, page, limit: PAGE_LIMIT });
      setData(res || null);
    } catch (err) {
      console.error("Failed to load PO tracking", err);
      toast.error(err?.message || "Unable to load PO tracking");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canRead, activeTab, search, page]);

  useEffect(() => {
    if (!permissionsLoading && canRead) fetchTracking();
  }, [permissionsLoading, canRead, fetchTracking]);

  const rows = data?.data || [];
  const tabCounts = data?.tab_counts || {};
  const totalItems = data?.total_items || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_LIMIT));

  // KPI strip derived from real tab_counts + the current rows.
  const kpis = useMemo(() => {
    const inTransit = rows.filter((p) =>
      ["dispatched", "sent", "ack"].includes(p.current_stage)
    ).length;
    const grnOverdue = rows.filter((p) => p.grn_status === "overdue" || p.overdue).length;
    const paymentsDueValue = rows
      .filter((p) => p.payment_status !== "done" && !p.completed)
      .reduce((sum, p) => sum + (Number(p.total_value) || 0), 0);
    const earliestEta = rows
      .filter((p) => p.eta_delivery)
      .map((p) => p.eta_delivery)
      .sort()[0];
    return {
      inTransit,
      grnOverdue,
      paymentsDueValue,
      earliestEta,
      completed: tabCounts.completed || 0,
    };
  }, [rows, tabCounts]);

  const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

  const onOpenPO = (id, e) => {
    if (e) e.stopPropagation();
    router.push(`${PO_BASE}/${id}`);
  };

  // Mark dispatched is the only tracking action with a clean existing endpoint.
  const onMarkDispatched = async (poId, e) => {
    if (e) e.stopPropagation();
    try {
      await handleMarkDispatched(poId);
      toast.success("Marked as dispatched");
      fetchTracking();
    } catch (err) {
      toast.error(err?.message || "Could not mark dispatched");
    }
  };

  const avatarClass = (vendor, idx) =>
    AVATAR_CLASS[vendor?.avatar] || FALLBACK_AVATARS[idx % FALLBACK_AVATARS.length];

  const stagePillClass = (p) => {
    if (p.current_stage === "paid" || p.current_stage === "delivered" || p.completed) return styles.success;
    if (p.current_stage === "grn" && p.overdue) return styles.warn;
    if (p.current_stage === "invoiced") return styles.info;
    if (p.current_stage === "dispatched") return styles.indigo;
    return styles.neutral;
  };

  /* ── Loading skeleton (permissions or first data load) ── */
  const showSkeleton = permissionsLoading || (loading && !data);

  if (!permissionsLoading && hotelIds.length > 0 && !canRead) {
    return (
      <div className={styles.page}>
        <div className={styles.pageBody}>
          <AccessDeniedPage
            title="Access Denied"
            message="You do not have permission to view PO Tracking. Contact your administrator to request access."
            showBackButton={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* PAGE HEADER */}
      <section className={styles.pageHeader}>
        <div className={styles.pageHeaderInner}>
          <div className={styles.eyebrow}>
            <span className={styles.dot} /> Live · {kpis.inTransit} in transit
          </div>
          <div className={styles.pageTitleRow}>
            <div>
              <h1 className={styles.pageTitle}>PO Tracking</h1>
              <p className={styles.pageSub}>
                Dispatch, GRN, invoice, and payment milestones across every approved PO.
              </p>
            </div>
            <div className={styles.headerActions}>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
                <Download size={13} /> Export
              </button>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
                <Monitor size={13} /> Site-rep GRN
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PAGE BODY */}
      <main className={styles.pageBody}>
        {/* KPI strip */}
        {showSkeleton ? (
          <section className={styles.kpiStrip}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`${styles.skel} ${styles.skelKpi}`} />
            ))}
          </section>
        ) : (
          <section className={styles.kpiStrip}>
            <div className={styles.kpiCard}>
              <div className={styles.kHead}>
                <span className={styles.kLabel}>In transit</span>
                <div className={styles.kIc}><Truck size={13} /></div>
              </div>
              <div className={styles.kValue}>{kpis.inTransit}</div>
              <div className={styles.kMeta}>
                {kpis.earliestEta ? (
                  <>earliest delivery <span style={{ color: "var(--fg-2)", fontWeight: 500 }}>{formatDisplayDate(kpis.earliestEta)}</span></>
                ) : (
                  <span style={{ color: "var(--fg-4)" }}>—</span>
                )}
              </div>
            </div>

            <div className={`${styles.kpiCard} ${styles.urgent}`}>
              <div className={styles.kHead}>
                <span className={styles.kLabel}>GRN overdue</span>
                <div className={styles.kIc}><AlertTriangle size={13} /></div>
              </div>
              <div className={styles.kValue}>{kpis.grnOverdue}</div>
              <div className={styles.kMeta}>
                {kpis.grnOverdue > 0 ? (
                  <span className={`${styles.delta} ${styles.down}`}>needs receipt</span>
                ) : (
                  <span style={{ color: "var(--fg-4)" }}>all received</span>
                )}
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kHead}>
                <span className={styles.kLabel}>Payments due</span>
                <div className={styles.kIc}><IndianRupee size={13} /></div>
              </div>
              <div className={styles.kValue}>
                <span className={styles.cur}>₹</span>
                <span>{formatToINRShort(kpis.paymentsDueValue)}</span>
              </div>
              <div className={styles.kMeta}>
                {kpis.paymentsDueValue > 0 ? "outstanding" : <span style={{ color: "var(--fg-4)" }}>nothing due</span>}
              </div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kHead}>
                <span className={styles.kLabel}>Completed</span>
                <div className={styles.kIc}><CheckCheck size={13} /></div>
              </div>
              <div className={styles.kValue}>{kpis.completed}</div>
              <div className={styles.kMeta}>closed POs</div>
            </div>
          </section>
        )}

        {/* Tracking table */}
        <section className={styles.sectionCard}>
          <div className={styles.sectionHead}>
            <div className={styles.hLeft}>
              <div className={styles.headIc}><Activity size={13} /></div>
              <h2>All shipments</h2>
              <span className={styles.pill}>{totalItems} POs</span>
            </div>
            <div className={styles.hRight}>
              <div className={styles.searchInput}>
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Search PO, vendor, RFQ…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Status tabs */}
          <div className={styles.filterBar}>
            <div style={{ display: "flex", flex: 1, minWidth: 0 }}>
              <div className={styles.statusTabs}>
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={activeTab === t.key ? styles.tabActive : ""}
                    onClick={() => {
                      setActiveTab(t.key);
                      setPage(1);
                    }}
                  >
                    <span>{t.label}</span>
                    <span className={styles.n}>{tabCounts[t.key] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.hRight}>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
                <Filter size={12} /> Vendor
              </button>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
                <Calendar size={12} /> Date
              </button>
            </div>
          </div>

          {/* Table */}
          <div className={styles.tableWrap}>
            <table className={styles.trackTable}>
              <thead>
                <tr>
                  <th style={{ width: 28 }} />
                  <th>PO #</th>
                  <th>Vendor &amp; items</th>
                  <th>Stage</th>
                  <th style={{ minWidth: 200 }}>Milestone progress</th>
                  <th>GRN · Invoice · Pay</th>
                  <th>ETA / Status</th>
                  <th style={{ textAlign: "right" }}>Value</th>
                  <th />
                </tr>
              </thead>

              {showSkeleton ? (
                <tbody>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <tr key={i}>
                      <td colSpan={9}>
                        <div className={`${styles.skel} ${styles.skelRow}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              ) : rows.length === 0 ? (
                <tbody>
                  <tr>
                    <td colSpan={9}>
                      <div className={styles.emptyState}>
                        <div className={styles.emptyIc}>
                          <Activity size={20} />
                        </div>
                        <div className={styles.ttl}>No POs in this state</div>
                        <div className={styles.sub}>
                          {search ? "No matches for your search." : "Switch to a different status tab."}
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                rows.map((p, idx) => {
                  const nextStage =
                    p.stages?.find((s) => s.status === "current") ||
                    p.stages?.find((s) => s.status === "pending");
                  return (
                    <tbody key={p.id}>
                      <tr className={styles.rowMain} onClick={() => toggle(p.id)}>
                        <td>
                          <button className={styles.iconBtn} type="button" tabIndex={-1}>
                            <ChevronDown
                              size={13}
                              className={`${styles.chevron} ${expanded[p.id] ? styles.chevronOpen : ""}`}
                            />
                          </button>
                        </td>
                        <td>
                          <div className={styles.poNum}>#{p.po_number || p.id}</div>
                          <Link
                            href={`${PO_BASE}/${p.id}`}
                            className={styles.rfqLink}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {p.rfq_no ? `RFQ #${p.rfq_no}` : "RFQ —"}
                          </Link>
                        </td>
                        <td>
                          <div className={styles.vendorCell}>
                            <div className={`${styles.vAvatar} ${avatarClass(p.vendor, idx)}`}>
                              {p.vendor?.short || (p.vendor?.name || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className={styles.vName}>{p.vendor?.name || "—"}</div>
                              <div className={styles.ago}>
                                {p.items_label || "Items"} · {p.items_count || 0} item
                                {p.items_count === 1 ? "" : "s"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`${styles.pill} ${stagePillClass(p)}`}
                            style={{ fontSize: 11, fontWeight: 600 }}
                          >
                            <span className={styles.pdot} />
                            <span>{STAGE_LABELS[p.current_stage] || p.current_stage}</span>
                          </span>
                        </td>
                        <td>
                          <div className={styles.trackingProgress}>
                            <div className={styles.progressBar}>
                              {(p.stages || []).map((s, si) => (
                                <div
                                  key={si}
                                  className={`${styles.seg} ${
                                    s.status === "done"
                                      ? styles.done
                                      : s.status === "current"
                                      ? styles.current
                                      : ""
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={styles.pct}>{p.progress ?? 0}%</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.pillRow}>
                            <span
                              className={`${styles.pill} ${styles.miniPill} ${
                                p.grn_status === "done"
                                  ? styles.success
                                  : p.grn_status === "overdue"
                                  ? styles.danger
                                  : styles.neutral
                              }`}
                            >
                              GRN
                            </span>
                            <span
                              className={`${styles.pill} ${styles.miniPill} ${
                                p.invoice_status === "done" ? styles.success : styles.neutral
                              }`}
                            >
                              INV
                            </span>
                            <span
                              className={`${styles.pill} ${styles.miniPill} ${
                                p.payment_status === "done" ? styles.success : styles.neutral
                              }`}
                            >
                              PAY
                            </span>
                          </div>
                        </td>
                        <td>
                          <div
                            style={{
                              fontSize: "12.5px",
                              color: p.overdue ? "var(--danger)" : "var(--fg)",
                              fontWeight: p.overdue ? 500 : 400,
                            }}
                          >
                            {p.eta_delivery ? formatDisplayDate(p.eta_delivery) : "—"}
                          </div>
                          <div className={styles.ago} style={p.overdue ? { color: "var(--danger)" } : undefined}>
                            {p.eta_label || ""}
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className={styles.amount}>{inr(p.total_value)}</div>
                        </td>
                        <td>
                          <div className={styles.rowActions}>
                            <button
                              className={styles.iconBtn}
                              type="button"
                              title="Open PO"
                              onClick={(e) => onOpenPO(p.id, e)}
                            >
                              <ExternalLink size={14} />
                            </button>
                            <button
                              className={styles.iconBtn}
                              type="button"
                              title="More"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expanded[p.id] && (
                        <tr className={styles.timelineRow}>
                          <td colSpan={9}>
                            <div className={styles.trackTimeline}>
                              {(p.stages || []).map((s) => (
                                <div
                                  key={s.key}
                                  className={`${styles.trackStep} ${
                                    s.status === "done"
                                      ? styles.stepDone
                                      : s.status === "current"
                                      ? styles.stepCurrent
                                      : ""
                                  }`}
                                >
                                  <div className={styles.tsNode} />
                                  <div className={styles.tsLabel}>{s.label}</div>
                                  <div className={styles.tsDate}>{s.when ? formatDisplayDate(s.when) : "—"}</div>
                                </div>
                              ))}
                            </div>
                            <div className={styles.timelineActions}>
                              <div className={styles.timelineActionsLeft}>
                                {canUpdate && p.grn_status !== "done" && (
                                  <button
                                    className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Check size={12} /> Record GRN
                                  </button>
                                )}
                                {canUpdate && p.grn_status === "done" && p.invoice_status !== "done" && (
                                  <button
                                    className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <FileText size={12} /> Upload invoice
                                  </button>
                                )}
                                {canUpdate && p.invoice_status === "done" && p.payment_status !== "done" && (
                                  <button
                                    className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSm}`}
                                    type="button"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <IndianRupee size={12} /> Mark paid
                                  </button>
                                )}
                                {canUpdate && p.current_stage === "ack" && (
                                  <button
                                    className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}
                                    type="button"
                                    onClick={(e) => onMarkDispatched(p.id, e)}
                                  >
                                    <Truck size={12} /> Mark dispatched
                                  </button>
                                )}
                                <button
                                  className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                                  type="button"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MessageCircle size={12} /> Message vendor
                                </button>
                              </div>
                              <div className={styles.nextMilestone}>
                                {p.completed ? (
                                  <span className={styles.poClosed}>✓ PO closed</span>
                                ) : (
                                  <>
                                    Next milestone:{" "}
                                    <strong>{nextStage ? nextStage.label : "—"}</strong>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })
              )}
            </table>
          </div>

          {/* Pagination */}
          <div className={styles.pagination}>
            <span>
              Showing{" "}
              <span className={styles.mono} style={{ color: "var(--fg)", fontWeight: 500 }}>
                {rows.length}
              </span>{" "}
              of{" "}
              <span className={styles.mono} style={{ color: "var(--fg)", fontWeight: 500 }}>
                {totalItems}
              </span>{" "}
              POs
            </span>
            <div className={styles.pages}>
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                ‹
              </button>
              <button type="button" className={styles.pageActive}>
                {page}
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ›
              </button>
            </div>
          </div>
        </section>

        {/* Helper banner */}
        <div className={styles.helperBanner}>
          <div className={styles.helperIc}>
            <Info size={14} />
          </div>
          <div className={styles.helperText}>
            <strong>Site-rep GRN flow.</strong> Field personnel can record goods receipt without
            portal access — auto-generated, rate-limited links are sent on dispatch confirmation.
          </div>
          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
            Configure
          </button>
        </div>
      </main>
    </div>
  );
};

export default POTracking;
