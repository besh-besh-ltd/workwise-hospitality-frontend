// A deactivated approver still sitting on a live step (UM-11).
//
// The engine keeps an approver row rather than deleting it — that is the
// invariant the whole tombstone design rests on — so an account switched off
// mid-approval leaves its row PENDING forever. Every panel then shows that
// person's name and the word "Waiting", about somebody who cannot sign in.
// Production carries 24 such rows across 19 live approvals.
//
// The fix is deliberately *not* a seventh approver state. The approval state
// really is pending; what is wrong is presenting it as somebody we are waiting
// on. So `unreachable` is a subset of `outstanding`, and the arithmetic the
// server also computes stays intact.

import { tallyStep, effectiveApproverStatus, outstandingForNaming } from "./approverState";

const step = (approvers, extra = {}) => ({
  status: "PENDING",
  decision_rule: "ALL",
  approvers,
  ...extra,
});

describe("an approver who cannot sign in", () => {
  it("is still pending, because that is what the row says", () => {
    // Not a new state. Changing the approval state would put this module out
    // of step with poDashboardModel.effectiveStatusOf, which it mirrors.
    const ap = { status: "PENDING", account_active: false };
    expect(effectiveApproverStatus(ap, "PENDING", "ALL")).toBe("PENDING");
  });

  it("is reported separately from everyone else who is outstanding", () => {
    const t = tallyStep(
      step([
        { user_id: 1, status: "PENDING", account_active: true },
        { user_id: 2, status: "PENDING", account_active: false },
      ])
    );
    expect(t.outstanding).toHaveLength(2);
    expect(t.unreachable.map((r) => r.ap.user_id)).toEqual([2]);
  });

  it("still counts, so a level that can never complete reads as incomplete", () => {
    // Dropping them from the total would make an ALL level that is permanently
    // stuck look one approval from done, which hides the very problem.
    const t = tallyStep(
      step([
        { user_id: 1, status: "APPROVED", account_active: true },
        { user_id: 2, status: "PENDING", account_active: false },
      ])
    );
    expect(t.total).toBe(2);
    expect(t.approved).toBe(1);
    expect(t.approved + t.rejected + t.outstanding.length +
           t.notRequired.length + t.notReached.length).toBe(t.total);
  });

  it("is not confused with a tombstone", () => {
    // Different problems with different fixes: a REMOVED row was taken off the
    // step deliberately; a deactivated account is still on it and shouldn't be.
    const t = tallyStep(
      step([
        { user_id: 1, status: "REMOVED", account_active: true },
        { user_id: 2, status: "PENDING", account_active: false },
      ])
    );
    expect(t.removed.map((r) => r.ap.user_id)).toEqual([1]);
    expect(t.unreachable.map((r) => r.ap.user_id)).toEqual([2]);
    expect(t.total).toBe(1);
  });

  it("does not claim we are waiting on a level that has already closed", () => {
    // On a cleared ANY level nobody is outstanding at all, so nobody is
    // unreachable either — the level is finished, not blocked.
    const t = tallyStep(
      step([{ user_id: 2, status: "PENDING", account_active: false }],
           { status: "APPROVED", decision_rule: "ANY" })
    );
    expect(t.outstanding).toHaveLength(0);
    expect(t.unreachable).toHaveLength(0);
  });

  it("treats an approver from an older payload as reachable", () => {
    // account_active is new. A payload without it must behave exactly as it
    // did before, rather than marking every approver unreachable.
    const t = tallyStep(step([{ user_id: 1, status: "PENDING" }]));
    expect(t.outstanding).toHaveLength(1);
    expect(t.unreachable).toHaveLength(0);
  });
});

// The half that was computed but never drawn.
//
// `tallyStep().unreachable` has existed since UM-11 with a doc comment stating
// the rule — "a surface that NAMES who it is waiting on should exclude these
// and say why; a surface that COUNTS should not" — and no renderer consumed
// it. The RFQ and PO timelines said "Cannot act"; the quote-comparison
// Approval Trail and the RFQ Purchase Order stage went on naming the same
// people as people we are waiting on. One approval, two answers.
describe("naming who a step is actually waiting on", () => {
  it("leaves out somebody who cannot sign in, and says how many", () => {
    const t = tallyStep(
      step([
        { user_id: 1, name: "Priya Sharma", status: "PENDING" },
        { user_id: 2, name: "Left The Company", status: "PENDING", account_active: false },
      ])
    );
    const { names, unreachableCount } = outstandingForNaming(t);

    expect(names).toEqual(["Priya Sharma"]);
    expect(unreachableCount).toBe(1);
  });

  it("reads names off either field the two payloads use", () => {
    // The PO stage's approvers carry `user_name`; the trail's carry `name`.
    const t = tallyStep(
      step([
        { user_id: 1, user_name: "Ravi Nair", status: "PENDING" },
        { user_id: 2, name: "Asha Menon", status: "PENDING" },
      ])
    );
    expect(outstandingForNaming(t).names).toEqual(["Ravi Nair", "Asha Menon"]);
  });

  it("names nobody when every outstanding approver is unreachable", () => {
    // The honest answer is "nobody can act", not a name that cannot act.
    const t = tallyStep(
      step([{ user_id: 2, name: "Left The Company", status: "PENDING", account_active: false }])
    );
    const { names, unreachableCount } = outstandingForNaming(t);

    expect(names).toEqual([]);
    expect(unreachableCount).toBe(1);
  });

  it("is unchanged when everyone can act", () => {
    const t = tallyStep(
      step([
        { user_id: 1, name: "Priya Sharma", status: "PENDING" },
        { user_id: 2, name: "Ravi Nair", status: "PENDING" },
      ])
    );
    const { names, unreachableCount } = outstandingForNaming(t);

    expect(names).toEqual(["Priya Sharma", "Ravi Nair"]);
    expect(unreachableCount).toBe(0);
  });

  it("treats an approver with no account_active field as reachable", () => {
    // Older payloads omit it; the previous behaviour was to trust the row.
    const t = tallyStep(step([{ user_id: 1, name: "Priya Sharma", status: "PENDING" }]));
    expect(outstandingForNaming(t).names).toEqual(["Priya Sharma"]);
  });

  it("says nothing about a level that is finished", () => {
    const t = tallyStep(
      step([{ user_id: 1, name: "Priya Sharma", status: "APPROVED" }], { status: "APPROVED" })
    );
    const { names, unreachableCount } = outstandingForNaming(t);

    expect(names).toEqual([]);
    expect(unreachableCount).toBe(0);
  });
});
