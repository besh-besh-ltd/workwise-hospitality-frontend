// Pure helpers for the PR detail page: header progress, the approval chain
// (real engine steps merged with the policy steps that were skipped), and the
// error body of a rejected service call. No React here.

import { formatINR } from "./prFormat";

const POOL = new Set(["in_pool", "needs_mapping", "awaiting_catalog"]);

/**
 * The PR's header progress from its lines — the list's HEADER_PROGRESS_JOIN
 * rule (the detail payload does not carry it). null unless approved with a
 * live line.
 */
export function headerProgress(status, lines) {
  if (status !== "approved") return null;
  const progs = (lines || []).map((l) => l.progress).filter((p) => p && p !== "cancelled");
  if (progs.length === 0) return null;
  const pool = progs.filter((p) => POOL.has(p)).length;
  const src = progs.filter((p) => p === "in_sourcing").length;
  const ord = progs.filter((p) => p === "ordered").length;
  const closed = progs.filter((p) => p === "closed").length;
  if (pool + src === 0) return closed > 0 ? "completed" : "ordered";
  if (ord > 0) return "partly_ordered";
  if (src > 0 && pool > 0) return "partly_in_sourcing";
  if (src > 0) return "in_sourcing";
  return "in_queue";
}

/** The error body of a rejected call, whichever way the service wrapped it. */
export const errorBody = (e) => e?.response?.data || e?.message?.response?.data || e?.data || null;

export const NO_APPROVER_COPY = "No eligible approver — contact your admin";
export const NO_APPROVER_RECOVERY =
  "Nobody on this step can act. To move it on, ask the requester to withdraw and resubmit, or your admin to fix the approver role.";

const SKIP_COPY = {
  below_threshold: (s) => `Not required below ${formatINR(s.min_amount)}`,
  sod_self: () => "Skipped — raised by the requester",
};

export const skipCopy = (s) => (SKIP_COPY[s.reason] || (() => "Skipped"))(s);

const metadataOf = (approval) => {
  const m = approval?.metadata;
  if (!m) return {};
  if (typeof m === "string") {
    try { return JSON.parse(m) || {}; } catch (_) { return {}; }
  }
  return m;
};

/** Approvers who can still act on a step: PENDING and not removed (the server's now_with rule). */
export const eligibleApprovers = (step) =>
  (step?.approvers || []).filter((a) => a.status === "PENDING" && !a.removed_at);

/**
 * The approval chain in POLICY order: every real instance step plus every
 * policy step the engine skipped (below the value threshold, or the requester
 * was its only approver).
 *
 * Instance steps are numbered 1..n over the surviving steps only; skipped
 * steps carry the policy step_order. The `approval_started` event of this
 * instance maps each instance step to its policy step order. Without it, the
 * surviving steps are assumed to fill the policy slots the skipped ones left.
 *
 * Returns rows `{ kind: "step", step, ... } | { kind: "skip", skip, ... }`.
 */
export function approvalRows(approval, events) {
  if (!approval) return [];
  const real = (approval.steps || []).filter((s) => s.status !== "REMOVED");
  const skipped = [...((metadataOf(approval).approval_diagnostics || {}).skipped_steps || [])]
    .filter((s) => Number.isFinite(Number(s.step_order)))
    .sort((a, b) => Number(a.step_order) - Number(b.step_order));

  const started = [...(events || [])]
    .reverse()
    .find((e) => e.event_type === "approval_started" && Number(e.payload?.instance_id) === Number(approval.id));
  const policyOrderOf = new Map(
    (started?.payload?.steps || [])
      .filter((s) => s.policy_step_order != null)
      .map((s) => [Number(s.step_order), Number(s.policy_step_order)]),
  );

  let orders;
  if (real.length > 0 && real.every((s) => policyOrderOf.has(Number(s.step_order)))) {
    orders = real.map((s) => policyOrderOf.get(Number(s.step_order)));
  } else {
    const taken = new Set(skipped.map((s) => Number(s.step_order)));
    let slot = 1;
    orders = real.map(() => {
      while (taken.has(slot)) slot += 1;
      return slot++;
    });
  }

  const rows = [
    ...real.map((step, i) => ({ kind: "step", key: `step-${step.step_order}`, order: orders[i], tie: 0, step })),
    ...skipped.map((skip) => ({ kind: "skip", key: `skip-${skip.step_order}`, order: Number(skip.step_order), tie: 1, skip })),
  ];
  return rows.sort((a, b) => a.order - b.order || a.tie - b.tie);
}

/** "Hari, Mina, Raj +2" */
export const namesList = (names, max = 3) => {
  const list = (names || []).filter(Boolean);
  if (list.length <= max) return list.join(", ");
  return `${list.slice(0, max).join(", ")} +${list.length - max}`;
};

export const fmtDate = (iso) => {
  if (!iso) return "—";
  // "YYYY-MM-DD" is a calendar date: render it without a timezone shift.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  const d = m ? new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))) : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...(m ? { timeZone: "UTC" } : { timeZone: "Asia/Kolkata" }) });
};

export const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
};

export const initialsOf = (name) =>
  (name || "?").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]).join("").toUpperCase();

/** What the line is: the catalog variant, else the free text. */
export const lineName = (l) => l.variant_name || l.product_name || l.free_text_name || `Item ${l.line_no}`;

export const PR_TYPE_LABEL = { goods: "Goods", service: "Service", capex: "Capex" };
export const URGENCY_LABEL = { low: "Low", normal: "Normal", urgent: "Urgent" };
export const ATTACHMENT_KIND_LABEL = { spec: "Specification", datasheet: "Datasheet", qap: "QAP", other: "Other" };
export const REVIEW_STATUS_LABEL = { pending: "Pending", completed: "Completed", sent_back: "Sent back", superseded: "Superseded" };
