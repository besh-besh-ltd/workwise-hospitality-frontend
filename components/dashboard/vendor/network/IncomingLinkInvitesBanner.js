import React, { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Network } from "lucide-react";
import { acceptLinkInvite, declineLinkInvite, listIncomingLinkInvites } from "@/services/vendorNetwork";
import { networkErrorMessage } from "./networkErrors";
import { refreshNetworkProfile } from "./networkProfile";
import { RELATIONSHIP_LABEL, fmtDate } from "./networkFormat";

// The shared reason messages are written for an admin sending an invite; here
// the reader is the vendor answering one.
const ACCEPT_ERROR_OVERRIDES = {
  ALREADY_IN_NETWORK: "You already belong to a network.",
  IS_PRINCIPAL: "A network HQ cannot join another network.",
};

/**
 * Pending network invitations addressed to this vendor account (spec §5).
 * Only a vendor in no network is asked: one already in a network could not
 * accept. Accepting joins the network, so the persisted profile is refetched
 * (it now carries `network`); `onAccepted` runs after that refetch.
 *
 * Shared by the dashboard banner and the /dashboard/vendor/network/invites page.
 */
export function useIncomingLinkInvites({ onAccepted } = {}) {
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.userProfile);
  const eligible = !!profile && profile.network === null && Number(profile.user_type) === 3;
  // Loaded, and (for a vendor) carrying the `network` key: a profile persisted
  // before vendor networks lacks it until the layout's one-time refetch lands.
  const profileReady = !!profile && !(Number(profile.user_type) === 3 && profile.network === undefined);
  const [invites, setInvites] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!eligible) return undefined;
    let cancelled = false;
    listIncomingLinkInvites()
      .then((res) => !cancelled && setInvites(res?.data || []))
      .catch(() => !cancelled && setInvites([]))
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [eligible]);

  const drop = (id) => setInvites((list) => list.filter((i) => i.id !== id));

  const accept = useCallback(async (invite) => {
    setBusyId(invite.id);
    try {
      const res = await acceptLinkInvite(invite.id);
      toast.success(res?.message || "You have joined the network");
      if (res?.data?.seat?.payable) {
        toast.info("Your network admin has to pay for your seat before you can work in the network.");
      }
      drop(invite.id);
      try {
        await refreshNetworkProfile(dispatch);
      } catch (_) {
        toast.info("Sign out and back in to see your network.");
      }
      onAccepted?.(invite);
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not accept the invitation.", ACCEPT_ERROR_OVERRIDES));
      if (err?.response?.status === 410) drop(invite.id);
    } finally {
      setBusyId(null);
    }
  }, [dispatch, onAccepted]);

  const decline = useCallback(async (invite) => {
    setBusyId(invite.id);
    try {
      const res = await declineLinkInvite(invite.id);
      toast.success(res?.message || "Invitation declined");
      drop(invite.id);
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not decline the invitation.", ACCEPT_ERROR_OVERRIDES));
      if (err?.response?.status === 410) drop(invite.id);
    } finally {
      setBusyId(null);
    }
  }, []);

  return {
    eligible,
    loaded: profileReady && (eligible ? loaded : true),
    invites: eligible ? invites : [],
    busyId,
    accept,
    decline,
  };
}

/** One card per invitation, with Accept / Decline. */
export function IncomingInviteCards({ invites, busyId, onAccept, onDecline }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {invites.map((invite) => {
        const relationship = (RELATIONSHIP_LABEL[invite.relationship] || invite.relationship || "").toLowerCase();
        const busy = busyId === invite.id;
        return (
          <div
            key={invite.id}
            role="region"
            aria-label="Network invitation"
            style={{
              background: "var(--info-soft)",
              border: "1px solid rgba(37,99,235,0.28)",
              borderRadius: "var(--radius-lg)",
              padding: "13px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Network size={18} style={{ color: "var(--info)", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13.5, color: "var(--fg)" }}>
                  <strong>{invite.org_name}</strong> invited you to join its vendor network as a {relationship}.
                </div>
                <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>
                  Its admins will be able to route enquiries to you and see your orders. Expires {fmtDate(invite.expires_at)}.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onDecline(invite)}>
                Decline
              </button>
              <button type="button" className="btn btn-blue btn-sm" disabled={busy} onClick={() => onAccept(invite)}>
                Accept
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The dashboard-home banner: renders nothing unless an invitation is pending. */
export default function IncomingLinkInvitesBanner() {
  const { invites, busyId, accept, decline } = useIncomingLinkInvites();
  if (invites.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <IncomingInviteCards invites={invites} busyId={busyId} onAccept={accept} onDecline={decline} />
    </div>
  );
}
