import React from "react";
import { FilePlus } from "lucide-react";
import { getMyDrafts } from "@/services/dashboard";
import { resumeDraft, rfqList } from "@/components/dashboard/shared/dashboardLinks";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, Headline, ItemList, ItemLink, relative, plural } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("my_drafts");
const allDrafts = rfqList({ tab: "drafts", mine: true });

/** RFQs the user started but hasn't published yet. Queue — undated. */
const MyDrafts = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={FilePlus}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getMyDrafts}
    poll
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No drafts open — looks like you've shipped everything.
      </div>
    )}
    actions={<ViewAll href={allDrafts} />}
  >
    {(data) => (
      <>
        <Headline count={data.count} unit="draft" />
        <div className={styles.subline}>
          Oldest started:{" "}
          <span className={styles.subValue}>{relative(data.oldest_created_at)}</span>
        </div>
        <ItemList
          items={data.items}
          count={data.count}
          moreHref={allDrafts}
          render={(item) => (
            <ItemLink
              key={item.id}
              href={resumeDraft(item.id)}
              title={item.title || `Draft #${item.rfq_no || item.id}`}
              meta={[
                `${item.product_count ?? 0} ${plural(item.product_count ?? 0, "product")}`,
                `started ${relative(item.created_at)}`,
              ]}
            />
          )}
        />
      </>
    )}
  </PersonaCard>
);

export default MyDrafts;
