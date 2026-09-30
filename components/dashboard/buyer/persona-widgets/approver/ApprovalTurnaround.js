import React, { useState } from "react";
import { Timer } from "lucide-react";
import { getApprovalTurnaround } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import { SkeletonHeadline } from "@/components/dashboard/shared";
import { widgetCopy, plural } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("approval_turnaround");

/** Hours → "45 min" / "6.5 h" / "3.2 days". null → "—". */
export const formatDuration = (hours) => {
  if (hours === null || hours === undefined || hours === "") return "—";
  const h = Number(hours);
  if (!Number.isFinite(h)) return "—";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${Number(h.toFixed(1))} h`;
  return `${Number((h / 24).toFixed(1))} days`;
};

/** Tab body — median, P90 and sample size for one stage. */
const TurnaroundBody = ({ tab }) => {
  if (!tab || !(tab.n > 0)) {
    return (
      <div className={styles.emptyState}>
        No {tab?.label?.toLowerCase() || "decisions"} in this period.
      </div>
    );
  }
  return (
    <>
      <div className={styles.pipelineGrid}>
        <div className={styles.pipelineCell}>
          <div className={styles.pipelineCellLbl}>Median</div>
          <div className={styles.pipelineCellNum}>{formatDuration(tab.median_hours)}</div>
          <div className={styles.pipelineCellMeta}>half take less</div>
        </div>
        <div className={styles.pipelineCell}>
          <div className={styles.pipelineCellLbl}>90th percentile</div>
          <div className={styles.pipelineCellNum}>{formatDuration(tab.p90_hours)}</div>
          <div className={styles.pipelineCellMeta}>9 in 10 take less</div>
        </div>
      </div>
      <div className={styles.noteLine}>
        Based on {tab.n} {plural(tab.n, "decision")}
        {tab.instant_count > 0 ? ` · ${tab.instant_count} decided within a minute` : ""}
      </div>
    </>
  );
};

/** How long this user's decisions take at each approval stage, measured from
 *  when the step reached them. Honours the header date range. */
const ApprovalTurnaround = ({ filters }) => {
  const [active, setActive] = useState(null);
  return (
    <PersonaCard
      title={copy.title}
      icon={Timer}
      tooltip={copy.tooltip}
      filters={filters}
      fetcher={getApprovalTurnaround}
      skeleton={<SkeletonHeadline withSpark={false} />}
      isEmpty={(d) => !d || !(d.tabs || []).length}
      renderEmpty={() => (
        <div className={styles.emptyState}>No approval activity in this period.</div>
      )}
    >
      {(data) => {
        const tabs = data.tabs || [];
        // Default to the first stage that has decisions, so the card opens on data.
        const fallback = (tabs.find((t) => t.n > 0) || tabs[0])?.key;
        const current = tabs.find((t) => t.key === active) ? active : fallback;
        const tab = tabs.find((t) => t.key === current);
        return (
          <>
            <div className={styles.tabRow} role="tablist" aria-label="Approval stage">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={t.key === current}
                  className={`${styles.tab} ${t.key === current ? styles.tabActive : ""}`}
                  onClick={() => setActive(t.key)}
                >
                  {t.label}
                  {t.n > 0 ? ` (${t.n})` : ""}
                </button>
              ))}
            </div>
            <div role="tabpanel">
              <TurnaroundBody tab={tab} />
            </div>
          </>
        );
      }}
    </PersonaCard>
  );
};

export default ApprovalTurnaround;
