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
// NOT every approval type gets Approve/Reject here. A vendor award
// (NEGOTIATION_QUOTE) is one line item out of many on one RFQ, and its real
// decision surface already exists: the per-cell Approve/Reject in the embedded
// comparison sheet, which shows the product, the vendor, the price and lets the
// approver decide several lines at once. Duplicating it here produced the
// production defect this card is now fixing — four identical anonymous cards in
// a row ("Negotiation & Award — awaiting your approval" / "You have a pending
// approval action"), each one a different line item, so approving felt like
// nothing happened. Awards therefore render an urgency BANNER that carries the
// context and scrolls to the cell.
//
// A PURCHASE ORDER (PO) is the same problem with money on it. Approving one
// from this card meant committing ₹ to a vendor without ever seeing the line
// items, quantities, rates, taxes, milestones or the approval trail — none of
// which this card carries and all of which are on the PO details page. POs
// therefore render the same banner, pointing at
// /dashboard/buyer/purchase-orders/{po_id}, so the tab says "go inside the PO"
// instead of offering a blind Approve.
//
// RFQ, tender and technical approvals keep their buttons: what they decide is
// the page the approver is already reading.
//
// Styling follows this directory's convention (RfqStageTimeline / StageShared):
// global arc_v2.css primitives (.approve-aside, .aa-*, .btn) plus inline styles.
import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";
import { ShieldCheck, AlertTriangle, ArrowRight, Handshake } from "lucide-react";

import { submitApprovalAction } from "@/services/approval";

// Anchor id — deep links from the "Waiting on you" queue arrive with
// ?focus=approval and scroll to this element.
export const APPROVAL_DECISION_ANCHOR_ID = "rfq-approval-decision";

// Vendor award, per RFQ product line. Decided on the comparison sheet's cells.
export const AWARD_ENTITY_TYPE = "NEGOTIATION_QUOTE";
// Negotiation ROUND (not an award). Decided in the Negotiations module.
// NOTE: getLifecycleSummary never loads NEGOTIATION instances (rfqModel.js:
// 4612-4615 loads only RFQ|TENDER, TECHNICAL, NEGOTIATION_QUOTE and PO), so this
// branch cannot currently render on this page. It is here so that the day the
// endpoint does load them, the card points at the module that owns them instead
// of offering a second, wrong approve path.
export const ROUND_ENTITY_TYPE = "NEGOTIATION";
// Purchase order. Decided on the PO details page, where the money is visible.
export const PO_ENTITY_TYPE = "PO";

// What the approver is actually deciding. Drives both the headline and the
// toast — the toast used to say "RFQ approved" for every type, so awarding one
// line item announced that the whole RFQ had been approved.
const ENTITY_NOUN = {
  [AWARD_ENTITY_TYPE]: "Vendor award",
  [ROUND_ENTITY_TYPE]: "Negotiation round",
  TECHNICAL: "Technical evaluation",
  PO: "Purchase order",
};

const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `₹${n.toLocaleString("en-IN")}` : null;
};

const isPendingApprover = (a) => String(a?.status || "").toUpperCase() === "PENDING";

/**
 * Progress on an instance's CURRENT step: how many of this step's approvers have
 * acted, and who is still holding it up.
 *
 * This is the number whose absence made the production card look stuck. RFQ
 * #536264 runs an ALL rule with four approvers on step 1; every approval moved
 * one instance forward and re-rendered a card that read exactly the same.
 */
function stepProgress(inst) {
  const steps = Array.isArray(inst?.steps) ? inst.steps : [];
  const row = steps.find((s) => Number(s.step_order) === Number(inst?.current_step)) || null;
  const allApprovers = Array.isArray(row?.approvers) ? row.approvers : [];
  // REMOVED rows are a mid-flight reconciler's soft-tombstone (role revoked
  // while the approval was in progress) — they are not live approvers, so
  // they must not inflate "N of M approvers done".
  const approvers = allApprovers.filter((a) => String(a?.status || "").toUpperCase() !== "REMOVED");
  if (!approvers.length) return null;
  return {
    done: approvers.filter((a) => !isPendingApprover(a)).length,
    total: approvers.length,
    waitingOn: approvers.filter(isPendingApprover).map((a) => a.user_name).filter(Boolean),
    decisionRule: row?.decision_rule || null,
  };
}

