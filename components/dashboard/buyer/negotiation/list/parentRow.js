// Parent-row helpers — the RFQ-first negotiation listing.
//
// POST /negotiation/list-view now defaults to `groupBy: 'parent'`: ONE row per
// RFQ and one per ARC, with an identical key set for both. Production carries
// 886 rounds over 124 distinct RFQs (median 2 rounds, max 138), so the round
// grain rendered 138 rows that all read as 138 different RFQs.
//
// Everything in this file is pure. The listing card, the per-RFQ page and the
// tests all read these rules from here so none of them can invent a second
// interpretation of the same payload.

import {
  NEG_STATE_PRESENTATION,
  NEG_STATE_SEQUENCE,
} from "../round-detail/negotiationStates";
import { formatCurrencyShort } from "@/utils/sharedFunctions";

/* ── identity ─────────────────────────────────────────────────────────────── */

/** An ARC parent carries rfq_id = NULL by construction — never test rfq_id alone. */
export function isArcRow(row) {
  if (!row) return false;
  if (row.source_type) return String(row.source_type).toUpperCase() === "ARC";
  return row.rfq_id == null && row.arc_id != null;
}

/**
 * `RFQ:<id>` / `ARC:<id>` — the server's parent identity, and the only filter
 * key that can select an ARC parent. Round rows do not carry `parent_key`, so
 * it is derived for them here (the per-RFQ page filters round rows by it).
 */
export function parentKeyOf(row) {
  if (!row) return null;
  if (row.parent_key) return String(row.parent_key);
  if (row.rfq_id != null) return `RFQ:${row.rfq_id}`;
  if (row.arc_id != null) return `ARC:${row.arc_id}`;
  return null;
}

/**
 * Where the card goes.
 *
 * RFQ → the per-RFQ negotiation page (level 2, this change).
 * ARC → the rate-contract page, which ALREADY has a per-contract rounds list
 *       under its commercial stage. There is deliberately no ARC level 2.
 */
export function parentHref(row) {
  if (isArcRow(row)) return `/dashboard/buyer/rate-contracts/${row.arc_id}?stage=commercial`;
  return `/dashboard/buyer/negotiation/${row.rfq_id}`;
}

/** The number a vendor reads off their email. ARC aliases arc_number into rfq_no. */
export function parentNumber(row) {
  if (!row) return null;
  return isArcRow(row)
    ? row.arc_number || row.rfq_no || row.arc_id
    : row.rfq_no || row.rfq_id;
}

export function parentTitle(row) {
  if (!row) return "";
  return row.title || (isArcRow(row) ? "Rate contract" : row.is_tender ? "Tender" : "RFQ");
}

/* ── the state mix ────────────────────────────────────────────────────────── */

/**
 * `state_counts` always carries all seven keys; only the non-zero ones are a
 * segment. Ordered by the shared lifecycle sequence so two cards never list
 * the same mix in a different order.
 */
export function stateSegments(stateCounts) {
  let raw = stateCounts;
  // jsonb comes back as an object, but a cached/serialised payload can carry
  // the string form — degrade to "no strip", never to a crash.
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch (_) { raw = null; }
  }
  const counts = raw && typeof raw === "object" ? raw : {};
  return NEG_STATE_SEQUENCE.map((key) => ({
    key,
    count: Number(counts[key] || 0),
    presentation: NEG_STATE_PRESENTATION[key],
  })).filter((s) => s.count > 0);
}

/**
 * The strip is only worth its line when the parent's rounds actually disagree.
 * 48 of the 124 production parents (39%) qualify; the rest say the pill twice.
 */
export function hasStateMix(stateCounts) {
  return stateSegments(stateCounts).length > 1;
}

/**
 * Segment wording. The shared labels are sentence-long ("Lapsed — never
 * approved") and four of them on one line is unreadable, so a segment renders
 * the head of the label and carries the full label + description as its
 * tooltip. Derived, never transcribed — the labels live in negotiationStates.js
 * and nowhere else.
 */
