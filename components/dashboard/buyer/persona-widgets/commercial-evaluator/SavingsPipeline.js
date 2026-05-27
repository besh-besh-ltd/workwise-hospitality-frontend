import React from "react";
import { PiggyBank, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { getSavingsPipeline } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import styles from "../PersonaCard.module.scss";

const fmtINR = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/** Cumulative ₹ savings from negotiations I led this period.
 *
 *  Backend returns a signed `total_savings` — positive means saved, negative
 *  means the final negotiated total ended up ABOVE the baseline (we
 *  collectively over-paid). When negative the headline flips to red with
 *  a "loss" framing so the user notices immediately. */
const SavingsPipeline = ({ filters }) => (
  <PersonaCard
    title="Savings pipeline"
    icon={PiggyBank}
    tooltip="Net ₹ saved (or lost) across negotiations you led this period. Losses render in red."
    filters={filters}
    fetcher={getSavingsPipeline}
    isEmpty={(d) => !d || (d.negotiation_count ?? 0) === 0}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No negotiations closed in this period yet.
      </div>
    )}
  >
    {(data) => {
      const total = Number(data?.total_savings) || 0;
      const prior = Number(data?.prior_period_savings) || 0;
      const pct = Number(data?.avg_savings_pct) || 0;
      const isLoss = total < 0;
      let delta = 0;
      let DeltaIcon = Minus;
      let deltaClass = styles.deltaFlat;
      let deltaLabel = "—";
      if (Math.abs(prior) > 0) {
        delta = ((total - prior) / Math.abs(prior)) * 100;
        if (delta > 1) {
          DeltaIcon = TrendingUp;
          deltaClass = styles.deltaDown; // green — saving more (or losing less) is better
          deltaLabel = `+${delta.toFixed(0)}% vs prior`;
        } else if (delta < -1) {
          DeltaIcon = TrendingDown;
          deltaClass = styles.deltaUp; // red — savings dropped / losses grew
          deltaLabel = `${delta.toFixed(0)}% vs prior`;
        } else {
          deltaLabel = "On par";
        }
      }
      return (
        <>
          <div className={styles.throughputBlock}>
            <div className={styles.throughputCurrent}>
              <div className={styles.throughputLbl}>
                {isLoss ? "This period · LOST" : "This period · saved"}
              </div>
              <div>
                <span
                  className={styles.throughputNum}
                  style={isLoss ? { color: "#b91c1c" } : undefined}
                >
                  {isLoss ? "−" : ""}₹{fmtINR(Math.abs(total))}
                </span>
              </div>
              <div className={styles.subline}>
                Across{" "}
                <span className={styles.subValue}>
                  {data?.negotiation_count ?? 0}
                </span>{" "}
                negotiation{data?.negotiation_count === 1 ? "" : "s"} ·{" "}
                <span
                  className={styles.subValue}
                  style={isLoss ? { color: "#b91c1c" } : undefined}
                >
                  {isLoss ? "" : ""}
                  {pct.toFixed(1)}% {isLoss ? "over-paid" : "avg"}
                </span>
              </div>
            </div>
            {Math.abs(prior) > 0 && (
              <span className={`${styles.deltaChip} ${deltaClass}`}>
                <DeltaIcon size={12} />
                {deltaLabel}
              </span>
            )}
          </div>
        </>
      );
    }}
  </PersonaCard>
);

export default SavingsPipeline;
