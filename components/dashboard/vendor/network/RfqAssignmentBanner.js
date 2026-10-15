// Vendor Networks §6.3: an RFQ routed to a member entity and waiting for its reply
// (the RFQ detail's network_assignment is PENDING). The member reads the RFQ; it quotes,
// regrets or raises a clarification only once it accepts (the server refuses those with
// ROUTING_REQUIRED until then). Shown on the inquiry page and on the quote page.

import React from "react";
import AssignmentReplyBanner from "./AssignmentReplyBanner";
import { fmtDateTime } from "./routingFormat";

/** Why quoting, regretting and raising a clarification wait. */
export const ROUTING_PENDING_REASON = "Accept this RFQ to quote, regret or raise a clarification";

/** The RFQ detail payload's assignment says the acting member has not replied yet. */
export const isRoutingPending = (rfq) => rfq?.network_assignment?.status === "PENDING";

/**
 * assignment  the RFQ detail's network_assignment: { id, status, due_at, principal_name }
 * rfqLabel    names the RFQ in the decline dialog, e.g. "RFQ #536700"
 * onReplied   (decision) => void: after ACCEPT the page re-reads the RFQ; after DECLINE the
 *             member no longer holds it
 */
export default function RfqAssignmentBanner({ assignment, rfqLabel, onReplied }) {
  if (assignment?.status !== "PENDING" || !assignment.id) return null;
  return (
    <AssignmentReplyBanner
      label="RFQ assignment"
      title="This RFQ is waiting for your reply"
      assignmentIds={[assignment.id]}
      declineSubtitle={rfqLabel}
      onReplied={onReplied}
    >
      <div className="ac-sub">
        <strong>{assignment.principal_name || "Your head office"}</strong> has routed this RFQ to you. Accept it to
        quote, or decline so it can go to someone else.
        {assignment.due_at ? <> Reply by <strong>{fmtDateTime(assignment.due_at)}</strong>.</> : null}
      </div>
    </AssignmentReplyBanner>
  );
}
