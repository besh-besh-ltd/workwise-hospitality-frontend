/* ────────────────────────────────────────────────────────────
   ApprovalQueueCard — the one body for every "awaiting my approval"
   widget (RFQ, technical, negotiated quote, PO).
   ──────────────────────────────────────────────────────────── */
import React from "react";
import { approvalHref, approvalQueue } from "@/components/dashboard/shared/dashboardLinks";
import { formatMoney } from "@/components/dashboard/shared/format";
import PersonaCard from "./PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, Headline, ItemList, ItemLink, since, plural, rfqLabel } from "./parts";
import styles from "./PersonaCard.module.scss";

/** Title of one queue item: PO number for POs, otherwise the RFQ with the
 *  product(s) the decision covers. */
const itemTitle = (item) => {
  if (item.entity_type === "PO") {
    return item.po_number ? `PO ${item.po_number}` : rfqLabel(item);
  }
  return rfqLabel(item);
};

const itemMeta = (item) => {
  const products = item.product_names || [];
  const vendors = item.vendor_names || [];
  return [
    item.entity_type === "PO" && item.rfq_no ? `RFQ #${item.rfq_no}` : null,
    products.length ? (products.length > 1 ? `${products[0]} +${products.length - 1}` : products[0]) : null,
    vendors.length ? (vendors.length > 1 ? `${vendors[0]} +${vendors.length - 1}` : vendors[0]) : null,
    item.hotel_name || null,
    `waiting ${since(item.waiting_since)}`,
  ];
};

/**
 * Props:
 *   code         widget code (title/tooltip from the catalogue)
 *   entityType   queue type for "View all" (RFQ | TECHNICAL | NEGOTIATION_QUOTE | PO)
 *   fetcher      service function
 *   icon         Lucide icon
 *   showValue    render total_value / per-item value
 *   emptyText    empty-state copy
 */
const ApprovalQueueCard = ({ code, entityType, fetcher, icon, showValue = false, emptyText, filters }) => {
  const copy = widgetCopy(code);
  const queueHref = approvalQueue(entityType);
  return (
    <PersonaCard
      title={copy.title}
      icon={icon}
      tooltip={copy.tooltip}
      filters={filters}
      fetcher={fetcher}
      poll
      skeleton={<SkeletonRankList rows={4} />}
      isEmpty={(d) => !d || !(d.count > 0)}
      renderEmpty={() => <div className={styles.emptyState}>{emptyText}</div>}
      actions={<ViewAll href={queueHref} />}
    >
      {(data) => (
        <>
          {showValue ? (
            <div className={styles.throughputBlock}>
              <div className={styles.throughputCurrent}>
                <div className={styles.throughputLbl}>Awaiting you</div>
                <div>
                  <span className={styles.throughputNum}>{data.count ?? 0}</span>
                  <span className={styles.throughputUnit}>{plural(data.count ?? 0, "decision")}</span>
                </div>
              </div>
              <div className={styles.throughputCurrent}>
                <div className={styles.throughputLbl}>Total value</div>
                <div>
                  <span className={styles.throughputNum}>{formatMoney(data.total_value)}</span>
                </div>
              </div>
            </div>
          ) : (
            <Headline count={data.count} unit="decision" />
          )}
          <div className={styles.subline}>
            Oldest waiting:{" "}
            <span className={styles.subValue}>{since(data.oldest_waiting_since)}</span>
          </div>
          <ItemList
            items={data.items}
            count={data.count}
            moreHref={queueHref}
            render={(item) => (
              <ItemLink
                key={item.item_key || item.approval_id}
                href={approvalHref(item.entity_type || entityType, { rfqId: item.rfq_id, poId: item.po_id })}
                title={itemTitle(item)}
                meta={itemMeta(item)}
                right={showValue && item.value != null ? <span>{formatMoney(item.value)}</span> : null}
              />
            )}
          />
        </>
      )}
    </PersonaCard>
  );
};

export default ApprovalQueueCard;
