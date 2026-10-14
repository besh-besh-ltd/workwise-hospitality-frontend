import React from "react";
import { HEADER_PROGRESS_LABEL, lineProgressLabel } from "./prFormat";

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

/**
 * Line progress by default (pass the PR's `prStatus` so a pending line says
 * what it waits on); pass `header` for the PR-level header_progress.
 */
export default function PrProgressPill({ progress, header = false, prStatus = null }) {
  if (!progress) return null;
  const label = header ? HEADER_PROGRESS_LABEL[progress] || progress : lineProgressLabel(progress, prStatus);
  return (
    <span className={`status-pill ${TONE[progress] || "neutral"}`}>
      <span className="dot" />
      <span>{label}</span>
    </span>
  );
}
