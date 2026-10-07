import React from "react";
import { BadgeCheck } from "lucide-react";
import moment from "moment";
import { getRecentAwards } from "@/services/dashboard";
import { poDetail, poList } from "@/components/dashboard/shared/dashboardLinks";
import { formatMoney } from "@/components/dashboard/shared/format";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, ItemList, ItemLink, plural } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("recent_awards");
const allApproved = poList({ status: "approved" });

/** POs in the user's business units whose approval completed in the period. */
const RecentAwards = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={BadgeCheck}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getRecentAwards}
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No purchase orders were approved in this period.
      </div>
    )}
    actions={<ViewAll href={allApproved} />}
  >
    {(data) => (
      <>
        <div className={styles.headlineRow}>
          <span className={styles.headlineNum}>{data.count ?? 0}</span>
          <span className={styles.headlineUnit}>
            {plural(data.count ?? 0, "PO")} · {formatMoney(data.total_value)}
          </span>
        </div>
        <ItemList
          items={data.items}
          count={data.count}
          moreHref={allApproved}
          render={(item) => (
            <ItemLink
              key={item.po_id}
              href={poDetail(item.po_id)}
              title={item.po_number ? `PO ${item.po_number}` : item.rfq_title || `RFQ #${item.rfq_no}`}
              meta={[
                item.vendor_name,
                item.approved_at ? moment(item.approved_at).format("DD MMM") : null,
                item.approved_by_me ? "approved by you" : null,
              ]}
              right={<span>{formatMoney(item.value)}</span>}
            />
          )}
        />
      </>
    )}
  </PersonaCard>
);

export default RecentAwards;
