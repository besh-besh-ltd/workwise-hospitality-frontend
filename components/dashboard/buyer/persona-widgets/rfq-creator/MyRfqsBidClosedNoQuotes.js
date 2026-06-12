import React from "react";
import Link from "next/link";
import { AlertOctagon, ArrowUpRight } from "lucide-react";
import { getMyRfqsBidClosedNoQuotes } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import styles from "../PersonaCard.module.scss";

/**
 * RFQs whose bid window has closed but received no vendor quotes.
 * These need urgent attention — extend deadline, re-publish, or escalate.
 */
const MyRfqsBidClosedNoQuotes = ({ filters }) => (
  <PersonaCard
    title="Needs urgent attention"
    icon={AlertOctagon}
    tooltip="Your RFQs whose bid window has passed but no vendor responded. Re-publish, extend the bid, or escalate."
    filters={filters}
    fetcher={getMyRfqsBidClosedNoQuotes}
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0 || (d.items && d.items.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No closed-bid RFQs without responses — nicely handled.
      </div>
    )}
    actions={
      <Link
        href="/dashboard/buyer/rfq-management?filter=bid_closed_no_quotes"
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
            RFQ{(data?.count ?? 0) === 1 ? "" : "s"} need action
          </span>
        </div>
        {(data?.items || []).slice(0, 5).length > 0 && (
          <div className={styles.itemList}>
            {(data?.items || []).slice(0, 5).map((item) => (
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
                    <span>Bid closed</span>
                    <span>{item.days_overdue}d overdue</span>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <span className={`${styles.badge} ${styles.badgeDanger}`}>
                    {item.days_overdue}d
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </>
    )}
  </PersonaCard>
);

export default MyRfqsBidClosedNoQuotes;
