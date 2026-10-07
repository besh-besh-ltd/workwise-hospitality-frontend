import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { createLinkInvite, getEntitySuggestions } from "@/services/vendorNetwork";
import NetworkModal from "./NetworkModal";
import { networkErrorMessage } from "./networkErrors";
import { EMAIL_RE, LINKABLE_RELATIONSHIPS, RELATIONSHIP_LABEL } from "./networkFormat";

/**
 * "Link existing account" (spec §5). The target is EITHER a vendor from the
 * server's same-PAN suggestions (sent by id) OR an exact account email. The
 * invited account must accept from its own login before it joins.
 */
export default function LinkAccountModal({ onClose, onSent }) {
  const [relationship, setRelationship] = useState("BRANCH");
  const [suggestions, setSuggestions] = useState(null);
  const [pan, setPan] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getEntitySuggestions()
      .then((res) => {
        if (cancelled) return;
        setSuggestions(res?.data?.suggestions || []);
        setPan(res?.data?.pan || null);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async () => {
    const targetEmail = email.trim();
    let payload;
    if (selectedId != null) payload = { relationship, target_vendor_id: selectedId };
    else if (targetEmail) {
      if (!EMAIL_RE.test(targetEmail)) return setError("Enter a valid email address.");
      payload = { relationship, target_email: targetEmail };
    } else return setError("Pick a suggested account or enter the account's email.");

    setError("");
    setBusy(true);
    try {
      const res = await createLinkInvite(payload);
      toast.success(res?.message || "Invitation sent");
      onSent?.();
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not send the invitation."));
      setBusy(false);
    }
  };

  return (
    <NetworkModal
      title="Link existing account"
      sub="The account's owner accepts the invitation from their own login."
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="btn btn-blue" onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send invitation"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <label className="label" htmlFor="vn-link-rel">
            Relationship
          </label>
          <select id="vn-link-rel" className="select" value={relationship} onChange={(e) => setRelationship(e.target.value)}>
            {LINKABLE_RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {RELATIONSHIP_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="label" style={{ float: "none" }}>
            Suggested accounts{pan ? ` (same PAN ${pan})` : ""}
          </legend>
          {suggestions === null ? (
            <div className="help-text">Looking for accounts with your PAN…</div>
          ) : suggestions.length === 0 ? (
            <div className="help-text">No other accounts share your PAN. Invite one by its email instead.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {suggestions.map((s) => {
                const id = Number(s.vendor_id);
                const checked = selectedId === id;
                return (
                  <label
                    key={id}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "9px 12px",
                      border: `1px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="radio"
                      name="vn-link-target"
                      checked={checked}
                      onChange={() => {
                        setSelectedId(id);
                        setEmail("");
                      }}
                      style={{ marginTop: 3 }}
                    />
                    <span>
                      <strong style={{ color: "var(--fg)" }}>{s.name}</strong>
                      {s.company_name && s.company_name !== s.name ? ` · ${s.company_name}` : ""}
                      <span style={{ display: "block", fontSize: 12, color: "var(--fg-3)" }}>
                        {[s.email, s.gstin].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <div>
          <label className="label" htmlFor="vn-link-email">
            Account email
          </label>
          <input
            id="vn-link-email"
            className="input"
            type="email"
            value={email}
            placeholder="The email the account signs in with"
            onChange={(e) => {
              setEmail(e.target.value);
              if (e.target.value) setSelectedId(null);
            }}
          />
          <div className="help-text">Or invite any vendor account by its exact sign-in email.</div>
        </div>

        {error && <div style={{ color: "var(--danger)", fontSize: 12.5 }}>{error}</div>}
      </div>
    </NetworkModal>
  );
}
