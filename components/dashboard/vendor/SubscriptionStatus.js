import React, { useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { setUserProfile } from "@/redux/slice";
import { toast } from "react-toastify";
import moment from "moment";
import {
  getVendorSubscriptionStatus,
  renewHospitalitySubscription,
  verifyHospitalityPayment,
  loadScript
} from "@/services/subscription";
import { getProfile } from "@/services/Auth";
import FullLoader from "@/components/shared/FullLoader";

const SuccessModal = ({ data, onClose }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(4px)", zIndex: 9998,
          animation: "subFadeIn 0.3s ease"
        }}
      />
      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "#fff", borderRadius: "16px",
        padding: "40px 36px 32px", maxWidth: "440px", width: "90%",
        zIndex: 9999, textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        animation: "subSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        {/* Success icon */}
        <div style={{
          width: "64px", height: "64px", borderRadius: "50%",
          background: "linear-gradient(135deg, #2e5ba8, #1a3d7c)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", boxShadow: "0 4px 16px rgba(46,91,168,0.3)"
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h4 style={{ margin: "0 0 6px", fontWeight: 700, color: "#1a1a2e", fontSize: "20px" }}>
          Subscription Renewed!
        </h4>
        <p style={{ margin: "0 0 24px", color: "#666", fontSize: "14px", lineHeight: 1.5 }}>
          Your subscription has been successfully renewed. All features are now unlocked.
        </p>

        {/* Details card */}
        <div style={{
          background: "#f0f4ff", borderRadius: "10px", padding: "16px 20px",
          marginBottom: "24px", textAlign: "left", border: "1px solid #dce4f5"
        }}>
          {data?.expiry_date && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>Valid Until</span>
              <span style={{ fontWeight: 600, color: "#2e5ba8", fontSize: "13px" }}>{data.expiry_date}</span>
            </div>
          )}
          {data?.amount != null && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>Amount Paid</span>
              <span style={{ fontWeight: 600, color: "#1a1a2e", fontSize: "13px" }}>
                ₹{Number(data.amount).toLocaleString("en-IN")}
              </span>
            </div>
          )}
          {data?.categories?.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>Categories</span>
              <span style={{ fontWeight: 500, color: "#1a1a2e", fontSize: "13px", textAlign: "right", maxWidth: "60%" }}>
                {data.categories.join(", ")}
              </span>
            </div>
          )}
          {data?.hotels?.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>Hotels</span>
              <span style={{ fontWeight: 500, color: "#1a1a2e", fontSize: "13px", textAlign: "right", maxWidth: "60%" }}>
                {data.hotels.join(", ")}
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "12px",
            background: "linear-gradient(135deg, #2e5ba8, #1a3d7c)",
            color: "#fff", border: "none", borderRadius: "10px",
            fontSize: "14px", fontWeight: 600, cursor: "pointer",
            transition: "opacity 0.2s"
          }}
          onMouseOver={(e) => e.target.style.opacity = "0.9"}
          onMouseOut={(e) => e.target.style.opacity = "1"}
        >
          Continue to Dashboard
        </button>
      </div>

      <style jsx>{`
        @keyframes subFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes subSlideUp {
          from { opacity: 0; transform: translate(-50%, -45%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </>
  );
};

const SubscriptionStatus = ({ onPaymentSuccess }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState(null);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [successModal, setSuccessModal] = useState(null); // holds verify response data

  const fetchSubscriptionStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVendorSubscriptionStatus();
      if (res?.status === 1) {
        setSubData(res.data);
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  const refreshProfileAndSubscription = async () => {
    try {
      // Re-fetch profile to update Redux (unlocks nav)
      const profileRes = await getProfile();
      if (profileRes?.data) {
        dispatch(setUserProfile(profileRes.data));
      }
      // Also refresh local subscription data
      await fetchSubscriptionStatus();
    } catch (err) {
      console.error("Error refreshing profile:", err);
    }
  };

  const handleSuccessModalClose = async () => {
    setSuccessModal(null);
    setPaymentInProgress(false);
    // Refresh data without full page reload
    await refreshProfileAndSubscription();
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };

  const handleRenew = async () => {
    try {
      setPaymentInProgress(true);
      setShowRetry(false);

      const payload = {
        categories: subData?.subscription?.categories?.map(c => c.id) || [],
        subcategories: subData?.subscription?.subcategories?.map(c => c.id) || [],
        hotels: subData?.subscription?.hotels?.map(h => h.id) || []
      };

      const res = await renewHospitalitySubscription(payload);
      if (res?.status === 1 && res?.data?.order_id) {
        await openRazorpay(res.data);
      } else {
        toast.error(res?.message || "Unable to initiate payment. Please try again.");
        setPaymentInProgress(false);
        setShowRetry(true);
      }
    } catch (error) {
      console.error("Renewal error:", error);
      toast.error(error?.response?.data?.message || "Failed to start payment. Please try again.");
      setPaymentInProgress(false);
      setShowRetry(true);
    }
  };

  const openRazorpay = async (orderData) => {
    const scriptLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!scriptLoaded) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      setPaymentInProgress(false);
      setShowRetry(true);
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
      order_id: orderData.order_id,
      amount: orderData.amount * 100,
      currency: "INR",
      name: "Workwise",
      description: "Hospitality Vendor Subscription Renewal",
      image: "/assets/images/logo.png",
      handler: async function (response) {
        try {
          const verifyPayload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          };
          const verifyRes = await verifyHospitalityPayment(verifyPayload);
          // Show success modal instead of reload
          setSuccessModal(verifyRes?.data || {});
        } catch (verifyError) {
          console.error("Payment verification error:", verifyError);
          // Payment was captured by Razorpay even if verify failed — webhook handles it
          setSuccessModal({ fallback: true });
        }
      },
      modal: {
        ondismiss: function () {
          setPaymentInProgress(false);
          setShowRetry(true);
          toast.info("Payment cancelled. You can retry when ready.");
        }
      },
      prefill: { name: "", email: "", contact: "" },
      notes: { address: "India" },
      theme: { color: "#158993" }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.on("payment.failed", function (response) {
      console.error("Payment failed:", response.error);
      toast.error("Payment failed: " + (response.error?.description || "Please try again."));
      setPaymentInProgress(false);
      setShowRetry(true);
    });
    paymentObject.open();
  };

  // Success modal overlay
  if (successModal) {
    return <SuccessModal data={successModal} onClose={handleSuccessModalClose} />;
  }

  if (loading) {
    return (
      <div className="hasFullLoader" style={{ minHeight: "120px", position: "relative" }}>
        <FullLoader />
      </div>
    );
  }

  if (!subData) return null;

  const { has_active_subscription, subscription, is_expired, can_renew, has_pending } = subData;

  // Active subscription — show info card
  if (has_active_subscription && subscription) {
    return (
      <div className="alert alert-success mb-4" role="alert">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h5 className="mb-2" style={{ color: "#2e7d32" }}>Subscription Active</h5>
            <p className="mb-1">
              <strong>Expires:</strong>{" "}
              {moment(subscription.end_date).format("DD MMM YYYY")}
              {subscription.days_remaining <= 30 && (
                <span className="badge bg-warning text-dark ms-2">
                  {subscription.days_remaining} days remaining
                </span>
              )}
            </p>
            {subscription.categories?.length > 0 && (
              <p className="mb-1">
                <strong>Categories:</strong>{" "}
                {subscription.categories.map(c => c.name).join(", ")}
              </p>
            )}
            {subscription.hotels?.length > 0 && (
              <p className="mb-0">
                <strong>Hotels:</strong>{" "}
                {subscription.hotels.map(h => h.name).join(", ")}
              </p>
            )}
          </div>
          {can_renew && (
            <button
              className="btn btn-primary"
              onClick={handleRenew}
              disabled={paymentInProgress}
            >
              {paymentInProgress ? "Processing..." : "Renew Early"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Expired subscription — show renewal banner
  if (is_expired && subscription) {
    return (
      <div className="alert alert-warning mb-4" role="alert">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h5 className="mb-2" style={{ color: "#856404" }}>Subscription Expired</h5>
            <p className="mb-1">
              Your subscription expired on{" "}
              <strong>{moment(subscription.end_date).format("DD MMM YYYY")}</strong>.
              Please renew to continue accessing all vendor features.
            </p>
            {subscription.categories?.length > 0 && (
              <p className="mb-1">
                <strong>Categories:</strong>{" "}
                {subscription.categories.map(c => c.name).join(", ")}
              </p>
            )}
            {subscription.hotels?.length > 0 && (
              <p className="mb-0">
                <strong>Hotels:</strong>{" "}
                {subscription.hotels.map(h => h.name).join(", ")}
              </p>
            )}
          </div>
          <div className="d-flex flex-column gap-2">
            <button
              className="btn btn-primary"
              onClick={handleRenew}
              disabled={paymentInProgress}
            >
              {paymentInProgress ? "Processing..." : "Renew Now"}
            </button>
            {showRetry && (
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={handleRenew}
              >
                Retry Payment
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (has_pending) {
    return (
      <div className="alert alert-info mb-4" role="alert">
        <h5 className="mb-1">Payment Pending</h5>
        <p className="mb-0">
          Your hospitality registration is waiting for payment confirmation. Please complete the pending payment to activate your subscription.
        </p>
      </div>
    );
  }

  // No subscription at all (shouldn't normally happen for hospitality vendors)
  return (
    <div className="alert alert-info mb-4" role="alert">
      <h5 className="mb-1">No Active Subscription</h5>
      <p className="mb-0">Please contact support to set up your hospitality vendor subscription.</p>
    </div>
  );
};

export default SubscriptionStatus;
