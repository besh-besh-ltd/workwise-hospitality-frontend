import React, { useState, useEffect, useCallback, useRef } from "react";
import { FiCheck, FiFileText, FiRefreshCw } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { setUserProfile } from "@/redux/slice";
import { LoginService, SWSubscribe, getProfile } from "@/services/Auth";
import { verifyHospitalityPayment, getMatchingOpenRfqs, joinOpenRfqs } from "@/services/subscription";
import { sendLog, SeverityNumber } from "@/lib/otel";
import storageInstance from "@/utils/storageInstance";
import styles from "./Register.module.css";

/**
 * PostPaymentFlow — multi-phase post-payment completion screen.
 *
 * Phases:
 *   verifying  → verify payment with Razorpay
 *   confirmed  → show payment summary, auto-login + auto-join RFQs in background
 *   rfq_info   → informational: you've been added to active RFQs
 *   rfq_error  → auto-join failed; surfaced with a retry (NOT swallowed)
 *   complete   → "Go to Dashboard"
 *   error      → verification failed
 *
 * NOTE ON THE rfq_error PHASE: this step used to be wrapped in a bare
 * `try { … } catch (_) {}`. When the backend 500'd on
 * GET /hospitality/vendor/matching-open-rfqs, the vendor got a successful
 * signup and a completely empty dashboard, and nothing anywhere recorded that
 * it had happened. Every failure here must now be both VISIBLE to the vendor
 * and REPORTED to telemetry — silence turns one bug into an undetectable
 * class of bug.
 */
const PHASE = {
  VERIFYING: "verifying",
  CONFIRMED: "confirmed",
  RFQ_INFO: "rfq_info",
  RFQ_ERROR: "rfq_error",
  COMPLETE: "complete",
  ERROR: "error",
};

/**
 * Report a failure to OpenTelemetry (the app's client-side error channel —
 * see lib/otel.js and components/shared/ErrorBoundary.js).
 *
 * The subscription services reject with `{ message: <axiosError> }`, so the
 * real error is usually one level down. Unwrap it so the HTTP status and
 * server message survive into the log record.
 */
const reportFailure = (raw, source, extra = {}) => {
  try {
    const err = raw?.message && typeof raw.message === "object" ? raw.message : raw;
    const response = err?.response;
    sendLog({
      severityNumber: SeverityNumber.ERROR,
      severityText: "ERROR",
      body: err?.message || `PostPaymentFlow failure (${source})`,
      attributes: {
        "error.type": err?.name || "PostPaymentFlowError",
        "error.message": err?.message || String(err ?? ""),
        "error.stack": err?.stack || "",
        "http.response.status_code": response?.status ?? 0,
        "http.response.body": response?.data ? JSON.stringify(response.data).slice(0, 1000) : "",
        "browser.url": typeof window !== "undefined" ? window.location.href : "",
        "log.source": source,
        ...extra,
      },
    });
  } catch (_) {
    /* telemetry must never break the flow */
  }
};

