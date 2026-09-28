import React from "react";
import Link from "next/link";
import { Layers } from "lucide-react";
import { getAwardValuePipeline } from "@/services/dashboard";
import { poList, poTracking } from "@/components/dashboard/shared/dashboardLinks";
import { formatMoney } from "@/components/dashboard/shared/format";
import PersonaCard from "../PersonaCard";
import { SkeletonHeadline } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, plural } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("award_value_pipeline");

/** Where each stage row opens. Only stages with a matching list filter link. */
const STAGE_HREF = {
  in_approval: poList({ status: "action-required" }),
  approved: poList({ status: "approved" }),
  awaiting_acceptance: poTracking({ tab: "active" }),
  in_fulfilment: poTracking({ tab: "active" }),
  completed: poTracking({ tab: "completed" }),
  rejected: poList({ status: "rejected" }),
};

/** Value of POs raised in the period, by stage. Committed = approved onwards
 *  (the same basis as spend); pending = still in approval. */
const AwardValuePipeline = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={Layers}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getAwardValuePipeline}
    skeleton={<SkeletonHeadline withSpark={false} />}
    isEmpty={(d) => !d || !(d.stages || []).some((s) => s.po_count > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No purchase orders raised in this period.
      </div>
    )}
    actions={<ViewAll href={poList()} />}
  >
    {(data) => {
      const stages = (data.stages || []).filter((s) => s.po_count > 0);
      const max = Math.max(1, ...stages.map((s) => Number(s.value) || 0));
      return (
        <>
          <div className={styles.pipelineGrid}>
            <div className={styles.pipelineCell}>
              <div className={styles.pipelineCellLbl}>Committed</div>
              <div className={styles.pipelineCellNum}>{formatMoney(data.committed_value)}</div>
              <div className={styles.pipelineCellMeta}>
                {data.committed_po_count ?? 0} {plural(data.committed_po_count ?? 0, "PO")}
              </div>
            </div>
            <div className={styles.pipelineCell}>
              <div className={styles.pipelineCellLbl}>In approval</div>
              <div className={styles.pipelineCellNum}>{formatMoney(data.pending_value)}</div>
              <div className={styles.pipelineCellMeta}>
                {data.pending_po_count ?? 0} {plural(data.pending_po_count ?? 0, "PO")}
              </div>
            </div>
          </div>
          <div className={styles.stageList} style={{ marginTop: 12 }}>
            {stages.map((s) => {
              const body = (
                <>
                  <span className={styles.stageLabel}>
                    {s.label} · {s.po_count} {plural(s.po_count, "PO")}
                  </span>
                  <span className={styles.stageValue}>{formatMoney(s.value)}</span>
                  <span className={styles.stageBar} aria-hidden="true">
                    <span style={{ width: `${((Number(s.value) || 0) / max) * 100}%` }} />
                  </span>
                </>
              );
              return STAGE_HREF[s.key] ? (
                <Link key={s.key} href={STAGE_HREF[s.key]} className={styles.stageRow}>{body}</Link>
              ) : (
                <div key={s.key} className={styles.stageRow}>{body}</div>
              );
            })}
          </div>
        </>
      );
    }}
  </PersonaCard>
);

export default AwardValuePipeline;
