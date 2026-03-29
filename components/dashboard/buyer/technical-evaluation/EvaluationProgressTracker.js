import React, { useEffect, useState } from 'react';
import { getTechEvalDashboard } from '@/services/rfq';
import { BsCheckCircleFill, BsArrowRepeat, BsPersonCheckFill, BsPersonXFill } from 'react-icons/bs';
import styles from './TechnicalEvaluation.module.scss';

const EvaluationProgressTracker = ({ rfqId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rfqId) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getTechEvalDashboard(rfqId)
      .then((res) => {
        setData(res?.data?.data || res?.data || null);
      })
      .catch((err) => {
        console.error('Failed to fetch tech eval dashboard:', err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [rfqId]);

  if (loading) {
    return (
      <div className={styles.dashboardGrid}>
        {[1, 2, 3, 4].map(i => (
          <div className={`${styles.dashboardCard} ${styles.dashboardCardLoading}`} key={i}>
            <div className={styles.dashboardCardShimmer} />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const cards = [
    {
      label: 'Products Completed',
      value: data.products_completed ?? 0,
      total: data.total_products ?? null,
      icon: <BsCheckCircleFill size={20} />,
      colorClass: styles.dashboardCardCompleted,
    },
    {
      label: 'Products In Progress',
      value: data.products_in_progress ?? 0,
      total: data.total_products ?? null,
      icon: <BsArrowRepeat size={20} />,
      colorClass: styles.dashboardCardInProgress,
    },
    {
      label: 'Vendors Passed',
      value: data.vendors_passed ?? 0,
      icon: <BsPersonCheckFill size={20} />,
      colorClass: styles.dashboardCardPassed,
    },
    {
      label: 'Vendors Failed',
      value: data.vendors_failed ?? 0,
      icon: <BsPersonXFill size={20} />,
      colorClass: styles.dashboardCardFailed,
    },
  ];

  return (
    <div className={styles.dashboardGrid}>
      {cards.map((card, idx) => (
        <div className={`${styles.dashboardCard} ${card.colorClass}`} key={idx}>
          <div className={styles.dashboardCardIcon}>{card.icon}</div>
          <div className={styles.dashboardCardContent}>
            <span className={styles.dashboardCardValue}>
              {card.value}
              {card.total != null && (
                <span className={styles.dashboardCardTotal}>/ {card.total}</span>
              )}
            </span>
            <span className={styles.dashboardCardLabel}>{card.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default EvaluationProgressTracker;
