/* ═══════════════════════════════════════════════════════════════════════════
   quoteComparisonExcel.js — the two Excel downloads on the buyer's quote
   comparison surface.

     A. Comparison workbook  — the whole sheet: every product × every vendor,
        each cost component, the negotiation trail, ranks and award state.
     B. Summary workbook     — the one-look picture: L1, totals, tax, award
        quality and what negotiation actually moved.

   ── Why it is built from computeHelpers ──────────────────────────────────
   Every number in these files is produced by the SAME helper the screen
   renders from. Re-deriving totals here would be how the export and the page
   quietly disagree — the most common complaint about exports of this kind,
   and impossible for a user to debug. If a figure is wrong in the workbook it
   is wrong on screen too, which is a bug worth having.

   ── Conventions, and why ─────────────────────────────────────────────────
   • REAL NUMBERS, never strings. The legacy /quote-compare export wrote
     "18%", "₹500" and "12345 (Lowest)" as text, so nothing summed, sorted or
     pivoted. Every numeric cell here is `t:"n"` with a number format.
   • NO MERGED CELLS in any data grid. Merges break sort and filter and are
     the single most-cited reason comparison exports get thrown away. Vendor
     column groups repeat the vendor name in every header cell instead.
   • "NO BID" for a vendor that did not quote — never 0. A zero sorts as the
     cheapest and poisons every min()/average built on top of the sheet.
   • Colour is never the only signal: the L1 cell is green AND there is a Rank
     column AND an "Is L1" flag.
   • Wide sheet for humans (`Comparison`, frozen panes + autofilter), long
     tidy sheet for machines (`Line Detail`, one row per product × vendor,
     flat, unmerged) — every mature product ships both, and shipping only one
     is the usual mistake.
   ═══════════════════════════════════════════════════════════════════════ */

import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

import * as C from "./computeHelpers";

// ── formats ───────────────────────────────────────────────────────────────
// Plain grouping, not the Indian lakh/crore custom format: the conditional
// form burns its 3 format sections on magnitude, leaving none for negatives,
// and renders inconsistently outside Excel. The header says "(₹)" instead, so
// the cells stay clean numbers that filter and re-export predictably.
const MONEY = "#,##0.00";
const PCT = '0.00"%"';
const INT = "0";

const HEAD_BG = "F1F5F9";
const GROUP_BG = "E2E8F0";
const WIN_BG = "DCFCE7";
const NOTE_FG = "64748B";

const NO_BID = "NO BID";

const border = () => ({
  top: { style: "thin", color: { rgb: "E2E8F0" } },
  bottom: { style: "thin", color: { rgb: "E2E8F0" } },
  left: { style: "thin", color: { rgb: "E2E8F0" } },
  right: { style: "thin", color: { rgb: "E2E8F0" } },
});

const txt = (v, s) => ({ v: v == null ? "" : String(v), t: "s", s: { border: border(), ...(s || {}) } });
const num = (v, z = MONEY, s) =>
  v == null || !Number.isFinite(Number(v))
    ? txt("", s)
    : { v: Number(v), t: "n", z, s: { border: border(), alignment: { horizontal: "right" }, ...(s || {}) } };
const head = (v, bg = HEAD_BG) =>
  txt(v, { font: { bold: true, sz: 10 }, fill: { fgColor: { rgb: bg } }, alignment: { wrapText: true, vertical: "center" } });

const sheetFrom = (rows) => XLSX.utils.aoa_to_sheet(rows.map((r) => r.map((c) => (c == null ? txt("") : c))));

const widths = (ws, w) => { ws["!cols"] = w.map((x) => ({ wch: x })); return ws; };

const freeze = (ws, ref) => { ws["!freeze"] = { xSplit: 0, ySplit: 0, topLeftCell: ref }; return ws; };

/** Excel forbids : \ / ? * [ ] in sheet names and caps them at 31 chars. */
const safeSheetName = (s) => String(s).replace(/[:\\/?*[\]]/g, " ").slice(0, 31);

const IST = (d) => {
  if (!d) return "";
  const t = new Date(d);
  if (Number.isNaN(t.getTime())) return String(d);
  // Approval/quote timestamps are naive UTC out of Postgres; every other
  // surface renders them IST, so the export must too.
  return t.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
};

