// Technical review: one row per reviewing department (reviews[]), and — for an
// eligible reviewer (capabilities.review) — Complete review / Send back.

import { useState } from "react";
import { REVIEW_STATUS_LABEL, fmtDateTime, initialsOf, namesList } from "./prDetail";

const NOTE_MAX = 2000;

const pillClass = { completed: "approved", sent_back: "rejected" };

function ReviewRow({ r, lineNoById }) {
  const nos = (r.line_ids || []).map((id) => lineNoById.get(id)).filter(Boolean);
  const done = r.status === "completed";
  const back = r.status === "sent_back";
  return (
    <div className="approval-step" data-testid={`review-row-${r.id}`} style={r.status === "superseded" ? { opacity: 0.6 } : undefined}>
      <div className={"as-av" + (done ? " av-green" : back ? " av-red" : "")}>{initialsOf(r.department_title)}</div>
      <div className="as-body">
        <div className="as-name">
          {r.department_title}
          {r.self_reviewed && (
            <span className="status-pill warn" style={{ marginLeft: 8 }} title="The requester reviewed their own PR">Self-reviewed</span>
          )}
        </div>
        <div className="as-role">
          {nos.length ? `Item${nos.length === 1 ? "" : "s"} ${nos.join(", ")}` : "Items"}
          {r.revision ? ` · revision ${r.revision}` : ""}
          {r.acted_by_name ? ` · ${back ? "sent back" : "reviewed"} by ${r.acted_by_name}` : ""}
        </div>
        {r.status === "pending" && !r.no_eligible_reviewer && r.eligible_reviewers?.length > 0 && (
          <div className="as-role">Waiting on {namesList(r.eligible_reviewers)}</div>
        )}
        {r.status === "pending" && r.no_eligible_reviewer && (
          <div className="as-role" style={{ color: "var(--danger)", fontWeight: 600 }}>No eligible reviewer — contact your admin</div>
        )}
        {r.note && <div className="as-comment">{r.note}</div>}
      </div>
      <div className="as-right">
        <span className={`vote-pill-mr ${pillClass[r.status] || "pending"}`}>{REVIEW_STATUS_LABEL[r.status] || r.status}</span>
        {r.acted_at && <span className="as-time">{fmtDateTime(r.acted_at)}</span>}
      </div>
    </div>
  );
}

/**
 * props: reviews, lines, review (capabilities.review | null), prStatus,
 *        busy, onComplete(note), onSendBack()
 */
export default function PrReviewPanel({ reviews = [], lines = [], review, prStatus, busy, onComplete, onSendBack }) {
  const [note, setNote] = useState("");
  const lineNoById = new Map(lines.map((l) => [l.id, l.line_no]));
  const mine = review ? reviews.find((r) => r.id === review.review_id) : null;
  const tooLong = note.length > NOTE_MAX;

  if (reviews.length === 0 && !review) return null;

  const complete = async () => {
    const ok = await onComplete(note.trim() || undefined);
    if (ok) setNote("");
  };

  return (
    <div className="section-card" data-testid="pr-review-panel">
      <div className="section-head">
        <div className="h-left">
          <div>
            <h2>Technical review</h2>
            <div className="h-sub">
              {prStatus === "in_review" ? "Each department signs off its items before approval starts" : "Department sign-off on the items"}
            </div>
          </div>
        </div>
      </div>
      <div className="section-body flush">
        {reviews.map((r) => <ReviewRow key={r.id} r={r} lineNoById={lineNoById} />)}
      </div>
      {review && (
        <div className="section-body" style={{ borderTop: "1px solid var(--border)", background: "var(--warn-soft)" }} data-testid="reviewer-actions">
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--fg)" }}>
            Your review{mine ? ` — ${mine.department_title}` : ""}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 4, lineHeight: 1.5 }}>
            Complete records your sign-off. When it is the last open review, the PR goes to approval.
            Send back returns the whole PR to the requester for changes and closes every open review.
          </div>
          <label className="label" htmlFor="pr-review-note" style={{ marginTop: 10 }}>
            Note <span className="text-fg-3">(optional)</span>
          </label>
          <textarea id="pr-review-note" aria-label="Review note" className="textarea" value={note}
            placeholder="Anything approvers should know about your review" onChange={(e) => setNote(e.target.value)} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8 }}>
            <span className="fs-11" style={{ color: tooLong ? "var(--danger)" : "var(--fg-4)" }}>{note.length}/{NOTE_MAX}</span>
            <span style={{ display: "flex", gap: 8 }}>
              <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={onSendBack}>Send back</button>
              <button type="button" className="btn btn-success btn-sm" disabled={busy || tooLong} onClick={complete}>Complete review</button>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
