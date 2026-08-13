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

//
// CONTRACT NOTE (2026-08): this module was written against a payload the
// backend never emitted. The backend contract is the source of truth and the
// readers below now carry the REAL field names first, with the speculative
// aliases kept behind them so nothing that already worked regresses. The
// specific mismatches that were fixed:
//
//   actions            object {can_approve: bool, …}, not an array of action
//                      objects — asArray() returned [] so no button ever
//                      rendered.
//   approval.pending_with
//                      array of {user_id,name,email,…}, not a string —
//                      pickStr() rendered the literal "[object Object]".
//   approval steps     live on approval.instances[i].steps, not approval.steps.
//   parent identity    title / rfq_id / rfq_no / hotel_name / department_name
//                      are on `parent`, not on `round`.
//   created by         round.created_by is an OBJECT {user_id,name,…}.
//   quote lock         top-level `quote_visibility.locked` + `prices_hidden`;
//                      there is no `meta` key at all.
//   totals             lines_total / lines_responded / baseline_total /
//                      achieved_total / target_total / lines_with_numeric_target.
//                      Note `vendors_responded` is a VENDOR count and must not
//                      be read as the responded-LINE count.
//   cumulative         its own top-level object, not folded into totals.
//   history            top-level `history` array.

import {
  formatNegotiationDate,
  formatNegotiationDateTime,
  negotiationRelative,
} from "@/utils/negotiationTime";
import {
  NEG_STATE,
  negStatePresentation,
  toNegState,
  deriveNegotiationState,
  isTerminalState,
  neverReachedVendors,
} from "./negotiationStates";

export {
  NEG_STATE,
  negStatePresentation,
  toNegState,
  deriveNegotiationState,
  isTerminalState,
  neverReachedVendors,
};

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

export function normalizeTotals(rawTotals, lines, rawCumulative) {
  const t = rawTotals || {};
  const cum = rawCumulative || {};
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
  // `target_baseline_total` is the server's name for the same figure.
  const targetedBaselineValue =
    pickNum(t, ["targeted_baseline_value", "target_baseline_total"]) ?? derived.targetedBaselineValue;
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

  const lineCount =
    pickNum(t, ["lines_total", "line_count", "lines", "total_lines"]) ?? derived.lineCount;
  // `lines_responded` FIRST and `vendors_responded` deliberately absent:
  // vendors_responded is a VENDOR count and reading it here reported "2 of 6
  // lines responded" on a round where six lines came back from two vendors.
  const respondedCount =
    pickNum(t, ["lines_responded", "responded_count", "responses", "responded_lines"]) ??
    derived.respondedCount;
  const targetedLineCount =
    pickNum(t, ["lines_with_numeric_target", "targeted_line_count", "lines_with_target"]) ??
    derived.targetedLineCount;

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
    vendorsTotal: pickNum(t, ["vendors_total"]),
    vendorsResponded: pickNum(t, ["vendors_responded"]),
    // The cumulative roll-up is its own top-level object on the payload
    // (`cumulative`), never folded into totals — which is why the tile used to
    // read "Not reported by the server" on every multi-round negotiation.
    cumulativeSavedValue:
      pickNum(cum, ["saved_value"]) ??
      pickNum(t, [
        "cumulative_saved_value",
        "cumulative_savings",
        "cumulative_saved",
        "saved_value_cumulative",
      ]),
    cumulativeBaselineValue:
      pickNum(cum, ["baseline_total"]) ??
      pickNum(t, ["cumulative_baseline_value", "cumulative_baseline"]),
    cumulativeAchievedValue: pickNum(cum, ["achieved_total"]),
    cumulativeSavedPct:
      pickNum(cum, ["saved_pct"]) ?? pickNum(t, ["cumulative_saved_pct", "cumulative_pct"]),
    cumulativeRoundsCounted: pickNum(cum, ["rounds_counted"]),
    cumulativeFromRound: pickNum(cum, ["from_round_number"]),
    cumulativeToRound: pickNum(cum, ["to_round_number"]),
    cumulativeExcludesCancelled: pickBool(cum, ["excludes_cancelled"]) === true,
  };
}