const nowIST = () =>
  new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

// ── shared derivations ────────────────────────────────────────────────────

const productsOf = (view) => (Array.isArray(view?.products) ? view.products : []);
const vendorsOf = (view) => (Array.isArray(view?.vendors) ? view.vendors : []);

const cellOf = (p, vid) => p?.quotes?.[vid] || null;

/**
 * `product.category` is a category ID, not a name — the page resolves it
 * against view.categories before displaying it. The export must do the same or
 * it prints a bare number where the screen shows "SERVICES".
 */
const categoryNameOf = (view, p) => {
  const cats = Array.isArray(view?.categories) ? view.categories : [];
  const hit = cats.find((c) => String(c.id) === String(p?.category));
  return hit ? hit.name : (p?.category ?? "");
};

/** A vendor that quoted every line can be ranked overall; a partial one cannot. */
const overallRanks = (vendors, products) => C.vendorRanks(vendors, products);

/**
 * The single lowest overall vendor — or null when nobody quoted every line.
 *
 * Deliberately null rather than "cheapest of whoever quoted most": a fabricated
 * overall L1 from partial coverage is the most dangerous number on a sheet like
 * this, because it reads as a decision. The basket L1 is reported instead.
 */
const overallL1Vendor = (vendors, products) => {
  const ranks = overallRanks(vendors, products);
  const winner = vendors.find((v) => ranks[v.id] === 1);
  return winner || null;
};

const awardedVendorFor = (p, vendors) =>
  p?.finalized_vendor ? vendors.find((v) => String(v.id) === String(p.finalized_vendor)) || null : null;

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT A — Comparison workbook
// ═══════════════════════════════════════════════════════════════════════════

function coverSheet(view, { basisNote }) {
  const rfq = view?.rfq || {};
  const products = productsOf(view);
  const vendors = vendorsOf(view);
  const m = view?.negotiation_metrics || null;
  const responded = C.coverageVendors(vendors, products);

  const rows = [
    [txt("Quote comparison", { font: { bold: true, sz: 16 } })],
    [txt("")],
    [head("RFQ"), txt(rfq.number ?? rfq.rfq_no ?? "")],
    [head("Title"), txt(rfq.title || "")],
    [head("Buyer"), txt(rfq.company || "")],
    [head("Business unit"), txt(rfq.hotel || "")],
    [head("Department"), txt(rfq.department || "")],
    [head("Status"), txt(rfq.status || "")],
    [txt("")],
    [head("Line items"), num(products.length, INT)],
    [head("Vendors invited"), num(rfq.quotes_invited, INT)],
    [head("Vendors responded"), num(responded, INT)],
    [head("Quotes received"), num(rfq.quotes_received, INT)],
    [head("Bid deadline"), txt(IST(view?.bid_end_date || rfq.deadline))],
    [txt("")],
    [head("Comparison basis"), txt(basisNote)],
    [head("Negotiation rounds run"), m ? num(m.rounds_ran, INT) : txt("—")],
    [txt("")],
    [head("Generated at (IST)"), txt(nowIST())],
    [
      txt("Note", { font: { italic: true, color: { rgb: NOTE_FG } } }),
      txt("Figures match the Quote Comparison screen exactly — both are produced by the same calculation.",
        { font: { italic: true, color: { rgb: NOTE_FG } } }),
    ],
  ];
  return widths(sheetFrom(rows), [26, 70]);
}

/** Per-vendor column block on the wide sheet. Vendor name repeats — no merges. */
const VENDOR_COLS = [
  ["Response", "s"],
  ["Unit base rate (₹)", "n"],
  ["Sub-total (₹)", "n"],
  ["Freight (₹)", "n"],
  ["Packaging (₹)", "n"],
  ["Other charges (₹)", "n"],
  ["GST %", "p"],
  ["GST amount (₹)", "n"],
  ["Line total (₹)", "n"],
  ["Rank", "s"],
  ["% above L1", "p"],
];

