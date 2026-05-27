import React from "react";
import Link from "next/link";
import { Briefcase, ArrowUpRight } from "lucide-react";
import { getMyCommercialApprovalsPending } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import styles from "../PersonaCard.module.scss";

const fmtINR = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/** Pending commercial approvals — count, total ₹ value, and top-3 by ₹. */
const MyCommercialApprovalsPending = ({ filters }) => (
  <PersonaCard
    title="My commercial approvals pending"
    icon={Briefcase}
    tooltip="Commercial approvals awaiting your sign-off — count, total ₹ value, and the top 3 by value."
    filters={filters}
    fetcher={getMyCommercialApprovalsPending}
    isEmpty={(d) => !d || !(d.count > 0 || (d.top_by_value && d.top_by_value.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No commercial approvals queued — clear.
      </div>
    )}
    actions={
      <Link href="/dashboard/buyer/approval?type=commercial" className={styles.badge}>
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
                href={`/dashboard/buyer/approval?id=${item.id}`}
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
