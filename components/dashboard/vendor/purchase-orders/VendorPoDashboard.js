import React, { useMemo } from "react";
import { useRouter } from "next/router";
import {
  Clock,
  Truck,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Users,
  Activity,
  ChevronRight,
  Inbox,
} from "lucide-react";
import styles, { inr, toLakh, Sk } from "@/components/dashboard/buyer/purchase-orders/shared";

const PO_ROUTE = "/dashboard/vendor/purchase-orders";
const ATTENTION_LIMIT = 6;

/* ── small presentational helpers ─────────────────────────────────────── */

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

const Delta = ({ pct }) => {
  if (pct == null) return <span>vs last month</span>;
  const up = Number(pct) >= 0;
  return (
    <>
      <span className={`${styles.delta} ${up ? styles.deltaUp : styles.deltaDown}`}>
        {up ? "▲" : "▼"} {Math.abs(Number(pct))}%
      </span>
      <span>vs last month</span>
    </>
  );
};

/* Inline SVG sparkline for earnings.trend. Renders a flat baseline / empty
   message when there is no trend data yet. trend items may be numbers or
   { value } objects. */
const TrendChart = ({ trend }) => {
  const points = useMemo(() => {
    if (!Array.isArray(trend)) return [];
    return trend
      .map((t) => (typeof t === "number" ? t : Number(t?.value)))
      .filter((n) => isFinite(n));
  }, [trend]);

  const W = 280;
  const H = 56;
  const PAD = 4;

  if (points.length < 2) {
    return (
      <div className={styles.vTrendEmpty}>
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
          <line
            x1={PAD}
            y1={H / 2}
            x2={W - PAD}
            y2={H / 2}
            stroke="var(--border-strong)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>
        <span className={styles.vTrendEmptyMsg}>No trend yet</span>
      </div>
    );
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const stepX = (W - PAD * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = PAD + i * stepX;
    const y = PAD + (1 - (p - min) / span) * (H - PAD * 2);
    return [x, y];
  });
  const path = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${path} L${coords[coords.length - 1][0].toFixed(1)},${H} L${coords[0][0].toFixed(1)},${H} Z`;

  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Earnings trend">
      <path d={area} fill="var(--success-soft)" stroke="none" />
      <path d={path} fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* Slim stacked "value by stage" bar from earnings.by_stage with a ₹ legend. */
const STAGE_COLORS = ["var(--info)", "var(--success)", "var(--warn)", "var(--indigo)", "var(--fg-3)"];

const StageBar = ({ stages }) => {
  const rows = Array.isArray(stages) ? stages.filter((s) => Number(s?.value) > 0) : [];
  const total = rows.reduce((a, s) => a + Number(s.value || 0), 0);

  if (total <= 0) {
    return <div className={styles.notAvailable}>No earnings by stage yet.</div>;
  }

  return (
    <div className={styles.vStageWrap}>
      <div className={styles.vStageBar}>
        {rows.map((s, i) => (
          <span
            key={s.key || i}
            className={styles.vStageSeg}
            style={{ width: `${(Number(s.value) / total) * 100}%`, background: STAGE_COLORS[i % STAGE_COLORS.length] }}
            title={`${s.label}: ${inr(s.value)}`}
          />
        ))}
      </div>
      <div className={styles.vStageLegend}>
        {rows.map((s, i) => (
          <div key={s.key || i} className={styles.vStageLegendItem}>
            <span className={styles.vDot} style={{ background: STAGE_COLORS[i % STAGE_COLORS.length] }} />
            <span className={styles.vStageLabel}>{s.label}</span>
            <span className={styles.vStageVal}>{inr(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
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
      <section className={styles.kpiStrip} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.kpiCard}>
            <Sk w={90} h={11} style={{ marginBottom: 12 }} />
            <Sk w={60} h={22} style={{ marginBottom: 8 }} />
            <Sk w={110} h={11} />
          </div>
        ))}
      </section>
      <div className={styles.pageBodyAside}>
        <div className={styles.sectionStack}>
          <div className={styles.skCard}>
            <Sk w={200} h={16} style={{ marginBottom: 16 }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <Sk key={i} h={28} style={{ marginBottom: 10 }} />
            ))}
          </div>
          <div className={styles.skCard}>
            <Sk w={160} h={16} style={{ marginBottom: 16 }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <Sk key={i} h={20} style={{ marginBottom: 10 }} />
            ))}
          </div>
        </div>
        <div className={styles.sectionStack}>
          <div className={styles.skCard}>
            <Sk w={140} h={16} style={{ marginBottom: 16 }} />
            <Sk h={120} />
          </div>
          <div className={styles.skCard}>
            <Sk w={140} h={16} style={{ marginBottom: 16 }} />
            <Sk h={80} />
          </div>
        </div>
      </div>
    </main>
  </div>
);

/* ── main component ───────────────────────────────────────────────────── */

const VendorPoDashboard = ({ data, loading }) => {
  const router = useRouter();

  const goToDetail = (id) => router.push(`${PO_ROUTE}/${id}`);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  const d = data || {};
  const k = d.kpis || {};
  const awaiting = k.awaiting_action || {};
  const inFulfilment = k.in_fulfilment || {};
  const earningsMtd = k.earnings_mtd || {};
  const attention = Array.isArray(d.attention) ? d.attention : [];
  const earnings = d.earnings || {};
  const byStage = Array.isArray(earnings.by_stage) ? earnings.by_stage : [];
  const trend = Array.isArray(earnings.trend) ? earnings.trend : [];
  const topBuyers = Array.isArray(d.top_buyers) ? d.top_buyers : [];
  const activity = Array.isArray(d.activity) ? d.activity : [];

  const shownAttention = attention.slice(0, ATTENTION_LIMIT);
  const moreAttention = attention.length - shownAttention.length;

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
                Act on new orders, track fulfilment, and watch your earnings — across every buyer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <main className={styles.pageBody}>
        {/* KPI strip — 4 cards */}
        <section className={styles.kpiStrip} style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
          <Kpi
            urgent={Number(awaiting.count) > 0}
            label="Awaiting your action"
            value={awaiting.count ?? 0}
            icon={<Clock size={13} />}
            meta={
              awaiting.value != null ? (
                <span>
                  <span style={{ fontWeight: 600, color: "var(--fg-2)" }}>{inr(awaiting.value)}</span> at stake
                </span>
              ) : (
                <span>nothing pending</span>
              )
            }
          />
          <Kpi
            label="In fulfilment"
            value={inFulfilment.count ?? 0}
            icon={<Truck size={13} />}
            meta={<span>orders in progress</span>}
          />
          <Kpi
            label="Earnings this month"
            value={
              <>
                <span className={styles.cur}>₹</span>
                {toLakh(earningsMtd.value)}
                <span className={styles.suffix}>L</span>
              </>
            }
            icon={<IndianRupee size={13} />}
            meta={<Delta pct={earningsMtd.delta_pct} />}
          />
          <Kpi
            label="On-time delivery"
            value={k.on_time_pct != null ? `${k.on_time_pct}%` : "—"}
            icon={<CheckCircle2 size={13} />}
            meta={<span>last 90 days</span>}
          />
        </section>

        <div className={styles.pageBodyAside}>
          {/* Left column */}
          <div className={styles.sectionStack}>
            {/* Needs your attention */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div
                    className={styles.ic}
                    style={{ background: "var(--warn-soft)", color: "var(--warn)", borderColor: "rgba(180,83,9,0.18)" }}
                  >
                    <AlertTriangle size={13} />
                  </div>
                  <h2>Needs your attention</h2>
                  {attention.length > 0 && (
                    <span className={`${styles.pill} ${styles.pillWarn} ${styles.pulse}`}>
                      <span className={styles.pdot} />
                      {attention.length} need action
                    </span>
                  )}
                </div>
              </div>

              {attention.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.ic}>
                    <CheckCircle2 size={20} />
                  </div>
                  <div className={styles.ttl}>You're all caught up</div>
                  <div className={styles.sub}>No purchase orders are waiting on your action.</div>
                </div>
              ) : (
                <>
                  <div className={styles.vAttnList}>
                    {shownAttention.map((p) => (
                      <div
                        key={p.id}
                        className={styles.vAttnRow}
                        onClick={() => goToDetail(p.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && goToDetail(p.id)}
                      >
                        <div className={styles.vAttnMain}>
                          <div className={styles.vAttnTop}>
                            <span className={styles.poNum}>#{p.po_number || p.id}</span>
                            <span className={`${styles.pill} ${p.is_call_off ? styles.pillInfo : styles.pillNeutral}`}>
                              {p.is_call_off ? "Released Order" : "RFQ"}
                            </span>
                          </div>
                          <div className={styles.vAttnSub}>
                            <span className={styles.vAttnBuyer}>{p.buyer_name}</span>
                            {p.hotel_name && (
                              <>
                                <span className={styles.crumbSep}>·</span>
                                <span>{p.hotel_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className={styles.vAttnRight}>
                          <span className={styles.amount}>{inr(p.total_value)}</span>
                          {p.next_step && (
                            <span className={`${styles.pill} ${styles.pillWarn}`}>
                              {p.next_step}
                              <ChevronRight size={11} />
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {moreAttention > 0 && (
                    <div className={styles.vMoreFoot}>+{moreAttention} more awaiting action</div>
                  )}
                </>
              )}
            </section>

            {/* Top buyers (earnings) */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <Users size={13} />
                  </div>
                  <h2>Top buyers</h2>
                </div>
              </div>
              {topBuyers.length === 0 ? (
                <div className={styles.notAvailable}>No buyer earnings yet.</div>
              ) : (
                <div className={styles.vBuyerList}>
                  {topBuyers.map((b, i) => (
                    <div key={`${b.name}-${i}`} className={styles.vBuyerRow}>
                      <span className={styles.vBuyerRank}>{i + 1}</span>
                      <span className={styles.vBuyerName}>{b.name}</span>
                      <span className={styles.amount}>{inr(b.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Right column */}
          <div className={styles.sectionStack}>
            {/* Earnings card */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <TrendingUp size={13} />
                  </div>
                  <h2>Earnings</h2>
                </div>
              </div>
              <div className={styles.sectionBody}>
                <TrendChart trend={trend} />
                <div className={styles.vStageHeading}>Value by stage</div>
                <StageBar stages={byStage} />
              </div>
            </section>

            {/* Recent activity */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHead}>
                <div className={styles.hLeft}>
                  <div className={styles.ic}>
                    <Activity size={13} />
                  </div>
                  <h2>Recent activity</h2>
                </div>
              </div>
              {activity.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.ic}>
                    <Inbox size={20} />
                  </div>
                  <div className={styles.ttl}>No recent activity</div>
                  <div className={styles.sub}>Updates to your orders will show up here.</div>
                </div>
              ) : (
                <div className={styles.activityList}>
                  {activity.map((a, i) => (
                    <div key={a.id || i} className={styles.activityItem}>
                      <div className={styles.aDot} />
                      <div className={styles.aBody}>
                        <div className={styles.aMsg}>{a.message || a.label}</div>
                        {a.when && <div className={styles.aWhen}>{a.when}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VendorPoDashboard;
