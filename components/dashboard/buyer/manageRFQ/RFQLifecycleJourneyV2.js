// RFQLifecycleJourneyV2 — buyer-side lifecycle journey, redesigned to match the
// rfq_details_ui prototype (lines 465-608). This is a NEW presentational
// component used ONLY by ViewRFQ; the legacy RFQLifecycleJourney (shared with
// the vendor inquiry view) is left untouched. Both read the same
// /rfq/lifecycle-summary/:id endpoint via the useRFQLifecycleSummary hook.
//
// The prototype assumes a hand-authored stage shape (done/skipped/current with
// actor, date, owner, action, up-next). We derive that shape from the live
// phase[] payload. Fields the payload genuinely lacks are rendered as graceful
// fallbacks rather than fabricated.
import React, { useState, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import moment from "moment";

import useRFQLifecycleSummary from "@/hooks/useRFQLifecycleSummary";
import ApprovalActionModal from "@/components/dashboard/buyer/approval/ApprovalActionModal";

import styles from "./RFQLifecycleJourneyV2.module.scss";

const fmtDate = (d) =>
  d ? moment.utc(d).utcOffset("+05:30").format("DD MMM YY") : null;

// Avatar palette mirrors the prototype's named gradients; pick deterministically
// off the actor name so the same person keeps the same colour across stages.
const AVATAR_TONES = ["sky", "green", "warm", "rose", "indigo"];
const toneFor = (name) => {
  if (!name) return "sky";
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
};
const initialsOf = (name) => {
  if (!name) return "—";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const inr = (n) =>
  n != null && !Number.isNaN(Number(n))
    ? Number(n).toLocaleString("en-IN")
    : null;

// Map an upcoming/future phase key to a friendly "up next" item. Only used to
// describe stages that come AFTER the current one.
const UP_NEXT_DETAIL = {
  rfq_approval: "RFQ approval before publishing",
  technical: "Technical evaluation of vendor responses",
  commercial: "Commercial evaluation & negotiation",
  purchase_order: "Purchase order creation & approval",
};

// Friendly role label for the group we're waiting on, per phase.
const waitingRoleFor = (phase, kind) => {
  if (kind === "approver") return "Approvers";
  if (phase.key === "commercial") return "Commercial Evaluators";
  if (phase.key === "technical") return "Technical Evaluators";
  if (phase.key === "rfq_approval") return "Approvers";
  return "Action owners";
};

// Pull the live pending approval instance + its context for the current phase.
const deriveCurrent = (phase, summary) => {
  const instances = phase.approval_instances || [];
  const pending = instances.find((i) => i.status === "PENDING");
  const ah = phase.action_holders;
  const ua = phase.upcoming_actors;
  const subStatus = phase.sub_status; // evaluating | negotiating | approving (commercial)
  const isEvaluating = subStatus === "evaluating" || subStatus === "negotiating";

  // ── Who we're waiting on (ALL of them, not just the first) ──
  // During evaluation/negotiation the holders are the evaluators; during an
  // approval sub-stage they are the pending approvers / first approver step.
  let owners = [];
  let waitingKind = "evaluator";
  if (ah?.users?.length) {
    owners = ah.users;
    waitingKind = subStatus === "approving" ? "approver" : "evaluator";
  } else if (isEvaluating && ua?.evaluators?.length) {
    owners = ua.evaluators;
    waitingKind = "evaluator";
  } else if (ua?.approver_steps?.length) {
    owners = ua.approver_steps[0]?.approvers || [];
    waitingKind = "approver";
  } else if (ua?.evaluators?.length) {
    owners = ua.evaluators;
    waitingKind = "evaluator";
  }
  const waitingRole =
    waitingKind === "approver"
      ? "Approvers"
      : waitingRoleFor(phase, "evaluator");

  // Pending action text + ₹ context from the live instance metadata.
  // `user_action_label` is only set when the CURRENT user must act, so when
  // present we append a clear call-to-action.
  const userActionLabel = summary?.user_action_label || null;
  let action = userActionLabel;
  let context = null;
  let contextAmount = null;
  if (pending) {
    const m = pending.metadata || {};
    const poNo = m.po_number;
    if (poNo) action = action || `Approve PO #${poNo}`;
    const productName = m.product_name || m.po_payload?.product_info?.product_name;
    const vendor = m.vendor_name || m.po_payload?.vendor_company;
    context = [productName, vendor].filter(Boolean).join(" · ") || null;
    contextAmount = inr(m.po_payload?.total_value ?? m.total_value);
  }
  if (action === userActionLabel && userActionLabel) {
    action = `${userActionLabel.replace(/[.\s]+$/, "")} — please review accordingly.`;
  }
  if (!action) action = phase.summary || `${phase.label} in progress`;

  // Policy line. Evaluators act independently → "Anyone can act". Only an
  // actual approval step carries an ALL/ANY decision rule.
  let stepPolicy = null;
  if (isEvaluating) {
    stepPolicy = "Anyone can act";
  } else if (pending?.steps?.length) {
    const total = pending.steps.length;
    const cur = pending.current_step || 1;
    const rule = pending.steps[cur - 1]?.decision_rule;
    const ruleLabel =
      rule === "ALL" ? "All must approve" : rule === "ANY" ? "Any one can approve" : null;
    stepPolicy = `Step ${cur} of ${total}${ruleLabel ? ` · ${ruleLabel}` : ""}`;
  } else if (ua?.approver_steps?.length) {
    const step = ua.approver_steps[0];
    const ruleLabel = step.decision_rule === "ALL" ? "All must approve" : "Any one can approve";
    stepPolicy = `Step ${step.step_order || 1} of ${ua.approver_steps.length} · ${ruleLabel}`;
  }

  return {
    owners: owners.length
      ? owners.map((u) => ({
          name: u.name || "Unassigned",
          email: u.email || null,
          dept: u.department || waitingRole,
          initials: initialsOf(u.name),
          avatar: toneFor(u.name),
        }))
      : [{ name: "Awaiting assignment", email: null, dept: phase.label, initials: "—", avatar: "sky" }],
    waitingRole,
    action,
    context,
    contextAmount,
    stepPolicy,
    pendingInstance:
      pending && pending.can_user_approve && summary?.user_can_approve ? pending : null,
  };
};

// Build the "up next" list. For the commercial phase still in evaluation /
// negotiation, the immediate next step is Commercial Approval (from the policy's
// approver_steps) BEFORE any subsequent phase like Purchase Order.
const deriveUpNext = (phase, phases, idx) => {
  const list = [];
  const ua = phase.upcoming_actors;
  const subStatus = phase.sub_status;
  if (
    phase.key === "commercial" &&
    (subStatus === "evaluating" || subStatus === "negotiating") &&
    ua?.approver_steps?.length
  ) {
    list.push({
      name: "Commercial Approval",
      detail: "Approval of finalised commercial quotes",
    });
  }
  phases.slice(idx + 1).forEach((p) => {
    list.push({
      name: p.label,
      detail: p.summary || UP_NEXT_DETAIL[p.key] || "Next stage in the lifecycle",
    });
  });
  return list;
};

// Resolve a "done" stage's completing actor + date + meta line.
const deriveDone = (phase) => {
  const instances = phase.approval_instances || [];
  // Latest approved instance carries the approver chain; fall back to initiator.
  const approved = [...instances].reverse().find((i) => i.status === "APPROVED");
  let actor = approved?.current_step_actor?.name
    || approved?.steps?.find((s) => s.status === "APPROVED")?.actor?.name
    || approved?.initiated_by?.name
    || instances[instances.length - 1]?.initiated_by?.name
    || null;

  // Commercial-eval meta: "N products · N rounds" when available.
  let meta = null;
  if (phase.products?.length) {
    const productCount = phase.products.length;
    const totalRounds = phase.products.reduce(
      (acc, p) => acc + (p.negotiation_rounds?.length || 0),
      0,
    );
    const bits = [`${productCount} product${productCount === 1 ? "" : "s"}`];
    if (totalRounds > 0) bits.push(`${totalRounds} round${totalRounds === 1 ? "" : "s"}`);
    meta = bits.join(" · ");
  } else if (phase.purchase_orders?.length) {
    const n = phase.purchase_orders.length;
    meta = `${n} PO${n === 1 ? "" : "s"}`;
  }

  return {
    statusLabel: phase.status === "completed" ? "Approved" : "Completed",
    completedBy: actor,
    completedInitials: initialsOf(actor),
    completedAvatar: toneFor(actor),
    completedDate: fmtDate(phase.completed_at),
    meta,
  };
};

// Resolve an "expired" (auto-published) stage. The approval window lapsed
// without completion, so we surface WHO was still pending: the action holders
// (approvers who never acted) and any remaining approver-step approvers. If no
// names resolve, we fall back to a generic "the assigned approvers".
const deriveExpired = (phase) => {
  const ah = phase.action_holders;
  const ua = phase.upcoming_actors;

  const names = [];
  (ah?.users || []).forEach((u) => {
    if (u?.name) names.push(u.name);
  });
  (ua?.approver_steps || []).forEach((step) => {
    (step?.approvers || []).forEach((a) => {
      if (a?.name) names.push(a.name);
    });
  });
  const uniqueNames = [...new Set(names)];
  const pendingFrom = uniqueNames.length
    ? uniqueNames.join(", ")
    : "the assigned approvers";

  return {
    statusLabel: "Auto-published",
    pendingFrom,
    completedDate: fmtDate(phase.completed_at),
  };
};

// Skip reason — the payload doesn't carry a free-text reason, so map by phase.
const skipReasonFor = (phase) => {
  if (phase.skip_reason) return phase.skip_reason;
  if (phase.key === "technical") return "No clauses configured for this RFQ";
  return "Not applicable for this RFQ";
};

const RFQLifecycleJourneyV2 = ({ rfqId, isTender = false, closed = false, onActionComplete }) => {
  const { data, loading, actionLoading, submitAction } = useRFQLifecycleSummary(rfqId, {
    onActionComplete,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [actionInstance, setActionInstance] = useState(null);

  // Waiting-on hover tooltip — portaled to body so the scrollable journey
  // column can't clip it. Holds the owner list + a fixed-position anchor.
  const [tip, setTip] = useState(null); // { owners, role, left, top, placement }
  const closeTimerRef = useRef(null);

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openTip = useCallback((e, owners, role) => {
    cancelClose();
    const rect = e.currentTarget.getBoundingClientRect();
    const TIP_W = Math.max(rect.width, 268);
    const estHeight = 52 + owners.length * 40; // head + rows, approx
    // Prefer above; flip below if there isn't room above the viewport top.
    const above = rect.top - estHeight - 8 > 8;
    setTip({
      owners,
      role,
      left: Math.min(rect.left, window.innerWidth - TIP_W - 12),
      top: above ? rect.top - 4 : rect.bottom + 4,
      width: TIP_W,
      placement: above ? "above" : "below",
    });
  }, [cancelClose]);

  // Delay close so the mouse can travel from the stack into the tooltip
  // without it vanishing; entering the tooltip cancels the pending close.
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setTip(null), 160);
  }, [cancelClose]);

  const entityLabel = isTender ? "Tender" : "RFQ";

  // Translate phases → prototype stage shape.
  const stages = useMemo(() => {
    const phases = data?.phases || [];
    return phases.map((phase) => {
      // Normalize payload status (completed/current/skipped/upcoming/expired)
      // onto the prototype's done/skipped/current/expired/pending vocabulary.
      // `expired` is a TERMINAL state (an auto-published approval that lapsed) —
      // it is NOT the live focus stage, so it gets its own branch rather than
      // being folded into "current".
      let status = "pending";
      if (phase.status === "completed") status = "done";
      else if (phase.status === "skipped") status = "skipped";
      else if (phase.status === "current") status = "current";
      else if (phase.status === "expired") status = "expired";

      // When the whole RFQ is closed, the live stage can't be acted on anymore —
      // render it as a terminal "closed" stage rather than the live focus card.
      if (closed && status === "current") status = "closed";

      const base = { key: phase.key, name: phase.label, status, raw: phase };

      if (status === "done") return { ...base, ...deriveDone(phase) };
      if (status === "skipped") return { ...base, skipReason: skipReasonFor(phase) };
      if (status === "expired") return { ...base, ...deriveExpired(phase) };
      if (status === "closed") {
        return {
          ...base,
          statusLabel: "Closed",
          closedNote: "RFQ was closed at this stage — no further action can be taken.",
        };
      }
      if (status === "current") {
        const current = deriveCurrent(phase, data);
        const idx = phases.indexOf(phase);
        const upNext = deriveUpNext(phase, phases, idx);
        return {
          ...base,
          statusLabel: phase.status === "expired" ? "Auto-published" : "In progress",
          current,
          upNext,
        };
      }
      return { ...base, statusLabel: "Upcoming" };
    });
  }, [data, closed]);

  // `expired`/`closed` are terminal — treat them like a completed/skipped
  // segment so the progress bar advances past it and it never reads as the
  // live stage.
  const progressSegments = stages.map((s) =>
    s.status === "done" || s.status === "skipped" || s.status === "expired" || s.status === "closed"
      ? s.status
      : s.status === "current"
        ? "current"
        : "pending",
  );
  const progressPct = useMemo(() => {
    const total = stages.length || 1;
    const done = stages.filter(
      (s) => s.status === "done" || s.status === "skipped" || s.status === "expired" || s.status === "closed",
    ).length;
    const cur = stages.filter((s) => s.status === "current").length;
    return Math.round(((done + cur * 0.5) / total) * 100);
  }, [stages]);

  // The live "Active stage" is the real current stage — never the expired/closed one.
  const currentStage = stages.find((s) => s.status === "current");
  const closedStage = stages.find((s) => s.status === "closed");

  // Only render done/skipped/current/expired as timeline nodes. Pending stages
  // would otherwise show as empty circles; they're summarised in the current
  // stage's "Up next" list and hinted at by a trailing "more stages" marker.
  const visibleStages = stages.filter((s) => s.status !== "pending");
  const hiddenPendingCount = stages.length - visibleStages.length;

  const openAction = (type, instance) => {
    setActionType(type);
    setActionInstance(instance);
    setModalOpen(true);
  };

  const handleSubmit = async (comment) => {
    const ok = await submitAction({ instance: actionInstance, action: actionType, comment });
    if (ok) setModalOpen(false);
  };

  if (loading) {
    return (
      <div className={styles.journey}>
        <header className={styles.journeyHead}>
          <div className={styles.top}>
            <h2>
              <span className={styles.liveDot} />
              {entityLabel} Lifecycle Journey
            </h2>
          </div>
        </header>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          Loading journey…
        </div>
      </div>
    );
  }

  if (!stages.length) return null;

  return (
    <div className={styles.journey}>
      <header className={styles.journeyHead}>
        <div className={styles.top}>
          <h2>
            <span className={styles.liveDot} />
            {entityLabel} Lifecycle Journey
          </h2>
        </div>
        <div className={styles.journeyStageLabel}>
          <span>{closed ? "Closed at" : "Active stage"}</span>
          <span className={styles.dotSep}>·</span>
          <span className={styles.em}>
            {closed
              ? (closedStage?.name || "Closed")
              : currentStage
                ? currentStage.name
                : "—"}
          </span>
        </div>
        <div className={styles.journeyProgress}>
          <div className={styles.pbar}>
            {progressSegments.map((seg, i) => (
              <div
                key={i}
                className={`${styles.seg} ${
                  seg === "done"
                    ? styles.segDone
                    : seg === "skipped"
                      ? styles.segSkipped
                      : seg === "expired"
                        ? styles.segExpired
                        : seg === "closed"
                          ? styles.segClosed
                          : seg === "current"
                            ? styles.segCurrent
                            : ""
                }`}
              />
            ))}
          </div>
          <span className={styles.pct}>{progressPct}%</span>
        </div>
      </header>

      <div className={styles.journeyBody}>
        <ul className={styles.timelineV2}>
          {visibleStages.map((stage) => (
            <li
              key={stage.key}
              className={`${styles.stageV2} ${
                stage.status === "done"
                  ? styles.isDone
                  : stage.status === "skipped"
                    ? styles.isSkipped
                    : stage.status === "expired"
                      ? styles.isExpired
                      : stage.status === "closed"
                        ? styles.isClosed
                        : stage.status === "current"
                          ? styles.isCurrent
                          : styles.isPending
              }`}
            >
              <span className={styles.node} />

              {/* DONE */}
              {stage.status === "done" && (
                <div className={styles.stageMini}>
                  <div className={styles.row1}>
                    <span className={styles.name}>{stage.name}</span>
                    <span className={`${styles.pill} ${styles.success}`}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      {stage.statusLabel}
                    </span>
                  </div>
                  <div className={styles.row2}>
                    {stage.completedBy && (
                      <span className={`${styles.miniAvatar} ${styles[stage.completedAvatar]}`}>
                        {stage.completedInitials}
                      </span>
                    )}
                    {stage.completedBy ? (
                      <span>
                        by <span className={styles.by}>{stage.completedBy}</span>
                      </span>
                    ) : (
                      <span className={styles.by}>Completed</span>
                    )}
                    {stage.completedDate && (
                      <>
                        <span className={styles.sep}>·</span>
                        <span className={styles.when}>{stage.completedDate}</span>
                      </>
                    )}
                    {stage.meta && (
                      <>
                        <span className={styles.sep}>·</span>
                        <span className={styles.when}>{stage.meta}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* SKIPPED */}
              {stage.status === "skipped" && (
                <div className={styles.stageMini}>
                  <div className={styles.row1}>
                    <span className={styles.name}>{stage.name}</span>
                    <span className={`${styles.pill} ${styles.neutral}`}>Skipped</span>
                  </div>
                  <div className={`${styles.row2} ${styles.muted}`}>
                    <span>{stage.skipReason}</span>
                  </div>
                </div>
              )}

              {/* EXPIRED (auto-published) — terminal, rendered as a closed
                  one-liner with a danger "Auto-published" pill. */}
              {stage.status === "expired" && (
                <div className={styles.stageMini}>
                  <div className={styles.row1}>
                    <span className={styles.name}>{stage.name}</span>
                    <span className={`${styles.pill} ${styles.danger}`}>
                      <span className={styles.pdot} />
                      {stage.statusLabel}
                    </span>
                  </div>
                  <div className={`${styles.row2} ${styles.muted}`}>
                    <span>
                      Auto-published — approval wasn&apos;t completed in time. Was
                      pending on: {stage.pendingFrom}
                    </span>
                  </div>
                </div>
              )}

              {/* CLOSED — the RFQ was closed at this stage; terminal, no
                  actions. Rendered as a one-liner with a danger "Closed" pill. */}
              {stage.status === "closed" && (
                <div className={styles.stageMini}>
                  <div className={styles.row1}>
                    <span className={styles.name}>{stage.name}</span>
                    <span className={`${styles.pill} ${styles.danger}`}>
                      <span className={styles.pdot} />
                      {stage.statusLabel}
                    </span>
                  </div>
                  <div className={`${styles.row2} ${styles.muted}`}>
                    <span>{stage.closedNote}</span>
                  </div>
                </div>
              )}

              {/* CURRENT */}
              {stage.status === "current" && (
                <div className={styles.stageFocus}>
                  <div className={styles.focusHead}>
                    <span className={styles.name}>
                      <span>{stage.name}</span>
                      <span className={`${styles.pill} ${styles.warn}`}>
                        <span className={styles.pdot} />
                        {stage.statusLabel}
                      </span>
                    </span>
                  </div>

                  <div className={styles.focusSection}>
                    <div className={styles.ssubLabel}>
                      Waiting on
                      <span className={styles.ssubCount}>{stage.current.waitingRole}</span>
                    </div>
                    {(() => {
                      const owners = stage.current.owners;
                      const multiple = owners.length > 1;
                      const stackMax = 5;
                      const shown = owners.slice(0, stackMax);
                      const extra = owners.length - shown.length;
                      // Single owner → just the card. Multiple → collapsed avatar
                      // stack that expands to the full list on hover.
                      if (!multiple) {
                        const o = owners[0];
                        return (
                          <div className={styles.ownerList}>
                            <div className={styles.ownerCard}>
                              <div className={`${styles.avatar} ${styles[o.avatar]}`}>{o.initials}</div>
                              <div className={styles.ownerMeta}>
                                <div className={styles.ownerName}>{o.name}</div>
                                <div className={styles.role}>{o.dept}</div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          className={styles.ownerStack}
                          onMouseEnter={(e) => openTip(e, owners, stage.current.waitingRole)}
                          onMouseLeave={scheduleClose}
                        >
                          <div className={styles.stackAvatars}>
                            {shown.map((o, oi) => (
                              <span
                                key={oi}
                                className={`${styles.stackAvatar} ${styles[o.avatar]}`}
                                style={{ zIndex: shown.length - oi }}
                              >
                                {o.initials}
                              </span>
                            ))}
                            {extra > 0 && (
                              <span className={`${styles.stackAvatar} ${styles.stackMore}`}>
                                +{extra}
                              </span>
                            )}
                          </div>
                          <span className={styles.stackSummary}>
                            {owners.length} people · hover for details
                          </span>
                        </div>
                      );
                    })()}

                    <div className={styles.actionContext}>
                      <div className={styles.lbl}>Pending action</div>
                      <div className={styles.action}>{stage.current.action}</div>
                      {(stage.current.context || stage.current.contextAmount) && (
                        <div className={styles.ctxMeta}>
                          {stage.current.context && <span>{stage.current.context}</span>}
                          {stage.current.context && stage.current.contextAmount && (
                            <span className={styles.dotSep}>·</span>
                          )}
                          {stage.current.contextAmount && (
                            <span className={styles.amt}>₹{stage.current.contextAmount}</span>
                          )}
                        </div>
                      )}
                      {stage.current.stepPolicy && (
                        <div className={styles.policy}>{stage.current.stepPolicy}</div>
                      )}
                    </div>

                    {stage.current.pendingInstance && (
                      <div className={styles.actRow}>
                        <button
                          type="button"
                          className={`${styles.actBtn} ${styles.actApprove}`}
                          onClick={() => openAction("APPROVE", stage.current.pendingInstance)}
                          disabled={actionLoading}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className={`${styles.actBtn} ${styles.actReject}`}
                          onClick={() => openAction("REJECT", stage.current.pendingInstance)}
                          disabled={actionLoading}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {stage.upNext.length > 0 && (
                    <div className={styles.focusSection}>
                      <div className={styles.ssubLabel}>Up next, after this stage</div>
                      <ol className={styles.upNext}>
                        {stage.upNext.map((u, ui) => (
                          <li key={ui}>
                            <span className={styles.unNum}>{ui + 1}</span>
                            <div className={styles.unBody}>
                              <div className={styles.unName}>{u.name}</div>
                              <div className={styles.unDetail}>{u.detail}</div>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}

          {/* Trailing "more stages" indicator — replaces empty pending nodes.
              The pending stages are already named in the current stage's
              "Up next" list, so here we just hint that the journey continues. */}
          {hiddenPendingCount > 0 && (
            <li className={`${styles.stageV2} ${styles.isMore}`}>
              <span className={styles.node} />
              <div className={styles.moreLabel}>
                {hiddenPendingCount} more stage{hiddenPendingCount === 1 ? "" : "s"} after this
              </div>
            </li>
          )}
        </ul>
      </div>

      <ApprovalActionModal
        show={modalOpen}
        actionType={actionType}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        loading={actionLoading}
        entityLabel={entityLabel}
      />

      {/* Waiting-on tooltip — portaled to body so the scrollable journey
          column never clips it. */}
      {tip && typeof document !== "undefined" &&
        createPortal(
          <div
            className={`${styles.ownerTooltip} ${
              tip.placement === "above" ? styles.tipAbove : styles.tipBelow
            }`}
            style={{ left: tip.left, top: tip.top, width: tip.width }}
            role="tooltip"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <div className={styles.ownerTooltipHead}>
              {tip.owners.length} {tip.role}
            </div>
            <div className={styles.ownerTooltipList}>
              {tip.owners.map((o, oi) => (
                <div className={styles.ownerTooltipRow} key={oi}>
                  <span className={`${styles.tipAvatar} ${styles[o.avatar]}`}>
                    {o.initials}
                  </span>
                  <div className={styles.tipMeta}>
                    <div className={styles.tipName}>{o.name}</div>
                    {o.email && <div className={styles.tipEmail}>{o.email}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default RFQLifecycleJourneyV2;
