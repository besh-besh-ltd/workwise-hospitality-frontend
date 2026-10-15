import React from "react";
import Link from "next/link";
import { Network } from "lucide-react";
import { canSetUpNetwork } from "@/components/layout/Header/headerConfig";
import { isGuestSession } from "@/utils/guestSession";

/**
 * Shown on a network page to someone who may not use it:
 *   - a vendor who could set up a network (same rule as the nav) is pointed at set-up
 *   - a vendor in a guest emailed-link session is told set-up needs its own sign-in
 *   - anyone else (a buyer, an admin) is told, neutrally, that networks are for suppliers
 *   - a person in a network who is not an admin is told who manages it
 */
const VENDOR_USER_TYPES = new Set([3, 11]);

export default function NetworkAccessNotice({ profile }) {
  const inNetwork = !!profile?.network;
  const isVendorAccount = VENDOR_USER_TYPES.has(Number(profile?.user_type));
  const canSetUp = canSetUpNetwork(profile, isGuestSession());

  let content;
  if (inNetwork) {
    content = (
      <>
        <h2>Network admins only</h2>
        <p>Only network admins can manage this page. Ask your network admin if you need a change.</p>
      </>
    );
  } else if (canSetUp) {
    content = (
      <>
        <h2>You are not in a vendor network</h2>
        <p>Set up a network to manage your branches, distributors and team in one place.</p>
        <Link href="/dashboard/vendor/network" className="btn btn-blue" style={{ marginTop: 16 }}>
          Set up network
        </Link>
      </>
    );
  } else if (!isVendorAccount) {
    content = (
      <>
        <h2>Vendor networks are for supplier accounts</h2>
        <p>This page is not available for this account.</p>
      </>
    );
  } else {
    content = (
      <>
        <h2>Vendor networks need your own sign-in</h2>
        <p>Sign in to your vendor account with your email and password to set up or manage a network.</p>
      </>
    );
  }

  return (
    <main className="main-body">
      <div className="section-card">
        <div className="empty-state">
          <div className="ic">
            <Network />
          </div>
          {content}
        </div>
      </div>
    </main>
  );
}
