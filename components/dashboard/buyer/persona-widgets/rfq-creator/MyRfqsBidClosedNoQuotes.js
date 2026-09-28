import React from "react";
import { AlertTriangle } from "lucide-react";
import { getMyRfqsBidClosedNoQuotes } from "@/services/dashboard";
import { rfqDetail, rfqListView } from "@/components/dashboard/shared/dashboardLinks";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, Headline, ItemList, ItemLink, plural } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("my_rfqs_bid_closed_no_quotes");
const allClosed = rfqListView("bid_closed_no_quotes", { mine: true });

/** The user's RFQs whose bidding closed with no usable quote (regret-only
 *  counts as no quote). They need re-inviting, an extension or closure. */
const MyRfqsBidClosedNoQuotes = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={AlertTriangle}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getMyRfqsBidClosedNoQuotes}
    poll
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        None of your RFQs closed without a quote.
      </div>
    )}
    actions={<ViewAll href={allClosed} />}
  >
    {(data) => (
      <>
        <Headline count={data.count} unit="RFQ" />
        <div className={styles.subline}>Re-invite vendors, extend the deadline or close them.</div>
        <ItemList
          items={data.items}
          count={data.count}
          moreHref={allClosed}
          render={(item) => (
            <ItemLink
              key={item.id}
              href={rfqDetail(item.id)}
              title={item.title || `RFQ #${item.rfq_no || item.id}`}
              meta={[
                item.days_overdue != null ? `closed ${item.days_overdue} ${plural(item.days_overdue, "day")} ago` : null,
                item.regret_count > 0 ? `${item.regret_count} ${plural(item.regret_count, "regret")}` : null,
              ]}
            />
          )}
        />
      </>
    )}
  </PersonaCard>
);

export default MyRfqsBidClosedNoQuotes;
