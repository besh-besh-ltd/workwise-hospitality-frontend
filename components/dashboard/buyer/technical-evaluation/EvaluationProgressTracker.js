import React from 'react';
import { Badge } from 'react-bootstrap';
import styles from './TechnicalEvaluation.module.scss';

/**
 * EvaluationProgressTracker
 *
 * Tracks technical evaluation completion: a product counts as "completed" when
 * its workflow is complete (5 vendors passed & approved). "In progress" means
 * the product has an ongoing round or evaluated vendors but is not yet complete.
 */
const EvaluationProgressTracker = ({ productEvaluationStatus, clauseInfo }) => {
  if (!clauseInfo || clauseInfo.length === 0) return null;

  const productIds = clauseInfo.map(item => item.rfq_product_id);
  const totalProducts = productIds.length;

  let completedCount = 0;
  let inProgressCount = 0;

  productIds.forEach(productId => {
    const status = productEvaluationStatus.get(productId);
    if (status) {
      if (status.workflowComplete) {
        completedCount++;
      } else if (status.isPendingApproval || status.evaluatedVendorCount > 0) {
        inProgressCount++;
      }
    }
  });

  const allCompleted = completedCount === totalProducts && totalProducts > 0;
  const progressPercentage = totalProducts > 0 ? Math.round((completedCount / totalProducts) * 100) : 0;

  return (
    <div className={styles.progressTracker}>
      <div className={styles.progressTrackerHeader}>
        <div className={styles.progressTrackerLeft}>
          <div className={`${styles.progressTrackerIcon} ${allCompleted ? styles.progressTrackerIconComplete : styles.progressTrackerIconProgress}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h6 className={styles.progressTrackerTitle}>Evaluation Progress</h6>
        </div>

        {allCompleted && (
          <Badge bg="success" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', letterSpacing: '0.3px' }}>
            Complete
          </Badge>
        )}
        {!allCompleted && inProgressCount > 0 && (
          <Badge bg="warning" style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 600, borderRadius: '6px', letterSpacing: '0.3px' }}>
            {inProgressCount} In Progress
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      <div className={styles.progressBar}>
        <div
          className={`${styles.progressBarFill} ${allCompleted ? styles.progressBarComplete : styles.progressBarProgress}`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Stats */}
      <div className={styles.progressStats}>
        <div className={styles.progressStat}>
          <div className={styles.progressStatLabel}>Products Completed</div>
          <div className={styles.progressStatValue}>
            {completedCount}
            <span className={styles.progressStatTotal}>/ {totalProducts}</span>
          </div>
        </div>

        <div className={styles.progressStat}>
          <div className={styles.progressStatLabel}>Products In Progress</div>
          <div className={styles.progressStatValue}>
            {inProgressCount}
            <span className={styles.progressStatTotal}>/ {totalProducts}</span>
          </div>
        </div>

        <div className={styles.progressStat}>
          <div className={styles.progressStatLabel}>Overall Progress</div>
          <div className={styles.progressStatValue} style={{ color: allCompleted ? '#28a745' : '#0d6efd' }}>
            {progressPercentage}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationProgressTracker;
