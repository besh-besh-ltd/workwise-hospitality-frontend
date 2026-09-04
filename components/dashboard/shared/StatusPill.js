import React from "react";
import styles from "./DashboardSurface.module.scss";

const VARIANT_CLASS = {
  draft: styles.spDraft,
  floated: styles.spFloated,
  closed: styles.spClosed,
  eval: styles.spEval,
  committee: styles.spCommittee,
  awaiting: styles.spAwaiting,
  active: styles.spActive,
  expiring: styles.spExpiring,
  expired: styles.spExpired,
  rejected: styles.spRejected,
  info: styles.spInfo,
  success: styles.spSuccess,
  warn: styles.spWarn,
};

const StatusPill = ({ variant = "info", children, showDot = true }) => (
  <span className={`${styles.statusPill} ${VARIANT_CLASS[variant] || ""}`}>
    {showDot && <span className={styles.dot} />}
    <span>{children}</span>
  </span>
);

export default StatusPill;
