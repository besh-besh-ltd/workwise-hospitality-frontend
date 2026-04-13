import React from "react";
import { FiGrid, FiPlus } from "react-icons/fi";
import styles from "./Subscription.module.css";

const CategoriesPanel = ({ categories = [], onAdd }) => {
  const totalSubs = categories.reduce(
    (c, cat) => c + (cat.sub_categories?.length || 0), 0
  );

  return (
    <div className={styles.itemsSection}>
      <div className={styles.itemsSectionHeader}>
        <h3 className={styles.itemsSectionTitle}>
          Categories
          <span className={styles.itemsCount}>{categories.length}</span>
          {totalSubs > 0 && (
            <span className={styles.itemsCount}>
              {totalSubs} sub-categories
            </span>
          )}
        </h3>
        {onAdd && (
          <button className={styles.addLink} onClick={onAdd}>
            <FiPlus size={14} /> Add / Edit
          </button>
        )}
      </div>

      {categories.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>No categories subscribed.</p>
      ) : (
        <div className={styles.itemsGrid}>
          {categories.map((cat) => (
            <div key={cat.id} className={`${styles.itemCard} ${styles.itemCardCat}`}>
              <div className={styles.itemCardHeader}>
                <div className={`${styles.itemIcon} ${styles.itemIconCat}`}>
                  <FiGrid />
                </div>
                <div>
                  <p className={styles.itemName}>{cat.name}</p>
                  {cat.fee_amount > 0 && (
                    <p className={styles.itemDetail}>
                      ₹{Number(cat.fee_amount).toLocaleString("en-IN")}/yr per hotel
                    </p>
                  )}
                </div>
              </div>
              {cat.sub_categories && cat.sub_categories.length > 0 && (
                <ul className={styles.subList}>
                  {cat.sub_categories.map((sc) => (
                    <li key={sc.id} className={styles.subItem}>
                      {sc.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoriesPanel;
