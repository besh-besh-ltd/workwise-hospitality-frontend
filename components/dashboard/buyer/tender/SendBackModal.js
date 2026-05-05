import React, { useEffect, useState } from "react";

// Phase 3.5 — Send-Back modal for tender stages.
//
// The committee / approver picks a target stage (strictly earlier than
// the current one) and enters a reason ≥30 chars. Submit calls the
// caller-provided onSubmit(target_stage, reason) which is wired to
// performArcAction(rfq_id, 'send_to', target_stage, reason).
//
// Bespoke styling, no Bootstrap. Amber/warning accent matches the
// destructive nature of the action — it wipes live state.
//
// Props:
//   isOpen
//   fromStage  — current stage (UPPERCASE; matches BE matrix)
//   targetOptions — [{ value, label, description? }] — caller filters
//                   by which stages are reachable from fromStage.
//   onClose
//   onSubmit(target_stage, reason) → Promise

const MIN_LEN = 30;
const MAX_LEN = 2000;

const SendBackModal = ({
  isOpen,
  fromStage,
  targetOptions = [],
  onClose,
  onSubmit,
}) => {
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTarget("");
      setReason("");
      setSubmitting(false);
      setTouched(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN;
  const valid = !!target && reasonValid;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(target, trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.55)",
          zIndex: 2050,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sendback-modal-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(620px, calc(100vw - 32px))",
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(15,23,42,0.25)",
          zIndex: 2051,
          padding: "26px 28px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
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
            Send Back · {fromStage}
          </span>
        </div>

        <h3 id="sendback-modal-title" style={{ fontSize: 18, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
          Send the tender back to an earlier stage
        </h3>
        <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.5, margin: "0 0 14px" }}>
          The active state for stages between <strong>{fromStage}</strong> and your chosen target will be wiped. A
          full snapshot is preserved in the iteration history for audit. Vendor quotes are kept (the bid window
          reopens) unless you send all the way back to Draft.
        </p>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
          Target stage
        </label>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${touched && !target ? "#dc2626" : "#cbd5e1"}`,
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "inherit",
            background: "#fff",
            outline: "none",
            marginBottom: 16,
          }}
        >
          <option value="">Choose where to send it back to…</option>
          {targetOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
          Reason for send-back <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={5}
          maxLength={MAX_LEN}
          placeholder={`Be specific. Minimum ${MIN_LEN} characters — auditors review these.`}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: `1px solid ${touched && !reasonValid ? "#dc2626" : "#cbd5e1"}`,
            borderRadius: 8,
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11 }}>
          <span style={{ color: touched && !reasonValid ? "#dc2626" : "#94a3b8" }}>
            {trimmed.length < MIN_LEN
              ? `${MIN_LEN - trimmed.length} more character${MIN_LEN - trimmed.length === 1 ? "" : "s"} required`
              : "Looks good"}
          </span>
          <span style={{ color: "#94a3b8" }}>{trimmed.length} / {MAX_LEN}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#475569",
              padding: "9px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 500,
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            style={{
              border: "none",
              background: valid ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)" : "#fde68a",
              color: "#fff",
              padding: "9px 18px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: valid && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Sending back…" : "Send back"}
          </button>
        </div>
      </div>
    </>
  );
};

export default SendBackModal;
