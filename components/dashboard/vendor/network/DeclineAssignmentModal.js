import React, { useState } from "react";
import NetworkModal from "./NetworkModal";
import { DECLINE_REASONS, DECLINE_REASON_LABEL } from "./routingFormat";

// Mirrors MAX_DECLINE_NOTE in the backend routing engine.
const MAX_NOTE = 1000;

/**
 * Decline an assignment: a reason is required, and a note too when the reason
 * is OTHER (the server refuses it otherwise). onSubmit({ reason, note }) gets
 * the trimmed note, or null when empty.
 */
export default function DeclineAssignmentModal({ title, busy, onSubmit, onClose }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const trimmed = note.trim();
    if (!reason) return setError("Pick a reason.");
    if (reason === "OTHER" && !trimmed) return setError("Add a note when the reason is Other.");
    setError("");
    onSubmit({ reason, note: trimmed || null });
    return undefined;
  };

  return (
    <NetworkModal
      title="Decline assignment"
      sub={title}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={submit} disabled={busy}>
            {busy ? "Declining…" : "Decline"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <fieldset style={{ border: 0, margin: 0, padding: 0 }}>
          <legend className="label">Reason</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {DECLINE_REASONS.map((r) => (
              <label key={r} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="vn-decline-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => {
                    setReason(r);
                    setError("");
                  }}
                />
                {DECLINE_REASON_LABEL[r]}
              </label>
            ))}
          </div>
        </fieldset>
        <div>
          <label className="label" htmlFor="vn-decline-note">
            Note{reason === "OTHER" ? "" : " (optional)"}
          </label>
          <textarea
            id="vn-decline-note"
            className="textarea"
            maxLength={MAX_NOTE}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError("");
            }}
          />
          <div className="help-text">Your network admin sees this when re-routing the item.</div>
        </div>
        {error && <div style={{ color: "var(--danger)", fontSize: 12.5 }}>{error}</div>}
      </div>
    </NetworkModal>
  );
}
