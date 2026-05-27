import React from "react";
import Link from "next/link";
import { TrendingUp, ArrowUpRight } from "lucide-react";
import { getDealsWithPriceAnomalies } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import styles from "../PersonaCard.module.scss";

const fmtINR = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/** Approvals where awarded unit-price is meaningfully above the last
 *  purchase of the same product. No budget data needed — uses purchase
 *  history. */
const DealsWithPriceAnomalies = ({ filters }) => (
  <PersonaCard
    title="Price-anomaly approvals"
    icon={TrendingUp}
    tooltip="Approvals where the awarded unit-price is significantly higher than the last time we bought the same product."
    filters={filters}
    fetcher={getDealsWithPriceAnomalies}
    isEmpty={(d) => !d || !(d.count > 0 || (d.items && d.items.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No price anomalies in your queue — prices look in line.
      </div>
    )}
    actions={
      <Link href="/dashboard/buyer/approval?filter=price_anomalies" className={styles.badge}>
        View all <ArrowUpRight size={11} />
      </Link>
    }
  >
    {(data) => (
      <>
        <div className={styles.headlineRow}>
          <span className={styles.headlineNum}>{data?.count ?? 0}</span>
          <span className={styles.headlineUnit}>
            item{(data?.count ?? 0) === 1 ? "" : "s"} with price drift
          </span>
        </div>
        {(data?.items || []).slice(0, 5).length > 0 && (
          <div className={styles.itemList}>
            {(data?.items || []).slice(0, 5).map((item) => {
              const pct = Number(item.drift_pct) || 0;
              const driftClass =
                pct >= 25
                  ? `${styles.badge} ${styles.badgeDanger}`
                  : `${styles.badge} ${styles.badgeWarn}`;
              return (
                <Link
                  key={item.id}
                  href={`/dashboard/buyer/approval?id=${item.id}`}
                  className={styles.item}
                >
                  <div className={styles.itemMain}>
                    <div className={styles.itemTitle}>{item.product_name}</div>
                    <div className={styles.itemMeta}>
                      <span>Awarded ₹{fmtINR(item.awarded_unit_price)}</span>
                      <span>Last paid ₹{fmtINR(item.last_paid_unit_price)}</span>
                    </div>
                  </div>
                  <div className={styles.itemRight}>
                    <span className={driftClass}>+{pct.toFixed(0)}%</span>
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

export default DealsWithPriceAnomalies;
