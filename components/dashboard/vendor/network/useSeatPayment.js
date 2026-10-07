import { useCallback, useRef, useState } from "react";
import { toast } from "react-toastify";
import { loadScript } from "@/services/subscription";
import { paySeats, verifySeatsPayment } from "@/services/vendorNetwork";
import { networkErrorMessage } from "./networkErrors";

const IN_PROGRESS_NO_ORDER =
  "A checkout for these seats was started in the last 30 minutes. Complete it from the original window, or retry after 30 minutes.";

const seatSetKey = (seatIds) => [...new Set(seatIds.map(Number))].sort((a, b) => a - b).join(",");

/**
 * Pays for pending network seats (spec §5.1). Same Razorpay checkout as the
 * vendor subscription (components/dashboard/vendor/subscription/hooks/
 * useRazorpayPayment.js): load checkout.js, open the order the server created,
 * verify the signature in the handler. The server's order is in paise and
 * comes with the key it was created under.
 *
 * The server refuses a second order for the same seats for 30 minutes
 * (PAYMENT_IN_PROGRESS), so the last order is kept: a retry for the SAME seat
 * set (after a dismissed or failed checkout) reopens that order instead of
 * asking for a new one. Once Razorpay calls the handler the order is paid, so
 * it is forgotten whether or not verification succeeds.
 */
const useSeatPayment = ({ onSuccess } = {}) => {
  const [inProgress, setInProgress] = useState(false);
  const lastOrder = useRef(null); // { key, orderData }

  const openCheckout = useCallback(async (orderData) => {
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
        // Razorpay took the payment: this order must never be reopened.
        lastOrder.current = null;
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

  const payForSeats = useCallback(async (seatIds) => {
    setInProgress(true);
    const key = seatSetKey(seatIds);
    if (lastOrder.current?.key === key) {
      await openCheckout(lastOrder.current.orderData);
      return;
    }

    let orderData;
    try {
      const res = await paySeats({ seat_ids: seatIds });
      orderData = res?.data;
      if (!orderData?.order?.id) throw new Error("No order");
    } catch (err) {
      const inProgressElsewhere = err?.response?.data?.reason === "PAYMENT_IN_PROGRESS";
      toast.error(
        networkErrorMessage(err, "Unable to start the seat payment.", inProgressElsewhere ? { PAYMENT_IN_PROGRESS: IN_PROGRESS_NO_ORDER } : {})
      );
      setInProgress(false);
      return;
    }
    lastOrder.current = { key, orderData };
    await openCheckout(orderData);
  }, [openCheckout]);

  return { payForSeats, inProgress };
};

export default useSeatPayment;
