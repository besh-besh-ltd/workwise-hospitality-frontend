// The shared vocabulary for "what state is this approver actually in?".
//
// A stored approver row only ever holds PENDING / APPROVED / REJECTED /
// REMOVED — nothing closes out the people who never got to act. So when an ANY
// level clears on one approval, the other six stay literally PENDING forever,
// and a level that was rejected or cancelled leaves everyone downstream of the
// decision PENDING too. Rendering those rows as "pending" says "we are still
// waiting on them" about a level that is finished, which is simply false.
//
// The display state is therefore the approver's status read TOGETHER WITH the
// level's, which is what `effectiveApproverStatus` below derives. Its six
// outcomes — REMOVED / APPROVED / REJECTED / NOT_REQUIRED / NOT_REACHED /
// PENDING — are the vocabulary, and every surface that renders an approver row
// must resolve a given row to the same one of them.
//
// This module exists because that rule had been written three times. The
// remaining copies, and why they are still separate:
//
//   • app/models/poDashboardModel.js `effectiveStatusOf` (server) — the
//     canonical copy. The rules here mirror it deliberately, including its
//     refusal to bucket the one anomalous case (see ALL/APPROVED below).
//   • components/dashboard/buyer/purchase-orders/PODetail.js — prefers the
//     server's own `effective_status` field when the payload carries it and
//     only falls back to a local derivation, and it reads the PO details
//     payload's LOWERCASE step statuses ("done"/"skipped") rather than the
//     stored uppercase ones. Folding it in here would be a rewrite, not a
//     move, so it stays where it is; keep the two in step.
//
// Consumers pass a `step` in the stored shape: `{ status, decision_rule,
// approvers: [{ status, acted_at, ... }] }`. A payload that describes steps
// some other way (the quote-comparison drawer's lowercase node statuses, for
// one) normalises into that shape at the call site rather than teaching this
// module a second dialect.

export const effectiveApproverStatus = (approver, stepStatus, decisionRule) => {
  const st = String(approver?.status || "").toUpperCase();
  if (st === "REMOVED") return "REMOVED";
  if (st === "APPROVED") return "APPROVED";
  if (st === "REJECTED") return "REJECTED";
  // SKIPPED is permitted by the approver-status CHECK constraint but does not
  // occur in the data today. It records a row that was closed out WITHOUT ever
  // being asked to act, which is precisely what "Not required" says — so it is
  // mapped here deliberately and by name, not left to fall through to the
  // PENDING default. "Awaiting" would be the one reading it cannot have.
  if (st === "SKIPPED") return "NOT_REQUIRED";
  const lvl = String(stepStatus || "").toUpperCase();
  if (lvl === "REJECTED" || lvl === "CANCELLED") return "NOT_REACHED";
  // An ALL level cannot legitimately close with someone still outstanding, so a
  // PENDING row under APPROVED/ALL is a data anomaly. Calling it "not required"
  // would assert something we cannot justify; keep the raw value instead. This
  // matches poDashboardModel.effectiveStatusOf exactly — the surfaces show the
  // same approval and must not disagree about it.
  //
  // Note what the missing-rule case does: a cleared level whose rule this build
  // does not know reads as NOT_REQUIRED, the same as ANY. That is not a default
  // to ANY — it is the server's rule verbatim, and the alternative (claiming we
  // are still waiting on someone a closed level moved past) is the worse lie.
  // Callers that would have to NAME a rule or name who a level waits on stay
  // silent instead when `decision_rule` is absent; see `ruleLabel`.
  if (lvl === "APPROVED") {
    return String(decisionRule || "").toUpperCase() === "ALL" ? "PENDING" : "NOT_REQUIRED";
  }
  // A LEVEL the mid-flight reconciler skipped or removed never asked anyone on
  // it either — same reading as a cleared ANY level, same as effectiveStatusOf.
  if (lvl === "SKIPPED" || lvl === "REMOVED") return "NOT_REQUIRED";
  return "PENDING";                                            // genuinely outstanding
};

