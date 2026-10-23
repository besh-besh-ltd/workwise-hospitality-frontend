import { recoveryBlockerMessage } from "./poRecoveryCopy";

const CODES = [
  "UNDO_WINDOW_EXPIRED",
  "RFQ_CLOSED",
  "PRODUCT_REAWARDED",
  "REPLACEMENT_PO_EXISTS",
  "AWARD_APPROVAL_PENDING",
  "NEGOTIATION_IN_PROGRESS",
  "VENDOR_NOT_QUALIFIED",
  "AWARD_HISTORY_MISSING",
  "CONTRACT_NOT_ACTIVE",
  "CONTRACT_QUANTITY_EXCEEDED",
  "REQUISITION_CHANGED",
  "NOT_REJECTED_BY_VENDOR",
];

describe("recoveryBlockerMessage", () => {
  const fallback = recoveryBlockerMessage("SOMETHING_NEW");

  it("falls back to a plain sentence for unknown codes", () => {
    expect(fallback).toBe("This order can't be restored right now.");
    expect(recoveryBlockerMessage()).toBe(fallback);
  });

  it("every blocker code has non-default copy", () => {
    CODES.forEach((c) => {
      const m = recoveryBlockerMessage(c);
      expect(m).toBeTruthy();
      expect(m).not.toBe(fallback);
    });
  });

  it("says a newer PO was raised (it blocks even if that PO is cancelled/rejected)", () => {
    expect(recoveryBlockerMessage("REPLACEMENT_PO_EXISTS")).toBe(
      "A newer purchase order has been raised for some items on this order."
    );
  });
});
