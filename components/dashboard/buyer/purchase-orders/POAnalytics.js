import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  IndianRupee,
  Clock,
  Check,
  TrendingUp,
  Users,
  Download,
  FileText,
  ChevronRight,
} from "lucide-react";
import { getPOAnalytics } from "@/services/po";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import AccessDeniedPage from "@/components/shared/AccessDeniedPage";
import styles from "./POAnalytics.module.scss";

const PO_BASE = "/dashboard/buyer/purchase-orders";

const PERIODS = [
  { key: "this-week", label: "This week" },
  { key: "this-month", label: "This month" },
  { key: "this-quarter", label: "This quarter" },
  { key: "ytd", label: "YTD" },
];

// Status color map — ported from analytics.html donut/legend stroke logic.
const STATUS_COLOR = {
  pending: "#b45309",
  approved: "#15803d",
  dispatched: "#4338ca",
  delivered: "#16a34a",
  completed: "#14532d",
  rejected: "#b91c1c",
  draft: "#71717a",
};
const statusColor = (key) => STATUS_COLOR[key] || "#a1a1aa";

const AVATAR_BG = [
  { background: "linear-gradient(135deg,#e0e7ff,#c7d2fe)", color: "#3730a3" },
  { background: "linear-gradient(135deg,#fef3c7,#fde68a)", color: "#92400e" },
  { background: "linear-gradient(135deg,#dcfce7,#bbf7d0)", color: "#14532d" },
  { background: "linear-gradient(135deg,#fee2e2,#fecaca)", color: "#7f1d1d" },
  { background: "linear-gradient(135deg,#f4f4f5,#e4e4e7)", color: "#18181b" },
];

// rupees → lakh string (value/100000, 2 decimals)
const toLakh = (rupees) => (Number(rupees || 0) / 100000).toFixed(2);
const fmtPct = (n) => (n == null || n === 0 ? null : Number(n).toFixed(1));

