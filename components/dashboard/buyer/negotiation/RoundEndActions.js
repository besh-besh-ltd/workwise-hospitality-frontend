import React, { useMemo } from 'react';
import moment from 'moment';
import styles from './NegotiationUI.module.scss';

const RoundEndActions = ({
  activeRound,
  roundQuotes = [],
  quoteApprovalStatus = null,
}) => {
  // Check if round has been rejected via approvals
  const isRoundRejected = activeRound?.approvals?.some(a => a.status === 'REJECTED');

  // Check if round has ended — cron sets status to ENDED/CLOSED automatically
  const isRoundEnded = activeRound && !isRoundRejected && (
    activeRound.status === 'CLOSED' ||
    activeRound.status === 'ENDED' ||
    activeRound.status === 'COMPLETED'
  );

  // Don't show banner for rejected rounds or if no round/quotes
  if (!activeRound || !isRoundEnded || roundQuotes.length === 0 || isRoundRejected) {
    return null;
  }

  // Check quote approval status for tenders
  const isApprovalPending = quoteApprovalStatus?.has_pending_approval === true;
  const isApprovalApproved = quoteApprovalStatus?.approval_instance?.status === 'APPROVED';
  const hasApprovalInProgress = isApprovalPending || isApprovalApproved;

  // Don't render the "Round Ended" banner if quotes are already approved for ARC
  if (isApprovalApproved) {
    return null;
  }

  const endedAt = activeRound.closed_at || activeRound.end_date;
  const endedLabel = endedAt
    ? moment.utc(endedAt).local().format('DD/MM/YYYY, hh:mm A')
    : null;

  const bannerClass = isApprovalPending
    ? `${styles.roundEndBanner} ${styles.roundEndBannerApproval}`
    : styles.roundEndBanner;

  return (
    <div className="my-3">
      <div className={bannerClass}>
        <div className={styles.roundEndBody}>
          <p className={styles.roundEndTitle}>
            <span className={styles.roundEndRoundBadge}>
              Round {activeRound.round_number}
            </span>
            Negotiation Round Ended
          </p>

          <div className={styles.roundEndStats}>
            <span className={`${styles.statChip} ${styles.statChipHighlight}`}>
              {roundQuotes.length} Quote{roundQuotes.length !== 1 ? 's' : ''} Received
            </span>
            {endedLabel && (
              <span className={styles.statChip}>
                Ended {endedLabel}
              </span>
            )}
            {hasApprovalInProgress && (
              <span className={`${styles.statChip} ${styles.statChipDanger}`}>
                Approval Pending
              </span>
            )}
          </div>

          {isApprovalPending ? (
            <p className={styles.roundEndSub}>
              <span className={styles.roundEndApprovalNote}>Quotes are being approved</span>
              {' — actions are locked until the approval flow completes.'}
            </p>
          ) : (
            <p className={styles.roundEndSub}>
              You may create another round from the Negotiation Desk or finalize a vendor from the table below.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoundEndActions;
