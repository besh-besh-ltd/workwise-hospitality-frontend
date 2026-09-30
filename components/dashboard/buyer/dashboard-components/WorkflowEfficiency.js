import React from "react";
import { AlertTriangle, Workflow } from "lucide-react";
import { getWorkflowEfficiency } from "@/services/dashboard";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonKpiGrid } from "@/components/dashboard/shared";
import useDashboardQuery from "@/hooks/useDashboardQuery";
import styles from "./WorkflowEfficiency.module.scss";

export const formatDwellTime = (hours) => {
  if (hours === null || hours === undefined) return "—";
  const h = Number(hours);
  if (!Number.isFinite(h)) return "—";
  if (h === 0) return "0h";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

const LIFECYCLE_STAGES = [
  { key: "rfq_approval", label: "RFQ approval" },
  { key: "quote_wait", label: "Awaiting quotes" },
  { key: "tech_evaluation", label: "Technical evaluation" },
  { key: "tech_approval", label: "Technical approval" },
  { key: "negotiation", label: "Negotiation" },
  { key: "commercial_evaluation", label: "Commercial evaluation" },
  { key: "commercial_approval", label: "Commercial approval" },
  { key: "po_approval", label: "PO approval" },
  { key: "vendor_action", label: "Vendor action" },
];

const plural = (n, one, many = `${one}s`) => (Number(n) === 1 ? one : many);

/**
 * Stage turnaround — for RFQs created in the period, the typical (median) time
 * each stage took, with the 90th percentile and how many RFQs it's based on.
 * Cancelled and rejected approvals are excluded; decisions made within a minute
 * are reported separately as "instant" so they don't flatter the median.
 */
const WorkflowEfficiency = ({ filters }) => {
  const { data, loading, error, stale, refetch } = useDashboardQuery(getWorkflowEfficiency, filters);

  const stageMap = {};
  (data?.stages || []).forEach((s) => { stageMap[s.stage_name] = s; });

  const lifecycleStages = LIFECYCLE_STAGES
    .filter((lc) => stageMap[lc.key])
    .map((lc) => {
      const s = stageMap[lc.key];
      return {
        key: lc.key,
        label: lc.label,
        median_hours: s.median_hours ?? null,
        p90_hours: s.p90_hours ?? null,
        rfq_count: s.rfq_count || 0,
        instant_count: s.instant_count || 0,
      };
    });

  const maxHours = Math.max(...lifecycleStages.map((s) => s.median_hours || 0), 1);
  const bottleneckIdx = lifecycleStages.length > 0
    ? lifecycleStages.reduce((maxIdx, s, i, arr) =>
        (s.median_hours || 0) > (arr[maxIdx].median_hours || 0) ? i : maxIdx, 0)
    : -1;
  return (
    <PersonaCardShell
      title="Stage turnaround"
      icon={Workflow}
      tooltip="For RFQs created in the period: the median time each stage took (half took less), with the 90th percentile. Cancelled and rejected approvals are excluded; the longest stage is highlighted."
      loading={loading}
      error={error}
      stale={stale}
      isEmpty={lifecycleStages.length === 0}
      skeleton={<SkeletonKpiGrid count={5} />}
      renderEmpty={() => (
        <div className={styles.emptyState}>
          No completed stages for RFQs created in the selected period.
        </div>
      )}
      onRefresh={refetch}
    >
      <div className={styles.stageList}>
        {lifecycleStages.map((stage, index) => {
          const isBottleneck = index === bottleneckIdx && (stage.median_hours || 0) > 0;
          const pct = Math.max(((stage.median_hours || 0) / maxHours) * 100, 4);
          return (
            <div key={stage.key} className={styles.stageItem}>
              <div className={styles.stageHeader}>
                <span className={styles.stageName}>{stage.label}</span>
                <span className={`${styles.stageTime} ${isBottleneck ? styles.bottleneck : ""}`}>
                  {formatDwellTime(stage.median_hours)}
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${isBottleneck ? styles.bottleneck : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className={styles.stageMeta}>
                P90 {formatDwellTime(stage.p90_hours)} · {stage.rfq_count} {plural(stage.rfq_count, "RFQ")}
                {stage.instant_count > 0 ? ` · ${stage.instant_count} instant` : ""}
              </div>
              {isBottleneck && (
                <div className={styles.bottleneckWarning}>
                  <AlertTriangle size={11} />
                  Longest stage — review for optimisation
                </div>
              )}
            </div>
          );
        })}
      </div>
    </PersonaCardShell>
  );
};

export default WorkflowEfficiency;
