import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";
import moment from "moment";
import { getMyTechApprovalsPending } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import styles from "../PersonaCard.module.scss";

/** Tech-eval results queued for my approval. */
const MyTechApprovalsPending = ({ filters }) => (
  <PersonaCard
    title="My tech-approvals pending"
    icon={ShieldCheck}
    tooltip="Tech-evaluation results queued for your approval."
    filters={filters}
    fetcher={getMyTechApprovalsPending}
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0 || (d.items && d.items.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No approvals queued — you're all clear.
      </div>
    )}
    actions={
      <Link href="/dashboard/buyer/technical-evaluation?role=approver" className={styles.badge}>
        View all <ArrowUpRight size={11} />
      </Link>
    }
  >
    {(data) => (
      <>
        <div className={styles.headlineRow}>
          <span className={styles.headlineNum}>{data?.count ?? 0}</span>
          <span className={styles.headlineUnit}>
            approval{(data?.count ?? 0) === 1 ? "" : "s"} pending
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
                    <span>Submitted {moment(item.submitted_at).fromNow()}</span>
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

export default MyTechApprovalsPending;
