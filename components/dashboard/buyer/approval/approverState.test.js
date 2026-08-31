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

import { tallyStep, effectiveApproverStatus } from "./approverState";

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
