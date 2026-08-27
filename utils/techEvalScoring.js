// Whether a technical-evaluation clause has been scored, and how much of a
// product's evaluation is left to do.
//
// One definition, shared by the buyer grid (ClauseProductItem) and the submit
// counter (technical-evaluation/index). They each carried their own copy and
// both drifted, in two ways that combined into RFQ 536405:
//
//   1. Both inferred "scored" from timestamp drift —
//      `response_timestamp !== score_timestamp`. The two columns take the same
//      value when the answer row is created, but a vendor RE-SUBMITTING their
//      answer moves response_timestamp and leaves score_timestamp behind. So a
//      duplicate vendor submission made an unmarked clause look marked, at
//      buyer_marks, which defaults to 0 — recording a 0% technical failure
//      against a vendor no buyer had ever seen.
//
//   2. The collapsed list counted only vendors still outstanding in the open
//      round; the expanded panel counted every vendor, including those already
//      verified in an approved round, and overwrote the collapsed figure. So
//      expanding a product re-enabled a Submit the server always refused.
//
// `buyer_id` is written only when a buyer saves marks, and the API already
// returns it on every clause payload. It is the record of a human assessment.

/**
 * True when a buyer has recorded marks against this vendor response.
 *
 * @param {object|null|undefined} response - one entry from clause.vendor_responses
 * @returns {boolean}
 */
export function isClauseScored(response) {
  return response?.buyer_id != null;
}

/**
 * True when every clause on the product carries this buyer's marks for the vendor.
 *
 * @param {Array<{vendor_responses?: Array<object>}>} clauses
 * @param {number|string} vendorId
 * @returns {boolean}
 */
export function isVendorFullyScored(clauses, vendorId) {
  if (!Array.isArray(clauses) || clauses.length === 0) return false;
  return clauses.every((clause) => {
    const response = clause?.vendor_responses?.find(
      (r) => String(r?.vendor_id) === String(vendorId)
    );
    return isClauseScored(response);
  });
}

/**
 * How much of the open round is done. Vendors already verified in an approved
 * round are finished business and are not counted — submitting them again is
 * what the server refuses.
 *
 * @param {Array<{vendor_id: number|string, is_verified?: boolean}>} vendors
 * @param {Array<object>} clauses
 * @returns {{evaluatedVendorCount: number, isFullyEvaluated: boolean, totalVendors: number}}
 */
export function summariseEvaluationProgress(vendors, clauses) {
  const all = Array.isArray(vendors) ? vendors : [];
  const outstanding = all.filter((v) => v?.is_verified !== true);
  const evaluatedVendorCount = outstanding.filter((v) =>
    isVendorFullyScored(clauses, v?.vendor_id)
  ).length;

  return {
    evaluatedVendorCount,
    isFullyEvaluated:
      outstanding.length > 0 &&
      evaluatedVendorCount > 0 &&
      evaluatedVendorCount === outstanding.length,
    totalVendors: all.length,
  };
}

/**
 * Patch a vendor response in place after the buyer saves marks, so the grid
 * shows the score without waiting for a refetch. Must set buyer_id — that is
 * what isClauseScored reads.
 *
 * @param {object} response
 * @param {{buyerId: number, marks: number, remark?: string|null, scorerName?: string|null}} scoring
 * @returns {object} a new response object
 */
export function applyLocalScore(response, { buyerId, marks, remark, scorerName } = {}) {
  return {
    ...response,
    buyer_id: buyerId ?? response?.buyer_id ?? null,
    buyer_marks: marks,
    buyer_remark: remark !== undefined ? remark : response?.buyer_remark,
    scorer_name: scorerName || response?.scorer_name,
    score_timestamp: new Date().toISOString(),
  };
}
