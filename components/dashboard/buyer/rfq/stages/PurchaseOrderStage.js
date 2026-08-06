// Purchase Order stage — a mini PO dashboard for this RFQ, themed + structured
// to match the ARC awarding stage (arc_v2.css): a full-width stat strip over a
// ccm-grid (prop-card PO list on the left, a sticky aside with PO approval
// progress + a "Where this sits" workflow on the right). The PO module stays
// the system of record; each card clicks through to PO Details. Status labels +
// ₹ + initials are reused from the PO module so they stay canonical.
//
// This tab deliberately carries NO decision controls. Approving or rejecting a
// PO happens inside the PO, where the line items, taxes and terms being agreed
// to are actually on screen — an Approve button floating above a summary tab is
// a decision taken without the evidence. So when a PO is waiting on the viewer,
// the card itself becomes the call to action: hoisted to the top of the column,
// ringed in amber, and labelled "Waiting on you". Everything else stays calm.
import { useState } from "react";
import Link from "next/link";
import { FileText, IndianRupee, Clock3, CircleCheck, TriangleAlert, ArrowRight, ChevronDown } from "lucide-react";
import { statusLabel, inr, initialsOf, fmtDateOnly } from "@/components/dashboard/buyer/purchase-orders/shared";
import {
  effectiveApproverStatus,
  levelPill,
  namePreview,
  ruleLabel,
  tallyStep,
} from "@/components/dashboard/buyer/approval/approverState";
import { removalReasonLabel, StageNoPermission } from "./StageShared";

// Anchor for ?focus=approval deep links. The page-level decision card renders
// nothing for a PO, so this card is what an approval email scrolls to.
export const PO_AWAITING_ANCHOR_ID = "po-awaiting-your-approval";

// status → tone (pill colours + left card-accent) so each PO state reads
// distinctly: draft/grey, in-approval/amber, awaiting-vendor/blue,
// approved/green, dispatched/violet, rejected (internal or vendor)/red.
const TONE = {
  draft:              { c: "#71717a", bg: "#f4f4f5", b: "#e4e4e7" },
  pending:            { c: "#b45309", bg: "#fffbeb", b: "#fde68a" },
  pending_approval:   { c: "#b45309", bg: "#fffbeb", b: "#fde68a" },
  acceptance_pending: { c: "#2563eb", bg: "#eff6ff", b: "#bfdbfe" },
  sent:               { c: "#2563eb", bg: "#eff6ff", b: "#bfdbfe" },
  approved:           { c: "#15803d", bg: "#ecfdf5", b: "#bbf7d0" },
  invoice_raised:     { c: "#7c3aed", bg: "#f5f3ff", b: "#ddd6fe" },
  dispatched:         { c: "#7c3aed", bg: "#f5f3ff", b: "#ddd6fe" },
  GRN:                { c: "#15803d", bg: "#ecfdf5", b: "#bbf7d0" },
  delivered:          { c: "#15803d", bg: "#ecfdf5", b: "#bbf7d0" },
  completed:          { c: "#15803d", bg: "#ecfdf5", b: "#bbf7d0" },
  rejected:           { c: "#b91c1c", bg: "#fef2f2", b: "#fecaca" },
  rejected_by_vendor: { c: "#b91c1c", bg: "#fef2f2", b: "#fecaca" },
  cancelled:          { c: "#71717a", bg: "#f4f4f5", b: "#e4e4e7" },
};
const toneOf = (s) => TONE[s] || TONE.draft;

// A coloured status pill (inline-styled so it works on the RFQ page too).
function StatusPill({ status }) {
  const t = toneOf(status);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, background: t.bg, color: t.c, border: `1px solid ${t.b}`, whiteSpace: "nowrap" }}>
      {statusLabel(status)}
    </span>
  );
}

// ── Approval reading helpers ─────────────────────────────────────────────
// The lifecycle payload describes PO approvals twice over: per-PO (the
// `approval` / `awaiting_me` / `current_actors` / `stage_label` /
// `initiated_by` fields) and as the full phase.approval_instances[] chain.
// The per-PO fields are the cheap read — but the FE and BE deploy separately,
// so every read below falls back to the instance chain, which has carried
// entity_type/entity_id/can_user_approve since long before those fields.

// The PO's own approval instance. Several instances can exist for one PO over
// its life (re-finalization supersedes the old one); the last is the live one.
const instanceForPo = (instances, po) => {
  const list = Array.isArray(instances) ? instances : [];
  const mine = list.filter((i) => i && i.entity_type === "PO" && String(i.entity_id) === String(po?.id));
  return mine.length ? mine[mine.length - 1] : null;
};

// `effectiveApproverStatus`, `tallyStep`, `ruleLabel`, `levelPill` and
// `namePreview` used to live here. They now live in
// buyer/approval/approverState.js, unchanged, because the quote-comparison
// tab's approval drawer had to answer the same questions about the same
// approval engine and a fourth copy of these rules was not going to stay in
// step with the other three. See that file for what each outcome means and for
// the copies that deliberately did NOT move.

// PO statuses that mean the document has left the building. Membership is
// rfqModel's PO_WITH_VENDOR_STATUSES verbatim, so the local fallback below and
// the server's own stage_label cannot disagree. ("delivered" used to be in here
// and is not a member of the po_status enum — it can never arrive.)
const WITH_VENDOR = new Set(["sent", "approved", "invoice_raised", "dispatched", "GRN"]);

