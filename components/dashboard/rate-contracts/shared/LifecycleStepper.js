// Horizontal progress stepper across the ARC lifecycle phases. Renders at
// the top of every detail page so the user always sees where the ARC is.
// Maps tbl_arc.status to one of 6 phase buckets that match the prototype's
// progress chrome.

import styles from "./LifecycleStepper.module.scss";

const PHASES = [
  { key: "draft",        label: "Draft" },
  { key: "floated",      label: "Floated" },
  { key: "evaluation",   label: "Evaluation" },
  { key: "committee",    label: "Committee" },
  { key: "awaiting",     label: "Vendor Sign" },
  { key: "active",       label: "Active" },
];

const STATUS_TO_PHASE = {
  draft:                       "draft",
  floated:                     "floated",
  submission_closed:           "floated",
  tech_eval_in_progress:       "evaluation",
  tech_eval_approved:          "evaluation",
  tech_eval_rejected:          "evaluation",
  comm_eval_in_progress:       "evaluation",
  comm_eval_finalized:         "evaluation",
  committee_review:            "committee",
  committee_approved:          "committee",
  committee_sent_back:         "committee",
  committee_rejected:          "committee",
  contract_generated:          "awaiting",
  awaiting_vendor_acceptance:  "awaiting",
  contract_active:             "active",
  expiring_soon:               "active",
  expired:                     "active",
  terminated:                  "active",
  closed_no_award:             "active",
};

export default function LifecycleStepper({ status }) {
  const currentPhase = STATUS_TO_PHASE[status] || "draft";
  const currentIdx = PHASES.findIndex(p => p.key === currentPhase);
  return (
    <div className={styles.stepper}>
      {PHASES.map((phase, i) => {
        const isDone = i < currentIdx;
        const isCurrent = i === currentIdx;
        const cls = [
          styles.step,
          isDone ? styles.done : "",
          isCurrent ? styles.current : "",
        ].filter(Boolean).join(" ");
        return (
          <div key={phase.key} className={cls}>
            <span className={styles.dot}>{isDone ? "✓" : i + 1}</span>
            <span className={styles.label}>{phase.label}</span>
            {i < PHASES.length - 1 && <span className={styles.connector} />}
          </div>
        );
      })}
    </div>
  );
}