// Two aggregates, never one. A REMOVED approver row is a mid-flight
// reconciler's soft-tombstone (their role/scope was revoked while the approval
// was open) — it stays visible for the audit trail but must never be counted in
// an "N of M", never be named as someone we are waiting on, and never be the
// single name a level shows. `removed` is reported entirely separately.
export const tallyStep = (step) => {
  const all = Array.isArray(step?.approvers) ? step.approvers : [];
  const rows = all.map((ap) => ({ ap, eff: effectiveApproverStatus(ap, step?.status, step?.decision_rule) }));
  const of = (...effs) => rows.filter((r) => effs.includes(r.eff));
  const removed = of("REMOVED");
  const active = rows.filter((r) => r.eff !== "REMOVED");
  const acted = of("APPROVED", "REJECTED")
    // Oldest decision first — the level reads as the order it actually happened.
    .sort((a, b) => String(a.ap?.acted_at || "").localeCompare(String(b.ap?.acted_at || "")));
  return {
    active, removed, acted,
    // Server order is meaningful (contract), so these groups keep it.
    outstanding: of("PENDING"),
    notRequired: of("NOT_REQUIRED"),
    notReached: of("NOT_REACHED"),
    approved: of("APPROVED").length,
    rejected: of("REJECTED").length,
    // ACTIVE approvers only, so approved + rejected + outstanding +
    // notRequired + notReached === total — the server's own invariant, and the
    // reason `removed` is reported entirely separately.
    total: active.length,
  };
};

// null, never a guess. ANY and ALL mean opposite things about who is blocking,
// so a surface that does not know the rule must say nothing rather than pick
// the friendlier reading.
export const ruleLabel = (rule) => (rule === "ALL" ? "all must approve" : rule === "ANY" ? "any one approves" : null);

// "SOME_NEW_STATE" → "Some new state". Only ever used as chip TEXT, never in a
// className — an unmatched enum value must not be able to reach a stylesheet.
export const humanizeStatus = (s) => {
  const raw = String(s || "").replace(/_/g, " ").trim().toLowerCase();
  return raw ? raw.charAt(0).toUpperCase() + raw.slice(1) : "Unknown";
};

// Level chip. Every stored step status has an explicit case (APPROVED /
// PENDING / REJECTED / CANCELLED), plus SKIPPED / REMOVED for the mid-flight
// reconciler's own step states, plus a neutral, honestly-labelled default so a
// status this build has never heard of can't silently render as "waiting".
// `cls` is a tone token ("success" | "danger" | "neutral" | "warn", with an
// optional " pulse" modifier) — the caller maps it to its own stylesheet; the
// closed set is what stops an unknown status reaching a class name.
export const levelPill = (stepStatus, isCurrent) => {
  switch (String(stepStatus || "").toUpperCase()) {
    case "APPROVED":  return { cls: "success", text: "Cleared" };
    case "REJECTED":  return { cls: "danger",  text: "Rejected" };
    case "CANCELLED": return { cls: "neutral", text: "Cancelled" };
    case "SKIPPED":   return { cls: "neutral", text: "Skipped" };
    case "REMOVED":   return { cls: "neutral", text: "Removed" };
    case "PENDING":
    case "":          return isCurrent ? { cls: "warn pulse", text: "Reviewing now" } : { cls: "neutral", text: "Waiting" };
    default:          return { cls: "neutral", text: humanizeStatus(stepStatus) };
  }
};

// The words for the six outcomes, so two surfaces cannot label the same row
// differently. PENDING is the only one whose wording depends on context: on the
// level that is live it means "we are waiting on you", anywhere else it means
// "your turn has not come round yet".
export const approverStateLabel = (eff) => {
  switch (eff) {
    case "APPROVED":     return "Approved";
    case "REJECTED":     return "Rejected";
    case "NOT_REQUIRED": return "Not required";
    case "NOT_REACHED":  return "Not reached";
    case "REMOVED":      return "Removed";
    default:             return "Pending";
  }
};

// "Asha, Ravi +3" — a roster preview that stays one line at any level size.
export const namePreview = (names, max = 2) => {
  const list = (names || []).filter(Boolean);
  const shown = list.slice(0, max);
  if (!shown.length) return null;
  const extra = list.length - shown.length;
  return `${shown.join(", ")}${extra > 0 ? ` +${extra}` : ""}`;
};
