import React, { useEffect, useState, useCallback } from "react";
import { toast } from "react-toastify";
import moment from "moment";
import {
  getVendorSubscriptionStatus,
  renewHospitalitySubscription,
  verifyHospitalityPayment,
  loadScript
} from "@/services/subscription";
import FullLoader from "@/components/shared/FullLoader";

const SubscriptionStatus = ({ onPaymentSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState(null);
  const [paymentInProgress, setPaymentInProgress] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

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

  const handleRenew = async () => {
    try {
      setPaymentInProgress(true);
      setShowRetry(false);

      // Use existing categories/hotels from the expired subscription
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
          await verifyHospitalityPayment(verifyPayload);
          toast.success("Payment successful! Refreshing your dashboard...");
          if (onPaymentSuccess) {
            onPaymentSuccess();
          } else {
            window.location.reload();
          }
        } catch (verifyError) {
          console.error("Payment verification error:", verifyError);
          // Payment was captured by Razorpay even if our verify call failed
          // The webhook will handle it server-side
          toast.success("Payment captured. Your dashboard will update shortly.");
          setTimeout(() => window.location.reload(), 2000);
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

  if (loading) {
    return (
      <div className="hasFullLoader" style={{ minHeight: "120px", position: "relative" }}>
        <FullLoader />
      </div>
    );
  }

  if (!subData) return null;

  const { has_active_subscription, subscription, is_expired, can_renew } = subData;

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
                <strong>Previous Categories:</strong>{" "}
                {subscription.categories.map(c => c.name).join(", ")}
              </p>
            )}
            {subscription.hotels?.length > 0 && (
              <p className="mb-0">
                <strong>Previous Hotels:</strong>{" "}
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

  // No subscription at all (shouldn't normally happen for hospitality vendors)
  return (
    <div className="alert alert-info mb-4" role="alert">
      <h5 className="mb-1">No Active Subscription</h5>
      <p className="mb-0">Please contact support to set up your hospitality vendor subscription.</p>
    </div>
  );
};

export default SubscriptionStatus;