// ── round identity / status ────────────────────────────────────────────────

// Presentation for a round's state. Delegates to the shared seven-state table
// (./negotiationStates) so the listing and this page can never drift again.
// Legacy raw column values and the old five-bucket `neg_status` are folded in
// there too, so an older payload still renders a real label.
export function roundStatusPresentation(status) {
  const p = negStatePresentation(status);
  return {
    key: p.key,
    label: p.label,
    description: p.description,
    tone: p.tone,
    // `.arc-hero .status-chip` and `.cc-badge` do not carry the same variant
    // set, so they get their own names rather than one that silently falls
    // through to the default grey on one of the two.
    chip: p.heroChip,
    badge: p.badge,
    pulse: p.pulse === true,
    muted: p.key === NEG_STATE.CANCELLED || p.key === NEG_STATE.LAPSED,
  };
}

/** Cancelled / lapsed rounds still render in full — historical value is the point. */
export function isSettledStatus(status) {
  return isTerminalState(status);
}

/** Terminated = ended badly. Drives the desaturated hero treatment. */
export function isTerminatedStatus(status) {
  const k = toNegState(status);
  return k === NEG_STATE.CANCELLED || k === NEG_STATE.LAPSED;
}

// Server-derived action gates, in the order the buyer should meet them. The
// backend sends `actions` as a flat OBJECT of booleans
// (negotiationRoundDetailController.deriveActions); this table turns the ones
// that have a screen into buttons. `route` is the intent, resolved to a real
// href in RoundActions.resolveActionHref.
const ACTION_CATALOGUE = [
  { key: "approve", flag: "can_approve", label: "Review and approve", route: "approve", tone: "primary" },
  { key: "reject", flag: "can_reject", label: "Reject this round", route: "approve" },
  // Not a navigation — an operation performed in place, so it carries no
  // `route`. The server sets can_withdraw only for the round's own author
  // while it is still awaiting approval; `reject` next to it needs
  // negotiation.approve, which the author often does not hold.
  { key: "withdraw", flag: "can_withdraw", label: "Withdraw this round", operation: true },
  { key: "close_round", flag: "can_close", label: "Close the round", route: "round" },
  {
    key: "submit_quotes_for_approval",
    flag: "can_submit_quotes_for_approval",
    label: "Take quotes forward",
    route: "compare",
    tone: "primary",
  },
  { key: "create_next_round", flag: "can_create_next_round", label: "Start the next round", route: "next_round" },
  { key: "view_quotes", flag: "can_view_quotes", label: "View quotes", route: "compare" },
];

/**
 * Actions arrive as an OBJECT of booleans. The previous implementation ran
 * asArray() over it, which returns [] for a plain object — so the page rendered
 * zero action buttons on every round ever loaded.
 *
 * An ARRAY payload (a list of {key,label,href} descriptors) is still accepted,
 * because that is what the round-detail tests and any future richer contract
 * use. Anything unrecognised is dropped rather than guessed at.
 */