/**
 * Product / vendor / ₹ context for ONE award instance.
 *
 * Sources, in the order they are trusted:
 *  - `metadata` on the instance itself: product_name (enriched by
 *    getLifecycleSummary step 3b — empty on the production rows we checked),
 *    vendor_id, po_payload.total_value, selected_quotes[] (the negotiation
 *    -initiated variant carries vendor_name + quoted_price inline).
 *  - the commercial phase's own `products[]` — the very payload the Negotiation
 *    & Award stage already renders — matched on rfq_product_id. It supplies the
 *    human-readable product name and the finalized vendor's company.
 * Anything still missing is simply not shown; nothing is invented.
 */
function describeAward(inst, stage) {
  const meta = inst?.metadata || {};
  const phaseProducts = Array.isArray(stage?.phase?.products) ? stage.phase.products : [];
  const keys = [meta.rfq_product_id, inst?.entity_id, meta.product_variant_id]
    .filter((k) => k != null)
    .map(String);
  const product = phaseProducts.find((p) => keys.includes(String(p?.product_id))) || null;
  const fin = product?.finalization || null;
  const quote = Array.isArray(meta.selected_quotes) ? meta.selected_quotes[0] : null;

  return {
    instanceId: Number(inst?.id),
    productId: meta.rfq_product_id ?? inst?.entity_id ?? null,
    productName: meta.product_name || product?.product_name || null,
    vendorName: quote?.vendor_name || fin?.vendor_company || fin?.vendor_name || null,
    vendorId: meta.vendor_id ?? quote?.vendor_id ?? null,
    value:
      meta?.po_payload?.total_value
      ?? fin?.total_price
      ?? fin?.finalized_price
      ?? quote?.quoted_price
      ?? null,
    currentStep: inst?.current_step ?? null,
    totalSteps: inst?.total_steps ?? null,
    progress: stepProgress(inst),
  };
}

/**
 * Step progress from the server's OWN counts, for a payload that carries the PO
 * row's `approval` block but no steps[] on the instance.
 *
 * `approval` is one of the fields the lifecycle endpoint is gaining alongside
 * this change; the two repos deploy separately, so it is absent on an older
 * backend — in which case there is simply no fraction to show and stepProgress
 * (the primary source) has already had its turn.
 */
function approvalCounts(approval) {
  const total = Number(approval?.total_count);
  if (!Number.isFinite(total) || total <= 0) return null;
  const done = Number(approval?.approved_count);
  return {
    done: Number.isFinite(done) ? done : 0,
    total,
    waitingOn: [],
    decisionRule: approval?.decision_rule || null,
  };
}

/**
 * PO number / vendor / ₹ context for ONE purchase-order approval instance.
 *
 * Sources, in the order they are trusted:
 *  - the instance's `entity_id` — for a PO approval that IS the purchase order
 *    id, and it is the only field the hand-off strictly needs.
 *  - the purchase_order phase's own `purchase_orders[]` — the very array the PO
 *    stage panel renders — matched on that id. It supplies po_number, the
 *    vendor company and the ₹ total.
 * `initiated_by` and `approval` on those rows are newer additions; both are read
 * through `??` so the banner keeps rendering against a backend that has not
 * shipped them yet. Anything missing is simply not shown; nothing is invented.
 */
function describePO(inst, stage, stages) {
  const meta = inst?.metadata || {};
  const poId = inst?.entity_id ?? meta.po_id ?? null;

  // In production the list is on the stage this instance was found on (the PO
  // approval is loaded on the purchase_order phase). Scanning the other stages
  // costs nothing and survives a re-shaped lifecycle.
  const rows =
    (Array.isArray(stage?.phase?.purchase_orders) ? stage.phase.purchase_orders : null)
    ?? (Array.isArray(stages) ? stages : [])
      .map((s) => (Array.isArray(s?.phase?.purchase_orders) ? s.phase.purchase_orders : null))
      .find(Boolean)
    ?? [];

  let row = poId != null
    ? rows.find((p) => String(p?.id) === String(poId)) || null
    : null;
  // No id to match on, but exactly one PO on the RFQ → that PO is unambiguously
  // the one being approved. Two or more and we name none of them rather than
  // guess which, and the CTA falls back to the PO dashboard.
  if (!row && poId == null && rows.length === 1) row = rows[0];

  return {
    instanceId: Number(inst?.id),
    poId: poId ?? row?.id ?? null,
    poNumber: row?.po_number ?? null,
    vendorName: row?.vendor_company ?? row?.vendor_name ?? null,
    value: row?.total_amount ?? meta?.po_payload?.total_value ?? null,
    raisedBy: row?.initiated_by?.name ?? null,
    currentStep: inst?.current_step ?? null,
    totalSteps: inst?.total_steps ?? null,
    // The instance's steps[] is the primary source — it also names who the step
    // is waiting on. The PO row's counts only stand in when it is absent.
    progress: stepProgress(inst) || approvalCounts(row?.approval),
  };
}

