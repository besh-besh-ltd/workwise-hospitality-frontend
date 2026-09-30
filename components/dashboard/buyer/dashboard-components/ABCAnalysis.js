import React from "react";
import { Layers } from "lucide-react";
import { getAbcAnalysis } from "@/services/dashboard";
import InfoTip from "@/components/shared/InfoTip";
import { formatMoney as formatCurrency } from "@/components/dashboard/shared/format";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonKpiGrid } from "@/components/dashboard/shared";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import styles from "./ABCAnalysis.module.scss";

// Tier presentation + the "so what" guidance procurement teams act on.
const CLASS_META = {
  A: {
    name: "Class A",
    tag: "High value",
    color: "#15803d",
    soft: "#ecfdf3",
    guidance: "Negotiate hard, lock contracts, monitor closely.",
  },
  B: {
    name: "Class B",
    tag: "Moderate",
    color: "#b45309",
    soft: "#fef6ec",
    guidance: "Review periodically; keep backup vendors.",
  },
  C: {
    name: "Class C",
    tag: "Low value",
    color: "#64748b",
    soft: "#f1f5f9",
    guidance: "Simplify & bulk-order; automate reorders.",
  },
};

const ABCAnalysis = ({ filters }) => {
  // Value only: quantities are in mixed units (pcs, kg, litres…), so a
  // "by volume" ranking would add unlike things together.
  const { data, loading, error, stale, refetch } = useDashboardQuery(getAbcAnalysis, filters);

  const metricNoun = "committed spend";
  const fmtMetric = formatCurrency;
  const metricOf = (x) => x.value;

  // Order tiers A→B→C deterministically regardless of API order.
  const order = { A: 0, B: 1, C: 2 };
  const classes = [...(data?.classes || [])].sort((a, b) => order[a.class] - order[b.class]);
  const classA = classes.find((c) => c.class === "A");
  const totalItems = data?.total_items || 0;
  const topItems = (data?.items || []).slice(0, 6);

  return (
    <PersonaCardShell
      title="ABC analysis"
      icon={Layers}
      tooltip="Pareto classification of items by committed spend in the period: A items drive most of the value and deserve the most attention; C items are low-value and can be streamlined."
      loading={loading}
      error={error}
      stale={stale}
      skeleton={<SkeletonKpiGrid count={3} />}
      isEmpty={totalItems === 0}
      renderEmpty={() => (
        <div className={styles.emptyState}>
          No procured items in the selected period to classify.
        </div>
      )}
      onRefresh={refetch}
    >
      {/* Headline Pareto takeaway — the core "hot spot" insight. */}
      {classA && (
        <div className={styles.insight}>
          <span className={styles.insightStrong}>{classA.item_pct}%</span> of items
          (Class A) drive{" "}
          <span className={styles.insightStrong}>{classA.metric_pct}%</span> of {metricNoun}
          <span className={styles.insightMeta}>· {totalItems} items analysed</span>
        </div>
      )}

      {/* Distribution bar — how the chosen metric concentrates across A/B/C. */}
      <div className={styles.distBar}>
        {classes.map((c) =>
          c.metric_pct > 0 ? (
            <span
              key={c.class}
              className={styles.distSeg}
              style={{ width: `${c.metric_pct}%`, background: CLASS_META[c.class]?.color }}
              title={`Class ${c.class}: ${c.metric_pct}% of ${metricNoun}`}
            />
          ) : null
        )}
      </div>

      {/* Tier rows — count + share + the action to take. */}
      <div className={styles.tierList}>
        {classes.map((c) => {
          const meta = CLASS_META[c.class] || CLASS_META.C;
          return (
            <div key={c.class} className={styles.tierRow}>
              <span className={styles.tierBadge} style={{ background: meta.color }}>
                {c.class}
              </span>
              <div className={styles.tierMain}>
                <div className={styles.tierName}>
                  {meta.name} <span className={styles.tierTag}>{meta.tag}</span>
                </div>
                <div className={styles.tierGuidance}>{meta.guidance}</div>
              </div>
              <div className={styles.tierStats}>
                <div className={styles.tierValue}>{fmtMetric(metricOf(c))}</div>
                <div className={styles.tierMeta}>
                  {c.item_count} item{c.item_count === 1 ? "" : "s"} · {c.metric_pct}% of {metricNoun}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Focus items — the highest-contributing items to act on first. */}
      {topItems.length > 0 && (
        <div className={styles.itemList}>
          <div className={styles.itemListHead}>
            Focus items
            <InfoTip text={`Highest-contributing items by ${metricNoun}, with their ABC tier.`} />
          </div>
          {topItems.map((it) => {
            const meta = CLASS_META[it.class] || CLASS_META.C;
            return (
              <div key={it.product_variant_id} className={styles.item}>
                <span className={styles.itemRank}>{it.rank}</span>
                <span className={styles.itemName} title={it.name}>{it.name}</span>
                <span
                  className={styles.itemTier}
                  style={{ color: meta.color, background: meta.soft }}
                >
                  {it.class}
                </span>
                <span className={styles.itemMetric}>{fmtMetric(metricOf(it))}</span>
              </div>
            );
          })}
        </div>
      )}
    </PersonaCardShell>
  );
};

export default ABCAnalysis;
