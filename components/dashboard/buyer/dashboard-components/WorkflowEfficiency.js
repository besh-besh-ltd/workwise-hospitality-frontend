import React, { useEffect, useState, useRef, useCallback } from "react";
import { AlertTriangle, Workflow } from "lucide-react";
import { getWorkflowEfficiency } from "@/services/dashboard";
import { PersonaCardShell } from "../persona-widgets/PersonaCard";
import { SkeletonKpiGrid } from "@/components/dashboard/shared";
import styles from "./WorkflowEfficiency.module.scss";

const formatDwellTime = (hours) => {
  if (!hours || hours === 0) return "0h";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${parseFloat(hours).toFixed(1)}h`;
  const days = hours / 24;
  return `${parseFloat(days).toFixed(1)}d`;
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

const WorkflowEfficiency = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await getWorkflowEfficiency(filters);
      setData(res.data);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    fetchData();
    intervalRef.current = setInterval(fetchData, 20000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.hotel_ids, filters.start_date, filters.end_date, filters._refresh]);

  const rawStages = data?.stages || [];
  const stageMap = {};
  rawStages.forEach((s) => { stageMap[s.stage_name] = s; });

  const lifecycleStages = LIFECYCLE_STAGES
    .filter((lc) => stageMap[lc.key])
    .map((lc) => {
      const s = stageMap[lc.key];
      return {
        key: lc.key,
        label: lc.label,
        avg_dwell_time_hours: s.avg_dwell_time_hours || 0,
        rfq_count: s.rfq_count || 0,
      };
    });

  const maxHours = Math.max(...lifecycleStages.map((s) => s.avg_dwell_time_hours), 1);
  const bottleneckIdx = lifecycleStages.length > 0
    ? lifecycleStages.reduce((maxIdx, s, i, arr) =>
        s.avg_dwell_time_hours > arr[maxIdx].avg_dwell_time_hours ? i : maxIdx, 0)
    : -1;
  return (
    <PersonaCardShell
      title="Efficiency funnel"
      icon={Workflow}
      tooltip="Average time spent at each workflow stage. Bottleneck stage is highlighted."
      loading={loading}
      error={error}
      isEmpty={lifecycleStages.length === 0}
      skeleton={<SkeletonKpiGrid count={5} />}
      renderEmpty={() => (
        <div className={styles.emptyState}>
          No workflow data available for the selected period.
        </div>
      )}
      onRefresh={() => {
        setLoading(true);
        fetchData();
      }}
    >
      <div className={styles.stageList}>
        {lifecycleStages.map((stage, index) => {
          const isBottleneck = index === bottleneckIdx && stage.avg_dwell_time_hours > 0;
          const pct = Math.max((stage.avg_dwell_time_hours / maxHours) * 100, 4);
          return (
            <div key={stage.key} className={styles.stageItem}>
              <div className={styles.stageHeader}>
                <span className={styles.stageName}>{stage.label}</span>
                <span className={`${styles.stageTime} ${isBottleneck ? styles.bottleneck : ""}`}>
                  {formatDwellTime(stage.avg_dwell_time_hours)}
                </span>
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressFill} ${isBottleneck ? styles.bottleneck : ""}`}
                  style={{ width: `${pct}%` }}
                />
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
