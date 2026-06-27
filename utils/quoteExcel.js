/* ────────────────────────────────────────────────────────────────────────
   quoteExcel.js — client-side Excel export for the vendor SendQuoteWizard.

   Produces a LIVE, formula-driven .xlsx that mirrors the backend pricing
   engine (app/services/pricingEngine.js → /pricing/preview). Every total is a
   real Excel formula referencing the input cells, so editing a unit price /
   charge in Excel recalculates the line and grand totals. We seed each formula
   cell's CACHED value from `pricingTotals` (the actual engine response the page
   already holds), so the file shows the exact same numbers as the page even
   before Excel recomputes.

   Per-line math replicated (pricingEngine.js calculateLineTotal):
     base       = unit_price × qty
     base_tax   = mode='percentage' ? base×tax/100 : tax
     charge amt = mode='percentage' ? base×amount/100 : amount
     charge tax = blank → inherit base rate (only if base mode % and rate>0)
                  explicit (incl. 0) → mode='percentage' ? amt×tax/100 : tax
     charges_total = Σ (amt + tax)         (raw)
     line_total = ROUND(base + base_tax + charges_total, 2)
   Document (calculateDocumentTotals):
     grand_subtotal       = Σ line_total
     global charge amount = mode='percentage' ? grand_subtotal×amount/100 : amount
     global_charges_total = ROUND(Σ amount, 2)
     grand_total          = ROUND(grand_subtotal + global_charges_total, 2)
   ──────────────────────────────────────────────────────────────────────── */

import * as XLSX from "xlsx-js-style";
import { saveAs } from "file-saver";

const MONEY_FMT = '"₹"#,##0.00';   // rupee amounts, e.g. ₹20,000.00
// Percentage format. Whole numbers use 0"%" (→ "18%"); decimals use 0.##"%"
// (→ "0.1%"). Avoids the trailing-dot artifact some viewers (WPS) show for
// 0.##"%" on integers (e.g. "18.%").
const pctFmt = (v) => (Number.isInteger(Number(v)) ? '0"%"' : '0.##"%"');
const COLS_PER_CHARGE = 5; // name, amount, charge GST, → amt, → GST
const MAX_CHARGE_SLOTS = 8; // safety cap on charge columns

/* ── palette ─────────────────────────────────────────────────────────── */
const FILL = {
  header: "1F2937", // slate-800
  input: "FEF3C7", // amber-100 (editable)
  computed: "F1F5F9", // slate-100 (formula)
  helper: "F8FAFC",
  total: "065F46", // emerald-800
  band: "E2E8F0",
};
const thin = { style: "thin", color: { rgb: "CBD5E1" } };
const BORDER = { top: thin, bottom: thin, left: thin, right: thin };

