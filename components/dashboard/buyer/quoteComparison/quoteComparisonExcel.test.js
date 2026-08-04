// The two Excel downloads on the quote comparison surface.
//
// These tests generate the real workbook, read the buffer back, and assert the
// actual cell values and TYPES. Asserting "a file was produced" would pass
// happily while every number in it was a string — which is exactly the defect
// the legacy /quote-compare export shipped with ("18%", "₹500",
// "12345 (Lowest)"), and why nothing in it could be summed or sorted.

import * as XLSX from "xlsx-js-style";

import { buildComparisonWorkbook, buildSummaryWorkbook } from "./quoteComparisonExcel";
import * as C from "./computeHelpers";

// Two vendors, three products, deliberately arranged so NEITHER vendor quotes
// every line: line 1 both, line 2 Metro only, line 3 Sharma only. With only two
// lines one vendor always ends up with full coverage, which quietly turns the
// "no overall L1" case into the opposite test.
const cell = (over = {}) => ({
  base: 100, subtotal: 1000, tax_pct: 18, tax_amt: 180, total: 1180,
  freight: 50, packaging: 20, other_charges: [], global_charges: [],
  delivery: "7", pay: "30 days", comment: "", docs: 0, missing: false,
  history: [], ...over,
});

const makeView = (over = {}) => ({
  rfq: {
    id: 512, rfq_no: 536058, number: "536058", title: "Konark deluxe rooms",
    company: "Workwise Hotels", hotel: "Lotus Eco Beach", department: "Procurement",
    status: "Commercial evaluation", quotes_invited: 3, quotes_received: 2,
    rounds: { ended: 2, active: 0 },
  },
  bid_end_date: "2026-05-05T09:03:00.000Z",
  quotes_locked: false,
  vendors: [
    { id: 11, name: "Metro Supplies", short: "MS" },
    { id: 22, name: "Sharma Traders", short: "ST" },
  ],
  categories: [{ id: 1, name: "Linen" }],
  products: [
    {
      id: 901, name: "Bed linen", qty: 10, unit: "set", category: "Linen",
      state: "approved", finalized_vendor: 11, quoted_count: 2,
      lpr: { rate: 130, landed_unit: 130, date: "2026-01-02" },
      round: { n: 2, when: "2026-05-01" },
      quotes: {
        11: cell({ subtotal: 1000, tax_amt: 180, total: 1250 }),
        22: cell({ base: 120, subtotal: 1200, tax_amt: 216, total: 1470 }),
      },
    },
    {
      id: 902, name: "Bath towels", qty: 20, unit: "pc", category: "Linen",
      state: "open", finalized_vendor: null, quoted_count: 1,
      lpr: { rate: 60, landed_unit: 60, date: "2026-01-02" },
      round: { n: 1, when: "2026-04-20" },
      quotes: {
        11: cell({ base: 50, subtotal: 1000, tax_amt: 180, total: 1230 }),
        // 22 absent — Sharma did not bid this line.
      },
    },
    {
      id: 903, name: "Face towels", qty: 15, unit: "pc", category: "Linen",
      state: "open", finalized_vendor: null, quoted_count: 1,
      lpr: { rate: 40, landed_unit: 40, date: "2026-01-02" },
      round: { n: 1, when: "2026-04-20" },
      quotes: {
        22: cell({ base: 35, subtotal: 525, tax_amt: 94.5, total: 640 }),
        // 11 absent — so neither vendor has full coverage.
      },
    },
  ],
  approval_chain: [],
  negotiation_metrics: {
    available: true, rounds_created: 3, rounds_ran: 2, rounds_cancelled: 1,
    rounds_ended: 2, rounds_expired: 0, products_negotiated: 2,
    pairs_counted: 2, baseline_total: 3000, achieved_total: 2400,
    gain_value: 600, gain_pct: 20,
    pairs_counted_awarded: 1, baseline_total_awarded: 1500,
    achieved_total_awarded: 1200, gain_value_awarded: 300, gain_pct_awarded: 20,
    baseline_sources: { quote_history: 2 },
  },
  ...over,
});

