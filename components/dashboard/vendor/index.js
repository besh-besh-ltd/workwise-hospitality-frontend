import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import Head from "next/head";
import Link from "next/link";
import moment from "moment";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Tooltip, Legend, Filler,
} from "chart.js";
import {
  FileText, Clock, Flame, ShoppingCart, Inbox, Activity, Trophy, TrendingUp,
  Package, ArrowRight, BarChart3, LineChart, Target, PieChart, Layers, RefreshCw,
} from "lucide-react";
import { getVendorOpportunities, getVendorPerformance, getVendorInsights } from "@/services/vendorDashboard";
import SubscriptionStatus from "./SubscriptionStatus";
import { PersonaCardShell } from "../buyer/persona-widgets/PersonaCard";
import {
  Seg,
  SkeletonKpiGrid,
  SkeletonRankList,
  SkeletonChart,
  SkeletonActivityFeed,
  SkeletonLabeledRows,
  SkeletonBarWithLegend,
} from "@/components/dashboard/shared";
import styles from "./VendorDashboard.module.scss";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const RANGE_OPTIONS = [
  { label: "30D", value: "past30days" },
  { label: "FY", value: "fy" },
  { label: "All", value: "allTime" },
];

const getDateRange = (type) => {
  const today = moment().endOf("day");
  switch (type) {
    case "past30days":
      return { start_date: moment().subtract(29, "days").format("YYYY-MM-DD"), end_date: today.format("YYYY-MM-DD") };
    case "fy": {
      const now = moment();
      const fyStartYear = now.month() >= 3 ? now.year() : now.year() - 1;
      return {
        start_date: moment({ year: fyStartYear, month: 3, day: 1 }).format("YYYY-MM-DD"),
        end_date: today.format("YYYY-MM-DD"),
      };
    }
    case "allTime":
      return { start_date: "2025-01-01", end_date: today.format("YYYY-MM-DD") };
    default:
      return { start_date: moment().subtract(29, "days").format("YYYY-MM-DD"), end_date: today.format("YYYY-MM-DD") };
  }
};

const formatCurrency = (v) => {
  if (!v || v === 0) return "₹0";
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};

