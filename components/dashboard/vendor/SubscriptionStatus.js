import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import moment from "moment";
import { Shield, AlertTriangle, XCircle, Clock, ArrowRight } from "lucide-react";
import { getVendorSubscriptionStatus } from "@/services/subscription";
import styles from "./SubscriptionStatus.module.scss";

const SubscriptionStatus = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState(null);

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVendorSubscriptionStatus();
      if (res?.status === 1) setSubData(res.data);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscriptionStatus(); }, [fetchSubscriptionStatus]);

  const goToSubscription = () => router.push("/dashboard/vendor/subscription");

  if (loading || !subData) return null;

  const { has_active_subscription, subscription, is_expired, has_pending } = subData;

  // ── Active ──
  if (has_active_subscription && subscription) {
    const daysLeft = subscription.days_remaining || 0;
    const isExpiring = daysLeft <= 30;
    const endDate = moment(subscription.end_date);
    const startDate = moment(subscription.start_date);
    const totalDays = endDate.isValid() && startDate.isValid()
      ? endDate.diff(startDate, "days")
      : 365;
    const daysUsed = Math.max(0, totalDays - daysLeft);
    const progressPct = totalDays > 0 ? Math.min(100, Math.max(2, (daysUsed / totalDays) * 100)) : 0;
    const catCount = subscription.categories?.length || 0;
    const hotelCount = subscription.hotels?.length || 0;

    return (
      <div className={`${styles.banner} ${isExpiring ? styles.bannerWarning : styles.bannerActive}`}>
        <div className={styles.left}>
          <div className={`${styles.statusBadge} ${isExpiring ? styles.badgeWarning : styles.badgeActive}`}>
            {isExpiring ? <AlertTriangle size={12} /> : <Shield size={12} />}
            <span>{isExpiring ? "Expiring Soon" : "Active"}</span>
          </div>
          <div className={styles.info}>
            <span className={styles.infoMain}>
              {isExpiring
                ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining — renew before ${endDate.format("DD MMM YYYY")}`
                : `Valid until ${endDate.format("DD MMM YYYY")} · ${daysLeft} days remaining`}
            </span>
            <span className={styles.infoSub}>{catCount} categories · {hotelCount} business units</span>
          </div>
        </div>
        <div className={styles.right}>
          <div className={styles.progressWrap}>
            <div className={styles.progressTrack}>
              <div
                className={`${styles.progressFill} ${isExpiring ? styles.fillWarning : styles.fillActive}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className={styles.progressLabel}>{daysUsed} of {totalDays} days used</span>
          </div>
          <button className={`${styles.cta} ${isExpiring ? styles.ctaWarning : styles.ctaActive}`} onClick={goToSubscription}>
            {isExpiring ? "Renew Now" : "Manage"}
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  // ── Expired ──
  if (is_expired && subscription) {
    return (
      <div className={`${styles.banner} ${styles.bannerExpired}`}>
        <div className={styles.left}>
          <div className={`${styles.statusBadge} ${styles.badgeExpired}`}>
            <XCircle size={12} />
            <span>Subscription Expired</span>
          </div>
          <div className={styles.info}>
            <span className={styles.infoMain}>
              Expired on {moment(subscription.end_date).format("DD MMM YYYY")} — renew to continue receiving enquiries
            </span>
          </div>
        </div>
        <button className={`${styles.cta} ${styles.ctaExpired}`} onClick={goToSubscription}>
          Renew Now
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  // ── Pending ──
  if (has_pending) {
    return (
      <div className={`${styles.banner} ${styles.bannerPending}`}>
        <div className={styles.left}>
          <div className={`${styles.statusBadge} ${styles.badgePending}`}>
            <Clock size={12} />
            <span>Payment Pending</span>
          </div>
          <div className={styles.info}>
            <span className={styles.infoMain}>Complete your payment to activate the subscription</span>
          </div>
        </div>
        <button className={`${styles.cta} ${styles.ctaPending}`} onClick={goToSubscription}>
          Complete Payment
          <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  // ── None ──
  return (
    <div className={`${styles.banner} ${styles.bannerNone}`}>
      <div className={styles.left}>
        <div className={`${styles.statusBadge} ${styles.badgeNone}`}>
          <Shield size={12} />
          <span>No Subscription</span>
        </div>
        <div className={styles.info}>
          <span className={styles.infoMain}>Subscribe to start receiving enquiries from hospitality buyers</span>
        </div>
      </div>
      <button className={`${styles.cta} ${styles.ctaPrimary}`} onClick={goToSubscription}>
        Subscribe
        <ArrowRight size={14} />
      </button>
    </div>
  );
};

export default SubscriptionStatus;