const num = (v) => {
  if (v === "" || v == null) return 0;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const A = (r, c) => XLSX.utils.encode_cell({ r, c }); // 0-based → "A1"

/* Cell helpers — write into a plain sheet object, tracking the used range. */
function makeSheet() {
  return { _maxR: 0, _maxC: 0 };
}
function put(ws, r, c, spec) {
  const cell = {};
  if (spec.f != null) {
    cell.t = spec.t || "n";
    cell.f = spec.f;
    if (spec.v != null) cell.v = spec.v;
  } else {
    const v = spec.v;
    cell.t = spec.t || (typeof v === "number" ? "n" : "s");
    cell.v = v == null ? "" : v;
  }
  if (spec.z) cell.z = spec.z;
  if (spec.s) cell.s = spec.s;
  ws[A(r, c)] = cell;
  if (r > ws._maxR) ws._maxR = r;
  if (c > ws._maxC) ws._maxC = c;
  return cell;
}
function style({ fill, bold, color, align, wrap, size, italic } = {}) {
  const s = { border: BORDER };
  if (fill) s.fill = { patternType: "solid", fgColor: { rgb: fill } };
  s.font = {};
  if (bold) s.font.bold = true;
  if (italic) s.font.italic = true;
  if (color) s.font.color = { rgb: color };
  if (size) s.font.sz = size;
  s.alignment = {
    vertical: "center",
    horizontal: align || "left",
    wrapText: !!wrap,
  };
  return s;
}
const headerStyle = (align = "center") =>
  style({ fill: FILL.header, bold: true, color: "FFFFFF", align, wrap: true });
const inputStyle = (align = "center") => style({ fill: FILL.input, align });
const computedStyle = (align = "right") => style({ fill: FILL.computed, align });
const helperStyle = () => style({ fill: FILL.helper, align: "right", color: "94A3B8", size: 9 });

/* ── main entry ──────────────────────────────────────────────────────── */
export function buildQuoteWorkbook({
  rfq,
  products = [],
  globalCharges = [],
  pricingTotals,
  vendorGSTIN = "",
  showTechEvalRestrictions = false,
}) {
  const wb = XLSX.utils.book_new();
  const calc = buildCalcSheet({
    rfq,
    products,
    globalCharges,
    pricingTotals,
    vendorGSTIN,
    showTechEvalRestrictions,
  });
  XLSX.utils.book_append_sheet(wb, calc, "Quote Calculation");
  XLSX.utils.book_append_sheet(wb, buildReferenceSheet(), "Formula Reference");
  return wb;
}

/**
 * Build, then download the workbook. Returns the suggested filename.
 */
export function downloadQuoteExcel(args) {
  const wb = buildQuoteWorkbook(args);
  const rfqNo = args?.rfq?.rfq_no || args?.rfq?.id || "quote";
  const fileName = `Quote_Calculation_${String(rfqNo).replace(/[^\w-]+/g, "-")}.xlsx`;
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(
    new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    fileName
  );
  return fileName;
}

/* ── calculation sheet ───────────────────────────────────────────────── */
function buildCalcSheet({
  rfq,
  products,
  globalCharges,
  pricingTotals,
  vendorGSTIN,
  showTechEvalRestrictions,
}) {
  const ws = makeSheet();
  const lines = pricingTotals?.lines || [];

  // Each product's named charges (mirrors the preview-draft filter so per-charge
  // cells line up index-for-index with the engine's `line.charges`).
  const productCharges = products.map((p) =>
    (p.other_charges || []).filter((c) => c.name && c.name.trim())
  );
  const nSlots = Math.min(
    MAX_CHARGE_SLOTS,
    Math.max(1, ...productCharges.map((cs) => cs.length), 1)
  );

  // Column geometry (0-based). No mode columns: each rate/amount cell carries
  // its unit (% or ₹) via its number format, and formulas bake the original
  // mode in — so the sheet stays editable without separate mode columns.
  const C = {
    product: 0,
    unitPrice: 1,
    qty: 2,
    unit: 3,        // UOM (box, nos, …) — placed after Qty
    gst: 4,         // base GST rate (shown as % or ₹ per the line's mode)
    base: 5,
    baseGst: 6,
  };
  const firstChargeCol = 7;
  const chargeCol = (k, off) => firstChargeCol + k * COLS_PER_CHARGE + off;
  const chargesTotalCol = firstChargeCol + nSlots * COLS_PER_CHARGE;
  const lineTotalCol = chargesTotalCol + 1;
  const lastCol = lineTotalCol;
  const fmtForMode = (mode, value) => (mode === "absolute" ? MONEY_FMT : pctFmt(value));
  const baseColL = XLSX.utils.encode_col(C.base);
  const gstColL = XLSX.utils.encode_col(C.gst);

  /* — title / meta block — */
  put(ws, 0, 0, { v: "Vendor Quote — Pricing Calculation", s: style({ bold: true, size: 15, color: "1F2937" }) });
  put(ws, 1, 0, { v: `RFQ / Tender No: ${rfq?.rfq_no ?? rfq?.id ?? "—"}`, s: style({ size: 10, color: "334155" }) });
  put(ws, 1, 3, { v: `GSTIN: ${vendorGSTIN || "—"}`, s: style({ size: 10, color: "334155" }) });
  put(ws, 2, 0, {
    v: `Tech-eval restrictions: ${showTechEvalRestrictions ? "ON" : "OFF"}`,
    s: style({ size: 10, color: "334155" }),
  });
  put(ws, 3, 0, {
    v: "Amber cells are inputs — edit them in Excel and totals recalculate. Rates show % or ₹ as per the submitted quote. See the Formula Reference tab.",
    s: style({ italic: true, size: 9, color: "64748B", wrap: true }),
  });

  /* — table header — */
  const HROW = 5;
  const headers = [
    [C.product, "Product"],
    [C.unitPrice, "Unit Price"],
    [C.qty, "Qty"],
    [C.unit, "Unit"],
    [C.gst, "GST"],
    [C.base, "Base\n(=Unit Price×Qty)"],
    [C.baseGst, "Base GST"],
  ];
  headers.forEach(([c, label]) =>
    put(ws, HROW, c, { v: label, s: headerStyle(c === C.product ? "left" : "center") })
  );
  for (let k = 0; k < nSlots; k++) {
    const labels = [
      `Charge ${k + 1} Name`,
      "Amount",
      "Charge Tax",
      "→ Amt",
      "→ Tax",
    ];
    labels.forEach((lab, off) => put(ws, HROW, chargeCol(k, off), { v: lab, s: headerStyle() }));
  }
  put(ws, HROW, chargesTotalCol, { v: "Charges Total", s: headerStyle() });
  put(ws, HROW, lineTotalCol, { v: "LINE TOTAL", s: headerStyle() });

  /* — product rows — */
  const firstDataRow = HROW + 1;
  products.forEach((p, i) => {
    const r = firstDataRow + i;
    const xl = r + 1; // 1-based Excel row
    const line = lines[i] || {};
    const isLocked = showTechEvalRestrictions && p.has_tech_eval && !p.tech_eval_accepted;
    const baseMode = p.tax_mode || "percentage";

    put(ws, r, C.product, {
      v: (p.product_name || "Untitled") + (isLocked ? "  (tech-eval pending)" : ""),
      s: inputStyle("left"),
    });
    put(ws, r, C.unit, { v: p.unit || "", s: inputStyle() });
    put(ws, r, C.unitPrice, { v: num(p.unit_price), z: MONEY_FMT, s: inputStyle() });
    put(ws, r, C.qty, { v: num(p.qty), s: inputStyle() });
    // Base GST rate — unit (% or ₹) shown via number format per the line's mode.
    put(ws, r, C.gst, { v: num(p.tax), z: fmtForMode(baseMode, p.tax), s: inputStyle() });

    // Base = Unit Price × Qty
    put(ws, r, C.base, {
      f: `${A(r, C.unitPrice)}*${A(r, C.qty)}`,
      v: round2(line.base ?? num(p.unit_price) * num(p.qty)),
      z: MONEY_FMT,
      s: computedStyle(),
    });
    // Base GST amount — percentage: Base×GST/100 ; absolute: flat GST.
    put(ws, r, C.baseGst, {
      f: baseMode === "percentage" ? `${A(r, C.base)}*${A(r, C.gst)}/100` : `${A(r, C.gst)}`,
      v: round2(line.base_tax),
      z: MONEY_FMT,
      s: computedStyle(),
    });

    const charges = productCharges[i] || [];
    const sumParts = [];
    for (let k = 0; k < nSlots; k++) {
      const amtAddr = A(r, chargeCol(k, 1));
      const taxAddr = A(r, chargeCol(k, 2));
      const helpAmtAddr = A(r, chargeCol(k, 3));
      const helpTaxAddr = A(r, chargeCol(k, 4));
      const ch = charges[k];
      const engCh = (line.charges || [])[k] || {};

      if (!ch) {
        // Empty slot — blank inputs, zero contribution.
        put(ws, r, chargeCol(k, 0), { v: "", s: inputStyle("left") });
        put(ws, r, chargeCol(k, 1), { v: "", s: inputStyle() });
        put(ws, r, chargeCol(k, 2), { v: "", s: inputStyle() });
        put(ws, r, chargeCol(k, 3), { v: 0, z: MONEY_FMT, s: helperStyle() });
        put(ws, r, chargeCol(k, 4), { v: 0, z: MONEY_FMT, s: helperStyle() });
        sumParts.push(helpAmtAddr, helpTaxAddr);
        continue;
      }

      const amtMode = ch.amount_mode || "percentage";
      const taxBlank = ch.tax == null || ch.tax === "";
      const chgTaxMode = ch.tax_mode || "percentage";
      // Effective tax: an inherited (blank) charge tax takes the base GST rate,
      // so we SHOW that rate (e.g. 18%) rather than leaving it blank. When the
      // base GST is a percentage we reference its cell so it stays live; an
      // absolute base GST doesn't propagate a rate to charges (engine → 0).
      const inheritPct = taxBlank && baseMode === "percentage";

      put(ws, r, chargeCol(k, 0), { v: ch.name, s: inputStyle("left") });
      // Amount — unit (% or ₹) per its mode.
      put(ws, r, chargeCol(k, 1), { v: num(ch.amount), z: fmtForMode(amtMode, ch.amount), s: inputStyle() });
      // Charge Tax — shows the effective rate (explicit, or the inherited base GST).
      if (!taxBlank) {
        put(ws, r, chargeCol(k, 2), { v: num(ch.tax), z: fmtForMode(chgTaxMode, ch.tax), s: inputStyle() });
      } else if (inheritPct) {
        put(ws, r, chargeCol(k, 2), { f: `$${gstColL}${xl}`, v: num(p.tax), z: pctFmt(p.tax), s: inputStyle() });
      } else {
        put(ws, r, chargeCol(k, 2), { v: 0, z: pctFmt(0), s: inputStyle() });
      }

      // → Amt: percentage → Base×amt/100 ; absolute → amt.
      put(ws, r, chargeCol(k, 3), {
        f: amtMode === "percentage" ? `$${baseColL}${xl}*${amtAddr}/100` : `${amtAddr}`,
        v: round2(engCh.amount),
        z: MONEY_FMT,
        s: helperStyle(),
      });
      // → Tax: percentage rate (explicit % or inherited) → amt×rate/100 ;
      // explicit absolute → flat amount.
      const taxIsPercent = inheritPct || (!taxBlank && chgTaxMode === "percentage");
      const taxFormula = taxIsPercent
        ? `${helpAmtAddr}*${taxAddr}/100`
        : (!taxBlank ? `${taxAddr}` : `0`);
      put(ws, r, chargeCol(k, 4), {
        f: taxFormula,
        v: round2(engCh.tax),
        z: MONEY_FMT,
        s: helperStyle(),
      });

      sumParts.push(helpAmtAddr, helpTaxAddr);
    }

    // Charges total (raw sum of helper amt+tax)
    put(ws, r, chargesTotalCol, {
      f: sumParts.join("+") || "0",
      v: round2(line.charges_total),
      z: MONEY_FMT,
      s: computedStyle(),
    });
    // Line total = ROUND(base + base GST + charges total, 2)
    put(ws, r, lineTotalCol, {
      f: `ROUND(${A(r, C.base)}+${A(r, C.baseGst)}+${A(r, chargesTotalCol)},2)`,
      v: round2(line.total),
      z: MONEY_FMT,
      s: style({ fill: FILL.computed, bold: true, color: "065F46", align: "right" }),
    });
  });
  const lastDataRow = firstDataRow + products.length - 1;
  const lineTotalColLetter = XLSX.utils.encode_col(lineTotalCol);

  /* — Grand subtotal (placed above globals so they can reference it) — */
  let r = lastDataRow + 2;
  put(ws, r, 0, { v: "Grand Subtotal (Σ Line Totals)", s: style({ bold: true, color: "1F2937" }) });
  const gsRow = r;
  put(ws, r, 1, {
    f: `SUM(${lineTotalColLetter}${firstDataRow + 1}:${lineTotalColLetter}${lastDataRow + 1})`,
    v: round2(pricingTotals?.grand_subtotal),
    z: MONEY_FMT,
    s: style({ fill: FILL.computed, bold: true, align: "right" }),
  });
  const GS = `$B$${gsRow + 1}`; // absolute ref to grand-subtotal value cell

  /* — Global charges table — */
  r += 2;
  put(ws, r, 0, { v: "Document-Level Global Charges (applied on Grand Subtotal)", s: style({ bold: true, size: 12, color: "1F2937" }) });
  r += 1;
  const gHeadRow = r;
  // Global charges carry their OWN tax (e.g. GST on TCS). Units (% or ₹) are
  // baked into each value's format; modes are baked into the formulas. Columns:
  // A Name | B Amount | C Add'l Tax | D → Amount | E → Tax | F Subtotal(=D+E).
  ["Name", "Amount", "Add'l Tax", "→ Amount", "→ Tax", "Subtotal"].forEach((h, c) =>
    put(ws, gHeadRow, c, { v: h, s: headerStyle(c === 0 ? "left" : "center") })
  );
  const engGlobals = pricingTotals?.global_charges || [];
  const namedGlobals = (globalCharges || []).filter((c) => c.name && c.name.trim());
  const gFirst = gHeadRow + 1;
  const GC_SUBTOTAL_COL = XLSX.utils.encode_col(5); // "F"
  namedGlobals.forEach((g, i) => {
    const rr = gFirst + i;
    const eng = engGlobals[i] || {};
    // The wizard stores the global-charge tax as extra_tax / extra_tax_mode.
    const gAmtMode = g.amount_mode || "percentage";
    const addTaxBlank = g.extra_tax == null || g.extra_tax === "";
    const gTaxMode = g.extra_tax_mode || "percentage";
    const amtAddr = A(rr, 1);
    const taxAddr = A(rr, 2);
    const helpAmtAddr = A(rr, 3);
    put(ws, rr, 0, { v: g.name, s: inputStyle("left") });
    put(ws, rr, 1, { v: num(g.amount), z: fmtForMode(gAmtMode, g.amount), s: inputStyle() });
    put(ws, rr, 2, addTaxBlank
      ? { v: "", s: inputStyle() }
      : { v: num(g.extra_tax), z: fmtForMode(gTaxMode, g.extra_tax), s: inputStyle() });
    // → Amount: charge amount applied on the grand subtotal.
    put(ws, rr, 3, {
      f: gAmtMode === "percentage" ? `${GS}*${amtAddr}/100` : `${amtAddr}`,
      v: round2(eng.amount),
      z: MONEY_FMT,
      s: helperStyle(),
    });
    // → Tax: additional tax on the charge amount.
    put(ws, rr, 4, {
      f: addTaxBlank ? `0` : (gTaxMode === "percentage" ? `${helpAmtAddr}*${taxAddr}/100` : `${taxAddr}`),
      v: round2(eng.additional_tax),
      z: MONEY_FMT,
      s: helperStyle(),
    });
    // Subtotal = amount + additional tax.
    put(ws, rr, 5, {
      f: `${A(rr, 3)}+${A(rr, 4)}`,
      v: round2(eng.subtotal ?? (Number(eng.amount || 0) + Number(eng.additional_tax || 0))),
      z: MONEY_FMT,
      s: computedStyle(),
    });
  });
  const gLast = gFirst + namedGlobals.length - 1;
  const hasGlobals = namedGlobals.length > 0;

  /* — totals — */
  r = (hasGlobals ? gLast : gHeadRow) + 2;
  put(ws, r, 0, { v: "Global Charges Total", s: style({ bold: true, color: "1F2937" }) });
  const gctRow = r;
  put(ws, r, 1, {
    f: hasGlobals ? `ROUND(SUM(${GC_SUBTOTAL_COL}${gFirst + 1}:${GC_SUBTOTAL_COL}${gLast + 1}),2)` : "0",
    v: round2(pricingTotals?.global_charges_total),
    z: MONEY_FMT,
    s: style({ fill: FILL.computed, bold: true, align: "right" }),
  });
  r += 1;
  put(ws, r, 0, {
    v: "GRAND TOTAL",
    s: style({ fill: FILL.total, bold: true, color: "FFFFFF", size: 12 }),
  });
  put(ws, r, 1, {
    f: `ROUND($B$${gsRow + 1}+$B$${gctRow + 1},2)`,
    v: round2(pricingTotals?.grand_total),
    z: MONEY_FMT,
    s: style({ fill: FILL.total, bold: true, color: "FFFFFF", size: 12, align: "right" }),
  });

  /* — column widths + range — */
  const widths = new Array(lastCol + 1).fill(0).map((_, c) => {
    if (c === C.product) return { wch: 26 };
    // Column B (Unit Price) also holds the Grand Subtotal / Global Charges
    // Total / Grand Total values — needs to be wide enough for ₹ amounts,
    // otherwise the totals render as "########".
    if (c === C.unitPrice) return { wch: 14 };
    if (c === C.unit) return { wch: 10 };
    if (c === chargesTotalCol || c === lineTotalCol) return { wch: 14 };
    // charge name columns a touch wider
    const inSlot = c >= firstChargeCol && c < chargesTotalCol;
    if (inSlot && (c - firstChargeCol) % COLS_PER_CHARGE === 0) return { wch: 14 };
    return { wch: 12 };
  });
  ws["!cols"] = widths;
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: ws._maxR, c: ws._maxC } });
  // freeze header
  ws["!freeze"] = { xSplit: 1, ySplit: HROW + 1 };
  return ws;
}

