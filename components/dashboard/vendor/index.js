import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import Head from "next/head";
import Link from "next/link";
import Select from "react-select";
import moment from "moment";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Tooltip, Legend, Filler,
} from "chart.js";
import {
  FileText, Clock, Flame, ShoppingCart, Users, Send, Trophy, TrendingUp,
  Package, CheckCircle, XCircle, Zap, ArrowRight, AlertTriangle,
} from "lucide-react";
import { getVendorOpportunities, getVendorPerformance, getVendorInsights } from "@/services/vendorDashboard";
import SubscriptionStatus from "./SubscriptionStatus";
import CardLoader from "@/components/dashboard/buyer/dashboard-components/CardLoader";
import styles from "./VendorDashboard.module.scss";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

const DURATION_OPTIONS = [
  { label: "Last 7 Days", value: "past7days" },
  { label: "Last 15 Days", value: "past15days" },
  { label: "This Month", value: "currentMonth" },
  { label: "Last 6 Months", value: "past6months" },
  { label: "All Time", value: "allTime" },
];

const getDateRange = (type) => {
  const today = moment().endOf("day");
  switch (type) {
    case "past7days": return { start_date: moment().subtract(6, "days").format("YYYY-MM-DD"), end_date: today.format("YYYY-MM-DD") };
    case "past15days": return { start_date: moment().subtract(14, "days").format("YYYY-MM-DD"), end_date: today.format("YYYY-MM-DD") };
    case "currentMonth": return { start_date: moment().startOf("month").format("YYYY-MM-DD"), end_date: today.format("YYYY-MM-DD") };
    case "past6months": return { start_date: moment().subtract(5, "months").startOf("month").format("YYYY-MM-DD"), end_date: today.format("YYYY-MM-DD") };
    case "allTime": return { start_date: "2025-01-01", end_date: today.format("YYYY-MM-DD") };
    default: return { start_date: moment().subtract(6, "days").format("YYYY-MM-DD"), end_date: today.format("YYYY-MM-DD") };
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

  const [duration, setDuration] = useState(DURATION_OPTIONS[3]);
  const [opp, setOpp] = useState(null);
  const [perf, setPerf] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loadingOpp, setLoadingOpp] = useState(true);
  const [loadingPerf, setLoadingPerf] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const intervalRef = useRef(null);

  const filters = useMemo(() => getDateRange(duration.value), [duration]);

  const fetchAll = useCallback(() => {
    setLoadingOpp(true); setLoadingPerf(true); setLoadingInsights(true);
    getVendorOpportunities(filters).then((r) => setOpp(r.data)).catch(() => {}).finally(() => setLoadingOpp(false));
    getVendorPerformance(filters).then((r) => setPerf(r.data)).catch(() => {}).finally(() => setLoadingPerf(false));
    getVendorInsights(filters).then((r) => setInsights(r.data)).catch(() => {}).finally(() => setLoadingInsights(false));
  }, [filters]);

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
      borderColor: "#2E5BA8", backgroundColor: "rgba(46,91,168,0.06)",
      borderWidth: 2, pointRadius: 3, pointBackgroundColor: "#2E5BA8", tension: 0.3, fill: true,
    }],
  } : null;

  const hasRevenueData = insights?.revenue_trend?.data?.some((v) => v > 0);

  const buChartData = insights?.bu_performance?.length > 0 ? {
    labels: insights.bu_performance.map((b) => b.business_unit),
    datasets: [
      { label: "RFQs Received", data: insights.bu_performance.map((b) => b.rfqs_received), backgroundColor: "rgba(46,91,168,0.7)", borderRadius: 4 },
      { label: "Orders Won", data: insights.bu_performance.map((b) => b.orders_received), backgroundColor: "rgba(34,197,94,0.7)", borderRadius: 4 },
    ],
  } : null;

  const lineChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: "#1a2730", cornerRadius: 8, callbacks: { label: (c) => formatCurrency(c.raw) } } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, color: "#999" } }, y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 }, color: "#999", callback: (v) => formatCurrency(v) } } },
  };

  const barChartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "circle", font: { size: 11 }, padding: 16 } }, tooltip: { backgroundColor: "#1a2730", cornerRadius: 8 } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: "#555" } }, y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: { size: 10 }, color: "#999" } } },
  };

  const OPP_CARDS = [
    { key: "new_rfqs", label: "New RFQs", icon: FileText, color: "#2E5BA8", badge: "NEW", href: "/dashboard/vendor/inquiries-received" },
    { key: "pending_quotes", label: "Pending Quotes", icon: Clock, color: "#f59e0b", badge: "ACTION", href: "/dashboard/vendor/inquiries-received" },
    { key: "closing_soon", label: "Closing Soon", icon: Flame, color: "#ef4444", badge: "URGENT", href: "/dashboard/vendor/inquiries-received" },
    { key: "pos_received", label: "POs Received", icon: ShoppingCart, color: "#22c55e", badge: null, href: "/dashboard/vendor/order-book" },
  ];

  // Response efficiency breakdown
  const eff = insights?.response_efficiency;
  const effTotal = (eff?.responded_count || 0) + (eff?.missed_count || 0);
  const responsePct = effTotal > 0 ? Math.round(((eff?.responded_count || 0) / effTotal) * 100) : 0;

  return (
    <>
      <Head><title>Dashboard | Vendor</title></Head>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.greeting}>{getGreeting()}, {firstName}! 👋</h1>
            <p className={styles.subtitle}>Your business growth at a glance.</p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.filterItem}>
              <Select options={DURATION_OPTIONS} value={duration} onChange={setDuration} isClearable={false} isSearchable={false} classNamePrefix="react-select" />
            </div>
          </div>
        </div>

        {/* Subscription */}
        {isHospitalityVendor && <SubscriptionStatus />}

        {/* Section 1: Opportunities */}
        <div className={styles.oppGrid}>
          {OPP_CARDS.map((card) => {
            const Icon = card.icon;
            const count = opp?.[card.key] ?? 0;
            return (
              <Link key={card.key} href={card.href} className={styles.oppCard}>
                <div className={styles.oppIcon} style={{ background: `${card.color}10`, color: card.color }}><Icon size={22} /></div>
                <div className={styles.oppInfo}>
                  <span className={styles.oppLabel}>{card.label}</span>
                  <div className={styles.oppMetric}>
                    <span className={styles.oppValue}>{loadingOpp ? "–" : count}</span>
                    {card.badge && count > 0 && <span className={styles.oppBadge} style={{ background: card.color }}>{card.badge}</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Section 2: Performance — clear funnel */}
        <div className={styles.perfGrid}>
          <div className={styles.perfCard}>
            <span className={styles.perfValue}>{loadingPerf ? "–" : perf?.rfqs_invited ?? 0}</span>
            <span className={styles.perfLabel}>Invited</span>
          </div>
          <div className={styles.perfCard}>
            <span className={styles.perfValue}>{loadingPerf ? "–" : perf?.rfqs_quoted ?? 0}</span>
            <span className={styles.perfLabel}>Quoted</span>
          </div>
          <div className={styles.perfCard}>
            <span className={styles.perfValue}>{loadingPerf ? "–" : perf?.rfqs_finalized ?? 0}</span>
            <span className={styles.perfLabel}>Finalized</span>
          </div>
          <div className={styles.perfCard}>
            <span className={styles.perfValue}>{loadingPerf ? "–" : `${perf?.deals_won ?? 0} / ${perf?.rfqs_finalized ?? 0}`}</span>
            <span className={styles.perfLabel}>Won / Finalized</span>
          </div>
          <div className={`${styles.perfCard} ${styles.perfHighlight}`}>
            <span className={styles.perfValue}>{loadingPerf ? "–" : formatCurrency(perf?.total_revenue)}</span>
            <span className={styles.perfLabel}>Revenue</span>
          </div>
          <div className={styles.perfCard}>
            <span className={styles.perfValue}>{loadingPerf ? "–" : `${perf?.win_rate ?? 0}%`}</span>
            <span className={styles.perfLabel}>Win Rate</span>
          </div>
        </div>

        {/* Section 3: Two-column */}
        <div className={styles.insightsGrid}>
          <div className={styles.leftCol}>
            {/* Revenue Trend */}
            <div className={styles.card}>
              {loadingInsights && <CardLoader />}
              <h3 className={styles.cardTitle}>Revenue Trend</h3>
              <div className={styles.chartWrap}>
                {hasRevenueData ? <Line data={revenueChartData} options={lineChartOpts} /> : !loadingInsights && <p className={styles.emptyText}>No revenue data for this period</p>}
              </div>
            </div>

            {/* Business Unit Performance */}
            <div className={styles.card}>
              {loadingInsights && <CardLoader />}
              <h3 className={styles.cardTitle}>Business Unit Performance</h3>
              <p className={styles.cardSubtitle}>RFQs received vs orders won per business unit</p>
              <div className={styles.chartWrap}>
                {buChartData ? <Bar data={buChartData} options={barChartOpts} /> : !loadingInsights && <p className={styles.emptyText}>No business unit data</p>}
              </div>
            </div>

            {/* Top Products */}
            <div className={styles.card}>
              {loadingInsights && <CardLoader />}
              <h3 className={styles.cardTitle}>Top Quoted Products</h3>
              <div className={styles.productList}>
                {insights?.top_products?.length > 0 ? insights.top_products.map((p, i) => (
                  <div key={i} className={styles.productRow}>
                    <span className={styles.productRank}>{i + 1}</span>
                    <span className={styles.productName}>{p.product_name}</span>
                    <span className={styles.productCount}>{p.times_quoted}x</span>
                    <span className={styles.productValue}>{formatCurrency(p.avg_quote_value)} avg</span>
                  </div>
                )) : !loadingInsights && <p className={styles.emptyText}>No products quoted</p>}
              </div>
            </div>
          </div>

          <div className={styles.rightCol}>
            {/* Response Efficiency — visual */}
            <div className={styles.card}>
              {loadingInsights && <CardLoader />}
              <h3 className={styles.cardTitle}>Response Efficiency</h3>
              <div className={styles.effHero}>
                <div className={styles.effCircle}>
                  <span className={styles.effPct}>{loadingInsights ? "–" : `${responsePct}%`}</span>
                  <span className={styles.effCircleLabel}>Response Rate</span>
                </div>
                <div className={styles.effDetails}>
                  <div className={styles.effRow}>
                    <span className={styles.effDot} style={{ background: "#22c55e" }} />
                    <span className={styles.effRowLabel}>Responded</span>
                    <span className={styles.effRowValue}>{eff?.responded_count ?? 0}</span>
                  </div>
                  <div className={styles.effRow}>
                    <span className={styles.effDot} style={{ background: "#ef4444" }} />
                    <span className={styles.effRowLabel}>Missed</span>
                    <span className={styles.effRowValue}>{eff?.missed_count ?? 0}</span>
                  </div>
                  <div className={styles.effRow}>
                    <span className={styles.effDot} style={{ background: "#2E5BA8" }} />
                    <span className={styles.effRowLabel}>Avg. Response</span>
                    <span className={styles.effRowValue}>{eff?.avg_response_days > 0 ? `${eff.avg_response_days}d` : "–"}</span>
                  </div>
                  <div className={styles.effRow}>
                    <span className={styles.effDot} style={{ background: "#f59e0b" }} />
                    <span className={styles.effRowLabel}>Within 24h</span>
                    <span className={styles.effRowValue}>{eff?.within_24h ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Win/Loss — visual progress */}
            <div className={styles.card}>
              {loadingInsights && <CardLoader />}
              <h3 className={styles.cardTitle}>Win / Loss Breakdown</h3>
              {(() => {
                const w = insights?.win_loss?.won || 0;
                const l = insights?.win_loss?.lost || 0;
                const p = insights?.win_loss?.pending || 0;
                const total = w + l + p;
                return total > 0 ? (
                  <div className={styles.winLossWrap}>
                    <div className={styles.winLossBar}>
                      {w > 0 && <div className={styles.winSeg} style={{ width: `${(w / total) * 100}%` }}>{w}</div>}
                      {l > 0 && <div className={styles.lossSeg} style={{ width: `${(l / total) * 100}%` }}>{l}</div>}
                      {p > 0 && <div className={styles.pendingSeg} style={{ width: `${(p / total) * 100}%` }}>{p}</div>}
                    </div>
                    <div className={styles.winLossLegend}>
                      <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: "#22c55e" }} /> Won ({w})</span>
                      <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: "#ef4444" }} /> Lost ({l})</span>
                      <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: "#f59e0b" }} /> Pending ({p})</span>
                    </div>
                  </div>
                ) : !loadingInsights && <p className={styles.emptyText}>No competed RFQs</p>;
              })()}
            </div>

            {/* Recent Activity — clickable */}
            <div className={styles.card}>
              {loadingInsights && <CardLoader />}
              <h3 className={styles.cardTitle}>Recent Activity</h3>
              <div className={styles.activityList}>
                {insights?.recent_activity?.length > 0 ? insights.recent_activity.map((a, i) => (
                  <Link key={i} href={`/dashboard/vendor/inquiries-details?id=${a.rfq_id}`} className={styles.activityRow}>
                    <span className={`${styles.actDot} ${a.type === 'new_rfq' ? styles.actBlue : a.type === 'quote_sent' ? styles.actGreen : styles.actPurple}`} />
                    <div className={styles.actContent}>
                      <span className={styles.actTitle}>
                        {a.type === 'new_rfq' ? 'New enquiry received' : a.type === 'quote_sent' ? 'Quote submitted' : 'PO received'}
                      </span>
                      <span className={styles.actSub}>
                        {a.title || `#${a.rfq_no}`}
                        {a.buyer_name ? ` · ${a.buyer_name}` : ""}
                      </span>
                    </div>
                    <span className={styles.actDate}>{moment(a.event_time).format("DD MMM")}</span>
                    <ArrowRight size={14} className={styles.actArrow} />
                  </Link>
                )) : !loadingInsights && <p className={styles.emptyText}>No recent activity</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Vendor;
