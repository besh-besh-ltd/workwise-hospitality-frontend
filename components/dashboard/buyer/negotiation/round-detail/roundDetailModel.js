// Negotiation Command Center — view model.
//
// Everything the page renders is derived here, in one pure module, from the
// raw `GET /negotiation/rounds/:id/detail?scope=round|cycle` body. Two reasons
// it lives apart from the components:
//
//   1. RESILIENCE. The backend contract lands after this UI does, so nothing
//      may assume a field exists. Every read goes through `pickNum`/`pickStr`/
//      `pickBool` with a list of plausible aliases, and every derived number
//      has a client-side fallback computed from whatever IS present (line
//      total from unit × qty, saved from baseline − achieved, pct from saved /
//      baseline, totals from the lines). If the server later renames a field
//      the fix is one alias in one array.
//
//   2. TESTABILITY. Outcome classification, signed formatting, chart-line
//      eligibility and the aggregate math are the parts that are easy to get
//      wrong and expensive to get wrong (these are crores of rupees), so they
//      are asserted directly rather than through the DOM.
//
// Two product rules are encoded here and must not be "simplified" away:
//   • Savings are SIGNED and UNCLAMPED. A revised price that went up is a real
//     production case; the dashboard tile clamps it to zero, this page does
//     not — it is the diagnostic surface.
//   • A target that was never set is never implied. ~60% of rounds carry no
//     numeric target; those lines report achieved-only and must not be scored
//     against a target that does not exist.

// ── low-level readers ──────────────────────────────────────────────────────