// A PO status implies an approval outcome: nothing reaches `approved` or any
// vendor-side status without the internal approval having cleared, and
// `rejected_by_vendor` means the buyer side DID approve and the vendor then
// declined. Only consulted when the instance chain is missing from the payload
// and the per-PO `approval` object is all we have.
const PO_STATUS_APPROVAL_OUTCOME = {
  draft: null,
  pending: "PENDING",
  pending_approval: "PENDING",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
  approved: "APPROVED",
  acceptance_pending: "APPROVED",
  sent: "APPROVED",
  invoice_raised: "APPROVED",
  dispatched: "APPROVED",
  GRN: "APPROVED",
  completed: "APPROVED",
  rejected_by_vendor: "APPROVED",
};

// An instance that has APPROVED, REJECTED or been CANCELLED has no "current
// level" — it has an outcome. Same set, and below the same wording, that the
// aside's header uses, because the two sit on one screen.
const CONCLUDED = new Set(["APPROVED", "REJECTED", "CANCELLED"]);
const isConcluded = (status) => CONCLUDED.has(String(status || "").toUpperCase());
// "Concluded · approved". A payload that says an approval is over without
// saying how still gets an honest, if shorter, sentence.
const outcomeLabel = (status) => {
  const word = String(status || "").trim().toLowerCase();
  return word ? `Concluded · ${word}` : "Concluded";
};

// The B1 `stage_label` vocabulary, recomputed locally for payloads that predate
// it. Branch for branch this is rfqModel.buildPODetail's ordering: terminal PO
// statuses first (an instance can sit APPROVED long after the PO itself was
// cancelled), then REJECTED BEFORE PENDING — a PO whose status is `rejected`
// reads as rejected on both sides even while an instance is still open — then
// the vendor-side states, and "Draft — not yet initiated" only for a draft that
// has no instance yet.
//
// `levelNo` is a RESOLVED step_order and the only level number allowed in here.
// 203 approval instances across all entity types sit at current_step = 0 and no
// step anywhere is stored with step_order = 0, so the raw pointer names nothing
// — when it cannot be resolved the label drops the number rather than guessing
// one. (The server always sends its own stage_label now; this runs only for
// payloads that predate it.)
function deriveStageLabel(po, inst, levelNo) {
  const s = po?.status;
  if (s === "cancelled") return "Cancelled";
  if (s === "completed") return "Completed";
  if (s === "rejected_by_vendor") return "Rejected by vendor";
  if (inst?.status === "REJECTED" || s === "rejected") return "Rejected in approval";
  if (inst?.status === "PENDING") return Number(levelNo) ? `Awaiting L${Number(levelNo)} approval` : "Awaiting approval";
  if (s === "acceptance_pending") return "Awaiting vendor acceptance";
  if (WITH_VENDOR.has(s)) return `With vendor · ${statusLabel(s)}`;
  if (!inst && s === "draft") return "Draft — not yet initiated";
  return statusLabel(s);
}

// The step whose state the card summarises. While the instance is live that is
// the level it sits on; once it has concluded it is the level that DECIDED it —
// a rejected instance is explained by the level that rejected it, an approved
// one by the last level it cleared.
//
// Never `current_step` blindly. Six PO approval instances on stage are APPROVED
// with current_step = 0, which is not the order of any step that exists; a
// lookup keyed on it finds nothing, and everything downstream (the rule, the
// N-of-M, the level number) then renders as a zero or a blank.
const summaryStep = (inst) => {
  const steps = Array.isArray(inst?.steps) ? inst.steps : [];
  if (!steps.length) return null;
  const withStatus = (st) => steps.filter((s) => String(s?.status || "").toUpperCase() === st);
  const atOrder = (n) => steps.find((s) => Number(s?.step_order) === Number(n)) || null;
  switch (String(inst?.status || "").toUpperCase()) {
    case "REJECTED":  return withStatus("REJECTED")[0] || steps[steps.length - 1];
    case "APPROVED":  return withStatus("APPROVED").slice(-1)[0] || steps[steps.length - 1];
    case "CANCELLED": return withStatus("CANCELLED")[0] || atOrder(inst?.current_step) || steps[steps.length - 1];
    // Live: the level it is on, and — exactly as the pre-B1 fallback did — the
    // first level when current_step is 0 or names no step.
    default:          return atOrder(inst?.current_step) || atOrder(1) || steps[0];
  }
};

