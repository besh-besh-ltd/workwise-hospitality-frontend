import React, { useEffect, useState } from "react";

// Phase 8 — sub-modal for capturing the buyer's reason when they
// override an active ARC and float an open-market RFQ. Required.
// Server enforces ≥30 chars; we mirror that here so the buyer gets
// instant feedback rather than a backend rejection.
//
// Bespoke styling, no Bootstrap. Same visual language as
// ContractedItemModal.

const MIN_LEN = 30;
const MAX_LEN = 2000;

const BypassArcReasonModal = ({ isOpen, productName = "this item", onClose, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  // Buyer must explicitly confirm by ticking a checkbox before the
  // skip-contract action fires. Two friction points (free-text reason
  // + an explicit acknowledgement) match the seriousness of skipping
  // a signed rate contract. ALL hooks must run before the early
  // `return null` below — adding hooks after a conditional return
  // violates rules-of-hooks and crashes with "Rendered more hooks
  // than during the previous render".
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setTouched(false);
      setAcknowledged(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN;
  const submitEnabled = valid && acknowledged;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", zIndex: 2010 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bypass-arc-modal-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(580px, calc(100vw - 32px))",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(15,23,42,0.30)",
          zIndex: 2011,
          overflow: "hidden",
          // Red top accent immediately reads as a destructive action,
          // distinct from neutral confirmation modals across the app.
          borderTop: "5px solid #dc2626",
        }}
      >
        {/* HERO */}
        <div style={{ padding: "20px 26px 0", display: "flex", gap: 14, alignItems: "flex-start" }}>
          <span
            aria-hidden
            style={{
              flex: "0 0 auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: 999,
              background: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            !
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: "#dc2626",
                  color: "#fff",
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                Skipping a signed contract
              </span>
            </div>
            <h3 id="bypass-arc-modal-title" style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
              Are you sure you want to skip the rate contract?
            </h3>
            <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: 0 }}>
              <strong>{productName}</strong> is already covered by an active rate contract — meaning the
              vendor and price are already locked in. If you continue, you'll send out a fresh RFQ to
              other vendors instead of using that contract. This takes longer, costs the company time,
              and your reason will be saved permanently with your name and the date.
              {" "}Please only do this when there's a genuine reason — for example, the vendor can't
              deliver right now, the contract is about to expire, or there's a quality or compliance issue.
            </p>
          </div>
        </div>

        {/* CONSEQUENCES — make the cost explicit */}
        <div
          style={{
            margin: "16px 26px 0",
            padding: "12px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#991b1b", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 }}>
            What happens if you continue
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#7f1d1d", lineHeight: 1.6 }}>
            <li>Your reason below is saved with your name and the date — and stays on the record forever.</li>
            <li>A red <strong>ARC OVERRIDE</strong> tag will show on this RFQ everywhere — in the list, on the details page, when editing, to everyone.</li>
            <li>Your manager and the procurement team will see this when they review records.</li>
          </ul>
        </div>

        {/* REASON FIELD */}
        <div style={{ padding: "16px 26px 0" }}>
          <label
            htmlFor="bypass-arc-reason"
            style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}
          >
            Why are you skipping the contract? <span style={{ color: "#dc2626" }}>*</span>
          </label>
          <textarea
            id="bypass-arc-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            rows={4}
            maxLength={MAX_LEN}
            placeholder={`Explain in your own words — at least ${MIN_LEN} characters. Reviewers will read this later.`}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${touched && !valid ? "#dc2626" : "#cbd5e1"}`,
              borderRadius: 8,
              fontSize: 13,
              fontFamily: "inherit",
              resize: "vertical",
              outline: "none",
              transition: "border-color 120ms ease, box-shadow 120ms ease",
              boxShadow: touched && !valid ? "0 0 0 3px rgba(220,38,38,0.12)" : "none",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
            <span style={{ color: touched && !valid ? "#dc2626" : "#94a3b8" }}>
              {trimmed.length < MIN_LEN
                ? `${MIN_LEN - trimmed.length} more character${MIN_LEN - trimmed.length === 1 ? "" : "s"} required`
                : "Looks good"}
            </span>
            <span style={{ color: "#94a3b8" }}>
              {trimmed.length} / {MAX_LEN}
            </span>
          </div>
        </div>

        {/* ACKNOWLEDGEMENT */}
        <div style={{ padding: "12px 26px 0" }}>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: "10px 12px",
              border: `1px solid ${acknowledged ? "#fca5a5" : "#e2e8f0"}`,
              background: acknowledged ? "#fef2f2" : "#f8fafc",
              borderRadius: 8,
              cursor: "pointer",
              transition: "background 120ms ease, border-color 120ms ease",
            }}
          >
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              style={{ marginTop: 3, accentColor: "#dc2626", cursor: "pointer" }}
            />
            <span style={{ fontSize: 12.5, color: "#0f172a", lineHeight: 1.5 }}>
              I understand I'm skipping a contract that's already in place, and that my reason
              above will be saved against my name on the record.
            </span>
          </label>
        </div>

        {/* ACTIONS */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            padding: "16px 26px 22px",
            marginTop: 6,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#475569",
              padding: "9px 18px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Go back &amp; use the contract
          </button>
          <button
            type="button"
            onClick={() => submitEnabled && onConfirm(trimmed)}
            disabled={!submitEnabled}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              border: "none",
              background: submitEnabled ? "linear-gradient(90deg, #dc2626 0%, #b91c1c 100%)" : "#fecaca",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              cursor: submitEnabled ? "pointer" : "not-allowed",
              boxShadow: submitEnabled ? "0 2px 6px rgba(220,38,38,0.25)" : "none",
              transition: "background 120ms ease, box-shadow 120ms ease",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 16,
                height: 16,
                borderRadius: 999,
                background: "rgba(255,255,255,0.22)",
                color: "#fff",
                fontSize: 10,
                fontWeight: 800,
              }}
            >
              !
            </span>
            Yes, skip contract &amp; send the RFQ
          </button>
        </div>
      </div>
    </>
  );
};

export default BypassArcReasonModal;
