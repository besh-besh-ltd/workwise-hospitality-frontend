import React, { useEffect, useState, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import { getWorkflowEfficiency } from "@/services/dashboard";
import CardLoader from "./CardLoader";
import CardError from "./CardError";
import styles from "./WorkflowEfficiency.module.scss";

const formatDwellTime = (hours) => {
  if (!hours || hours === 0) return "0h";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${parseFloat(hours).toFixed(1)}h`;
  const days = hours / 24;
  return `${parseFloat(days).toFixed(1)}d`;
};

// Fixed lifecycle order with business-friendly labels
// DB stages are mapped into these buckets
// Fixed lifecycle order — keys match backend stage names exactly
const LIFECYCLE_STAGES = [
  { key: "rfq_approval", label: "RFQ Approval" },
  { key: "quote_wait", label: "Awaiting Quotes" },
  { key: "tech_evaluation", label: "Technical Evaluation" },
  { key: "tech_approval", label: "Technical Approval" },
  { key: "negotiation", label: "Negotiation" },
  { key: "commercial_evaluation", label: "Commercial Evaluation" },
  { key: "commercial_approval", label: "Commercial Approval" },
  { key: "po_approval", label: "PO Approval" },
  { key: "vendor_action", label: "Vendor Action" },
];

const WorkflowEfficiency = ({ filters }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const intervalRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await getWorkflowEfficiency(filters);
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 20000);
    return () => clearInterval(intervalRef.current);
  }, [filters.hotel_ids, filters.start_date, filters.end_date, filters._refresh]);

  // Map backend stages to fixed lifecycle order
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
    <div className={styles.card}>
      {loading && <CardLoader />}
      {error && !loading && <CardError onRetry={fetchData} />}
      <h3 className={styles.sectionTitle}>Efficiency Funnel</h3>
      <p className={styles.sectionSubtitle}>Average time spent at each workflow stage</p>

      {lifecycleStages.length > 0 ? (
        <div className={styles.stageList}>
          {lifecycleStages.map((stage, index) => {
            const isBottleneck = index === bottleneckIdx && stage.avg_dwell_time_hours > 0;
            const pct = Math.max((stage.avg_dwell_time_hours / maxHours) * 100, 4);

            return (
              <div key={stage.key} className={styles.stageItem}>
                <div className={styles.stageHeader}>
                  <span className={styles.stageName}>{stage.label}</span>
                  <span className={`${styles.stageTime} ${isBottleneck ? styles.bottleneck : styles.normal}`}>
                    {formatDwellTime(stage.avg_dwell_time_hours)}
                  </span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={`${styles.progressFill} ${isBottleneck ? styles.bottleneck : styles.normal}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {isBottleneck && (
                  <div className={styles.bottleneckWarning}>
                    <AlertTriangle size={12} />
                    Longest stage — review for optimization
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !loading && (
          <div className={styles.emptyState}>
            No workflow data available for the selected period.
          </div>
        )
      )}
    </div>
  );
};

export default WorkflowEfficiency;
