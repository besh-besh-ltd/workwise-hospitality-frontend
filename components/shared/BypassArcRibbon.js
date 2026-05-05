import React, { useState } from "react";

// Phase 8 — striking ARC-OVERRIDE ribbon used across:
//   - RFQ create / edit wizard (top of page)
//   - RFQ listing row
//   - Quote-compare page
//   - Vendor-facing RFQ details (so vendors know they're competing
//     despite an active contract)
//
// Reusable, bespoke styling, no Bootstrap. Click "View reason" to
// expand the audit text inline.
//
// Props:
//   reason          - string (required when isVisible)
//   recordedBy      - { name, email } | null  (optional)
//   recordedAt      - ISO string | null
//   compact         - boolean: small/inline mode for listing rows
//   className       - optional additional class for layout

const BypassArcRibbon = ({ reason, recordedBy, recordedAt, compact = false, className = "" }) => {
  const [expanded, setExpanded] = useState(false);
  if (!reason) return null;

  if (compact) {
    return (
      <span
        title={reason}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 8px",
          borderRadius: 999,
          background: "#fef3c7",
          color: "#92400e",
          border: "1px solid #fde68a",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        }}
      >
        ⚠ ARC Override
      </span>
    );
  }

  return (
    <div
      className={className}
      role="status"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 16px",
        marginBottom: 16,
        borderRadius: 8,
        background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
        border: "1px solid #f59e0b",
        boxShadow: "0 1px 3px rgba(245,158,11,0.18)",
      }}
    >
      <div
        aria-hidden
        style={{
          flex: "0 0 auto",
          width: 30,
          height: 30,
          borderRadius: "50%",
          background: "#f59e0b",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          fontSize: 16,
        }}
      >
        ⚠
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              padding: "2px 8px",
              borderRadius: 4,
              background: "#92400e",
              color: "#fff",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.6,
              textTransform: "uppercase",
            }}
          >
            Open Market — ARC Override
          </span>
          <span style={{ fontSize: 12, color: "#78350f" }}>
            This RFQ was floated despite an active rate contract for the listed items.
          </span>
        </div>
        {!expanded && (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              marginTop: 6,
              background: "transparent",
              border: "none",
              padding: 0,
              color: "#92400e",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            View reason
          </button>
        )}
        {expanded && (
          <div
            style={{
              marginTop: 8,
              padding: "10px 12px",
              background: "#fff8e1",
              border: "1px solid #fde68a",
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.5,
              color: "#451a03",
            }}
          >
            <div style={{ whiteSpace: "pre-wrap" }}>{reason}</div>
            {(recordedBy || recordedAt) && (
              <div style={{ marginTop: 6, fontSize: 10, color: "#78350f" }}>
                Recorded
                {recordedBy?.name ? ` by ${recordedBy.name}` : ""}
                {recordedAt ? ` on ${new Date(recordedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : ""}
                .
              </div>
            )}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              style={{
                marginTop: 6,
                background: "transparent",
                border: "none",
                padding: 0,
                color: "#92400e",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Hide
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BypassArcRibbon;