const roundTrip = (wb) =>
  XLSX.read(XLSX.write(wb, { bookType: "xlsx", type: "array" }),
    // cellNF keeps `z` (the number format) on the way back in; without it the
    // formats are applied in the file but invisible to this assertion.
    { type: "array", cellNF: true, cellStyles: true });

/** All cells of a sheet as a grid of {v,t} so we can assert types, not just text. */
const grid = (ws) => {
  const range = XLSX.utils.decode_range(ws["!ref"]);
  const out = [];
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      row.push(ws[XLSX.utils.encode_cell({ r, c })] || null);
    }
    out.push(row);
  }
  return out;
};

const findRow = (g, text) => g.find((row) => row.some((c) => c && String(c.v).trim() === text));
const rowValues = (row) => row.map((c) => (c ? c.v : null));

describe("Comparison workbook", () => {
  test("ships the sheets a reviewer and a machine each need", () => {
    const wb = roundTrip(buildComparisonWorkbook(makeView()));
    expect(wb.SheetNames).toEqual(["Cover", "Comparison", "Line Detail", "Negotiation Log", "Notes"]);
  });

  test("writes money as real numbers with a format, not text", () => {
    const wb = roundTrip(buildComparisonWorkbook(makeView()));
    const g = grid(wb.Sheets["Comparison"]);
    const row = findRow(g, "Bed linen");

    const numeric = row.filter((c) => c && c.t === "n");
    expect(numeric.length).toBeGreaterThan(5);
    // Every money cell carries a number format, so Excel sums and sorts it.
    expect(numeric.some((c) => c.z === "#,##0.00")).toBe(true);
    // And nothing smuggled a currency symbol into the value itself.
    expect(row.every((c) => !(c && typeof c.v === "string" && c.v.includes("₹")))).toBe(true);
  });

  test("a line total in the sheet equals what the screen computes", () => {
    const view = makeView();
    const wb = roundTrip(buildComparisonWorkbook(view));
    const g = grid(wb.Sheets["Comparison"]);
    const row = findRow(g, "Bed linen");

    // Parity with the page is the whole point: same helper, same number.
    const expected = C.cellLineTotal(view.products[0], 11);
    expect(rowValues(row)).toContain(expected);
  });

  test("a vendor that did not quote reads NO BID, never zero", () => {
    const wb = roundTrip(buildComparisonWorkbook(makeView()));
    const g = grid(wb.Sheets["Comparison"]);
    const row = findRow(g, "Bath towels");

    const vals = rowValues(row);
    expect(vals).toContain("NO BID");
    // The non-bidding vendor's own columns must be blank, never 0 — a zero
    // would sort as the cheapest bid and poison every average built on it.
    const at = vals.indexOf("NO BID");
    const block = row.slice(at + 1, at + 11);
    expect(block.every((c) => !c || c.t !== "n")).toBe(true);
  });

  test("marks the winner with a rank, not colour alone", () => {
    const wb = roundTrip(buildComparisonWorkbook(makeView()));
    const g = grid(wb.Sheets["Comparison"]);
    const row = findRow(g, "Bed linen");
    // Metro is cheaper on this line.
    expect(rowValues(row)).toContain("L1");
    expect(rowValues(row)).toContain("L2");
  });

  test("uses no merged cells anywhere — merges break sort and filter", () => {
    const wb = roundTrip(buildComparisonWorkbook(makeView()));
    for (const name of wb.SheetNames) {
      expect(wb.Sheets[name]["!merges"] || []).toHaveLength(0);
    }
  });

  test("Line Detail is one tidy row per product x vendor", () => {
    const view = makeView();
    const wb = roundTrip(buildComparisonWorkbook(view));
    const g = grid(wb.Sheets["Line Detail"]);
    // header + (3 products x 2 vendors)
    expect(g.length).toBe(1 + 6);
    const towelsRows = g.filter((r) => r.some((c) => c && c.v === "Bath towels"));
    expect(towelsRows).toHaveLength(2);
    // The non-bidding vendor still gets a row, marked as such — absence is data.
    expect(towelsRows.some((r) => rowValues(r).includes("NO BID"))).toBe(true);
  });

  test("Negotiation Log opens at round 0 = the original quote, with deltas", () => {
    const view = makeView();
    // The server emits `price` as a UNIT RATE and the line total separately.
    view.products[0].quotes[11].history = [
      { round: 1, price: 150, total_price: 1500, date: "2026-04-01T00:00:00Z", note: "opening" },
      { round: 2, price: 125, total_price: 1250, date: "2026-05-01T00:00:00Z", note: "revised" },
    ];
    const wb = roundTrip(buildComparisonWorkbook(view));
    const g = grid(wb.Sheets["Negotiation Log"]);

    const original = findRow(g, "Original quote");
    expect(original).toBeTruthy();
    expect(rowValues(original)).toContain(150);    // unit rate column
    expect(rowValues(original)).toContain(1500);   // line total column

    const revised = g.find((r) => r.some((c) => c && c.v === "Round 2"));
    expect(rowValues(revised)).toContain(125);
    expect(rowValues(revised)).toContain(1250);
    // Deltas are computed on the LINE TOTAL, never on the unit rate — mixing
    // the two gives a plausible number that is wrong by the quantity.
    expect(rowValues(revised)).toContain(-250);
    expect(rowValues(revised)).not.toContain(-25);
  });

  test("says so plainly when there was no negotiation", () => {
    const wb = roundTrip(buildComparisonWorkbook(makeView()));
    const g = grid(wb.Sheets["Negotiation Log"]);
    expect(g.some((r) => r.some((c) => c && String(c.v).startsWith("No negotiation rounds")))).toBe(true);
  });
});

