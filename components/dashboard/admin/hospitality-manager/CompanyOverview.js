import React from "react";
import { HiOutlineLocationMarker, HiOutlineMail } from "react-icons/hi";
import { BsBuilding, BsPeople, BsCheckCircle } from "react-icons/bs";
import styles from "./HospitalityManager.module.css";

const CompanyOverview = ({ company, hotelCount, userCount, activeCount }) => {
  if (!company) return null;

  return (
    <div className={styles.overviewCard}>
      <h2 className={styles.companyName}>{company.name}</h2>
      <div className={styles.companyMeta}>
        {company.region && (
          <span className={styles.metaItem}>
            <HiOutlineLocationMarker className={styles.metaIcon} size={15} />
            {company.region}
          </span>
        )}
        {company.contact_email && (
          <span className={styles.metaItem}>
            <HiOutlineMail className={styles.metaIcon} size={15} />
            {company.contact_email}
          </span>
        )}
      </div>

      <div className={styles.statsRow}>
        <div className={`${styles.statCard} ${styles.statTeal}`}>
          <div className={styles.statIconWrap}>
            <BsBuilding color="#fff" size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{hotelCount}</div>
            <div className={styles.statLabel}>Business Units</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statAmber}`}>
          <div className={styles.statIconWrap}>
            <BsPeople color="#fff" size={22} />
          </div>
          <div>
            <div className={styles.statValue}>{userCount}</div>
            <div className={styles.statLabel}>Mapped Users</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statGreen}`}>
          <div className={styles.statIconWrap}>
            <BsCheckCircle color="#fff" size={22} />
          </div>
          <div>
            <div className={styles.statValue}>
              {activeCount}/{hotelCount}
            </div>
            <div className={styles.statLabel}>Active Units</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyOverview;
