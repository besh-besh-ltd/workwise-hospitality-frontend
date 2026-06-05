import React from "react";
import Link from "next/link";
import { ClipboardCheck, ArrowUpRight } from "lucide-react";
import moment from "moment";
import { getMyTechEvalsPending } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import styles from "../PersonaCard.module.scss";

/** Products awaiting MY tech-eval clause responses, sorted oldest-first. */
const MyTechEvalsPending = ({ filters }) => (
  <PersonaCard
    title="My tech-evals pending"
    icon={ClipboardCheck}
    tooltip="Products awaiting your tech-eval clause responses, sorted by age."
    filters={filters}
    fetcher={getMyTechEvalsPending}
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0 || (d.items && d.items.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        Your tech-eval queue is empty — caught up.
      </div>
    )}
    actions={
      <Link href="/dashboard/buyer/technical-evaluation" className={styles.badge}>
        View all <ArrowUpRight size={11} />
      </Link>
    }
  >
    {(data) => (
      <>
        <div className={styles.headlineRow}>
          <span className={styles.headlineNum}>{data?.count ?? 0}</span>
          <span className={styles.headlineUnit}>
            item{(data?.count ?? 0) === 1 ? "" : "s"} pending
          </span>
        </div>
        <div className={styles.subline}>
          Oldest in queue:{" "}
          <span className={styles.subValue}>
            {data?.oldest_opened_at
              ? moment(data.oldest_opened_at).fromNow(true) + " ago"
              : "—"}
          </span>
        </div>
        {(data?.items || []).slice(0, 5).length > 0 && (
          <div className={styles.itemList}>
            {(data?.items || []).slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/buyer/technical-evaluation?rfq_id=${item.rfq_id}&product_id=${item.product_id}`}
                className={styles.item}
              >
                <div className={styles.itemMain}>
                  <div className={styles.itemTitle}>{item.product_name}</div>
                  <div className={styles.itemMeta}>
                    <span>RFQ #{item.rfq_no || item.rfq_id}</span>
                    <span>{moment(item.opened_at).fromNow(true)} ago</span>
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

export default MyTechEvalsPending;
