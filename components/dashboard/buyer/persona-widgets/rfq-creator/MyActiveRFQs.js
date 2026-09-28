import React from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { getMyActiveRfqs } from "@/services/dashboard";
import { rfqList } from "@/components/dashboard/shared/dashboardLinks";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, Headline, plural } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("my_active_rfqs");
const allMine = rfqList({ tab: "ongoing", mine: true });

/** Live RFQs the user created, bucketed by lifecycle stage (the same stage keys
 *  and labels the RFQ list uses, so each row opens that exact facet). */
const MyActiveRFQs = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={Activity}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getMyActiveRfqs}
    poll
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.total > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No live RFQs right now.
      </div>
    )}
    actions={<ViewAll href={allMine} />}
  >
    {(data) => {
      const stages = (data.stages || []).filter((s) => s.count > 0);
      const max = Math.max(1, ...stages.map((s) => s.count));
      return (
        <>
          <Headline count={data.total} unit="active RFQ" />
          <div className={styles.stageList}>
            {stages.map((s) => (
              <Link
                key={s.stage}
                href={rfqList({ status: [s.stage], mine: true })}
                className={styles.stageRow}
                title={s.oldest_age_days != null ? `Oldest ${s.oldest_age_days} ${plural(s.oldest_age_days, "day")} in this stage` : undefined}
              >
                <span className={styles.stageLabel}>{s.label || s.stage}</span>
                <span className={styles.stageValue}>{s.count}</span>
                <span className={styles.stageBar} aria-hidden="true">
                  <span style={{ width: `${(s.count / max) * 100}%` }} />
                </span>
              </Link>
            ))}
          </div>
        </>
      );
    }}
  </PersonaCard>
);

export default MyActiveRFQs;