// The card's approval summary, built from the instance chain.
//
// `po.approval` is the server's own summary of this very instance — but it
// summarises the SAME record the aside renders in full four inches away, and a
// summary that contradicts the roster beside it is worse than no summary. The
// B1 shaper resolves its "current step" by `step_order === current_step`, which
// matches nothing on a concluded instance whose current_step is 0: stage
// currently serves {current_step: 0, total_steps: 1, decision_rule: null,
// approved_count: 0, total_count: 0} for six APPROVED PO approvals, and a
// non-null object like that sails straight past `??`.
//
// So whenever the instance chain is in hand, the summary is derived from it,
// through the same helpers the aside uses — the two panels then agree by
// construction, on the old payload and on the corrected one alike.
// `approvalFromServer` below is the no-chain fallback, and even it is rendered
// through PoCard's guards rather than printed verbatim.
//
// Both builders produce the SAME shape, and it is the wire's shape field for
// field (instance_status / is_concluded / current_step / total_steps /
// step_status / decision_rule / the five counts / total_count) — one contract
// with two producers, so a render can never care which one it got. The counts
// hold the server's invariant: approved + rejected + pending + not_required +
// not_reached === total_count, over ACTIVE (non-REMOVED) approvers only.
function approvalFromInstance(inst, step, t) {
  if (!inst) return null;
  const steps = Array.isArray(inst.steps) ? inst.steps : [];
  return {
    instance_id: inst.id ?? null,
    instance_status: String(inst.status || "").toUpperCase() || null,
    is_concluded: isConcluded(inst.status),
    // The step_order actually resolved — never the raw current_step. Null when
    // there are no steps to resolve against: no level exists to be named, and
    // inventing one from the pointer is what put "Level 0" on stage.
    current_step: step ? Number(step.step_order) : null,
    total_steps: Number(inst.total_steps) || steps.length || 1,
    step_status: step?.status ? String(step.status).toUpperCase() : null,
    decision_rule: step?.decision_rule || null,
    approved_count: t ? t.approved : 0,
    pending_count: t ? t.outstanding.length : 0,
    rejected_count: t ? t.rejected : 0,
    not_required_count: t ? t.notRequired.length : 0,
    not_reached_count: t ? t.notReached.length : 0,
    total_count: t ? t.total : 0,
  };
}

// No chain to derive from (an older or a redacted payload). Take the server's
// object and normalise it.
//
// Field names are the backend's, not names we wish it used: the instance's
// state arrives as `instance_status` (NOT `status`) alongside a boolean
// `is_concluded`. Both are tolerated as absent — the frontend and backend
// deploy separately — and when they are, the PO's own status is the last
// resort, since nothing reaches `approved` or a vendor-side status without the
// internal approval having cleared. Nothing here is trusted to be printable;
// PoCard decides that.
function approvalFromServer(po) {
  const a = po?.approval;
  if (!a || typeof a !== "object") return null;
  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const instanceStatus = String(a.instance_status || "").toUpperCase()
    || PO_STATUS_APPROVAL_OUTCOME[po?.status]
    || null;
  return {
    instance_id: a.instance_id ?? null,
    instance_status: instanceStatus,
    is_concluded: typeof a.is_concluded === "boolean" ? a.is_concluded : isConcluded(instanceStatus),
    // `current_step` is a resolved step_order on the corrected shape and null
    // when the instance has no steps; on the old shape it is the raw pointer,
    // which is 0 on 203 instances. Zero resolves to no level either way.
    current_step: n(a.current_step) || null,
    total_steps: n(a.total_steps),
    step_status: a.step_status ? String(a.step_status).toUpperCase() : null,
    decision_rule: a.decision_rule || null,
    approved_count: n(a.approved_count),
    pending_count: n(a.pending_count),
    rejected_count: n(a.rejected_count),
    not_required_count: n(a.not_required_count),
    not_reached_count: n(a.not_reached_count),
    total_count: n(a.total_count),
  };
}

// Everything a PO card needs, resolved once, each field degrading on its own.
function poFacts(po, instances) {
  const inst = instanceForPo(instances, po);
  const curStep = summaryStep(inst);
  const t = curStep ? tallyStep(curStep) : null;

  const approval = approvalFromInstance(inst, curStep, t) || approvalFromServer(po);

  // "Waiting on you" is a claim about the VIEWER, so it may only ever come from
  // a server-derived flag: `awaiting_me`, or — on payloads that predate it —
  // the instance's own can_user_approve, which the lifecycle has always
  // carried. PO status alone cannot stand in: every reader of this tab sees the
  // same `pending`, and only some of them are approvers on it.
  const awaitingMe = po?.awaiting_me ?? (!!inst && inst.status === "PENDING" && !!inst.can_user_approve);

  const stageLabel = po?.stage_label ?? deriveStageLabel(po, inst, approval?.current_step);

  // Who must act now — genuinely outstanding approvers only, so neither a
  // tombstone nor someone the level moved past is ever named as the holder.
  const actors = Array.isArray(po?.current_actors)
    ? po.current_actors
    : (inst && inst.status === "PENDING" && t ? t.outstanding.map((r) => ({ user_id: r.ap?.user_id, name: r.ap?.user_name })) : []);

  const initiatedBy = po?.initiated_by ?? inst?.initiated_by ?? null;

  // `inst` goes out too: the aside renders one panel per PO from exactly this
  // instance, so the panel and the card are reading one object, not two lookups
  // that could pick differently.
  return { approval, awaitingMe, stageLabel, actors, initiatedBy, inst };
}

// ── Approval progress aside ──────────────────────────────────────────────

const GroupLabel = ({ tone, children }) => (
  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: tone === "warn" ? "var(--warn)" : "var(--fg-4)", margin: "11px 0 1px" }}>
    {children}
  </div>
);

