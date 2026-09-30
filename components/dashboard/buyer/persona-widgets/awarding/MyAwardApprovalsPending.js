import React from "react";
import Link from "next/link";
import { Award, ArrowUpRight } from "lucide-react";
import moment from "moment";
import { getMyAwardApprovalsPending } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import styles from "../PersonaCard.module.scss";

const fmtINR = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// Rows are pending NEGOTIATION_QUOTE (vendor award) approvals. They used to
// link to /dashboard/buyer/approval, which does not exist (404). The award is
// decided on the RFQ workspace's Negotiation & Award stage — the same URL the
// RFQ list's Approve CTA builds (RfqListPage APPROVAL_STAGE_BY_ENTITY).
export const awardApprovalHref = (item) =>
  item?.rfq_id != null
    ? `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${item.rfq_id}&stage=negotiation-award&focus=approval`
    : "/dashboard/buyer/rfq-management";

/** Awards waiting on me — at any step in the chain where I'm next. */
const MyAwardApprovalsPending = ({ filters }) => (
  <PersonaCard
    title="My award approvals pending"
    icon={Award}
    tooltip="Awards waiting on your approval — any step in the chain where you're next."
    filters={filters}
    fetcher={getMyAwardApprovalsPending}
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0 || (d.items && d.items.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No award approvals waiting on you.
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
          <span className={styles.headlineNum}>{data?.count ?? 0}</span>
          <span className={styles.headlineUnit}>
            award{(data?.count ?? 0) === 1 ? "" : "s"} on you
          </span>
        </div>
        <div className={styles.subline}>
          Total value:{" "}
          <span className={styles.subValue}>₹{fmtINR(data?.total_value)}</span>
        </div>
        {(data?.items || []).slice(0, 5).length > 0 && (
          <div className={styles.itemList}>
            {(data?.items || []).slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={awardApprovalHref(item)}
                className={styles.item}
              >
                <div className={styles.itemMain}>
                  <div className={styles.itemTitle}>
                    {item.title || `RFQ #${item.rfq_no || item.rfq_id}`}
                  </div>
                  <div className={styles.itemMeta}>
                    <span>{item.vendor_name}</span>
                    <span>{moment(item.submitted_at).fromNow()}</span>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <span>₹{fmtINR(item.value)}</span>
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

export default MyAwardApprovalsPending;
