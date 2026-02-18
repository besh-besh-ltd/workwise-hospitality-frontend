import React from "react";
import { BsPeople, BsPersonCheck, BsPersonX, BsBuilding } from "react-icons/bs";
import styles from "./ManageAccounts.module.css";

const StatsBar = ({ totalUsers, activeCount, inactiveCount, mappedCount, isHospitality }) => {
  return (
    <div className={styles.statsRow}>
      <div className={`${styles.statCard} ${styles.statTeal}`}>
        <div className={styles.statIconWrap}>
          <BsPeople />
        </div>
        <div>
          <div className={styles.statValue}>{totalUsers}</div>
          <div className={styles.statLabel}>Total Users</div>
        </div>
      </div>

      <div className={`${styles.statCard} ${styles.statGreen}`}>
        <div className={styles.statIconWrap}>
          <BsPersonCheck />
        </div>
        <div>
          <div className={styles.statValue}>{activeCount}</div>
          <div className={styles.statLabel}>Active</div>
        </div>
      </div>

      <div className={`${styles.statCard} ${styles.statRed}`}>
        <div className={styles.statIconWrap}>
          <BsPersonX />
        </div>
        <div>
          <div className={styles.statValue}>{inactiveCount}</div>
          <div className={styles.statLabel}>Inactive</div>
        </div>
      </div>

      {isHospitality && (
        <div className={`${styles.statCard} ${styles.statIndigo}`}>
          <div className={styles.statIconWrap}>
            <BsBuilding />
          </div>
          <div>
            <div className={styles.statValue}>{mappedCount}</div>
            <div className={styles.statLabel}>Mapped</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsBar;