export function shortStateLabel(key) {
  const p = NEG_STATE_PRESENTATION[key];
  if (!p) return "";
  const head = String(p.label).split("—")[0].trim();
  return head.charAt(0).toLowerCase() + head.slice(1);
}

/** Why the pill says one thing while the strip says four. */
export const ROLL_UP_TOOLTIP =
  "One status for the whole RFQ: the state of the round that needs attention soonest. The strip below breaks the rounds down.";

/* ── savings ──────────────────────────────────────────────────────────────── */

/**
 * TWO figures, always in one sentence: the total across every vendor that
 * participated, with the awarded-vendor portion named inside it. Production
 * totals — all-vendor ₹98,45,639 on a ₹8,04,14,576 baseline; awarded
 * ₹64,67,966 on ₹6,26,64,916.
 *
 * Neither is clamped. Some RFQs finished ABOVE their baseline and a floor of
 * zero would hide it.
 *
 * 36 of the 124 parents have no approved quote at all. Their awarded figure is
 * legitimately zero, which is NOT the same statement as "₹0 saved on the
 * awarded vendor" — those read "not yet awarded".
 *
 * @returns {{kind:'arc'|'unmeasured'|'measured', ...}}
 */
export function savingsView(row) {
  if (!row) return { kind: "unmeasured" };
  // ARC parents come back with saved_* = 0 and saved_pct* = null: the savings
  // query only runs over rfq ids. Rendering that as "₹0 saved" would be a
  // measurement the server never made.
  if (isArcRow(row)) return { kind: "arc" };

  const pairs = Number(row.savings_pairs_counted || 0);
  const baseline = Number(row.baseline_total || 0);
  if (pairs <= 0 && Math.abs(baseline) < 0.005) return { kind: "unmeasured" };

  const awardedPairs = Number(row.savings_pairs_counted_awarded || 0);
  const awardedBaseline = Number(row.baseline_total_awarded || 0);
  const awarded =
    awardedPairs > 0 || Math.abs(awardedBaseline) >= 0.005
      ? {
          value: Number(row.saved_value_awarded || 0),
          pct: row.saved_pct_awarded == null ? null : Number(row.saved_pct_awarded),
          baseline: awardedBaseline,
        }
      : null;

  return {
    kind: "measured",
    value: Number(row.saved_value || 0),
    pct: row.saved_pct == null ? null : Number(row.saved_pct),
    baseline,
    awarded,
  };
}

/**
 * Compact ₹ with the sign kept. A price that went UP renders "−₹1.2L", never
 * "₹0" and never the magnitude on its own.
 */
export function formatSaved(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "₹0";
  return n > 0 ? formatCurrencyShort(n) : `−${formatCurrencyShort(Math.abs(n))}`;
}

/** "saved" / "over baseline" — the direction in words, not just a glyph. */
export function savedWord(value) {
  return Number(value) < 0 ? "over baseline" : "saved";
}

export function formatPct(value, digits = 1) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const n = Number(value);
  return `${n < 0 ? "−" : ""}${Math.abs(n).toFixed(digits)}%`;
}

/* ── small shared formatting ──────────────────────────────────────────────── */

/** Naive DB timestamps are UTC. */
export function toDate(raw) {
  if (!raw) return null;
  const s = String(raw);
  const iso = !s.includes("Z") && !/[+-]\d{2}:?\d{2}$/.test(s) ? s.replace(" ", "T") + "Z" : s;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

export function fmtDate(raw) {
  const d = toDate(raw);
  return d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;
}

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

/** "Taj Palace" → "TP" — the compact business-unit code used across the listings. */
export function buCodeFor(name) {
  if (!name) return "—";
  const parts = String(name).replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return (parts[0][0] + parts[1][0] + (parts[2]?.[0] || "")).toUpperCase();
}
