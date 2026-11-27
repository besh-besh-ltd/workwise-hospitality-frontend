// REQ-2026-0104 — a round that asks a vendor to raise a price needs a reason.
//
// A price target above the vendor's quote is allowed as an exception, so the
// wizard (RFQ and ARC both run on this hook) flags it and refuses to submit
// until "Remarks for approvers" says why. A queued entry counts too.

import { renderHook, act } from "@testing-library/react";
import useCreateRoundState from "./useCreateRoundState";
import { ABOVE_QUOTE_REMARKS_MESSAGE } from "./negotiationHelpers";

const pad = (n) => String(n).padStart(2, "0");
const localIn = (ms) => {
  const d = new Date(Date.now() + ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "queueMicrotask"] });
  jest.setSystemTime(new Date(2026, 10, 27, 10, 0));
});
afterEach(() => jest.useRealTimers());

const product = (id, unitPrice) => ({
  id,
  quantity: 5,
  product_details: [{ name: `Item ${id}` }],
  product_vendors: [{ id: 7 }],
  quotations: [{
    id: 500 + id,
    vendor_id: 7,
    vendor_details: { id: 7, name: "KEEC" },
    quote_details: [{ unit_price: unitPrice, quantity: 5, tax: 18, tax_mode: "percentage", total_price: unitPrice * 5 * 1.18, other_charges: [] }],
  }],
});
const products = [product(11, 100), product(12, 200)];

const startRound = (productId, target) => {
  const { result } = renderHook(() => useCreateRoundState({ products }));
  act(() => { result.current.handleSelectProduct(productId); });
  act(() => {
    result.current.updateFormData({ target_base_price: target, end_date: localIn(3 * 3600 * 1000) });
  });
  return result;
};

test("a target above the quote is flagged and blocks submit until a reason is given", () => {
  const result = startRound(11, "110");
  expect(result.current.currentRoundAboveQuote).toBe(true);
  expect(result.current.remarksRequired).toBe(true);
  expect(result.current.step3Errors).toContain(ABOVE_QUOTE_REMARKS_MESSAGE);
  expect(result.current.canSubmit).toBe(false);

  act(() => { result.current.setRoundRemarks("Rate ₹110 already approved by the GM"); });
  expect(result.current.step3Errors).not.toContain(ABOVE_QUOTE_REMARKS_MESSAGE);
  expect(result.current.canSubmit).toBe(true);
});

test("blank or whitespace remarks don't count", () => {
  const result = startRound(11, "110");
  act(() => { result.current.setRoundRemarks("   "); });
  expect(result.current.canSubmit).toBe(false);
});

test("a target below the quote needs no reason (unchanged)", () => {
  const result = startRound(11, "95");
  expect(result.current.currentRoundAboveQuote).toBe(false);
  expect(result.current.remarksRequired).toBe(false);
  expect(result.current.canSubmit).toBe(true);
});

test("the payload carries the higher target", () => {
  const result = startRound(11, "110");
  const built = result.current.buildCurrentRoundPayload();
  expect(built.aboveQuote).toBe(true);
  expect(built.payload.vendor_targets).toEqual([{ vendor_id: 7, fields: [{ name: "base_price", target: "110" }] }]);
});

test("a queued entry above its quote still requires the reason after moving on", () => {
  const result = startRound(11, "110");
  act(() => { expect(result.current.addCurrentToQueue()).toBe(true); });
  expect(result.current.queuedRounds[0]._aboveQuote).toBe(true);

  // Next product, with an ordinary lower target.
  act(() => { result.current.handleSelectProduct(12); });
  act(() => { result.current.updateFormData({ target_base_price: "190" }); });
  expect(result.current.currentRoundAboveQuote).toBe(false);
  expect(result.current.remarksRequired).toBe(true);
  expect(result.current.canSubmit).toBe(false);
});
