import React from "react";
import { HiOutlineLocationMarker, HiOutlineMail } from "react-icons/hi";
import { BsBuilding, BsPeople, BsCheckCircle, BsPencil } from "react-icons/bs";
import styles from "./HospitalityManager.module.css";

const CompanyOverview = ({ company, hotelCount, userCount, activeCount, onEdit }) => {
  if (!company) return null;

  return (
    <div className={styles.overviewCard}>
      <div className={styles.companyHeadRow}>
        <h2 className={styles.companyName}>{company.name}</h2>
        {/* There was no edit at all: a company created with a typo in its GST
            or bank details could only be corrected by asking Workwise. */}
        {onEdit && (
          <button type="button" className={styles.editCompanyBtn} onClick={() => onEdit(company)}>
            <BsPencil size={12} />
            Edit company
          </button>
        )}
      </div>
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
            <BsBuilding size={17} />
          </div>
          <div>
            <div className={styles.statValue}>{hotelCount}</div>
            <div className={styles.statLabel}>Business Units</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statAmber}`}>
          <div className={styles.statIconWrap}>
            <BsPeople size={17} />
          </div>
          <div>
            <div className={styles.statValue}>{userCount}</div>
            <div className={styles.statLabel}>Mapped Users</div>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statGreen}`}>
          <div className={styles.statIconWrap}>
            <BsCheckCircle size={17} />
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
