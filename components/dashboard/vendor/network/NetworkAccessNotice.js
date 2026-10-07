import React from "react";
import Link from "next/link";
import { Network } from "lucide-react";

/**
 * Shown on an admin-only network page to someone who is not a network admin:
 * a vendor in no network is pointed at set-up, a member is told who manages it.
 */
export default function NetworkAccessNotice({ profile }) {
  const noNetwork = profile && profile.network === null;
  return (
    <main className="main-body">
      <div className="section-card">
        <div className="empty-state">
          <div className="ic">
            <Network />
          </div>
          {noNetwork ? (
            <>
              <h2>You are not in a vendor network</h2>
              <p>Set up a network to manage your branches, distributors and team in one place.</p>
              <Link href="/dashboard/vendor/network" className="btn btn-blue" style={{ marginTop: 16 }}>
                Set up network
              </Link>
            </>
          ) : (
            <>
              <h2>Network admins only</h2>
              <p>Only network admins can manage this page. Ask your network admin if you need a change.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
