// RfqApprovalWorkflowPanel — the publish-approval record on the RFQ workspace
// page's Overview tab.
//
// Before this existed, Overview showed no approval detail at all. The only
// approval surface on the page was RfqApprovalDecisionCard, which renders ONLY
// for the person whose decision is outstanding and disappears the moment it is
// made — so nobody could answer "who approved this, and when?" after the fact,
// and someone who was never an approver could not answer it at any point.
//
// It reads the payload the page has already fetched (GET /rfq/:id/lifecycle,
// stages[key=overview].phase) — no extra request, and no new surface exposing
// approver PII beyond what that endpoint already returns.
//
// Styling follows this directory's convention (RfqStageTimeline / StageShared):
// StageCard chrome + inline styles over arc_v2.css tokens.
import { ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react";

import { StageCard, ApprovalChain, StatusPill, fmtActedAt } from "./stages/StageShared";
import { isLapsedStage } from "./RfqApprovalDecisionCard";

const OVERVIEW_STAGE_KEY = "overview";

// The four outcomes a publish approval can have, and how each one should read.
// `published_without_approval` is the one the client reported: the publish date
// arrived while the approval was still open, so the RFQ went out anyway.
function describeOutcome(stage) {
  const phase = stage?.phase || null;
  const lapsed = !!phase?.published_without_approval || isLapsedStage(stage);

  if (lapsed) {
    return {
      tone: { bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca" },
      icon: <ShieldOff size={15} strokeWidth={2} />,
      title: "Published without approval",
      // Says what happened and what it means, without implying anyone can
      // still act — nobody can. The decision endpoint refuses it.
      body:
        "This RFQ reached its publish date while the approval below was still open. " +
        "Publication does not wait for approval, so the RFQ went out and the approval " +
        "was never completed. No decision is pending on it.",
    };
  }
  if (phase?.is_cancelled) {
    return {
      tone: { bg: "#f4f4f5", fg: "#71717a", bd: "#e4e4e7" },
      icon: <ShieldOff size={15} strokeWidth={2} />,
      title: "Approval cancelled",
      body: "The approval was cancelled — usually because the RFQ was withdrawn or terminated.",
    };
  }
  if (stage?.state === "complete") {
    const when = fmtActedAt(phase?.completed_at);
    return {
      tone: { bg: "#ecfdf3", fg: "#15803d", bd: "#bbf7d0" },
      icon: <ShieldCheck size={15} strokeWidth={2} />,
      title: "Approved before publication",
      body: when
        ? `The approval completed on ${when}, before this RFQ was published.`
        : "The approval completed before this RFQ was published.",
    };
  }
  return {
    tone: { bg: "#fffbeb", fg: "#b45309", bd: "#fde68a" },
    icon: <ShieldAlert size={15} strokeWidth={2} />,
    title: "Approval in progress",
    body: "This RFQ has not published yet. It is waiting on the approvers below.",
  };
}

export default function RfqApprovalWorkflowPanel({ lifecycle }) {
  const stages = Array.isArray(lifecycle?.stages) ? lifecycle.stages : [];
  const stage = stages.find((s) => s?.key === OVERVIEW_STAGE_KEY) || null;
  const phase = stage?.phase || null;
  const instances = Array.isArray(phase?.approval_instances) ? phase.approval_instances : [];

  // No approval was ever configured for this RFQ (the server sends
  // approval_instances: null and summarises it as "No approval configured").
  // A card explaining an absent workflow is noise — render nothing.
  if (!stage || !instances.length) return null;

  const outcome = describeOutcome(stage);

  return (
    <StageCard
      icon={<ShieldCheck size={14} strokeWidth={2} />}
      title="Publish approval"
      right={<StatusPill status={instances[instances.length - 1]?.status} />}
    >
      <div
        style={{
          display: "flex", gap: 9, alignItems: "flex-start", padding: "10px 12px",
          background: outcome.tone.bg, border: `1px solid ${outcome.tone.bd}`,
          borderRadius: 9,
        }}
      >
        <span style={{ color: outcome.tone.fg, flexShrink: 0, marginTop: 1 }}>{outcome.icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: outcome.tone.fg }}>{outcome.title}</div>
          <div style={{ fontSize: 11.5, color: "#52525b", lineHeight: 1.55, marginTop: 3 }}>{outcome.body}</div>
        </div>
      </div>

      {/* Every instance, step, approver, decision, timestamp and comment —
          including REMOVED approvers, kept visible as tombstones so the trail
          is not silently missing people. */}
      <ApprovalChain instances={instances} title="Approval workflow" />
    </StageCard>
  );
}
