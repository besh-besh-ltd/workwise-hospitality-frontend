// Rate contracts in an emailed-link guest session (Task 26).
//
// The 30-minute guest session minted from an RFQ email link covers that RFQ only; the
// backend refuses every vendor rate-contract endpoint to it (403 GUEST_SESSION). The
// dashboard layout mounts this gate around every page: once a rate-contract request was
// refused (utils/arcGuestRefusal), a rate-contract page is replaced by a notice saying
// why, instead of "Contract not found" or an empty list. Sign in ends the guest session
// and opens the sign-in modal with the vendor's email prefilled (the pendingSignIn
// hand-off the network invite page uses).

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useDispatch } from "react-redux";
import { FileText } from "lucide-react";
import posthog from "@/lib/analytics";
import { persistor } from "@/redux/store";
import { clearUserProfile } from "@/redux/slice";
import storageInstance from "@/utils/storageInstance";
import { setStoredHospitalityContext } from "@/utils/hospitalityContext";
import { setPendingSignIn } from "@/utils/pendingSignIn";
import { useArcGuestRefusal, clearArcGuestRefusal } from "@/utils/arcGuestRefusal";

export const GUEST_NOTICE_TEXT =
  "Rate contracts need a full sign-in. You opened Workwise from an RFQ email link, which only covers that RFQ. Sign in with your email and password to continue.";

const RATE_CONTRACT_PAGES = "/dashboard/vendor/rate-contracts";
// The keys of the DashboardShell logout (as the network invite page clears them).
const SESSION_KEYS = ["token", "current-user-type", "current-user-name", "current-user-email", "user-permissions", "guest-session"];

/** The notice shown in place of a rate-contract page to a guest session. */
export function RateContractGuestNotice() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);

  // End the guest session first: "/?login=true" offers the sign-in form only when no
  // session is stored.
  const signIn = async () => {
    if (busy) return;
    setBusy(true);
    setPendingSignIn({
      email: storageInstance.getStorage("current-user-email") || "",
      message: "Sign in with your email and password to open your rate contracts.",
    });
    try { posthog.reset(); } catch (_) {}
    dispatch(clearUserProfile());
    SESSION_KEYS.forEach((key) => storageInstance.removeStorege(key));
    setStoredHospitalityContext(null);
    try { await persistor.flush(); } catch (_) {}
    window.dispatchEvent(new Event("loginStatusChanged"));
    clearArcGuestRefusal();
    router.replace("/?login=true");
  };

  return (
    <main className="main-body">
      <section className="section-card" aria-label="Sign in to open rate contracts">
        <div className="empty-state">
          <div className="ic">
            <FileText />
          </div>
          <h2>Sign in to open rate contracts</h2>
          <p>{GUEST_NOTICE_TEXT}</p>
          <button type="button" className="btn btn-blue" style={{ marginTop: 16 }} onClick={signIn} disabled={busy}>
            Sign in
          </button>
        </div>
      </section>
    </main>
  );
}

/** Wraps every dashboard page; only a rate-contract page after a guest refusal is replaced. */
export default function RateContractGuestGate({ children }) {
  const { pathname } = useRouter();
  const refused = useArcGuestRefusal();

  // A refusal belongs to the page that got it: moving to another page clears it, and the
  // next page's own requests decide again.
  const shownFor = useRef(pathname);
  useEffect(() => {
    if (shownFor.current === pathname) return;
    shownFor.current = pathname;
    clearArcGuestRefusal();
  }, [pathname]);

  if (refused && String(pathname || "").startsWith(RATE_CONTRACT_PAGES)) return <RateContractGuestNotice />;
  return children;
}