/** First key on `obj` that holds something meaningful (not undefined/null/""). */
export function firstDefined(obj, keys) {
  if (!obj || typeof obj !== "object") return undefined;
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

/** Finite number or null. Tolerates numeric strings ("1234.50") from PG NUMERIC. */
export function pickNum(obj, keys) {
  const v = firstDefined(obj, keys);
  if (v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Non-empty trimmed string or null. */
export function pickStr(obj, keys) {
  const v = firstDefined(obj, keys);
  if (v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** Tri-state boolean: true / false / null (unknown). Accepts 1/0/"1"/"true"/"Y". */
export function pickBool(obj, keys) {
  const v = firstDefined(obj, keys);
  if (v === undefined) return null;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["1", "true", "t", "yes", "y"].includes(s)) return true;
  if (["0", "false", "f", "no", "n"].includes(s)) return false;
  return null;
}

/** Arrays arrive as arrays, or as JSON text from a json_agg column. */
export function asArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch (_) {
      return [];
    }
  }
  return [];
}

// ── target field taxonomy ──────────────────────────────────────────────────

// Targets that are NOT money and must never reach a chart axis. Plotting
// "payment_terms: 30 days" as a number is a real trap — these render as chips
// on the line instead.
//
// The backend's own non-charge slug set is
// ['base_price','delivery_period','payment_terms','vendor_tc','comments','documents']
// (negotiationController.js NON_CHARGE_SYSTEM_SLUGS); everything outside it is a
// dynamic charge slug off tbl_charge_names, which IS money. So the rule is:
// base_price + any charge slug are numeric, and this list is everything else.
// `comment` / `global_comment` are carried too because that is what the quote
// side calls the same thing.
export const NON_NUMERIC_TARGET_FIELDS = [
  "payment_terms",
  "documents",
  "comment",
  "comments",
  "global_comment",
  "delivery_period",
  "vendor_tc",
];

const NON_NUMERIC_SET = new Set(NON_NUMERIC_TARGET_FIELDS);

export const TARGET_FIELD_LABELS = {
  payment_terms: "Payment terms",
  documents: "Documents",
  comment: "Comment",
  comments: "Comments",
  global_comment: "Global comment",
  delivery_period: "Delivery period",
  vendor_tc: "Vendor T&C",
  base_price: "Base price",
  freight: "Freight",
  packaging: "Packaging",
};

/** Strip the persistence prefix so `target_payment_terms` → `payment_terms`. */
export function normalizeFieldKey(key) {
  if (!key) return null;
  return String(key)
    .trim()
    .toLowerCase()
    .replace(/^target_/, "")
    .replace(/_mode$/, "");
}

export function isNonNumericTargetField(key) {
  const k = normalizeFieldKey(key);
  return !!k && NON_NUMERIC_SET.has(k);
}

export function targetFieldLabel(key) {
  const k = normalizeFieldKey(key);
  if (!k) return "Target";
  return (
    TARGET_FIELD_LABELS[k] ||
    k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())
  );
}

// ── outcomes ───────────────────────────────────────────────────────────────

export const OUTCOME = {
  TARGET_MET: "target_met",
  IMPROVED: "improved",
  NO_CHANGE: "no_change",
  REGRESSED: "regressed",
  NO_RESPONSE: "no_response",
  NO_TARGET: "no_target",
};

// tone maps onto the arc_v2 `.pill` variants.
const OUTCOME_PRESENTATION = {
  [OUTCOME.TARGET_MET]: { label: "Target met", tone: "success" },
  [OUTCOME.IMPROVED]: { label: "Improved", tone: "info" },
  [OUTCOME.NO_CHANGE]: { label: "No change", tone: "neutral" },
  [OUTCOME.REGRESSED]: { label: "Price increased", tone: "danger" },
  [OUTCOME.NO_RESPONSE]: { label: "No response", tone: "warn" },
  [OUTCOME.NO_TARGET]: { label: "No price target", tone: "neutral" },
};

// Server enums we accept as-is, plus the synonyms seen across the codebase.
const OUTCOME_ALIASES = {
  met: OUTCOME.TARGET_MET,
  target_met: OUTCOME.TARGET_MET,
  achieved: OUTCOME.TARGET_MET,
  target_achieved: OUTCOME.TARGET_MET,
  improved: OUTCOME.IMPROVED,
  partial: OUTCOME.IMPROVED,
  target_missed: OUTCOME.IMPROVED,
  below_target: OUTCOME.IMPROVED,
  no_change: OUTCOME.NO_CHANGE,
  unchanged: OUTCOME.NO_CHANGE,
  flat: OUTCOME.NO_CHANGE,
  regressed: OUTCOME.REGRESSED,
  increased: OUTCOME.REGRESSED,
  worse: OUTCOME.REGRESSED,
  price_increased: OUTCOME.REGRESSED,
  no_response: OUTCOME.NO_RESPONSE,
  pending: OUTCOME.NO_RESPONSE,
  not_responded: OUTCOME.NO_RESPONSE,
  awaiting: OUTCOME.NO_RESPONSE,
  no_target: OUTCOME.NO_TARGET,
  target_not_set: OUTCOME.NO_TARGET,
};

export function outcomePresentation(outcome) {
  return OUTCOME_PRESENTATION[outcome] || OUTCOME_PRESENTATION[OUTCOME.NO_CHANGE];
}

/**
 * Classify a line when the server did not (or sent an enum we do not know).
 * Deliberately independent of whether a target exists: a line with no numeric
 * target still gets `improved` / `regressed` / `no_change` from its own price
 * movement, and the "no target was set" statement is made separately from
 * `hasNumericTarget` so we never imply a target that wasn't set.
 */
export function deriveOutcome(line) {
  if (line.responded === false) return OUTCOME.NO_RESPONSE;
  if (line.savedValue == null) {
    return line.hasNumericTarget ? OUTCOME.NO_CHANGE : OUTCOME.NO_TARGET;
  }
  if (line.savedValue < 0) return OUTCOME.REGRESSED;
  if (
    line.hasNumericTarget &&
    line.targetTotal != null &&
    line.achievedTotal != null &&
    line.achievedTotal <= line.targetTotal + 0.005
  ) {
    return OUTCOME.TARGET_MET;
  }
  if (line.savedValue > 0) return OUTCOME.IMPROVED;
  return OUTCOME.NO_CHANGE;
}

// ── baseline provenance ────────────────────────────────────────────────────

const BASELINE_SOURCE_COPY = {
  original_quote: "The vendor's original RFQ quote — the price before any negotiation.",
  previous_round: "The vendor's quote from the previous negotiation round.",
  previous_quote: "The vendor's quote from the previous negotiation round.",
  last_round: "The vendor's quote from the previous negotiation round.",
  round_start_quote: "The vendor's live quote when this round opened.",
  finalized_quote: "The finalised quote captured when the vendor was selected.",
  arc_rate: "The rate held on the parent rate contract.",
  manual: "Entered manually during back-office data entry.",
  unknown: "The provenance of this baseline was not recorded.",
};

export function baselineSourceCopy(source) {
  if (!source) return BASELINE_SOURCE_COPY.unknown;
  const key = String(source).trim().toLowerCase();
  return (
    BASELINE_SOURCE_COPY[key] ||
    `Baseline taken from: ${String(source).replace(/_/g, " ")}.`
  );
}

export function baselineSourceLabel(source) {
  if (!source) return "Unrecorded";
  return String(source)
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ── line normalisation ─────────────────────────────────────────────────────

function normalizeNonNumericTargets(raw) {
  const out = [];
  const seen = new Set();

  const push = (field, value) => {
    const key = normalizeFieldKey(field);
    if (!key || value === undefined || value === null || value === "") return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ field: key, label: targetFieldLabel(key), value: String(value) });
  };

  // Preferred shape: an explicit array the server holds separately.
  const explicit = asArray(
    firstDefined(raw, [
      "non_numeric_targets",
      "text_targets",
      "other_targets",
      "non_price_targets",
    ])
  );
  explicit.forEach((t) => {
    if (typeof t === "string") return push(t, t);
    push(
      firstDefined(t, ["field", "key", "name", "slug"]),
      firstDefined(t, ["value", "target", "text", "label"])
    );
  });

  // Fallback: flat `target_<field>` columns on the line itself.
  Object.keys(raw || {}).forEach((k) => {
    if (!/^target_/.test(k)) return;
    if (/_mode$/.test(k)) return;
    if (!isNonNumericTargetField(k)) return;
    push(k, raw[k]);
  });

  return out;
}

