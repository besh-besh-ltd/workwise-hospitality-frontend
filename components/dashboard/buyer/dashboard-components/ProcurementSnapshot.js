import React, { useState } from "react";
import { BarChart3, PieChart } from "lucide-react";
import { getProcurementSnapshot } from "@/services/dashboard";
import InfoTip from "@/components/shared/InfoTip";
import { formatMoney as formatCurrency } from "@/components/dashboard/shared/format";
import SpendBreakupModal from "./SpendBreakupModal";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonKpiGrid } from "@/components/dashboard/shared";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import styles from "./ProcurementSnapshot.module.scss";

// `accent` drives each card's top-bar colour. The context cards share one
// deep, muted green accent (rendered at low opacity, see scss) — subtle and easy
// on the eye; Committed spend uses a brighter green at full opacity + green tint
// so it still stands out as the headline figure.
const CARD_ACCENT = "#166534"; // deep muted green for context cards

const formatDays = (v) => (v == null ? "—" : `${Number(v).toFixed(1)} days`);
const plural = (n, one, many = `${one}s`) => (Number(n) === 1 ? one : many);

// Definitions mirror backend dashboardMetrics (SPEC "Cross-role cards"): RFQs
// are live queues (not dated); POs, spend and turnaround are for the period.
export const METRICS = [
  {
    key: "active_rfqs",
    label: "Open for bidding",
    tooltip: "Published RFQs whose bid window is still open right now.",
    format: (v) => v ?? 0,
    accent: CARD_ACCENT,
  },
  {
    key: "in_progress_rfqs",
    label: "Bidding closed, in progress",
    tooltip: "Published RFQs whose bidding has closed and that are still being evaluated, negotiated or awarded.",
    format: (v) => v ?? 0,
    accent: CARD_ACCENT,
  },
  {
    key: "pos_issued",
    label: "POs committed",
    tooltip: "Purchase orders raised in the period that are approved or further along (drafts, pending, rejected and cancelled POs are excluded).",
    format: (v) => v ?? 0,
    accent: CARD_ACCENT,
  },
  {
    key: "total_spend",
    label: "Committed spend",
    tooltip: "Value of committed purchase orders raised in the period, including GST — the same figure as the Spend Summary report.",
    format: formatCurrency,
    highlighted: true,
    accent: "#15803d",
  },
  {
    key: "turnaround",
    label: "Median turnaround",
    tooltip: "Days from publishing an RFQ to its first finalised quote, for RFQs finalised in the period. Half take less than this.",
    value: (d) => d?.turnaround_days?.median,
    format: formatDays,
    sub: (d) => {
      const t = d?.turnaround_days;
      if (!t || !(t.n > 0)) return "No RFQs finalised in the period";
      return `P90 ${formatDays(t.p90)} · ${t.n} ${plural(t.n, "RFQ")}`;
    },
    accent: CARD_ACCENT,
  },
];

const ProcurementSnapshot = ({ filters }) => {
  const [showBreakup, setShowBreakup] = useState(false);
  const { data, loading, error, stale, refetch } = useDashboardQuery(getProcurementSnapshot, filters);

  return (
    <PersonaCardShell
      title="Procurement (Products & Services) snapshot"
      icon={BarChart3}
      tooltip="Live RFQ counts, and committed POs, spend and turnaround for the selected business units and period."
      loading={loading}
      error={error}
      stale={stale}
      skeleton={<SkeletonKpiGrid count={METRICS.length} />}
      onRefresh={refetch}
    >
      <div className={styles.snapshotGrid}>
        {METRICS.map((metric) => {
          const value = metric.value ? metric.value(data) : data?.[metric.key];
          const sub = metric.sub ? metric.sub(data) : null;
          return (
            <div
              key={metric.key}
              className={`${styles.metricItem} ${metric.highlighted ? styles.highlighted : ""}`}
              style={{ "--metric-accent": metric.accent }}
              data-testid={`snapshot-${metric.key}`}
            >
              <div className={styles.metricLabel}>
                {metric.label}
                <InfoTip text={metric.tooltip} />
              </div>
              <div className={styles.metricValueRow}>
                <div className={styles.metricValue}>
                  {loading ? "–" : metric.format(value)}
                </div>
                {metric.key === "total_spend" && !loading && data?.spend_breakup && (
                  <button
                    type="button"
                    className={styles.breakupBtn}
                    onClick={() => setShowBreakup(true)}
                  >
                    <PieChart size={11} strokeWidth={2.4} />
                    Breakup
                  </button>
                )}
              </div>
              {sub && !loading && <div className={styles.metricSub}>{sub}</div>}
            </div>
          );
        })}
      </div>

      {showBreakup && data?.spend_breakup && (
        <SpendBreakupModal
          breakup={data.spend_breakup}
          posIssued={data.pos_issued}
          onClose={() => setShowBreakup(false)}
        />
      )}
    </PersonaCardShell>
  );
};

export default ProcurementSnapshot;
