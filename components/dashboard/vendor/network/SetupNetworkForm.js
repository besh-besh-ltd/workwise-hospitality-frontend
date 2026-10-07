import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { Network } from "lucide-react";
import { createOrg } from "@/services/vendorNetwork";
import { networkErrorMessage } from "./networkErrors";
import { refreshNetworkProfile } from "./networkProfile";

const NAME_MAX = 120;

/**
 * "Set up network" for a vendor in no network (spec §5). POST /org makes this
 * vendor the principal and its own login the network admin; the session token
 * is unchanged, but the persisted profile is refetched so `network` appears.
 */
export default function SetupNetworkForm() {
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a name for your network.");
    if (trimmed.length > NAME_MAX) return setError(`Use at most ${NAME_MAX} characters.`);
    setError("");
    setBusy(true);
    try {
      const res = await createOrg({ name: trimmed });
      toast.success(res?.message || "Network created");
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not create the network."));
      setBusy(false);
      return;
    }
    try {
      await refreshNetworkProfile(dispatch);
    } catch (_) {
      toast.info("Your network is ready. Reload the page to manage it.");
    }
    setBusy(false);
  };

  return (
    <main className="main-body">
      <div>
        <h1 className="page-h1">Vendor network</h1>
        <p className="page-sub">Run your branches, distributors and dealers as one network under your account.</p>
      </div>
      <div className="section-card" style={{ maxWidth: 640 }}>
        <div className="section-head">
          <div className="h-left">
            <span className="ic">
              <Network size={15} />
            </span>
            <h2>Set up your vendor network</h2>
          </div>
        </div>
        <form className="section-body" onSubmit={submit} noValidate>
          <ul style={{ margin: "0 0 16px", paddingLeft: 18, fontSize: 13, color: "var(--fg-2)", lineHeight: 1.6 }}>
            <li>Your account becomes the network's principal, and you its admin.</li>
            <li>Link your other Workwise accounts, or create logins for branches and distributors.</li>
            <li>Invite your team and route enquiries to the right entity.</li>
          </ul>
          <label className="label" htmlFor="vn-org-name">
            Network name
          </label>
          <input
            id="vn-org-name"
            className="input"
            value={name}
            maxLength={NAME_MAX}
            placeholder="e.g. Daikin India"
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!error}
          />
          {error && (
            <div className="help-text" style={{ color: "var(--danger)" }}>
              {error}
            </div>
          )}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-blue" disabled={busy}>
              {busy ? "Creating…" : "Create network"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
