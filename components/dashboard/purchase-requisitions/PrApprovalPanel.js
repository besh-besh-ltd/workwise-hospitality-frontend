// Approval: the decision banner (buttons ONLY from capabilities.approval — the
// engine's can_user_approve ignores scope and separation of duties) and the
// chain, with policy steps that don't apply shown greyed in policy order.

import {
  NO_APPROVER_COPY, NO_APPROVER_RECOVERY, approvalRows, eligibleApprovers, fmtDateTime, initialsOf, namesList, skipCopy,
} from "./prDetail";

const RULE = { ANY: "any one of them approves", ALL: "all of them must approve" };

/** "Your decision is needed" + Approve / Reject / Send back, per capability flag. */
export function PrDecisionBanner({ rights, approval, busy, onApprove, onReject, onSendBack }) {
  if (!rights || !(rights.can_approve || rights.can_reject || rights.can_send_back)) return null;
  const stepNo = approval?.current_step;
  const total = approval?.total_steps;
  return (
    <div className="guide warn" style={{ display: "block" }} data-testid="decision-banner">
      <div>
        <strong>Your decision is needed</strong>
        {stepNo && total ? ` — you are an approver on step ${stepNo} of ${total}.` : "."}
      </div>
      <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--fg-2)" }}>
        Approve moves the PR to the next step, or to the purchase team after the last step. Reject ends it.
        Send back returns it to the requester to change and resubmit.
      </div>
      {!rights.can_approve && (
        <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--fg-2)" }}>
          You can&apos;t approve this step: your role no longer carries purchase requisition approval here. You can still
          reject it or send it back. Ask your admin if you should be able to approve.
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
        {rights.can_approve && <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={onApprove}>Approve</button>}
        {rights.can_send_back && <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={onSendBack}>Send back</button>}
        {rights.can_reject && <button type="button" className="btn btn-outline-danger btn-sm" disabled={busy} onClick={onReject}>Reject</button>}
      </div>
    </div>
  );
}

const HEAD_SUB = {
  PENDING: (a) => `Step ${a.current_step} of ${a.total_steps}`,
  APPROVED: () => "Every step approved",
  REJECTED: () => "Rejected",
  CANCELLED: () => "Stopped — the PR was sent back or withdrawn",
};

function StepRow({ step, approval }) {
  const approvers = (step.approvers || []).filter((a) => a.status !== "REMOVED");
  const actor = approvers.find((a) => a.status === "APPROVED" || a.status === "REJECTED");
  const approved = step.status === "APPROVED";
  const rejected = step.status === "REJECTED";
  const live = approval.status === "PENDING";
  const isCurrent = live && step.status === "PENDING" && step.step_order === approval.current_step;
  const eligible = eligibleApprovers(step);
  const noEligible = isCurrent && eligible.length === 0;
  const names = approvers.map((a) => `${a.user_name}${a.account_active === false ? " (inactive account)" : ""}`);
  const who = noEligible ? NO_APPROVER_COPY : actor?.user_name || namesList(names) || `Step ${step.step_order}`;
  const comments = approvers.filter((a) => a.comment);

  let pill = <span className="vote-pill-mr pending">Pending</span>;
  if (approved) pill = <span className="vote-pill-mr approved">✓ Approved</span>;
  else if (rejected) pill = <span className="vote-pill-mr rejected">✗ Rejected</span>;
  else if (noEligible) pill = <span className="vote-pill-mr rejected">Stuck</span>;
  else if (isCurrent) pill = <span className="vote-pill-mr pending">● Current</span>;
  else if (step.status === "SKIPPED") pill = <span className="vote-pill-mr pending">Skipped</span>;
  else if (!live) pill = <span className="vote-pill-mr pending">Not reached</span>;

  return (
    <div className="approval-step" data-testid={`approval-row-step-${step.step_order}`}>
      <div className={"as-av" + (approved ? " av-green" : rejected || noEligible ? " av-red" : "")}>{initialsOf(actor?.user_name || names[0] || "?")}</div>
      <div className="as-body">
        <div className="as-name" style={noEligible ? { color: "var(--danger)" } : undefined}>{who}</div>
        <div className="as-role">
          Step {step.step_order} of {approval.total_steps}
          {approvers.length > 1 && step.decision_rule ? ` · ${RULE[step.decision_rule] || step.decision_rule}` : ""}
          {step.added_mid_flight ? " · added after submission" : ""}
        </div>
        {isCurrent && !noEligible && (
          <div className="as-role">Waiting on {namesList(eligible.map((a) => a.user_name))}</div>
        )}
        {noEligible && <div className="as-role" style={{ color: "var(--danger)" }}>{NO_APPROVER_RECOVERY}</div>}
        {comments.map((a) => (
          <div key={a.user_id} className="as-comment"><strong>{a.user_name}:</strong> {a.comment}</div>
        ))}
      </div>
      <div className="as-right">
        {pill}
        {(actor?.acted_at || step.completed_at) && <span className="as-time">{fmtDateTime(actor?.acted_at || step.completed_at)}</span>}
      </div>
    </div>
  );
}

function SkipRow({ skip }) {
  return (
    <div className="approval-step" data-testid={`approval-row-skip-${skip.step_order}`} style={{ opacity: 0.6 }}>
      <div className="as-av">–</div>
      <div className="as-body">
        <div className="as-name">{skipCopy(skip)}</div>
        <div className="as-role">This approval level doesn&apos;t apply to this PR</div>
      </div>
      <div className="as-right">
        <span className="vote-pill-mr pending">{skip.reason === "below_threshold" ? "Not required" : "Skipped"}</span>
      </div>
    </div>
  );
}

const NOT_STARTED = {
  draft: "Not submitted yet. Submitting starts technical review (if any) and then approval.",
  returned: "Sent back to the requester. Approval starts again when it is resubmitted.",
  in_review: "Approval starts when every technical review is complete.",
};

export default function PrApprovalPanel({ approval, events, prStatus }) {
  const rows = approvalRows(approval, events);
  const stale = approval && approval.status === "CANCELLED" && prStatus !== "pending_approval";
  return (
    <div className="section-card" data-testid="pr-approval-panel">
      <div className="section-head">
        <div className="h-left">
          <div>
            <h2>{stale ? "Previous approval" : "Approval chain"}</h2>
            <div className="h-sub">
              {approval ? (HEAD_SUB[approval.status] || (() => approval.status))(approval) : "Not started"}
            </div>
          </div>
        </div>
      </div>
      <div className="section-body flush">
        {!approval && (
          <div style={{ padding: "12px 16px", fontSize: 12.5, color: "var(--fg-3)" }}>
            {NOT_STARTED[prStatus] || "There is no approval on this PR."}
          </div>
        )}
        {approval && rows.length === 0 && (
          <div style={{ padding: "12px 16px", fontSize: 12.5, color: "var(--fg-3)" }}>No approval steps.</div>
        )}
        {approval && rows.map((r) => (r.kind === "skip"
          ? <SkipRow key={r.key} skip={r.skip} />
          : <StepRow key={r.key} step={r.step} approval={approval} />))}
      </div>
    </div>
  );
}