/**
 * A stage the RFQ moved past without waiting for its approval: the publish date
 * arrived while the approval was still open, so the RFQ went out and the
 * instance was left PENDING. Nothing here is awaiting anyone — the server
 * settles it as state `ended` / reason `expired_pending`, refuses any decision
 * on it, and clears the approver's grant.
 */
export const isLapsedStage = (stage) =>
  stage?.phase?.status === "expired" || stage?.reason === "expired_pending";

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
 * Lapsed stages are excluded from both. This card used to honour (2) on them
 * precisely BECAUSE (1) skips them — the reasoning being that the instance was
 * still PENDING and the endpoint still accepted the decision. Both halves of
 * that are now false: submitApprovalAction refuses a decision once the RFQ is
 * published, and the server clears can_user_approve for those instances. The
 * old behaviour is what put a live Approve/Reject card in front of 43 approvers
 * across 194 already-published RFQs — 112 of which had a purchase order issued.
 *
 * @param {object} lifecycle GET /rfq/:id/lifecycle payload
 * @returns {null | {
 *   instanceId: number, stepId: number|null, currentStep: number|null,
 *   totalSteps: number|null, entityType: string|null, stageLabel: string|null,
 *   label: string|null, approvers: Array,
 *   progress: object|null, awardCount: number, awardItems: Array,
 *   poCount: number, poItems: Array,
 * }}
 */
export function resolveRfqApprovalDecision(lifecycle) {
  const action = lifecycle?.action || null;
  const stages = Array.isArray(lifecycle?.stages) ? lifecycle.stages : [];

  // EVERY instance this user may act on — not just the first. One RFQ routinely
  // carries several pending award approvals (one per product line), and the
  // count is the single most useful thing the approver was never told.
  const pending = [];
  for (const stage of stages) {
    // A lapsed stage is one the RFQ moved past without waiting: publication
    // happened while the approval was still open, so the instance is left
    // PENDING forever. There is no decision to make — the server refuses one
    // (400) and the counts already hide it. What happened is reported by the
    // Overview approval panel instead. The server also clears can_user_approve
    // for these; this is the second lock, so a stale payload can't reopen it.
    if (isLapsedStage(stage)) continue;
    const instances = stage?.phase?.approval_instances;
    if (!Array.isArray(instances)) continue;
    for (const inst of instances) {
      if (inst?.status !== "PENDING" || !inst?.can_user_approve) continue;
      pending.push({ inst, stage });
    }
  }

  const exact = action?.instance_id != null
    ? pending.find((h) => Number(h.inst?.id) === Number(action.instance_id)) || null
    : null;
  const hit = exact || pending[0] || null;
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

  // The matched stage's `action` block is NOT stage-scoped, despite appearances:
  // rfqLifecycleShaper.js:64 assigns the SAME object reference to every current
  // stage. It is usable for a step id (the top-level action resolves one), but
  // never for the entity type — that has to come off the instance.
  const stageAction = hit?.stage?.action || null;

  // Resolve the entity type from the instance. Only fall back to the action
  // block when there is no instance at all (the can_approve-only path), where
  // the top-level action IS the only description of what is being decided.
  const entityType = inst
    ? (inst.entity_type || null)
    : (action?.entity_type || null);

  // Award context. Ordered so the instance the server pointed us at is first —
  // that is the one the banner describes in full.
  const awards = pending.filter((h) => h.inst?.entity_type === AWARD_ENTITY_TYPE);
  const orderedAwards = hit
    ? [
        ...awards.filter((h) => Number(h.inst?.id) === Number(instanceId)),
        ...awards.filter((h) => Number(h.inst?.id) !== Number(instanceId)),
      ]
    : awards;

  // PO context, ordered the same way. One RFQ can carry several purchase
  // orders (one per finalized vendor), so several can await the same approver.
  const pos = pending.filter((h) => h.inst?.entity_type === PO_ENTITY_TYPE);
  const orderedPos = hit
    ? [
        ...pos.filter((h) => Number(h.inst?.id) === Number(instanceId)),
        ...pos.filter((h) => Number(h.inst?.id) !== Number(instanceId)),
      ]
    : pos;

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
    entityType,
    stageLabel: hit?.stage?.label || null,
    // How far the CURRENT step has got, and who is still holding it.
    progress: stepProgress(inst),
    // Every award on this RFQ awaiting THIS user, first one described in full.
    awardCount: awards.length,
    awardItems: entityType === AWARD_ENTITY_TYPE
      ? orderedAwards.map((h) => describeAward(h.inst, h.stage))
      : [],
    // Every PO on this RFQ awaiting THIS user, the pointed-at one described
    // in full — that is the one the banner links into.
    poCount: pos.length,
    poItems: entityType === PO_ENTITY_TYPE
      ? orderedPos.map((h) => describePO(h.inst, h.stage, stages))
      : [],
    // Only trust the top-level copy when the top-level grant is what got us
    // here; otherwise it describes a different (evaluator) role.
    label: action?.can_approve ? (action.label || null) : null,
    // Exclude REMOVED rows here too — this list only feeds the "On this
    // step: <names>" line, which would otherwise still name someone whose
    // access was revoked mid-flight as if they were a live approver.
    approvers: (Array.isArray(stepRow?.approvers) ? stepRow.approvers : [])
      .filter((a) => String(a?.status || "").toUpperCase() !== "REMOVED"),
  };
}

