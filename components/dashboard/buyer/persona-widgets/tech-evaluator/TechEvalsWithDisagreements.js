import React from "react";
import { MessageSquareWarning } from "lucide-react";
import { getTechEvalsWithDisagreements } from "@/services/dashboard";
import { techEval, rfqListView } from "@/components/dashboard/shared/dashboardLinks";
import PersonaCard from "../PersonaCard";
import { SkeletonRankList } from "@/components/dashboard/shared";
import { widgetCopy, ViewAll, Headline, ItemList, ItemLink, plural, rfqLabel } from "../parts";
import styles from "../PersonaCard.module.scss";

const copy = widgetCopy("tech_evals_with_vendor_disagreements");
// "View all" opens the RFQs where a vendor disagreed, not every evaluation.
const allEvals = rfqListView("vendor_disagreements");

/** Products on open RFQs where a vendor answered "I don't agree" to a
 *  technical clause — worth a clarification before scoring. */
const TechEvalsWithDisagreements = ({ filters }) => (
  <PersonaCard
    title={copy.title}
    icon={MessageSquareWarning}
    tooltip={copy.tooltip}
    filters={filters}
    fetcher={getTechEvalsWithDisagreements}
    poll
    skeleton={<SkeletonRankList rows={3} />}
    isEmpty={(d) => !d || !(d.count > 0)}
    renderEmpty={() => (
      <div className={styles.emptyState}>
        No vendor has disagreed with a technical clause.
      </div>
    )}
    actions={<ViewAll href={allEvals} />}
  >
    {(data) => (
      <>
        <Headline count={data.count} unit="product" />
        <div className={styles.subline}>
          Clauses disputed:{" "}
          <span className={styles.subValue}>{data.total_disagreement_clauses ?? 0}</span>
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
                `${item.disagreeing_vendor_count ?? 0} ${plural(item.disagreeing_vendor_count ?? 0, "vendor")}`,
                `${item.disagreeing_clause_count ?? 0} ${plural(item.disagreeing_clause_count ?? 0, "clause")}`,
              ]}
            />
          )}
        />
      </>
    )}
  </PersonaCard>
);

export default TechEvalsWithDisagreements;