const Vendor = () => {
  const userProfile = useSelector((state) => state.userProfile);
  const firstName = userProfile?.name?.split(" ")?.[0] || "there";
  const isHospitalityVendor = userProfile && (userProfile.is_hospitality === 1 || userProfile.is_hospitality === '1');

  const [range, setRange] = useState(RANGE_OPTIONS[1].value); // FY default
  const [opp, setOpp] = useState(null);
  const [perf, setPerf] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loadingOpp, setLoadingOpp] = useState(true);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const intervalRef = useRef(null);

  const filters = useMemo(() => getDateRange(range), [range]);

  const fetchOpp = useCallback(() => {
    setLoadingOpp(true);
    getVendorOpportunities(filters).then((r) => setOpp(r.data)).catch(() => {}).finally(() => setLoadingOpp(false));
  }, [filters]);
  const fetchPerf = useCallback(() => {
    setLoadingPerf(true);
    getVendorPerformance(filters).then((r) => setPerf(r.data)).catch(() => {}).finally(() => setLoadingPerf(false));
  }, [filters]);
  const fetchInsights = useCallback(() => {
    setLoadingInsights(true);
    getVendorInsights(filters).then((r) => setInsights(r.data)).catch(() => {}).finally(() => setLoadingInsights(false));
  }, [filters]);

  const fetchAll = useCallback(() => {
    fetchOpp(); fetchPerf(); fetchInsights();
  }, [fetchOpp, fetchPerf, fetchInsights]);

  useEffect(() => {
    if (!userProfile) return;
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 30000);
    return () => clearInterval(intervalRef.current);
  }, [userProfile, fetchAll]);

  const getGreeting = () => { const h = new Date().getHours(); return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening"; };

  // ── Charts ──
  const revenueChartData = insights?.revenue_trend ? {
    labels: insights.revenue_trend.labels.map((l) => new Date(l).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })),
    datasets: [{
      label: "Revenue", data: insights.revenue_trend.data,
      borderColor: "#2563eb", backgroundColor: "rgba(37, 99, 235, 0.08)",
      borderWidth: 2, pointRadius: 3, pointBackgroundColor: "#2563eb", tension: 0.3, fill: true,
    }],
  } : null;

  const hasRevenueData = insights?.revenue_trend?.data?.some((v) => v > 0);

  const buChartData = insights?.bu_performance?.length > 0 ? {
    labels: insights.bu_performance.map((b) => b.business_unit),
    datasets: [
      { label: "RFQs Received", data: insights.bu_performance.map((b) => b.rfqs_received), backgroundColor: "rgba(37, 99, 235, 0.75)", borderRadius: 4 },
      { label: "Orders Won", data: insights.bu_performance.map((b) => b.orders_received), backgroundColor: "rgba(21, 128, 61, 0.75)", borderRadius: 4 },
    ],
  } : null;

  const lineChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#18181b", cornerRadius: 8, callbacks: { label: (c) => formatCurrency(c.raw) } } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#a1a1aa" } }, y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 }, color: "#a1a1aa", callback: (v) => formatCurrency(v) } } },
  };

  const barChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", font: { size: 11 }, padding: 16, color: "#52525b" } }, tooltip: { backgroundColor: "#18181b", cornerRadius: 8 } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: "#52525b" } }, y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 }, color: "#a1a1aa" } } },
  };

  const OPP_CARDS = [
    { key: "new_rfqs", label: "New RFQs", icon: FileText, accent: "info", statusLabel: "NEW", href: "/dashboard/vendor/inquiries-received" },
    { key: "pending_quotes", label: "Pending Quotes", icon: Clock, accent: "warn", statusLabel: "ACTION", href: "/dashboard/vendor/inquiries-received" },
    { key: "closing_soon", label: "Closing Soon", icon: Flame, accent: "danger", statusLabel: "URGENT", href: "/dashboard/vendor/inquiries-received" },
    { key: "pos_received", label: "POs Received", icon: ShoppingCart, accent: "success", statusLabel: null, href: "/dashboard/vendor/order-book" },
  ];

  // Response efficiency breakdown
  const eff = insights?.response_efficiency;
  const effTotal = (eff?.responded_count || 0) + (eff?.missed_count || 0);
  const responsePct = effTotal > 0 ? Math.round(((eff?.responded_count || 0) / effTotal) * 100) : 0;

  // Win/Loss
  const wl_w = insights?.win_loss?.won || 0;
  const wl_l = insights?.win_loss?.lost || 0;
  const wl_p = insights?.win_loss?.pending || 0;
  const wl_total = wl_w + wl_l + wl_p;

  // Performance funnel tiles
  const PERF_TILES = [
    { key: "rfqs_invited",  label: "Invited",     value: perf?.rfqs_invited ?? 0 },
    { key: "rfqs_quoted",   label: "Quoted",      value: perf?.rfqs_quoted ?? 0 },
    { key: "rfqs_finalized",label: "Finalized",   value: perf?.rfqs_finalized ?? 0 },
    { key: "deals_won",     label: "Won / Final",value: `${perf?.deals_won ?? 0} / ${perf?.rfqs_finalized ?? 0}` },
    { key: "total_revenue", label: "Revenue",     value: formatCurrency(perf?.total_revenue), highlighted: true },
    { key: "win_rate",      label: "Win Rate",    value: `${perf?.win_rate ?? 0}%` },
  ];

  return (
    <>
      <Head><title>Dashboard | Vendor</title></Head>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.greetingBlock}>
            <h1 className={styles.greeting}>{getGreeting()}, {firstName}!</h1>
            <p className={styles.subtitle}>Your business growth at a glance.</p>
          </div>
          <div className={styles.headerRight}>
            <Seg options={RANGE_OPTIONS} value={range} onChange={setRange} />
            <button
              type="button"
              className={styles.refreshBtn}
              onClick={fetchAll}
              title="Refresh all data"
              aria-label="Refresh"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Subscription banner — kept full-width but restyled */}
        {isHospitalityVendor && <SubscriptionStatus />}

        {/* Opportunities */}
        <PersonaCardShell
          title="Opportunities"
          icon={Inbox}
          tooltip="Live counts of incoming RFQs, pending quotes, urgent closures, and recent POs."
          loading={loadingOpp}
          skeleton={<SkeletonKpiGrid count={OPP_CARDS.length} />}
          onRefresh={fetchOpp}
        >
          <div className={styles.oppGrid}>
            {OPP_CARDS.map((card) => {
              const Icon = card.icon;
              const count = opp?.[card.key] ?? 0;
              const isActive = count > 0;
              return (
                <Link
                  key={card.key}
                  href={card.href}
                  className={`${styles.oppItem} ${styles[card.accent]}`}
                >
                  <div className={styles.oppHead}>
                    <div className={styles.oppLabel}>{card.label}</div>
                    <div className={`${styles.oppIcon} ${styles[card.accent]}`}>
                      <Icon size={13} />
                    </div>
                  </div>
                  <div className={styles.oppRow}>
                    <div className={`${styles.oppValue} ${isActive ? styles[card.accent] : ""}`}>
                      {count}
                    </div>
                    {isActive && card.statusLabel && (
                      <span className={`${styles.statusPill} ${styles[card.accent]}`}>
                        {card.statusLabel}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </PersonaCardShell>

        {/* Performance Funnel */}
        <PersonaCardShell
          title="Performance funnel"
          icon={Target}
          tooltip="From inviting to revenue — your conversion across the selected period."
          loading={loadingPerf}
          skeleton={<SkeletonKpiGrid count={PERF_TILES.length} />}
          onRefresh={fetchPerf}
        >
          <div className={styles.perfGrid}>
            {PERF_TILES.map((tile) => (
              <div
                key={tile.key}
                className={`${styles.perfItem} ${tile.highlighted ? styles.highlighted : ""}`}
              >
                <div className={styles.perfLabel}>{tile.label}</div>
                <div className={styles.perfValue}>{tile.value}</div>
              </div>
            ))}
          </div>
        </PersonaCardShell>

        {/* Insights grid */}
        <div className={styles.mainContent}>
          <div className={styles.leftColumn}>
            <PersonaCardShell
              title="Revenue trend"
              icon={LineChart}
              tooltip="Revenue from finalised orders over the selected period."
              loading={loadingInsights}
              isEmpty={!hasRevenueData}
              skeleton={<SkeletonChart legendCount={0} />}
              renderEmpty={() => (
                <div className={styles.emptyText}>No revenue data for this period.</div>
              )}
              onRefresh={fetchInsights}
            >
              <div className={styles.chartWrap}>
                <Line data={revenueChartData} options={lineChartOpts} />
              </div>
            </PersonaCardShell>

            <PersonaCardShell
              title="Business unit performance"
              icon={BarChart3}
              tooltip="RFQs received vs. orders won, split by business unit."
              loading={loadingInsights}
              isEmpty={!buChartData}
              skeleton={<SkeletonChart legendCount={2} />}
              renderEmpty={() => (
                <div className={styles.emptyText}>No business unit data.</div>
              )}
              onRefresh={fetchInsights}
            >
              <div className={styles.chartWrap}>
                <Bar data={buChartData} options={barChartOpts} />
              </div>
            </PersonaCardShell>

            <PersonaCardShell
              title="Top quoted products"
              icon={Package}
              tooltip="Products you've been quoting most often, ranked by frequency."
              loading={loadingInsights}
              isEmpty={!insights?.top_products?.length}
              skeleton={<SkeletonRankList rows={4} />}
              renderEmpty={() => (
                <div className={styles.emptyText}>No products quoted in this period.</div>
              )}
              onRefresh={fetchInsights}
            >
              <div className={styles.productList}>
                {insights?.top_products?.map((p, i) => (
                  <div key={i} className={styles.productRow}>
                    <span className={styles.productRank}>{i + 1}</span>
                    <span className={styles.productName}>{p.product_name}</span>
                    <span className={styles.productCount}>{p.times_quoted}x</span>
                    <span className={styles.productValue}>{formatCurrency(p.avg_quote_value)} avg</span>
                  </div>
                ))}
              </div>
            </PersonaCardShell>
          </div>

          <div className={styles.rightColumn}>
            <PersonaCardShell
              title="Response efficiency"
              icon={Activity}
              tooltip="Share of RFQs you responded to vs. missed, plus average turnaround."
              loading={loadingInsights}
              skeleton={<SkeletonLabeledRows rows={4} />}
              actions={
                effTotal > 0 ? (
                  <span className={`${styles.headerPill} ${responsePct >= 70 ? styles.winPill : styles.warnPill}`}>
                    {responsePct}%
                  </span>
                ) : null
              }
              onRefresh={fetchInsights}
            >
              <div className={styles.effBlock}>
                <div className={styles.effHeadline}>
                  <div className={styles.effLbl}>Response rate</div>
                  <div className={styles.effNum}>{responsePct}%</div>
                </div>
                <div className={styles.effRows}>
                  <div className={styles.effRow}>
                    <span className={`${styles.effDot} ${styles.success}`} />
                    <span className={styles.effRowLabel}>Responded</span>
                    <span className={styles.effRowValue}>{eff?.responded_count ?? 0}</span>
                  </div>
                  <div className={styles.effRow}>
                    <span className={`${styles.effDot} ${styles.danger}`} />
                    <span className={styles.effRowLabel}>Missed</span>
                    <span className={styles.effRowValue}>{eff?.missed_count ?? 0}</span>
                  </div>
                  <div className={styles.effRow}>
                    <span className={`${styles.effDot} ${styles.info}`} />
                    <span className={styles.effRowLabel}>Avg. response</span>
                    <span className={styles.effRowValue}>{eff?.avg_response_days > 0 ? `${eff.avg_response_days}d` : "–"}</span>
                  </div>
                  <div className={styles.effRow}>
                    <span className={`${styles.effDot} ${styles.warn}`} />
                    <span className={styles.effRowLabel}>Within 24h</span>
                    <span className={styles.effRowValue}>{eff?.within_24h ?? 0}</span>
                  </div>
                </div>
              </div>
            </PersonaCardShell>

            <PersonaCardShell
              title="Win / loss breakdown"
              icon={Trophy}
              tooltip="Distribution of competed RFQs: won, lost, or still pending decision."
              loading={loadingInsights}
              isEmpty={wl_total === 0}
              skeleton={<SkeletonBarWithLegend legendCount={3} />}
              renderEmpty={() => (
                <div className={styles.emptyText}>No competed RFQs in this period.</div>
              )}
              onRefresh={fetchInsights}
            >
              <div className={styles.winLossBar}>
                {wl_w > 0 && <div className={`${styles.winSeg}`} style={{ width: `${(wl_w / wl_total) * 100}%` }}>{wl_w}</div>}
                {wl_l > 0 && <div className={`${styles.lossSeg}`} style={{ width: `${(wl_l / wl_total) * 100}%` }}>{wl_l}</div>}
                {wl_p > 0 && <div className={`${styles.pendingSeg}`} style={{ width: `${(wl_p / wl_total) * 100}%` }}>{wl_p}</div>}
              </div>
              <div className={styles.winLossLegend}>
                <span className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.success}`} />
                  Won ({wl_w})
                </span>
                <span className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.danger}`} />
                  Lost ({wl_l})
                </span>
                <span className={styles.legendItem}>
                  <span className={`${styles.legendDot} ${styles.warn}`} />
                  Pending ({wl_p})
                </span>
              </div>
            </PersonaCardShell>

            <PersonaCardShell
              title="Recent activity"
              icon={Layers}
              tooltip="Latest events across your enquiries, quotes, and POs."
              loading={loadingInsights}
              isEmpty={!insights?.recent_activity?.length}
              skeleton={<SkeletonActivityFeed rows={5} />}
              renderEmpty={() => (
                <div className={styles.emptyText}>No recent activity.</div>
              )}
              onRefresh={fetchInsights}
            >
              <div className={styles.activityList}>
                {insights?.recent_activity?.map((a, i) => {
                  const accent = a.type === 'new_rfq' ? 'info' : a.type === 'quote_sent' ? 'success' : 'purple';
                  const label = a.type === 'new_rfq' ? 'New enquiry received' : a.type === 'quote_sent' ? 'Quote submitted' : 'PO received';
                  return (
                    <Link key={i} href={`/dashboard/vendor/inquiries-details?id=${a.rfq_id}`} className={styles.activityRow}>
                      <span className={`${styles.actDot} ${styles[accent]}`} />
                      <div className={styles.actContent}>
                        <span className={styles.actTitle}>{label}</span>
                        <span className={styles.actSub}>
                          {a.title || `#${a.rfq_no}`}
                          {a.buyer_name ? ` · ${a.buyer_name}` : ""}
                        </span>
                      </div>
                      <span className={styles.actDate}>{moment(a.event_time).format("DD MMM")}</span>
                      <ArrowRight size={12} className={styles.actArrow} />
                    </Link>
                  );
                })}
              </div>
            </PersonaCardShell>
          </div>
        </div>
      </div>
    </>
  );
};

export default Vendor;
