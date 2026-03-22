import React from "react";
import { BsPeople, BsPersonCheck, BsPersonX, BsBuilding } from "react-icons/bs";
import styles from "./ManageAccounts.module.scss";

const StatCardContent = ({ value, label, isLoading }) => (
  <div>
    {isLoading ? (
      <>
        <div className={`${styles.skeletonPulse} ${styles.statValueSkeleton}`} />
        <div className={`${styles.skeletonPulse} ${styles.statLabelSkeleton}`} />
      </>
    ) : (
      <>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </>
    )}
  </div>
);

const StatsBar = ({ totalUsers, activeCount, inactiveCount, mappedCount, isHospitality, isLoading }) => {
  // Always show 4 cards during initial load to prevent layout shift
  const showMappedCard = isHospitality || isLoading;

  return (
    <div className={styles.statsRow}>
      <div className={`${styles.statCard} ${styles.statTeal}`}>
        <div className={styles.statIconWrap}>
          <BsPeople />
        </div>
        <StatCardContent value={totalUsers} label="Total Users" isLoading={isLoading} />
      </div>

      <div className={`${styles.statCard} ${styles.statGreen}`}>
        <div className={styles.statIconWrap}>
          <BsPersonCheck />
        </div>
        <StatCardContent value={activeCount} label="Active" isLoading={isLoading} />
      </div>

      <div className={`${styles.statCard} ${styles.statRed}`}>
        <div className={styles.statIconWrap}>
          <BsPersonX />
        </div>
        <StatCardContent value={inactiveCount} label="Inactive" isLoading={isLoading} />
      </div>

      {showMappedCard && (
        <div className={`${styles.statCard} ${styles.statIndigo}`}>
          <div className={styles.statIconWrap}>
            <BsBuilding />
          </div>
          <StatCardContent value={mappedCount} label="Mapped" isLoading={isLoading} />
        </div>
      )}
    </div>
  );
};

export default StatsBar;
