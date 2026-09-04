import { lineItems } from "@/data/ihg/thread";
import { quotesForItem } from "@/data/ihg/quotes";
import { vendorsById } from "@/data/ihg/vendors";

/**
 * AI Negotiator — drafts round 1 of a negotiation.
 *
 * Proposes a target rate per vendor for one line item, with the reasoning
 * behind each number: what IHG last paid, where this vendor sits against the
 * field, and how that vendor has actually behaved in past rounds.
 *
 * The targets are editable. A negotiation target the buyer cannot move is not
 * a tool, it is an instruction — and the buyer is the one who has to defend
 * the number to the supplier on the phone.
 */

/**
 * How hard to push, per vendor.
 *
 * Derived from the concession pattern on file rather than a flat percentage:
 * a supplier who historically moves 2% once should not be handed the same
 * target as one who has moved 9% in a single round. Asking a disciplined
 * supplier for a concession they have never given is how you lose them.
 */
const ASK = {
  sriram: { pct: 3.0, basis: "Moves 2–3% once and then holds. Asking at the top of their range." },
  nandan: { pct: 4.0, basis: "Two small moves of 2% is their pattern — a 4% ask is reachable across the round." },
  trident: { pct: 4.5, basis: "Historically concedes 3–4% and stops. Slightly above that, to leave room." },
  welspun: { pct: 7.5, basis: "Opens high and gives 6–8% over two rounds. Their opening is the most padded in the field." },
  aarvi: { pct: 9.0, basis: "Has conceded 9% in a single round before, which suggests the opening quote is inflated." },
  greenleaf: { pct: 2.0, basis: "Holds unit price but funds freight and packaging. Small ask on rate, push elsewhere." },
};

export const engine = {
  steps: [
    { label: "Reading the quotes on this item", detail: "5 live quotes", ms: 680 },
    { label: "Replaying prior rounds with these suppliers", detail: "23 rounds across 4 categories", ms: 940 },
    { label: "Benchmarking against your last awarded rate", ms: 760 },
    { label: "Reading each supplier's concession pattern", ms: 820 },
    { label: "Drafting targets", ms: 560 },
  ],

  compute: ({ itemId } = {}) => {
    const item = lineItems.find((i) => i.id === itemId) || lineItems[0];
    const rows = quotesForItem(item.id);
    const lowest = rows[0];

    const targets = rows.map((r) => {
      const ask = ASK[r.vendorId] || { pct: 4, basis: "No prior round history — using the category default." };
      const target = Math.round(r.rate * (1 - ask.pct / 100));
      const vendor = vendorsById[r.vendorId];

      // A target below the cheapest live quote is not credible: no supplier
      // moves below a price they can see a competitor has already beaten.
      const floor = Math.round(lowest.rate * 0.97);
      const finalTarget = Math.max(target, floor);
      const clamped = finalTarget !== target;

      return {
        vendorId: r.vendorId,
        vendorName: vendor.name,
        vendorShort: vendor.short,
        current: r.rate,
        target: finalTarget,
        askPct: Number((((r.rate - finalTarget) / r.rate) * 100).toFixed(1)),
        vsLastAward: Number((((r.rate - item.lastRate) / item.lastRate) * 100).toFixed(1)),
        basis: ask.basis,
        clamped,
        clampNote: clamped
          ? "Capped 3% under the lowest live quote — pushing below that is not credible when the supplier can see the field."
          : null,
        qty: r.qty,
        saving: (r.rate - finalTarget) * r.qty,
      };
    });

    const currentBest = lowest.rate * lowest.qty;
    const targetBest = Math.min(...targets.map((t) => t.target)) * lowest.qty;

    return {
      item,
      targets,
      lastRate: item.lastRate,
      // What the round is worth if every supplier meets its target and the
      // cheapest wins — the honest number, not the sum of all savings.
      roundSaving: currentBest - targetBest,
      roundSavingPct: Number((((currentBest - targetBest) / currentBest) * 100).toFixed(1)),
      priorRounds: 23,
      message:
        `We have five live quotes on ${item.name} ranging ₹${lowest.rate} to ₹${rows[rows.length - 1].rate}. ` +
        `Against our FY25-26 awarded rate of ₹${item.lastRate}, we are looking for a revised rate at or below ` +
        `the target indicated for your line. Volumes are firm at ${item.annualQty.toLocaleString("en-IN")} ${item.uom} ` +
        `across five properties, on a single consolidated contract. Revised quotes close in 5 working days.`,
      confidence: 84,
    };
  },
};

export default engine;
