import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { updateOrg } from "@/services/vendorNetwork";
import { networkErrorMessage } from "./networkErrors";
import { ROUTING_MODES, ROUTING_MODE_LABEL } from "./routingFormat";

const MODE_HELP = {
  ADMIN_ROUTES: "Every RFQ and contract hotel waits in this queue until an admin assigns it.",
  AUTO_SINGLE_MATCH: "When exactly one entity's coverage matches, it is assigned automatically. Everything else waits here.",
};

/** Routing mode and response timeout of the org (PATCH /org). */
export default function RoutingSettingsCard({ org, onSaved }) {
  const [mode, setMode] = useState(org?.routing_mode || "ADMIN_ROUTES");
  const [hours, setHours] = useState(String(org?.routing_timeout_hours ?? ""));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(org?.routing_mode || "ADMIN_ROUTES");
    setHours(String(org?.routing_timeout_hours ?? ""));
  }, [org?.routing_mode, org?.routing_timeout_hours]);

  const dirty = mode !== org?.routing_mode || hours.trim() !== String(org?.routing_timeout_hours ?? "");

  const save = async () => {
    const value = hours.trim();
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 168) {
      setError("Enter a whole number of hours from 1 to 168.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const res = await updateOrg({ routing_mode: mode, routing_timeout_hours: Number(value) });
      toast.success(res?.message || "Network settings saved");
      onSaved?.(res?.data);
    } catch (err) {
      toast.error(networkErrorMessage(err, "Could not save the routing settings."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="section-card">
      <div className="section-head">
        <div className="h-left">
          <h2>Routing settings</h2>
        </div>
      </div>
      <div className="section-body" style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "flex-end" }}>
        <fieldset style={{ border: 0, margin: 0, padding: 0, minWidth: 280, flex: "1 1 320px" }}>
          <legend className="label">Routing mode</legend>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ROUTING_MODES.map((m) => (
              <label key={m} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, cursor: "pointer" }}>
                <input type="radio" name="vn-routing-mode" value={m} checked={mode === m} onChange={() => setMode(m)} style={{ marginTop: 3 }} />
                <span>
                  <strong style={{ color: "var(--fg)" }}>{ROUTING_MODE_LABEL[m]}</strong>
                  <span style={{ display: "block", fontSize: 12, color: "var(--fg-3)" }}>{MODE_HELP[m]}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div style={{ width: 220 }}>
          <label className="label" htmlFor="vn-routing-timeout">Response time (hours)</label>
          <input
            id="vn-routing-timeout"
            className="input"
            type="number"
            min={1}
            max={168}
            step={1}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <div className="help-text">How long an entity has to accept or decline (1–168). An RFQ's deadline is never later than 6 hours before its bid end.</div>
        </div>
        <div>
          <button type="button" className="btn btn-blue" onClick={save} disabled={busy || !dirty}>
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </div>
      {error && (
        <div className="section-body" style={{ color: "var(--danger)", fontSize: 12.5, paddingTop: 0 }}>
          {error}
        </div>
      )}
    </div>
  );
}
