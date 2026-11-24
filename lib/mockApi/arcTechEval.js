import { peopleById } from "@/data/ihg/org";
import { contract } from "@/data/ihg/thread";
import { ARC, SUBMISSION } from "@/lib/wwai/data/techApprove";

/**
 * The rate contract's technical evaluation — ARC-2627-0014's matrix, and the
 * approval it goes through once it is scored.
 *
 * ONE SOURCE FOR THE MATRIX. The clauses, the five blind-aliased vendors,
 * their responses and their evidence are prototype 1's own fixture
 * (`ARC_DATA`, via lib/wwai/data/techApprove). The AI Technical Evaluator
 * panel narrates that fixture, so serving anything else here put a panel on
 * screen that talked about clauses and documents the matrix beside it did not
 * have.
 *
 * TWO VIEWS OF THE SAME EVALUATION, chosen by the page URL:
 *   ?stage=technical                 the evaluator's screen — nothing scored
 *                                    yet; marks typed this session persist.
 *   ?stage=technical&view=approver   the approver's screen — scored by the
 *                                    evaluator (SUBMISSION), submitted, and
 *                                    waiting on the technical approver.
 * The adapter runs in the browser, so it reads the page URL directly. Keeping
 * the two apart means each URL opens on the same state in any fresh tab, and
 * deciding on one never rewrites the other.
 *
 * Kept in its own sessionStorage key: a page refresh keeps a decision, a new
 * tab starts from "waiting on the approver" again.
 */

const KEY = "ihg:arcTechEval";

const blank = () => ({
  marks: {},        // evaluator view: response_id -> { buyer_marks, buyer_remark, mandatory_passed }
  amends: {},       // approver view: response_id -> fields the approver amended on approval
  decision: null,   // approver view: { status: "APPROVED" | "REJECTED", comment, at, by }
  editHistory: [],  // approver view: one row per amended field
});

const load = () => {
  if (typeof window === "undefined") return blank();
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? { ...blank(), ...JSON.parse(raw) } : blank();
  } catch (_) {
    return blank();
  }
};

const state = load();

const persist = () => {
  if (typeof window === "undefined") return;
  try { window.sessionStorage.setItem(KEY, JSON.stringify(state)); } catch (_) {}
};

/** Is the page the approver's view of the evaluation? */
export const isApproverView = () => {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("view") === "approver";
  } catch (_) {
    return false;
  }
};

const currentPerson = () => {
  if (typeof window === "undefined") return null;
  try {
    const email = window.localStorage.getItem("current-user-email") || "";
    return Object.values(peopleById).find((p) => p.email === email) || null;
  } catch (_) {
    return null;
  }
};

const evaluator = () => peopleById[SUBMISSION.evaluatorId];
const approver = () => peopleById[SUBMISSION.approverId];
const currentUserIsApprover = () => currentPerson()?.id === SUBMISSION.approverId;

/** Same id on every read, so the stage's approval effect never re-fires. */
const APPROVAL_INSTANCE_ID = 7714;

/**
 * Only the first line item, Bath Towel 500 GSM, carries technical clauses.
 * The clause set is written for a 500 GSM terry towel (weight, ring-spun
 * fibre, wash fastness, shrinkage, OEKO-TEX scope). Repeating it on bed sheets
 * and amenity kits would put "fabric weight 500 GSM" against a pillow cover.
 */
const SCORED_ITEM_ID = 1;

/* TechnicalStage matches responses to columns with Number(...) on both
   vendor_alias_key and clause_id, and Number(response_id) on amends — so all
   three are numeric. A response id encodes item, alias and clause. */
const responseId = (itemId, vendorKey, clauseNum) =>
  Number(itemId) * 1000 + Number(vendorKey) * 10 + Number(clauseNum);

const decodeResponseId = (rid) => {
  const n = Number(rid);
  return {
    itemId: Math.floor(n / 1000),
    vendorKey: Math.floor((n % 1000) / 10),
    clause: ARC.clauses[(n % 10) - 1] || null,
  };
};

