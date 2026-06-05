import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight } from "lucide-react";
import { getTechEvalsWithDisagreements } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import styles from "../PersonaCard.module.scss";

/** Items where one or more vendors flagged disagree on clauses —
 *  these need extra study and shouldn't be lost in the queue. */
const TechEvalsWithDisagreements = ({ filters }) => (
  <PersonaCard
    title="Vendor-disagreement items"
    icon={AlertTriangle}
    tooltip="Tech-eval items where one or more vendors flagged disagree on clauses — extra analysis needed."
    filters={filters}
    fetcher={getTechEvalsWithDisagreements}
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0 || (d.items && d.items.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No vendor disagreements flagged right now.
      </div>
    )}
    actions={
      <Link
        href="/dashboard/buyer/technical-evaluation?filter=disagreements"
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
            item{(data?.count ?? 0) === 1 ? "" : "s"} with disagreements
          </span>
        </div>
        <div className={styles.subline}>
          Total disagreeing clauses:{" "}
          <span className={styles.subValue}>{data?.total_disagreement_clauses ?? 0}</span>
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
                    <span>
                      {item.disagreeing_vendor_count ?? 0} vendor
                      {(item.disagreeing_vendor_count ?? 0) === 1 ? "" : "s"} disagree
                    </span>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <span className={`${styles.badge} ${styles.badgeWarn}`}>
                    {item.disagreeing_clause_count ?? 0} clause
                    {(item.disagreeing_clause_count ?? 0) === 1 ? "" : "s"}
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

export default TechEvalsWithDisagreements;
