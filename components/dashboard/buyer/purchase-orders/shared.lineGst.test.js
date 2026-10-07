/**
 * Pure tests for the PO-line GST helpers in shared.js.
 *
 * RFQ 536645 / 536651: the vendor entered GST as a flat amount (₹49,500 /
 * ₹63,900, tax_mode "absolute"). The PO page multiplied by that figure as if it
 * were a rate and showed "49500%" and ₹13.6Cr / ₹22.7Cr line amounts on POs
 * worth ₹3.24L / ₹4.19L. These pin the rupee figure as authoritative.
 */
import { lineGstAmount, lineAmount, previewLineFromPoItem } from "./shared";

const AHU_ABSOLUTE = { quantity: 1, unit_price: 275000, gst: 18, gst_amount: 49500, tax_mode: "absolute" };

describe("lineGstAmount", () => {
  it("uses the server's rupee GST, never rate × basic, for an absolute line", () => {
    expect(lineGstAmount(AHU_ABSOLUTE)).toBe(49500);
  });

  it("prefers gst_amount even when gst disagrees (the old 49500-as-rate payload)", () => {
    expect(lineGstAmount({ quantity: 1, unit_price: 275000, gst: 49500, gst_amount: 49500 })).toBe(49500);
  });

  it("falls back to rate × basic for a reply without gst_amount", () => {
    expect(lineGstAmount({ quantity: 2, unit_price: 100, gst: 18 })).toBe(36);
  });

  it("is 0 when the line carries no GST at all", () => {
    expect(lineGstAmount({ quantity: 2, unit_price: 100, gst: null, gst_amount: null })).toBe(0);
  });

  it("accepts numeric strings", () => {
    expect(lineGstAmount({ quantity: "1", unit_price: "355000.00", gst_amount: "63900.00" })).toBe(63900);
  });
});

describe("lineAmount", () => {
  it("is basic + GST — ₹3,24,500 for the RFQ 536645 AHU line, not ₹13.6Cr", () => {
    expect(lineAmount(AHU_ABSOLUTE)).toBe(324500);
  });

  it("is ₹4,18,900 for the RFQ 536651 AHU line", () => {
    expect(lineAmount({ quantity: 1, unit_price: 355000, gst: 18, gst_amount: 63900, tax_mode: "absolute" })).toBe(418900);
  });

  it("keeps percentage lines exactly as before", () => {
    expect(lineAmount({ quantity: 58, unit_price: 500, gst: 18 })).toBe(34220);
  });
});

describe("previewLineFromPoItem", () => {
  it("forwards an absolute GST as rupees in absolute mode", () => {
    expect(previewLineFromPoItem(AHU_ABSOLUTE)).toEqual({
      unit_price: 275000,
      quantity: 1,
      tax: 49500,
      tax_mode: "absolute",
      other_charges: [],
    });
  });

  it("forwards a percentage GST as the rate", () => {
    const other = [{ name: "Freight", amount: 100, amount_mode: "fixed" }];
    expect(
      previewLineFromPoItem({ quantity: 2, unit_price: 50, gst: 18, gst_amount: 18, tax_mode: "percentage", charges_meta: { other_charges: other } })
    ).toEqual({ unit_price: 50, quantity: 2, tax: 18, tax_mode: "percentage", other_charges: other });
  });

  it("treats a reply with no tax_mode as percentage and no GST as 0", () => {
    expect(previewLineFromPoItem({ quantity: 1, unit_price: 10 })).toMatchObject({ tax: 0, tax_mode: "percentage" });
  });
});
