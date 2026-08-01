// The savings block — BOTH figures, in one sentence.
//
//   ₹98.5L saved · ₹64.7L on awarded vendors
//
// The total is measured across every vendor that participated; the awarded
// portion is the slice that belongs to vendors whose quote was actually
// approved. Showing only the first overstates what the business banked;
// showing only the second throws away the negotiation's real reach. Both, with
// the awarded figure named INSIDE the total, is the only honest reading.
//
// Three things this deliberately does not do:
//   • clamp — a negotiation that ended above its baseline renders "−₹1.2L over
//     baseline", not "₹0".
//   • claim ₹0 for an RFQ with no approved quote — 36 of the 124 production
//     parents are in that position and read "not yet awarded".
//   • invent an ARC figure — the server computes savings for rfq ids only.

import { formatPct, formatSaved, savedWord, savingsView } from "./parentRow";

export default function SavingsLine({ row, testId = "savings" }) {
  const view = savingsView(row);

  if (view.kind === "arc") {
    return (
      <span className="fs-12 text-fg-3" data-testid={testId}>
        Savings are tracked on the rate contract
      </span>
    );
  }

  if (view.kind === "unmeasured") {
    return (
      <span
        className="fs-12 text-fg-3"
        data-testid={testId}
        title="No round on this RFQ has a baseline price and a revised price to compare yet."
      >
        Savings not measured yet
      </span>
    );
  }

  const negative = view.value < 0;
  const pct = formatPct(view.pct);

  return (
    <span
      className="fs-12 text-fg-3"
      data-testid={testId}
      style={{ display: "inline-flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}
    >
      <span
        className="mono fw-600"
        style={{ color: negative ? "var(--danger, #b91c1c)" : "var(--success, #15803d)", fontSize: 13 }}
        data-testid={`${testId}-total`}
      >
        {formatSaved(view.value)}
      </span>
      <span>
        {savedWord(view.value)} across all vendors{pct ? ` (${pct})` : ""}
      </span>
      <span className="sep" aria-hidden="true">
        ·
      </span>
      {view.awarded ? (
        <span data-testid={`${testId}-awarded`}>
          <span className="em mono fw-600">{formatSaved(view.awarded.value)}</span> on awarded vendors
        </span>
      ) : (
        <span
          data-testid={`${testId}-awarded`}
          title="No quote on this RFQ has been approved yet, so no share of the saving belongs to an awarded vendor."
        >
          not yet awarded
        </span>
      )}
    </span>
  );
}
