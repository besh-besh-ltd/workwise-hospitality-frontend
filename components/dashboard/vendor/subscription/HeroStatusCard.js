import React from "react";
import moment from "moment";
import { FiEdit3, FiRefreshCw, FiArrowRight, FiGrid, FiMapPin, FiLayers } from "react-icons/fi";
import styles from "./Subscription.module.css";

const HeroStatusCard = ({ data, onEdit, onRenew, onExtend, disabled }) => {
  if (!data) return null;

  const { status, subscription, available_actions } = data;

  if (status === "none" || status === "pending") {
    return (
      <div className={styles.overviewRow}>
        <div className={styles.planCard}>
          <div className={styles.planTop}>
            <span className={styles.planBadge}>
              {status === "pending" ? "Payment Pending" : "No Subscription"}
            </span>
          </div>
          <p style={{ fontSize: "14px", color: "#94a3b8", margin: 0 }}>
            {available_actions?.blocked_reason || "Please contact support to set up your subscription."}
          </p>
        </div>
        <div className={styles.paymentCard}>
          <div>
            <p className={styles.paymentLabel}>Next payment</p>
            <p className={styles.paymentDate}>--</p>
          </div>
        </div>
      </div>
    );
  }

  const isActive = status === "active";
  const isExpiring = isActive && subscription?.days_remaining <= 30;
  const isExpired = status === "expired";

  const badgeClass = isExpired
    ? styles.planBadgeExpired
    : isExpiring
    ? styles.planBadgeExpiring
    : "";

  const endDate = subscription?.end_date;
  const startDate = subscription?.start_date;
  let remainingDays = subscription?.days_remaining || 0;
  let totalDays = remainingDays;

  if (startDate && endDate) {
    totalDays = moment(endDate).diff(moment(startDate), "days") || remainingDays;
  }

  const progressPercent = isExpired
    ? 0
    : Math.min(100, Math.max(2, (remainingDays / totalDays) * 100));

  const progressFillClass = isExpired
    ? styles.planProgressFillDanger
    : remainingDays <= 30
    ? styles.planProgressFillWarning
    : "";

  const formattedEnd = endDate
    ? moment(endDate).format("DD MMMM YYYY")
    : "--";

  const activeCost = subscription?.active_cost || 0;
  const totalCats = subscription?.total_categories || 0;
  const totalSubs = subscription?.total_subcategories || 0;
  const totalHotels = subscription?.total_hotels || 0;

  return (
    <>
      <div className={styles.overviewRow}>
        {/* Plan Card */}
        <div className={styles.planCard}>
          <div className={styles.planTop}>
            <span className={`${styles.planBadge} ${badgeClass}`}>
              <span className={`${styles.planStatusDot} ${isExpired ? styles.planStatusDotExpired : ""}`} />
              {isExpired ? "Expired" : "Vendor Subscription"}
            </span>
            <div className={styles.planAmount}>
              <div className={styles.planPrice}>
                ₹{Number(activeCost).toLocaleString("en-IN")}
                <span> /fin year</span>
              </div>
              {subscription?.fy_label && (
                <p className={styles.planPeriod}>{subscription.fy_label}</p>
              )}
            </div>
          </div>

          <div className={styles.planBottom}>
            <div className={styles.planProgress}>
              <p className={styles.planProgressLabel}>
                {isExpired
                  ? `Expired on ${formattedEnd}`
                  : `${remainingDays} days remaining until renewal`}
              </p>
              <div className={styles.planProgressBar}>
                <div
                  className={`${styles.planProgressFill} ${progressFillClass}`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {isExpired ? (
              <button
                className={styles.btnRenew}
                onClick={onRenew}
                disabled={disabled}
              >
                <FiRefreshCw size={15} />
                Renew Now
              </button>
            ) : (
              <button
                className={styles.btnEdit}
                onClick={onEdit}
                disabled={disabled || !available_actions?.can_modify}
              >
                <FiEdit3 size={15} />
                Edit Subscription
              </button>
            )}
          </div>
        </div>

        {/* Payment Card */}
        <div className={styles.paymentCard}>
          <div>
            <p className={styles.paymentLabel}>Next payment</p>
            <p className={styles.paymentDate}>
              {isExpired ? "Renewal required" : `on ${formattedEnd}`}
            </p>
          </div>
          {isActive && (
            <button className={styles.btnOutline} onClick={onExtend} disabled={disabled}>
              Extend Subscription
              <FiArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconBlue}`}>
            <FiGrid />
          </div>
          <div>
            <div className={styles.statValue}>{totalCats}</div>
            <div className={styles.statLabel}>Categories</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconPurple}`}>
            <FiLayers />
          </div>
          <div>
            <div className={styles.statValue}>{totalSubs}</div>
            <div className={styles.statLabel}>Sub-categories</div>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIcon} ${styles.statIconGreen}`}>
            <FiMapPin />
          </div>
          <div>
            <div className={styles.statValue}>{totalHotels}</div>
            <div className={styles.statLabel}>Business Units</div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HeroStatusCard;
