import React from "react";
import { HiPlus } from "react-icons/hi";
import { BsBuilding, BsEnvelope } from "react-icons/bs";
import BusinessUnitCard from "./BusinessUnitCard";
import EmptyState from "./EmptyState";
import styles from "./HospitalityManager.module.css";

const BusinessUnitsTab = ({
  hotels,
  getHotelUserCount,
  onAddHotel,
  onEditHotel,
  onSetHierarchy,
  onSendPayment,
  isLoading,
  hasPendingPayments,
}) => {
  if (isLoading) {
    return (
      <div className={styles.loadingWrap}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (hotels.length === 0) {
    return (
      <EmptyState
        icon={<BsBuilding size={36} />}
        title="No business units yet"
        description="Add your first business unit to start mapping teams, projects and approval hierarchies."
        buttonText="+ Add First Business Unit"
        onButtonClick={onAddHotel}
      />
    );
  }

  return (
    <>
      <div className={styles.tabContentHeader}>
        <h3 className={styles.tabContentTitle}>
          {hotels.length} Business Unit{hotels.length !== 1 ? "s" : ""}
        </h3>
        <div className={styles.tabHeaderActions}>
          {hasPendingPayments && (
            <button type="button" className={styles.successBtn} onClick={onSendPayment}>
              <BsEnvelope size={14} />
              Send Payment Links
            </button>
          )}
          <button type="button" className={styles.primaryBtn} onClick={onAddHotel}>
            <HiPlus size={15} />
            Add Business Unit
          </button>
        </div>
      </div>

      <div className={styles.buGrid}>
        {hotels.map((hotel) => (
          <BusinessUnitCard
            key={hotel.id}
            hotel={hotel}
            userCount={getHotelUserCount(hotel.id)}
            onEdit={onEditHotel}
            onSetHierarchy={onSetHierarchy}
          />
        ))}
        <div className={styles.addBuCard} onClick={onAddHotel} role="button" tabIndex={0}>
          <div className={styles.addBuIcon}>
            <HiPlus size={24} />
          </div>
          <span className={styles.addBuText}>Add Business Unit</span>
          <span className={styles.addBuSubtext}>Create a new business unit</span>
        </div>
      </div>
    </>
  );
};

export default BusinessUnitsTab;
