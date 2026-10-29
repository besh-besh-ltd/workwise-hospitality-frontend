// The site-rep link matches scans on the device. These cases mirror the
// server's rules (backend scanService lookupItem / itemPayload) so a code that
// resolves for a signed-in buyer on the PO resolves the same way for a link.

import { parseScan } from "@/components/inventory/scan/parseScan";
import { gtinForms, resolveOnOrder, upcAToUpcE, upcEToUpcA } from "../tokenScanMatch";

const line = (over) => ({
  poLineId: 1, invItemId: 9, productName: "Item", unit: "pcs", openAtHotel: 10, barcodes: [], ...over,
});

const RICE = line({
  poLineId: 11, invItemId: 9, productName: "Basmati rice",
  barcodes: [{ code: "RICE-6PK", packFactor: 6 }, { code: "8901234567890", packFactor: 1 }],
});
const SODA = line({ poLineId: 12, invItemId: 10, productName: "Soda", barcodes: [{ code: "042100005264", packFactor: 24 }] });
const GUM = line({ poLineId: 13, invItemId: 11, productName: "Gum", barcodes: [{ code: "04252614", packFactor: 1 }] });
const MINT = line({ poLineId: 14, invItemId: 12, productName: "Mint", barcodes: [{ code: "96385074", packFactor: 2 }] });

const read = (raw, lines = [RICE, SODA, GUM, MINT]) => resolveOnOrder(parseScan(raw), lines);
const hitLine = (raw, lines) => {
  const r = read(raw, lines);
  return r.kind === "item" ? [r.item.poLineId, r.item.packFactor] : null;
};

describe("UPC-E and GTIN forms (same as the server)", () => {
  test("UPC-E expands to its UPC-A and back", () => {
    expect(upcEToUpcA("04252614")).toBe("042100005264");
    expect(upcAToUpcE("042100005264")).toBe("04252614");
    expect(upcEToUpcA("04252615")).toBeNull(); // bad check digit
  });

  test("a numeric read is compared as GTIN-14", () => {
    expect(gtinForms("8901234567890").keys).toEqual(["08901234567890"]);
    expect(gtinForms("04252614")).toEqual({ keys: ["00000004252614", "00042100005264"], forms: ["04252614"] });
    expect(gtinForms("RICE-6PK")).toEqual({ keys: [], forms: [] });
  });
});

