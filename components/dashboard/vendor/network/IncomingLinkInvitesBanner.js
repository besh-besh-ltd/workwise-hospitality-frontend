import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Network } from "lucide-react";
import { acceptLinkInvite, declineLinkInvite, listIncomingLinkInvites } from "@/services/vendorNetwork";
import { networkErrorMessage } from "./networkErrors";
import { refreshNetworkProfile } from "./networkProfile";
import { RELATIONSHIP_LABEL, fmtDate } from "./networkFormat";

/**
 * Pending network invitations addressed to this vendor account (spec §5), on
 * the vendor dashboard home. Only a vendor in no network is asked: one that is
 * already in a network could not accept. Accepting joins the network, so the
 * persisted profile is refetched (it now carries `network`) and the banner
 * goes away with it.
 */
export default function IncomingLinkInvitesBanner() {
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.userProfile);
  const eligible = !!profile && profile.network === null && Number(profile.user_type) === 3;
  const [invites, setInvites] = useState([]);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!eligible) return undefined;
    let cancelled = false;
    listIncomingLinkInvites()
      .then((res) => !cancelled && setInvites(res?.data || []))
      .catch(() => !cancelled && setInvites([]));
    return () => {
      cancelled = true;
    };
  }, [eligible]);

  const drop = (id) => setInvites((list) => list.filter((i) => i.id !== id));

  const accept = async (invite) => {
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
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not accept the invitation."));
      if (err?.response?.status === 410) drop(invite.id);
    } finally {
      setBusyId(null);
    }
  };

  const decline = async (invite) => {
    setBusyId(invite.id);
    try {
      const res = await declineLinkInvite(invite.id);
      toast.success(res?.message || "Invitation declined");
      drop(invite.id);
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not decline the invitation."));
      if (err?.response?.status === 410) drop(invite.id);
    } finally {
      setBusyId(null);
    }
  };

  if (!eligible || invites.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
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
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => decline(invite)}>
                Decline
              </button>
              <button type="button" className="btn btn-blue btn-sm" disabled={busy} onClick={() => accept(invite)}>
                Accept
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
