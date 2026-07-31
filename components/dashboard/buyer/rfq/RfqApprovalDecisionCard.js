// RfqApprovalDecisionCard — the buyer's Approve / Reject surface on the single
// RFQ workspace page (rfq-management-details → ViewRFQ).
//
// The workspace rewrite replaced the page body that used to own the approve /
// reject buttons (RFQLifecycleJourney) with the stage-timeline layout, which
// shipped with no decision control at all: RfqStageTimeline only *says* "Your
// approval needed". This card is that missing control. It renders next to the
// timeline rather than inside a stage panel, so it is visible on every stage —
// an RFQ, technical, negotiation, quote or PO approval all surface here.
//
// Contract — GET /rfq/:id/lifecycle (rfqLifecycleShaper):
//   { action: { required, can_approve, label, instance_id },
//     stages: [{ key, label, phase: { approval_instances: [...] } }] }
// `action` is the authority on whether this user may decide; the per-phase
// `approval_instances` carry the step id and approver context we need for the
// payload and the header line. Neither is trusted alone — the resolver falls
// back across both so it keeps working if either side of the payload shifts.
//
// Styling follows this directory's convention (RfqStageTimeline / StageShared):
// global arc_v2.css primitives (.approve-aside, .aa-*, .btn) plus inline styles.
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ShieldCheck } from "lucide-react";

import { submitApprovalAction } from "@/services/approval";

// Anchor id — deep links from the "Waiting on you" queue arrive with
// ?focus=approval and scroll to this element.
export const APPROVAL_DECISION_ANCHOR_ID = "rfq-approval-decision";

/**
 * Resolve the live approval instance the caller has to decide on, or null.
 *
 * TWO authorization signals, and we honour either:
 *
 *  1. `action.can_approve` — the top-level grant from getLifecycleSummary.
 *  2. a stage's `phase.approval_instances[].can_user_approve` on a PENDING
 *     instance — computed per instance by generalModel (the caller is a PENDING
 *     approver on the instance's CURRENT step, and the instance is PENDING).
 *
 * (2) matters because (1) deliberately skips "expired" phases — an RFQ that
 * auto-published while its approval was still pending. In production that is
 * not an edge case: it is EVERY outstanding RFQ approval, so gating on (1)
 * alone would leave the queue just as unclickable as it was. The approval
 * instance is still PENDING and the action endpoint still accepts it — it
 * re-runs the same authorization (instance PENDING → current step → the
 * caller's approver row PENDING → hospitality scope) before writing anything,
 * so trusting the per-instance flag here can't grant rights the server won't.
 *
 * @param {object} lifecycle GET /rfq/:id/lifecycle payload
 * @returns {null | {
 *   instanceId: number, stepId: number|null, currentStep: number|null,
 *   totalSteps: number|null, entityType: string|null, stageLabel: string|null,
 *   label: string|null, lapsed: boolean, approvers: Array,
 * }}
 */
export function resolveRfqApprovalDecision(lifecycle) {
  const action = lifecycle?.action || null;
  const stages = Array.isArray(lifecycle?.stages) ? lifecycle.stages : [];

  let exact = null;
  let anyPending = null;
  for (const stage of stages) {
    const instances = stage?.phase?.approval_instances;
    if (!Array.isArray(instances)) continue;
    for (const inst of instances) {
      if (inst?.status !== "PENDING" || !inst?.can_user_approve) continue;
      if (action?.instance_id != null && Number(inst.id) === Number(action.instance_id)) {
        exact = { inst, stage };
        break;
      }
      if (!anyPending) anyPending = { inst, stage };
    }
    if (exact) break;
  }

  const hit = exact || anyPending;
  // No instance the server says this user may act on, and no top-level grant
  // either → this user is not an approver here. Render nothing.
  if (!hit && !action?.can_approve) return null;

  const inst = hit?.inst || null;
  // Instance id is the one field the endpoint genuinely requires. Prefer the
  // resolved instance, fall back to the top-level action, bail if neither.
  const instanceId = inst?.id ?? action?.instance_id ?? null;
  if (instanceId == null) return null;

  const currentStep = inst?.current_step ?? null;
  const stepRow = Array.isArray(inst?.steps)
    ? inst.steps.find((s) => Number(s.step_order) === Number(currentStep)) || null
    : null;

  // The RFQ went live before this approval was completed. Worth saying out
  // loud: the decision still closes the audit trail, it just no longer gates
  // publication.
  const lapsed =
    hit?.stage?.phase?.status === "expired" || hit?.stage?.reason === "expired_pending";

  // The matched stage carries its own copy of the action block; prefer it over
  // the top-level one, since it is the one scoped to THIS instance.
  const stageAction = hit?.stage?.action || null;

  return {
    instanceId: Number(instanceId),
    // The caller's own row on the current step. Optional on the endpoint (the
    // server resolves it from the approver when absent) but passing the real
    // one is stricter — it makes the server reject a stale step outright
    // instead of silently acting on whatever the current step now is.
    stepId: inst?.user_approval_step_id
      ?? stageAction?.step_id
      ?? action?.instance_step_id
      ?? action?.step_id
      ?? null,
    currentStep,
    totalSteps: inst?.total_steps ?? null,
    entityType: inst?.entity_type || stageAction?.entity_type || action?.entity_type || null,
    stageLabel: hit?.stage?.label || null,
    // Only trust the top-level copy when the top-level grant is what got us
    // here; otherwise it describes a different (evaluator) role.
    label: action?.can_approve ? (action.label || null) : null,
    lapsed,
    approvers: Array.isArray(stepRow?.approvers) ? stepRow.approvers : [],
  };
}

