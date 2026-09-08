// buildInitialQuoteProducts — a per-charge GST must survive the round trip.
//
// CONFIRMED DEFECT, reported against RFQ #536312 (vendor 834, negotiation
// round 1005). The buyer opened `base_price` only. The vendor changed the unit
// price from 320 to 310, touched nothing else, and Confirm & Update raised:
//
//     A negotiation round is active on this RFQ. You may only revise the
//     fields the buyer opened for negotiation. Not open for negotiation:
//     freight.
//
// The vendor never touched freight. The wizard rewrote it on page load.
//
// Root cause: the backend passes `tbl_quote_items.other_charges` through
// untouched (rfqModel.js — `'other_charges', TQI.other_charges`), so a stored
// charge reaches the client as { name, slug, amount, amount_mode, tax,
// tax_mode, comment } — the per-charge GST lives under `tax`. Hydration read
// it from `c.charge_tax ?? c.tax_on_charge`, and NEITHER key exists anywhere
// in the backend. Every charge therefore hydrated with `tax: null` no matter
// what was stored, and the wizard re-posted that null.
//
// The backend's negotiation allowlist compares the incoming charge against the
// stored one (rfqController.js `negChargeShape` / `negSameCharge`), and
// `negSameNum` returns false when exactly one side is null. A charge the
// vendor never touched therefore read as changed, and the whole submission was
// refused — the fourth bug in this family, after `delivery_period '' -> 0` and
// `tax_mode NULL -> 'percentage'`.
//
// Outside a negotiation round there is no allowlist to catch it, so the same
// round trip silently wrote `tax: null` over the stored rate — per the
// tri-state rule below, converting an explicit per-charge GST into "inherit
// the base rate". The negotiation guard is only what made it visible.
//
// The tri-state these tests pin:
//     tax === null   ->  inherit the product's base GST rate
//     tax === 0      ->  no tax on this charge  (a real, distinct statement)
//     tax === n      ->  this charge is taxed at n
//
// The pre-existing zeroCharge suite did not catch any of this: its fixture
// used `tax_on_charge`, a key production never emits.

import { buildInitialQuoteProducts } from "./helpers";

/** A charge in the shape the API actually returns (raw JSONB passthrough). */
const storedCharge = (over = {}) => ({
  name: "Freight",
  slug: "freight",
  amount: 1050,
  amount_mode: "absolute",
  tax: 5,
  tax_mode: "percentage",
  comment: "as per actual",
  is_global: false,
  ...over,
});

const mkRfq = (charges) => ({
  products: [
    {
      id: 1,
      product_id: 1001,
      variant: "standard",
      product_details: [{ name: "BANQUET CHAIR COVER" }],
      product_specs: [
        { title: "Quantity", value: "100" },
        { title: "Unit", value: "pcs" },
      ],
    },
  ],
  quotations: [
    {
      products: [
        {
          product_id: 1001,
          variant: "standard",
          unit_price: 320,
          tax: 5,
          tax_mode: "percentage",
          delivery_period: "15",
          other_charges: charges,
        },
      ],
    },
  ],
});

/** The single hydrated charge on the only product. */
const hydrateCharge = (charges) =>
  buildInitialQuoteProducts(mkRfq(charges))[0].other_charges[0];

describe("buildInitialQuoteProducts — per-charge GST survives hydration", () => {
  it("keeps an explicit per-charge GST from the real API shape", () => {
    // The exact failure from RFQ #536312: freight carried a rate, and the
    // wizard replaced it with null.
    expect(hydrateCharge([storedCharge()]).tax).toBe(5);
  });

  it("keeps the per-charge tax mode", () => {
    expect(hydrateCharge([storedCharge({ tax_mode: "absolute" })]).tax_mode).toBe(
      "absolute"
    );
  });

  it("distinguishes 'no tax on this charge' (0) from 'inherit' (null)", () => {
    // 0 is a commercial statement — the vendor waived tax on this charge.
    // Collapsing it to null silently re-applies the product's base rate.
    expect(hydrateCharge([storedCharge({ tax: 0 })]).tax).toBe(0);
  });

  it("leaves an unstated per-charge GST as null (inherit base rate)", () => {
    expect(hydrateCharge([storedCharge({ tax: null })]).tax).toBeNull();
    const { tax, ...noTaxKey } = storedCharge();
    expect(hydrateCharge([noTaxKey]).tax).toBeNull();
  });

  it("carries the charge's amount and mode through unchanged", () => {
    const c = hydrateCharge([storedCharge()]);
    expect(c.amount).toBe(1050);
    expect(c.amount_mode).toBe("absolute");
    expect(c.comment).toBe("as per actual");
    expect(c.slug).toBe("freight");
  });

  // The legacy shape is why `tax` cannot simply be read as the GST: before the
  // amount columns existed, a charge stored its AMOUNT under `tax` — which is
  // what the `parseFloat(c.amount ?? c.tax ?? 0)` fallback above it exists for.
  // Reading that as a per-charge GST would invent a 900% tax rate.
  it("does not mistake a legacy charge's amount for a per-charge GST", () => {
    const legacy = { name: "Freight", slug: "freight", tax: 900, tax_mode: "absolute" };
    const c = hydrateCharge([legacy]);
    expect(c.amount).toBe(900);
    expect(c.tax).toBeNull();
  });
});
