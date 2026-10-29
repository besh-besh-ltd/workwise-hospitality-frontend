import React from "react";
import { REJECTION_REASONS } from "./receiveUtils";
import styles from "./receive.module.scss";

// Why goods were rejected at the door (backend REJECTION_REASONS). Required as
// soon as a line has any rejected qty; the vendor sees the reason.

const RejectReasonSelect = ({ value, onChange, label, invalid = false, className = "", id, disabled = false }) => (
  <select
    id={id}
    className={`${styles.select} ${invalid ? styles.inputInvalid : ""} ${className}`}
    value={value || ""}
    onChange={(e) => onChange(e.target.value)}
    aria-label={label}
    aria-invalid={invalid || undefined}
    disabled={disabled}
  >
    <option value="">Reason…</option>
    {REJECTION_REASONS.map((r) => (
      <option key={r.value} value={r.value}>{r.label}</option>
    ))}
  </select>
);

export default RejectReasonSelect;