/**
 * One negotiated line = one product × one vendor. Every money field is
 * reconstructed from whatever the payload actually carried.
 */
export function normalizeLine(raw, index) {
  const r = raw || {};

  const quantity = pickNum(r, ["quantity", "qty", "indicative_qty", "required_qty"]);
  const uom = pickStr(r, ["uom", "unit", "unit_name", "uom_name", "measurement_unit"]);

  const baselineUnit = pickNum(r, [
    "baseline_unit_price",
    "baseline_unit",
    "baseline_rate",
    "baseline_price",
    "previous_price",
  ]);
  let baselineTotal = pickNum(r, [
    "baseline_line_total",
    "baseline_total",
    "baseline_value",
    "baseline_amount",
  ]);
  if (baselineTotal == null && baselineUnit != null && quantity != null) {
    baselineTotal = baselineUnit * quantity;
  }

  const targetMode = pickStr(r, ["target_mode", "target_price_mode", "mode"]);
  const targetRaw = pickNum(r, [
    "target_unit_price",
    "target_unit",
    "target_price",
    "target_base_price",
    "target_rate",
  ]);
  const isPctMode = String(targetMode || "").toLowerCase() === "percentage";

  // In percentage mode the stored target IS the requested % reduction; the
  // absolute unit target has to be projected off the baseline.
  let targetUnit = null;
  let requestedPctFromTarget = null;
  if (targetRaw != null) {
    if (isPctMode) {
      requestedPctFromTarget = targetRaw;
      if (baselineUnit != null) targetUnit = baselineUnit * (1 - targetRaw / 100);
    } else {
      targetUnit = targetRaw;
      if (baselineUnit != null && baselineUnit !== 0) {
        requestedPctFromTarget = ((baselineUnit - targetRaw) / baselineUnit) * 100;
      }
    }
  }

  let targetTotal = pickNum(r, ["target_line_total", "target_total", "target_value"]);
  if (targetTotal == null && targetUnit != null && quantity != null) {
    targetTotal = targetUnit * quantity;
  }

  const responded = pickBool(r, [
    "responded",
    "has_responded",
    "is_responded",
    "vendor_responded",
    "quote_received",
  ]);

  const achievedUnit = pickNum(r, [
    "achieved_unit_price",
    "achieved_unit",
    "revised_unit_price",
    "quoted_price",
    "revised_price",
  ]);
  let achievedTotal = pickNum(r, [
    "achieved_line_total",
    "achieved_total",
    "achieved_value",
    "revised_line_total",
  ]);
  if (achievedTotal == null && achievedUnit != null && quantity != null) {
    achievedTotal = achievedUnit * quantity;
  }

  let savedValue = pickNum(r, ["saved_value", "savings", "saved", "delta_value"]);
  if (savedValue == null && baselineTotal != null && achievedTotal != null) {
    savedValue = baselineTotal - achievedTotal;
  }

  let requestedPct = pickNum(r, ["requested_pct", "requested_reduction_pct", "target_pct"]);
  if (requestedPct == null) requestedPct = requestedPctFromTarget;

  let achievedPct = pickNum(r, ["achieved_pct", "achieved_reduction_pct", "saved_pct"]);
  if (achievedPct == null && savedValue != null && baselineTotal) {
    achievedPct = (savedValue / baselineTotal) * 100;
  }

  const nonNumericTargets = normalizeNonNumericTargets(r);

  // A line is chartable only if a genuine money baseline exists AND the target
  // it carries is a price target. A line whose only target is "payment_terms"
  // has nothing to plot on a % axis.
  const targetFieldKey = normalizeFieldKey(
    pickStr(r, ["target_field", "field", "field_key", "negotiation_field"])
  );
  const targetFieldIsNonNumeric = !!targetFieldKey && isNonNumericTargetField(targetFieldKey);
  const hasNumericTarget = !targetFieldIsNonNumeric && (targetUnit != null || requestedPct != null);

  const line = {
    key:
      pickStr(r, ["line_id", "item_id", "id"]) ??
      `${pickStr(r, ["rfq_product_id", "product_id", "arc_item_id"]) || "p"}-${
        pickStr(r, ["vendor_id", "vendor_user_id"]) || "v"
      }-${index}`,
    itemId: pickNum(r, ["rfq_product_id", "item_id", "arc_item_id", "line_id", "id"]),
    productId: pickNum(r, ["product_id", "product_variant_id"]),
    productName:
      pickStr(r, ["product_name", "item_name", "name", "title"]) || "Unnamed product",
    variantName: pickStr(r, ["variant_name", "variant", "spec", "size"]),
    vendorId: pickNum(r, ["vendor_id", "vendor_user_id", "user_id"]),
    vendorName:
      pickStr(r, ["vendor_name", "vendor_company_name", "organization_name", "company_name"]) ||
      "Vendor",
    quantity,
    uom,
    baselineUnit,
    baselineTotal,
    baselineSource: pickStr(r, ["baseline_source", "baseline_from", "baseline_origin"]),
    baselineStale: pickBool(r, ["baseline_stale", "is_baseline_stale"]) === true,
    targetUnit,
    targetTotal,
    targetMode: isPctMode ? "percentage" : targetRaw != null ? "value" : null,
    targetFieldKey,
    achievedUnit,
    achievedTotal,
    responded: responded === null ? achievedTotal != null : responded,
    respondedAt: pickStr(r, ["responded_at", "quoted_at", "submitted_at", "updated_at"]),
    requestedPct,
    achievedPct,
    savedValue,
    vendorApprovalStatus: pickStr(r, [
      "vendor_approval_status",
      "approval_status",
      "quote_approval_status",
    ]),
    nonNumericTargets,
    hasNumericTarget,
    // Free-text buyer note attached to a target field ("Bring GST to 12%").
    // Not a number and never charted — rendered as a chip beside the target.
    taxDemand: pickStr(r, ["tax_demand", "taxDemand"]),
  };

  const serverOutcome = pickStr(r, ["outcome", "line_outcome", "result"]);
  const mapped = serverOutcome ? OUTCOME_ALIASES[serverOutcome.toLowerCase()] : null;
  line.outcome = mapped || deriveOutcome(line);

  // Charts need a % axis, so a line with no money baseline cannot be plotted.
  line.chartEligible = !targetFieldIsNonNumeric && baselineTotal != null && baselineTotal !== 0;

  return line;
}

