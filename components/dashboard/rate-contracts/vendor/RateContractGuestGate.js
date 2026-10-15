// Rate contracts in an emailed-link guest session (Task 26).
//
// The 30-minute guest session minted from an RFQ email link covers that RFQ only; the
// backend refuses every vendor rate-contract endpoint to it (403 GUEST_SESSION). The
// dashboard layout mounts this gate around every page: once a rate-contract request was
// refused (utils/arcGuestRefusal), a rate-contract page is replaced by a notice saying
// why, instead of "Contract not found" or an empty list, with a Sign in button
// (components/shared/GuestSignInNotice).

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import GuestSignInNotice from "@/components/shared/GuestSignInNotice";
import { useArcGuestRefusal, clearArcGuestRefusal } from "@/utils/arcGuestRefusal";

export const GUEST_NOTICE_TEXT =
  "Rate contracts need a full sign-in. You opened Workwise from an RFQ email link, which only covers that RFQ. Sign in with your email and password to continue.";

const RATE_CONTRACT_PAGES = "/dashboard/vendor/rate-contracts";

/** The notice shown in place of a rate-contract page to a guest session. */
export function RateContractGuestNotice() {
  return (
    <GuestSignInNotice
      label="Sign in to open rate contracts"
      text={GUEST_NOTICE_TEXT}
      prefillMessage="Sign in with your email and password to open your rate contracts."
    />
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
