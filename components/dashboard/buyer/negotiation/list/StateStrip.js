// The state strip — "12 rounds · 1 ready for your decision · 9 concluded · 2 lapsed".
//
// A parent's roll-up pill names ONE state: the one needing attention soonest.
// That is the right headline and a lie by omission on its own — 48 of the 124
// production parents (39%) contain rounds in two or more different states, and
// an RFQ whose pill says "Ready for your decision" may also be carrying nine
// concluded rounds and two that lapsed.
//
// Each segment is tinted with that state's own tone. The tones come from the
// shared `.status-pill` variants with the chip itself stripped off, so a state
// is the same colour here as it is on the pill beside it and there is no
// second colour table to keep in sync.

import { shortStateLabel, stateSegments } from "./parentRow";

const SEGMENT_STYLE = {
  background: "transparent",
  border: "none",
  padding: 0,
  fontSize: 12,
  fontWeight: 500,
  gap: 5,
};

export default function StateStrip({
  stateCounts,
  roundCount,
  // The per-RFQ page prints the round count as a tile value directly above the
  // strip, so it suppresses the leading "N rounds".
  showTotal = true,
  testId = "state-strip",
}) {
  const segments = stateSegments(stateCounts);
  // One state means the strip would repeat the pill. The round count still
  // renders — it is the whole point of the parent row.
  if (segments.length < 2) return null;

  return (
    <div
      data-testid={testId}
      style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", rowGap: 4 }}
    >
      {showTotal && (
        <span className="fs-12 text-fg-3">
          <span className="mono fw-600 text-fg">{roundCount}</span> rounds
        </span>
      )}
      {segments.map((s, i) => (
        <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {(showTotal || i > 0) && (
            <span className="sep" style={{ color: "var(--fg-4, #a1a1aa)" }} aria-hidden="true">
              ·
            </span>
          )}
          <span
            className={`status-pill ${s.presentation.tone}`}
            style={SEGMENT_STYLE}
            title={`${s.presentation.label} — ${s.presentation.description}`}
          >
            <span className="dot" />
            <span>
              <span className="mono fw-600">{s.count}</span> {shortStateLabel(s.key)}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