function comparisonSheet(view) {
  const products = productsOf(view);
  const vendors = vendorsOf(view);

  const r1 = [txt(""), txt(""), txt(""), txt(""), txt("")];
  const r2 = [head("Sl. No."), head("Product"), head("Category"), head("UOM"), head("Quantity")];
  r1.push(txt(""), txt(""));
  r2.push(head("Last purchase rate (₹)"), head("LPR value (₹)"));

  vendors.forEach((v) => {
    VENDOR_COLS.forEach(([label]) => {
      r1.push(head(v.name || v.short || `Vendor ${v.id}`, GROUP_BG));
      r2.push(head(label));
    });
  });

  ["L1 vendor", "L1 line total (₹)", "Awarded vendor", "Awarded value (₹)", "Award state"].forEach((h) => {
    r1.push(txt(""));
    r2.push(head(h));
  });

  const rows = [r1, r2];

  products.forEach((p, i) => {
    const ranks = C.productRanks(p, vendors);
    const l1v = C.l1VendorFor(p, vendors);
    const l1Total = C.l1TotalFor(p, vendors);
    const awarded = awardedVendorFor(p, vendors);

    const row = [
      num(i + 1, INT),
      txt(p.name || ""),
      txt(categoryNameOf(view, p)),
      txt(p.unit || ""),
      num(p.qty, INT),
      num(C.lprUnit(p)),
      num(C.lprTotalFor(p)),
    ];

    vendors.forEach((v) => {
      const q = cellOf(p, v.id);
      if (!q) {
        // NO BID, not zero — a zero would sort as the winner.
        row.push(txt(NO_BID, { font: { color: { rgb: NOTE_FG } } }));
        for (let k = 1; k < VENDOR_COLS.length; k += 1) row.push(txt(""));
        return;
      }
      const line = C.cellLineTotal(p, v.id);
      const rank = ranks[v.id] ?? null;
      const isL1 = rank === 1;
      const winStyle = isL1 ? { fill: { fgColor: { rgb: WIN_BG } } } : undefined;
      const other = (q.other_charges || []).reduce((s, c) => s + (Number(c.amount) || 0), 0);

      row.push(txt("Quoted"));
      row.push(num(q.base));
      row.push(num(C.cellSubtotal(p, v.id)));
      row.push(num(q.freight));
      row.push(num(q.packaging));
      row.push(num(other));
      row.push(num(q.tax_pct, PCT));
      row.push(num(C.cellTaxAmt(p, v.id)));
      row.push(num(line, MONEY, winStyle));
      row.push(txt(rank ? `L${rank}` : "", winStyle));
      row.push(num(l1Total > 0 && line != null ? ((line - l1Total) / l1Total) * 100 : null, PCT));
    });

    row.push(txt(l1v ? (vendors.find((v) => v.id === l1v)?.name ?? "") : ""));
    row.push(num(l1Total));
    row.push(txt(awarded ? awarded.name : ""));
    row.push(num(awarded ? C.cellLineTotal(p, awarded.id) : null));
    row.push(txt(p.state || ""));

    rows.push(row);
  });

  // Footer: the three figures the screen shows under the matrix, plus basket L1.
  const spacer = new Array(7).fill(txt(""));
  const footer = (label, pick) => {
    const r = [head(label), ...new Array(6).fill(txt(""))];
    vendors.forEach((v) => {
      for (let k = 0; k < VENDOR_COLS.length; k += 1) {
        r.push(k === VENDOR_COLS.length - 3 ? num(pick(v.id)) : txt(""));
      }
    });
    return r;
  };
  rows.push(spacer);
  rows.push(footer("Line items subtotal (₹)", (vid) => C.vendorTotalBreakdown(vid, products).lines));
  rows.push(footer("Global charges (₹)", (vid) => C.vendorTotalBreakdown(vid, products).globals));
  rows.push(footer("Vendor total (₹)", (vid) => C.vendorTotal(vid, products)));

  const basket = [head("Lowest achievable (basket L1) (₹)"), ...new Array(5).fill(txt("")), num(C.l1GrandTotal(vendors, products))];
  rows.push(basket);

  const ws = sheetFrom(rows);
  widths(ws, [8, 40, 18, 10, 10, 16, 16, ...vendors.flatMap(() => VENDOR_COLS.map(() => 15)), 22, 18, 22, 18, 14]);
  // Scope columns and both header rows stay visible while scrolling a wide grid.
  freeze(ws, "H3");
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 1, c: 0 }, e: { r: 1 + products.length, c: rows[1].length - 1 } }) };
  return ws;
}

