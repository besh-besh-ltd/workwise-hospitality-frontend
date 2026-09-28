import React from "react";
import { Scale } from "lucide-react";
import { getMyQuoteCompares } from "@/services/dashboard";
import { quoteCompare, rfqListView } from "@/components/dashboard/shared/dashboardLinks";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, Headline, ItemList, ItemLink, since, plural } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("my_quote_compares");
const allReady = rfqListView("quote_compare");

/** RFQs in Commercial Evaluation: bidding closed, real quotes in, no live
 *  negotiation round. The same set as the RFQ list's facet. */
const MyQuoteCompares = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={Scale}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getMyQuoteCompares}
    poll
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No RFQs are waiting for quote comparison.
      </div>
    )}
    actions={<ViewAll href={allReady} />}
  >
    {(data) => (
      <>
        <Headline count={data.count} unit="RFQ" />
        <ItemList
          items={data.items}
          count={data.count}
          moreHref={allReady}
          render={(item) => (
            <ItemLink
              key={item.id}
              href={quoteCompare(item.id)}
              title={item.title || `RFQ #${item.rfq_no || item.id}`}
              meta={[
                `${item.vendor_count ?? 0} ${plural(item.vendor_count ?? 0, "quote")}`,
                item.bid_closed_at ? `bidding closed ${since(item.bid_closed_at)} ago` : null,
              ]}
            />
          )}
        />
      </>
    )}
  </PersonaCard>
);

export default MyQuoteCompares;