const POAnalytics = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const [period, setPeriod] = useState("this-month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const hotelIds = useMemo(() => {
    const mappings = userProfile?.hospitality_mappings || [];
    return mappings.map((m) => m.hospitality_hotel_id).filter(Boolean);
  }, [userProfile]);

  const { canRead, loading: permissionsLoading } = useModulePermissions({
    moduleKey: "awarding",
    hotelIds,
    departmentId: null,
    enabled: hotelIds.length > 0,
  });

  const fetchAnalytics = useCallback(async () => {
    if (!canRead) return;
    setLoading(true);
    try {
      const res = await getPOAnalytics({ period });
      setData(res || null);
    } catch (err) {
      console.error("Failed to load PO analytics", err);
      toast.error(err?.message || "Unable to load PO analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canRead, period]);

  useEffect(() => {
    if (!permissionsLoading && canRead) fetchAnalytics();
  }, [permissionsLoading, canRead, fetchAnalytics]);

  const showSkeleton = permissionsLoading || (loading && !data);

  const kpis = data?.kpis || {};
  const spendTrend = data?.spend_trend || [];
  const statusDist = data?.status_dist || [];
  const bottlenecks = data?.bottlenecks || [];
  const topVendors = data?.top_vendors || [];
  const savings = data?.savings || {};
  const compliance = data?.compliance || [];
  const spendByDept = data?.spend_by_dept || [];
  const queue = data?.queue_health || {};

  // Bar-chart scaling (mirrors prototype barHeight: max(8, (v/max)*160))
  const spendMax = useMemo(
    () => Math.max(1, ...spendTrend.map((s) => Number(s.value) || 0)),
    [spendTrend]
  );
  const barHeight = (v) => Math.max(8, (Number(v || 0) / spendMax) * 160);

  // Donut segments (ported from analytics.html donutSegs getter; r=56)
  const donutSegs = useMemo(() => {
    const r = 56;
    const C = 2 * Math.PI * r;
    let acc = 0;
    return statusDist.map((s) => {
      const len = ((Number(s.pct) || 0) / 100) * C;
      const seg = { ...s, length: len, offset: -acc, total: C };
      acc += len;
      return seg;
    });
  }, [statusDist]);
  const donutCircumference = 2 * Math.PI * 56;

  const statusTotalCount = useMemo(
    () => statusDist.reduce((a, b) => a + (Number(b.count) || 0), 0),
    [statusDist]
  );
  const statusTotalValueL = useMemo(
    () => statusDist.reduce((a, b) => a + (Number(b.value) || 0), 0),
    [statusDist]
  );

  const maxDeptValue = useMemo(
    () => Math.max(1, ...spendByDept.map((d) => Number(d.value) || 0)),
    [spendByDept]
  );

  if (!permissionsLoading && hotelIds.length > 0 && !canRead) {
    return (
      <div className={styles.page}>
        <div className={styles.pageBody}>
          <AccessDeniedPage
            title="Access Denied"
            message="You do not have permission to view PO Analytics. Contact your administrator to request access."
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
            <span className={styles.dot} /> Live · refreshed just now
          </div>
          <div className={styles.pageTitleRow}>
            <div>
              <h1 className={styles.pageTitle}>PO Analytics</h1>
              <p className={styles.pageSub}>
                Spend velocity, vendor performance, approval bottlenecks, and savings — at a glance.
              </p>
            </div>
            <div className={styles.headerActions}>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
                <Download size={13} /> Export report
              </button>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} type="button">
                <FileText size={13} /> Custom report
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PAGE BODY */}
      <main className={styles.pageBody}>
        {/* Period selector */}
        <div className={styles.periodBar}>
          <div className={styles.periodPills}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                className={period === p.key ? styles.pillActive : ""}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className={styles.periodMeta}>
            Reporting period: <strong>{PERIODS.find((p) => p.key === period)?.label}</strong>
          </div>
        </div>

        {/* KPI strip */}
        {showSkeleton ? (
          <section className={styles.kpiStrip}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`${styles.skel} ${styles.skelKpi}`} />
            ))}
          </section>
        ) : (
          <section className={styles.kpiStrip}>
            {/* Total spend */}
            <div className={styles.kpiCard}>
              <div className={styles.kHead}>
                <span className={styles.kLabel}>Total spend</span>
                <div className={styles.kIc}><IndianRupee size={13} /></div>
              </div>
              <div className={styles.kValue}>
                <span className={styles.cur}>₹</span> {toLakh(kpis.total_spend)} <span className={styles.suffix}>L</span>
              </div>
              <div className={styles.kMeta}>
                {fmtPct(kpis.spend_delta_pct) ? (
                  <span className={`${styles.delta} ${kpis.spend_delta_pct >= 0 ? styles.up : styles.down}`}>
                    {kpis.spend_delta_pct >= 0 ? "↑" : "↓"} {Math.abs(kpis.spend_delta_pct).toFixed(1)}%
                  </span>
                ) : (
                  <span style={{ color: "var(--fg-4)" }}>—</span>
                )}
                <span>vs previous period</span>
              </div>
            </div>

            {/* Avg approval cycle */}
            <div className={styles.kpiCard}>
              <div className={styles.kHead}>
                <span className={styles.kLabel}>Avg approval cycle</span>
                <div className={styles.kIc}><Clock size={13} /></div>
              </div>
              <div className={styles.kValue}>
                {Number(kpis.avg_approval_cycle_days || 0).toFixed(1)} <span className={styles.suffix}>days</span>
              </div>
              <div className={styles.kMeta}>
                {kpis.approval_cycle_delta ? (
                  <span className={`${styles.delta} ${kpis.approval_cycle_delta <= 0 ? styles.down : styles.up}`}>
                    {kpis.approval_cycle_delta <= 0 ? "↓" : "↑"} {Math.abs(kpis.approval_cycle_delta).toFixed(1)}d
                  </span>
                ) : (
                  <span style={{ color: "var(--fg-4)" }}>—</span>
                )}
                <span>vs previous period</span>
              </div>
            </div>

            {/* On-time delivery (often 0 — not modelled server-side) */}
            <div className={styles.kpiCard}>
              <div className={styles.kHead}>
                <span className={styles.kLabel}>On-time delivery</span>
                <div className={styles.kIc}><Check size={13} /></div>
              </div>
              <div className={styles.kValue}>
                {kpis.on_time_delivery_pct ? (
                  <>{Math.round(kpis.on_time_delivery_pct)}<span className={styles.suffix}>%</span></>
                ) : (
                  <span style={{ color: "var(--fg-4)" }}>—</span>
                )}
              </div>
              <div className={styles.kMeta}>
                {fmtPct(kpis.otd_delta) ? (
                  <span className={`${styles.delta} ${kpis.otd_delta >= 0 ? styles.up : styles.down}`}>
                    {kpis.otd_delta >= 0 ? "↑" : "↓"} {Math.abs(kpis.otd_delta)}%
                  </span>
                ) : (
                  <span style={{ color: "var(--fg-4)" }}>not tracked yet</span>
                )}
              </div>
            </div>

            {/* Cost savings (often 0 — not modelled server-side) */}
            <div className={styles.kpiCard}>
              <div className={styles.kHead}>
                <span className={styles.kLabel}>Cost savings</span>
                <div className={`${styles.kIc} ${styles.kIcSuccess}`}><TrendingUp size={13} /></div>
              </div>
              <div className={styles.kValue} style={{ color: kpis.cost_savings ? "var(--success)" : undefined }}>
                <span className={styles.cur} style={kpis.cost_savings ? { color: "rgba(21,128,61,0.5)" } : undefined}>₹</span>{" "}
                {toLakh(kpis.cost_savings)}{" "}
                <span className={styles.suffix} style={kpis.cost_savings ? { color: "rgba(21,128,61,0.6)" } : undefined}>L</span>
              </div>
              <div className={styles.kMeta}>
                {fmtPct(kpis.savings_pct) ? (
                  <>
                    <span style={{ color: "var(--success)", fontWeight: 600 }}>{Number(kpis.savings_pct).toFixed(1)}%</span>
                    <span>off market price</span>
                  </>
                ) : (
                  <span style={{ color: "var(--fg-4)" }}>not tracked yet</span>
                )}
              </div>
            </div>

            {/* Active vendors */}
            <div className={styles.kpiCard}>
              <div className={styles.kHead}>
                <span className={styles.kLabel}>Active vendors</span>
                <div className={styles.kIc}><Users size={13} /></div>
              </div>
              <div className={styles.kValue}>{kpis.active_vendors || 0}</div>
              <div className={styles.kMeta}>
                {kpis.vendor_categories ? (
                  <>across <span style={{ color: "var(--fg-2)", fontWeight: 500 }}>{kpis.vendor_categories} categories</span></>
                ) : (
                  <span style={{ color: "var(--fg-4)" }}>—</span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Charts grid */}
        {showSkeleton ? (
          <div className={styles.analyticsGrid}>
            <div className={`${styles.col8} ${styles.skel} ${styles.skelCard}`} />
            <div className={`${styles.col4} ${styles.skel} ${styles.skelCard}`} />
            <div className={`${styles.col6} ${styles.skel} ${styles.skelCard}`} />
            <div className={`${styles.col6} ${styles.skel} ${styles.skelCard}`} />
            <div className={`${styles.col8} ${styles.skel} ${styles.skelCard}`} />
            <div className={`${styles.col4} ${styles.skel} ${styles.skelCard}`} />
          </div>
        ) : (
          <div className={styles.analyticsGrid}>
            {/* Spend trend */}
            <div className={`${styles.chartCard} ${styles.col8}`}>
              <div className={styles.chHead}>
                <div className={styles.chLeft}>
                  <h3>Spend trend</h3>
                  <div className={styles.chSub}>Total PO value committed per month · INR lakh</div>
                </div>
                {fmtPct(kpis.spend_delta_pct) && (
                  <span className={`${styles.chDelta} ${kpis.spend_delta_pct >= 0 ? styles.up : styles.down}`}>
                    {kpis.spend_delta_pct >= 0 ? "↑" : "↓"} {Math.abs(kpis.spend_delta_pct).toFixed(1)}% MoM
                  </span>
                )}
              </div>
              <div className={styles.chBody}>
                {spendTrend.length === 0 ? (
                  <div className={styles.emptyMini}>No spend data for this period.</div>
                ) : (
                  <>
                    <div className={styles.bigStat}>
                      <span className={styles.cur}>₹</span>
                      <span className={styles.v}>
                        {toLakh((spendTrend.find((s) => s.current) || spendTrend[spendTrend.length - 1])?.value)}
                      </span>
                      <span className={styles.suffix}>
                        L · {(spendTrend.find((s) => s.current) || spendTrend[spendTrend.length - 1])?.month}
                      </span>
                    </div>
                    <div className={styles.barChart} style={{ gridTemplateColumns: `repeat(${spendTrend.length}, 1fr)` }}>
                      {spendTrend.map((s, i) => (
                        <div key={i} className={styles.barCol}>
                          <div
                            className={`${styles.bar} ${s.current ? styles.barCurrent : ""}`}
                            style={{ height: `${barHeight(toLakh(s.value))}px` }}
                          >
                            <span className={styles.v}>₹{toLakh(s.value)} L</span>
                          </div>
                          <span className={`${styles.barLabel} ${s.current ? styles.current : ""}`}>{s.month}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Cost savings (highlighted) */}
            <div className={`${styles.chartCard} ${styles.savingsCard} ${styles.col4}`}>
              <div className={`${styles.chHead} ${styles.savingsHead}`}>
                <div className={styles.chLeft}>
                  <h3 className={styles.savingsTitle}>Cost savings achieved</h3>
                  <div className={styles.chSub}>vs initial vendor quotes</div>
                </div>
              </div>
              <div className={styles.chBody}>
                {!savings.total && !savings.rounds?.negotiation && !savings.rounds?.comparison && !savings.rounds?.alt ? (
                  <>
                    <div className={styles.savingsStat}>
                      <span className={styles.cur}>₹</span>
                      <span>0.00</span>
                      <span className={styles.suffix}>L</span>
                    </div>
                    <div className={styles.savingsEmpty}>No savings data yet</div>
                  </>
                ) : (
                  <>
                    <div className={styles.savingsStat}>
                      <span className={styles.cur}>₹</span>
                      <span>{toLakh(savings.total)}</span>
                      <span className={styles.suffix}>L</span>
                    </div>
                    {fmtPct(savings.delta_pct) && (
                      <div className={styles.savingsReduction}>
                        <TrendingUp size={11} />
                        <span>{Number(savings.delta_pct).toFixed(1)}% reduction</span>
                      </div>
                    )}
                    <div className={styles.savingsMiniList}>
                      <div className={styles.savingsMiniRow}>
                        <span className="k" style={{ color: "var(--fg-3)" }}>Negotiation rounds</span>
                        <span className="v" style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: "var(--success)" }}>₹{toLakh(savings.rounds?.negotiation)} L</span>
                      </div>
                      <div className={styles.savingsMiniRow}>
                        <span className="k" style={{ color: "var(--fg-3)" }}>Quote comparison</span>
                        <span className="v" style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: "var(--success)" }}>₹{toLakh(savings.rounds?.comparison)} L</span>
                      </div>
                      <div className={styles.savingsMiniRow}>
                        <span className="k" style={{ color: "var(--fg-3)" }}>Alternate sourcing</span>
                        <span className="v" style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 600, color: "var(--success)" }}>₹{toLakh(savings.rounds?.alt)} L</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* PO status distribution (donut) */}
            <div className={`${styles.chartCard} ${styles.col6}`}>
              <div className={styles.chHead}>
                <div className={styles.chLeft}>
                  <h3>PO portfolio · by status</h3>
                  <div className={styles.chSub}>
                    {statusTotalCount} POs · ₹{statusTotalValueL.toFixed(2)} L committed
                  </div>
                </div>
              </div>
              <div className={styles.chBody}>
                {statusDist.length === 0 ? (
                  <div className={styles.emptyMini}>No PO status data for this period.</div>
                ) : (
                  <div className={styles.donutWrap}>
                    <div className={styles.donutStage}>
                      <svg className={styles.donutSvg} viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="56" fill="none" stroke="var(--surface-3)" strokeWidth="16" />
                        {donutSegs.map((seg, i) => (
                          <circle
                            key={i}
                            cx="70"
                            cy="70"
                            r="56"
                            fill="none"
                            stroke={statusColor(seg.key)}
                            strokeWidth="16"
                            strokeDasharray={`${seg.length} ${seg.total - seg.length}`}
                            strokeDashoffset={seg.offset}
                            transform="rotate(-90 70 70)"
                          />
                        ))}
                      </svg>
                      <div className={styles.donutCenter}>
                        <div className="lbl" style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--fg-4)", fontWeight: 600 }}>Total POs</div>
                        <div className="v" style={{ marginTop: 2, fontSize: 22, fontWeight: 700, color: "var(--fg)", letterSpacing: "-0.025em" }}>{statusTotalCount}</div>
                      </div>
                    </div>
                    <div className={styles.legendList}>
                      {statusDist.map((s) => (
                        <div key={s.key} className={styles.legendItem}>
                          <span className={styles.swatch} style={{ background: statusColor(s.key) }} />
                          <span className={styles.name}>{s.label}</span>
                          <span className={styles.v}>{s.count}</span>
                          <span className={styles.pct}>({Number(s.pct || 0).toFixed(1)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Approval bottlenecks */}
            <div className={`${styles.chartCard} ${styles.col6}`}>
              <div className={styles.chHead}>
                <div className={styles.chLeft}>
                  <h3>Approval bottlenecks</h3>
                  <div className={styles.chSub}>Avg time POs spend at each stage</div>
                </div>
              </div>
              <div className={styles.chBody}>
                {bottlenecks.length === 0 ? (
                  <div className={styles.emptyMini}>No bottleneck data for this period.</div>
                ) : (
                  <ol className={styles.bottleneckList}>
                    {bottlenecks.map((b, i) => (
                      <li
                        key={b.stage + i}
                        className={`${styles.bottleneckRow} ${
                          b.status === "slow" ? styles.slow : b.status === "warn" ? styles.warn : styles.ok
                        }`}
                      >
                        <span className={styles.bNum}>{i + 1}</span>
                        <div>
                          <div className={styles.bName}>{b.stage}</div>
                          <div className={styles.bMetaSub}>{b.sub}</div>
                        </div>
                        <div className={styles.bTime}>{b.time}</div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Top vendors */}
            <div className={`${styles.chartCard} ${styles.col8}`}>
              <div className={styles.chHead}>
                <div className={styles.chLeft}>
                  <h3>Top vendors · by spend</h3>
                  <div className={styles.chSub}>Ranked by total PO value</div>
                </div>
                <Link href="/dashboard/buyer/vendor-management" className={styles.allLink}>
                  All vendors →
                </Link>
              </div>
              {topVendors.length === 0 ? (
                <div className={styles.chBody}>
                  <div className={styles.emptyMini}>No vendor spend data for this period.</div>
                </div>
              ) : (
                <table className={styles.vendorRankTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 36 }}>#</th>
                      <th>Vendor</th>
                      <th className={styles.num}>Orders</th>
                      <th className={styles.num}>Spend</th>
                      <th>On-time delivery</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {topVendors.map((v, i) => (
                      <tr key={v.name + i}>
                        <td>
                          <span className={styles.rank}>{i + 1}</span>
                        </td>
                        <td>
                          <div className={styles.vendorCell}>
                            <div className={styles.vAvatar} style={AVATAR_BG[i % AVATAR_BG.length]}>
                              {v.short || (v.name || "?").slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className={styles.vName}>{v.name}</div>
                              <div className={styles.vTier}>{v.on_time ? "↑ Top tier" : v.otd ? "↓ Watch" : "—"}</div>
                            </div>
                          </div>
                        </td>
                        <td className={styles.num}>{v.orders}</td>
                        <td className={styles.num}>
                          <span style={{ color: "var(--fg-4)" }}>₹</span> {toLakh(v.value)}
                          <span style={{ color: "var(--fg-3)", fontSize: 11 }}> L</span>
                        </td>
                        <td>
                          {v.otd ? (
                            <div className={styles.otdBar}>
                              <div className="bar" style={{ width: 50, height: 5, background: "var(--surface-3)", borderRadius: 99, overflow: "hidden" }}>
                                <div
                                  className={`${styles.fill} ${v.otd >= 90 ? "" : v.otd >= 80 ? styles.warn : styles.danger}`}
                                  style={{
                                    width: `${v.otd}%`,
                                    height: "100%",
                                    borderRadius: 99,
                                    background: v.otd >= 90 ? "var(--success)" : v.otd >= 80 ? "var(--warn)" : "var(--danger)",
                                  }}
                                />
                              </div>
                              <span className={styles.otdVal}>{v.otd}%</span>
                            </div>
                          ) : (
                            <span style={{ color: "var(--fg-4)", fontSize: 12 }}>—</span>
                          )}
                        </td>
                        <td>
                          <button className={styles.iconBtn} type="button">
                            <ChevronRight size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Compliance & risk */}
            <div className={`${styles.chartCard} ${styles.col4}`}>
              <div className={styles.chHead}>
                <div className={styles.chLeft}>
                  <h3>Compliance &amp; risk</h3>
                  <div className={styles.chSub}>Coverage across current portfolio</div>
                </div>
              </div>
              <div className={styles.chBody}>
                {compliance.length === 0 ? (
                  <div className={styles.emptyMini}>No compliance data for this period.</div>
                ) : (
                  <div className={styles.hbarList}>
                    {compliance.map((c) => (
                      <div key={c.name} className={styles.hbarRow}>
                        <span className={styles.hName}>{c.name}</span>
                        <div className={styles.hBar}>
                          <div
                            className={`${styles.fill} ${
                              c.tone === "warn" ? styles.warn : c.tone === "danger" ? styles.danger : ""
                            }`}
                            style={{ width: `${c.pct}%` }}
                          />
                        </div>
                        <span className={styles.hVal} style={c.tone === "danger" ? { color: "var(--danger)" } : undefined}>
                          {c.pct}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Spend by department */}
            <div className={`${styles.chartCard} ${styles.col6}`}>
              <div className={styles.chHead}>
                <div className={styles.chLeft}>
                  <h3>Spend by department</h3>
                  <div className={styles.chSub}>Top cost centers · this period</div>
                </div>
              </div>
              <div className={styles.chBody}>
                {spendByDept.length === 0 ? (
                  <div className={styles.emptyMini}>No department spend data for this period.</div>
                ) : (
                  <div className={styles.hbarList}>
                    {spendByDept.map((d) => (
                      <div key={d.name} className={styles.hbarRow}>
                        <span className={styles.hName}>{d.name}</span>
                        <div className={styles.hBar}>
                          <div
                            className={`${styles.fill} ${styles.accent}`}
                            style={{ width: `${Math.max(2, (Number(d.value) / maxDeptValue) * 100)}%` }}
                          />
                        </div>
                        <span className={styles.hVal}>₹{toLakh(d.value)} L</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Approval queue health */}
            <div className={`${styles.chartCard} ${styles.col6}`}>
              <div className={styles.chHead}>
                <div className={styles.chLeft}>
                  <h3>Approval queue health</h3>
                  <div className={styles.chSub}>Pending POs by waiting time</div>
                </div>
              </div>
              <div className={styles.chBody}>
                <div className={styles.queueGrid}>
                  <div className={`${styles.queueCell} ${styles.ok}`}>
                    <div className={styles.queueNum}>{queue.under_24h || 0}</div>
                    <div className={styles.queueRange}>&lt; 24 hrs</div>
                    <div className={styles.queueState}>Healthy</div>
                  </div>
                  <div className={`${styles.queueCell} ${styles.warn}`}>
                    <div className={styles.queueNum}>{queue.d1_to_3 || 0}</div>
                    <div className={styles.queueRange}>1–3 days</div>
                    <div className={styles.queueState}>Needs attention</div>
                  </div>
                  <div className={`${styles.queueCell} ${styles.danger}`}>
                    <div className={styles.queueNum}>{queue.over_3d || 0}</div>
                    <div className={styles.queueRange}>&gt; 3 days</div>
                    <div className={styles.queueState}>Escalate</div>
                  </div>
                </div>
                <div className={styles.queueSummary}>
                  <strong>
                    {(queue.under_24h || 0) + (queue.d1_to_3 || 0) + (queue.over_3d || 0)} pending POs.
                  </strong>{" "}
                  {queue.oldest_days ? (
                    <>
                      The oldest has been waiting{" "}
                      <strong className={styles.warnTxt}>{queue.oldest_days} days</strong>.{" "}
                    </>
                  ) : null}
                  {queue.avg_approval_days ? (
                    <>
                      Average time-to-approval is{" "}
                      <strong>{Number(queue.avg_approval_days).toFixed(1)} days</strong>, against the{" "}
                      <strong>5-day SLA target</strong>.
                    </>
                  ) : (
                    <span style={{ color: "var(--fg-4)" }}>Approval cycle time not tracked yet.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default POAnalytics;
