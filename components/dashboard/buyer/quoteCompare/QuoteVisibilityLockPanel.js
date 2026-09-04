import React from "react";
import { BsClockHistory, BsEyeSlash, BsShieldLock } from "react-icons/bs";
import {
  formatDisplayDate,
  formatRemainingDuration,
} from "@/utils/sharedFunctions";
import styles from "./QuoteCompareRevamp.module.scss";

const QuoteVisibilityLockPanel = ({
  title = "Quotes Locked Until Deadline",
  message = "Quotes will appear after the quote submission deadline passes.",
  deadline,
  remainingMs = 0,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className={styles.quoteLockInline}>
        <span className={styles.quoteLockInlineBadge}>Locked Until Deadline</span>
        <span className={styles.quoteLockInlineText}>
          This product&apos;s quote will only be visible after the bid submission deadline passes.
        </span>
      </div>
    );
  }

  const remainingLabel = formatRemainingDuration(remainingMs);

  return (
    <div className={`${styles.quoteLockPanel} ${compact ? styles.quoteLockPanelCompact : ""}`}>
      <div className={styles.quoteLockIcon}>
        <BsEyeSlash size={compact ? 16 : 20} />
      </div>
      <div className={styles.quoteLockBody}>
        <p className={styles.quoteLockEyebrow}>View Only Until Deadline</p>
        <h4 className={styles.quoteLockTitle}>{title}</h4>
        <p className={styles.quoteLockMessage}>{message}</p>
        <div className={styles.quoteLockMetaRow}>
          <span className={styles.quoteLockMetaChip}>
            <BsShieldLock size={12} />
            Quotes hidden before deadline
          </span>
          {deadline ? (
            <span className={styles.quoteLockMetaChip}>
              <BsClockHistory size={12} />
              Deadline: {formatDisplayDate(deadline, { includeTime: true })}
            </span>
          ) : null}
          <span className={styles.quoteLockMetaChip}>
            Time remaining: {remainingLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default QuoteVisibilityLockPanel;
