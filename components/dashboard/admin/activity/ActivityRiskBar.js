"use client";
import React from "react";
import InfoTip from "@/components/shared/InfoTip";
import { SEVERITY_META, SEVERITY_ORDER } from "./activityPresentation";
import styles from "./Activity.module.css";

/**
 * The answer to "is anything wrong?", before the feed is read.
 *
 * An admin opens this screen distractedly and wants one thing: whether
 * anything here needs them. A list — however well ordered — makes them read to
 * find out. Three counts do not.
 *
 * The counts are company-wide over the last 30 days, deliberately not derived
 * from the rows on screen: a number computed from the current page is a count
 * of the page, which is not a question anybody asks. And "3 critical" means
 * nothing without a period, so the period is stated.
 *
 * Each count is also the filter for its own class. That is one job, not two —
 * the number is an attribute of the button ("show me these, there are three"),
 * the same way an inbox folder carries its unread count.
 */
const ActivityRiskBar = ({ severities = [], active, onSelect }) => {
  const counts = Object.fromEntries(
    (severities || []).map((s) => [s.severity, s.count])
  );

  return (
    <div className={styles.riskBar} role="group" aria-label="Filter by importance">
      <span className={styles.riskPeriod}>
        Last 30 days
        <InfoTip
          label="What these counts cover"
          text="Everything recorded across all your business units in the last 30 days — not just what is on screen. Select a level to show only those entries; select it again to clear."
          size={11}
        />
      </span>

      {SEVERITY_ORDER.map((key) => {
        const meta = SEVERITY_META[key];
        const count = counts[key] ?? 0;
        const on = active === key;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            className={`${styles.riskTile} ${styles[`risk_${key}`]} ${on ? styles.riskTileOn : ""}`}
            onClick={() => onSelect(on ? undefined : key)}
          >
            <span className={styles.riskCount}>{count.toLocaleString()}</span>
            <span className={styles.riskLabel}>{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ActivityRiskBar;