const PostPaymentFlow = ({ show, razorpayData, orderId, userCredentials, swSubscription, onDone }) => {
  const dispatch = useDispatch();
  const [phase, setPhase] = useState(PHASE.VERIFYING);
  const [summary, setSummary] = useState(null);
  const [rfqsJoined, setRfqsJoined] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [retryingRfqs, setRetryingRfqs] = useState(false);
  const hasRunRef = useRef(false);

  /**
   * Phase 3: auto-join matching open RFQs.
   *
   * Returns nothing — it drives `phase` directly so both the initial run and
   * the user-triggered retry share one code path. On failure it lands on
   * PHASE.RFQ_ERROR (visible + retryable) instead of falling through to
   * PHASE.COMPLETE with an empty dashboard.
   */
  const joinMatchingRfqs = useCallback(async () => {
    try {
      const rfqRes = await getMatchingOpenRfqs();
      const matches = rfqRes?.data?.rfqs ?? [];
      if (matches.length > 0) {
        const rfqIds = matches.map((r) => r.rfq_id);
        await joinOpenRfqs({ rfq_ids: rfqIds });
        setRfqsJoined(true);
        setPhase(PHASE.RFQ_INFO);
        return;
      }
      // No matches is a legitimate outcome, not a failure.
      setPhase(PHASE.COMPLETE);
    } catch (err) {
      reportFailure(err, "post_payment.auto_join_rfqs", {
        "flow.phase": "auto_join_open_rfqs",
        "user.email": userCredentials?.email || "",
      });
      setPhase(PHASE.RFQ_ERROR);
    }
  }, [userCredentials]);

  const handleRetryRfqs = useCallback(async () => {
    setRetryingRfqs(true);
    try {
      await joinMatchingRfqs();
    } finally {
      setRetryingRfqs(false);
    }
  }, [joinMatchingRfqs]);

  const runFlow = useCallback(async () => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    try {
      // Phase 1: Verify payment (signature-validated)
      setPhase(PHASE.VERIFYING);
      const verifyRes = await verifyHospitalityPayment({
        razorpay_order_id: razorpayData.razorpay_order_id,
        razorpay_payment_id: razorpayData.razorpay_payment_id,
        razorpay_signature: razorpayData.razorpay_signature,
      });

      if (!verifyRes || verifyRes.status !== 1) {
        reportFailure(
          new Error(verifyRes?.message || "Payment verification returned a non-success status"),
          "post_payment.verify_payment",
          { "flow.phase": "verify_payment", "razorpay.order_id": razorpayData?.razorpay_order_id || "" }
        );
        setPhase(PHASE.ERROR);
        return;
      }

      setSummary(verifyRes.data || {});
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
            } catch (err) {
              // Non-fatal for the flow, but still reported — a swallowed
              // profile failure is how blind spots start.
              reportFailure(err, "post_payment.get_profile", { "flow.phase": "auto_login" });
            }
          }
        } catch (err) {
          reportFailure(err, "post_payment.auto_login", { "flow.phase": "auto_login" });
        }
      }

      // Phase 3: Auto-join matching open RFQs (no consent needed).
      // Failures land on PHASE.RFQ_ERROR — never silently on PHASE.COMPLETE.
      await joinMatchingRfqs();
    } catch (err) {
      console.error("PostPaymentFlow error:", err);
      reportFailure(err, "post_payment.flow", { "flow.phase": "unhandled" });
      setPhase(PHASE.ERROR);
    }
  }, [orderId, razorpayData, userCredentials, swSubscription, dispatch, joinMatchingRfqs]);

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

        {/* ── RFQ ERROR (auto-join failed — surfaced, retryable, reported) ── */}
        {phase === PHASE.RFQ_ERROR && (
          <div className={styles.ppfCenter}>
            <div className={styles.ppfIconError}>!</div>
            <h3 className={styles.ppfTitle}>Couldn't Add You to Open RFQs</h3>
            <p className={styles.ppfSubtext}>
              Your payment went through and your subscription is active. We just couldn't add you
              to the RFQs that are already open — so your dashboard may look empty for now.
            </p>
            <p className={styles.ppfHint}>
              Try again, or continue to your dashboard and contact support if no RFQs appear.
              Future RFQs in your categories will still reach you.
            </p>

            <div className={styles.ppfActions} style={{ width: "100%", marginTop: 8 }}>
              <button
                className={styles.ppfBtnPrimary}
                onClick={handleRetryRfqs}
                disabled={retryingRfqs}
              >
                <FiRefreshCw size={15} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                {retryingRfqs ? "Retrying..." : "Try Again"}
              </button>
              <button
                className={styles.ppfBtnSecondary}
                onClick={handleGoToDashboard}
                disabled={retryingRfqs || navigating}
              >
                {navigating ? "Redirecting..." : "Continue Anyway"}
              </button>
            </div>
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
