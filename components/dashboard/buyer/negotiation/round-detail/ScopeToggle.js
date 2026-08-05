// Scope toggle — the number on this page is never ambiguous about what it covers.
//
// 885 of 886 production rounds are a single product × single vendor, so a
// round-only view would be one bar and a buyer would reasonably assume the
// savings figure covered the whole RFQ. The toggle makes the denominator an
// explicit, always-visible choice: "This round" vs "All products at round N".
//
// The default is cycle when sibling rounds exist and round otherwise — chosen
// by the caller from meta, not here; this component only renders the choice.

export default function ScopeToggle({ scope, roundNumber, hasSiblings, siblingCount, busy, onChange }) {
  const cycleLabel = roundNumber ? `All products at round ${roundNumber}` : "All products at this round";

  const cycleHint = hasSiblings
    ? `${siblingCount ?? "Several"} rounds were opened together at round ${roundNumber ?? "?"} — this totals all of them.`
    : `No other product was negotiated at round ${roundNumber ?? "?"}, so this shows the same lines as "This round".`;

  return (
    <div
      className="view-tabs"
      role="group"
      aria-label="Scope of the figures on this page"
      data-testid="scope-toggle"
    >
      <button
        type="button"
        className={scope === "round" ? "is-active" : ""}
        aria-pressed={scope === "round"}
        disabled={busy}
        onClick={() => scope !== "round" && onChange("round")}
        title="Only the lines that belong to this negotiation round row."
      >
        This round
      </button>
      <button
        type="button"
        className={scope === "cycle" ? "is-active" : ""}
        aria-pressed={scope === "cycle"}
        disabled={busy}
        onClick={() => scope !== "cycle" && onChange("cycle")}
        title={cycleHint}
      >
        {cycleLabel}
      </button>
    </div>
  );
}

/** Human phrase for the active scope, reused in stat sublabels and empty copy. */
export function scopeLabelText(scope, roundNumber) {
  return scope === "cycle"
    ? `All products at round ${roundNumber ?? "?"}`
    : "This round only";
}
