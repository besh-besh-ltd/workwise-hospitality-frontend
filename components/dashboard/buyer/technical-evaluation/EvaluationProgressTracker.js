import React from 'react';
import { Badge } from 'react-bootstrap';
import styles from './TechnicalEvaluation.module.scss';

/**
 * EvaluationProgressTracker
 *
 * Tracks submission progress: a product counts as "done" only when
 * its approval request has been sent (isPendingApproval or workflowComplete).
 * Vendor count reflects vendors from submitted products.
 */
const EvaluationProgressTracker = ({ productEvaluationStatus, clauseInfo }) => {
  if (!clauseInfo || clauseInfo.length === 0) return null;

  const productIds = clauseInfo.map(item => item.rfq_product_id);
  const totalProducts = productIds.length;

  let submittedCount = 0;
  let pendingApprovalCount = 0;
  let completedCount = 0;
  let totalVendors = 0;
  let submittedVendors = 0;

  productIds.forEach(productId => {
    const status = productEvaluationStatus.get(productId);
    if (status) {
      const isSubmitted = status.isPendingApproval || status.workflowComplete;
      if (isSubmitted) submittedCount++;
      if (status.isPendingApproval) pendingApprovalCount++;
      if (status.workflowComplete) completedCount++;
      totalVendors += status.totalVendors || 0;
      if (isSubmitted) submittedVendors += status.totalVendors || 0;
    }
  });

  const allSubmitted = submittedCount === totalProducts && totalProducts > 0;
  const progressPercentage = totalProducts > 0 ? Math.round((submittedCount / totalProducts) * 100) : 0;

  return (
    <div className={styles.progressTracker}>
      <div className={styles.progressTrackerHeader}>
        <div className={styles.progressTrackerLeft}>
          <div className={`${styles.progressTrackerIcon} ${allSubmitted ? styles.progressTrackerIconComplete : styles.progressTrackerIconProgress}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h6 className={styles.progressTrackerTitle}>Evaluation Progress</h6>
        </div>

        {allSubmitted && pendingApprovalCount === 0 && (
          <Badge bg="success" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', letterSpacing: '0.3px' }}>
            Complete
          </Badge>
        )}
        {pendingApprovalCount > 0 && (
          <Badge bg="warning" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', letterSpacing: '0.3px' }}>
            {pendingApprovalCount} Pending Approval
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div
          className={`${styles.progressBarFill} ${allSubmitted ? styles.progressBarComplete : styles.progressBarProgress}`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className={styles.progressStats}>
        <div className={styles.progressStat}>
          <div className={styles.progressStatLabel}>Products Submitted</div>
          <div className={styles.progressStatValue}>
            {submittedCount}
            <span className={styles.progressStatTotal}>/ {totalProducts}</span>
          </div>
        </div>

        <div className={styles.progressStat}>
          <div className={styles.progressStatLabel}>Vendors Submitted</div>
          <div className={styles.progressStatValue}>
            {submittedVendors}
            <span className={styles.progressStatTotal}>/ {totalVendors}</span>
          </div>
        </div>

        <div className={styles.progressStat}>
          <div className={styles.progressStatLabel}>Overall Progress</div>
          <div className={styles.progressStatValue} style={{ color: allSubmitted ? '#28a745' : '#0d6efd' }}>
            {progressPercentage}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationProgressTracker;
