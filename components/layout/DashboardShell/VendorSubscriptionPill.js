import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import moment from "moment";
import { Shield, AlertTriangle, XCircle, Clock, ArrowRight } from "lucide-react";
import { getVendorSubscriptionStatus } from "@/services/subscription";
import styles from "./DashboardShell.module.css";

// Resolve which visual state the pill should render in. Keeps the rendering
// branchless below — we just look up { className, label, Icon, sub }.
const resolveState = (data) => {
  if (!data) return null;
  const { has_active_subscription, subscription, is_expired, has_pending } = data;

  if (has_active_subscription && subscription) {
    const daysLeft = subscription.days_remaining || 0;
    if (daysLeft <= 30) {
      return {
        key: "expiring",
        label: `Expiring · ${daysLeft}d`,
        Icon: AlertTriangle,
        cardClassName: styles.subPillWarn,
      };
    }
    return {
      key: "active",
      label: `Active · ${daysLeft}d`,
      Icon: Shield,
      cardClassName: styles.subPillActive,
    };
  }

  if (is_expired && subscription) {
    return {
      key: "expired",
      label: "Expired",
      Icon: XCircle,
      cardClassName: styles.subPillDanger,
    };
  }

  if (has_pending) {
    return {
      key: "pending",
      label: "Payment Pending",
      Icon: Clock,
      cardClassName: styles.subPillPending,
    };
  }

  return {
    key: "none",
    label: "Subscribe",
    Icon: Shield,
    cardClassName: styles.subPillMuted,
  };
};

const VendorSubscriptionPill = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVendorSubscriptionStatus();
      if (res?.status === 1) setData(res.data);
    } catch (_) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (loading) return null;

  const state = resolveState(data);
  if (!state) return null;

  const handleClick = () => router.push("/dashboard/vendor/subscription");

  // Build the tooltip body for each state. Kept inline so the popover and
  // the pill stay in sync — both read the same `data` snapshot.
  const renderTooltipBody = () => {
    if (state.key === "active" || state.key === "expiring") {
      const sub = data.subscription;
      const endDate = moment(sub.end_date);
      const startDate = moment(sub.start_date);
      const totalDays =
        endDate.isValid() && startDate.isValid()
          ? endDate.diff(startDate, "days")
          : 365;
      const daysLeft = sub.days_remaining || 0;
      const daysUsed = Math.max(0, totalDays - daysLeft);
      const progressPct =
        totalDays > 0
          ? Math.min(100, Math.max(2, (daysUsed / totalDays) * 100))
          : 0;
      const catCount = sub.categories?.length || 0;
      const hotelCount = sub.hotels?.length || 0;
      return (
        <>
          <div className={styles.subTooltipRow}>
            <span className={styles.subTooltipKey}>Valid until</span>
            <span className={styles.subTooltipVal}>
              {endDate.format("DD MMM YYYY")}
            </span>
          </div>
          <div className={styles.subTooltipRow}>
            <span className={styles.subTooltipKey}>Coverage</span>
            <span className={styles.subTooltipVal}>
              {catCount} categor{catCount === 1 ? "y" : "ies"} · {hotelCount}{" "}
              business unit{hotelCount === 1 ? "" : "s"}
            </span>
          </div>
          <div className={styles.subTooltipProgress}>
            <div className={styles.subTooltipProgressTrack}>
              <div
                className={`${styles.subTooltipProgressFill} ${state.cardClassName}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className={styles.subTooltipProgressLabel}>
              {daysUsed} of {totalDays} days used
            </span>
          </div>
        </>
      );
    }
    if (state.key === "expired" && data.subscription) {
      return (
        <div className={styles.subTooltipMsg}>
          Expired on{" "}
          <strong>
            {moment(data.subscription.end_date).format("DD MMM YYYY")}
          </strong>
          . Renew to keep receiving enquiries.
        </div>
      );
    }
    if (state.key === "pending") {
      return (
        <div className={styles.subTooltipMsg}>
          Complete your payment to activate the subscription.
        </div>
      );
    }
    return (
      <div className={styles.subTooltipMsg}>
        Subscribe to start receiving enquiries from hospitality buyers.
      </div>
    );
  };

  const ctaLabel =
    state.key === "active" || state.key === "expiring"
      ? state.key === "expiring"
        ? "Renew now"
        : "Manage"
      : state.key === "expired"
      ? "Renew now"
      : state.key === "pending"
      ? "Complete payment"
      : "Subscribe";

  return (
    <button
      type="button"
      className={`${styles.subPill} ${state.cardClassName}`}
      onClick={handleClick}
      aria-label={`Subscription: ${state.label}`}
    >
      <state.Icon size={13} className={styles.subPillIcon} />
      <span className={styles.subPillLabel}>{state.label}</span>

      <div className={styles.subTooltip} role="tooltip">
        <div className={styles.subTooltipHead}>
          <state.Icon size={12} />
          <span>Subscription</span>
        </div>
        <div className={styles.subTooltipBody}>{renderTooltipBody()}</div>
        <div className={styles.subTooltipFoot}>
          <span className={styles.subTooltipCta}>
            {ctaLabel} <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </button>
  );
};

export default VendorSubscriptionPill;
