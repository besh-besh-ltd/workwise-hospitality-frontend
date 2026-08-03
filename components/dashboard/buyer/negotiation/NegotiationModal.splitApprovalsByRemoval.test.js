// Unit test for the pure count-derivation this track hardens: the "N of M
// approvers have approved this round" line (and the approver chip list it
// backs) would count a REMOVED row — a mid-flight reconciler's soft-tombstone
// for an approver whose role/scope was revoked while the approval was in
// flight — in both the numerator and the "of M" denominator. A removed
// person would render as a live pending approver and inflate the total.
// This is a latent defect here, not one observed in production: these chips
// come from entity_type = 'NEGOTIATION' instances, and production's REMOVED
// rows exist only on PO (9) and NEGOTIATION_QUOTE (3) so far.
//
// `splitApprovalsByRemoval` is extracted out of NegotiationModal's render
// body specifically so this has a direct unit test without standing up a
// full component render harness (the component pulls in react-bootstrap,
// chart.js, redux and several services — no existing test file renders it).
import { splitApprovalsByRemoval } from "./NegotiationModal";

describe("splitApprovalsByRemoval", () => {
  it("excludes a REMOVED row from both the numerator and the denominator", () => {
    const approvals = [
      { approver_user_id: 1, approver_name: "Removed Person", status: "REMOVED" },
      { approver_user_id: 2, approver_name: "Approver A", status: "APPROVED" },
      { approver_user_id: 3, approver_name: "Approver B", status: "PENDING" },
    ];
    const { activeApprovals, removedApprovals, approvedCount } = splitApprovalsByRemoval(approvals);

    // Denominator: "of M" must be 2 (live approvers), not 3.
    expect(activeApprovals).toHaveLength(2);
    expect(activeApprovals.map((a) => a.approver_user_id)).toEqual([2, 3]);
    // Numerator: 1 of the 2 live approvers has approved — the removed row's
    // status is never 'APPROVED' here, but this locks in that the count is
    // computed off the active set, not the raw list.
    expect(approvedCount).toBe(1);
    // The removed row is kept, separately, for the muted audit-trail chip.
    expect(removedApprovals).toHaveLength(1);
    expect(removedApprovals[0].approver_name).toBe("Removed Person");
  });

  it("does not count a REMOVED approver even if their stale status were APPROVED", () => {
    // Defensive: whatever status a REMOVED row carried before removal, once
    // status is REMOVED it must never contribute to approvedCount.
    const approvals = [
      { approver_user_id: 1, status: "REMOVED" },
      { approver_user_id: 2, status: "APPROVED" },
    ];
    expect(splitApprovalsByRemoval(approvals).approvedCount).toBe(1);
  });

  it("handles an all-removed round without throwing and reports zero live approvers", () => {
    const approvals = [{ approver_user_id: 1, status: "REMOVED" }];
    const { activeApprovals, removedApprovals, approvedCount } = splitApprovalsByRemoval(approvals);
    expect(activeApprovals).toHaveLength(0);
    expect(removedApprovals).toHaveLength(1);
    expect(approvedCount).toBe(0);
  });

  it("degrades safely for missing/empty input", () => {
    expect(splitApprovalsByRemoval(undefined)).toEqual({
      activeApprovals: [],
      removedApprovals: [],
      approvedCount: 0,
    });
    expect(splitApprovalsByRemoval([])).toEqual({
      activeApprovals: [],
      removedApprovals: [],
      approvedCount: 0,
    });
  });
});
