import { parseScan, parseGs1 } from "../parseScan";

const GS = "\x1d";

describe("parseScan", () => {
  it("parseScan classifies short URL, GS1 (]C1 / ]d2 prefixes and \\x1d), plain", () => {
    // Our own QR labels, with or without a host.
    expect(parseScan("https://hospitality.letsworkwise.com/s/i/42")).toEqual({
      type: "short_url", t: "i", id: 42, code: "https://hospitality.letsworkwise.com/s/i/42",
    });
    expect(parseScan("/s/p/7")).toEqual({ type: "short_url", t: "p", id: 7, code: "/s/p/7" });
    expect(parseScan("http://localhost:3000/s/G/9/")).toMatchObject({ type: "short_url", t: "g", id: 9 });
    expect(parseScan("https://hospitality.letsworkwise.com/s/d/3?x=1")).toMatchObject({ t: "d", id: 3 });

    // GS1-128 from a scanner that sends the AIM identifier.
    const gs128 = `]C1` + `0109501101530003` + `17270300` + `10ABC-1${GS}21S9`;
    expect(parseScan(gs128)).toEqual({
      type: "gs1",
      gs1: { gtin: "09501101530003", batch: "ABC-1", expiry: "2027-03-31", serial: "S9" },
      code: gs128,
    });
    // GS1 DataMatrix.
    expect(parseScan(`]d2010950110153000310LOT7${GS}17270200`)).toMatchObject({
      type: "gs1", gs1: { batch: "LOT7", expiry: "2027-02-28" },
    });
    // The camera's plain text: GS separators, no identifier.
    expect(parseScan(`010950110153000310B1${GS}17280200`)).toMatchObject({
      type: "gs1", gs1: { gtin: "09501101530003", batch: "B1", expiry: "2028-02-29" },
    });
    // A leading FNC1 sent as GS, and the human-readable form.
    expect(parseScan(`${GS}0109501101530003`)).toMatchObject({ type: "gs1" });
    expect(parseScan("(01)09501101530003(17)261215(10)L-42")).toMatchObject({
      type: "gs1", gs1: { expiry: "2026-12-15", batch: "L-42" },
    });

    // Plain codes: EANs, item codes; a non-GS1 AIM identifier is dropped and
    // scanner line endings are trimmed.
    expect(parseScan("8901234567897")).toEqual({ type: "plain", code: "8901234567897" });
    expect(parseScan("  RICE-1\r\n")).toEqual({ type: "plain", code: "RICE-1" });
    expect(parseScan("]E08901234567897")).toEqual({ type: "plain", code: "8901234567897" });
    expect(parseScan("0109501101530004")).toEqual({ type: "plain", code: "0109501101530004" }); // bad check digit
    expect(parseScan("https://example.com/products/12")).toMatchObject({ type: "plain" });

    for (const empty of ["", "   ", "\r\n", null, undefined]) expect(parseScan(empty)).toBeNull();
  });

  it("parseGs1 treats day 00 as the month's last day and drops impossible dates", () => {
    expect(parseGs1("]C1010950110153000317240200").expiry).toBe("2024-02-29");
    expect(parseGs1("]C1010950110153000317271340")).toEqual({
      gtin: "09501101530003", batch: null, expiry: null, serial: null,
    });
    expect(parseGs1("8901234567890")).toBeNull();
  });
});
