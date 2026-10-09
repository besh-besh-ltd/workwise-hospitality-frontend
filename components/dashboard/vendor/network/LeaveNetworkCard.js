import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { LogOut } from "lucide-react";
import { leaveNetwork } from "@/services/vendorNetwork";
import { clearUserProfile } from "@/redux/slice";
import { persistor } from "@/redux/store";
import storageInstance from "@/utils/storageInstance";
import { setStoredHospitalityContext } from "@/utils/hospitalityContext";
import posthog from "@/lib/analytics";
import { isGuestSession } from "@/utils/guestSession";
import { hardNavigate } from "@/utils/hardNavigate";
import { markEntitySwitchDone } from "@/utils/sessionSync";
import { refreshNetworkProfile } from "./networkProfile";
import { networkErrorMessage } from "./networkErrors";
import NetworkModal from "./NetworkModal";

/**
 * True when the session may leave its network: a member entity (not the
 * principal) acting on its OWN login (the person is the entity itself), not an
 * emailed-link guest session. Mirrors POST /entities/self/leave's checks.
 */
export const canLeaveNetwork = (profile, guest) => {
  const network = profile?.network;
  if (!network || guest || network.is_principal) return false;
  return Number(network.actor_user_id) === Number(profile.id);
};

// Tell other tabs (they reload when they show a network profile). Never blocks this tab.
const signalOtherTabs = () => {
  try { markEntitySwitchDone(); } catch (_) {}
};

/**
 * End this browser's session (same keys as the shell's logout) so the stale
 * persisted profile, still carrying the old `network`, is never rehydrated.
 */
const endSession = async (dispatch) => {
  try { posthog.reset(); } catch (_) {}
  dispatch(clearUserProfile());
  ["token", "current-user-type", "current-user-name", "current-user-email", "user-permissions", "guest-session"].forEach(
    (key) => storageInstance.removeStorege(key)
  );
  setStoredHospitalityContext(null);
  try { await persistor.flush(); } catch (_) {}
};

/**
 * "Leave network" for a member entity's own login (spec §5). Confirms first,
 * then leaves and refetches the profile (now without `network`). On success it
 * signals other tabs and reloads the vendor dashboard so every network-scoped
 * page and cache starts over. If the refetch fails, a reload would rehydrate
 * the stale network profile, so the session is ended instead and the person
 * is asked to sign in again.
 */
export default function LeaveNetworkCard() {
  const dispatch = useDispatch();
  const profile = useSelector((state) => state.userProfile);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leftOrg, setLeftOrg] = useState(null); // set when left but the profile could not be refreshed

  if (leftOrg) {
    return (
      <div
        className="section-card"
        role="alert"
        style={{ marginTop: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
      >
        <div style={{ fontSize: 13, color: "var(--fg-2)" }}>
          You have left {leftOrg}, but your account could not be refreshed. Please sign in again to continue.
        </div>
        <button type="button" className="btn btn-blue btn-sm" onClick={() => hardNavigate("/?login=true")}>
          Sign in again
        </button>
      </div>
    );
  }
  if (!canLeaveNetwork(profile, isGuestSession())) return null;
  const org = profile.network.org_name || "the network";

  const leave = async () => {
    setBusy(true);
    try {
      const res = await leaveNetwork();
      toast.success(res?.message || "You have left the network");
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not leave the network."));
      setBusy(false);
      return;
    }
    try {
      await refreshNetworkProfile(dispatch);
    } catch (_) {
      await endSession(dispatch);
      signalOtherTabs();
      setConfirming(false);
      setLeftOrg(org);
      return;
    }
    signalOtherTabs();
    hardNavigate("/dashboard/vendor");
  };

  return (
    <div
      className="section-card"
      style={{ marginTop: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}
    >
      <div>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: "var(--fg)" }}>Network membership</div>
        <div style={{ fontSize: 12.5, color: "var(--fg-3)", marginTop: 2 }}>
          This account is part of {org}. You can leave it at any time.
        </div>
      </div>
      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setConfirming(true)} aria-label={`Leave network: ${org}`}>
        <LogOut size={14} /> Leave network
      </button>
      {confirming && (
        <NetworkModal
          title={`Leave ${org}?`}
          busy={busy}
          onClose={() => setConfirming(false)}
          footer={
            <>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirming(false)} disabled={busy}>
                Cancel
              </button>
              <button type="button" className="btn btn-danger" onClick={leave} disabled={busy}>
                {busy ? "Leaving…" : "Leave network"}
              </button>
            </>
          }
        >
          <p style={{ margin: 0, fontSize: 13.5, color: "var(--fg-2)", lineHeight: 1.55 }}>
            Its admins can no longer act as this account, route enquiries to it or see its orders, and its open
            assignments go back to the network. This account is no longer covered by the network&apos;s subscription,
            so it needs its own to keep quoting. To rejoin, the network has to invite you again.
          </p>
        </NetworkModal>
      )}
    </div>
  );
}
