// Vendor addendum-sign modal (OTP request → verify). Shared across the vendor
// surfaces that can trigger a sign: My Amendments banner, the contract-detail
// amendment modal, and the active-contracts page.
//
// Props:
//   addendum : { id, addendum_number, amendment_type, arc_number? }
//   onClose  : () => void
//   onDone   : () => Promise<void> | void   (called after a successful sign)

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import * as ArcApi from "@/services/arc_v2";

const TYPE_LABEL = {
  price: "Price revision",
  qty: "Quantity revision",
  term: "Term extension",
  item_add: "Item addition",
  item_remove: "Item removal",
};

export default function AddendumSignModal({ addendum, onClose, onDone }) {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState("idle"); // idle → code
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  // Where the code was emailed (masked) and when Resend unlocks (one code a minute).
  const [sentTo, setSentTo] = useState([]);
  const [resendIn, setResendIn] = useState(0);

  // Render into document.body so the overlay sits above any other modal
  // (e.g. the amendment-detail modal, which itself portals to body).
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const t = setTimeout(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // The server emails the code to the vendor's registered email.
  const sendOtp = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await ArcApi.vendorRequestAddendumOtp(addendum.id);
      setDevCode(res?.data?.dev_code || null);
      setSentTo(res?.data?.sent_to || []);
      setResendIn(Number(res?.data?.resend_after_seconds) || 60);
      setStep("code");
    } catch (e) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      if (status === 429) {
        // A code went out less than a minute ago and still works.
        setResendIn(Number(data?.data?.retry_after_seconds) || 60);
        setStep("code");
      }
      setErr(data?.message || "Could not send the OTP. Please try again.");
    }
    finally { setBusy(false); }
  };

  const verify = async () => {
    if (!code.trim()) { setErr("Enter the OTP to continue."); return; }
    setBusy(true); setErr(null);
    try {
      await ArcApi.vendorVerifyAddendumOtp(addendum.id, code.trim());
      await onDone();
    } catch (e) { setErr("OTP verification failed. Check the code and try again."); setBusy(false); }
  };

  if (!mounted) return null;

  const ui = (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: "92vw", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-lg)", padding: "22px 24px", boxShadow: "var(--shadow-md)" }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--fg)" }}>Sign Addendum No. {addendum.addendum_number}</div>
        <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 4 }}>
          {TYPE_LABEL[addendum.amendment_type] || addendum.amendment_type}
          {addendum.arc_number ? <> · <span className="mono">{addendum.arc_number}</span></> : null}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-4)", marginTop: 10, lineHeight: 1.5 }}>
          Signing seals this addendum (SHA-256) and makes the amended terms effective. The original contract document is not changed.
        </div>

        {step === "idle" && (
          <button className="btn btn-blue" style={{ marginTop: 16, width: "100%" }} disabled={busy} onClick={sendOtp}>
            {busy ? "Sending…" : "Send OTP to sign"}
          </button>
        )}

        {step === "code" && (
          <>
            <div data-testid="addendum-otp-sent-to" style={{ marginTop: 14, fontSize: 12, color: "var(--fg-3)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span>{sentTo.length ? `We emailed the code to ${sentTo.join(", ")}` : "We emailed the code to your registered email"}</span>
              <button className="btn btn-ghost btn-sm" onClick={sendOtp} disabled={busy || resendIn > 0} style={{ padding: "3px 8px", fontSize: 11 }}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend"}
              </button>
            </div>
            {devCode && (
              <div style={{ marginTop: 14, padding: "8px 12px", background: "var(--surface-2)", border: "1px dashed var(--border)", borderRadius: 8, fontSize: 12, color: "var(--fg-3)" }}>
                Dev OTP: <span className="mono fw-600" style={{ color: "var(--fg)" }}>{devCode}</span>
              </div>
            )}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit OTP"
              inputMode="numeric"
              style={{ marginTop: 14, width: "100%", padding: "10px 12px", border: "1px solid var(--border-strong)", borderRadius: 8, fontSize: 14, fontFamily: "'Geist Mono',monospace", letterSpacing: 2 }}
            />
            <button className="btn btn-blue" style={{ marginTop: 12, width: "100%" }} disabled={busy} onClick={verify}>
              {busy ? "Verifying…" : "Verify & sign"}
            </button>
          </>
        )}

        {err && <div style={{ marginTop: 12, fontSize: 12, color: "var(--danger)" }}>{err}</div>}
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: "100%" }} onClick={onClose} disabled={busy}>Cancel</button>
      </div>
    </div>
  );

  return createPortal(ui, document.body);
}
