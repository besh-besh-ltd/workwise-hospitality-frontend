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

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setTouched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN;

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 2010 }}
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
          width: "min(560px, calc(100vw - 32px))",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(15,23,42,0.25)",
          zIndex: 2011,
          padding: "24px 26px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background: "#fef3c7",
              color: "#92400e",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            ARC Override
          </span>
        </div>

        <h3 id="bypass-arc-modal-title" style={{ fontSize: 17, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
          Why are you floating an RFQ over an active contract?
        </h3>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, marginBottom: 14 }}>
          <strong>{productName}</strong> is already under an active rate contract. Bypassing the contract is logged for audit
          and will surface a prominent override banner across the RFQ. Please describe why a fresh competitive bid is needed
          (compliance, capacity, performance, expiry-soon, etc.).
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={5}
          maxLength={MAX_LEN}
          placeholder={`Minimum ${MIN_LEN} characters. Be specific — auditors review these.`}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${touched && !valid ? "#dc2626" : "#cbd5e1"}`,
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
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

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#475569",
              padding: "9px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => valid && onConfirm(trimmed)}
            disabled={!valid}
            style={{
              border: "none",
              background: valid ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)" : "#fde68a",
              color: "#fff",
              padding: "9px 18px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: valid ? "pointer" : "not-allowed",
            }}
          >
            Continue with RFQ
          </button>
        </div>
      </div>
    </>
  );
};

export default BypassArcReasonModal;
