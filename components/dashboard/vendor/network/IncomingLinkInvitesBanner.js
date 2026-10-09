import React, { useCallback, useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { Network } from "lucide-react";
import { acceptLinkInvite, declineLinkInvite, listIncomingLinkInvites } from "@/services/vendorNetwork";
import { networkErrorMessage } from "./networkErrors";
import { refreshNetworkProfile, useNetworkProfile } from "./networkProfile";
import { canSetUpNetwork } from "@/components/layout/Header/headerConfig";
import { isGuestSession } from "@/utils/guestSession";
import { RELATIONSHIP_LABEL, fmtDate } from "./networkFormat";
import NetworkModal from "./NetworkModal";

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
  const { profile, pending } = useNetworkProfile();
  // Same rule as "Set up network": a loaded vendor in no network, on its own
  // sign-in (a guest emailed-link session cannot accept).
  const eligible = canSetUpNetwork(profile, isGuestSession());
  // Loaded, and not waiting on the layout's one-time legacy-profile refetch.
  const profileReady = !!profile && !pending;
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

/**
 * Joining hands the inviting org's admins full control of this account, so
 * Accept never acts in one click: it opens this dialog, which says so plainly
 * and names who is asking (security audit M2). The company name and GSTIN are
 * shown when the invitation carries them; otherwise only the network name.
 */
export function AcceptLinkInviteDialog({ invite, busy, onConfirm, onCancel }) {
  const company = invite.principal_company_name || invite.org_name;
  const gstin = invite.principal_gstin;
  return (
    <NetworkModal
      title={`Join ${invite.org_name}?`}
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-blue" onClick={onConfirm} disabled={busy}>
            Accept and join
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
        <div
          style={{
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "10px 12px",
          }}
        >
          <div style={{ color: "var(--fg)" }}>
            Invited by <strong>{company}</strong>
          </div>
          {gstin && <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 2 }}>GSTIN {gstin}</div>}
        </div>
        <p style={{ margin: 0 }}>
          <strong style={{ color: "var(--fg)" }}>
            Every admin of {invite.org_name} will be able to act fully as this account.
          </strong>{" "}
          They can send quotes, accept or reject purchase orders, sign rate contracts and edit your
          profile in your name, and see this account&apos;s full history.
        </p>
        <p style={{ margin: 0 }}>Only accept if you know this company and trust its admins.</p>
      </div>
    </NetworkModal>
  );
}

/** One card per invitation, with Accept (behind a confirmation) / Decline. */
export function IncomingInviteCards({ invites, busyId, onAccept, onDecline }) {
  const [confirming, setConfirming] = useState(null);
  const confirmAccept = async () => {
    const invite = confirming;
    try {
      await onAccept(invite);
    } finally {
      setConfirming(null);
    }
  };
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
                  If you join, its admins can act fully as this account. Expires {fmtDate(invite.expires_at)}.
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => onDecline(invite)}>
                Decline
              </button>
              <button type="button" className="btn btn-blue btn-sm" disabled={busy} onClick={() => setConfirming(invite)}>
                Accept
              </button>
            </div>
          </div>
        );
      })}
      {confirming && (
        <AcceptLinkInviteDialog
          invite={confirming}
          busy={busyId === confirming.id}
          onConfirm={confirmAccept}
          onCancel={() => setConfirming(null)}
        />
      )}
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
