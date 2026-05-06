import React from "react";
import moment from "moment";
import styles from "./ArcCommittee.module.scss";

// Canonical stage list every tender / RFQ goes through. We render
// each stage from this list and look up its actual state in the
// lifecycle data. Stages that didn't run for this tender (e.g. Tech
// Eval skipped because the chosen process didn't include it) are
// labelled "not configured for this tender" — explicit, not the
// confusing "Completed · Not started" mix the previous timeline showed.
const TENDER_STAGE_PIPELINE = [
  { key: "submitted", label: "Submitted for Approval" },
  { key: "published", label: "Published" },
  { key: "quotes", label: "Quotes Received" },
  { key: "tech_eval", label: "Technical Evaluation", optional: true },
  { key: "negotiation", label: "Negotiation Rounds", optional: true },
  { key: "finalization", label: "Quote Finalization" },
  { key: "arc", label: "ARC Committee Review" },
];

const STATE = { DONE: "done", CURRENT: "current", PENDING: "pending", SKIPPED: "skipped" };

const dotClass = (state) => ({
  [STATE.DONE]: styles.dotDone,
  [STATE.CURRENT]: styles.dotCurrent,
  [STATE.PENDING]: styles.dotPending,
  [STATE.SKIPPED]: styles.dotSkipped,
}[state]);
const stateLabel = (state) => ({
  [STATE.DONE]: "Done",
  [STATE.CURRENT]: "In progress",
  [STATE.PENDING]: "Pending",
  [STATE.SKIPPED]: "Skipped",
}[state]);
const stateClass = (state) => ({
  [STATE.DONE]: styles.stateDone,
  [STATE.CURRENT]: styles.stateCurrent,
  [STATE.PENDING]: styles.statePending,
  [STATE.SKIPPED]: styles.stateSkipped,
}[state]);

/**
 * Lifecycle accordion — collapsed by default. Audits the tender's
 * actual journey, with skipped stages clearly distinct from completed
 * ones. The page is decision-first; this section is for the rare CXO
 * who wants to verify the trail before signing off.
 */
const LifecycleAccordion = ({ stages = [], rfq }) => {
  // Normalise the per-stage state. The orchestrator (index.js) already
  // maps lifecycle data into a `stages` array of { key, state, performed_by_name, performed_at }.
  // We render the canonical pipeline order and look up each stage's
  // actual state — anything missing from `stages` for an optional
  // stage = SKIPPED, missing for a required stage = PENDING.
  const stageMap = new Map(stages.map((s) => [s.key, s]));

  return (
    <details className={styles.card}>
      <summary className={styles.cardBody}>
        <span className={styles.lifecycleSummary}>
          Tender lifecycle &amp; supporting context
          <span className={styles.lifecycleSummarySub}>
            scope · timeline · iteration history
          </span>
        </span>
      </summary>
      <div className={styles.cardBody} style={{ paddingTop: 0 }}>
        <div className={styles.timeline}>
          {TENDER_STAGE_PIPELINE.map(({ key, label, optional }) => {
            const found = stageMap.get(key) || {};
            const state = found.state || (optional ? STATE.SKIPPED : STATE.PENDING);
            const performer = found.performed_by_name;
            const at = found.performed_at;
            return (
              <div key={key} className={styles.timelineItem}>
                <span className={`${styles.timelineDot} ${dotClass(state)}`} />
                <div>
                  <div
                    className={
                      state === STATE.SKIPPED
                        ? `${styles.timelineLabel} ${styles.timelineLabelSkipped}`
                        : styles.timelineLabel
                    }
                  >
                    {label}
                  </div>
                  <div className={styles.timelineMeta}>
                    {state === STATE.SKIPPED && (
                      <em>Not configured for this tender</em>
                    )}
                    {state === STATE.DONE && performer && (
                      <>
                        {performer}
                        {at && ` · ${moment(at).format("DD MMM YYYY · hh:mm A")}`}
                      </>
                    )}
                    {state === STATE.CURRENT && (
                      <>Active stage — your decision is required</>
                    )}
                    {state === STATE.PENDING && <>Awaiting earlier stages</>}
                  </div>
                </div>
                <span className={`${styles.timelineState} ${stateClass(state)}`}>
                  {stateLabel(state)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
};

export default LifecycleAccordion;
