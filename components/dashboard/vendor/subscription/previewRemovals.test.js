// The client's idea of "is this a removal?" has to match the server's, or the
// vendor gets a dead Confirm button.
//
// modifySubscription rejects with "Removals require confirmation" unless the
// caller sets confirm_removals. The server counts categories, sub-categories
// and hotels. The page used to count only categories and hotels, so a vendor
// dropping just a sub-category would send no confirmation and be refused with
// a message they cannot act on.
//
// Sub-categories are free, which is exactly why they were overlooked: cost was
// being used as a stand-in for consent.

import { hasRemovals } from "./previewRemovals";

describe("hasRemovals", () => {
  it("counts a sub-category removal", () => {
    expect(hasRemovals({ removed_subcategories: [{ id: 238 }] })).toBe(true);
  });

  it("counts a category removal", () => {
    expect(hasRemovals({ removed_categories: [{ id: 237 }] })).toBe(true);
  });

  it("counts a business unit removal", () => {
    expect(hasRemovals({ removed_hotels: [{ id: 6 }] })).toBe(true);
  });

  it("counts sub-categories cascaded out by removing their parent", () => {
    expect(hasRemovals({ cascaded_subcategories: [{ id: 238 }] })).toBe(true);
  });

  it("is false for a pure addition", () => {
    expect(
      hasRemovals({
        added_categories: [{ id: 240 }],
        added_subcategories: [{ id: 241 }],
        added_hotels: [{ id: 7 }],
        removed_categories: [],
        removed_subcategories: [],
        removed_hotels: [],
      })
    ).toBe(false);
  });

  it("is false for a missing or empty diff", () => {
    expect(hasRemovals(undefined)).toBe(false);
    expect(hasRemovals({})).toBe(false);
  });
});