// Service errors arrive as { message: <axios error> } (services/approval.js) —
// dig out the server's message before falling back to something generic.
const errText = (err) =>
  err?.message?.response?.data?.message ||
  err?.response?.data?.message ||
  (typeof err?.message === "string" ? err.message : null) ||
  "Could not submit your decision. Please try again.";

/* ── Urgency banner shell — shared by the award and the round branches. ──
   Deliberately NOT a decision control: it states the scale, carries the
   context and hands over to the surface that owns the decision. */
function UrgencyBanner({ entityLabel, headline, children, action }) {
  return (
    <section
      id={APPROVAL_DECISION_ANCHOR_ID}
      className="approve-aside"
      style={{ padding: 14, borderColor: "rgba(180,83,9,0.34)" }}
      aria-label={`${entityLabel} approval — action needed`}
    >
      <div className="aa-head" style={{ marginBottom: 8 }}>
        <div className="here-now">Action needed</div>
      </div>
      <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ flex: "1 1 380px", minWidth: 0 }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 7,
              fontSize: 13.5, fontWeight: 600, color: "var(--fg, #18181b)",
            }}
          >
            <AlertTriangle size={15} strokeWidth={2} style={{ color: "var(--warn, #b45309)", flexShrink: 0 }} />
            <span>{headline}</span>
          </div>
          {children}
        </div>
        <div style={{ flexShrink: 0 }}>{action}</div>
      </div>
    </section>
  );
}

// "3 of 4 approvers done — waiting on Prashant Joshi"
function ProgressLine({ progress, currentStep, totalSteps }) {
  const bits = [];
  if (progress?.total) {
    bits.push(`${progress.done} of ${progress.total} approver${progress.total === 1 ? "" : "s"} done`);
  }
  if (progress?.waitingOn?.length) {
    bits.push(`waiting on ${progress.waitingOn.join(", ")}`);
  }
  if (currentStep && totalSteps && Number(totalSteps) > 1) {
    bits.push(`step ${currentStep} of ${totalSteps}`);
  }
  if (!bits.length) return null;
  return (
    <div style={{ fontSize: 11.5, color: "var(--fg-3, #71717a)", marginTop: 6 }}>
      {bits.join(" · ")}
    </div>
  );
}

/* ── Vendor award (NEGOTIATION_QUOTE) ──
   The decision lives on the comparison sheet's product × vendor cells, where
   the approver can see the whole sheet and approve several lines at once. */