// ── totals ─────────────────────────────────────────────────────────────────

const sum = (arr) => arr.reduce((a, b) => a + b, 0);

/**
 * Aggregate the lines ourselves — used whenever the server omits a total.
 *
 * INVARIANT: `baselineValue − achievedValue === savedValue`. That only holds
 * if both sides cover the SAME lines, so a line the vendor never answered
 * contributes its own baseline to `achievedValue` (i.e. no movement) rather
 * than being dropped. Summing achieved over responded lines only, against a
 * baseline summed over all lines, silently reports every unanswered line as if
 * it had been saved in full — which read as "88% of the requested reduction"
 * on a round that had actually delivered 29%.
 *
 * The `targeted*` figures repeat the aggregation over just the lines that
 * carry a numeric price target. Attainment and target-met have to be measured
 * on that subset: scoring a whole round against a target that covered two of
 * its three lines compares two different populations.
 */
export function deriveTotals(lines) {
  const withBaseline = lines.filter((l) => l.baselineTotal != null);
  const responded = lines.filter((l) => l.responded);
  const targeted = lines.filter((l) => l.hasNumericTarget && l.targetTotal != null);

  // Same-population achieved: unanswered lines sit at their baseline.
  const achievedOver = (rows) =>
    sum(rows.map((l) => (l.achievedTotal != null ? l.achievedTotal : l.baselineTotal || 0)));

  const baseline = withBaseline.length ? sum(withBaseline.map((l) => l.baselineTotal)) : null;
  const achieved = responded.length ? achievedOver(withBaseline) : null;

  const targetedWithBaseline = targeted.filter((l) => l.baselineTotal != null);
  const targetedResponded = targeted.filter((l) => l.responded);

  const savedLines = lines.filter((l) => l.savedValue != null);
  const saved = savedLines.length ? sum(savedLines.map((l) => l.savedValue)) : null;
  const targetedSavedLines = targeted.filter((l) => l.savedValue != null);

  return {
    baselineValue: baseline,
    achievedValue: achieved,
    targetValue: targeted.length ? sum(targeted.map((l) => l.targetTotal)) : null,
    savedValue: saved,
    targetedBaselineValue: targetedWithBaseline.length
      ? sum(targetedWithBaseline.map((l) => l.baselineTotal))
      : null,
    targetedAchievedValue: targetedResponded.length ? achievedOver(targetedWithBaseline) : null,
    targetedSavedValue: targetedSavedLines.length
      ? sum(targetedSavedLines.map((l) => l.savedValue))
      : null,
    lineCount: lines.length,
    respondedCount: responded.length,
    targetedLineCount: targeted.length,
  };
}