/** Long / tidy: one row per product × vendor. The sheet people pivot. */
function lineDetailSheet(view) {
  const products = productsOf(view);
  const vendors = vendorsOf(view);
  const rfq = view?.rfq || {};

  const header = [
    "RFQ", "Sl. No.", "Product", "Category", "UOM", "Quantity",
    "Vendor", "Response status",
    "Unit base rate (₹)", "Sub-total (₹)", "Freight (₹)", "Packaging (₹)",
    "Other charges (₹)", "GST %", "GST amount (₹)", "Line total (₹)",
    "Landed unit rate (₹)", "Rank", "Is L1", "% above L1",
    "Delivery (days)", "Payment terms", "Vendor comment", "Documents",
    "Missing costs", "Negotiation rounds", "Awarded", "Award state",
    "Last purchase rate (₹)",
  ].map((h) => head(h));

  const rows = [header];

  products.forEach((p, i) => {
    const ranks = C.productRanks(p, vendors);
    const l1Total = C.l1TotalFor(p, vendors);

    vendors.forEach((v) => {
      const q = cellOf(p, v.id);
      const line = q ? C.cellLineTotal(p, v.id) : null;
      const rank = q ? ranks[v.id] ?? null : null;
      const other = q ? (q.other_charges || []).reduce((s, c) => s + (Number(c.amount) || 0), 0) : null;

      rows.push([
        txt(rfq.number ?? rfq.rfq_no ?? ""),
        num(i + 1, INT),
        txt(p.name || ""),
        txt(categoryNameOf(view, p)),
        txt(p.unit || ""),
        num(p.qty, INT),
        txt(v.name || v.short || `Vendor ${v.id}`),
        txt(q ? "Quoted" : NO_BID),
        num(q ? q.base : null),
        num(q ? C.cellSubtotal(p, v.id) : null),
        num(q ? q.freight : null),
        num(q ? q.packaging : null),
        num(other),
        num(q ? q.tax_pct : null, PCT),
        num(q ? C.cellTaxAmt(p, v.id) : null),
        num(line),
        num(q ? C.landedLinePerUnit(p, v.id) : null),
        txt(rank ? `L${rank}` : ""),
        txt(rank === 1 ? "Yes" : q ? "No" : ""),
        num(q && l1Total > 0 && line != null ? ((line - l1Total) / l1Total) * 100 : null, PCT),
        num(q?.delivery ?? null, INT),
        txt(q?.pay ?? ""),
        txt(q?.comment ?? ""),
        num(q?.docs ?? null, INT),
        txt(q?.missing ? "Yes" : q ? "No" : ""),
        num(q ? (q.history || []).length : null, INT),
        txt(String(p.finalized_vendor ?? "") === String(v.id) ? "Yes" : ""),
        txt(String(p.finalized_vendor ?? "") === String(v.id) ? p.state || "" : ""),
        num(C.lprUnit(p)),
      ]);
    });
  });

  const ws = sheetFrom(rows);
  widths(ws, [12, 8, 38, 18, 8, 10, 26, 15, 15, 15, 13, 13, 15, 10, 15, 15, 16, 8, 8, 12, 13, 26, 34, 11, 13, 16, 10, 14, 18]);
  freeze(ws, "A2");
  return ws;
}

/**
 * One row per product × vendor × round.
 *
 * Round 0 is the vendor's original quote, so "what did negotiation move" is
 * computable from the sheet rather than asserted by it.
 *
 * UNIT RATE vs LINE TOTAL: the server emits `history[].price` as
 * `unit_price ?? total_price` — a UNIT RATE whenever a unit price exists — and
 * carries the line total separately as `history[].total_price`. Both are
 * printed, each under its own header, and the deltas are computed on the line
 * total (falling back to the rate only when no total was recorded). Reading
 * `price` as a line total is the mistake this comment exists to prevent: it
 * yields deltas that look entirely plausible and are wrong by the quantity.
 */
