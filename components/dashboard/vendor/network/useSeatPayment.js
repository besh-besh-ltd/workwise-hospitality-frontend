import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { loadScript } from "@/services/subscription";
import { paySeats, verifySeatsPayment } from "@/services/vendorNetwork";
import { networkErrorMessage } from "./networkErrors";

/**
 * Pays for pending network seats (spec §5.1). Same Razorpay checkout as the
 * vendor subscription (components/dashboard/vendor/subscription/hooks/
 * useRazorpayPayment.js): load checkout.js, open the order the server created,
 * verify the signature in the handler. The server's order is in paise and
 * comes with the key it was created under.
 */
const useSeatPayment = ({ onSuccess } = {}) => {
  const [inProgress, setInProgress] = useState(false);

  const payForSeats = useCallback(async (seatIds) => {
    setInProgress(true);
    let orderData;
    try {
      const res = await paySeats({ seat_ids: seatIds });
      orderData = res?.data;
      if (!orderData?.order?.id) throw new Error("No order");
    } catch (err) {
      toast.error(networkErrorMessage(err, "Unable to start the seat payment."));
      setInProgress(false);
      return;
    }

    const scriptLoaded = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!scriptLoaded) {
      toast.error("Razorpay SDK failed to load. Are you online?");
      setInProgress(false);
      return;
    }

    const options = {
      key: orderData.razorpay_key || process.env.NEXT_PUBLIC_RAZORPAY_KEY,
      order_id: orderData.order.id,
      amount: orderData.order.amount,
      currency: orderData.order.currency || "INR",
      name: "Workwise",
      description: "Vendor network seats",
      image: "/assets/images/logo.png",
      handler: async function (response) {
        try {
          const verifyRes = await verifySeatsPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          toast.success(verifyRes?.message || "Seats activated");
        } catch (verifyError) {
          toast.error(
            networkErrorMessage(verifyError, "We could not confirm the payment yet. Refresh in a minute to see your seats.")
          );
        } finally {
          setInProgress(false);
          if (onSuccess) onSuccess();
        }
      },
      modal: {
        ondismiss: function () {
          setInProgress(false);
          toast.info("Payment cancelled. You can retry when ready.");
        },
      },
      prefill: { name: "", email: "", contact: "" },
      notes: { address: "India" },
      theme: { color: "#2E5BA8" },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.on("payment.failed", function (response) {
      toast.error("Payment failed: " + (response.error?.description || "Please try again."));
      setInProgress(false);
    });
    paymentObject.open();
  }, [onSuccess]);

  return { payForSeats, inProgress };
};

export default useSeatPayment;
