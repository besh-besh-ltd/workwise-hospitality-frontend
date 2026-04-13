import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import moment from "moment";
import { getVendorSubscriptionStatus } from "@/services/subscription";
import FullLoader from "@/components/shared/FullLoader";

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

  if (loading) {
    return (
      <div className="hasFullLoader" style={{ minHeight: "100px", position: "relative" }}>
        <FullLoader />
      </div>
    );
  }

  if (!subData) return null;

  const { has_active_subscription, subscription, is_expired, has_pending } = subData;

  // ── Active ──
  if (has_active_subscription && subscription) {
    const daysLeft = subscription.days_remaining || 0;
    const isExpiring = daysLeft <= 30;
    const totalDays = subscription.end_date && subscription.start_date
      ? moment(subscription.end_date).diff(moment(subscription.start_date), "days") || 365
      : 365;
    const progressPct = Math.min(100, Math.max(2, (daysLeft / totalDays) * 100));
    const catCount = subscription.categories?.length || 0;
    const hotelCount = subscription.hotels?.length || 0;

    return (
      <div style={{
        background: "linear-gradient(135deg, #f8faff, #eef3ff)",
        border: "1px solid #dce4f5",
        borderRadius: "14px",
        padding: "20px 24px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        flexWrap: "wrap"
      }}>
        {/* Status dot + badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: isExpiring ? "linear-gradient(135deg, #f59e0b, #fbbf24)" : "linear-gradient(135deg, #2E5BA8, #3d6fbe)",
          color: "#fff", padding: "5px 14px", borderRadius: "8px",
          fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
          boxShadow: isExpiring ? "0 2px 8px rgba(245,158,11,0.25)" : "0 2px 8px rgba(46,91,168,0.2)",
          flexShrink: 0
        }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "#4ade80", animation: "pulse 2s ease-in-out infinite"
          }} />
          {isExpiring ? "Expiring Soon" : "Active"}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: "200px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
            <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
              Expires {moment(subscription.end_date).format("DD MMM YYYY")}
            </span>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              {catCount} categories &middot; {hotelCount} business units
            </span>
          </div>
          {/* Mini progress bar */}
          <div style={{
            width: "100%", maxWidth: "300px", height: "5px",
            background: "rgba(46,91,168,0.1)", borderRadius: "5px", overflow: "hidden"
          }}>
            <div style={{
              height: "100%", borderRadius: "5px", width: `${progressPct}%`,
              background: isExpiring
                ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                : "linear-gradient(90deg, #2E5BA8, #5b8fd9)",
              transition: "width 0.6s ease"
            }} />
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={goToSubscription}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "9px 20px", border: "1.5px solid #2E5BA8",
            borderRadius: "10px", fontSize: "13px", fontWeight: 600,
            color: "#2E5BA8", background: "#fff", cursor: "pointer",
            transition: "all 0.2s", flexShrink: 0
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = "#2E5BA8"; e.currentTarget.style.color = "#fff"; }}
          onMouseOut={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#2E5BA8"; }}
        >
          Manage Subscription
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    );
  }

  // ── Expired ──
  if (is_expired && subscription) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #fef2f2, #fff5f5)",
        border: "1px solid #fecaca",
        borderRadius: "14px",
        padding: "20px 24px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        flexWrap: "wrap"
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          background: "linear-gradient(135deg, #ef4444, #f87171)",
          color: "#fff", padding: "5px 14px", borderRadius: "8px",
          fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
          boxShadow: "0 2px 8px rgba(239,68,68,0.2)", flexShrink: 0
        }}>
          Expired
        </div>
        <div style={{ flex: 1, minWidth: "200px" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
            Your subscription expired on {moment(subscription.end_date).format("DD MMM YYYY")}
          </span>
          <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0" }}>
            Renew to continue accessing all vendor features.
          </p>
        </div>
        <button
          onClick={goToSubscription}
          style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            padding: "9px 20px", border: "none", borderRadius: "10px",
            fontSize: "13px", fontWeight: 600, color: "#fff",
            background: "linear-gradient(135deg, #ef4444, #f87171)",
            cursor: "pointer", transition: "all 0.2s", flexShrink: 0,
            boxShadow: "0 2px 8px rgba(239,68,68,0.2)"
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(239,68,68,0.3)"; }}
          onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(239,68,68,0.2)"; }}
        >
          Renew Now
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </button>
      </div>
    );
  }

  // ── Pending ──
  if (has_pending) {
    return (
      <div style={{
        background: "linear-gradient(135deg, #eff6ff, #f0f4ff)",
        border: "1px solid #bfdbfe",
        borderRadius: "14px",
        padding: "20px 24px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "16px"
      }}>
        <div style={{
          width: "38px", height: "38px", borderRadius: "12px",
          background: "linear-gradient(135deg, #f2f6ff, #dce8ff)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#2E5BA8", flexShrink: 0
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", margin: "0 0 2px" }}>Payment Pending</p>
          <p style={{ fontSize: "12px", color: "#64748b", margin: 0 }}>
            Your registration is waiting for payment confirmation. Complete the pending payment to activate.
          </p>
        </div>
      </div>
    );
  }

  // ── None ──
  return (
    <div style={{
      background: "#f8fafc",
      border: "1.5px dashed #e2e8f0",
      borderRadius: "14px",
      padding: "20px 24px",
      marginBottom: "20px",
      display: "flex",
      alignItems: "center",
      gap: "16px"
    }}>
      <div style={{
        width: "38px", height: "38px", borderRadius: "12px",
        background: "#f1f5f9",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#94a3b8", flexShrink: 0
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
      </div>
      <div>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#334155", margin: "0 0 2px" }}>No Active Subscription</p>
        <p style={{ fontSize: "12px", color: "#94a3b8", margin: 0 }}>
          Please contact support to set up your hospitality vendor subscription.
        </p>
      </div>
    </div>
  );
};

export default SubscriptionStatus;
