import React from "react";
import { STATUS_LABEL } from "./prFormat";

// arc_v2 .status-pill tones per PR status.
const TONE = {
  draft: "neutral",
  in_review: "info",
  pending_approval: "warn",
  returned: "warn",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export default function PrStatusPill({ status }) {
  if (!status) return null;
  return (
    <span className={`status-pill ${TONE[status] || "neutral"}`}>
      <span className="dot" />
      <span>{STATUS_LABEL[status] || status}</span>
    </span>
  );
}
