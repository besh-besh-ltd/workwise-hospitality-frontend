import React from "react";
import styles from "./RoundRemarks.module.scss";

// Internal note the round creator left for approvers and the team (REQ-0026).
// Plain text only: React escapes it, and `white-space: pre-wrap` keeps the
// creator's line breaks. Never shown to vendors (the API strips it for them).
export default function RoundRemarks({ remarks, creatorName }) {
  const text = typeof remarks === "string" ? remarks.trim() : "";
  if (!text) return null;
  return (
    <section className={styles.callout} data-testid="round-remarks">
      <h4 className={styles.heading}>
        Creator&apos;s remarks
        {creatorName ? <span className={styles.by}> — {creatorName}</span> : null}
      </h4>
      <p className={styles.body}>{text}</p>
    </section>
  );
}