// Service errors arrive as { message: <axios error> } (services/approval.js) —
// dig out the server's message before falling back to something generic.
const errText = (err) =>
  err?.message?.response?.data?.message ||
  err?.response?.data?.message ||
  (typeof err?.message === "string" ? err.message : null) ||
  "Could not submit your decision. Please try again.";

export default function RfqApprovalDecisionCard({
  lifecycle,
  entityLabel = "RFQ",
  onDecided,
}) {
  const decision = useMemo(() => resolveRfqApprovalDecision(lifecycle), [lifecycle]);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!decision) return null;

  const act = async (action) => {
    // Rejection always needs a reason — it lands in the audit trail and is the
    // only thing the creator gets back. Matches the MR + ARC decision flows.
    if (action === "REJECT" && !comment.trim()) {
      setCommentError(true);
      return;
    }
    setBusy(true);
    try {
      const payload = { approval_instance_id: decision.instanceId, action };
      if (decision.stepId) payload.approval_instance_step_id = decision.stepId;
      if (comment.trim()) payload.comment = comment.trim();
      const res = await submitApprovalAction(payload);
      // The API envelope can carry a business failure on a 200.
      if (res && res.status != null && Number(res.status) !== 1) {
        toast.error(res.message || "Could not submit your decision.");
        return;
      }
      toast.success(
        action === "APPROVE" ? `${entityLabel} approved` : `${entityLabel} rejected`,
      );
      setComment("");
      setCommentError(false);
      await onDecided?.();
    } catch (err) {
      toast.error(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const stepLabel =
    decision.currentStep && decision.totalSteps
      ? `Step ${decision.currentStep} of ${decision.totalSteps}`
      : null;
  const approverNames = decision.approvers
    .map((a) => a.user_name)
    .filter(Boolean)
    .join(", ");

  return (
    <section
      id={APPROVAL_DECISION_ANCHOR_ID}
      className="approve-aside"
      style={{ padding: 14 }}
      aria-label={`${entityLabel} approval decision`}
    >
      <div className="aa-head" style={{ marginBottom: 8 }}>
        <div className="here-now">Your decision is needed</div>
        {stepLabel && <div className="aa-step">{stepLabel}</div>}
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 7,
              fontSize: 13.5, fontWeight: 600, color: "var(--fg, #18181b)",
            }}
          >
            <ShieldCheck size={15} strokeWidth={2} />
            {decision.stageLabel
              ? `${decision.stageLabel} — awaiting your approval`
              : `${entityLabel} awaiting your approval`}
            {decision.lapsed && (
              <span
                style={{
                  fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  background: "var(--warn-soft, #fffbeb)", color: "var(--warn, #b45309)",
                  border: "1px solid rgba(180,83,9,0.24)",
                }}
              >
                Auto-published
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-3, #71717a)", lineHeight: 1.55, marginTop: 5 }}>
            {decision.lapsed
              ? `This ${entityLabel} auto-published while the approval was still open, so your decision no longer gates publication — it closes the approval on record.`
              : decision.label
                || `You are the current approver. Approving moves this ${entityLabel} to the next stage; rejecting sends it back with your reason.`}
          </div>
          {approverNames && (
            <div style={{ fontSize: 11.5, color: "var(--fg-3, #71717a)", marginTop: 7 }}>
              <span style={{ fontWeight: 600, color: "var(--fg-2, #3f3f46)" }}>On this step:</span>{" "}
              {approverNames}
            </div>
          )}
        </div>

        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <label className="aa-comment-label" htmlFor="rfq-approval-comment">
            Comment
            <span
              style={{
                marginLeft: 6, fontSize: 9.5, fontWeight: 700, padding: "1px 7px",
                borderRadius: 99, background: "var(--danger-soft, #fef2f2)",
                color: "var(--danger, #b91c1c)", border: "1px solid rgba(185,28,28,0.24)",
              }}
            >
              required to reject
            </span>
          </label>
          <textarea
            id="rfq-approval-comment"
            className={`aa-comment${commentError ? " has-error" : ""}`}
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (commentError && e.target.value.trim()) setCommentError(false);
            }}
            placeholder="Remark for the approval trail — mandatory if you reject…"
          />
          {commentError && (
            <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--danger, #b91c1c)", fontWeight: 600 }}>
              Add a reason before rejecting.
            </div>
          )}
          <div className="aa-btns">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={busy}
              onClick={() => act("REJECT")}
            >
              Reject
            </button>
            <button
              type="button"
              className="btn btn-success btn-sm"
              disabled={busy}
              onClick={() => act("APPROVE")}
            >
              {busy ? "Submitting…" : "Approve"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
