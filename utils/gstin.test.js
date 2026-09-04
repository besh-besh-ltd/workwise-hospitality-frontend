// The GSTIN seed rule, shared by the RFQ quote wizard and the ARC quote page.
//
// Both surfaces store GSTIN per-quote (tbl_quotes.gstin / tbl_arc_quote
// .gstin_used), so both opened with an empty box on every new request and both
// drew the same complaint — "the GSTIN I entered was not auto filled". They
// must answer it identically, hence one rule in one place.

import { isValidGstin, seedGstin } from "./gstin";

const VALID = "29AAACW1234F1Z5";
const OTHER = "27BBBCW9876K1Z3";

describe("isValidGstin", () => {
  it("accepts a canonical 15-character GSTIN", () => {
    expect(isValidGstin(VALID)).toBe(true);
  });

  it("accepts an empty value — GSTIN is an optional field", () => {
    expect(isValidGstin("")).toBe(true);
    expect(isValidGstin(null)).toBe(true);
    expect(isValidGstin(undefined)).toBe(true);
  });

  it("normalises case and surrounding whitespace before checking", () => {
    expect(isValidGstin(`  ${VALID.toLowerCase()}  `)).toBe(true);
  });

  // The exact shapes sitting in production's tbl_company.gstin today.
  it.each([
    ["truncated to 14 characters", "27AABCJ9086F1Z"],
    ["truncated to 12 characters", "27ARGPP9285P"],
    ["a stray leading colon", ":27AAOCM3996J1Z"],
    ["a missing leading state digit", "7AAACR5055K1Z7"],
    ["no 'Z' in the checksum slot", "27AOIPV5679QZK"],
    ["free text", "Eureka@2026"],
  ])("rejects %s", (_label, value) => {
    expect(isValidGstin(value)).toBe(false);
  });
});

describe("seedGstin", () => {
  it("offers the profile GSTIN when the quote carries none", () => {
    expect(seedGstin({ stored: "", profile: VALID })).toEqual({
      value: VALID,
      fromProfile: true,
    });
  });

  it("keeps the GSTIN the vendor submitted on this quote", () => {
    // A delivery-location GSTIN legitimately differs from the head-office one.
    // Overwriting it would silently change what the vendor already filed.
    expect(seedGstin({ stored: OTHER, profile: VALID })).toEqual({
      value: OTHER,
      fromProfile: false,
    });
  });

  it("leaves the box empty when there is nothing to offer", () => {
    expect(seedGstin({ stored: "", profile: "" })).toEqual({
      value: "",
      fromProfile: false,
    });
    expect(seedGstin({ stored: null, profile: null })).toEqual({
      value: "",
      fromProfile: false,
    });
  });

  it("refuses to seed a malformed profile GSTIN", () => {
    // 18 of 422 production profiles hold junk here. Seeding one would put a
    // value the vendor never typed into the box and then block them on a
    // format error against it.
    expect(seedGstin({ stored: "", profile: "27AABCJ9086F1Z" })).toEqual({
      value: "",
      fromProfile: false,
    });
  });

  it("does not treat a whitespace-only stored value as an answer", () => {
    expect(seedGstin({ stored: "   ", profile: VALID })).toEqual({
      value: VALID,
      fromProfile: true,
    });
  });

  it("normalises a seeded profile GSTIN to upper case", () => {
    expect(seedGstin({ stored: "", profile: `  ${VALID.toLowerCase()} ` })).toEqual({
      value: VALID,
      fromProfile: true,
    });
  });

  it("hands back a malformed stored GSTIN untouched so the vendor can fix it", () => {
    // 3 production quotes carry one. It must stay on screen to be corrected,
    // not be silently replaced by the profile value.
    expect(seedGstin({ stored: "NOTAGSTIN", profile: VALID })).toEqual({
      value: "NOTAGSTIN",
      fromProfile: false,
    });
  });
});
