import React, { useRef, useState } from "react";

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

// Compact pill used inline in product tables / RFQ cards. Shows a
// minimal amber chip; on hover, surfaces a clean white popover with the
// audit reason + recorder. The popover uses position:fixed anchored to
// the chip's bounding rect so it overflows the cell and isn't clipped
// by `.table-responsive { overflow: auto }` or any ancestor with
// overflow: hidden — the recurring source of "why is my popover cut?"
// in dense tables.
const CompactBypassPill = ({ reason, recordedBy, recordedAt, className = "" }) => {
  const [hover, setHover] = useState(false);
  const [coords, setCoords] = useState(null);
  const chipRef = useRef(null);

  const open = () => {
    const rect = chipRef.current?.getBoundingClientRect();
    if (rect) {
      // Anchor below the chip; flip to above when there isn't 200px of
      // room downwards. 320px wide popover, clamped to the viewport
      // so a chip near the right edge doesn't push it off-screen.
      const popoverWidth = 320;
      const room = window.innerHeight - rect.bottom;
      const showAbove = room < 200;
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8));
      const top = showAbove ? rect.top - 8 : rect.bottom + 6;
      setCoords({ top, left, showAbove, width: popoverWidth });
    }
    setHover(true);
  };
  const close = () => setHover(false);

  return (
    <span
      ref={chipRef}
      className={className}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocus={open}
      onBlur={close}
      tabIndex={0}
      aria-label={`ARC override — ${reason}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px 3px 7px",
        borderRadius: 999,
        background: "#fef3c7",
        color: "#92400e",
        border: "1px solid #f59e0b",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        lineHeight: 1.2,
        cursor: "default",
        whiteSpace: "nowrap",
        verticalAlign: "middle",
        fontFamily: "inherit",
        outline: "none",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 12,
          height: 12,
          borderRadius: 999,
          background: "#f59e0b",
          color: "#fff",
          fontSize: 9,
          fontWeight: 800,
        }}
      >
        !
      </span>
      ARC Override
      {hover && coords && (
        <span
          role="tooltip"
          style={{
            position: "fixed",
            top: coords.showAbove ? undefined : coords.top,
            bottom: coords.showAbove ? window.innerHeight - coords.top : undefined,
            left: coords.left,
            width: coords.width,
            zIndex: 9999,
            background: "#ffffff",
            border: "1px solid #fcd34d",
            borderRadius: 8,
            boxShadow: "0 12px 28px rgba(15,23,42,0.16)",
            padding: "10px 12px",
            fontSize: 12,
            color: "#451a03",
            lineHeight: 1.5,
            textTransform: "none",
            letterSpacing: 0,
            fontWeight: 400,
            whiteSpace: "normal",
            textAlign: "left",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.4, color: "#b45309", textTransform: "uppercase", marginBottom: 6 }}>
            Reason for ARC override
          </div>
          <div style={{ whiteSpace: "pre-wrap", color: "#78350f" }}>{reason}</div>
          {(recordedBy?.name || recordedAt) && (
            <div style={{ marginTop: 8, fontSize: 11, color: "#a16207" }}>
              Recorded
              {recordedBy?.name ? ` by ${recordedBy.name}` : ""}
              {recordedAt ? ` · ${new Date(recordedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}` : ""}
            </div>
          )}
        </span>
      )}
    </span>
  );
};

const BypassArcRibbon = ({ reason, recordedBy, recordedAt, compact = false, className = "" }) => {
  const [expanded, setExpanded] = useState(false);
  if (!reason) return null;

  if (compact) {
    // Modern hover-to-reveal chip. The popover renders with
    // position:fixed using the chip's bounding rect so it can't be
    // clipped by table-responsive overflow / parent overflow:hidden.
    // No click required — the chip itself stays compact.
    return <CompactBypassPill reason={reason} recordedBy={recordedBy} recordedAt={recordedAt} className={className} />;
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
