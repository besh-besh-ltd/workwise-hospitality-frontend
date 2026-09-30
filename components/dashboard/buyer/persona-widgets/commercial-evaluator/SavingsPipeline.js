import React from "react";
import { PiggyBank, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getSavingsPipeline } from "@/services/dashboard";
import { negotiationList } from "@/components/dashboard/shared/dashboardLinks";
import { formatMoney } from "@/components/dashboard/shared/format";
import PersonaCard from "../PersonaCard";
import { SkeletonHeadline } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, plural } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("savings_pipeline");

/** Compare with the prior window of the same length. `null` prior (the "All"
 *  range) shows no comparison at all rather than a fake 0. */
export const savingsDelta = (current, prior) => {
  if (prior == null || current == null) return null;
  const c = Number(current);
  const p = Number(prior);
  if (!Number.isFinite(c) || !Number.isFinite(p)) return null;
  if (p === 0) return c === 0 ? { kind: "flat" } : { kind: c > 0 ? "up" : "down", pct: null };
  const pct = ((c - p) / Math.abs(p)) * 100;
  if (Math.abs(pct) < 1) return { kind: "flat" };
  return { kind: pct > 0 ? "up" : "down", pct };
};

const DeltaChip = ({ delta }) => {
  if (!delta) return null;
  if (delta.kind === "flat") {
    return <span className={`${styles.deltaChip} ${styles.deltaFlat}`}><Minus size={12} />Same as before</span>;
  }
  const up = delta.kind === "up";
  const Icon = up ? TrendingUp : TrendingDown;
  // More savings is good (green); fewer is the "worse" colour.
  const cls = up ? styles.deltaDown : styles.deltaUp;
  return (
    <span className={`${styles.deltaChip} ${cls}`}>
      <Icon size={12} />
      {delta.pct == null ? (up ? "Up" : "Down") : `${Math.abs(delta.pct).toFixed(0)}% ${up ? "more" : "less"}`} than prior period
    </span>
  );
};

/** Awarded savings on negotiations this user led that concluded in the
 *  selected period, against the period before. */
const SavingsPipeline = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={PiggyBank}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getSavingsPipeline}
    skeleton={<SkeletonHeadline withSpark={false} />}
    isEmpty={(d) => !d || (!(d.negotiation_count > 0) && !d.prior_period_savings)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        None of your negotiations concluded in this period.
      </div>
    )}
    actions={<ViewAll href={negotiationList({ tab: "closed" })} />}
  >
    {(data) => (
      <>
        <div className={styles.throughputBlock}>
          <div className={styles.throughputCurrent}>
            <div className={styles.throughputLbl}>Saved on awarded quotes</div>
            <div>
              <span className={styles.throughputNum}>{formatMoney(data.total_savings)}</span>
            </div>
            <div className={styles.subline}>
              {data.negotiation_count ?? 0} {plural(data.negotiation_count ?? 0, "negotiation")}
              {data.avg_savings_pct != null && (
                <> · avg <span className={styles.subValue}>{Number(data.avg_savings_pct).toFixed(1)}%</span></>
              )}
            </div>
          </div>
          <DeltaChip delta={savingsDelta(data.total_savings, data.prior_period_savings)} />
        </div>
        {data.prior_period_savings != null && (
          <div className={styles.noteLine}>
            Prior period: {formatMoney(data.prior_period_savings)}
          </div>
        )}
        {data.all_vendors_savings != null && (
          <div className={styles.noteLine}>
            Across all vendors (incl. not awarded): {formatMoney(data.all_vendors_savings)}
          </div>
        )}
      </>
    )}
  </PersonaCard>
);

export default SavingsPipeline;