export function normalizeTotals(rawTotals, lines) {
  const t = rawTotals || {};
  const derived = deriveTotals(lines);

  const baselineValue =
    pickNum(t, ["baseline_value", "baseline_total", "baseline"]) ?? derived.baselineValue;
  const achievedValue =
    pickNum(t, ["achieved_value", "achieved_total", "achieved"]) ?? derived.achievedValue;
  const targetValue = pickNum(t, ["target_value", "target_total", "target"]) ?? derived.targetValue;

  let savedValue = pickNum(t, ["saved_value", "savings", "saved", "signed_saved_value"]);
  if (savedValue == null) savedValue = derived.savedValue;

  let savedPct = pickNum(t, ["saved_pct", "savings_pct", "achieved_pct"]);
  if (savedPct == null && savedValue != null && baselineValue) {
    savedPct = (savedValue / baselineValue) * 100;
  }

  // Everything below is measured over the TARGETED lines only. Untargeted
  // lines would otherwise dilute the requested % toward zero and inflate
  // attainment — see the deriveTotals header.
  const targetedBaselineValue =
    pickNum(t, ["targeted_baseline_value"]) ?? derived.targetedBaselineValue;
  const targetedAchievedValue =
    pickNum(t, ["targeted_achieved_value"]) ?? derived.targetedAchievedValue;
  const targetedSavedValue =
    pickNum(t, ["targeted_saved_value"]) ?? derived.targetedSavedValue;

  // The rupee reduction that was actually asked for.
  const requestedSaving =
    targetedBaselineValue != null && targetValue != null
      ? targetedBaselineValue - targetValue
      : null;

  let requestedPct = pickNum(t, ["requested_pct", "requested_reduction_pct"]);
  if (requestedPct == null && requestedSaving != null && targetedBaselineValue) {
    requestedPct = (requestedSaving / targetedBaselineValue) * 100;
  }

  // Attainment = how much of that requested reduction was actually delivered.
  let attainmentPct = pickNum(t, ["attainment_pct", "attainment"]);
  if (attainmentPct == null && requestedSaving != null && requestedSaving > 0 && targetedSavedValue != null) {
    attainmentPct = (targetedSavedValue / requestedSaving) * 100;
  }

  let targetMet = pickBool(t, ["target_met", "is_target_met"]);
  if (targetMet === null && targetValue != null && targetedAchievedValue != null) {
    targetMet = targetedAchievedValue <= targetValue + 0.005;
  }
  // Never imply a target that wasn't set.
  if (targetValue == null) targetMet = null;

  const lineCount = pickNum(t, ["line_count", "lines", "total_lines"]) ?? derived.lineCount;
  const respondedCount =
    pickNum(t, ["responded_count", "responses", "responded_lines", "vendors_responded"]) ??
    derived.respondedCount;
  const targetedLineCount =
    pickNum(t, ["targeted_line_count", "lines_with_target"]) ?? derived.targetedLineCount;

  return {
    baselineValue,
    achievedValue,
    targetValue,
    savedValue,
    savedPct,
    requestedPct,
    requestedSaving,
    attainmentPct,
    targetMet,
    targetedBaselineValue,
    targetedAchievedValue,
    targetedSavedValue,
    lineCount,
    respondedCount,
    targetedLineCount,
    cumulativeSavedValue: pickNum(t, [
      "cumulative_saved_value",
      "cumulative_savings",
      "cumulative_saved",
      "saved_value_cumulative",
    ]),
    cumulativeBaselineValue: pickNum(t, ["cumulative_baseline_value", "cumulative_baseline"]),
    cumulativeSavedPct: pickNum(t, ["cumulative_saved_pct", "cumulative_pct"]),
  };
}

// ── round identity / status ────────────────────────────────────────────────

// Keys are lower-cased before lookup, so this covers both the stored column
// values (DRAFT / PENDING_APPROVAL / ACTIVE / ENDED / COMPLETED / CANCELLED /
// EXPIRED / CLOSED) and the derived `neg_status` the listing uses
// (pending_approval / active / awaiting_decision / completed / cancelled).
export const ROUND_STATUS_PRESENTATION = {
  draft: { label: "Draft", tone: "draft", chip: "draft", muted: false },
  pending_approval: { label: "Pending approval", tone: "committee", chip: "committee", muted: false },
  active: { label: "Active", tone: "active", chip: "active", muted: false },
  awaiting_decision: { label: "Awaiting decision", tone: "awaiting", chip: "eval", muted: false },
  completed: { label: "Completed", tone: "success", chip: "active", muted: false },
  closed: { label: "Closed", tone: "closed", chip: "expired", muted: true },
  ended: { label: "Ended", tone: "closed", chip: "expired", muted: true },
  expired: { label: "Expired", tone: "expired", chip: "expired", muted: true },
  cancelled: { label: "Cancelled", tone: "danger", chip: "rejected", muted: true },
  rejected: { label: "Rejected", tone: "danger", chip: "rejected", muted: true },
};

