import React from "react";
import Link from "next/link";
import { UserX, ArrowUpRight } from "lucide-react";
import moment from "moment";
import { getMyNoResponseRfqs } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import styles from "../PersonaCard.module.scss";

/** Live RFQs of mine where ≥1 invited vendor hasn't quoted yet —
 *  these are the items I might need to chase/nudge. */
const MyNoResponseRFQs = ({ filters }) => (
  <PersonaCard
    title="Vendors yet to quote"
    icon={UserX}
    tooltip="Your live RFQs where one or more invited vendors haven't submitted a quote yet."
    filters={filters}
    fetcher={getMyNoResponseRfqs}
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0 || (d.items && d.items.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        All invited vendors have responded — nice work.
      </div>
    )}
    actions={
      <Link
        href="/dashboard/buyer/rfq-management?filter=no_response"
        className={styles.badge}
      >
        View all <ArrowUpRight size={11} />
      </Link>
    }
  >
    {(data) => (
      <>
        <div className={styles.headlineRow}>
          <span className={styles.headlineNum}>{data?.count ?? 0}</span>
          <span className={styles.headlineUnit}>
            RFQ{(data?.count ?? 0) === 1 ? "" : "s"} need a nudge
          </span>
        </div>
        <div className={styles.subline}>
          Vendors silent total:{" "}
          <span className={styles.subValue}>{data?.silent_vendor_count ?? 0}</span>
        </div>
        {(data?.items || []).slice(0, 5).length > 0 && (
          <div className={styles.itemList}>
            {(data?.items || []).slice(0, 5).map((item) => {
              const daysLeft = item.bid_end_date
                ? Math.max(0, moment(item.bid_end_date).diff(moment(), "days"))
                : null;
              return (
                <Link
                  key={item.id}
                  href={`/dashboard/buyer/rfq-management?id=${item.id}`}
                  className={styles.item}
                >
                  <div className={styles.itemMain}>
                    <div className={styles.itemTitle}>
                      {item.title || `RFQ #${item.rfq_no || item.id}`}
                    </div>
                    <div className={styles.itemMeta}>
                      <span>
                        {item.silent_vendor_count ?? 0}/{item.total_vendor_count ?? 0} silent
                      </span>
                      {daysLeft != null && <span>{daysLeft}d left</span>}
                    </div>
                  </div>
                  <div className={styles.itemRight}>
                    <span
                      className={
                        daysLeft != null && daysLeft <= 1
                          ? `${styles.badge} ${styles.badgeDanger}`
                          : daysLeft != null && daysLeft <= 3
                          ? `${styles.badge} ${styles.badgeWarn}`
                          : styles.badge
                      }
                    >
                      {daysLeft != null ? `${daysLeft}d` : "—"}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </>
    )}
  </PersonaCard>
);

export default MyNoResponseRFQs;