function negotiationLogSheet(view) {
  const products = productsOf(view);
  const vendors = vendorsOf(view);

  const rows = [[
    "Sl. No.", "Product", "Vendor", "Round", "Round label",
    "Quoted unit rate (₹)", "Quoted line total (₹)",
    "Δ vs previous round (₹)", "Δ vs previous round %", "Δ vs original (₹)", "Δ vs original %",
    "Recorded at (IST)", "Note",
  ].map((h) => head(h))];

  products.forEach((p, i) => {
    vendors.forEach((v) => {
      const q = cellOf(p, v.id);
      const hist = Array.isArray(q?.history) ? q.history : [];
      if (!hist.length) return;

      // Compare on the line total; fall back to the unit rate only when the
      // server recorded no total, and never mix the two within one delta.
      const amountOf = (h) => {
        const t = Number(h?.total_price);
        return Number.isFinite(t) ? t : Number(h?.price);
      };
      const first = amountOf(hist[0]);
      hist.forEach((h, hi) => {
        const price = amountOf(h);
        const prev = hi > 0 ? amountOf(hist[hi - 1]) : null;
        const dPrev = hi > 0 && Number.isFinite(prev) && Number.isFinite(price) ? price - prev : null;
        const dFirst = Number.isFinite(first) && Number.isFinite(price) ? price - first : null;
        rows.push([
          num(i + 1, INT),
          txt(p.name || ""),
          txt(v.name || v.short || `Vendor ${v.id}`),
          num(hi, INT),
          txt(hi === 0 ? "Original quote" : `Round ${h.round ?? hi}`),
          num(h.price),
          num(Number.isFinite(Number(h.total_price)) ? Number(h.total_price) : null),
          num(dPrev),
          num(dPrev != null && prev ? (dPrev / prev) * 100 : null, PCT),
          num(dFirst),
          num(dFirst != null && first ? (dFirst / first) * 100 : null, PCT),
          txt(IST(h.date)),
          txt(h.note ?? ""),
        ]);
      });
    });
  });

  if (rows.length === 1) {
    rows.push([txt("No negotiation rounds were recorded for this RFQ.", { font: { italic: true, color: { rgb: NOTE_FG } } })]);
  }

  const ws = sheetFrom(rows);
  widths(ws, [8, 38, 26, 8, 18, 18, 20, 20, 20, 18, 18, 22, 40]);
  freeze(ws, "A2");
  return ws;
}

function notesSheet(basisNote) {
  const rows = [
    [txt("Notes & definitions", { font: { bold: true, sz: 14 } })],
    [txt("")],
    [head("Line total"), txt("Sub-total + GST + other charges for that product line. Quote-level global charges are NOT in it — they are shown once per vendor in the Comparison footer.")],
    [head("Rank / L1"), txt("Per line, vendors ordered by their quote total, cheapest first. L1 is the cheapest quote for that line.")],
    [head("Overall L1 vendor"), txt("Only a vendor that quoted EVERY line can be ranked overall. If nobody did, the overall L1 is left blank and 'Lowest achievable (basket L1)' is reported instead.")],
    [head("Lowest achievable (basket L1)"), txt("The sum of the cheapest quote for each line, taken across vendors. A theoretical floor — it assumes splitting the award line by line.")],
    [head("NO BID"), txt("The vendor did not quote that line. Deliberately not 0, which would sort as the cheapest and distort any average.")],
    [head("Comparison basis"), txt(basisNote)],
    [head("Last purchase rate"), txt("The previously paid rate held against the product, used as the reference baseline on the screen.")],
    [head("Negotiation log"), txt("Round 0 is the vendor's original quote. Unit rate and line total are shown in separate columns; the deltas are computed on the line total.")],
    [head("Timestamps"), txt("Shown in IST (Asia/Kolkata).")],
    [txt("")],
    [txt("Every figure here is produced by the same calculation that renders the Quote Comparison screen, so the workbook and the page always agree.", { font: { italic: true, color: { rgb: NOTE_FG } } })],
  ];
  return widths(sheetFrom(rows), [30, 110]);
}

