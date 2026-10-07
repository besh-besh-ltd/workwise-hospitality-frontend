import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { loadScript } from "@/services/subscription";
import { paySeats, verifySeatsPayment } from "@/services/vendorNetwork";
import { networkErrorMessage } from "./networkErrors";
import {
  clearPendingSeatVerify,
  isDefinitiveRefusal,
  readPendingSeatVerify,
  savePendingSeatVerify,
} from "./seatVerifyStore";

const IN_PROGRESS_NO_ORDER =
  "A checkout for these seats was started in the last 30 minutes. Complete it from the original window, or retry after 30 minutes.";
const NOT_CONFIRMED_YET =
  "Your payment went through but we couldn't confirm it yet. Use \"Retry confirmation\"; you won't be charged again.";

const seatSetKey = (seatIds) => [...new Set(seatIds.map(Number))].sort((a, b) => a - b).join(",");

/**
 * Pays for pending network seats (spec §5.1). Same Razorpay checkout as the
 * vendor subscription (components/dashboard/vendor/subscription/hooks/
 * useRazorpayPayment.js): load checkout.js, open the order the server created,
 * verify the signature in the handler. The server's order is in paise and
 * comes with the key it was created under.
 *
 * Two guards against a dead end or a double charge:
 *  - The server refuses a second order for the same seats for 30 minutes
 *    (PAYMENT_IN_PROGRESS), so the last unpaid order is kept: a retry for the
 *    SAME seat set (after a dismissed or failed checkout) reopens it. Once
 *    Razorpay calls the handler the order is paid and is forgotten.
 *  - A paid order's ids are persisted (seatVerifyStore) before verify runs and
 *    kept until verify succeeds or definitively refuses (4xx). While they are
 *    pending, verify is replayed on load and on any Pay click; a new order is
 *    never requested.
 */
const useSeatPayment = ({ orgId, onSuccess } = {}) => {
  const [inProgress, setInProgress] = useState(false);
  const [pendingVerify, setPendingVerify] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const lastOrder = useRef(null); // { key, orderData }
  const confirmingRef = useRef(false);

  /** Verify a persisted payment. `replay` = not straight from the checkout handler. */
  const confirmPayment = useCallback(async (payload, { replay }) => {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    setConfirming(true);
    try {
      const res = await verifySeatsPayment({
        razorpay_order_id: payload.razorpay_order_id,
        razorpay_payment_id: payload.razorpay_payment_id,
        razorpay_signature: payload.razorpay_signature,
      });
      clearPendingSeatVerify(orgId);
      setPendingVerify(null);
      toast.success(replay ? "Seat payment confirmed" : res?.message || "Seats activated");
    } catch (err) {
      if (isDefinitiveRefusal(err)) {
        clearPendingSeatVerify(orgId);
        setPendingVerify(null);
        toast.error(networkErrorMessage(err, "This payment could not be confirmed."));
      } else {
        setPendingVerify(payload);
        toast.error(NOT_CONFIRMED_YET);
      }
    } finally {
      confirmingRef.current = false;
      setConfirming(false);
      if (onSuccess) onSuccess();
    }
  }, [orgId, onSuccess]);

  // A payment taken in an earlier visit but never confirmed: replay it first.
  useEffect(() => {
    const stored = readPendingSeatVerify(orgId);
    if (!stored) return;
    setPendingVerify(stored);
    confirmPayment(stored, { replay: true });
    // Only on load (and org change), not on every callback identity change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const retryConfirmation = useCallback(() => {
    const stored = readPendingSeatVerify(orgId) || pendingVerify;
    if (stored) return confirmPayment(stored, { replay: true });
    setPendingVerify(null);
    return undefined;
  }, [orgId, pendingVerify, confirmPayment]);

  const openCheckout = useCallback(async (orderData, seatIds) => {
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
        // Razorpay took the payment: never reopen this order, and keep its ids
        // until the server has confirmed them.
        lastOrder.current = null;
        const payload = {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          seat_ids: seatIds,
        };
        savePendingSeatVerify(orgId, payload);
        setInProgress(false);
        await confirmPayment(payload, { replay: false });
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
  }, [orgId, confirmPayment]);

  const payForSeats = useCallback(async (seatIds) => {
    // A paid-but-unconfirmed payment comes first: confirm it, never re-order.
    const stored = readPendingSeatVerify(orgId);
    if (stored) {
      setPendingVerify(stored);
      await confirmPayment(stored, { replay: true });
      return;
    }

    setInProgress(true);
    const key = seatSetKey(seatIds);
    if (lastOrder.current?.key === key) {
      await openCheckout(lastOrder.current.orderData, seatIds);
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
    await openCheckout(orderData, seatIds);
  }, [orgId, openCheckout, confirmPayment]);

  return { payForSeats, inProgress, pendingVerify, confirming, retryConfirmation };
};

export default useSeatPayment;