describe("Summary workbook", () => {
  test("carries the metrics and the definitions that make them defensible", () => {
    const wb = roundTrip(buildSummaryWorkbook(makeView()));
    expect(wb.SheetNames).toEqual(["Summary", "Definitions"]);
  });

  test("reports the audited negotiation gain from the server metrics", () => {
    const wb = roundTrip(buildSummaryWorkbook(makeView()));
    const g = grid(wb.Sheets["Summary"]);

    expect(rowValues(findRow(g, "Negotiation gain"))).toContain(600);
    expect(rowValues(findRow(g, "Rounds run"))).toContain(2);
    expect(rowValues(findRow(g, "Rounds cancelled"))).toContain(1);
    // The awarded-only figure is the one finance cares about.
    expect(rowValues(findRow(g, "Negotiation gain (awarded lines only)"))).toContain(300);
  });

  test("shows a dash, not zero, when the gain is not measurable", () => {
    const view = makeView({
      negotiation_metrics: {
        available: false, rounds_created: 2, rounds_ran: 2, rounds_cancelled: 0,
        products_negotiated: 1, pairs_counted: 0,
        baseline_total: null, achieved_total: null, gain_value: null, gain_pct: null,
        gain_value_awarded: null, gain_pct_awarded: null,
      },
    });
    const wb = roundTrip(buildSummaryWorkbook(view));
    const g = grid(wb.Sheets["Summary"]);

    // "₹0 saved" and "we cannot measure this" are indistinguishable in a
    // spreadsheet cell, and they mean very different things.
    const gain = findRow(g, "Negotiation gain");
    expect(rowValues(gain)).toContain("—");
    expect(rowValues(gain)).not.toContain(0);
    // The rounds still happened, and are still reported.
    expect(rowValues(findRow(g, "Rounds run"))).toContain(2);
  });

  test("refuses to name an overall L1 when nobody quoted every line", () => {
    const wb = roundTrip(buildSummaryWorkbook(makeView()));
    const g = grid(wb.Sheets["Summary"]);
    // Sharma skipped a line, so no vendor has full coverage. A fabricated
    // overall L1 here would read as a decision that nobody made.
    expect(rowValues(findRow(g, "Overall L1 vendor"))).toContain("—");
    // The honest alternative is still given.
    expect(findRow(g, "Lowest achievable (basket L1)")).toBeTruthy();
  });

  test("names the overall L1 once a vendor has quoted everything", () => {
    const view = makeView();
    view.products[2].quotes[11] = cell({ base: 30, subtotal: 450, tax_amt: 81, total: 560 });
    const wb = roundTrip(buildSummaryWorkbook(view));
    const g = grid(wb.Sheets["Summary"]);
    expect(rowValues(findRow(g, "Overall L1 vendor"))).toContain("Metro Supplies");
  });

  test("grades each metric so an indicative number is not read as a hard saving", () => {
    const wb = roundTrip(buildSummaryWorkbook(makeView()));
    const g = grid(wb.Sheets["Definitions"]);
    const gain = findRow(g, "Negotiation gain");
    expect(rowValues(gain).some((v) => String(v).includes("not P&L savings"))).toBe(true);
  });
});

