import React from "react";
import Link from "next/link";
import { MessageSquareWarning, ArrowUpRight } from "lucide-react";
import moment from "moment";
import { getMyActiveNegotiations } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import styles from "../PersonaCard.module.scss";

/** Negotiation rounds where I'm the lead — with silent-vendor flags. */
const MyActiveNegotiations = ({ filters }) => (
  <PersonaCard
    title="My active negotiations"
    icon={MessageSquareWarning}
    tooltip="Negotiation rounds where you're the lead — silent vendors flagged."
    filters={filters}
    fetcher={getMyActiveNegotiations}
    isEmpty={(d) => !d || !(d.count > 0 || (d.items && d.items.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No active negotiation rounds.
      </div>
    )}
    actions={
      <Link href="/dashboard/buyer/rfq-management?stage=negotiation" className={styles.badge}>
        View all <ArrowUpRight size={11} />
      </Link>
    }
  >
    {(data) => (
      <>
        <div className={styles.headlineRow}>
          <span className={styles.headlineNum}>{data?.count ?? 0}</span>
          <span className={styles.headlineUnit}>
            round{(data?.count ?? 0) === 1 ? "" : "s"} live
          </span>
        </div>
        <div className={styles.subline}>
          Silent vendors across rounds:{" "}
          <span className={styles.subValue}>{data?.total_silent_vendors ?? 0}</span>
        </div>
        {(data?.items || []).slice(0, 5).length > 0 && (
          <div className={styles.itemList}>
            {(data?.items || []).slice(0, 5).map((item) => {
              const endsIn = item.round_end_date
                ? Math.max(0, moment(item.round_end_date).diff(moment(), "hours"))
                : null;
              return (
                <Link
                  key={item.id}
                  href={`/dashboard/buyer/negotiation?rfq_id=${item.rfq_id}`}
                  className={styles.item}
                >
                  <div className={styles.itemMain}>
                    <div className={styles.itemTitle}>
                      {item.rfq_title || `RFQ #${item.rfq_no || item.rfq_id}`}
                    </div>
                    <div className={styles.itemMeta}>
                      <span>Round {item.round_number ?? "?"}</span>
                      {item.silent_vendor_count > 0 && (
                        <span style={{ color: "#b91c1c" }}>
                          {item.silent_vendor_count} silent
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={styles.itemRight}>
                    <span
                      className={
                        endsIn != null && endsIn <= 6
                          ? `${styles.badge} ${styles.badgeDanger}`
                          : `${styles.badge}`
                      }
                    >
                      {endsIn != null ? `${endsIn}h left` : "—"}
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

export default MyActiveNegotiations;
