import React from "react";
import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";
import { getMyActiveRfqs } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import styles from "../PersonaCard.module.scss";

const STAGE_LABELS = {
  awaiting_vendor_quotes: "Awaiting vendor quotes",
  quote_compare: "Quote-compare in progress",
  negotiation: "Under negotiation",
  technical_evaluation: "Technical evaluation",
  awaiting_approval: "Awaiting approval",
  awarded: "Awarded — pending PO",
};

/** Live RFQs you created, bucketed by lifecycle stage. */
const MyActiveRFQs = ({ filters }) => (
  <PersonaCard
    title="My active RFQs"
    icon={Activity}
    tooltip="Your live RFQs grouped by where they are in the lifecycle."
    filters={filters}
    fetcher={getMyActiveRfqs}
    isEmpty={(d) => !d || !(d.total > 0 || (d.stages && d.stages.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No active RFQs created by you in this period.
      </div>
    )}
    actions={
      <Link href="/dashboard/buyer/rfq-management" className={styles.badge}>
        View all <ArrowUpRight size={11} />
      </Link>
    }
  >
    {(data) => (
      <>
        <div className={styles.headlineRow}>
          <span className={styles.headlineNum}>{data?.total ?? 0}</span>
          <span className={styles.headlineUnit}>active RFQ{(data?.total ?? 0) === 1 ? "" : "s"}</span>
        </div>
        <div className={styles.itemList}>
          {(data?.stages || []).map((s) => (
            <Link
              key={s.stage}
              href={`/dashboard/buyer/rfq-management?stage=${encodeURIComponent(s.stage)}`}
              className={styles.item}
            >
              <div className={styles.itemMain}>
                <div className={styles.itemTitle}>
                  {STAGE_LABELS[s.stage] || s.stage}
                </div>
                {s.oldest_age_days != null && (
                  <div className={styles.itemMeta}>
                    <span>Oldest: {s.oldest_age_days}d</span>
                  </div>
                )}
              </div>
              <div className={styles.itemRight}>
                <span>{s.count}</span>
                <ArrowUpRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </>
    )}
  </PersonaCard>
);

export default MyActiveRFQs;
