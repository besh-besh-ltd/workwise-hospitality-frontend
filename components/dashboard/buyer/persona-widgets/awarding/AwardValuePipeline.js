import React from "react";
import { Wallet, CheckCircle2, Clock4 } from "lucide-react";
import { getAwardValuePipeline } from "@/services/dashboard";
import PersonaCard from "../PersonaCard";
import styles from "../PersonaCard.module.scss";

const fmtINR = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/** Award-value pipeline split:
 *   Completed: PO approved + vendor accepted (across the line).
 *   Ongoing:   PO in approval / awaiting vendor acceptance.
 */
const AwardValuePipeline = ({ filters }) => (
  <PersonaCard
    title="Award value pipeline"
    icon={Wallet}
    tooltip="₹ value of awards you've cleared — split between completed (PO approved + vendor accepted) and ongoing (in approval / awaiting vendor)."
    filters={filters}
    fetcher={getAwardValuePipeline}
    isEmpty={(d) =>
      !d || (d.completed_value == null && d.ongoing_value == null)
    }
  >
    {(data) => {
      const completed = Number(data?.completed_value) || 0;
      const ongoing = Number(data?.ongoing_value) || 0;
      const total = completed + ongoing;
      const completedPct = total > 0 ? (completed / total) * 100 : 0;
      return (
        <>
          <div className={styles.pipelineGrid}>
            <div className={styles.pipelineCell}>
              <div className={styles.pipelineCellLbl}>
                <CheckCircle2 size={11} />
                Completed
              </div>
              <div className={styles.pipelineCellNum}>₹{fmtINR(completed)}</div>
              <div className={styles.pipelineCellMeta}>
                {data?.completed_po_count ?? 0} PO{(data?.completed_po_count ?? 0) === 1 ? "" : "s"} accepted
              </div>
            </div>
            <div className={styles.pipelineCell}>
              <div className={styles.pipelineCellLbl}>
                <Clock4 size={11} />
                Ongoing
              </div>
              <div className={styles.pipelineCellNum}>₹{fmtINR(ongoing)}</div>
              <div className={styles.pipelineCellMeta}>
                {data?.ongoing_po_count ?? 0} in approval / awaiting vendor
              </div>
            </div>
          </div>
          {total > 0 && (
            <div
              style={{
                marginTop: 10,
                height: 5,
                background: "#f4f4f1",
                borderRadius: 99,
                overflow: "hidden",
              }}
              title={`${completedPct.toFixed(0)}% completed`}
            >
              <div
                style={{
                  width: `${completedPct}%`,
                  height: "100%",
                  background: "#15803d",
                  borderRadius: 99,
                  transition: "width 0.4s ease",
                }}
              />
            </div>
          )}
        </>
      );
    }}
  </PersonaCard>
);

export default AwardValuePipeline;
