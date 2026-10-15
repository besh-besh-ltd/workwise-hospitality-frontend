// The commercial clauses of a rate contract, as the contract holder accepts them one by
// one on the accept page ("Accept commercial terms: N clauses") and as a fulfilment
// member reads them on the contract page. One builder, so both read the same text.
//
// Commercial terms are derived from the ARC the buyer created. Payment,
// delivery, penalty and escalation are captured at ARC creation (the buyer's
// RFQ terms) — termination is a standard platform clause. This makes the
// "who decided these terms" answer transparent in the UI via the `source`.
export function buildCommercialTerms(arc) {
  arc = arc || {};
  const esc = arc.escalation_clause_json || {};
  const escText =
    !esc.type || esc.type === "none"
      ? "Rates are fixed for the full contract term — no price escalation applies."
      : esc.cap_pct
        ? `Price escalation permitted via the agreed index, capped at ${esc.cap_pct}% over the term.`
        : "Price escalation permitted as per the agreed index, subject to buyer approval.";
  return [
    {
      key: "payment", title: "Payment terms", source: "from-arc",
      text: arc.payment_terms_expected
        ? `${arc.payment_terms_expected} from goods receipt (GRN) at the receiving business unit. Invoices are raised against each released PO with the agreed HSN code per line.`
        : "Payment as agreed per released PO at the receiving business unit.",
    },
    {
      key: "delivery", title: "Delivery & lead time", source: "from-arc",
      text: arc.delivery_expected
        ? `${arc.delivery_expected}. Partial deliveries acceptable; a packing list, lot number and OC certificate must accompany each shipment.`
        : "Delivery as agreed per line; packing list and OC certificate to accompany each shipment.",
    },
    {
      key: "penalty", title: "Penalty / SLA clauses", source: "from-arc",
      text: arc.penalty_clause
        ? arc.penalty_clause
        : "Standard service-level penalties apply for late delivery and quality rejects as per the buyer's policy.",
    },
    {
      key: "escalation", title: "Price escalation", source: "from-arc",
      text: escText,
    },
    {
      key: "termination", title: "Termination & exit", source: "standard",
      text: "Either party may terminate for cause with 30 days' written notice. On termination, all open released POs shall be honoured and the vendor agrees to a 90-day transition support window at the contracted rates.",
    },
  ];
}

export default buildCommercialTerms;
