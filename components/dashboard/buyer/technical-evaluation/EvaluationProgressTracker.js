import React from 'react';
import { Badge } from 'react-bootstrap';
import styles from './TechnicalEvaluation.module.scss';

/**
 * EvaluationProgressTracker
 *
 * Displays a progress summary showing evaluation completion status across all products
 */
const EvaluationProgressTracker = ({ productEvaluationStatus, clauseInfo }) => {
  if (!clauseInfo || clauseInfo.length === 0) return null;

  const productIds = clauseInfo.map(item => item.rfq_product_id);
  const totalProducts = productIds.length;

  let evaluatedCount = 0;
  let pendingCount = 0;
  let totalVendors = 0;
  let evaluatedVendors = 0;

  productIds.forEach(productId => {
    const status = productEvaluationStatus.get(productId);
    if (status) {
      if (status.isFullyEvaluated) evaluatedCount++;
      if (status.isPendingApproval) pendingCount++;
      totalVendors += status.totalVendors || 0;
      evaluatedVendors += status.evaluatedVendorCount || 0;
    }
  });

  const allEvaluated = evaluatedCount === totalProducts && totalProducts > 0;
  const progressPercentage = totalProducts > 0 ? Math.round((evaluatedCount / totalProducts) * 100) : 0;

  return (
    <div className={styles.progressTracker}>
      <div className={styles.progressTrackerHeader}>
        <div className={styles.progressTrackerLeft}>
          <div className={`${styles.progressTrackerIcon} ${allEvaluated ? styles.progressTrackerIconComplete : styles.progressTrackerIconProgress}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h6 className={styles.progressTrackerTitle}>Evaluation Progress</h6>
        </div>

        {allEvaluated && pendingCount === 0 && (
          <Badge bg="success" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', letterSpacing: '0.3px' }}>
            Complete
          </Badge>
        )}
        {pendingCount > 0 && (
          <Badge bg="warning" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', letterSpacing: '0.3px' }}>
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div
          className={`${styles.progressBarFill} ${allEvaluated ? styles.progressBarComplete : styles.progressBarProgress}`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className={styles.progressStats}>
        <div className={styles.progressStat}>
          <div className={styles.progressStatLabel}>Products Completed</div>
          <div className={styles.progressStatValue}>
            {evaluatedCount}
            <span className={styles.progressStatTotal}>/ {totalProducts}</span>
          </div>
        </div>

        <div className={styles.progressStat}>
          <div className={styles.progressStatLabel}>Vendors Evaluated</div>
          <div className={styles.progressStatValue}>
            {evaluatedVendors}
            <span className={styles.progressStatTotal}>/ {totalVendors}</span>
          </div>
        </div>

        <div className={styles.progressStat}>
          <div className={styles.progressStatLabel}>Overall Progress</div>
          <div className={styles.progressStatValue} style={{ color: allEvaluated ? '#28a745' : '#0d6efd' }}>
            {progressPercentage}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationProgressTracker;
