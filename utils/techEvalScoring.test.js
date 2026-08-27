/**
 * One definition of "this clause has been scored", shared by every technical
 * evaluation surface.
 *
 * CONFIRMED DEFECT, from RFQ 536405 (The Orchid Hotel Pune).
 *
 * The buyer grid and the submit-button counter each carried their own copy of
 * the predicate, and both inferred a score by comparing the vendor answer's two
 * timestamps: `response_timestamp !== score_timestamp`. Both take the same value
 * when the row is created, but a vendor re-submitting their answer moves
 * response_timestamp and leaves score_timestamp behind — so any duplicate vendor
 * submission made an unmarked clause look marked, at buyer_marks 0.
 *
 * `buyer_id` is set only when a buyer saves marks. It is already present on
 * every clause payload the API returns. It is the answer.
 *
 * The two copies had also drifted apart on a second axis: the collapsed product
 * list counted only vendors not yet verified in an earlier round, while the
 * expanded panel counted all of them and overwrote the collapsed figure. So
 * expanding a product re-enabled a Submit button the server would always
 * refuse — which is the HTTP 500 the client photographed.
 */

import {
  isClauseScored,
  isVendorFullyScored,
  summariseEvaluationProgress,
  applyLocalScore,
} from "./techEvalScoring";

const clause = (id, responses) => ({ clause_id: id, vendor_responses: responses });

const scored = (vendor_id, buyer_marks) => ({
  vendor_id,
  buyer_id: 4242,
  buyer_marks,
  vendor_response: "OK",
  response_timestamp: "2026-08-19T15:23:45.000Z",
  score_timestamp: "2026-08-23T10:36:12.000Z",
});

/** The production shape that forged a score: answered, then re-submitted. */
const resubmittedNeverScored = (vendor_id) => ({
  vendor_id,
  buyer_id: null,
  buyer_marks: 0,
  vendor_response: "I Agree",
  response_timestamp: "2026-08-19T15:23:53.018Z",
  score_timestamp: "2026-08-19T15:23:45.877Z",
});

/** Answered once, never scored, never re-submitted. */
const answeredOnly = (vendor_id) => ({
  vendor_id,
  buyer_id: null,
  buyer_marks: 0,
  vendor_response: "I Agree",
  response_timestamp: "2026-08-20T15:27:33.898Z",
  score_timestamp: "2026-08-20T15:27:33.898Z",
});

describe("isClauseScored", () => {
  it("treats a buyer's marks as scored", () => {
    expect(isClauseScored(scored(494, 25))).toBe(true);
  });

  it("does not treat a vendor's re-submission as a buyer's marks", () => {
    expect(isClauseScored(resubmittedNeverScored(494))).toBe(false);
  });

  it("does not treat an unanswered or unscored response as scored", () => {
    expect(isClauseScored(answeredOnly(235))).toBe(false);
    expect(isClauseScored(undefined)).toBe(false);
    expect(isClauseScored(null)).toBe(false);
    expect(isClauseScored({})).toBe(false);
  });

  it("accepts marks of zero when a buyer recorded them", () => {
    // A deliberate zero is a real assessment; the absence of a scorer is not.
    expect(isClauseScored({ vendor_id: 1, buyer_id: 7, buyer_marks: 0 })).toBe(true);
  });
});

describe("isVendorFullyScored", () => {
  const clauses = [
    clause(1, [scored(522, 25), resubmittedNeverScored(494)]),
    clause(2, [scored(522, 25), resubmittedNeverScored(494)]),
  ];

  it("is true only when every clause carries the buyer's marks", () => {
    expect(isVendorFullyScored(clauses, 522)).toBe(true);
  });

  it("is false for the re-submitter nobody assessed", () => {
    expect(isVendorFullyScored(clauses, 494)).toBe(false);
  });

  it("is false when a clause has no response for the vendor at all", () => {
    expect(isVendorFullyScored(clauses, 830)).toBe(false);
  });

  it("is false when some clauses are scored and others are not", () => {
    const partial = [clause(1, [scored(830, 25)]), clause(2, [answeredOnly(830)])];
    expect(isVendorFullyScored(partial, 830)).toBe(false);
  });

  it("matches vendor ids across string and number forms", () => {
    expect(isVendorFullyScored(clauses, "522")).toBe(true);
  });

  it("is false with no clauses to score against", () => {
    expect(isVendorFullyScored([], 522)).toBe(false);
    expect(isVendorFullyScored(undefined, 522)).toBe(false);
  });
});