/* ── reference sheet ─────────────────────────────────────────────────── */
function buildReferenceSheet() {
  const ws = makeSheet();
  put(ws, 0, 0, { v: "Formula Reference — how each number is computed", s: style({ bold: true, size: 14, color: "1F2937" }) });
  const rows = [
    ["Quantity / Step", "Formula", "Backend source"],
    ["Base", "unit_price × quantity   (line is 0 if base ≤ 0)", "pricingEngine.js:78-90"],
    ["Base Tax", "tax_mode='percentage' → base × tax/100 ; 'absolute' → tax (flat)", "pricingEngine.js:92-93"],
    ["Charge Amount", "amount_mode='percentage' → base × amount/100 ; 'absolute' → amount", "pricingEngine.js:45-48,103"],
    [
      "Charge Tax (tri-state)",
      "Blank charge-tax = INHERIT base rate (only when base tax_mode is % and rate>0): amount × base_rate/100. Explicit value (incl. 0) overrides: 'percentage' → amount × tax/100 ; 'absolute' → tax. Explicit 0 = no tax.",
      "pricingEngine.js:63-73,102-112",
    ],
    ["Charges Total", "Σ (charge_amount + charge_tax), summed raw", "pricingEngine.js:114-115"],
    ["LINE TOTAL", "ROUND(base + base_tax + charges_total, 2)", "pricingEngine.js:143-151"],
    ["Grand Subtotal", "Σ line_total", "pricingEngine.js:192"],
    ["Global Charge Amount", "amount_mode='percentage' → grand_subtotal × amount/100 ; 'absolute' → amount", "pricingEngine.js:202"],
    ["Global Charges Total", "ROUND(Σ global amounts, 2)", "pricingEngine.js:232"],
    ["GRAND TOTAL", "ROUND(grand_subtotal + global_charges_total, 2)", "pricingEngine.js:234,241"],
    [
      "Rounding (q2)",
      "Intermediates stay raw; round to 2 decimals only at each boundary (line total, global total, grand total). Matches DB numeric(15,2).",
      "pricingEngine.js:21-29,39-41",
    ],
    [
      "Source of figures",
      "Cached values come from the live /pricing/preview response shown on the page; formulas recompute identically if you edit inputs.",
      "SendQuoteWizard.js, helpers.js",
    ],
  ];
  rows.forEach((row, i) => {
    const rr = i + 2;
    row.forEach((txt, c) => {
      put(ws, rr, c, {
        v: txt,
        s:
          i === 0
            ? headerStyle(c === 0 ? "left" : "center")
            : style({
                fill: c === 0 ? FILL.helper : undefined,
                bold: c === 0,
                italic: c === 2,
                color: c === 2 ? "64748B" : "334155",
                size: c === 2 ? 9 : 10,
                wrap: true,
                align: "left",
              }),
      });
    });
  });
  ws["!cols"] = [{ wch: 26 }, { wch: 78 }, { wch: 30 }];
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: ws._maxR, c: ws._maxC } });
  return ws;
}
