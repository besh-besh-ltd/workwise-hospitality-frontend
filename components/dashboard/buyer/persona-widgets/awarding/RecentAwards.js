import React from "react";
import Link from "next/link";
import { History, ArrowUpRight, FileCheck } from "lucide-react";
import moment from "moment";
import { getRecentAwards } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import styles from "../PersonaCard.module.scss";

const fmtINR = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/** Recently cleared awards, with links to the resulting POs. */
const RecentAwards = ({ filters }) => (
  <PersonaCard
    title="Recent awards"
    icon={History}
    tooltip="What you've cleared recently, with links to the generated POs."
    filters={filters}
    fetcher={getRecentAwards}
    isEmpty={(d) => !d || !(d.items && d.items.length > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No recent awards in this period.
      </div>
    )}
  >
    {(data) => (
      <>
        <div className={styles.headlineRow}>
          <span className={styles.headlineNum}>{data?.items?.length ?? 0}</span>
          <span className={styles.headlineUnit}>recent award{(data?.items?.length ?? 0) === 1 ? "" : "s"}</span>
        </div>
        <div className={styles.subline}>
          Total cleared:{" "}
          <span className={styles.subValue}>₹{fmtINR(data?.total_value)}</span>
        </div>
        <div className={styles.itemList}>
          {(data?.items || []).slice(0, 5).map((item) => (
            <div key={item.id} className={styles.item} style={{ cursor: "default" }}>
              <div className={styles.itemMain}>
                <div className={styles.itemTitle}>
                  {item.title || `RFQ #${item.rfq_no || item.rfq_id}`}
                </div>
                <div className={styles.itemMeta}>
                  <span>{item.vendor_name}</span>
                  <span>{moment(item.awarded_at).fromNow()}</span>
                </div>
              </div>
              <div className={styles.itemRight}>
                <span>₹{fmtINR(item.value)}</span>
                {item.po_id ? (
                  <Link
                    href={`/dashboard/buyer/purchase-order?id=${item.po_id}`}
                    className={`${styles.badge} ${styles.badgeSuccess}`}
                    title="View PO"
                  >
                    <FileCheck size={11} />
                    PO
                  </Link>
                ) : (
                  <span className={`${styles.badge} ${styles.badgeWarn}`}>No PO</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    )}
  </PersonaCard>
);

export default RecentAwards;
