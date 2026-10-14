// Every mobile shape found in production on 2026-10-14 (digits made up, shapes
// verbatim), read back by the edit forms and saved again.
//
// The admin's "Edit Account" save failed with "An internal error has occurred"
// because the old parser took "the part before the first hyphen" as the
// country code. On "9876500001-" that made the NUMBER the country code, left
// the number field blank, and the save glued them into "9876500001-9876500001"
// — 21 characters into a varchar(15). Every fixture the old tests used was the
// one well-formed shape, "+91-9000000001", so none of them could see it.

import {
  parseMobile,
  formatMobile,
  fitsMobileColumn,
  toStoredMobile,
  COUNTRY_CODE_PATTERN,
  MOBILE_MAX_LENGTH,
} from "./mobile";

describe("parseMobile reads every stored shape into a real country code and the digits", () => {
  it.each([
    // shape in prod             stored                 code       number
    ["canonical",                "+91-9876500001",      "+91",     "9876500001"],
    ["bare (bulk HR import)",    "9876500001",          "+91",     "9876500001"],
    ["trailing hyphen (THE bug)", "9876500001-",        "+91",     "9876500001"],
    ["space-formatted",          "+91-98765 00001",     "+91",     "9876500001"],
    ["spaced in threes",         "+91-987 650 001",     "+91",     "987650001"],
    ["code, empty number",       "+91-",                "+91",     ""],
    ["one-digit code",           "+1-9540095143",       "+1",      "9540095143"],
    ["six-digit picker code",    "+441481-123456",      "+441481", "123456"],
    ["space after the code",     "+91 9876500001",      "+91",     "9876500001"],
    ["empty",                    "",                    "+91",     ""],
    ["null",                     null,                  "+91",     ""],
  ])("%s", (_shape, stored, code, number) => {
    expect(parseMobile(stored)).toEqual({ countryCode: code, mobileNumber: number });
  });

  it("never returns a country code that is not one", () => {
    for (const stored of ["9876500001-", "9876500001-9876500001", "abc-def", "12345-678"]) {
      expect(parseMobile(stored).countryCode).toMatch(COUNTRY_CODE_PATTERN);
    }
  });
});

describe("formatMobile builds what is stored", () => {
  it("joins a real code and the digits", () => {
    expect(formatMobile("+91", "9876500001")).toBe("+91-9876500001");
  });

  it("refuses to glue a NUMBER on as the country code — the production failure", () => {
    // Exactly what the admin modal held after reading "9876500001-".
    expect(formatMobile("9876500001", "9876500001")).toBe("+91-9876500001");
  });

  it("drops separators and a leading 0", () => {
    expect(formatMobile("+91", "098765 00001")).toBe("+91-9876500001");
  });

  it("gives an empty string for a blank number, never a bare '+91-'", () => {
    expect(formatMobile("+91", "")).toBe("");
    expect(formatMobile("+91", "   ")).toBe("");
  });
});

describe("read back and saved again, no shape grows or breaks the column", () => {
  it.each([
    "+91-9876500001",
    "9876500001",
    "9876500001-",
    "+91-98765 00001",
    "+91-987 650 001",
    "+1-9540095143",
    "+441481-123456",
  ])("%s", (stored) => {
    const { countryCode, mobileNumber } = parseMobile(stored);
    const saved = formatMobile(countryCode, mobileNumber);

    expect(saved.length).toBeLessThanOrEqual(MOBILE_MAX_LENGTH);
    expect(saved).toMatch(/^\+\d{1,6}-\d+$/);
    // Idempotent: saving what you read changes nothing the second time.
    const again = parseMobile(saved);
    expect(formatMobile(again.countryCode, again.mobileNumber)).toBe(saved);
  });
});

describe("fitsMobileColumn", () => {
  it("accepts the longest number a two-digit code can hold", () => {
    expect(fitsMobileColumn("+91", "12345678901")).toBe(true); // 15 chars
  });
  it("rejects one digit more", () => {
    expect(fitsMobileColumn("+91", "123456789012")).toBe(false); // 16 chars
  });
  it("accounts for a long country code", () => {
    expect(fitsMobileColumn("+441481", "1234567")).toBe(true); // 15
    expect(fitsMobileColumn("+441481", "12345678")).toBe(false); // 16
  });
});

describe("toStoredMobile — registration's number field, which accepts a typed code", () => {
  it("keeps the whole number instead of cutting it to 15 characters", () => {
    // The old path produced "+91-+91 98765 0": a code-in-the-number, truncated.
    expect(toStoredMobile("+91", "+91 98765 00001")).toBe("+91-9876500001");
  });
  it.each([
    ["plain digits", "+91", "9876500001", "+91-9876500001"],
    ["code typed with a hyphen", "+91", "+91-9876500001", "+91-9876500001"],
    ["leading zero", "+91", "09876500001", "+91-9876500001"],
    ["typed code wins over the picker", "+1", "+91 9876500001", "+91-9876500001"],
  ])("%s", (_label, code, typed, expected) => {
    expect(toStoredMobile(code, typed)).toBe(expected);
  });
  it("lets an over-long number through to validation rather than truncating it", () => {
    const stored = toStoredMobile("+91", "123456789012");
    expect(stored).toBe("+91-123456789012");
    expect(fitsMobileColumn("+91", "123456789012")).toBe(false);
  });
});