describe("summariseEvaluationProgress", () => {
  const clauses = [
    clause(1, [scored(522, 25), scored(830, 25), resubmittedNeverScored(494), answeredOnly(235)]),
    clause(2, [scored(522, 25), scored(830, 25), resubmittedNeverScored(494), answeredOnly(235)]),
  ];

  it("counts only vendors a buyer scored in the round still open", () => {
    const vendors = [
      { vendor_id: 522, is_verified: false },
      { vendor_id: 830, is_verified: false },
      { vendor_id: 494, is_verified: false },
      { vendor_id: 235, is_verified: false },
    ];
    const out = summariseEvaluationProgress(vendors, clauses);
    expect(out.evaluatedVendorCount).toBe(2);
    expect(out.isFullyEvaluated).toBe(false); // 494 and 235 are still unscored
  });

  it("ignores vendors already verified in an approved round", () => {
    // RFQ 536405 after round 1: three vendors verified, one non-bidder left.
    // Counting the verified three is what re-enabled a Submit the server
    // always refused with a 500.
    const vendors = [
      { vendor_id: 522, is_verified: true },
      { vendor_id: 830, is_verified: true },
      { vendor_id: 494, is_verified: true },
      { vendor_id: 235, is_verified: false },
    ];
    const out = summariseEvaluationProgress(vendors, clauses);
    expect(out.evaluatedVendorCount).toBe(0);
    expect(out.isFullyEvaluated).toBe(false);
  });

  it("is fully evaluated once every outstanding vendor carries marks", () => {
    const vendors = [
      { vendor_id: 522, is_verified: false },
      { vendor_id: 830, is_verified: false },
      { vendor_id: 494, is_verified: true },
    ];
    const out = summariseEvaluationProgress(vendors, clauses);
    expect(out.evaluatedVendorCount).toBe(2);
    expect(out.isFullyEvaluated).toBe(true);
  });

  it("reports nothing to submit when there are no vendors or no clauses", () => {
    expect(summariseEvaluationProgress([], clauses)).toEqual({
      evaluatedVendorCount: 0, isFullyEvaluated: false, totalVendors: 0,
    });
    expect(summariseEvaluationProgress([{ vendor_id: 522 }], [])).toEqual({
      evaluatedVendorCount: 0, isFullyEvaluated: false, totalVendors: 1,
    });
    expect(summariseEvaluationProgress(undefined, undefined)).toEqual({
      evaluatedVendorCount: 0, isFullyEvaluated: false, totalVendors: 0,
    });
  });
});

describe("applyLocalScore", () => {
  // After saving marks the grid patches the response in place so the score
  // appears without a refetch. That patch has to satisfy isClauseScored, or the
  // buyer saves marks and watches the cell stay blank.
  const unscored = () => ({
    vendor_id: 522,
    buyer_id: null,
    buyer_marks: 0,
    vendor_response: "I Agree",
    response_timestamp: "2026-08-19T15:23:45.000Z",
    score_timestamp: "2026-08-19T15:23:45.000Z",
  });

  it("produces a response the scored check accepts", () => {
    const patched = applyLocalScore(unscored(), { buyerId: 4242, marks: 25 });
    expect(isClauseScored(patched)).toBe(true);
    expect(patched.buyer_marks).toBe(25);
    expect(patched.buyer_id).toBe(4242);
  });

  it("records the remark and the scorer's name when given", () => {
    const patched = applyLocalScore(unscored(), {
      buyerId: 4242, marks: 25, remark: "Sample approved", scorerName: "Khem Singh",
    });
    expect(patched.buyer_remark).toBe("Sample approved");
    expect(patched.scorer_name).toBe("Khem Singh");
  });

  it("leaves the vendor's own answer untouched", () => {
    const patched = applyLocalScore(unscored(), { buyerId: 4242, marks: 25 });
    expect(patched.vendor_response).toBe("I Agree");
    expect(patched.response_timestamp).toBe("2026-08-19T15:23:45.000Z");
  });

  it("keeps the previous remark and scorer when none is supplied", () => {
    const base = { ...unscored(), buyer_remark: "earlier note", scorer_name: "Someone" };
    const patched = applyLocalScore(base, { buyerId: 4242, marks: 10 });
    expect(patched.buyer_remark).toBe("earlier note");
    expect(patched.scorer_name).toBe("Someone");
  });
});
