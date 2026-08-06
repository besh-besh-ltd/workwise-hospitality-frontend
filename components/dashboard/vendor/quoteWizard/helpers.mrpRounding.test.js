// MRP (tax-inclusive) money accuracy — the vendor's intended amount must survive
// the quantity multiplication.
//
// CONFIRMED DEFECT, measured live on RFQ 363 / #535917. In MRP mode the vendor
// enters a GST-INCLUSIVE price and a discount; the system reverse-calculates a
// tax-EXCLUSIVE base. That base was rounded to 2dp and only then multiplied by
// quantity, so the total stopped matching what the vendor offered:
//
//     MOUSE          MRP   500 less 20% x 75  ->    30,000.00   showed    29,999.73
//     KEYBOARD       MRP 1,300 less 15% x 50  ->    55,250.00   showed    55,249.96
//     LAPTOP SCREEN  MRP 6,000 less  5% x 20  ->  1,14,000.00   showed  1,14,000.04
//
//     400 / 1.18 = 338.9830508...  ->  338.98  ->  338.98 x 75 x 1.18 = 29,999.73
//
// The error is up to half a paisa per unit, so it scales with quantity — and the
// same figures flowed on into the PO.
//
// These pin the client-side math (the vendor sees these numbers while quoting)
// against the exact same cases the backend suite asserts, so the two can't drift.

import { deriveMrpBaseFE, computeLineTotal, computeTotals } from "./helpers";

/** Round to paise the way every money display on this page does. */
const q2 = (n) => Math.round(n * 100) / 100;

/** A priced MRP line in the wizard's product shape. */
const mrpLine = ({ mrp, discount, qty, gst, discountMode = "percentage" }) => ({
  pricing_method: "MRP",
  entered_mrp: mrp,
  mrp_discount: discount,
  mrp_discount_mode: discountMode,
  unit_price: "", // MRP lines never carry a unit_price in client state
  qty,
  tax: gst,
  tax_mode: "percentage",
  other_charges: [],
});

const REAL_CASES = [
  { label: "MOUSE — MRP ₹500 less 20% × 75",          mrp: 500,  discount: 20, qty: 75, gst: 18, intended: 30000,  drifted: 29999.73 },
  { label: "KEYBOARD — MRP ₹1,300 less 15% × 50",     mrp: 1300, discount: 15, qty: 50, gst: 18, intended: 55250,  drifted: 55249.96 },
  { label: "LAPTOP SCREEN — MRP ₹6,000 less 5% × 20", mrp: 6000, discount: 5,  qty: 20, gst: 18, intended: 114000, drifted: 114000.04 },
];

describe("computeLineTotal — MRP lines reproduce the vendor's intent exactly", () => {
  it.each(REAL_CASES)(
    "$label = ₹$intended, not ₹$drifted",
    ({ mrp, discount, qty, gst, intended, drifted }) => {
      const total = q2(computeLineTotal(mrpLine({ mrp, discount, qty, gst })));
      expect(total).toBe(intended);
      expect(total).not.toBe(drifted);
    }
  );

  it("preserves a genuine decimal rather than rounding to whole rupees", () => {
    // 99.99 less 3% = 96.9903/unit; x 7 = 678.9321 -> 678.93. "Keep what the
    // vendor meant" is not the same as "make it a whole rupee".
    const total = q2(computeLineTotal(mrpLine({ mrp: 99.99, discount: 3, qty: 7, gst: 12 })));
    expect(total).toBe(678.93);
    expect(Number.isInteger(total)).toBe(false);
  });

  it("an absolute (₹) discount is applied before GST is extracted", () => {
    // 500 less ₹100 = 400/unit inclusive, x 75 = 30,000 — same intent, other mode.
    const total = q2(
      computeLineTotal(mrpLine({ mrp: 500, discount: 100, qty: 75, gst: 18, discountMode: "absolute" }))
    );
    expect(total).toBe(30000);
  });

  it("charges still stack on top of the inclusive amount", () => {
    // Base line is 30,000 inclusive; a ₹500 absolute freight charge inherits the
    // 18% base GST rate -> 500 + 90 = 590 on top.
    const line = mrpLine({ mrp: 500, discount: 20, qty: 75, gst: 18 });
    line.other_charges = [{ name: "Freight", amount: 500, amount_mode: "absolute" }];
    expect(q2(computeLineTotal(line))).toBe(30590);
  });
});

