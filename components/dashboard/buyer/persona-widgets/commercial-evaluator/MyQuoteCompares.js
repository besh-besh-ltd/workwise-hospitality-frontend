import React from "react";
import Link from "next/link";
import { GitCompareArrows, ArrowUpRight } from "lucide-react";
import moment from "moment";
import { getMyQuoteCompares } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import styles from "../PersonaCard.module.scss";

/** RFQs in quote-compare stage awaiting my decision. */
const MyQuoteCompares = ({ filters }) => (
  <PersonaCard
    title="My quote-compares"
    icon={GitCompareArrows}
    tooltip="RFQs in quote-compare stage where you're the assigned evaluator."
    filters={filters}
    fetcher={getMyQuoteCompares}
    isEmpty={(d) => !d || !(d.count > 0 || (d.items && d.items.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No quote-compares awaiting your call.
      </div>
    )}
    actions={
      <Link href="/dashboard/buyer/rfq-management?stage=quote_compare" className={styles.badge}>
        View all <ArrowUpRight size={11} />
      </Link>
    }
  >
    {(data) => (
      <>
        <div className={styles.headlineRow}>
          <span className={styles.headlineNum}>{data?.count ?? 0}</span>
          <span className={styles.headlineUnit}>
            RFQ{(data?.count ?? 0) === 1 ? "" : "s"} to compare
          </span>
        </div>
        {(data?.items || []).slice(0, 5).length > 0 && (
          <div className={styles.itemList}>
            {(data?.items || []).slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/buyer/quote-compare?rfq_id=${item.id}`}
                className={styles.item}
              >
                <div className={styles.itemMain}>
                  <div className={styles.itemTitle}>
                    {item.title || `RFQ #${item.rfq_no || item.id}`}
                  </div>
                  <div className={styles.itemMeta}>
                    <span>{item.vendor_count ?? 0} vendors</span>
                    <span>{moment(item.entered_qc_at).fromNow()}</span>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <ArrowUpRight size={12} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </>
    )}
  </PersonaCard>
);

export default MyQuoteCompares;
