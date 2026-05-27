import React from "react";
import Link from "next/link";
import { Hourglass, ArrowUpRight } from "lucide-react";
import { getTechApprovalOldestPending } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import styles from "../PersonaCard.module.scss";

/** Top 5 items in MY tech-approval queue waiting on me the longest. */
const TechApprovalOldestPending = ({ filters }) => (
  <PersonaCard
    title="Oldest in my approval queue"
    icon={Hourglass}
    tooltip="The 5 items that have been waiting on you the longest — proactive escalation list."
    filters={filters}
    fetcher={getTechApprovalOldestPending}
    isEmpty={(d) => !d || !(d.items && d.items.length > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        Nothing has been waiting on you — nicely cleared.
      </div>
    )}
  >
    {(data) => (
      <div className={styles.itemList} style={{ borderTop: "none" }}>
        {(data?.items || []).slice(0, 5).map((item) => {
          const days = item.age_days ?? 0;
          const ageBadgeClass =
            days >= 7
              ? `${styles.badge} ${styles.badgeDanger}`
              : days >= 3
              ? `${styles.badge} ${styles.badgeWarn}`
              : styles.badge;
          return (
            <Link
              key={item.id}
              href={`/dashboard/buyer/technical-evaluation?rfq_id=${item.rfq_id}&product_id=${item.product_id}`}
              className={styles.item}
            >
              <div className={styles.itemMain}>
                <div className={styles.itemTitle}>{item.product_name}</div>
                <div className={styles.itemMeta}>
                  <span>RFQ #{item.rfq_no || item.rfq_id}</span>
                  {item.submitted_by_name && <span>by {item.submitted_by_name}</span>}
                </div>
              </div>
              <div className={styles.itemRight}>
                <span className={ageBadgeClass}>{days}d waiting</span>
                <ArrowUpRight size={12} />
              </div>
            </Link>
          );
        })}
      </div>
    )}
  </PersonaCard>
);

export default TechApprovalOldestPending;