describe("resolveOnOrder", () => {
  test("exact code, with its pack factor", () => {
    expect(hitLine("RICE-6PK")).toEqual([11, 6]);
  });

  test("letters in another case still match", () => {
    expect(hitLine("rice-6pk")).toEqual([11, 6]);
  });

  test("an exact alias wins over a case-insensitive one", () => {
    const BOX = line({ poLineId: 20, invItemId: 30, barcodes: [{ code: "abc", packFactor: 2 }] });
    const CASE = line({ poLineId: 21, invItemId: 31, barcodes: [{ code: "ABC", packFactor: 5 }] });
    expect(hitLine("ABC", [BOX, CASE])).toEqual([21, 5]);
  });

  test("EAN-13 alias matches its GTIN-14 and a GS1 read of it", () => {
    expect(hitLine("08901234567890")).toEqual([11, 1]);
    expect(hitLine("010890123456789017271231")).toEqual([11, 1]);
    expect(read("010890123456789017271231").gs1).toEqual(expect.objectContaining({ gtin: "08901234567890" }));
  });

  test("UPC-A alias matches the same product read as EAN-13 or UPC-E", () => {
    expect(hitLine("0042100005264", [RICE, SODA, MINT])).toEqual([12, 24]);
    expect(hitLine("04252614", [SODA])).toEqual([12, 24]);
  });

  test("UPC-E alias matches the same product read as UPC-A", () => {
    expect(hitLine("042100005264", [GUM])).toEqual([13, 1]);
  });

  test("an 8-digit EAN-8 alias matches only itself or its zero-padded form", () => {
    expect(hitLine("96385074")).toEqual([14, 2]);
    expect(hitLine("00000096385074")).toEqual([14, 2]);
    expect(hitLine("96385075")).toBeNull();
  });

  test("our item QR maps by stock item, one unit", () => {
    expect(hitLine("/s/i/10")).toEqual([12, 1]);
    expect(hitLine("https://app.letsworkwise.com/s/i/9")).toEqual([11, 1]);
    expect(read("/s/i/99").kind).toBe("unknown");
    // other QR kinds (a PO, a GRN, a dispatch) are not items on this delivery
    expect(read("/s/p/52").kind).toBe("unknown");
  });

  test("two lines with the same item: the first one still open wins", () => {
    const closed = line({ poLineId: 30, invItemId: 50, openAtHotel: 0, barcodes: [{ code: "TWIN", packFactor: 3 }] });
    const open = line({ poLineId: 31, invItemId: 50, openAtHotel: 4, barcodes: [{ code: "TWIN", packFactor: 3 }] });
    expect(hitLine("TWIN", [closed, open])).toEqual([31, 3]);
    expect(hitLine("/s/i/50", [closed, open])).toEqual([31, 1]);
    // nothing open on either: the first
    expect(hitLine("TWIN", [closed, { ...open, openAtHotel: 0 }])).toEqual([30, 3]);
  });

  test("a code that matches two different items is not guessed: both are offered", () => {
    // The same EAN keyed in as UPC-A on one item and as UPC-E on another.
    const r = read("0042100005264", [RICE, SODA, GUM, MINT]);
    expect(r.kind).toBe("ambiguous");
    expect(r.candidates).toEqual([
      { poLineId: 12, invItemId: 10, packFactor: 24 },
      { poLineId: 13, invItemId: 11, packFactor: 1 },
    ]);
    // Letters in another case on two items.
    const A = line({ poLineId: 40, invItemId: 60, barcodes: [{ code: "abc-1", packFactor: 2 }] });
    const B = line({ poLineId: 41, invItemId: 61, barcodes: [{ code: "ABC-1", packFactor: 5 }] });
    expect(read("Abc-1", [A, B])).toEqual({
      kind: "ambiguous",
      code: "Abc-1",
      candidates: [
        { poLineId: 40, invItemId: 60, packFactor: 2 },
        { poLineId: 41, invItemId: 61, packFactor: 5 },
      ],
      gs1: null,
    });
    // An exact match on one of them is not ambiguous.
    expect(hitLine("ABC-1", [A, B])).toEqual([41, 5]);
  });

  test("the same item on several lines is not ambiguous: the open line takes it", () => {
    const closed = line({ poLineId: 50, invItemId: 70, openAtHotel: 0, barcodes: [{ code: "abc-2", packFactor: 3 }] });
    const open = line({ poLineId: 51, invItemId: 70, openAtHotel: 2, barcodes: [{ code: "ABC-2", packFactor: 3 }] });
    expect(hitLine("Abc-2", [closed, open])).toEqual([51, 3]);
  });

  test("a dispatch QR names the link's dispatch, or none", () => {
    const dispatches = [{ id: 31, challanNo: "CH-9" }];
    expect(resolveOnOrder(parseScan("/s/d/31"), [RICE], dispatches)).toEqual({
      kind: "dispatch", code: "/s/d/31", dispatch: dispatches[0], gs1: null,
    });
    expect(resolveOnOrder(parseScan("https://app.letsworkwise.com/s/d/99"), [RICE], dispatches)).toEqual(
      expect.objectContaining({ kind: "dispatch", dispatch: null })
    );
    // without the dispatches, still a dispatch scan (never "not on this order" as an item)
    expect(resolveOnOrder(parseScan("/s/d/31"), [RICE]).kind).toBe("dispatch");
  });

  test("an unknown code is unknown", () => {
    expect(read("NOPE-1")).toEqual({ kind: "unknown", code: "NOPE-1", gs1: null });
  });
});
