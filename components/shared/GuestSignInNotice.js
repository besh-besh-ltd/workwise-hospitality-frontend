// What a page shows an emailed-link guest session the backend refused (403 GUEST_SESSION):
// the 30-minute session minted from an RFQ email link covers that RFQ only. Says why, and
// Sign in ends the guest session and opens the sign-in modal with the vendor's email
// prefilled (the pendingSignIn hand-off).
//
// Sign in leaves with a full page load, as Leave network does: no loginStatusChanged and
// no state change that would re-render the page underneath, which would fire its request
// without a token, get 401 and mount the session-expired modal over the sign-in modal.
//
// Used by RateContractGuestGate (rate-contract pages) and Assigned to me (Task 26).

import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { FileText } from "lucide-react";
import storageInstance from "@/utils/storageInstance";
import { endSession } from "@/utils/endSession";
import { hardNavigate } from "@/utils/hardNavigate";
import { setPendingSignIn } from "@/utils/pendingSignIn";

/**
 * label           the heading, and the notice's accessible name
 * text            why a full sign-in is needed
 * prefillMessage  what the sign-in modal tells the vendor
 */
export default function GuestSignInNotice({ label, text, prefillMessage }) {
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);

  // End the session first ("/?login=true" offers the sign-in form only when none is
  // stored), leave the prefill, then the full page load.
  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    const email = storageInstance.getStorage("current-user-email") || "";
    await endSession(dispatch);
    setPendingSignIn({ email, message: prefillMessage });
    hardNavigate("/?login=true");
  };

  return (
    <main className="main-body">
      <section className="section-card" aria-label={label}>
        <div className="empty-state">
          <div className="ic">
            <FileText />
          </div>
          <h2>{label}</h2>
          <p>{text}</p>
          <button type="button" className="btn btn-blue" style={{ marginTop: 16 }} onClick={signIn} disabled={busy}>
            Sign in
          </button>
        </div>
      </section>
    </main>
  );
}
