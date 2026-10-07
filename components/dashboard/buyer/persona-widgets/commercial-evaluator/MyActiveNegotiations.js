import React from "react";
import { Handshake } from "lucide-react";
import { getMyActiveNegotiations } from "@/services/dashboard";
import {
  negotiationForRfq,
  negotiationRoundApproval,
  negotiationList,
} from "@/components/dashboard/shared/dashboardLinks";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, Headline, ItemList, ItemLink, relative, rfqLabel } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("my_active_negotiations");
const allNegotiations = negotiationList({ tab: "needs_attention" });

const itemHref = (item) =>
  item.round_status === "PENDING_APPROVAL"
    ? negotiationRoundApproval(item.rfq_id)
    : negotiationForRfq(item.rfq_id);

/** Rounds this user started that are running now, or waiting for approval
 *  before they reach vendors. */
const MyActiveNegotiations = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={Handshake}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getMyActiveNegotiations}
    poll
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No negotiation rounds running.
      </div>
    )}
    actions={<ViewAll href={allNegotiations} />}
  >
    {(data) => (
      <>
        <Headline count={data.count} unit="round" />
        <div className={styles.subline}>
          Awaiting approval:{" "}
          <span className={styles.subValue}>{data.awaiting_approval_count ?? 0}</span>
          {" · "}Vendors yet to respond:{" "}
          <span className={styles.subValue}>{data.total_silent_vendors ?? 0}</span>
        </div>
        <ItemList
          items={data.items}
          count={data.count}
          moreHref={allNegotiations}
          render={(item) => (
            <ItemLink
              key={item.id}
              href={itemHref(item)}
              title={rfqLabel(item)}
              meta={[
                `Round ${item.round_number ?? "—"}`,
                item.round_status === "PENDING_APPROVAL"
                  ? "awaiting approval"
                  : `${item.silent_vendor_count ?? 0} of ${item.invited_vendor_count ?? 0} silent`,
                item.round_status === "PENDING_APPROVAL" || !item.round_end_date
                  ? null
                  : `ends ${relative(item.round_end_date)}`,
              ]}
            />
          )}
        />
      </>
    )}
  </PersonaCard>
);

export default MyActiveNegotiations;
