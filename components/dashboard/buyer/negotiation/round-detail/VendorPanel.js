// Who has responded and who has not — with something to call.
//
// This exists because the trigger for opening this page is usually a vendor on
// the phone. The roster is folded from the lines when the server does not send
// an explicit participant list, so it is never empty just because the contract
// changed shape.

import { Check, Clock, Mail, Phone } from "lucide-react";
import { formatDateTime } from "./roundDetailModel";

export default function VendorPanel({ vendors = [], locked }) {
  if (vendors.length === 0) {
    return (
      <div className="section-body">
        <p className="help-text" style={{ margin: 0 }}>
          No vendors are recorded against this round.
        </p>
      </div>
    );
  }

  const responded = vendors.filter((v) => v.responded).length;
  const pct = vendors.length ? Math.round((responded / vendors.length) * 100) : 0;

  return (
    <div className="section-body" data-testid="vendor-panel">
      <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
        <div className="progress-bar" style={{ flex: 1, height: 6, background: "var(--surface-3)", borderRadius: 99, overflow: "hidden", maxWidth: 280 }}>
          <div
            className={`fill${responded === 0 ? " warn" : ""}`}
            style={{
              width: `${pct}%`,
              height: "100%",
              background: responded === 0 ? "var(--warn)" : "var(--success)",
              borderRadius: 99,
            }}
          />
        </div>
        <span className="fs-12 text-fg-3">
          <span className="mono fw-600 text-fg">
            {responded} of {vendors.length}
          </span>{" "}
          vendors responded
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {vendors.map((v) => (
          <div
            key={v.key}
            className="contact-row"
            data-testid={`vendor-${v.responded ? "responded" : "pending"}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: v.responded ? "var(--success-tint)" : "var(--surface-2)",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--fg)" }}>{v.name}</div>
              <div
                className="fs-11"
                style={{ color: "var(--fg-3)", marginTop: 3, display: "flex", gap: 10, flexWrap: "wrap" }}
              >
                {v.lineCount != null && (
                  <span>
                    {v.lineCount} line{v.lineCount === 1 ? "" : "s"}
                  </span>
                )}
                {v.email && (
                  <a href={`mailto:${v.email}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--primary)" }}>
                    <Mail size={11} strokeWidth={2} />
                    {v.email}
                  </a>
                )}
                {v.phone && (
                  <a href={`tel:${v.phone}`} style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--primary)" }}>
                    <Phone size={11} strokeWidth={2} />
                    {v.phone}
                  </a>
                )}
              </div>
            </div>
            <span className={`pill ${v.responded ? "success" : "warn"}`} style={{ flexShrink: 0 }}>
              {v.responded ? <Check size={11} strokeWidth={2.5} /> : <Clock size={11} strokeWidth={2.5} />}
              {v.responded
                ? locked
                  ? "Responded"
                  : `Responded${v.respondedAt ? ` · ${formatDateTime(v.respondedAt)}` : ""}`
                : "No response"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
