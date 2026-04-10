import { useState, useCallback } from "react";
import { toast } from "react-toastify";
import {
  loadScript,
  verifyHospitalityPayment
} from "@/services/subscription";

const useRazorpayPayment = ({ onSuccess, onCancel }) => {
  const [inProgress, setInProgress] = useState(false);

  const openPayment = useCallback(async (orderData) => {
    setInProgress(true);
    const scriptLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!scriptLoaded) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      setInProgress(false);
      return;
    }

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY,
      order_id: orderData.order_id,
      amount: orderData.amount * 100,
      currency: orderData.currency || "INR",
      name: "Workwise",
      description: "Hospitality Vendor Subscription",
      image: "/assets/images/logo.png",
      handler: async function (response) {
        try {
          const verifyRes = await verifyHospitalityPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature
          });
          setInProgress(false);
          if (onSuccess) onSuccess(verifyRes?.data || {});
        } catch (verifyError) {
          console.error("Payment verification error:", verifyError);
          setInProgress(false);
          if (onSuccess) onSuccess({ fallback: true });
        }
      },
      modal: {
        ondismiss: function () {
          setInProgress(false);
          toast.info("Payment cancelled. You can retry when ready.");
          if (onCancel) onCancel();
        }
      },
      prefill: { name: "", email: "", contact: "" },
      notes: { address: "India" },
      theme: { color: "#2E5BA8" }
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.on("payment.failed", function (response) {
      console.error("Payment failed:", response.error);
      toast.error("Payment failed: " + (response.error?.description || "Please try again."));
      setInProgress(false);
    });
    paymentObject.open();
  }, [onSuccess, onCancel]);

  return { openPayment, inProgress };
};

export default useRazorpayPayment;
