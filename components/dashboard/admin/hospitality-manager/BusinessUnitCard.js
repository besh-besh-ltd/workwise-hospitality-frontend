import React from "react";
import { HiOutlineLocationMarker } from "react-icons/hi";
import { BsPeople, BsPencil, BsDiagram3, BsEnvelope } from "react-icons/bs";
import { BiRupee } from "react-icons/bi";
import styles from "./HospitalityManager.module.css";

const getStatusStyle = (status) => {
  if (status === "Active") return { badge: styles.statusActive, dot: styles.dotActive };
  if (status === "Pending Payment" || status === "In Review") return { badge: styles.statusPending, dot: styles.dotPending };
  return { badge: styles.statusDefault, dot: styles.dotDefault };
};

const getPaymentStyle = (paymentStatus) => {
  if (!paymentStatus || paymentStatus.toLowerCase() === "n/a") return styles.paymentOnboarding;
  if (paymentStatus === "active") return styles.paymentPaid;
  if (paymentStatus === "pending") return styles.paymentPending;
  return styles.paymentOnboarding;
};

const getPaymentLabel = (hotel) => {
  const status = hotel.payment_status;
  if (!status || status.toLowerCase() === "n/a") return "N/A";
  if (status === "active") return "Paid";
  if (status === "pending") return "Pending";
  return hotel.email ? "Onboarding" : "No Email";
};

const BusinessUnitCard = ({ hotel, userCount, onEdit, onSetHierarchy, onSendCredentials, isSendingCredentials }) => {
  const statusStyle = getStatusStyle(hotel.status);
  const location = [hotel.city, hotel.state].filter(Boolean).join(", ");
  const feeValue = hotel.fee_amount > 0 ? hotel.fee_amount : "N/A";

  return (
    <div className={styles.buCard}>
      <div className={styles.buCardHeader}>
        <div className={styles.buTitleBlock}>
          <h4 className={styles.buName}>{hotel.name}</h4>
          <div className={styles.buLocation}>
            <HiOutlineLocationMarker size={14} />
            <span>{location || "Location not set"}</span>
          </div>
        </div>
        <span className={`${styles.statusBadge} ${statusStyle.badge}`}>
          <span className={`${styles.statusDot} ${statusStyle.dot}`} />
          {hotel.status}
        </span>
      </div>

      <div className={styles.buMetaGrid}>
        <div className={styles.buMetaItem}>
          <span className={styles.buMetaLabel}>Users</span>
          <span className={styles.buMetaValue}>
            <BsPeople size={14} />
            {userCount} user{userCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className={styles.buMetaItem}>
          <span className={styles.buMetaLabel}>Payment</span>
          {hotel.fee_amount > 0 ? (
            <span className={`${styles.paymentBadge} ${getPaymentStyle(hotel.payment_status)}`}>
              {getPaymentLabel(hotel)}
            </span>
          ) : (
            <span className={styles.buMetaValue}>N/A</span>
          )}
        </div>
        <div className={styles.buMetaItem}>
          <span className={styles.buMetaLabel}>Onboarding Fee</span>
          <span className={styles.buMetaValue}>
            <BiRupee size={14} />
            {feeValue}
          </span>
        </div>
      </div>

      <div className={styles.buCardActions}>
        <button type="button" className={styles.buActionBtn} onClick={() => onEdit(hotel)}>
          <BsPencil size={13} />
          Edit
        </button>
        <button
          type="button"
          className={`${styles.buActionBtn} ${styles.buActionPrimary}`}
          onClick={() => onSetHierarchy(hotel)}
        >
          <BsDiagram3 size={13} />
          Set Hierarchy
        </button>
      </div>
      <button
        type="button"
        className={`${styles.buActionBtn} ${styles.buActionSuccessFull}`}
        onClick={() => onSendCredentials(hotel)}
        disabled={isSendingCredentials}
      >
        <BsEnvelope size={13} />
        {isSendingCredentials ? "Sending..." : "Send Credentials"}
      </button>
    </div>
  );
};

export default BusinessUnitCard;
