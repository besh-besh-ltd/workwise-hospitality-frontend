// The vendor Send-Quote "Download Excel" path, end to end up to the browser's
// save dialog. SheetJS is now loaded on demand (utils/xlsx.js), so this proves
// the lazily-loaded build still produces a real workbook with the expected
// sheets and the expected filename.

jest.mock("file-saver", () => ({ __esModule: true, saveAs: jest.fn() }));

import { saveAs } from "file-saver";
import { loadXlsx } from "./xlsx";
import { buildQuoteWorkbook, downloadQuoteExcel } from "./quoteExcel";

const args = () => ({
  rfq: { id: 7, rfq_no: 536645, title: "Linen supply" },
  products: [
    {
      product_name: "Bath towel", unit_price: 250, quantity: 40, unit: "nos",
      gst: 12, tax_mode: "percentage",
      other_charges: [{ name: "Freight", amount: 500, mode: "absolute", tax: 18, tax_mode: "percentage" }],
    },
    { product_name: "Hand towel", unit_price: 90, quantity: 100, unit: "nos", gst: 12, other_charges: [] },
  ],
  globalCharges: [{ name: "Packing", amount: 2, mode: "percentage" }],
  pricingTotals: {
    lines: [{ base: 10000, line_total: 11800, charges: [{ amount: 500, tax: 90 }] }, { base: 9000, line_total: 10080, charges: [] }],
    grand_subtotal: 21880, global_charges_total: 437.6, grand_total: 22317.6,
  },
  vendorGSTIN: "27ABCDE1234F1Z5",
});

beforeEach(() => saveAs.mockClear());

test("buildQuoteWorkbook resolves to a workbook with both sheets", async () => {
  const wb = await buildQuoteWorkbook(args());
  expect(wb.SheetNames).toEqual(["Quote Calculation", "Formula Reference"]);
  const XLSX = await loadXlsx();
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  expect(out.byteLength).toBeGreaterThan(1000);
  const back = XLSX.read(out, { type: "array" });
  expect(back.Sheets["Quote Calculation"].A1.v).toMatch(/Pricing Calculation/);
});

test("downloadQuoteExcel hands a non-empty .xlsx Blob to the browser", async () => {
  const name = await downloadQuoteExcel(args());
  expect(name).toBe("Linen_supply_536645.xlsx");
  expect(saveAs).toHaveBeenCalledTimes(1);
  const [blob, filename] = saveAs.mock.calls[0];
  expect(filename).toBe(name);
  expect(blob.size).toBeGreaterThan(1000);
});