const pick = (obj, field, fallback) => (obj && field in obj ? obj[field] : fallback);

/** The marks on one cell, as the current view sees them. */
const cellValues = (rid, vendorKey, clause) => {
  if (isApproverView()) {
    const seeded = SUBMISSION.marks[`${vendorKey}|${clause.id}`] || {};
    const amended = state.amends[rid];
    return {
      buyer_marks: pick(amended, "buyer_marks", seeded.mark ?? null),
      buyer_remark: pick(amended, "buyer_remark", seeded.remark ?? null),
      mandatory_passed: clause.is_mandatory ? pick(amended, "mandatory_passed", seeded.pass ?? null) : null,
    };
  }
  const typed = state.marks[rid] || {};
  return {
    buyer_marks: typed.buyer_marks ?? null,
    buyer_remark: typed.buyer_remark ?? null,
    mandatory_passed: clause.is_mandatory ? (typed.mandatory_passed ?? null) : null,
  };
};

/**
 * Server-side standing per vendor. Only a fully scored vendor gets a verdict
 * (with every gate judged); a failed gate disqualifies whatever the points.
 */
const scoreRow = (vendor, clauses, responses) => {
  const mine = responses.filter((r) => r.vendor_alias_key === vendor.vendor_alias_key);
  const max = clauses.reduce((s, c) => s + c.weight, 0) || 100;
  const total = mine.reduce((s, r) => s + (Number(r.buyer_marks) || 0), 0);
  const complete =
    mine.length === clauses.length &&
    mine.every((r) => r.buyer_marks != null) &&
    clauses.every((c, idx) => !c.is_mandatory || typeof mine[idx]?.mandatory_passed === "boolean");
  const gateFailed = clauses.some((c, idx) => c.is_mandatory && mine[idx]?.mandatory_passed === false);
  const pct = Math.round((total / max) * 100);
  return {
    vendor_alias_key: vendor.vendor_alias_key,
    vendor_alias: vendor.vendor_alias,
    total_marks: total,
    max_marks: max,
    score_percent: pct,
    qualifies: complete ? !gateFailed && pct >= ARC.minPass : null,
    mandatory_failed: complete ? gateFailed : null,
  };
};

/** GET /arc-v2/evaluation/items/:id/tech-eval */
export const arcTechEvalBlock = (itemId) => {
  const scored = Number(itemId) === SCORED_ITEM_ID;
  const source = scored ? ARC.clauses : [];

  const responses = [];
  ARC.vendors.forEach((v) => {
    source.forEach((c, idx) => {
      const rid = responseId(itemId, v.vendor_alias_key, idx + 1);
      const r = ARC.responses.find((x) => x.vendor_alias_key === v.vendor_alias_key && x.clause_id === c.id) || {};
      responses.push({
        response_id: rid,
        vendor_alias_key: v.vendor_alias_key,
        vendor_alias: v.vendor_alias,
        has_submitted_quote: true,
        clause_id: idx + 1,
        vendor_response: r.text || "",
        // `file_id` is what the screen keys and labels the chip on
        // ("Evidence #5521"), matching the evidence ids the AI panels cite.
        files: (r.files || []).map((f) => ({ file_id: f.file_id, name: f.name, pages: f.pages })),
        ...cellValues(rid, v.vendor_alias_key, c),
      });
    });
  });

  return {
    tech_evaluation: {
      id: 1400 + Number(itemId),
      status: isApproverView() ? "SUBMITTED" : "IN_PROGRESS",
      minimum_passing_score: ARC.minPass,
      max_marks: source.reduce((s, c) => s + c.weight, 0),
    },
    clauses: source.map((c, idx) => ({
      id: idx + 1,
      clause_no: String(idx + 1),
      text: c.text,
      clause_text: c.text,
      type: c.type,
      clause_type: c.type,
      weight: c.weight,
      weightage: c.weight,
      max_marks: c.weight,
      is_mandatory: !!c.is_mandatory,
    })),
    responses,
    scores: scored ? ARC.vendors.map((v) => scoreRow(v, source, responses)) : [],
    // Counts only — never prices, rank or the identities of held vendors.
    shortlist: scored ? ARC.shortlist : null,
  };
};