function AwardBanner({ decision, entityLabel, onFocusAward }) {
  const items = decision.awardItems || [];
  const n = decision.awardCount || items.length || 1;
  const first = items[0] || null;
  const progress = first?.progress || decision.progress || null;

  const facts = [
    first?.productName || (first?.productId ? `Item #${first.productId}` : null),
    first?.vendorName,
    money(first?.value),
  ].filter(Boolean);

  const headline = n === 1
    ? "1 vendor award on this RFQ is waiting on your approval"
    : `${n} vendor awards on this RFQ are waiting on your approval`;

  return (
    <UrgencyBanner
      entityLabel={entityLabel}
      headline={headline}
      action={
        onFocusAward ? (
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={onFocusAward}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Review &amp; approve in the comparison sheet
            <ArrowRight size={14} strokeWidth={2.2} />
          </button>
        ) : null
      }
    >
      {facts.length > 0 && (
        <div style={{ fontSize: 12.5, color: "var(--fg-2, #3f3f46)", marginTop: 6, fontWeight: 600 }}>
          {facts.join(" · ")}
          {n > 1 && (
            <span style={{ fontWeight: 500, color: "var(--fg-3, #71717a)" }}>
              {` — and ${n - 1} more award${n - 1 === 1 ? "" : "s"} on this RFQ`}
            </span>
          )}
        </div>
      )}
      <ProgressLine
        progress={progress}
        currentStep={first?.currentStep ?? decision.currentStep}
        totalSteps={first?.totalSteps ?? decision.totalSteps}
      />
      <div style={{ fontSize: 12, color: "var(--fg-3, #71717a)", lineHeight: 1.55, marginTop: 6 }}>
        Each award is a single product line. Approve or reject them on the
        Negotiation &amp; Award sheet, where you can see the product, the vendor
        and the price — and decide several lines together.
      </div>
    </UrgencyBanner>
  );
}

/* ── Purchase order (PO) ──
   The one thing an approver must not do is approve a PO from a card that does
   not show the PO. The line items, quantities, rates, taxes, the vendor's terms
   and the approval trail all live on the details page, and that is where the
   Approve / Reject controls belong. This banner names the PO well enough to
   recognise it — number, vendor, ₹, who raised it, how far the level has got —
   and hands over. */
function PoBanner({ decision, entityLabel }) {
  const items = decision.poItems || [];
  const n = decision.poCount || items.length || 1;
  const first = items[0] || null;
  const progress = first?.progress || decision.progress || null;

  // The PO id is the instance's entity_id, so this normally resolves. When it
  // does not (no entity_id and more than one PO on the RFQ) the dashboard is
  // still a truthful destination — it lists every PO on the account.
  const hasPo = first?.poId != null;
  const href = hasPo
    ? `/dashboard/buyer/purchase-orders/${first.poId}`
    : "/dashboard/buyer/purchase-orders";

  const facts = [
    // The number is in the headline unless the headline is carrying the count.
    n > 1 ? first?.poNumber : null,
    first?.vendorName,
    money(first?.value),
    first?.raisedBy ? `Raised by ${first.raisedBy}` : null,
  ].filter(Boolean);

  const headline = n > 1
    ? `${n} purchase orders on this RFQ are waiting on your approval`
    : first?.poNumber
      ? `Purchase order ${first.poNumber} is waiting on your approval`
      : "A purchase order on this RFQ is waiting on your approval";

  return (
    <UrgencyBanner
      entityLabel={entityLabel}
      headline={headline}
      action={
        <Link
          href={href}
          className="btn btn-success btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          {hasPo ? "Review & approve in the purchase order" : "Open the PO dashboard"}
          <ArrowRight size={14} strokeWidth={2.2} />
        </Link>
      }
    >
      {facts.length > 0 && (
        <div style={{ fontSize: 12.5, color: "var(--fg-2, #3f3f46)", marginTop: 6, fontWeight: 600 }}>
          {facts.join(" · ")}
          {n > 1 && (
            <span style={{ fontWeight: 500, color: "var(--fg-3, #71717a)" }}>
              {` — and ${n - 1} more purchase order${n - 1 === 1 ? "" : "s"} on this RFQ`}
            </span>
          )}
        </div>
      )}
      <ProgressLine
        progress={progress}
        currentStep={first?.currentStep ?? decision.currentStep}
        totalSteps={first?.totalSteps ?? decision.totalSteps}
      />
      <div style={{ fontSize: 12, color: "var(--fg-3, #71717a)", lineHeight: 1.55, marginTop: 6 }}>
        A purchase order commits money to a vendor. Approve or reject it inside
        the PO, where the line items, quantities, rates and taxes sit next to the
        decision — along with the full approval trail.
      </div>
    </UrgencyBanner>
  );
}

