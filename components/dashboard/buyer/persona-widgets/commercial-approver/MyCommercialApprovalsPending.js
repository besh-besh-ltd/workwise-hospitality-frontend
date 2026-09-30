import React from "react";
import Link from "next/link";
import { Briefcase, ArrowUpRight } from "lucide-react";
import { getMyCommercialApprovalsPending } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import { SkeletonHeadline } from "@/components/dashboard/shared";
import styles from "../PersonaCard.module.scss";

const fmtINR = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

// These rows are PENDING *PO* approval instances (dashboardModel
// getMyCommercialApprovalsPendingData: entity_type = 'PO', one row per PO).
// They used to link to /dashboard/buyer/approval, which does not exist (404).
// A PO is approved on its detail page, where the lines, rates and trail sit
// next to Approve / Reject — the same destination RfqApprovalDecisionCard's PO
// banner uses. No PO id → the RFQ workspace's purchase-order stage.
export const PO_AWAITING_HREF = "/dashboard/buyer/purchase-orders#awaiting";
export const pendingApprovalHref = (item) => {
  if (item?.po_id != null) return `/dashboard/buyer/purchase-orders/${item.po_id}`;
  if (item?.rfq_id != null) {
    return `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${item.rfq_id}&stage=purchase-order&focus=approval`;
  }
  return PO_AWAITING_HREF;
};

/** Pending commercial approvals — count, total ₹ value, and top-3 by ₹. */
const MyCommercialApprovalsPending = ({ filters }) => (
  <PersonaCard
    title="My commercial approvals pending"
    icon={Briefcase}
    tooltip="Commercial approvals awaiting your sign-off — count, total ₹ value, and the top 3 by value."
    filters={filters}
    fetcher={getMyCommercialApprovalsPending}
    skeleton={<SkeletonHeadline withSpark={false} />}
    isEmpty={(d) => !d || !(d.count > 0 || (d.top_by_value && d.top_by_value.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No commercial approvals queued — clear.
      </div>
    )}
    actions={
      <Link href={PO_AWAITING_HREF} className={styles.badge}>
        View all <ArrowUpRight size={11} />
      </Link>
    }
  >
    {(data) => (
      <>
        <div className={styles.throughputBlock}>
          <div className={styles.throughputCurrent}>
            <div className={styles.throughputLbl}>Pending count</div>
            <div>
              <span className={styles.throughputNum}>{data?.count ?? 0}</span>
              <span className={styles.throughputUnit}>
                approval{(data?.count ?? 0) === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <div className={styles.throughputCurrent}>
            <div className={styles.throughputLbl}>Total value</div>
            <div>
              <span className={styles.throughputNum}>
                ₹{fmtINR(data?.total_value)}
              </span>
            </div>
          </div>
        </div>
        {(data?.top_by_value || []).slice(0, 3).length > 0 && (
          <div className={styles.itemList}>
            {(data?.top_by_value || []).slice(0, 3).map((item) => (
              <Link
                key={item.id}
                href={pendingApprovalHref(item)}
                className={styles.item}
              >
                <div className={styles.itemMain}>
                  <div className={styles.itemTitle}>
                    {item.title || `RFQ #${item.rfq_no || item.rfq_id}`}
                  </div>
                  <div className={styles.itemMeta}>
                    <span>{item.vendor_name}</span>
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

export default MyCommercialApprovalsPending;
