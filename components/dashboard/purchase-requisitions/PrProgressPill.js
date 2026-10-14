import React from "react";
import { PROGRESS_LABEL, HEADER_PROGRESS_LABEL } from "./prFormat";

const TONE = {
  pending: "neutral",
  in_pool: "info",
  needs_mapping: "warn",
  awaiting_catalog: "warn",
  in_sourcing: "info",
  ordered: "success",
  closed: "neutral",
  cancelled: "neutral",
  in_queue: "info",
  partly_in_sourcing: "info",
  partly_ordered: "success",
  completed: "success",
};

/** Line progress by default; pass `header` for the PR-level header_progress. */
export default function PrProgressPill({ progress, header = false }) {
  if (!progress) return null;
  const labels = header ? HEADER_PROGRESS_LABEL : PROGRESS_LABEL;
  return (
    <span className={`status-pill ${TONE[progress] || "neutral"}`}>
      <span className="dot" />
      <span>{labels[progress] || progress}</span>
    </span>
  );
}
