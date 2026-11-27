// REQ-2026-0104 — a negotiation PRICE target may be above the vendor's quote.
//
// RFQ 537041: the vendor quoted ₹100, the buyer needed ₹110 (a rate approved
// offline) and the wizard dropped the target as "higher than the quoted ₹100 —
// won't be sent", so the round could not be created. A price target above the
// quote is now sent (flagged as an exception); an equal target (no change) and
// more delivery days than quoted are still dropped.

import {
  isFieldTargetInvalid,
  isFieldTargetAboveQuote,
  targetMayRaise,
  buildVendorTargetsPayload,
  vendorTargetsHaveAboveQuote,
} from "./negotiationHelpers";

const vendor = {
  vendorId: 7,
  unitPrice: 100,
  quantity: 5,
  deliveryPeriod: 7,
  otherCharges: [{ name: "Freight", slug: "freight", amount: 50, amount_mode: "absolute" }],
  globalCharges: [],
};

describe("price target above the quote", () => {
  test("base price above the quote: sent, flagged", () => {
    const t = { base_price: "110" };
    expect(isFieldTargetInvalid("base_price", t, vendor, {})).toBe(false);
    expect(isFieldTargetAboveQuote("base_price", t, vendor, {})).toBe(true);
  });

  test("base price below the quote: sent, not flagged", () => {
    const t = { base_price: "90" };
    expect(isFieldTargetInvalid("base_price", t, vendor, {})).toBe(false);
    expect(isFieldTargetAboveQuote("base_price", t, vendor, {})).toBe(false);
  });

  test("base price equal to the quote: no change, still dropped", () => {
    const t = { base_price: "100" };
    expect(isFieldTargetInvalid("base_price", t, vendor, {})).toBe(true);
    expect(isFieldTargetAboveQuote("base_price", t, vendor, {})).toBe(false);
  });

  test("a global base price target counts the same way", () => {
    expect(isFieldTargetAboveQuote("base_price", {}, vendor, { target_base_price: "120" })).toBe(true);
    expect(isFieldTargetInvalid("base_price", {}, vendor, { target_base_price: "120" })).toBe(false);
  });

  test("a charge above the quote: sent, flagged (compared in rupees)", () => {
    expect(isFieldTargetAboveQuote("freight", { freight: "80", freight_mode: "amount" }, vendor, {})).toBe(true);
    expect(isFieldTargetInvalid("freight", { freight: "80", freight_mode: "amount" }, vendor, {})).toBe(false);
    // 20% of the ₹500 line = ₹100, above the ₹50 quoted.
    expect(isFieldTargetAboveQuote("freight", { freight: "20", freight_mode: "percentage" }, vendor, {})).toBe(true);
    // 5% = ₹25, below.
    expect(isFieldTargetAboveQuote("freight", { freight: "5", freight_mode: "percentage" }, vendor, {})).toBe(false);
  });

  test("delivery days keep the old rule: more days than quoted is dropped, never flagged", () => {
    expect(targetMayRaise("delivery_period")).toBe(false);
    expect(isFieldTargetInvalid("delivery_period", { delivery_period: "10" }, vendor, {})).toBe(true);
    expect(isFieldTargetAboveQuote("delivery_period", { delivery_period: "10" }, vendor, {})).toBe(false);
    expect(isFieldTargetInvalid("delivery_period", { delivery_period: "5" }, vendor, {})).toBe(false);
  });

  test("text fields are never invalid or flagged", () => {
    expect(isFieldTargetInvalid("payment_terms", { payment_terms: "Net 30" }, vendor, {})).toBe(false);
    expect(isFieldTargetAboveQuote("payment_terms", { payment_terms: "Net 30" }, vendor, {})).toBe(false);
  });
});

describe("the round payload", () => {
  const build = (formData, vendorTargets = {}) =>
    buildVendorTargetsPayload({
      selectedVendorIds: [7],
      vendorTargets,
      effectiveFields: formData.negotiation_fields,
      formData,
      productPriceData: { vendors: [vendor] },
    });

  test("RFQ 537041's case: a ₹110 target on a ₹100 quote is sent", () => {
    const payload = build({ negotiation_fields: ["base_price"], target_base_price: "110" });
    expect(payload).toEqual([{ vendor_id: 7, fields: [{ name: "base_price", target: "110" }] }]);
    expect(vendorTargetsHaveAboveQuote(payload, { vendors: [vendor] }, {})).toBe(true);
  });

  test("an equal target is still left out, so there is nothing to send", () => {
    expect(build({ negotiation_fields: ["base_price"], target_base_price: "100" })).toEqual([]);
  });

  test("a lower target is sent and not flagged", () => {
    const payload = build({ negotiation_fields: ["base_price"], target_base_price: "95" });
    expect(payload[0].fields).toEqual([{ name: "base_price", target: "95" }]);
    expect(vendorTargetsHaveAboveQuote(payload, { vendors: [vendor] }, {})).toBe(false);
  });

  test("a per-vendor charge above the quote is sent with its mode and flagged", () => {
    const payload = build(
      { negotiation_fields: [] },
      { 7: { freight: "80", freight_mode: "amount", _localFields: ["freight"] } }
    );
    expect(payload[0].fields).toEqual([{ name: "freight", target: "80", mode: "absolute" }]);
    expect(vendorTargetsHaveAboveQuote(payload, { vendors: [vendor] }, {})).toBe(true);
  });
});
