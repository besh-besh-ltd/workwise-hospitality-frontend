// Vendor network — incoming invitations. The backend's NETWORK_LINK_INVITE
// notification links here. Same list and accept/decline logic as the
// dashboard banner; after an accept (and the profile refetch) the vendor is in
// a network, so it is sent to the network overview.

import { useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Network } from "lucide-react";
import {
  IncomingInviteCards,
  useIncomingLinkInvites,
} from "@/components/dashboard/vendor/network/IncomingLinkInvitesBanner";

export default function NetworkInvitesPage() {
  const router = useRouter();
  const onAccepted = useCallback(() => router.push("/dashboard/vendor/network"), [router]);
  const { eligible, loaded, invites, busyId, accept, decline } = useIncomingLinkInvites({ onAccepted });

  return (
    <>
      <Head>
        <title>Workwise | Network invitations</title>
      </Head>
      <main className="main-body">
        <div>
          <h1 className="page-h1">Network invitations</h1>
          <p className="page-sub">Vendor networks that have invited your account to join them.</p>
        </div>
        {!loaded ? (
          <div className="section-card">
            <div className="section-body" style={{ color: "var(--fg-3)", fontSize: 13 }}>Loading invitations…</div>
          </div>
        ) : invites.length > 0 ? (
          <IncomingInviteCards invites={invites} busyId={busyId} onAccept={accept} onDecline={decline} />
        ) : (
          <div className="section-card">
            <div className="empty-state">
              <div className="ic">
                <Network />
              </div>
              <h2>No pending invitations</h2>
              <p>
                {eligible
                  ? "When a vendor network invites your account, it shows up here."
                  : "Your account is already part of a network, or this account can't join one."}
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
