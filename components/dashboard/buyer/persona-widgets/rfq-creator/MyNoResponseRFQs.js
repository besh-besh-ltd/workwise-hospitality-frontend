import React from "react";
import { BellOff } from "lucide-react";
import { getMyNoResponseRfqs } from "@/services/dashboard";
import { rfqDetail, rfqListView } from "@/components/dashboard/shared/dashboardLinks";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, Headline, ItemList, ItemLink, relative, plural } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("my_no_response_rfqs");
const allOpen = rfqListView("no_response", { mine: true });

/** The user's RFQs still open for bidding where some invited vendors have not
 *  responded (a regret counts as a response). Closing soonest first. */
const MyNoResponseRFQs = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={BellOff}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getMyNoResponseRfqs}
    poll
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        Every invited vendor has responded to your open RFQs.
      </div>
    )}
    actions={<ViewAll href={allOpen} />}
  >
    {(data) => (
      <>
        <Headline count={data.count} unit="RFQ" />
        <div className={styles.subline}>
          Vendors yet to respond:{" "}
          <span className={styles.subValue}>{data.silent_vendor_count ?? 0}</span>
        </div>
        <ItemList
          items={data.items}
          count={data.count}
          moreHref={allOpen}
          render={(item) => (
            <ItemLink
              key={item.id}
              href={rfqDetail(item.id)}
              title={item.title || `RFQ #${item.rfq_no || item.id}`}
              meta={[
                `${item.silent_vendor_count ?? 0} of ${item.total_vendor_count ?? 0} ${plural(item.total_vendor_count ?? 0, "vendor")} silent`,
                item.bid_end_date ? `closes ${relative(item.bid_end_date)}` : null,
              ]}
            />
          )}
        />
      </>
    )}
  </PersonaCard>
);

export default MyNoResponseRFQs;
