import React from "react";
import { PiggyBank, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getNegotiationSavings } from "@/services/dashboard";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonHeadline } from "@/components/dashboard/shared";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import { formatMoney as formatCurrency } from "@/components/dashboard/shared/format";
import styles from "./NegotiationSavings.module.scss";

const plural = (n, one, many = `${one}s`) => (Number(n) === 1 ? one : many);

/**
 * Savings realised on AWARDED quotes (SPEC D2): the headline is what the
 * company actually saves on the vendors it bought from. All-vendor savings
 * (including price cuts from vendors who did not win) is shown as context only.
 * Values are signed — a negative total means awarded prices ended above the
 * pre-negotiation baseline.
 */
export const savingsState = (data) => {
  const baseline = Number(data?.market_baseline) || 0;
  const negotiated = Number(data?.negotiated_total) || 0;
  const savings = Number(data?.total_savings) || 0;
  const count = Number(data?.negotiation_count) || 0;
  if (!(count > 0) && !(baseline > 0)) return { kind: "empty" };
  const pct = data?.savings_pct != null
    ? Number(data.savings_pct)
    : baseline > 0 ? (savings / baseline) * 100 : 0;
  const kind = Math.abs(savings) < 0.5 ? "flat" : savings > 0 ? "win" : "loss";
  return { kind, baseline, negotiated, savings, count, pct };
};

const NegotiationSavings = ({ filters }) => {
  const { data, loading, error, stale, refetch } = useDashboardQuery(getNegotiationSavings, filters);
  const st = savingsState(data);
  const isLoss = st.kind === "loss";
  const isFlat = st.kind === "flat";
  const absPct = Math.abs(st.pct || 0).toFixed(1);
  // Capped: a negotiated total above the baseline (a loss) must not overflow the bar.
  const negotiatedPct = st.baseline > 0 ? Math.min(100, Math.round((st.negotiated / st.baseline) * 100)) : 0;
  const allVendors = data?.all_vendors;
  const Icon = isLoss ? TrendingDown : isFlat ? Minus : TrendingUp;

  return (
    <PersonaCardShell
      title="Negotiation savings"
      icon={PiggyBank}
      tooltip="Savings realised through negotiation on the quotes that were awarded, for negotiations in the selected period."
      actions={
        st.kind !== "empty" && !loading ? (
          <span className={`${styles.headerPill} ${isLoss ? styles.lossPill : styles.winPill}`}>
            <Icon size={10} strokeWidth={2.4} />
            {isLoss ? "Loss" : isFlat ? "No change" : "Saved"} · {absPct}%
          </span>
        ) : null
      }
      loading={loading}
      error={error}
      stale={stale}
      isEmpty={st.kind === "empty"}
      skeleton={<SkeletonHeadline withSpark={false} />}
      renderEmpty={() => (
        <div className={styles.emptyState}>
          No negotiations on awarded quotes in this period.
        </div>
      )}
      onRefresh={refetch}
    >
      <div className={styles.headlineRow}>
        <div>
          <div className={styles.headlineLbl}>
            {isLoss ? "Awarded above baseline" : "Saved on awarded quotes"}
          </div>
          <div className={`${styles.headlineNum} ${isLoss ? styles.lossNum : ""}`}>
            {formatCurrency(st.savings)}
          </div>
        </div>
        <span className={`${styles.savedPill} ${isLoss ? styles.lossSavedPill : ""}`}>
          {isFlat ? "No change" : `${absPct}% ${isLoss ? "above" : "saved"}`}
        </span>
      </div>

      <div className={styles.bars}>
        <div className={styles.barGroup}>
          <div className={styles.barLabel}>
            <span>Awarded vendors' price before negotiation</span>
            <span className={styles.mono}>{formatCurrency(st.baseline)}</span>
          </div>
          <div className={styles.barTrack}>
            <div className={`${styles.barFill} ${styles.grey}`} style={{ width: "100%" }} />
          </div>
        </div>
        <div className={styles.barGroup}>
          <div className={styles.barLabel}>
            <span>Awarded price after negotiation</span>
            <span className={styles.mono}>{formatCurrency(st.negotiated)}</span>
          </div>
          <div className={styles.barTrack}>
            <div className={`${styles.barFill} ${styles.green}`} style={{ width: `${negotiatedPct}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.exclusionNote}>
        {st.count} {plural(st.count, "negotiated item")}
        {data?.rfq_count != null ? ` across ${data.rfq_count} ${plural(data.rfq_count, "RFQ")}` : ""}.
        {allVendors && allVendors.total_savings != null && (
          <> Across all vendors, including those not awarded: {formatCurrency(allVendors.total_savings)}.</>
        )}
        {" "}Terminated or rejected RFQs are excluded.
      </div>
    </PersonaCardShell>
  );
};

export default NegotiationSavings;
