import React from "react";
import { FiMapPin, FiPlus } from "react-icons/fi";
import styles from "./Subscription.module.css";

const HotelsPanel = ({ hotels = [], onAdd }) => {
  return (
    <div className={styles.itemsSection}>
      <div className={styles.itemsSectionHeader}>
        <h3 className={styles.itemsSectionTitle}>
          Business Units
          <span className={styles.itemsCount}>{hotels.length}</span>
        </h3>
        {onAdd && (
          <button className={styles.addLink} onClick={onAdd}>
            <FiPlus size={14} /> Add / Edit
          </button>
        )}
      </div>

      {hotels.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>No business units subscribed.</p>
      ) : (
        <div className={styles.itemsGrid}>
          {hotels.map((hotel) => (
            <div key={hotel.id} className={`${styles.itemCard} ${styles.itemCardHotel}`}>
              <div className={styles.itemCardHeader}>
                <div className={`${styles.itemIcon} ${styles.itemIconHotel}`}>
                  <FiMapPin />
                </div>
                <div>
                  <p className={styles.itemName}>{hotel.name}</p>
                  <p className={styles.itemDetail}>
                    {[hotel.company_name, hotel.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotelsPanel;
