import {
  deriveTechEvalStatusFlags,
  listLeftOutResponders,
  leftOutWarningText,
  countHiddenResponders,
} from "./techEvalScoring";

describe("deriveTechEvalStatusFlags", () => {
  it("old backend (no new fields): stuck is blocked with nobody passed, as before", () => {
    expect(deriveTechEvalStatusFlags({ blocked_insufficient_vendors: true }, 0)).toMatchObject({
      isStuck: true, reopened: false, bidWindowOpen: null, eligibleUnscoredVendors: [],
    });
    expect(deriveTechEvalStatusFlags({ blocked_insufficient_vendors: true }, 1).isStuck).toBe(false);
    expect(deriveTechEvalStatusFlags({ blocked_insufficient_vendors: false }, 0).isStuck).toBe(false);
  });

  it("new backend: is_stuck wins over the local guess", () => {
    const reopenedOpen = { blocked_insufficient_vendors: true, is_stuck: false, reopened: true, bid_window_open: true };
    expect(deriveTechEvalStatusFlags(reopenedOpen, 0)).toMatchObject({ isStuck: false, reopened: true, bidWindowOpen: true });
  });

  it("passes the eligible unscored list through", () => {
    const list = [{ vendor_id: 738, vendor_name: "V738" }];
    expect(deriveTechEvalStatusFlags({ eligible_unscored_vendors: list }, 0).eligibleUnscoredVendors).toEqual(list);
  });
});

describe("responders left out of a round", () => {
  const clauses = [{ vendor_responses: [{ vendor_id: 1, buyer_id: 9 }, { vendor_id: 2 }] }];
  const vendors = [
    { vendor_id: 1, vendor_name: "Scored" },
    { vendor_id: 2, vendor_name: "Unscored" },
    { vendor_id: 3, rfq_product_vendor_id: 77, has_quoted: false },
    { vendor_id: 4, is_verified: true },
    { vendor_id: 5, is_replaced_out: true },
  ];
  it("lists outstanding vendors with no complete score, by name or VEN code", () => {
    expect(listLeftOutResponders(vendors, clauses)).toEqual(["Unscored", "VEN-77"]);
  });
  it("builds the warning, or nothing", () => {
    expect(leftOutWarningText(["A", "B"])).toBe("2 vendor(s) who answered won't be in this round: A, B. Continue?");
    expect(leftOutWarningText([])).toBeNull();
  });
  it("counts distinct hidden (unquoted) responders across products", () => {
    expect(countHiddenResponders([
      { vendors: [{ vendor_id: 738, has_quoted: false }, { vendor_id: 1, has_quoted: true }] },
      { vendors: [{ vendor_id: 738, has_quoted: false }] },
    ])).toBe(1);
  });
});