// Status tags used to render at 9.5px lowercase, which made the one thing the
// panel exists to say the least visible thing on it. They are pills now:
// uppercase, 700, tinted by outcome, and the live level's tag breathes.
// `eff` is the level-aware state from effectiveApproverStatus, never the raw
// column — "Not required" and "Not reached" are both stored as PENDING.
function ApproverRow({ ap, eff, emphasise }) {
  const pill = eff === "APPROVED" ? { cls: "success", text: "Approved" }
    : eff === "REJECTED" ? { cls: "danger", text: "Rejected" }
    : eff === "NOT_REQUIRED" ? { cls: "neutral", text: "Not required" }
    : eff === "NOT_REACHED" ? { cls: "neutral", text: "Not reached" }
    : { cls: emphasise ? "warn" : "neutral", text: "Pending" };
  return (
    <div className={`mem-row${emphasise && eff === "PENDING" ? " is-current" : ""}`} style={eff === "NOT_REQUIRED" || eff === "NOT_REACHED" ? { opacity: 0.72 } : undefined}>
      <div className="mr-av">{initialsOf(ap?.user_name)}</div>
      <div className="mr-meta">
        <div className="mr-name">{ap?.user_name || "Approver"}</div>
        <div className="mr-role">{ap?.user_designation || ap?.user_department || "Approver"}</div>
        {ap?.comment && <div className="mr-comment">{ap.comment}</div>}
      </div>
      <div className="mr-status">
        <span className={`status-pill ${pill.cls}`} style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 9px" }}>
          <span className="dot" />
          {pill.text}
        </span>
        {ap?.acted_at && <span className="mr-time">{fmtDateOnly(ap.acted_at)}</span>}
      </div>
    </div>
  );
}

// A tombstone. Muted, struck through, reason + date spelled out — visible, but
// impossible to mistake for someone still in the chain.
function RemovedApproverRow({ ap }) {
  const reason = ap?.removal_reason ? removalReasonLabel(ap.removal_reason) : null;
  return (
    <div className="mem-row" style={{ opacity: 0.62 }}>
      <div className="mr-av">{initialsOf(ap?.user_name)}</div>
      <div className="mr-meta">
        <div className="mr-name" style={{ textDecoration: "line-through" }}>{ap?.user_name || "Approver"}</div>
        <div className="mr-role">{ap?.user_designation || ap?.user_department || "Approver"}</div>
      </div>
      <div className="mr-status">
        <span className="status-pill neutral" style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 9px" }}>
          <span className="dot" />
          Removed{reason ? ` · ${reason}` : ""}
        </span>
        {ap?.removed_at && <span className="mr-time">{fmtDateOnly(ap.removed_at)}</span>}
      </div>
    </div>
  );
}

