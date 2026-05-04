import React from "react";
import styles from "./ApprovalProgressCard.module.scss";

const Stat = ({ label, value, tone }) => (
  <div className={`${styles.stat} ${tone ? styles[`tone_${tone}`] : ""}`}>
    <div className={styles.statValue}>{value}</div>
    <div className={styles.statLabel}>{label}</div>
  </div>
);

const ApprovalProgressCard = ({ metrics = {} }) => {
  const total = Number(metrics.productsCount) || 0;
  const approved = Number(metrics.approvedProducts) || 0;
  const pending = Number(metrics.pendingProducts) || 0;
  const rejected = Number(metrics.rejectedProducts) || 0;
  const remaining = Math.max(total - approved - pending - rejected, 0);

  if (total === 0) return null;

  const approvedPct = total > 0 ? (approved / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;
  const approvedPctRound = Math.round(approvedPct);

  const subtitle = approved === total
    ? "All products approved — ready to proceed."
    : rejected > 0
      ? `${approved} of ${total} approved · ${rejected} need attention · ${approvedPctRound}% complete`
      : `${approved} of ${total} products approved · ${approvedPctRound}% complete`;

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <div>
          <h3 className={styles.title}>Approval Progress</h3>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
        <div className={styles.headRight}>
          <span className={styles.bigPct}>{approvedPctRound}%</span>
        </div>
      </header>

      <div
        className={styles.bar}
        role="progressbar"
        aria-valuenow={approved}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Approval progress"
      >
        <span className={styles.barApproved} style={{ width: `${approvedPct}%` }} />
        <span className={styles.barFinalized} style={{ width: `${pendingPct}%` }} />
        <span className={styles.barRejected} style={{ width: `${rejectedPct}%` }} />
      </div>

      <div className={styles.legend}>
        <span className={`${styles.dot} ${styles.dotApproved}`} /> Approved
        <span className={`${styles.dot} ${styles.dotFinalized}`} /> Finalized · awaiting approval
        <span className={`${styles.dot} ${styles.dotRejected}`} /> Rejected · needs action
        <span className={`${styles.dot} ${styles.dotRemaining}`} /> Not finalized
      </div>

      <div className={styles.statsRow}>
        <Stat label="Total products" value={total} />
        <Stat label="Approved" value={approved} tone="success" />
        <Stat label="Pending approval" value={pending} tone="warning" />
        <Stat label="Rejected" value={rejected} tone="danger" />
        <Stat label="Remaining" value={remaining} tone="muted" />
      </div>
    </section>
  );
};

export default ApprovalProgressCard;
