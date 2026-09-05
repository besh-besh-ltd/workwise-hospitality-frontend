import { demoSession } from "./writeRoutes";

/**
 * Scoring state for the technical evaluation.
 *
 * A mark the evaluator types has to survive a reload, and the screen has to be
 * able to tell "scored" from "not scored yet". It does that by comparing two
 * timestamps: `score_timestamp === response_timestamp` means untouched. So an
 * unscored cell must echo the response time back, and a scored one must carry
 * the moment it was marked — anything else and the cell reads as blank however
 * many marks are stored against it.
 */

export const markFor = (clauseId, vendorId) =>
  demoSession.buyerMarks?.[`${clauseId}:${vendorId}`] || null;

/** One vendor's response to one clause, carrying any mark already given. */
export const scoredResponse = (vendor, clauseId, text, respondedAt) => {
  const mark = markFor(clauseId, vendor.vendor_id);
  return {
    vendor_id: vendor.vendor_id,
    rfq_product_vendor_id: vendor.rfq_product_vendor_id,
    vendor_response: text,
    response_timestamp: respondedAt,
    // Equal to the response time while unscored — that is the "not yet marked"
    // signal the screen reads.
    score_timestamp: mark ? mark.at : respondedAt,
    buyer_marks: mark ? mark.marks : null,
    buyer_remark: mark ? mark.remark : null,
    scorer_name: mark ? "Vivek Jaiswal" : null,
    files: [],
  };
};

/**
 * Roll the stored marks up into a per-vendor verdict for one product.
 *
 * `groups` is the same grouped payload /rfq/get-clauses returns, so the result
 * and the matrix can never disagree about who passed.
 */
export const evaluationResult = (groups, minScore) => {
  const byVendor = {};

  groups.forEach((group) => {
    const maxTotal = group.clauses.reduce((s, c) => s + (c.weightage || 0), 0);

    group.vendors.forEach((v) => {
      const row = (byVendor[v.vendor_id] = byVendor[v.vendor_id] || {
        vendor_id: v.vendor_id,
        vendor_name: v.vendor_name,
        scored_clauses: 0,
        total_clauses: 0,
        marks: 0,
        max_marks: 0,
      });
      row.total_clauses += group.clauses.length;
      row.max_marks += maxTotal;

      group.clauses.forEach((c) => {
        const mark = markFor(c.clause_id, v.vendor_id);
        if (!mark || mark.marks == null) return;
        row.scored_clauses += 1;
        row.marks += Number(mark.marks) || 0;
      });
    });
  });

  return Object.values(byVendor).map((r) => {
    const pct = r.max_marks ? Math.round((r.marks / r.max_marks) * 100) : 0;
    const complete = r.scored_clauses === r.total_clauses && r.total_clauses > 0;
    return {
      ...r,
      score: r.marks,
      percentage: pct,
      minimum_passing_score: minScore,
      // Only a fully scored vendor gets a verdict. A partial score that happens
      // to clear the bar is not a pass — it is an unfinished evaluation.
      is_evaluated: complete,
      is_passed: complete && pct >= minScore,
      is_failed: complete && pct < minScore,
      status: !complete ? "IN_PROGRESS" : pct >= minScore ? "PASSED" : "FAILED",
    };
  });
};
