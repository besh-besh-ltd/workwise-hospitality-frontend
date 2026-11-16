import {
  awardOutcomeLabel,
  isItemClosed,
  isItemFinalized,
  isItemSettled,
  itemCloseReasonLabel,
  ITEM_CLOSE_REASONS,
} from "./rfqItemClosure";

describe("rfqItemClosure", () => {
  it("labels every reason the server accepts, plus the Close RFQ one", () => {
    expect(ITEM_CLOSE_REASONS.map((r) => r.value)).toEqual([
      "no_quotes_received",
      "all_vendors_regretted",
      "technically_disqualified",
      "quotes_not_acceptable",
      "requirement_cancelled",
      "sourced_elsewhere",
      "other",
    ]);
    expect(itemCloseReasonLabel("no_quotes_received")).toBe("No quotes received");
    expect(itemCloseReasonLabel("rfq_closed")).toBe("Closed with the RFQ");
    expect(itemCloseReasonLabel(null)).toBeNull();
  });

  it("reads a closed item from either payload shape", () => {
    expect(isItemClosed({ closed_at: "2026-11-03T10:00:00Z" })).toBe(true);
    expect(isItemClosed({ finalization_status: "Closed without award" })).toBe(true);
    expect(isItemClosed({ finalization_status: "No vendor finalized yet" })).toBe(false);
    expect(isItemClosed(null)).toBe(false);
  });

  it("only the two finalized statuses count as finalized — a closed item never does", () => {
    expect(isItemFinalized("You are finalized")).toBe(true);
    expect(isItemFinalized("Another vendor is finalized")).toBe(true);
    expect(isItemFinalized("Closed without award")).toBe(false);
    expect(isItemFinalized("Pending")).toBe(false);
    expect(isItemFinalized(undefined)).toBe(false);
  });

  it("settled = finalized or closed", () => {
    expect(isItemSettled({ finalization_status: "Another vendor is finalized" })).toBe(true);
    expect(isItemSettled({ finalization_status: "Closed without award" })).toBe(true);
    expect(isItemSettled({ finalization_status: "No vendor finalized yet" })).toBe(false);
  });

  it("names the outcome", () => {
    const items = { total: 5, awarded: 3, closed_no_award: 2, open: 0, award_pending: 0 };
    expect(awardOutcomeLabel("partially_awarded", items)).toBe("Partially awarded (3 of 5)");
    expect(awardOutcomeLabel("fully_awarded", items)).toBe("Fully awarded");
    expect(awardOutcomeLabel("not_awarded", items)).toBe("Not awarded");
    expect(awardOutcomeLabel("in_progress", { ...items, open: 1, closed_no_award: 1 })).toBe("1 closed without award");
    expect(awardOutcomeLabel("in_progress", { ...items, closed_no_award: 0 })).toBeNull();
    expect(awardOutcomeLabel(null, null)).toBeNull();
  });
});