export function buildComparisonWorkbook(view) {
  const basisNote = "Landed cost, GST inclusive. Input tax credit is not netted off.";
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, coverSheet(view, { basisNote }), "Cover");
  XLSX.utils.book_append_sheet(wb, comparisonSheet(view), "Comparison");
  XLSX.utils.book_append_sheet(wb, lineDetailSheet(view), "Line Detail");
  XLSX.utils.book_append_sheet(wb, negotiationLogSheet(view), "Negotiation Log");
  XLSX.utils.book_append_sheet(wb, notesSheet(basisNote), "Notes");
  return wb;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORT B — Summary workbook
// ═══════════════════════════════════════════════════════════════════════════

const section = (title) => [head(title, GROUP_BG), txt(""), txt("")];
const metric = (label, cell, note) => [txt(label), cell, txt(note || "", { font: { color: { rgb: NOTE_FG } } })];

export function buildSummaryWorkbook(view) {
  const rfq = view?.rfq || {};
  const products = productsOf(view);
  const vendors = vendorsOf(view);
  const m = view?.negotiation_metrics || null;

  const counts = C.stateCounts(products);
  const l1Grand = C.l1GrandTotal(vendors, products);
  const finalized = C.finalizedGrandTotal(products);
  const baseline = C.baselineTotal(products);
  const potential = C.potentialSavings(vendors, products);
  const responded = C.coverageVendors(vendors, products);
  const invited = Number(rfq.quotes_invited) || 0;
  const l1Vendor = overallL1Vendor(vendors, products);

  // Award quality: what the awarded set costs against the theoretical floor.
  const awardedTotal = finalized;
  const awardVsBasket = awardedTotal > 0 ? awardedTotal - l1Grand : null;

  const linesWithThree = products.filter(
    (p) => vendors.filter((v) => cellOf(p, v.id)).length >= 3
  ).length;

  const quotedCells = products.reduce(
    (s, p) => s + vendors.filter((v) => cellOf(p, v.id)).length, 0
  );
  const coveragePct = products.length && vendors.length
    ? (quotedCells / (products.length * vendors.length)) * 100
    : null;

  const rows = [
    [txt("Quote comparison — summary", { font: { bold: true, sz: 16 } })],
    [txt("")],
    ...[
      ["RFQ", txt(String(rfq.number ?? rfq.rfq_no ?? ""))],
      ["Title", txt(rfq.title || "")],
      ["Business unit", txt(rfq.hotel || "")],
      ["Comparison basis", txt("Landed cost, GST inclusive")],
      ["Generated at (IST)", txt(nowIST())],
    ].map(([l, c]) => [txt(l), c, txt("")]),
    [txt("")],

    section("Participation"),
    metric("Line items", num(products.length, INT)),
    metric("Vendors invited", num(invited, INT)),
    metric("Vendors responded", num(responded, INT)),
    metric("Participation rate", num(invited ? (responded / invited) * 100 : null, PCT)),
    metric("Quote coverage", num(coveragePct, PCT), "Quoted cells ÷ (line items × vendors)"),
    metric("Lines with 3+ quotes", num(linesWithThree, INT), "Standard adequacy-of-competition check"),
    [txt("")],

    section("Value"),
    metric("Lowest achievable (basket L1)", num(l1Grand), "Sum of the cheapest quote per line"),
    metric("Overall L1 vendor", txt(l1Vendor ? l1Vendor.name : "—"),
      l1Vendor ? "" : "No single vendor quoted every line — compare on basket L1"),
    metric("Overall L1 vendor total", num(l1Vendor ? C.vendorTotal(l1Vendor.id, products) : null)),
    metric("Awarded / selected value", num(awardedTotal || null)),
    metric("Award vs basket L1", num(awardVsBasket),
      "Positive means the award costs more than the line-by-line floor"),
    metric("Last purchase rate baseline", num(baseline || null)),
    metric("Potential vs last purchase rate", num(potential || null),
      "Baseline (LPR) − basket L1. Indicative, not realised savings"),
    [txt("")],

    section("Award status"),
    metric("Lines total", num(counts.total, INT)),
    metric("Approved", num(counts.approved, INT)),
    metric("Pending approval", num(counts.pending, INT)),
    metric("Rejected", num(counts.rejected, INT)),
    metric("Not finalised", num(counts.open, INT)),
    metric("Risk flags (missing costs)", num(C.riskFlagCount(vendors, products), INT)),
    [txt("")],

    section("Negotiation"),
    metric("Rounds created", m ? num(m.rounds_created, INT) : txt("—")),
    metric("Rounds run", m ? num(m.rounds_ran, INT) : txt("—"), "Excludes cancelled rounds"),
    metric("Rounds cancelled", m ? num(m.rounds_cancelled, INT) : txt("—")),
    metric("Lines negotiated", m ? num(m.products_negotiated, INT) : txt("—")),
    metric("Pre-negotiation value", m && m.available ? num(m.baseline_total) : txt("—")),
    metric("Post-negotiation value", m && m.available ? num(m.achieved_total) : txt("—")),
    metric("Negotiation gain", m && m.available ? num(m.gain_value) : txt("—"),
      m && m.available ? "Negative means prices rose" : "Not measurable — no comparable baseline"),
    metric("Negotiation gain %", m && m.available ? num(m.gain_pct, PCT) : txt("—")),
    metric("Negotiation gain (awarded lines only)",
      m && m.available ? num(m.gain_value_awarded) : txt("—"),
      "The figure that reflects money actually committed"),
  ];

  const summary = widths(sheetFrom(rows), [38, 24, 60]);

  // Definitions: what makes the numbers defensible rather than arguable.
  const defs = [
    [txt("Definitions", { font: { bold: true, sz: 14 } })],
    [txt("")],
    [head("Metric"), head("Definition"), head("Grade")],
    [txt("Basket L1"), txt("Σ over lines of the cheapest vendor quote for that line."), txt("Factual")],
    [txt("Overall L1 vendor"), txt("The lowest-total vendor among those that quoted EVERY line. Blank when none did — a single L1 inferred from partial coverage would be misleading."), txt("Factual")],
    [txt("Award vs basket L1"), txt("Awarded value − basket L1. Zero for a pure line-by-line L1 award; anything positive should have an award reason."), txt("Factual")],
    [txt("Potential vs last purchase rate"), txt("LPR baseline − basket L1. A comparison against previously paid rates, before any award or negotiation."), txt("Indicative")],
    [txt("Negotiation gain"), txt("Pre-negotiation value − post-negotiation value, per vendor and line, summed. Baseline is the vendor's own earlier price (previous round, or the original quote from price history)."), txt("Indicative — cost avoidance, not P&L savings")],
    [txt("Negotiation gain (awarded)"), txt("The same measure restricted to lines that were actually awarded."), txt("Indicative")],
    [txt("Rounds run"), txt("Distinct negotiation rounds on this RFQ excluding cancelled ones. ARC rounds are excluded."), txt("Factual")],
    [txt("")],
    [txt("Why 'gain' and not 'savings': this measures price movement inside the event, against the vendor's own opening number. It is real and fully evidenced by the Negotiation Log, but it is not a P&L saving, which would require a baseline of what was previously paid under contract.",
      { font: { italic: true, color: { rgb: NOTE_FG } } })],
    [txt("This figure uses the same calculation as the negotiation dashboard, so the two always agree.",
      { font: { italic: true, color: { rgb: NOTE_FG } } })],
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summary, "Summary");
  XLSX.utils.book_append_sheet(wb, widths(sheetFrom(defs), [34, 96, 22]), "Definitions");
  return wb;
}

// ── download wrappers ─────────────────────────────────────────────────────

const fileBase = (view) => {
  const rfq = view?.rfq || {};
  return String(rfq.number ?? rfq.rfq_no ?? rfq.id ?? "rfq").replace(/[^\w-]+/g, "_");
};

const save = (wb, name) => {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), name);
};

export function downloadComparisonWorkbook(view) {
  save(buildComparisonWorkbook(view), `RFQ_${fileBase(view)}_quote_comparison.xlsx`);
}

export function downloadSummaryWorkbook(view) {
  save(buildSummaryWorkbook(view), `RFQ_${fileBase(view)}_summary.xlsx`);
}

export const __test__ = { safeSheetName, NO_BID, MONEY, PCT };
