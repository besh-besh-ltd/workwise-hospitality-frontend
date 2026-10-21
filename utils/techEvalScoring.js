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

/**
 * Stuck / reopened flags for one product's tech-eval status payload.
 *
 * The backend sends `is_stuck`, `bid_window_open`, `reopened` and
 * `eligible_unscored_vendors`. An older backend sends none of them; then the
 * rule is the one the screen always used: blocked with nobody passed.
 *
 * @param {object|null} data - tech-eval status payload
 * @param {number} totalPassedVerified
 */
export function deriveTechEvalStatusFlags(data, totalPassedVerified = 0) {
  const blocked = data?.blocked_insufficient_vendors === true;
  return {
    isStuck:
      typeof data?.is_stuck === 'boolean'
        ? data.is_stuck
        : blocked && totalPassedVerified === 0,
    bidWindowOpen:
      typeof data?.bid_window_open === 'boolean' ? data.bid_window_open : null,
    reopened: data?.reopened === true,
    eligibleUnscoredVendors: Array.isArray(data?.eligible_unscored_vendors)
      ? data.eligible_unscored_vendors
      : [],
  };
}

const vendorDisplayName = (v) =>
  v?.vendor_name || (v?.rfq_product_vendor_id ? `VEN-${v.rfq_product_vendor_id}` : `Vendor ${v?.vendor_id}`);

/**
 * Vendors who answered the technical questions but will not be in the round
 * being submitted: still outstanding (not verified in an earlier round, not
 * replaced out) and not fully scored — including ones that never quoted and so
 * cannot be scored at all.
 *
 * @returns {string[]} display names
 */
export function listLeftOutResponders(vendors, clauses) {
  return (Array.isArray(vendors) ? vendors : [])
    .filter((v) => v?.is_verified !== true && v?.is_replaced_out !== true)
    .filter((v) => !isVendorFullyScored(clauses, v?.vendor_id))
    .map(vendorDisplayName);
}

/** Submit-time warning text, or null when nobody is left out. */
export function leftOutWarningText(names) {
  if (!names || names.length === 0) return null;
  return `${names.length} vendor(s) who answered won't be in this round: ${names.join(', ')}. Continue?`;
}

/**
 * How many distinct vendors the "Quoted Vendors Only" filter is hiding: they
 * answered the questions but have not quoted.
 */
export function countHiddenResponders(rfqProducts) {
  const ids = new Set();
  (Array.isArray(rfqProducts) ? rfqProducts : []).forEach((p) => {
    (p?.vendors || []).forEach((v) => {
      if (v?.has_quoted === false && v?.is_replaced_out !== true && v?.is_verified !== true) {
        ids.add(String(v.vendor_id));
      }
    });
  });
  return ids.size;
}
