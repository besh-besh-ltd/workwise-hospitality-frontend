import React, { useState, useEffect, useCallback, useRef } from "react";
import { FiCheck, FiFileText } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { setUserProfile } from "@/redux/slice";
import { LoginService, SWSubscribe, getProfile } from "@/services/Auth";
import { testRazorPayEndpoint, getMatchingOpenRfqs, joinOpenRfqs } from "@/services/subscription";
import storageInstance from "@/utils/storageInstance";
import styles from "./Register.module.css";

/**
 * PostPaymentFlow — multi-phase post-payment completion screen.
 *
 * Phases:
 *   verifying  → verify payment with Razorpay
 *   confirmed  → show payment summary, auto-login + auto-join RFQs in background
 *   rfq_info   → informational: you've been added to active RFQs
 *   complete   → "Go to Dashboard"
 *   error      → verification failed
 */
const PHASE = {
  VERIFYING: "verifying",
  CONFIRMED: "confirmed",
  RFQ_INFO: "rfq_info",
  COMPLETE: "complete",
  ERROR: "error",
};

const PostPaymentFlow = ({ show, razorpayData, orderId, userCredentials, swSubscription, onDone }) => {
  const dispatch = useDispatch();
  const [phase, setPhase] = useState(PHASE.VERIFYING);
  const [summary, setSummary] = useState(null);
  const [rfqsJoined, setRfqsJoined] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const hasRunRef = useRef(false);

  const runFlow = useCallback(async () => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    try {
      // Phase 1: Verify payment
      setPhase(PHASE.VERIFYING);
      const verifyRes = await testRazorPayEndpoint({
        order_id: orderId,
        razorpay_payment_id: razorpayData.razorpay_payment_id,
        razorpay_order_id: razorpayData.razorpay_order_id,
        razorpay_signature: razorpayData.razorpay_signature,
      });

      if (!verifyRes || verifyRes.status !== 1) {
        setPhase(PHASE.ERROR);
        return;
      }

      setSummary(verifyRes.data?.payment_summary || {});
      setPhase(PHASE.CONFIRMED);

      // Phase 2: Auto-login
      if (userCredentials?.email && userCredentials?.password) {
        try {
          const loginRes = await LoginService(userCredentials, false);
          if (loginRes?.token) {
            storageInstance.setStorage("token", loginRes.token);
            storageInstance.setStorage("current-user-type", "vendor");
            try { SWSubscribe({ subscription: swSubscription, token: loginRes.token }).catch(() => {}); } catch (_) {}
            try {
              const profileRes = await getProfile();
              dispatch(setUserProfile(profileRes.data));
            } catch (_) {}
          }
        } catch (_) {}
      }

      // Phase 3: Auto-join matching open RFQs (no consent needed)
      try {
        const rfqRes = await getMatchingOpenRfqs();
        if (rfqRes?.data?.rfqs?.length > 0) {
          const rfqIds = rfqRes.data.rfqs.map((r) => r.rfq_id);
          await joinOpenRfqs({ rfq_ids: rfqIds });
          setRfqsJoined(true);
          setPhase(PHASE.RFQ_INFO);
          return;
        }
      } catch (_) {}

      setPhase(PHASE.COMPLETE);
    } catch (err) {
      console.error("PostPaymentFlow error:", err);
      setPhase(PHASE.ERROR);
    }
  }, [orderId, razorpayData, userCredentials, swSubscription, dispatch]);

  useEffect(() => {
    if (show && razorpayData && orderId) runFlow();
  }, [show, razorpayData, orderId, runFlow]);

  const handleGoToDashboard = () => {
    setNavigating(true);
    if (onDone) onDone();
    storageInstance.setStorage("current-user-type", "vendor");
    window.location.href = "/dashboard/vendor";
  };

  const handleAcknowledge = () => setPhase(PHASE.COMPLETE);

  if (!show) return null;

  return (
    <div className={styles.ppfOverlay}>
      <div className={styles.ppfCard}>
        <div className={styles.ppfBar} />

        {/* ── VERIFYING ── */}
        {phase === PHASE.VERIFYING && (
          <div className={styles.ppfCenter}>
            <div className={styles.ppfSpinnerWrap}>
              <span className={styles.ppfSpinner} />
            </div>
            <h3 className={styles.ppfTitle}>Verifying Payment</h3>
            <p className={styles.ppfSubtext}>Confirming your payment with Razorpay...</p>
            <p className={styles.ppfNote}>Please do not close or refresh this page.</p>
          </div>
        )}

        {/* ── CONFIRMED ── */}
        {phase === PHASE.CONFIRMED && (
          <div className={styles.ppfCenter}>
            <div className={styles.ppfIconDone}>
              <FiCheck size={28} />
            </div>
            <h3 className={styles.ppfTitle}>Payment Confirmed!</h3>
            <p className={styles.ppfSubtext}>Your subscription is now active.</p>

            {summary && (
              <div className={styles.ppfSummary}>
                {summary.amount != null && (
                  <div className={styles.ppfRow}>
                    <span>Amount Paid</span>
                    <strong>₹{Number(summary.amount).toLocaleString("en-IN")}</strong>
                  </div>
                )}
                {summary.expiry_date && (
                  <div className={styles.ppfRow}>
                    <span>Valid Until</span>
                    <strong>{summary.expiry_date}</strong>
                  </div>
                )}
                {summary.categories?.length > 0 && (
                  <div className={styles.ppfRow}>
                    <span>Categories</span>
                    <strong>{summary.categories.join(", ")}</strong>
                  </div>
                )}
                {summary.hotels?.length > 0 && (
                  <div className={styles.ppfRow}>
                    <span>Business Units</span>
                    <strong>{summary.hotels.join(", ")}</strong>
                  </div>
                )}
              </div>
            )}

            <p className={styles.ppfNote}>Setting up your account...</p>
          </div>
        )}

        {/* ── RFQ INFO (informational only) ── */}
        {phase === PHASE.RFQ_INFO && (
          <div className={styles.ppfCenter}>
            <div className={styles.ppfIconRfq}>
              <FiFileText size={24} />
            </div>
            <h3 className={styles.ppfTitle}>Added to Active RFQs</h3>
            <p className={styles.ppfSubtext}>
              Some active RFQs have products in the categories you selected. You have been
              automatically added to them so you can start submitting quotes right away.
            </p>
            <p className={styles.ppfHint}>
              This will not affect your participation in any future RFQs.
            </p>

            <button className={styles.ppfBtnPrimary} onClick={handleAcknowledge} style={{ width: "100%" }}>
              Okay, I Understand
            </button>
          </div>
        )}

        {/* ── COMPLETE ── */}
        {phase === PHASE.COMPLETE && (
          <div className={styles.ppfCenter}>
            <div className={styles.ppfIconDone}>
              <FiCheck size={28} />
            </div>
            <h3 className={styles.ppfTitle}>You're All Set!</h3>
            <p className={styles.ppfSubtext}>Your vendor account is ready. Start exploring RFQs and submitting quotes.</p>

            {summary && (
              <div className={styles.ppfSummary}>
                {summary.amount != null && (
                  <div className={styles.ppfRow}>
                    <span>Amount Paid</span>
                    <strong>₹{Number(summary.amount).toLocaleString("en-IN")}</strong>
                  </div>
                )}
                {summary.expiry_date && (
                  <div className={styles.ppfRow}>
                    <span>Valid Until</span>
                    <strong>{summary.expiry_date}</strong>
                  </div>
                )}
              </div>
            )}

            <button className={styles.ppfBtnPrimary} onClick={handleGoToDashboard} disabled={navigating} style={{ width: "100%", marginTop: 8 }}>
              {navigating ? "Redirecting..." : "Go to Vendor Dashboard"}
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {phase === PHASE.ERROR && (
          <div className={styles.ppfCenter}>
            <div className={styles.ppfIconError}>!</div>
            <h3 className={styles.ppfTitle}>Verification Issue</h3>
            <p className={styles.ppfSubtext}>We couldn't verify your payment. If your amount was debited, please contact support.</p>
            <button className={styles.ppfBtnPrimary} onClick={handleGoToDashboard} style={{ width: "100%", marginTop: 8 }}>
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostPaymentFlow;
