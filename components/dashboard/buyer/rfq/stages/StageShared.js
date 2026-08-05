// Shared pieces for the RFQ lifecycle stage components: the no-permission
// panel, a generic content-aware stage skeleton, a read-only banner, and the
// StageCard — a card whose header matches the Overview cards (icon-in-rounded-
// box + bold label) so every stage's sections look consistent with ViewRFQ.
import { useState } from "react";
import moment from "moment";

// Approval timestamps are naive UTC out of Postgres. Render them in IST, the
// same way every other approval surface does (ApprovalTimeline, the lifecycle
// journeys) — a bare new Date() here would silently shift them by 5h30m.
export const fmtActedAt = (d) =>
  d ? moment.utc(d).utcOffset("+05:30").format("DD MMM YYYY, hh:mm a") : null;

// Mirrors ViewRFQ.module.scss .card / .cardHead / .cardTitleIcon exactly.
// `collapsible` makes the header toggle the body (chevron); the `right` actions
// keep working (their clicks don't toggle).
export function StageCard({ icon, title, right, children, collapsible = false, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = !collapsible || open;
  return (
    <section style={{ background: "#ffffff", border: "1px solid #ebebe6", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
      <header
        onClick={collapsible ? () => setOpen((o) => !o) : undefined}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: showBody ? "1px solid #ebebe6" : "none", background: "linear-gradient(180deg,#fdfdfb 0%,#ffffff 100%)", gap: 12, flexWrap: "wrap", cursor: collapsible ? "pointer" : "default", userSelect: collapsible ? "none" : "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: "#f4f4f1", border: "1px solid #ebebe6", display: "grid", placeItems: "center", color: "#71717a", flexShrink: 0 }}>{icon}</span>
          <h2 style={{ fontSize: 13.5, fontWeight: 600, color: "#18181b", letterSpacing: "-0.01em", margin: 0 }}>{title}</h2>
        </div>
        {(right || collapsible) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {right ? <span onClick={(e) => e.stopPropagation()} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>{right}</span> : null}
            {collapsible && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease", flexShrink: 0 }}><polyline points="6 9 12 15 18 9" /></svg>
            )}
          </div>
        )}
      </header>
      {showBody && <div style={{ padding: "18px 20px" }}>{children}</div>}
    </section>
  );
}


// ── Status pill + approval-chain renderer ────────────────────────────────
// Shared by every stage panel so the in-page surfaces show real status
// (approvers, decisions, pass/fail) — not just a one-line summary.

const PILL = {
  approved:  { bg: "#ecfdf3", fg: "#15803d", bd: "#bbf7d0" },
  pending:   { bg: "#fffbeb", fg: "#b45309", bd: "#fde68a" },
  rejected:  { bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca" },
  cancelled: { bg: "#f4f4f5", fg: "#71717a", bd: "#e4e4e7" },
  neutral:   { bg: "#f4f4f5", fg: "#52525b", bd: "#e4e4e7" },
};

function pillTone(status) {
  const s = String(status || "").toUpperCase();
  if (["APPROVED", "PASSED", "COMPLETED", "FINALIZED", "DONE", "ACCEPTED"].includes(s)) return PILL.approved;
  if (["PENDING", "IN_PROGRESS", "APPROVING", "ACTIVE", "ONGOING"].includes(s)) return PILL.pending;
  if (["REJECTED", "FAILED", "DECLINED"].includes(s)) return PILL.rejected;
  if (["CANCELLED", "SKIPPED", "REMOVED"].includes(s)) return PILL.cancelled;
  return PILL.neutral;
}

export function StatusPill({ status, label }) {
  const t = pillTone(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: t.bg, color: t.fg, border: `1px solid ${t.bd}`, whiteSpace: "nowrap" }}>
      {label || status || "—"}
    </span>
  );
}

// A REMOVED approver row is a mid-flight reconciler's soft-tombstone (their
// role/scope was revoked while the approval was in progress) — the row is
// kept for the audit trail, not deleted. `removal_reason` and `removed_at`
// are emitted for every approver row by rfqModel.formatApprovalInstances()
// (this branch lands them there) — but the value itself can still be null
// for a given row, so callers should degrade to a bare label when either
// is unset.
export function removalReasonLabel(reason) {
  switch (reason) {
    case "policy_change": return "Policy Change";
    case "role_removed": return "Role Change";
    case "role_permissions_changed": return "Role Permissions Changed";
    case "user_deactivated": return "Account Deactivation";
    case "dept_removed": return "Department Change";
    case "scope_removed": return "Scope Change";
    default: return reason || "Administrative Change";
  }
}

