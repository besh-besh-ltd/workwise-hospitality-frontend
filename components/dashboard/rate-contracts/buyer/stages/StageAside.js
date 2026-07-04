// Shared right-rail components for the ARC v2 buyer lifecycle page.
// Exports:
//   StageColumns   — 2-col layout wrapper (main + sticky aside)
//   ActorFlowCard  — Item 3: per-stage who-acts / who-approves / next-stage
//   ApprovalDecisionCard — Item 2: highlighted approval decision card (right-sized buttons)

// ── helpers ──────────────────────────────────────────────────────────────────
function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── StageColumns ─────────────────────────────────────────────────────────────
export function StageColumns({ children, aside }) {
  if (!aside) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {children}
      </div>
    );
  }
  return (
    <div className="arc-stage-cols">
      <div className="arc-stage-main">{children}</div>
      <aside className="arc-stage-aside">{aside}</aside>
    </div>
  );
}

// Stage order — used to derive the blocking (prior) stage label for locked cards.
const STAGE_PREV_LABEL = {
  technical: "Overview",
  commercial: "Technical Evaluation",
  awarding:  "Commercial",
  active:    "Awarding",
};

// ── ActorFlowCard ─────────────────────────────────────────────────────────────
// Driven by stage.flow + stage.actors (added by backend Item 3).
// Handles missing data gracefully (old sessions, loading).
export function ActorFlowCard({ stage }) {
  const flow = stage?.flow || null;
  const actors = stage?.actors || null;
  const stageState = stage?.state;

  // Terminal: ended
  if (stageState === "ended") {
    return (
      <div className="actor-card">
        <div className="afc-head"><div className="afc-title">Stage info</div></div>
        <div className="afc-body">
          <div className="afc-state-msg">Contract ended — this stage is the final record.</div>
        </div>
      </div>
    );
  }
  // Locked: not reached yet — name the PRIOR stage so the message reads as
  // real guidance ("Opens once Technical Evaluation is approved"), not a
  // self-reference that echoes the current stage's own role.
  if (stageState === "locked") {
    const blockingLabel = STAGE_PREV_LABEL[stage?.key] || "the preceding stage";
    return (
      <div className="actor-card">
        <div className="afc-head"><div className="afc-title">Stage info</div></div>
        <div className="afc-body">
          <div className="afc-state-msg">Opens once the {blockingLabel} stage is approved.</div>
          {flow && (
            <div className="afc-row">
              <div className="afc-label">Will be handled by</div>
              <div className="afc-value">{flow.action_taker_role}</div>
            </div>
          )}
        </div>
      </div>
    );
  }
  // No data yet
  if (!flow && !actors) return null;

  const approver = actors?.approver || null;
  const actionTaker = actors?.action_taker || null;
  const nextStage = actors?.next_stage || null;
  const contact = actors?.contact || null;

  const approverStatusLabel = () => {
    if (!approver) return null;
    if (approver.status === "APPROVED") return { text: "Approved", cls: "success" };
    if (approver.status === "REJECTED") return { text: "Sent back", cls: "danger" };
    if (approver.status === "PENDING") return { text: "Reviewing", cls: "warn" };
    if (approver.status === "NONE") return { text: "Not started", cls: "neutral" };
    return null;
  };
  const approverPill = approverStatusLabel();

  return (
    <div className="actor-card">
      <div className="afc-head">
        <div className="afc-title">Who&apos;s involved · what happens next</div>
      </div>
      <div className="afc-body">
        {/* Action taker */}
        {actionTaker && (
          <div className="afc-row">
            <div className="afc-label">Acts here</div>
            <div className="afc-value">{actionTaker.role}</div>
            {actionTaker.people && actionTaker.people.length > 0 && (
              <div className="afc-people">
                {actionTaker.people.slice(0, 2).map((p) => (
                  <div key={p.user_id || p.id || p.email} className="afc-person">
                    <div className="afc-av">{initials(p.name)}</div>
                    <span className="afc-pname">{p.name}</span>
                  </div>
                ))}
                {actionTaker.people.length > 2 && (
                  <div className="afc-sub">+{actionTaker.people.length - 2} more</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Approver */}
        {approver !== undefined && (
          <div className="afc-row">
            <div className="afc-label">Approves</div>
            {approver === null ? (
              <div className="afc-sub">No approval needed</div>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div className="afc-value">{approver.role}</div>
                  {approverPill && (
                    <span className={`status-pill ${approverPill.cls}`} style={{ fontSize: 9.5, padding: "2px 8px" }}>
                      <span className="dot" />{approverPill.text}
                    </span>
                  )}
                </div>
                {approver.step_label && (
                  <div className="afc-sub">{approver.step_label}</div>
                )}
                {approver.can_user_approve && (
                  <span className="your-action" style={{ fontSize: 9.5, padding: "2px 8px", marginTop: 4, display: "inline-flex" }}>
                    You approve this stage
                  </span>
                )}
                {approver.unassigned && (
                  <div className="afc-sub" style={{ color: "var(--warn)" }}>No approver configured</div>
                )}
                {approver.people && approver.people.length > 0 && approver.status === "PENDING" && (
                  <div className="afc-people">
                    {approver.people.slice(0, 2).map((p) => (
                      <div key={p.user_id || p.email} className="afc-person">
                        <div className="afc-av">{initials(p.name)}</div>
                        <div>
                          <div className="afc-pname">{p.name}</div>
                          {p.designation && <div className="afc-sub" style={{ fontSize: 10.5 }}>{p.designation}</div>}
                        </div>
                      </div>
                    ))}
                    {approver.people.length > 2 && (
                      <div className="afc-sub">+{approver.people.length - 2} more</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Moves to */}
        {flow && (
          <div className="afc-row">
            <div className="afc-label">Moves to</div>
            <div className="afc-next">
              <span className="afc-next-arrow">→</span>
              <div className="afc-value">{nextStage ? nextStage.label : "Final stage"}</div>
            </div>
          </div>
        )}

        {/* Contact */}
        {contact && (
          <div className="afc-contact">
            <div className="afc-contact-label">Contact to clear this stage</div>
            <div className="afc-contact-name">{contact.name}{contact.plus ? ` +${contact.plus} more` : ""}</div>
            <div className="afc-contact-role">{contact.role}</div>
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="afc-contact-email">{contact.email}</a>
            )}
            {contact.mobile && (
              <div className="afc-contact-mobile">{contact.mobile}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ApprovalDecisionCard ──────────────────────────────────────────────────────
// Props:
//   heading, stepLabel, approvers (people array for context — read-only)
//   comment, setComment, commentError
//   onApprove, onReject, busy
//   approveLabel, rejectLabel
//   children (optional extras — e.g. amend-marks checkbox)
export function ApprovalDecisionCard({
  heading = "Your decision",
  stepLabel,
  approvers,
  comment,
  setComment,
  commentError,
  onApprove,
  onReject,
  busy,
  approveLabel = "Approve",
  rejectLabel = "Reject",
  children,
}) {
  return (
    <div className="approve-aside">
      <div className="aa-head">
        <div className="here-now">{heading}</div>
        {stepLabel && <div className="aa-step">{stepLabel}</div>}
      </div>

      {/* Compact approvers list (read-only context) */}
      {approvers && approvers.length > 0 && (
        <div className="aa-approvers">
          {approvers.slice(0, 3).map((ap) => (
            <div key={ap.user_id || ap.email} className="mem-row" style={{ padding: "6px 0", gridTemplateColumns: "24px 1fr" }}>
              <div className="mr-av" style={{ width: 24, height: 24, fontSize: 9, borderRadius: 6 }}>{initials(ap.name || ap.user_name)}</div>
              <div className="mr-meta">
                <div className="mr-name" style={{ fontSize: 12 }}>{ap.name || ap.user_name}</div>
                {(ap.designation || ap.user_designation) && (
                  <div className="mr-role" style={{ fontSize: 10.5 }}>{ap.designation || ap.user_designation}</div>
                )}
              </div>
            </div>
          ))}
          {approvers.length > 3 && (
            <div style={{ fontSize: 11, color: "var(--fg-4)", paddingTop: 4 }}>+{approvers.length - 3} more</div>
          )}
        </div>
      )}

      {/* Optional extras slot (e.g. amend-marks checkbox in TechnicalStage) */}
      {children && <div className="aa-children">{children}</div>}

      {/* Comment */}
      <label className="aa-comment-label">
        Comment
        <span style={{ marginLeft: 6, fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99, background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid rgba(185,28,28,0.24)" }}>
          required to reject
        </span>
      </label>
      <textarea
        value={comment}
        onChange={(e) => { setComment(e.target.value); }}
        placeholder="Remark for the approval trail — mandatory if you reject…"
        className={`aa-comment${commentError ? " has-error" : ""}`}
      />
      {commentError && (
        <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--danger)", fontWeight: 600 }}>Add a reason before rejecting.</div>
      )}

      <div className="aa-btns">
        <button type="button" className="btn btn-danger btn-sm" disabled={busy} onClick={() => onReject()}>
          {rejectLabel}
        </button>
        <button type="button" className="btn btn-success btn-sm" disabled={busy} onClick={() => onApprove()}>
          {busy ? "Submitting…" : approveLabel}
        </button>
      </div>
    </div>
  );
}