export function roundStatusPresentation(status) {
  const key = String(status || "").trim().toLowerCase();
  return (
    ROUND_STATUS_PRESENTATION[key] || {
      label: key ? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "Unknown",
      tone: "neutral",
      chip: "draft",
      muted: false,
    }
  );
}

/** Cancelled / expired rounds still render in full — historical value is the point. */
export function isSettledStatus(status) {
  const key = String(status || "").trim().toLowerCase();
  return ["cancelled", "rejected", "expired", "closed", "ended", "completed"].includes(key);
}

export function isTerminatedStatus(status) {
  const key = String(status || "").trim().toLowerCase();
  return ["cancelled", "rejected", "expired"].includes(key);
}

function normalizeActions(raw) {
  return asArray(raw)
    .map((a) => {
      if (typeof a === "string") return { key: a, label: humanize(a), href: null, disabled: false };
      const key = pickStr(a, ["key", "action", "id", "code"]);
      if (!key) return null;
      return {
        key,
        label: pickStr(a, ["label", "title", "text"]) || humanize(key),
        href: pickStr(a, ["href", "url", "link"]),
        disabled: pickBool(a, ["disabled", "is_disabled"]) === true,
        reason: pickStr(a, ["reason", "disabled_reason", "hint"]),
        tone: pickStr(a, ["tone", "variant", "style"]),
      };
    })
    .filter(Boolean);
}