/**
 * GET /arc-v2/evaluation/:id/universal-tech-eval
 *
 * This contract has no ARC-wide clauses. Answering with the per-item block
 * here rendered the same five clauses twice — once as "Universal" and once
 * under the item — and doubled the cells the evaluator had to fill.
 */
export const arcUniversalTechEvalBlock = () => ({
  tech_evaluation: null,
  clauses: [],
  responses: [],
  scores: [],
  shortlist: null,
});

/** POST /arc-v2/evaluation/tech-eval/score — the evaluator's marks, per cell. */
export const arcTechEvalScore = (body) => {
  const rid = Number(body?.response_id);
  if (!rid) return { status: 0, message: "Unknown response" };
  // The approver's view is the submitted record; it is amended only through
  // the decision, never cell by cell.
  if (isApproverView()) return { status: 0, message: "Submitted evaluations are amended on approval" };
  state.marks[rid] = {
    buyer_marks: body?.buyer_marks ?? null,
    buyer_remark: body?.buyer_remark ?? null,
    ...(typeof body?.mandatory_passed === "boolean" ? { mandatory_passed: body.mandatory_passed } : {}),
  };
  persist();
  return { status: 1, saved: true };
};

/**
 * POST /arc-v2/evaluation/tech-eval/demo-apply-suggested — "Apply all
 * suggested marks" on the AI Technical Evaluator panel. Writes the panel's
 * proposals (ARC_DATA.ai.suggestions) into the evaluator's matrix through the
 * same store as typed marks, so counters and pass/fail read one set of numbers.
 */
export const arcTechEvalApplySuggested = () => {
  if (isApproverView()) return { status: 0, message: "Submitted evaluations are amended on approval", marks_written: 0 };
  const suggestions = ARC?.ai?.suggestions || {};
  let written = 0;
  ARC.vendors.forEach((v) => {
    ARC.clauses.forEach((c, idx) => {
      const sg = suggestions[`${v.vendor_alias_key}|${c.id}`];
      if (!sg) return;
      const rid = responseId(SCORED_ITEM_ID, v.vendor_alias_key, idx + 1);
      state.marks[rid] = {
        buyer_marks: sg.mark,
        buyer_remark: sg.why || state.marks[rid]?.buyer_remark || null,
        ...(c.is_mandatory ? { mandatory_passed: sg.verdict === true } : {}),
      };
      written += 1;
    });
  });
  persist();
  return { status: written ? 1 : 0, marks_written: written };
};

const approvalStatus = () => (state.decision ? state.decision.status : "PENDING");

/** GET /arc-v2/evaluation/:id/tech-eval/approval — the chain, with names. */
export const arcTechEvalApproval = () => {
  if (!isApproverView()) return { status: "NOT_SUBMITTED", approvers: [], can_submit: true };
  const ap = approver();
  const d = state.decision;
  const status = approvalStatus();
  return {
    approval: {
      instance_id: APPROVAL_INSTANCE_ID,
      status,
      current_step: 1,
      total_steps: 1,
      submitted_by_name: evaluator().name,
      submitted_at: SUBMISSION.submittedAt,
      steps: [
        {
          step_order: 1,
          decision_rule: "ANY",
          status,
          approvers: [
            {
              user_id: ap.numericId,
              user_name: ap.name,
              user_designation: ap.title,
              status,
              comment: d?.comment || null,
              acted_at: d?.at || null,
            },
          ],
        },
      ],
    },
    edit_history: state.editHistory,
  };
};

