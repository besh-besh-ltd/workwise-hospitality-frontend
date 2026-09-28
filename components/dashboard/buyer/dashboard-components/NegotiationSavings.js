import React from "react";
import { PiggyBank, TrendingUp, TrendingDown } from "lucide-react";
import { getNegotiationSavings } from "@/services/dashboard";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonHeadline } from "@/components/dashboard/shared";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import { formatCurrencyShort as formatCurrency } from "@/utils/sharedFunctions";
import styles from "./NegotiationSavings.module.scss";

const NegotiationSavings = ({ filters }) => {
  const { data, loading, error, stale, refetch } = useDashboardQuery(getNegotiationSavings, filters);

  const baseline = data?.market_baseline || 0;
  const negotiated = data?.negotiated_total || 0;
  const savings = data?.total_savings || 0;
  const isLoss = savings < 0;
  // Capped: a negotiated total above the baseline (a loss) must not overflow the bar.
  const negotiatedPct = baseline > 0 ? Math.min(100, Math.round((negotiated / baseline) * 100)) : 0;
  const savedPct = baseline > 0 ? Math.round((Math.abs(savings) / baseline) * 100) : 0;
  const hasData = baseline > 0 && savings !== 0;

  return (
    <PersonaCardShell
      title="Negotiation savings"
      icon={PiggyBank}
      tooltip="Direct value impact from strategic vendor negotiations in this period."
      actions={
        hasData ? (
          <span className={`${styles.headerPill} ${isLoss ? styles.lossPill : styles.winPill}`}>
            {isLoss ? <TrendingDown size={10} strokeWidth={2.4} /> : <TrendingUp size={10} strokeWidth={2.4} />}
            {isLoss ? "Loss" : "Win"} · {savedPct}%
          </span>
        ) : null
      }
      loading={loading}
      error={error}
      stale={stale}
      isEmpty={!hasData}
      skeleton={<SkeletonHeadline withSpark={false} />}
      renderEmpty={() => (
        <div className={styles.emptyState}>
          No price reductions recorded through negotiations in this period.
        </div>
      )}
      onRefresh={refetch}
    >
      <div className={styles.headlineRow}>
        <div>
          <div className={styles.headlineLbl}>{isLoss ? "Total lost" : "Total saved"}</div>
          <div className={`${styles.headlineNum} ${isLoss ? styles.lossNum : ""}`}>
            {isLoss ? "−" : ""}{formatCurrency(Math.abs(savings))}
          </div>
        </div>
        <span className={`${styles.savedPill} ${isLoss ? styles.lossSavedPill : ""}`}>
          {savedPct}% {isLoss ? "lost" : "saved"}
        </span>
      </div>

      <div className={styles.bars}>
        <div className={styles.barGroup}>
          <div className={styles.barLabel}>
            <span>Total quoted before negotiation</span>
            <span className={styles.mono}>{formatCurrency(baseline)}</span>
          </div>
          <div className={styles.barTrack}>
            <div className={`${styles.barFill} ${styles.grey}`} style={{ width: "100%" }} />
          </div>
        </div>
        <div className={styles.barGroup}>
          <div className={styles.barLabel}>
            <span>Total finalised after negotiation</span>
            <span className={styles.mono}>{formatCurrency(negotiated)}</span>
          </div>
          <div className={styles.barTrack}>
            <div className={`${styles.barFill} ${styles.green}`} style={{ width: `${negotiatedPct}%` }} />
          </div>
        </div>
      </div>

      <div className={styles.exclusionNote}>
        Terminated or rejected RFQs (by us or by vendors) are excluded from these figures.
      </div>
    </PersonaCardShell>
  );
};

export default NegotiationSavings;