function humanize(k) {
  return String(k).replace(/[_-]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function normalizeApproval(raw) {
  if (!raw || typeof raw !== "object") return null;
  const status = pickStr(raw, ["status", "state", "approval_status"]);
  const steps = asArray(firstDefined(raw, ["steps", "levels", "approvers", "chain"])).map((s, i) => ({
    key: pickStr(s, ["id", "step_id", "level_id"]) || `step-${i}`,
    label:
      pickStr(s, ["label", "name", "approver_name", "role_name", "level_name"]) ||
      `Level ${i + 1}`,
    status: pickStr(s, ["status", "state"]),
    actedAt: pickStr(s, ["acted_at", "approved_at", "updated_at"]),
    remarks: pickStr(s, ["remarks", "comment", "note"]),
  }));
  if (!status && steps.length === 0) return null;
  return {
    status,
    isPending: /pending|in_progress|awaiting/i.test(status || ""),
    isRejected: /reject/i.test(status || ""),
    isApproved: /approved|complete/i.test(status || ""),
    pendingWith: pickStr(raw, ["pending_with", "current_approver", "awaiting_from", "pending_with_name"]),
    level: pickNum(raw, ["current_level", "level", "sequence"]),
    totalLevels: pickNum(raw, ["total_levels", "levels_count", "level_count"]),
    steps,
  };
}

function normalizeVendors(raw, lines) {
  const explicit = asArray(raw).map((v, i) => ({
    key: pickStr(v, ["vendor_id", "id", "user_id"]) || `v-${i}`,
    vendorId: pickNum(v, ["vendor_id", "id", "user_id"]),
    name:
      pickStr(v, ["vendor_name", "name", "organization_name", "company_name"]) || "Vendor",
    email: pickStr(v, ["email", "vendor_email", "contact_email"]),
    phone: pickStr(v, ["mobile", "phone", "contact_number", "vendor_mobile"]),
    responded: pickBool(v, ["responded", "has_responded", "quote_received"]) === true,
    respondedAt: pickStr(v, ["responded_at", "quoted_at", "submitted_at"]),
    lineCount: pickNum(v, ["line_count", "lines"]),
  }));
  if (explicit.length > 0) return explicit;

  // Fold the lines into a vendor roster when the server does not send one.
  const byVendor = new Map();
  lines.forEach((l) => {
    const key = String(l.vendorId ?? l.vendorName);
    const cur = byVendor.get(key) || {
      key,
      vendorId: l.vendorId,
      name: l.vendorName,
      email: null,
      phone: null,
      responded: false,
      respondedAt: null,
      lineCount: 0,
    };
    cur.lineCount += 1;
    if (l.responded) {
      cur.responded = true;
      if (!cur.respondedAt) cur.respondedAt = l.respondedAt;
    }
    byVendor.set(key, cur);
  });
  return Array.from(byVendor.values());
}

function normalizeHistory(raw) {
  return asArray(raw).map((r, i) => ({
    key: pickStr(r, ["round_id", "id"]) || `r-${i}`,
    roundId: pickNum(r, ["round_id", "id"]),
    roundNumber: pickNum(r, ["round_number", "round_no", "number"]),
    status: pickStr(r, ["status", "neg_status", "round_status"]),
    savedValue: pickNum(r, ["saved_value", "savings", "saved"]),
    baselineValue: pickNum(r, ["baseline_value", "baseline_total"]),
    achievedValue: pickNum(r, ["achieved_value", "achieved_total"]),
    endDate: pickStr(r, ["end_date", "closed_at", "ended_at"]),
    respondedCount: pickNum(r, ["responded_count", "responses"]),
    lineCount: pickNum(r, ["line_count", "lines"]),
    isCurrent: pickBool(r, ["is_current", "current"]) === true,
  }));
}

// ── top level ──────────────────────────────────────────────────────────────

/**
 * Normalize the whole detail payload. Accepts either the axios body
 * (`{ status, data }`) or the bare `data` object, so it does not care whether
 * the interceptor unwrapped it.
 */
export function normalizeRoundDetail(payload) {
  const body = payload && payload.data && !Array.isArray(payload.data) ? payload.data : payload;
  const d = body || {};
  const roundRaw = d.round || d.negotiation_round || d;

  const lines = asArray(
    firstDefined(d, ["items", "lines", "products", "round_items"])
  ).map(normalizeLine);

  const totals = normalizeTotals(d.totals || d.summary || d.aggregate, lines);

  const meta = d.meta || d.metadata || {};

  const sourceRaw = pickStr(roundRaw, ["source", "source_type", "parent_type"]);
  const source = String(sourceRaw || "RFQ").toUpperCase() === "ARC" ? "ARC" : "RFQ";

  const status = pickStr(roundRaw, ["status", "neg_status", "round_status"]);

  // Both denominators. `roundsInScope` is how many rounds this cycle has;
  // `roundsOnParent` is every round ever created on the parent RFQ/ARC. They
  // legitimately differ (the "Round 5 of 32" case) and are rendered honestly
  // rather than reconciled into one misleading number.
  const roundsInScope = pickNum(roundRaw, [
    "total_rounds_in_scope",
    "total_rounds_for_product",
    "rounds_in_cycle",
    "total_rounds",
  ]);
  const roundsOnParent = pickNum(roundRaw, [
    "total_rounds_on_parent",
    "total_rounds_on_rfq",
    "parent_total_rounds",
    "rfq_total_rounds",
    "rounds_on_parent",
  ]);

  const wholeParentMode =
    pickBool(roundRaw, ["is_rfq_level", "is_whole_rfq", "whole_rfq", "rfq_level"]) === true ||
    /whole|rfq_level|global/i.test(pickStr(roundRaw, ["mode", "scope_mode", "round_mode"]) || "");

  const round = {
    roundId: pickNum(roundRaw, ["round_id", "id"]),
    roundNumber: pickNum(roundRaw, ["round_number", "round_no", "number"]),
    roundsInScope,
    roundsOnParent,
    status,
    statusPresentation: roundStatusPresentation(status),
    isSettled: isSettledStatus(status),
    isTerminated: isTerminatedStatus(status),
    source,
    isArc: source === "ARC",
    rfqId: pickNum(roundRaw, ["rfq_id", "parent_id"]),
    rfqNo: pickStr(roundRaw, ["rfq_no", "rfq_number"]),
    arcId: pickNum(roundRaw, ["arc_id", "contract_id"]),
    arcNo: pickStr(roundRaw, ["arc_number", "arc_no"]),
    title:
      pickStr(roundRaw, ["title", "rfq_title", "arc_title", "parent_title"]) ||
      (source === "ARC" ? "Rate contract" : "RFQ"),
    isTender: pickBool(roundRaw, ["is_tender"]) === true,
    hotelName: pickStr(roundRaw, ["hotel_name", "bu_name", "business_unit"]),
    departmentTitle: pickStr(roundRaw, ["department_title", "department_name", "department"]),
    categoryTitle: pickStr(roundRaw, ["category_title", "category_name", "category"]),
    createdByName: pickStr(roundRaw, ["created_by_name", "creator_name", "raised_by_name"]),
    createdAt: pickStr(roundRaw, ["created_at", "started_at", "start_date"]),
    endDate: pickStr(roundRaw, ["end_date", "deadline", "ends_at", "expires_at"]),
    closedAt: pickStr(roundRaw, ["closed_at", "ended_at", "completed_at"]),
    wholeParentMode,
    approval: normalizeApproval(roundRaw.approval || d.approval),
  };

  const scopeEcho = pickStr(meta, ["scope", "active_scope"]) || pickStr(d, ["scope"]);
  const siblingCount =
    pickNum(meta, ["sibling_round_count", "siblings", "cycle_round_count"]) ??
    asArray(firstDefined(meta, ["sibling_round_ids", "siblings"])).length ??
    null;
  const hasSiblings =
    pickBool(meta, ["has_siblings", "has_sibling_rounds"]) ??
    (siblingCount != null ? siblingCount > 1 : null);

  return {
    round,
    lines,
    totals,
    vendors: normalizeVendors(
      firstDefined(d, ["vendors", "participants", "vendor_participation"]),
      lines
    ),
    history: normalizeHistory(firstDefined(d, ["history", "rounds", "round_history", "previous_rounds"])),
    actions: normalizeActions(
      firstDefined(d, ["available_actions", "actions", "allowed_actions"])
    ),
    meta: {
      scope: scopeEcho === "cycle" || scopeEcho === "round" ? scopeEcho : null,
      hasSiblings: hasSiblings === true,
      siblingCount,
      // `locked` is what helper/quoteVisibility.js buildQuoteVisibilityMeta()
      // actually emits; the other spellings are the wrappers around it.
      quoteVisibilityLocked:
        pickBool(meta, [
          "quote_visibility_locked",
          "quotes_locked",
          "visibility_locked",
          "locked",
        ]) === true ||
        pickBool(meta.quoteVisibility || meta.quote_visibility, ["locked"]) === true,
      quoteVisibilityReason: pickStr(meta, [
        "quote_visibility_reason",
        "locked_reason",
        "message",
      ]),
      baselineStale:
        pickBool(meta, ["baseline_stale", "stale_baseline"]) === true ||
        lines.some((l) => l.baselineStale),
    },
  };
}

/** Which scope the toggle should sit on before the user touches it. */
export function defaultScope(model) {
  if (!model) return null;
  if (model.meta.scope) return model.meta.scope;
  return model.meta.hasSiblings ? "cycle" : "round";
}

// ── formatting ─────────────────────────────────────────────────────────────

/** Full-precision ₹ with Indian grouping — the table wants exact rupees. */
export function formatMoney(value, { locked = false } = {}) {
  if (locked) return "—";
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  const abs = Math.abs(n);
  const body = `₹${abs.toLocaleString("en-IN", {
    minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
  return n < 0 ? `−${body}` : body;
}

/** Signed, unclamped — "+₹1,200" saved, "−₹236" when the price went UP. */
export function formatSignedMoney(value, { locked = false } = {}) {
  if (locked) return "—";
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  if (n === 0) return "₹0";
  return (n > 0 ? "+" : "−") + formatMoney(Math.abs(n));
}

export function formatPct(value, { digits = 1 } = {}) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

export function formatSignedPct(value, { digits = 1 } = {}) {
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const n = Number(value);
  if (n === 0) return "0%";
  return `${n > 0 ? "+" : "−"}${Math.abs(n).toFixed(digits)}%`;
}

/**
 * Plain-language sentence for a signed line movement. Regressions get explicit
 * copy — "Price increased ₹236" — rather than a bare negative number.
 */
export function movementSentence(savedValue, { locked = false } = {}) {
  if (locked) return "Prices are hidden while quotes are sealed.";
  if (savedValue == null) return "No revised price received.";
  const n = Number(savedValue);
  if (!Number.isFinite(n) || n === 0) return "No change in price.";
  if (n < 0) return `Price increased ${formatMoney(Math.abs(n))}`;
  return `Saved ${formatMoney(n)}`;
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Naive DB timestamps are stored UTC; render them in the viewer's zone. */
function toDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw;
  const s = String(raw);
  const iso = !s.includes("Z") && !/[+-]\d{2}:?\d{2}$/.test(s) ? s.replace(" ", "T") + "Z" : s;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(raw) {
  const d = toDate(raw);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2, "0")} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(raw) {
  const d = toDate(raw);
  if (!d) return "—";
  const h = d.getHours();
  const h12 = ((h + 11) % 12) + 1;
  return `${formatDate(raw)}, ${h12}:${String(d.getMinutes()).padStart(2, "0")} ${
    h >= 12 ? "PM" : "AM"
  }`;
}

/** "in 3 days" / "2 days ago" / null when the timestamp is unusable. */
export function relativeTo(raw, now = Date.now()) {
  const d = toDate(raw);
  if (!d) return null;
  const diff = d.getTime() - now;
  const abs = Math.abs(diff);
  const day = 86400000;
  const unit =
    abs < 3600000
      ? [Math.round(abs / 60000), "minute"]
      : abs < day
      ? [Math.round(abs / 3600000), "hour"]
      : [Math.round(abs / day), "day"];
  const [n, u] = unit;
  const plural = n === 1 ? u : `${u}s`;
  return diff >= 0 ? `in ${n} ${plural}` : `${n} ${plural} ago`;
}

/** Denominator copy that never lies: "Round 5 of 7 · 32 rounds on this RFQ". */
export function roundDenominatorText(round) {
  if (!round) return "";
  const n = round.roundNumber;
  const inScope = round.roundsInScope;
  const onParent = round.roundsOnParent;
  const parentWord = round.isArc ? "rate contract" : "RFQ";
  const head = n == null ? "Round —" : inScope != null ? `Round ${n} of ${inScope}` : `Round ${n}`;
  if (onParent != null && (inScope == null || onParent !== inScope)) {
    return `${head} · ${onParent} round${onParent === 1 ? "" : "s"} on this ${parentWord}`;
  }
  return head;
}
