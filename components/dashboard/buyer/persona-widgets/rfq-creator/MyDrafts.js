import React from "react";
import Link from "next/link";
import { FilePlus, ArrowUpRight } from "lucide-react";
import moment from "moment";
import { getMyDrafts } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import styles from "../PersonaCard.module.scss";

/** RFQs the user started but hasn't published yet — sorted by most recently edited. */
const MyDrafts = ({ filters }) => (
  <PersonaCard
    title="My drafts"
    icon={FilePlus}
    tooltip="RFQs you started but haven't published. Resume editing or publish."
    filters={filters}
    fetcher={getMyDrafts}
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0 || (d.items && d.items.length > 0))}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No drafts open — looks like you've shipped everything.
      </div>
    )}
    actions={
      <Link
        href="/dashboard/buyer/rfq-management?status=draft"
        className={styles.badge}
        title="See all drafts"
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
            draft{(data?.count ?? 0) === 1 ? "" : "s"}
          </span>
        </div>
        <div className={styles.subline}>
          Oldest:{" "}
          <span className={styles.subValue}>
            {data?.oldest_updated_at
              ? moment(data.oldest_updated_at).fromNow()
              : "—"}
          </span>
        </div>
        {(data?.items || []).slice(0, 5).length > 0 && (
          <div className={styles.itemList}>
            {(data?.items || []).slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/dashboard/buyer/rfq-management?id=${item.id}`}
                className={styles.item}
              >
                <div className={styles.itemMain}>
                  <div className={styles.itemTitle}>
                    {item.title || `Draft #${item.rfq_no || item.id}`}
                  </div>
                  <div className={styles.itemMeta}>
                    <span>{item.product_count ?? 0} products</span>
                    <span>{moment(item.updated_at).fromNow()}</span>
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

export default MyDrafts;
