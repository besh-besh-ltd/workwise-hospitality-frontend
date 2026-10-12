// Vendor Networks §6.4: a group rate contract offered to a member entity. While its
// ARC_HOTEL assignments are PENDING the member reads the contract (rates, quantities,
// terms) and replies here, as it would on Assigned to me.
//
// Accept and Decline act on every hotel of this contract still offered to the member,
// together: the head office offered this contract to it, and the member answers that
// offer once. Each hotel stays its own row on Assigned to me for a per-hotel reply.

import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { respondToAssignment } from "@/services/vendorNetwork";
import phone from "@/components/dashboard/rate-contracts/vendor/VendorArcPhone.module.css";
import DeclineAssignmentModal from "./DeclineAssignmentModal";
import { respondErrorMessage } from "./networkErrors";
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
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  // One reply in flight; the ref refuses a second click before React re-renders.
  const inFlight = useRef(false);

  const pending = hotels.filter((h) => h.assignment_status === "PENDING" && h.assignment_id);
  if (!pending.length) return null;
  const pendingNames = joinNames(pending.map(hotelName));
  const due = pending
    .map((h) => h.due_at)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b))[0];

  const reply = async (payload) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    let changed = false;
    try {
      let res;
      for (const h of pending) {
        res = await respondToAssignment(h.assignment_id, payload);
        changed = true;
      }
      toast.success(res?.message || "Done");
      setDeclining(false);
      await onReplied?.();
    } catch (err) {
      toast.error(respondErrorMessage(err));
      // A hotel already answered, or the offer moved on (withdrawn, expired): re-read.
      const http = err?.response?.status;
      if (changed || http === 404 || http === 409) {
        setDeclining(false);
        await onReplied?.();
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <section className={`action-center ${phone.actionCenter}`} aria-label="Contract offer">
        <div className="ac-icon">
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M9 15l2 2 4-4" />
          </svg>
        </div>
        <div className="ac-body">
          <div className="ac-title">Review this contract, then accept or decline</div>
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
        </div>
        <div className="ac-actions">
          <button type="button" className="btn btn-outline-danger" disabled={busy} onClick={() => setDeclining(true)}>
            Decline
          </button>
          <button type="button" className="btn btn-success" disabled={busy} onClick={() => reply({ decision: "ACCEPT" })}>
            {busy && !declining ? "Accepting…" : "Accept"}
          </button>
        </div>
      </section>
      {declining && (
        <DeclineAssignmentModal
          title={[contractLabel, pendingNames].filter(Boolean).join(" · ")}
          busy={busy}
          onClose={() => setDeclining(false)}
          onSubmit={({ reason, note }) => reply({ decision: "DECLINE", reason, note })}
        />
      )}
    </>
  );
}
