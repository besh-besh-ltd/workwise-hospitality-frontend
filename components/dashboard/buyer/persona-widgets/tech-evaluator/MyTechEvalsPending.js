import React from "react";
import { ClipboardCheck } from "lucide-react";
import { getMyTechEvalsPending } from "@/services/dashboard";
import { techEval, rfqListView } from "@/components/dashboard/shared/dashboardLinks";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, Headline, ItemList, ItemLink, since, rfqLabel } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("my_tech_evals_pending");
const allEvals = rfqListView("tech_evaluation");

/** Technical evaluations that can be done now in the user's business units
 *  (a shared queue — there is no per-user assignment). Oldest first. */
const MyTechEvalsPending = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={ClipboardCheck}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getMyTechEvalsPending}
    poll
    skeleton={<SkeletonRankList rows={4} />}
    isEmpty={(d) => !d || !(d.count > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No technical evaluations waiting.
      </div>
    )}
    actions={<ViewAll href={allEvals} />}
  >
    {(data) => (
      <>
        <Headline count={data.count} unit="evaluation" />
        <div className={styles.subline}>
          Oldest waiting:{" "}
          <span className={styles.subValue}>{since(data.oldest_waiting_since)}</span>
        </div>
        <ItemList
          items={data.items}
          count={data.count}
          moreHref={allEvals}
          render={(item) => (
            <ItemLink
              key={item.id}
              href={techEval({ rfqId: item.rfq_id, rfqProductId: item.rfq_product_id })}
              title={item.product_name || rfqLabel(item)}
              meta={[
                item.rfq_no ? `RFQ #${item.rfq_no}` : null,
                `waiting ${since(item.waiting_since)}`,
              ]}
            />
          )}
        />
      </>
    )}
  </PersonaCard>
);

export default MyTechEvalsPending;