// Renders rfqModel.getLifecycleSummary() approval_instances: each instance →
// its steps → the approvers on each step, with a status dot + designation.
export function ApprovalChain({ instances, title = "Approvals" }) {
  const list = Array.isArray(instances) ? instances : [];
  if (!list.length) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#a1a1aa", marginBottom: 10 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {list.map((inst, ii) => {
          const steps = Array.isArray(inst?.steps) ? inst.steps : [];
          return (
            <div key={inst?.id || ii} style={{ border: "1px solid #ebebe6", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "8px 12px", background: "#fafafa", borderBottom: "1px solid #f0f0ec" }}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#3f3f46" }}>
                    {inst?.total_steps > 1 ? `Step ${inst?.current_step || 1} of ${inst.total_steps}` : "Approval"}
                  </span>
                  {(inst?.initiated_by?.name || inst?.created_at) && (
                    <span style={{ display: "block", fontSize: 10.5, color: "#a1a1aa", marginTop: 2 }}>
                      {inst?.initiated_by?.name ? `Raised by ${inst.initiated_by.name}` : "Raised"}
                      {fmtActedAt(inst?.created_at) ? ` · ${fmtActedAt(inst.created_at)}` : ""}
                    </span>
                  )}
                </span>
                <StatusPill status={inst?.status} />
              </div>
              <div style={{ padding: "4px 12px" }}>
                {steps.map((s, si) => {
                  const allApprovers = Array.isArray(s?.approvers) ? s.approvers : [];
                  // REMOVED rows are a mid-flight reconciler's soft-tombstone, not a
                  // live approver — keep them out of the active chip row and out of
                  // any count, but still show them (muted, separately) so the trail
                  // isn't silently missing people either.
                  const approvers = allApprovers.filter((a) => a?.status !== "REMOVED");
                  const removedApprovers = allApprovers.filter((a) => a?.status === "REMOVED");
                  return (
                    <div key={si} style={{ padding: "8px 0", borderBottom: si < steps.length - 1 ? "1px dashed #f0f0ec" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: (approvers.length || removedApprovers.length) ? 7 : 0 }}>
                        <span style={{ fontSize: 10, color: "#a1a1aa", fontWeight: 700 }}>L{s?.step_order || si + 1}</span>
                        {s?.decision_rule ? <span style={{ fontSize: 10, color: "#c4c4c8" }}>{s.decision_rule}</span> : null}
                        <StatusPill status={s?.status} />
                      </div>
                      {approvers.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {approvers.map((a, ai) => {
                            const acted = fmtActedAt(a?.acted_at);
                            return (
                              <div key={`active-${a?.user_id ?? ai}`} style={{ background: "#f7f7f5", border: "1px solid #ececec", borderRadius: 7, padding: "6px 9px" }}>
                                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#3f3f46", minWidth: 0 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: 999, background: pillTone(a?.status).fg, flexShrink: 0 }} />
                                    {a?.user_name || a?.user_email || "Approver"}
                                    {a?.user_designation ? <span style={{ color: "#a1a1aa" }}>· {a.user_designation}</span> : null}
                                  </span>
                                  {/* Who did what, and when — the question this
                                      panel exists to answer. A PENDING row has
                                      no acted_at, so it reads as the status
                                      alone and stays visibly outstanding. */}
                                  <span style={{ fontSize: 10.5, color: "#a1a1aa", whiteSpace: "nowrap" }}>
                                    {String(a?.status || "").toUpperCase() || "—"}
                                    {acted ? ` · ${acted}` : ""}
                                  </span>
                                </div>
                                {a?.comment ? (
                                  <div style={{ fontSize: 11, color: "#52525b", marginTop: 4, paddingLeft: 12, borderLeft: "2px solid #e4e4e7", lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                    {a.comment}
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {removedApprovers.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: approvers.length ? 6 : 0 }}>
                          {removedApprovers.map((a, ai) => {
                            const reasonLabel = a?.removal_reason ? removalReasonLabel(a.removal_reason) : null;
                            const title = [reasonLabel, a?.removed_at ? `Removed ${a.removed_at}` : null].filter(Boolean).join(" · ") || "Removed";
                            return (
                              <span key={`removed-${a?.user_id ?? ai}`} title={title} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "#a1a1aa", background: "#f4f4f5", border: "1px dashed #e4e4e7", borderRadius: 7, padding: "3px 8px" }}>
                                <span style={{ width: 6, height: 6, borderRadius: 999, background: "#a1a1aa", flexShrink: 0 }} />
                                <span style={{ textDecoration: "line-through" }}>{a?.user_name || a?.user_email || "Approver"}</span>
                                <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  Removed{reasonLabel ? ` · ${reasonLabel}` : ""}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function StageNoPermission({ stageLabel }) {
  return (
    <div className="empty-state" style={{ padding: "48px 24px" }}>
      <div className="ic">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h2>No permission to view {stageLabel}</h2>
      <p>
        You don't have permission to view {stageLabel} for this RFQ.
        Ask your administrator to grant you access.
      </p>
    </div>
  );
}

export function StageReadOnlyBanner({ children }) {
  return (
    <div className="guide" style={{ alignItems: "center" }}>
      <div className="g-ic" style={{ marginTop: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div>{children}</div>
    </div>
  );
}

const Sk = ({ w = "100%", h = 12, r, style }) => (
  <span className="arc-sk" style={{ display: "block", width: w, height: h, borderRadius: r, ...style }} />
);

export function StageSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="arc-sk-tile">
        <Sk w={220} h={15} style={{ marginBottom: 14 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Sk w="70%" h={9} style={{ marginBottom: 7 }} />
              <Sk w="85%" h={15} />
            </div>
          ))}
        </div>
      </div>
      {Array.from({ length: 2 }).map((_, c) => (
        <div key={c} className="arc-sk-tile">
          <Sk w={170} h={14} style={{ marginBottom: 14 }} />
          {Array.from({ length: 3 }).map((__, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < 2 ? "1px dashed var(--border)" : "none" }}>
              <Sk w={30} h={30} r={8} style={{ flexShrink: 0 }} />
              <Sk w="55%" h={13} style={{ flex: 1 }} />
              <Sk w={80} h={13} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Lifecycle context: who's acting now / who acts next ──────────────────────
// Resolves the people on a phase — prefers the live action-holders, falls back
// to the resolved upcoming evaluators/approvers.
function actorsOf(phase) {
  if (!phase) return null;
  const ah = phase.action_holders;
  if (ah && Array.isArray(ah.users) && ah.users.length) {
    return { label: ah.label || "Action holders", names: ah.users.map((u) => u.name), rule: ah.decision_rule || null };
  }
  const ua = phase.upcoming_actors;
  if (ua && Array.isArray(ua.approver_steps) && ua.approver_steps.length) {
    const s = ua.approver_steps[0];
    return { label: "Approvers", names: (s.approvers || []).map((a) => a.name), rule: s.decision_rule || null };
  }
  if (ua && Array.isArray(ua.evaluators) && ua.evaluators.length) {
    return { label: "Evaluators", names: ua.evaluators.map((e) => e.name), rule: null };
  }
  return null;
}

function ActorNames({ names, max = 3 }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <span style={{ color: "#3f3f46", fontWeight: 500 }}>
      {shown.join(", ")}{extra > 0 ? <span style={{ color: "#a1a1aa", fontWeight: 400 }}> +{extra}</span> : null}
    </span>
  );
}

const CtxLbl = ({ children }) => (
  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#a1a1aa", flexShrink: 0 }}>{children}</span>
);

// A subtle one-line strip surfacing the current + next action-takers for the
// RFQ's live stage. Renders nothing when nothing is in motion (draft/complete).
export function LifecycleContext({ lifecycle }) {
  const stages = Array.isArray(lifecycle?.stages) ? lifecycle.stages : [];
  const activeIdx = stages.findIndex((s) => s.state === "active");
  if (activeIdx < 0) return null;
  const active = stages[activeIdx];
  const nowActors = actorsOf(active.phase);
  const nextStage = stages.slice(activeIdx + 1).find((s) => s.state !== "skipped" && actorsOf(s.phase));
  const nextActors = nextStage ? actorsOf(nextStage.phase) : null;
  if (!nowActors && !nextActors) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", padding: "9px 14px", background: "#fafafa", border: "1px solid #ebebe6", borderRadius: 10, fontSize: 12.5 }}>
      {nowActors && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "#16a34a", flexShrink: 0 }} />
          <CtxLbl>Action now</CtxLbl>
          <span style={{ color: "#71717a" }}>{active.label} · {nowActors.label}{nowActors.rule === "ALL" ? " (all)" : ""}:</span>
          <ActorNames names={nowActors.names} />
        </div>
      )}
      {nextActors && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ color: "#d4d4d8" }}>→</span>
          <CtxLbl>Up next</CtxLbl>
          <span style={{ color: "#71717a" }}>{nextStage.label} · {nextActors.label}:</span>
          <ActorNames names={nextActors.names} />
        </div>
      )}
    </div>
  );
}
