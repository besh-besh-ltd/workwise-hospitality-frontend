// Vendor Networks §6.4: a group rate contract offered to a member entity. While its
// ARC_HOTEL assignments are PENDING the member reads the contract (rates, quantities,
// terms) and replies here, as it would on Assigned to me.
//
// Accept and Decline act on every hotel of this contract still offered to the member,
// together: the head office offered this contract to it, and the member answers that
// offer once. Each hotel stays its own row on Assigned to me for a per-hotel reply.

import React from "react";
import AssignmentReplyBanner from "./AssignmentReplyBanner";
import { StatusPill } from "./networkFormat";
import { fmtDateTime } from "./routingFormat";

const OFFER_STATUS = {
  PENDING: { label: "Waiting for your reply", tone: "warn" },
  ACCEPTED: { label: "Accepted", tone: "success" },
};

/** "A", "A and B", "A, B and C". */
export function joinNames(names) {
  if (names.length <= 1) return names[0] || "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

const hotelName = (h) => h.name || `Hotel ${h.hotel_id}`;

/**
 * hotels         the member view's hotels: [{ hotel_id, name, assignment_status, assignment_id, due_at }]
 * principalName  the contract holder (the network's principal)
 * contractLabel  names the contract in the decline dialog, e.g. "Rate contract ARC-12 · Linen"
 * onReplied      called once a reply changed something; the page re-reads the contract
 */
export default function ContractOfferBanner({ hotels = [], principalName, contractLabel, onReplied }) {
  const pending = hotels.filter((h) => h.assignment_status === "PENDING" && h.assignment_id);
  if (!pending.length) return null;
  const pendingNames = joinNames(pending.map(hotelName));
  const due = pending
    .map((h) => h.due_at)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))[0];

  return (
    <AssignmentReplyBanner
      label="Contract offer"
      title="Review this contract, then accept or decline"
      assignmentIds={pending.map((h) => h.assignment_id)}
      declineSubtitle={[contractLabel, pendingNames].filter(Boolean).join(" · ")}
      onReplied={onReplied}
    >
      <div className="ac-sub">
        <strong>{principalName || "Your head office"}</strong> has asked you to supply <strong>{pendingNames}</strong> under
        this contract. Review the rates, quantities and terms below, then accept or decline
        {due ? <> by <strong>{fmtDateTime(due)}</strong></> : null}.
      </div>
      {hotels.length > 1 && (
        <ul aria-label="Your hotels on this contract" style={{ listStyle: "none", margin: "8px 0 0", padding: 0, display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
          {hotels.map((h) => (
            <li key={h.hotel_id} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--fg-2)" }}>
              {hotelName(h)}
              <StatusPill map={OFFER_STATUS} status={h.assignment_status} />
            </li>
          ))}
        </ul>
      )}
      {pending.length > 1 && (
        <div className="ac-sub" style={{ marginTop: 6 }}>Accept and Decline apply to all {pending.length} hotels waiting for your reply.</div>
      )}
    </AssignmentReplyBanner>
  );
}