describe("computeTotals — the GST split reconciles with the grand total", () => {
  it("subtotal + GST equals the amount offered, though the split itself repeats", () => {
    // 30,000 / 1.18 = 25,423.728813... Neither half is representable at 2dp, so
    // what must hold is that they still add up to what the vendor offered.
    const { subtotal, gst, grand } = computeTotals([
      mrpLine({ mrp: 500, discount: 20, qty: 75, gst: 18 }),
    ]);
    expect(q2(subtotal)).toBe(25423.73);
    expect(q2(gst)).toBe(4576.27);
    expect(q2(subtotal + gst)).toBe(30000);
    expect(q2(grand)).toBe(30000);
  });

  it("all three real lines together total ₹1,99,250.00, not ₹1,99,249.73", () => {
    const products = REAL_CASES.map(({ mrp, discount, qty, gst }) =>
      mrpLine({ mrp, discount, qty, gst })
    );
    const { grand } = computeTotals(products);
    expect(q2(grand)).toBe(199250);
    expect(q2(grand)).not.toBe(199249.73);
  });
});

describe("deriveMrpBaseFE", () => {
  it("keeps the derived rate at full precision and offers a 2dp figure for display", () => {
    const out = deriveMrpBaseFE({ mrp: 500, discount: 20, discountMode: "percentage", gst: 18 });
    expect(out.net).toBe(400);                        // MRP less discount — authoritative
    expect(out.base).toBeCloseTo(338.9830508, 6);     // NOT pre-rounded
    expect(Number.isInteger(out.base * 100)).toBe(false);
    expect(out.base2dp).toBe(338.98);                 // display/storage-shaped
  });

  it("gst = 0 means there is nothing to extract", () => {
    const out = deriveMrpBaseFE({ mrp: 1000, discount: 0, discountMode: "percentage", gst: 0 });
    expect(out.net).toBe(1000);
    expect(out.base).toBe(1000);
    expect(out.gst).toBe(0);
  });

  it("a discount at or above the MRP floors the net at zero, never negative", () => {
    const out = deriveMrpBaseFE({ mrp: 500, discount: 900, discountMode: "absolute", gst: 18 });
    expect(out.net).toBe(0);
    expect(out.base).toBe(0);
  });
});

describe("Traditional (tax-exclusive) quoting is completely unaffected", () => {
  const traditional = (over = {}) => ({
    pricing_method: "TRADITIONAL",
    unit_price: 338.98,
    qty: 75,
    tax: 18,
    tax_mode: "percentage",
    other_charges: [],
    ...over,
  });

  it("prices from unit_price x qty exactly as it always did", () => {
    // 338.98 x 75 = 25,423.50, +18% = 29,999.73. A Traditional line means the
    // vendor really did quote ₹338.98 exclusive, so this must NOT become 30,000.
    expect(q2(computeLineTotal(traditional()))).toBe(29999.73);
  });

  it("an absolute tax stays absolute", () => {
    // tax_mode 'absolute' adds a flat ₹50, not a percentage.
    const total = q2(computeLineTotal(traditional({ unit_price: 100, qty: 2, tax: 50, tax_mode: "absolute" })));
    expect(total).toBe(250);
  });

  it("a line with no pricing_method at all is treated as Traditional", () => {
    const line = traditional();
    delete line.pricing_method;
    expect(q2(computeLineTotal(line))).toBe(29999.73);
  });

  it("a line flagged MRP but missing entered_mrp falls back to Traditional rather than pricing at zero", () => {
    const line = traditional({ pricing_method: "MRP", entered_mrp: "" });
    expect(q2(computeLineTotal(line))).toBe(29999.73);
  });

  it("charges and per-charge tax behave exactly as before", () => {
    const line = traditional({ unit_price: 100, qty: 3, tax: 18 });
    line.other_charges = [{ name: "Freight", amount: 10, amount_mode: "absolute" }];
    // base 300 + tax 54 + charge 10 + inherited charge tax 1.8 = 365.80
    expect(q2(computeLineTotal(line))).toBe(365.8);
  });
});