// One collapsible level. A level can hold 20 approvers, so the roster is what
// collapses — never the state: the header keeps the rule, the N-of-M and (when
// closed) who we are still waiting on, so a shut level still answers "what
// happened here?". A real <button> with aria-expanded, because this is a
// control, not a div someone hung a click handler on.
function ApprovalLevel({ step, isCurrent, defaultOpen, idPrefix }) {
  const [open, setOpen] = useState(defaultOpen);
  const t = tallyStep(step);
  const rule = ruleLabel(step?.decision_rule);
  // There is one panel per PO now, and every panel has a Level 1 — so the id
  // this button points aria-controls at has to be unique per INSTANCE, not per
  // step_order, or three panels claim the same element.
  const bodyId = `${idPrefix || "po-approval"}-level-${step?.step_order ?? "x"}`;
  const pill = levelPill(step?.status, isCurrent);

  // Only genuinely-outstanding people — a closed level has none, so a shut
  // level can never claim to be "waiting on" someone it already moved past.
  const waitingOn = namePreview(t.outstanding.map((r) => r.ap?.user_name));

  return (
    <div style={{ marginTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={bodyId}
        style={{ width: "100%", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, textAlign: "left", font: "inherit", cursor: "pointer", padding: "9px 11px", borderRadius: 9, background: isCurrent ? "var(--warn-soft)" : "var(--surface-2)", border: `1px solid ${isCurrent ? "rgba(180,83,9,0.26)" : "var(--border)"}` }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: isCurrent ? "var(--warn)" : "var(--fg-2)" }}>
              Level {step?.step_order}
            </span>
            {rule ? <span style={{ fontSize: 11, color: "var(--fg-3)" }}>· {rule}</span> : null}
          </span>
          {/* The state a collapsed level still has to answer for: the rule, the
              N-of-M (ACTIVE approvers only), and who we are actually waiting
              on. Removed and not-required are separate aggregates so neither
              can inflate the fraction. */}
          <span style={{ display: "block", marginTop: 3, fontSize: 11.5, color: "var(--fg-3)", lineHeight: 1.45 }}>
            {t.total > 0 ? `${t.approved} of ${t.total} approved` : "No approvers on this level"}
            {t.notRequired.length > 0 ? ` · ${t.notRequired.length} not required` : ""}
            {t.notReached.length > 0 ? ` · ${t.notReached.length} not reached` : ""}
            {t.removed.length > 0 ? ` · ${t.removed.length} removed` : ""}
            {!open && waitingOn ? ` · waiting on ${waitingOn}` : ""}
          </span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span className={`status-pill ${pill.cls}`} style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", padding: "3px 9px" }}>
            <span className="dot" />
            {pill.text}
          </span>
          <ChevronDown size={15} strokeWidth={2.2} style={{ color: "var(--fg-4)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
        </span>
      </button>
      {open && (
        <div id={bodyId} style={{ padding: "0 2px 4px" }}>
          {/* Outstanding first: on the live level these are the people the PO is
              actually stuck behind, and on a finished level the group is empty. */}
          {t.outstanding.length > 0 && (
            <>
              <GroupLabel tone={isCurrent ? "warn" : undefined}>
                {isCurrent ? `Waiting on (${t.outstanding.length})` : `Not yet acted (${t.outstanding.length})`}
              </GroupLabel>
              {t.outstanding.map((r, i) => <ApproverRow key={`p-${r.ap?.user_id ?? i}`} ap={r.ap} eff={r.eff} emphasise={isCurrent} />)}
            </>
          )}
          {t.acted.length > 0 && (
            <>
              <GroupLabel>Already acted ({t.acted.length})</GroupLabel>
              {t.acted.map((r, i) => <ApproverRow key={`a-${r.ap?.user_id ?? i}`} ap={r.ap} eff={r.eff} emphasise={false} />)}
            </>
          )}
          {/* An ANY level clears on one approval and leaves everyone else stored
              as PENDING for good — they were never asked, so they read as such. */}
          {t.notRequired.length > 0 && (
            <>
              <GroupLabel>Not required ({t.notRequired.length})</GroupLabel>
              {t.notRequired.map((r, i) => <ApproverRow key={`nr-${r.ap?.user_id ?? i}`} ap={r.ap} eff={r.eff} emphasise={false} />)}
            </>
          )}
          {/* Rejected or cancelled before their turn came round. */}
          {t.notReached.length > 0 && (
            <>
              <GroupLabel>Not reached ({t.notReached.length})</GroupLabel>
              {t.notReached.map((r, i) => <ApproverRow key={`nx-${r.ap?.user_id ?? i}`} ap={r.ap} eff={r.eff} emphasise={false} />)}
            </>
          )}
          {t.removed.length > 0 && (
            <>
              <GroupLabel>Removed from this level ({t.removed.length})</GroupLabel>
              {t.removed.map((r, i) => <RemovedApproverRow key={`r-${r.ap?.user_id ?? i}`} ap={r.ap} />)}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Approval-progress panel for ONE purchase order, mirroring the awarding
// stage's member-row layout.
//
// It used to take the whole phase's instance list and render
// `instances[instances.length - 1]`: a single panel showing the newest instance
// on the phase, whichever card you happened to be reading. 7 of the 26 stage
// RFQs that have POs have more than one (213, 196 and 189 have three each), so
// on 27% of them that panel described a different PO from the card beside it —
// and now that each card carries its own correct approval summary, the two
// would visibly contradict each other. The panel is bound to one PO and says
// which one, so it cannot.
//
// One panel per PO rather than a single panel with a PO picker: with three POs
// on screen the reader is looking at all three cards at once, so any shared
// panel is describing at most one of them and is silently wrong about the other
// two until someone notices a selector. Panels also need no state, no default
// to get wrong, and no way to drift out of sync — and the panel order mirrors
// the card order (awaiting-you hoisted first), so the nth panel is the nth card.
function ApprovalProgress({ po, inst, named }) {
  const steps = inst && Array.isArray(inst.steps) ? inst.steps : [];
  // The name the card uses, so the two are matched by eye without effort.
  const poLabel = po ? (po.po_number || `PO-${po.id}`) : null;

  if (!inst) {
    return (
      <div className="section-card">
        <div className="section-head">
          <div className="h-left">
            <div className="ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            </div>
            <div><h2>Approval progress</h2><div className="h-sub">No approval yet</div></div>
          </div>
        </div>
        <div className="section-body">
          <div style={{ fontSize: 12, color: "var(--fg-3)", padding: "6px 0" }}>
            Purchase orders for this RFQ have no approval instance yet.
          </div>
        </div>
      </div>
    );
  }

  // The RESOLVED level, the same one the card shows — never inst.current_step,
  // which is 0 on 203 instances and names no step that exists anywhere.
  const cur = Number(summaryStep(inst)?.step_order) || 1;
  const tot = Number(inst.total_steps) || steps.length || 1;
  // CANCELLED belongs here too — an instance that was called off is settled,
  // and "Level 3 of 3 in review" would say the opposite.
  const concluded = isConcluded(inst.status);

  // A level is "current" only if the instance is live, the step is the one the
  // instance is on, AND the step itself is still open — a cancelled or rejected
  // step is settled no matter what current_step says.
  const isCurrentStep = (s) =>
    inst.status === "PENDING" &&
    Number(s?.step_order) === cur &&
    (!s?.status || String(s.status).toUpperCase() === "PENDING");

  // Default-open is exactly the level that needs someone right now; every level
  // already settled — cleared, rejected or cancelled — starts collapsed. A
  // concluded instance opens nothing, and doesn't need to: each header still
  // carries the rule, the N-of-M and the outcome chip.
  const currentStep = steps.find(isCurrentStep);
  const openOrder = currentStep ? Number(currentStep.step_order) : null;

  return (
    <div className="section-card">
      <div className="section-head">
        <div className="h-left">
          <div className="ic">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
          </div>
          <div>
            {/* One PO on the tab needs no disambiguation and keeps the heading
                it has always had; more than one, and the heading IS the
                answer to "which PO is this about?". The state line below is
                worded identically either way, so it still matches the card. */}
            <h2>{named && poLabel ? `Approval · ${poLabel}` : "Approval progress"}</h2>
            <div className="h-sub">{concluded ? outcomeLabel(inst.status) : `Level ${Math.min(cur, tot)} of ${tot} in review`}</div>
          </div>
        </div>
      </div>
      <div className="section-body">
        {steps.map((step) => {
          const isCurrent = isCurrentStep(step);
          return (
            // rfqModel.formatApprovalInstances doesn't emit an `id` on steps —
            // `step_order` is the only stable identity a step row carries. The
            // open-order is in the key too, so when the approval advances the
            // newly-live level re-derives its default instead of staying shut.
            <ApprovalLevel
              key={`${inst.id ?? "i"}-${step.step_order}-${openOrder ?? "none"}`}
              step={step}
              isCurrent={isCurrent}
              defaultOpen={Number(step.step_order) === openOrder}
              idPrefix={`po-approval-${inst.id ?? po?.id ?? "x"}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── PO card ──────────────────────────────────────────────────────────────

// One PO, told as: what it is → where it is → who has it → what it's worth.
// When it is waiting on the viewer the whole card lights up and says so; the
// card IS the action, there is no button here to press.
function PoCard({ po, ordinal, share, showShare, facts }) {
  const { approval, awaitingMe, stageLabel, actors, initiatedBy } = facts;
  const t = toneOf(po.status);
  const accent = awaitingMe ? "var(--warn)" : t.c;
  const actorNames = namePreview((actors || []).map((a) => a?.name));
  const pct = approval && approval.total_count > 0
    ? Math.round((Number(approval.approved_count) || 0) / Number(approval.total_count) * 100)
    : 0;

  // A concluded approval has an outcome, not a position. It gets the aside's
  // exact words ("Concluded · approved") so the two panels on this screen say
  // the same thing about the same instance, and it gets the outcome's colour
  // rather than the in-progress grey.
  //
  // This is a statement about the APPROVAL, and it is deliberately independent
  // of the PO's own status shown above it: PO 8's approval concluded APPROVED
  // and the vendor then rejected the order, so that card correctly carries a
  // red "Rejected by vendor" in its head and a green "Concluded · approved" in
  // its approval band. Two different facts; neither may be derived from the
  // other.
  const concluded = !!approval?.is_concluded;
  const outcomeTone = concluded ? (TONE[String(approval.instance_status || "").toLowerCase()] || TONE.draft) : null;

  // A level number is printable only when it names a level that exists. "Level
  // 0 of 1" is not a state this system has; it is a lookup that missed.
  const level = Number(approval?.current_step);
  const levels = Number(approval?.total_steps);
  const levelText = !concluded && level >= 1 && levels >= 1 && level <= levels
    ? `Level ${level} of ${levels}`
    : null;

  const rule = ruleLabel(approval?.decision_rule);
  const counted = Number(approval?.total_count) > 0;
  // Nothing worth saying — better an absent strip than an empty box.
  const showApproval = !!approval && (concluded || levelText || rule || counted);

  // Only the cells that earn their place. Vendor is already the card title, so
  // it doesn't get repeated here; share is meaningless when there's one PO.
  const cells = [{ k: "Total value", v: inr(po.total_amount), cls: "pm-v success" }];
  if (showShare) cells.push({ k: "Share of total", v: `${share}%`, cls: "pm-v sub" });
  cells.push({ k: "Initiated by", v: initiatedBy?.name || "—", cls: "pm-v sub" });
  cells.push({ k: awaitingMe ? "Waiting on" : "Current action taker", v: actorNames || "—", cls: "pm-v sub" });

  return (
    <Link
      // Deep-link target. Approval emails and the "Waiting on you" queue send
      // approvers here with ?focus=approval, which used to scroll to the
      // decision card above the tab. That card no longer renders for a PO, so
      // the hoisted card is the thing to bring into view — otherwise the link
      // lands on the page and highlights nothing. Only the awaiting card claims
      // the id, so it stays unique however many POs the RFQ has.
      id={awaitingMe ? PO_AWAITING_ANCHOR_ID : undefined}
      href={`/dashboard/buyer/purchase-orders/${po.id}`}
      className="prop-card"
      aria-label={awaitingMe
        ? `${po.po_number || `PO-${po.id}`} — waiting on your approval. Open the purchase order to review and decide.`
        : `${po.po_number || `PO-${po.id}`} — open the purchase order`}
      style={{
        display: "block", textDecoration: "none", color: "inherit",
        borderLeft: `${awaitingMe ? 4 : 3}px solid ${accent}`,
        ...(awaitingMe ? {
          borderColor: "rgba(180,83,9,0.42)",
          borderLeftColor: "var(--warn)",
          background: "linear-gradient(180deg,#fffdf7 0%,var(--surface) 58%)",
          boxShadow: "0 0 0 4px rgba(180,83,9,0.10), 0 16px 32px -20px rgba(180,83,9,0.65)",
        } : null),
      }}
    >
      <div className="prop-head">
        <div className="prop-id">
          <div className="prop-num" style={awaitingMe ? { background: "var(--warn)" } : undefined}>{String(ordinal).padStart(2, "0")}</div>
          <div className="prop-title-row">
            <div className="ptt">
              <span>{po.po_number || `PO-${po.id}`}</span>
              <span style={{ color: "var(--fg-3)", fontWeight: 450, margin: "0 6px" }}>·</span>
              <span>{po.vendor_company || po.vendor_name || "Vendor"}</span>
            </div>
            <div className="ptm">
              <StatusPill status={po.status} />
              {stageLabel ? (
                <span style={{ fontWeight: 600, color: awaitingMe ? "var(--warn)" : "var(--fg-2)" }}>{stageLabel}</span>
              ) : null}
              {po.created_at && <span>raised {fmtDateOnly(po.created_at)}</span>}
            </div>
          </div>
        </div>
        {awaitingMe && <span className="your-action">Waiting on you</span>}
      </div>
      <div className="prop-body">
        {showApproval && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10, padding: "8px 11px", borderRadius: 9, background: awaitingMe ? "rgba(180,83,9,0.07)" : "var(--surface-2)", border: `1px solid ${awaitingMe ? "rgba(180,83,9,0.22)" : "var(--border)"}` }}>
            {concluded ? (
              <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 999, background: outcomeTone.bg, color: outcomeTone.c, border: `1px solid ${outcomeTone.b}` }}>
                {outcomeLabel(approval.instance_status)}
              </span>
            ) : levelText ? (
              <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: awaitingMe ? "var(--warn)" : "var(--fg-3)" }}>
                {levelText}
              </span>
            ) : null}
            {rule ? <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{rule}</span> : null}
            {counted && (
              <>
                {/* Progress is a claim about how far there is left to go, so it
                    belongs only to an approval that is still going: a bar
                    stopped at 20% beside "Concluded · approved" reads as the
                    opposite of the outcome next to it. A settled approval shows
                    its tally as text and nothing else. */}
                {!concluded && (
                  <span className="vp-bar" style={{ flex: "1 1 80px", minWidth: 70, maxWidth: 160 }}>
                    <span className="seg-a" style={{ width: `${pct}%` }} />
                  </span>
                )}
                <span style={{ fontSize: 11.5, color: "var(--fg-2)", fontFamily: "'Geist Mono',monospace" }}>
                  {approval.approved_count} of {approval.total_count} approved
                </span>
              </>
            )}
            {/* Why "1 of 5 approved" is a COMPLETE approval and not a stalled
                one. Without this the fraction beside a cleared ANY level looks
                like a contradiction; the aside says the same thing. */}
            {approval.not_required_count > 0 ? (
              <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{approval.not_required_count} not required</span>
            ) : null}
            {approval.not_reached_count > 0 ? (
              <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>{approval.not_reached_count} not reached</span>
            ) : null}
          </div>
        )}
        {/* auto-fit rather than the sheet's fixed 6 tracks: the cell count
            varies with what the payload actually carried, and it reflows on a
            narrow viewport without needing a breakpoint per arity. */}
        <div className="prop-metrics" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))" }}>
          {cells.map((c) => (
            <div className="pm-cell" key={c.k}>
              <div className="pm-k">{c.k}</div>
              <div className={c.cls} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 9, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: "var(--fg-3)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--fg-4)", marginRight: 6 }}>Items</span>
            {po.product_names || "—"}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: awaitingMe ? "var(--warn)" : "var(--primary)" }}>
            {awaitingMe ? "Open to review and decide" : "Open purchase order"}
            <ArrowRight size={13} strokeWidth={2.4} />
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function PurchaseOrderStage({ stage }) {
  // The server redacts stages this user may not read (rfqLifecycleShaper:
  // redactUnreadableStages) — phase detail is stripped before it leaves the
  // API, and can_read=false is what says so. This panel is the visible half.
  if (stage?.can_read === false) return <StageNoPermission stageLabel="Purchase Order" />;

  const phase = stage?.phase || {};
  const pos = Array.isArray(phase.purchase_orders) ? phase.purchase_orders : [];

  const countOf = (...keys) => pos.filter((p) => keys.includes(p.status)).length;
  const total = pos.length;
  const totalValue = pos.reduce((s, p) => s + (Number(p.total_amount) || 0), 0);
  const inApproval = countOf("pending", "pending_approval");
  const approvedPlus = countOf("approved", "sent", "acceptance_pending", "invoice_raised", "dispatched", "GRN", "delivered", "completed");
  const attention = countOf("rejected", "rejected_by_vendor");
  const completedAll = total > 0 && countOf("completed", "delivered", "GRN") === total;
  const anyVendorStage = countOf("sent", "acceptance_pending", "invoice_raised", "dispatched", "GRN", "delivered", "completed") > 0;

  if (total === 0) {
    return (
      <div className="empty-state" style={{ padding: "48px 24px" }}>
        <div className="ic">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
        </div>
        <h2>No purchase orders yet</h2>
        <p>No purchase orders have been raised for this RFQ. Once a PO is created from the finalized quotes, it appears here.</p>
        <Link href={`/dashboard/buyer/purchase-orders`} className="btn btn-secondary btn-sm" style={{ marginTop: 14 }}>Open PO dashboard</Link>
      </div>
    );
  }

  const STATS = [
    { key: "total",    cls: "s-ic indigo", icon: <FileText size={18} strokeWidth={2} />,    val: total,            label: "Purchase orders" },
    { key: "value",    cls: "s-ic green",  icon: <IndianRupee size={18} strokeWidth={2} />, val: inr(totalValue),  label: "Total value", mono: true },
    { key: "approval", cls: "s-ic amber",  icon: <Clock3 size={18} strokeWidth={2} />,      val: inApproval,       label: "In approval" },
    { key: "approved", cls: "s-ic blue",   icon: <CircleCheck size={18} strokeWidth={2} />, val: approvedPlus,     label: "Approved & beyond" },
    { key: "attention",cls: "s-ic",        icon: <TriangleAlert size={18} strokeWidth={2} />, val: attention,      label: "Needs attention", style: { background: "#fef2f2", color: "#b91c1c" } },
  ];

  // "Where this sits" — aggregate PO lifecycle.
  const approvalStep = attention > 0 ? "rejected" : inApproval > 0 ? "current" : approvedPlus > 0 ? "done" : "pending";
  const vendorStep = countOf("rejected_by_vendor") > 0 ? "rejected" : completedAll ? "done" : anyVendorStage ? "current" : "pending";

  // Resolve each PO's approval facts once, then hoist anything waiting on the
  // viewer to the top of the column — a PO that needs your decision is the
  // reason you opened this tab, so it should not be the third card down.
  // Array.sort is stable, so everything else keeps its server order.
  const decorated = pos.map((po) => ({ po, facts: poFacts(po, phase.approval_instances) }));
  const awaitingCount = decorated.filter((d) => d.facts.awaitingMe).length;
  const ordered = [...decorated].sort((a, b) => (b.facts.awaitingMe ? 1 : 0) - (a.facts.awaitingMe ? 1 : 0));

  // One approval panel per PO that has one, in the cards' own order. A PO with
  // no instance yet gets no panel — there is nothing to show, and its card
  // already says "Draft — not yet initiated"; three identical "no approval
  // yet" boxes would be noise, not information. Naming is decided by the
  // number of PURCHASE ORDERS, not the number of panels: one panel beside
  // three cards still has to say which of the three it belongs to.
  const approvalPanels = ordered.filter((d) => d.facts.inst);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <section className="stat-strip">
        {STATS.map((s) => (
          <div className="stat-card" key={s.key}>
            <div className={s.cls} style={s.style}>{s.icon}</div>
            <div>
              <div className={`s-val${s.mono ? " mono" : ""}`}>{s.val}</div>
              <div className="s-label">{s.label}</div>
            </div>
          </div>
        ))}
      </section>

      <div className="ccm-grid">
        {/* LEFT — PO cards */}
        <div style={{ minWidth: 0 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>Purchase orders</h2>
          <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 4, marginBottom: 12 }}>
            {awaitingCount > 0 ? (
              <>
                <strong style={{ color: "var(--warn)" }}>
                  {awaitingCount} purchase order{awaitingCount === 1 ? "" : "s"} {awaitingCount === 1 ? "is" : "are"} waiting on your approval.
                </strong>{" "}
                Open {awaitingCount === 1 ? "it" : "them"} to review the line items and decide — approvals are taken inside the PO.
              </>
            ) : (
              <>{total} purchase order{total === 1 ? "" : "s"} raised from this RFQ. Click any to open it in the PO dashboard.</>
            )}
          </div>
          <div className="prop-list">
            {ordered.map((d, idx) => (
              <PoCard
                key={d.po.id || d.po.po_number}
                po={d.po}
                facts={d.facts}
                ordinal={idx + 1}
                showShare={total > 1}
                share={totalValue > 0 ? Math.round(((Number(d.po.total_amount) || 0) / totalValue) * 100) : 0}
              />
            ))}
          </div>
        </div>

        {/* RIGHT — approval progress + where this sits */}
        <aside className="ccm-aside">
          {approvalPanels.length > 0
            ? approvalPanels.map((d) => (
                <ApprovalProgress key={`approval-${d.po.id}`} po={d.po} inst={d.facts.inst} named={total > 1} />
              ))
            : <ApprovalProgress po={null} inst={null} named={false} />}

          <div className="workflow">
            <div className="wf-head">
              <div className="t">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>{" "}
                Where this sits
              </div>
            </div>
            <div className="wf-step done">
              <div className="wf-node" />
              <div className="body">
                <div className="nm">Purchase orders raised</div>
                <div className="meta">{total} PO{total === 1 ? "" : "s"} · {inr(totalValue)} total</div>
              </div>
            </div>
            <div className={`wf-step ${approvalStep}`}>
              <div className="wf-node" />
              <div className="body">
                <div className="nm">Internal approval</div>
                <div className="meta">
                  {approvalStep === "rejected" ? `${attention} rejected` : approvalStep === "current" ? `${inApproval} in approval` : approvalStep === "done" ? "All approved" : "Awaiting approval"}
                </div>
              </div>
            </div>
            <div className={`wf-step ${vendorStep}`}>
              <div className="wf-node" />
              <div className="body">
                <div className="nm">Vendor acceptance &amp; fulfilment</div>
                <div className="meta">
                  {vendorStep === "rejected" ? "Rejected by a vendor" : vendorStep === "done" ? "Completed" : vendorStep === "current" ? "With vendors" : "Not started"}
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
