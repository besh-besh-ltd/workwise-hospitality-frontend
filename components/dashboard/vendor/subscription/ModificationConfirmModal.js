import React from "react";
import { FiAlertTriangle } from "react-icons/fi";
import styles from "./Subscription.module.css";

const ModificationConfirmModal = ({ preview, onConfirm, onCancel, loading }) => {
  if (!preview) return null;

  const { diff, pricing, shared_end_date, warnings } = preview;
  const hasRemovals =
    (diff?.removed_categories?.length || 0) +
    (diff?.removed_hotels?.length || 0) > 0;
  const isFree = pricing?.net_cost === 0;

  return (
    <div className={styles.confirmOverlay}>
      <div className={styles.confirmModal}>
        <h3 className={styles.confirmTitle}>Confirm Subscription Changes</h3>

        <p style={{ fontSize: "13px", color: "#64748b", textAlign: "center", margin: "0 0 16px" }}>
          You&apos;re about to make the following changes:
        </p>

        {/* Added items */}
        {(diff?.added_categories?.length > 0 || diff?.added_subcategories?.length > 0 || diff?.added_hotels?.length > 0) && (
          <div className={styles.confirmSection}>
            {diff.added_categories.map((c) => (
              <div key={`ac-${c.id}`} className={`${styles.confirmItem} ${styles.confirmItemAdd}`}>
                + Add {c.name}
                {c.fee_amount > 0 && ` (₹${Number(c.fee_amount).toLocaleString("en-IN")} × ${pricing?.new_total_hotels_count || 1}${(pricing?.fy_periods_remaining || 1) > 1 ? ` × ${pricing.fy_periods_remaining} yrs` : ""})`}
              </div>
            ))}
            {diff.added_subcategories?.map((c) => (
              <div key={`as-${c.id}`} className={`${styles.confirmItem} ${styles.confirmItemAdd}`}>
                + Add {c.name} (Free)
              </div>
            ))}
            {diff.added_hotels.map((h) => (
              <div key={`ah-${h.id}`} className={`${styles.confirmItem} ${styles.confirmItemAdd}`}>
                + Add {h.name}
              </div>
            ))}
          </div>
        )}

        {/* Removed items */}
        {(diff?.removed_categories?.length > 0 || diff?.removed_subcategories?.length > 0 || diff?.removed_hotels?.length > 0) && (
          <div className={styles.confirmSection}>
            {diff.removed_categories.map((c) => (
              <div key={`rc-${c.id}`} className={`${styles.confirmItem} ${styles.confirmItemRemove}`}>
                − Remove {c.name}
              </div>
            ))}
            {diff.removed_subcategories?.map((c) => (
              <div key={`rs-${c.id}`} className={`${styles.confirmItem} ${styles.confirmItemRemove}`}>
                − Remove {c.name}
              </div>
            ))}
            {diff.cascaded_subcategories?.map((c) => (
              <div key={`cs-${c.id}`} className={`${styles.confirmItem} ${styles.confirmItemRemove}`}>
                − Remove {c.name} (auto)
              </div>
            ))}
            {diff.removed_hotels.map((h) => (
              <div key={`rh-${h.id}`} className={`${styles.confirmItem} ${styles.confirmItemRemove}`}>
                − Remove {h.name}
              </div>
            ))}
          </div>
        )}

        {hasRemovals && (
          <div className={styles.confirmWarning}>
            <FiAlertTriangle size={16} />
            <span>Removed items are <strong>not refunded</strong>. This change cannot be undone.</span>
          </div>
        )}

        <div className={styles.confirmCost}>
          <span className={styles.confirmCostLabel}>
            {isFree ? "Total to pay" : "Amount to pay now"}
          </span>
          <span className={styles.confirmCostAmount}>
            {isFree ? "Free" : `₹${Number(pricing.net_cost).toLocaleString("en-IN")}`}
          </span>
        </div>
        {(pricing?.fy_periods_remaining || 1) > 1 && (
          <p style={{ fontSize: "12px", color: "#64748b", textAlign: "right", margin: "4px 0 0" }}>
            Price covers {pricing.fy_periods_remaining} financial year{pricing.fy_periods_remaining > 1 ? "s" : ""}
          </p>
        )}

        {shared_end_date && (
          <p className={styles.confirmEndDate}>
            Subscription valid till{" "}
            {new Date(shared_end_date).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric"
            })}
          </p>
        )}

        <div className={styles.confirmActions}>
          <button
            className={styles.btnCancel}
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className={styles.btnGradient}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : isFree
              ? "Apply Changes"
              : "Pay & Apply Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModificationConfirmModal;