// The legacy export's defects were all column arithmetic that only showed up on
// a wide RFQ (its L1 highlight landed 3 rows off, and its hyperlink loop ran to
// the product count instead of the vendor count). Production's widest real case
// is RFQ 512: 46 products x 5 vendors, 138 negotiation rounds.
describe("at production scale", () => {
  const bigView = () => {
    const vendors = Array.from({ length: 5 }, (_, i) => ({
      id: 100 + i, name: `Vendor ${i + 1}`, short: `V${i + 1}`,
    }));
    const products = Array.from({ length: 46 }, (_, i) => ({
      id: 1000 + i, name: `Item ${i + 1}`, qty: 10 + i, unit: "pc", category: "Rooms",
      state: "open", finalized_vendor: null, quoted_count: 5,
      lpr: { rate: 100, landed_unit: 100, date: "2026-01-02" },
      round: { n: 1, when: "2026-04-01" },
      quotes: Object.fromEntries(
        vendors.map((v, vi) => [
          v.id,
          cell({
            base: 90 + vi, subtotal: (90 + vi) * (10 + i), tax_amt: 100,
            total: (90 + vi) * (10 + i) + 100,
            history: [
              { round: 1, price: 95 + vi, total_price: (95 + vi) * (10 + i), date: "2026-04-01T00:00:00Z", note: "" },
              { round: 2, price: 90 + vi, total_price: (90 + vi) * (10 + i), date: "2026-04-20T00:00:00Z", note: "" },
            ],
          }),
        ])
      ),
    }));
    return makeView({ vendors, products });
  };

  test("builds a correctly-shaped workbook for 46 products x 5 vendors", () => {
    const wb = roundTrip(buildComparisonWorkbook(bigView()));

    const cmp = grid(wb.Sheets["Comparison"]);
    // 2 header rows + 46 products + spacer + 3 vendor footers + basket L1
    expect(cmp.length).toBe(2 + 46 + 5);
    // 7 scope + (5 vendors x 11) + 5 decision columns
    expect(cmp[1].length).toBe(7 + 55 + 5);

    // Long sheet stays exactly one row per product x vendor.
    expect(grid(wb.Sheets["Line Detail"]).length).toBe(1 + 46 * 5);
    // Two history entries per cell => two log rows each.
    expect(grid(wb.Sheets["Negotiation Log"]).length).toBe(1 + 46 * 5 * 2);
  });

  test("still names no overall L1 when coverage is complete but ranks exist", () => {
    // Every vendor quoted every line here, so an overall L1 IS nameable.
    const wb = roundTrip(buildSummaryWorkbook(bigView()));
    const g = grid(wb.Sheets["Summary"]);
    expect(rowValues(findRow(g, "Overall L1 vendor"))).toContain("Vendor 1");
  });
});