/**
 * POST /arc-v2/evaluation/:id/tech-eval/decide
 * { decision: "approve" | "reject", comment, amend?: { marks, universal_marks } }
 *
 * Guarded like the real transition: one decision per submission, only the
 * named approver, and a send-back needs a note. Amends ride the approval and
 * land in the edit history.
 */
export const arcTechEvalDecide = (body) => {
  if (!isApproverView()) return { status: 1, message: "Decision recorded" };
  if (state.decision) return { status: 0, message: "This evaluation has already been decided" };
  if (!currentUserIsApprover()) {
    return { status: 0, message: `Only ${approver().name} can decide this evaluation` };
  }

  const approve = body?.decision === "approve";
  const comment = String(body?.comment || "").trim();
  if (!approve && !comment) return { status: 0, message: "Add a note before sending back" };

  const me = currentPerson() || approver();
  const at = new Date().toISOString();

  if (approve) {
    const amends = [...(body?.amend?.marks || []), ...(body?.amend?.universal_marks || [])];
    amends.forEach((m) => {
      const rid = Number(m.response_id);
      const { vendorKey, clause } = decodeResponseId(rid);
      if (!clause) return;
      const before = cellValues(rid, vendorKey, clause);
      ["buyer_marks", "buyer_remark", "mandatory_passed"].forEach((field) => {
        if (!(field in m) || m[field] === before[field]) return;
        state.amends[rid] = { ...state.amends[rid], [field]: m[field] };
        state.editHistory.push({
          response_id: rid,
          field_changed: field,
          before_value: before[field],
          after_value: m[field],
          changed_by: me.numericId,
          changed_by_name: me.name,
          changed_at: at,
          comment: comment || null,
        });
      });
    });
  }

  state.decision = { status: approve ? "APPROVED" : "REJECTED", comment: comment || null, at, by: me.name };
  persist();
  return {
    status: 1,
    message: approve ? "Technical evaluation approved" : "Sent back to the evaluator",
  };
};

/**
 * The lifecycle, as the approver's view sees it: the technical stage scored
 * and waiting on the approver (or decided), Commercial behind it, and the
 * approver holding read access only — amending happens through the decision.
 */
export const withArcTechApproval = (payload) => {
  if (!isApproverView() || payload?.arc?.id !== contract.id) return payload;

  const status = approvalStatus();
  const ev = evaluator();
  const ap = approver();
  const canApprove = status === "PENDING" && currentUserIsApprover();
  const vendors = ARC.vendors.length;

  const stages = payload.stages.map((s) => {
    if (s.key === "technical") {
      return {
        ...s,
        state: status === "APPROVED" ? "complete" : status === "REJECTED" ? "active" : "partial",
        reason: status === "APPROVED" ? null : status === "REJECTED" ? "approval_rejected" : "awaiting_approval",
        counts: { ...s.counts, vendors_in_play: vendors, vendors_fully_scored: vendors },
        approval: { instance_id: APPROVAL_INSTANCE_ID, status, current_step: 1, can_user_approve: canApprove },
        submitted_at: SUBMISSION.submittedAt,
        flow: { action_taker_role: "Technical evaluator" },
        actors: {
          action_taker: { role: "Technical evaluator", people: [{ user_id: ev.numericId, name: ev.name }] },
          approver: {
            role: "Technical approver",
            status,
            step_label: "Level 1 of 1 · technical sign-off",
            can_user_approve: canApprove,
            people: [{ user_id: ap.numericId, name: ap.name, designation: ap.title }],
          },
          next_stage: { label: "Commercial" },
        },
      };
    }
    if (s.key === "commercial") {
      return status === "APPROVED"
        ? { ...s, state: "active", reason: null }
        : { ...s, state: "locked", reason: "technical_incomplete" };
    }
    return s;
  });

  return {
    ...payload,
    stages,
    permissions: {
      ...payload.permissions,
      arc: ["read"],
      "arc-tech": ["read"],
      technical: ["read"],
      te: ["read"],
    },
  };
};
