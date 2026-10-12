// Vendor Networks §6.2: the reply to work routed to a member entity (PENDING
// assignments), on the page of the work itself, as on Assigned to me. One Accept and one
// Decline (the shared reason dialog) act on every assignment id given, in order.
//
// The caller words the offer (children) and decides what follows a reply: onReplied
// receives "ACCEPT" or "DECLINE" once a reply changed something (also when a later id
// failed after an earlier one was answered, or when the server says the assignment moved
// on: 404 / 409), and the page re-reads what it shows.

import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import { respondToAssignment } from "@/services/vendorNetwork";
import phone from "@/components/dashboard/rate-contracts/vendor/VendorArcPhone.module.css";
import DeclineAssignmentModal from "./DeclineAssignmentModal";
import { respondErrorMessage } from "./networkErrors";

/**
 * label            the banner's accessible name
 * title            its heading
 * assignmentIds    the PENDING assignments one reply answers
 * declineSubtitle  names the work in the decline dialog
 * onReplied        (decision) => void | Promise
 * children         the offer's wording
 */
export default function AssignmentReplyBanner({ label, title, assignmentIds = [], declineSubtitle, onReplied, children }) {
  const [busy, setBusy] = useState(false);
  const [declining, setDeclining] = useState(false);
  // One reply in flight; the ref refuses a second click before React re-renders.
  const inFlight = useRef(false);

  if (!assignmentIds.length) return null;

  const reply = async (payload) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    let changed = false;
    try {
      let res;
      for (const id of assignmentIds) {
        res = await respondToAssignment(id, payload);
        changed = true;
      }
      toast.success(res?.message || "Done");
      setDeclining(false);
      await onReplied?.(payload.decision);
    } catch (err) {
      toast.error(respondErrorMessage(err));
      // An assignment already answered, or the offer moved on (withdrawn, expired): re-read.
      const http = err?.response?.status;
      if (changed || http === 404 || http === 409) {
        setDeclining(false);
        await onReplied?.(payload.decision);
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <section className={`action-center ${phone.actionCenter}`} aria-label={label}>
        <div className="ac-icon">
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M9 15l2 2 4-4" />
          </svg>
        </div>
        <div className="ac-body">
          <div className="ac-title">{title}</div>
          {children}
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
          title={declineSubtitle}
          busy={busy}
          onClose={() => setDeclining(false)}
          onSubmit={({ reason, note }) => reply({ decision: "DECLINE", reason, note })}
        />
      )}
    </>
  );
}
