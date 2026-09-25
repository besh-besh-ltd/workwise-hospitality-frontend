// Create wizard · Business unit — pick the hotels a group rate contract covers
// and which of them leads (runs the tender and the approvals).
//
// Uses the wizard's cat-grid / cat-card primitives from styles/arc_v2.css so it
// reads as the same step it replaces for single-hotel contracts.

import { hotelCode as buCodeFor } from "@/utils/groupArc";

export default function GroupHotelPicker({ hotels = [], selectedIds = [], leadId = null, onToggle, onMakeLead }) {
  const selected = new Set(selectedIds.map(Number));
  return (
    <div className="cat-grid">
      {hotels.map((h) => {
        const isSelected = selected.has(Number(h.id));
        const isLead = isSelected && Number(leadId) === Number(h.id);
        return (
          <div
            key={h.id}
            role="checkbox"
            aria-checked={isSelected}
            tabIndex={0}
            className={`cat-card ${isSelected ? "selected" : ""}`}
            onClick={() => onToggle(h.id)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle(h.id); }
            }}
          >
            <div className="cc-ic" aria-hidden="true">
              <input type="checkbox" checked={isSelected} readOnly tabIndex={-1} style={{ pointerEvents: "none" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="cc-name">
                <span className="mono fw-700">{buCodeFor(h.name)}</span> · {h.name}
              </div>
              <div className="cc-meta">
                {[h.city, h.state].filter(Boolean).join(", ") || "—"}
                {h.is_head_office && <> · Head Office</>}
              </div>
              {isLead && (
                <span className="status-pill floated" style={{ marginTop: 6 }}>Lead hotel</span>
              )}
              {isSelected && !isLead && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ marginTop: 4, paddingLeft: 0 }}
                  onClick={(e) => { e.stopPropagation(); onMakeLead(h.id); }}
                >
                  Make lead
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