function normalizeActions(raw) {
  if (Array.isArray(raw) || typeof raw === "string") {
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
  if (!raw || typeof raw !== "object") return [];

  return ACTION_CATALOGUE.filter((a) => raw[a.flag] === true).map((a) => ({
    key: a.key,
    label: a.label,
    href: null,
    route: a.route,
    disabled: false,
    reason: null,
    tone: a.tone || null,
    // Operations act on the round in place; without this the button falls
    // through to href resolution, finds none, and renders disabled with
    // "No screen is wired for this action yet."
    operation: a.operation === true,
  }));
}

function humanize(k) {
  return String(k).replace(/[_-]/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** Approver-like rows with a REMOVED row dropped. A REMOVED status is a
 *  mid-flight reconciler's soft-tombstone (role/scope revoked while the
 *  approval was in flight). The endpoint backing this page
 *  (negotiationModel.getRoundApprovalState) already strips rows where
 *  `removed_at != null` server-side (backend commit 2026-07-31), so this is
 *  belt-and-braces, not the primary guard — kept in case a future response
 *  shape (or a different caller of `formatApproverList`) ever passes a
 *  REMOVED row through untouched. Passes through plain strings and objects
 *  with no `status` field untouched. */
function excludeRemoved(list) {
  return asArray(list).filter((a) => {
    if (typeof a === "string") return true;
    return pickStr(a, ["status"]) !== "REMOVED";
  });
}

/** "Asha Menon", "Asha Menon and Ravi K", "Asha Menon +2" — never [object Object]. */
export function formatApproverList(value, { max = 2 } = {}) {
  if (value == null) return null;
  if (typeof value === "string") return value.trim() || null;

  const names = excludeRemoved(value)
    .map((a) => {
      if (typeof a === "string") return a.trim();
      return (
        pickStr(a, ["name", "approver_name", "user_name", "full_name"]) ||
        pickStr(a, ["email", "approver_email"]) ||
        (pickNum(a, ["user_id", "approver_user_id", "id"]) != null
          ? `User #${pickNum(a, ["user_id", "approver_user_id", "id"])}`
          : null)
      );
    })
    .filter(Boolean);

  if (names.length === 0) return null;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, max).join(", ")} +${names.length - max}`;
}

/**
 * The approval card.
 *
 * Real shape: { instances: [{status, current_step, total_steps, steps: [...],
 * pending_with: [{user_id,name,…}], is_pending_for_me}], status, pending_with,
 * is_pending_for_me, vendor_approvals: {…} }.
 *
 * Steps live on the newest INSTANCE, not on the approval object, and
 * `pending_with` is an array of people.
 */
function normalizeApproval(raw) {
  if (!raw || typeof raw !== "object") return null;

  const instances = asArray(raw.instances);
  const current = instances.length > 0 ? instances[0] : null;

  const status =
    pickStr(raw, ["status", "state", "approval_status"]) ||
    (current ? pickStr(current, ["status"]) : null);

  // Prefer the instance's own chain; fall back to a flat `steps` for the
  // speculative shape the tests still exercise.
  const stepSource = current
    ? asArray(current.steps)
    : asArray(firstDefined(raw, ["steps", "levels", "approvers", "chain"]));

  const steps = stepSource.map((s, i) => {
    const approverNames = formatApproverList(s.approvers);
    // Active (non-REMOVED) approvers only — a removed approver's stale
    // acted_at/comment from before their removal must not be picked up as
    // the step's own record.
    const activeStepApprovers = excludeRemoved(s.approvers);
    return {
      key: pickStr(s, ["step_id", "id", "level_id"]) || `step-${i}`,
      label:
        approverNames ||
        pickStr(s, ["label", "name", "approver_name", "role_name", "level_name"]) ||
        `Level ${pickNum(s, ["step_order"]) ?? i + 1}`,
      stepOrder: pickNum(s, ["step_order", "order", "sequence"]) ?? i + 1,
      status: pickStr(s, ["status", "state"]),
      actedAt:
        pickStr(s, ["completed_at", "acted_at", "approved_at", "updated_at"]) ||
        (activeStepApprovers
          .map((a) => pickStr(a, ["acted_at"]))
          .filter(Boolean)[0] ??
          null),
      remarks:
        pickStr(s, ["remarks", "comment", "note"]) ||
        (activeStepApprovers
          .map((a) => pickStr(a, ["comment"]))
          .filter(Boolean)[0] ??
          null),
      approvers: asArray(s.approvers).map((a) => ({
        userId: pickNum(a, ["user_id"]),
        name: pickStr(a, ["name"]) || pickStr(a, ["email"]) || "Approver",
        email: pickStr(a, ["email"]),
        mobile: pickStr(a, ["mobile"]),
        status: pickStr(a, ["status"]),
      })),
    };
  });

  const pendingWith =
    formatApproverList(firstDefined(raw, ["pending_with"])) ??
    (current ? formatApproverList(current.pending_with) : null) ??
    pickStr(raw, ["current_approver", "awaiting_from", "pending_with_name"]);

  const vendorApprovals = raw.vendor_approvals || null;

  if (!status && steps.length === 0) return null;

  return {
    status,
    isPending: /pending|in_progress|awaiting/i.test(status || ""),
    isRejected: /reject/i.test(status || ""),
    isApproved: /approved|complete/i.test(status || ""),
    isPendingForMe:
      pickBool(raw, ["is_pending_for_me"]) === true ||
      instances.some((i) => pickBool(i, ["is_pending_for_me"]) === true),
    pendingWith,
    level:
      pickNum(raw, ["current_level", "level", "sequence"]) ??
      (current ? pickNum(current, ["current_step"]) : null),
    totalLevels:
      pickNum(raw, ["total_levels", "levels_count", "level_count"]) ??
      (current ? pickNum(current, ["total_steps"]) : null) ??
      (steps.length || null),
    initiatedByName: current ? pickStr(current.initiated_by || {}, ["name"]) : null,
    vendorApprovals: vendorApprovals
      ? {
          total: pickNum(vendorApprovals, ["total"]) ?? 0,
          approved: pickNum(vendorApprovals, ["approved"]) ?? 0,
          rejected: pickNum(vendorApprovals, ["rejected"]) ?? 0,
          pending: pickNum(vendorApprovals, ["pending"]) ?? 0,
        }
      : null,
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
    responded: pickBool(v, ["has_responded", "responded", "quote_received"]) === true,
    respondedAt: pickStr(v, ["last_responded_at", "first_responded_at", "responded_at", "quoted_at", "submitted_at"]),
    // `lines` on the server's vendor roll-up is a COUNT, not the line array.
    lineCount: pickNum(v, ["lines", "line_count"]),
    linesResponded: pickNum(v, ["lines_responded"]),
    savedValue: pickNum(v, ["saved_value"]),
    approvalStatus: pickStr(v, ["approval_status"]),
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
    // `state` is the derived seven-state key; `status` is the raw column and
    // only a fallback. Reading the raw one is what made the history rows
    // disagree with the row you clicked to get here.
    status: pickStr(r, ["state", "neg_status", "status", "round_status"]),
    stateLabel: pickStr(r, ["state_label"]),
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
  // Parent identity (title, RFQ number, hotel, department) lives on its OWN
  // object — reading it off `round` is why the hero showed the literal string
  // "RFQ", a round id where the RFQ number belongs, and blank hotel/department.
  const parentRaw = d.parent || d.rfq || d.arc || {};

  const lines = asArray(
    firstDefined(d, ["lines", "items", "products", "round_items"])
  ).map(normalizeLine);

  const totals = normalizeTotals(
    d.totals || d.summary || d.aggregate,
    lines,
    d.cumulative || d.cumulative_totals
  );

  const meta = d.meta || d.metadata || {};
  const quoteVisibility = d.quote_visibility || d.quoteVisibility || meta.quote_visibility || meta.quoteVisibility || {};
  const cycle = d.cycle || {};

  const sourceRaw =
    pickStr(roundRaw, ["source_type", "source", "parent_type"]) ||
    pickStr(parentRaw, ["source_type"]);
  const source = String(sourceRaw || "RFQ").toUpperCase() === "ARC" ? "ARC" : "RFQ";

  // ── FIX 2: ONE status, derived the same way the listing derives it ────────
  // Order: the server's derived `state` → the derived `neg_status` a listing
  // row carries → a client-side derivation off the raw column PLUS the counts
  // the payload also sends → the raw column alone, as a last resort.
  const serverState = toNegState(pickStr(roundRaw, ["state", "neg_status"]));
  const rawStatus = pickStr(roundRaw, ["status", "round_status"]);
  const responseCount =
    pickNum(roundRaw, ["response_count"]) ?? totals.respondedCount ?? 0;
  // `status` is the RAW column when it is upper-case (that is how PostgreSQL
  // holds it) and an already-derived bucket when it is lower-case. Only the
  // raw form needs the counts to disambiguate — running the derivation over
  // "awaiting_decision" would read it as a status with zero responses and
  // report "Closed — no vendor response".
  const rawIsColumnValue = !!rawStatus && rawStatus === rawStatus.toUpperCase();
  const status =
    serverState ||
    (rawIsColumnValue
      ? deriveNegotiationState({
          status:
            pickStr(roundRaw, ["effective_status"]) === "AWAITING_DECISION" && rawStatus === "ACTIVE"
              ? "ENDED"
              : rawStatus,
          endDate: pickStr(roundRaw, ["end_date"]),
          responseCount,
          hasApprovedQuote: pickBool(roundRaw, ["has_approved_quote"]) === true,
        })
      : toNegState(rawStatus));
  const statusPresentation = roundStatusPresentation(status);

  // ── FIX 3: the round number is RFQ-wide ──────────────────────────────────
  // Product definition: "round_number means the number of the current round in
  // the whole RFQ, not product-wise". One round = one position, however many
  // products it covers.
  //
  // The NUMERATOR is computed server-side (negotiationModel.roundPositionSql)
  // because the stored column restarts at 1 for every product — eight rounds
  // of RFQ 512 are stored as 1, so "Round 1 of 138" rendered eight times.
  // The DENOMINATOR is every round on the parent, which was right all along.
  const roundNumber = pickNum(roundRaw, ["round_number", "round_no", "number"]);
  const roundsOnParent = pickNum(roundRaw, [
    "rounds_on_parent",
    "total_rounds_on_parent",
    "total_rounds",
    "total_rounds_on_rfq",
    "parent_total_rounds",
    "rfq_total_rounds",
  ]);
  // Context, never the denominator: how many of those rounds negotiated the
  // same items as this one.
  const roundsOnProducts = pickNum(roundRaw, [
    "rounds_on_products",
    "total_rounds_for_product",
    "rounds_in_cycle",
  ]);

  const wholeParentMode =
    pickBool(roundRaw, ["is_rfq_level", "is_whole_rfq", "whole_rfq", "rfq_level"]) === true ||
    /whole|rfq_level|global/i.test(pickStr(roundRaw, ["mode", "scope_mode", "round_mode"]) || "");

  // `created_by` is an object {user_id, name, email, mobile, designation};
  // the flat `created_by_name` is the speculative shape.
  const createdBy = roundRaw.created_by && typeof roundRaw.created_by === "object" ? roundRaw.created_by : {};

  const rfqId = pickNum(parentRaw, ["rfq_id"]) ?? pickNum(roundRaw, ["rfq_id", "parent_id"]);
  const arcId = pickNum(parentRaw, ["arc_id"]) ?? pickNum(roundRaw, ["arc_id", "contract_id"]);

  const round = {
    roundId: pickNum(roundRaw, ["round_id", "id"]),
    roundNumber,
    roundsOnParent,
    roundsOnProducts,
    storedRoundNumber: pickNum(roundRaw, ["stored_round_number"]),
    status,
    rawStatus,
    statusPresentation,
    statusDescription: statusPresentation.description,
    isSettled: isSettledStatus(status),
    isTerminated: isTerminatedStatus(status),
    neverReachedVendors: neverReachedVendors(status),
    source,
    isArc: source === "ARC",
    rfqId,
    rfqNo: pickStr(parentRaw, ["rfq_no"]) ?? pickStr(roundRaw, ["rfq_no", "rfq_number"]),
    arcId,
    arcNo: pickStr(parentRaw, ["arc_number"]) ?? pickStr(roundRaw, ["arc_number", "arc_no"]),
    title:
      pickStr(parentRaw, ["title"]) ||
      pickStr(roundRaw, ["title", "rfq_title", "arc_title", "parent_title"]) ||
      (source === "ARC" ? "Rate contract" : "Negotiation round"),
    parentStatus: pickStr(parentRaw, ["status"]),
    isTender:
      (pickNum(parentRaw, ["is_tender"]) ?? 0) === 1 ||
      pickBool(roundRaw, ["is_tender"]) === true,
    hotelName:
      pickStr(parentRaw, ["hotel_name"]) ||
      pickStr(roundRaw, ["hotel_name", "bu_name", "business_unit"]),
    departmentTitle:
      pickStr(parentRaw, ["department_name"]) ||
      pickStr(roundRaw, ["department_title", "department_name", "department"]),
    companyName: pickStr(parentRaw, ["company_name"]),
    categoryTitle: pickStr(roundRaw, ["category_title", "category_name", "category"]),
    createdByName:
      pickStr(createdBy, ["name"]) ||
      pickStr(roundRaw, ["created_by_name", "creator_name", "raised_by_name"]),
    createdByEmail: pickStr(createdBy, ["email"]),
    createdByMobile: pickStr(createdBy, ["mobile"]),
    createdByDesignation: pickStr(createdBy, ["designation"]),
    createdAt: pickStr(roundRaw, ["created_at", "started_at", "start_date"]),
    endDate: pickStr(roundRaw, ["end_date", "deadline", "ends_at", "expires_at"]),
    closedAt: pickStr(roundRaw, ["closed_at", "ended_at", "completed_at"]),
    approvedAt: pickStr(roundRaw, ["approved_at"]),
    publishedAt: pickStr(roundRaw, ["published_at"]),
    remarks: pickStr(roundRaw, ["remarks"]),
    wholeParentMode,
    approval: normalizeApproval(d.approval || roundRaw.approval),
  };

  const scopeEcho =
    pickStr(d, ["scope"]) || pickStr(meta, ["scope", "active_scope"]);
  const siblingCount =
    pickNum(cycle, ["sibling_count"]) ??
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
      firstDefined(d, ["actions", "available_actions", "allowed_actions"])
    ),
    meta: {
      scope: scopeEcho === "cycle" || scopeEcho === "round" ? scopeEcho : null,
      hasSiblings: hasSiblings === true,
      siblingCount,
      // The lock is reported at the TOP LEVEL of the payload
      // (`quote_visibility.locked` from helper/quoteVisibility.js, plus
      // `prices_hidden` once the redaction has run) — not under `meta`, which
      // the payload does not have. Missing it meant sealed rounds rendered as
      // unexplained dashes with no banner to say why.
      quoteVisibilityLocked:
        pickBool(quoteVisibility, ["locked"]) === true ||
        pickBool(d, ["prices_hidden"]) === true ||
        pickBool(meta, [
          "quote_visibility_locked",
          "quotes_locked",
          "visibility_locked",
          "locked",
        ]) === true,
      quoteVisibilityReason:
        pickStr(quoteVisibility, ["message"]) ||
        pickStr(meta, ["quote_visibility_reason", "locked_reason", "message"]),
      quoteVisibilityDeadline: pickStr(quoteVisibility, ["deadline"]),
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

// These four were the canonical copy of the naive-UTC parser — and three other
// files carried their own near-identical version of it while fourteen render
// sites carried none. They now delegate to utils/negotiationTime, the single
// formatter for the whole negotiation tree, and stay exported under their old
// names so this module's consumers are untouched.
export const formatDate = (raw) => formatNegotiationDate(raw);
export const formatDateTime = (raw) => formatNegotiationDateTime(raw);
export const relativeTo = (raw, now = Date.now()) => negotiationRelative(raw, now);

/**
 * "Round 7 of 138" — this round's position in the whole RFQ / rate contract.
 *
 * Both halves are parent-wide, which is the definition: "how many rounds were
 * there in this RFQ, and for each round, what was negotiated".
 */
export function roundDenominatorText(round) {
  if (!round) return "";
  const n = round.roundNumber;
  const onParent = round.roundsOnParent;
  if (n == null) return "Round —";
  return onParent != null ? `Round ${n} of ${onParent}` : `Round ${n}`;
}

/**
 * The follow-up sentence: of all the rounds on this record, how many actually
 * touched the items in front of you. Null when that adds nothing.
 */
export function roundDenominatorExplanation(round) {
  if (!round || round.roundsOnParent == null || round.roundsOnProducts == null) return null;
  if (round.roundsOnProducts >= round.roundsOnParent) return null;
  const parentWord = round.isArc ? "rate contract" : "RFQ";
  const k = round.roundsOnProducts;
  return `Rounds are numbered across the whole ${parentWord}. ${k} of those ${round.roundsOnParent} round${
    round.roundsOnParent === 1 ? "" : "s"
  } negotiated the same item${k === 1 ? "" : "s"} as this one — the rest covered other items.`;
}