/* ── Negotiation ROUND (NEGOTIATION) ──
   Defensive branch: the lifecycle endpoint does not load these instances today
   (see ROUND_ENTITY_TYPE above), so this cannot render on this page yet. */
function RoundBanner({ decision, entityLabel, rfqId }) {
  return (
    <UrgencyBanner
      entityLabel={entityLabel}
      headline="A negotiation round on this RFQ is waiting on your approval"
      action={
        rfqId ? (
          <Link
            href={`/dashboard/buyer/negotiation/${rfqId}/approve`}
            className="btn btn-success btn-sm"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Handshake size={14} strokeWidth={2.2} />
            Open in Negotiations
          </Link>
        ) : null
      }
    >
      <ProgressLine
        progress={decision.progress}
        currentStep={decision.currentStep}
        totalSteps={decision.totalSteps}
      />
      <div style={{ fontSize: 12, color: "var(--fg-3, #71717a)", lineHeight: 1.55, marginTop: 6 }}>
        Rounds carry target prices and per-vendor terms, so they are approved in
        the Negotiations module rather than here.
      </div>
    </UrgencyBanner>
  );
}

export default function RfqApprovalDecisionCard({
  lifecycle,
  entityLabel = "RFQ",
  rfqId = null,
  onDecided,
  onFocusAward,
}) {
  const decision = useMemo(() => resolveRfqApprovalDecision(lifecycle), [lifecycle]);
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!decision) return null;

  // What is actually being decided. `entityLabel` (RFQ / Tender) only describes
  // the RFQ-level approval; using it for everything is what made awarding one
  // line item announce "RFQ approved".
  const noun = ENTITY_NOUN[decision.entityType] || entityLabel;
  // Mid-sentence form: "this purchase order" reads right, "this RFQ" must keep
  // its capitals.
  const nounInline = ENTITY_NOUN[decision.entityType]
    ? ENTITY_NOUN[decision.entityType].toLowerCase()
    : entityLabel;

  // Awards, purchase orders and rounds are decided elsewhere — banner, never
  // buttons. Each one carries context this card cannot show, and deciding
  // without it is what made these approvals unauditable.
  if (decision.entityType === AWARD_ENTITY_TYPE) {
    return (
      <AwardBanner
        decision={decision}
        entityLabel={entityLabel}
        onFocusAward={onFocusAward}
      />
    );
  }
  if (decision.entityType === PO_ENTITY_TYPE) {
    // A PO approval surfaces NOTHING here. It gets no Approve/Reject — deciding
    // a PO without the line items, rates and taxes in front of you is not a
    // decision — and no banner either: RfqStageTimeline already marks the
    // Purchase Order stage as needing this user's action, and the stage panel
    // itself hoists and highlights the PO card that is waiting on them. A third
    // announcement of the same fact above the tab is redundant, so it is not
    // rendered. PoBanner is kept below, unused, because the copy and the
    // hand-off it encodes are what we would want back if this is revisited.
    return null;
  }
  if (decision.entityType === ROUND_ENTITY_TYPE) {
    return (
      <RoundBanner
        decision={decision}
        entityLabel={entityLabel}
        rfqId={rfqId ?? lifecycle?.rfq_id ?? null}
      />
    );
  }

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
        action === "APPROVE" ? `${noun} approved` : `${noun} rejected`,
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
            {`${noun} — awaiting your approval`}
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-3, #71717a)", lineHeight: 1.55, marginTop: 5 }}>
            {decision.label
              || `You are the current approver. Approving moves this ${nounInline} to the next stage; rejecting sends it back with your reason.`}
          </div>
          {approverNames && (
            <div style={{ fontSize: 11.5, color: "var(--fg-3, #71717a)", marginTop: 7 }}>
              <span style={{ fontWeight: 600, color: "var(--fg-2, #3f3f46)" }}>On this step:</span>{" "}
              {approverNames}
            </div>
          )}
          <ProgressLine progress={decision.progress} />
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
