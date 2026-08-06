// Shared helpers for the SendQuoteWizard.
//
// All mirror existing send-quote conventions so the new flow is wire-
// compatible with the legacy backend.

import moment from "moment";

/** Stable ish-id for in-memory other_charges & payment-term rows. */
export const genLocalId = (prefix = "lid") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/** Pluck a value from a product's specs by spec.title. */
export const getSpec = (specs, title) => {
  if (!Array.isArray(specs)) return "";
  const hit = specs.find((s) => s?.title === title);
  return hit?.value ?? "";
};

/** Indian currency / number format, 2dp. */
export const fmtINR = (n) => {
  const num = Number(n) || 0;
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/** Format a date for display: 05 Jun 26 */
export const fmtShortDate = (val, { includeTime = false } = {}) => {
  if (!val) return "—";
  const m = moment(val);
  if (!m.isValid()) return "—";
  return includeTime
    ? m.format("DD MMM YY · hh:mm A")
    : m.format("DD MMM YY");
};

/** Map RFQ → vendor-quote initial product shape (mirrors send-quote.js). */
export const buildInitialQuoteProducts = (rfq) => {
  if (!rfq?.products?.length) return [];

  // Existing quote (if any) → keyed by product_id + variant for prefill
  const quoted = new Map();
  rfq.quotations?.[0]?.products?.forEach((qp) => {
    quoted.set(`${qp.product_id}_${qp.variant}`, qp);
  });

  return rfq.products.map((p) => {
    const key = `${p.product_id}_${p.variant}`;
    const quote = quoted.get(key) || {};

    // Synthesize one "other_charges" array combining legacy freight/package
    // with explicit other_charges so the new UI only deals with one concept.
    const existing = (quote.other_charges || []).map((c) => ({
      _id: genLocalId("oc"),
      name: c.name,
      slug: c.slug,
      amount: parseFloat(c.amount ?? c.tax ?? 0) || 0,
      amount_mode: c.amount_mode || c.tax_mode || "percentage",
      // Per-charge GST. tax === null/undefined = inherit base rate (tri-state).
      // Explicit 0 means "no tax on this charge".
      tax: c.charge_tax ?? (c.tax_on_charge != null ? c.tax_on_charge : null),
      tax_mode: c.charge_tax_mode || "percentage",
      comment: c.comment || "",
    }));
    const existingNames = new Set(existing.map((c) => (c.name || "").toLowerCase()));
    const migrated = [];
    if (parseFloat(quote.freight_price) > 0 && !existingNames.has("freight")) {
      migrated.push({
        _id: genLocalId("oc"),
        name: "Freight",
        slug: "freight",
        amount: parseFloat(quote.freight_price) || 0,
        amount_mode: quote.freight_mode || "percentage",
        comment: "",
      });
    }
    if (parseFloat(quote.package_price) > 0 && !existingNames.has("packaging")) {
      migrated.push({
        _id: genLocalId("oc"),
        name: "Packaging",
        slug: "packaging",
        amount: parseFloat(quote.package_price) || 0,
        amount_mode: quote.package_mode || "percentage",
        comment: "",
      });
    }

    return {
      id: p.id,
      product_id: p.product_id,
      variant: p.variant,
      product_name: p.product_details?.[0]?.name || "Untitled product",
      product_description: p.product_details?.[0]?.description || "",
      qty: getSpec(p.product_specs, "Quantity") || "0",
      unit: getSpec(p.product_specs, "Unit") || "units",
      size: getSpec(p.product_specs, "Size") || "",
      detailedSpec: getSpec(p.product_specs, "Spec") || "",
      buyer_comment: p.comment || "",
      datasheet_file: p.datasheet_file || "",
      spec_file: p.spec_file || "",
      qap_file: p.qap_file || "",
      spec_files: p.spec_file || [],
      has_tech_eval:
        !!p.tech_evaluation_status?.has_tech_eval,
      tech_eval_accepted: !!p.tech_evaluation_status?.is_accepted,
      finalization_status: p.finalization_status || "",
      lowest_quotation: p.lowest_quotation || null,

      // Quote inputs
      unit_price: quote.unit_price || "",
      tax: quote.tax ?? "",
      tax_mode: quote.tax_mode || "percentage",
      delivery_period: quote.delivery_period || "",
      comment: quote.comment || "",
      previous_document_files:
        (quote.previous_document_files || []).map((f) => f.file_url) || [],
      document_files: [],
      other_charges: [...migrated, ...existing],
      total_price: parseFloat(quote.total_price) || 0,

      // MRP (tax-inclusive) quoting — audit inputs, seeded from the quoted
      // line when present. Default TRADITIONAL/blank for a fresh quote.
      pricing_method: quote.pricing_method || "TRADITIONAL",
      entered_mrp: quote.entered_mrp ?? "",
      mrp_discount: quote.mrp_discount ?? "",
      mrp_discount_mode: quote.mrp_discount_mode || "percentage",
    };
  });
};

/** Mirror of backend deriveMrpLine — keep in sync.
 *
 *  `net` (MRP less discount) is the AUTHORITATIVE figure: it is what the vendor
 *  is offering, and `net × qty` is what the buyer must be shown.
 *
 *  `base` is the reverse-calculated tax-exclusive rate at FULL precision. It is
 *  deliberately not rounded — for most GST rates it is a repeating decimal
 *  (400/1.18 = 338.9830508…), and quantising it before multiplying by quantity
 *  loses up to half a paisa per unit, an error that scales with quantity.
 *  Use `base2dp` wherever a unit rate is displayed or sent as a 2dp value. */
export const deriveMrpBaseFE = ({ mrp, discount, discountMode, gst }) => {
  const m = parseFloat(mrp) || 0;
  const disc = discountMode === 'percentage' ? (m * (parseFloat(discount)||0))/100 : (parseFloat(discount)||0);
  const net = Math.max(0, m - disc);
  const g = parseFloat(gst) || 0;
  const div = 1 + g/100;
  const base = div > 0 ? net/div : net;
  return { net, base, base2dp: Math.round(base*100)/100, gst: net - base };
};

/** True when this line was priced by entering an MRP + discount. */
const isMrpProduct = (p) =>
  p?.pricing_method === "MRP" && (parseFloat(p?.entered_mrp) || 0) > 0;

/** The GST-inclusive amount offered for ONE unit of an MRP line. */
const mrpNetInclusiveUnit = (p) =>
  deriveMrpBaseFE({
    mrp: p.entered_mrp,
    discount: p.mrp_discount,
    discountMode: p.mrp_discount_mode,
    gst: p.tax,
  }).net;

/** Compute per-product line total with cascading charge logic.
 *
 *  MRP lines are priced from the tax-INCLUSIVE amount (net × qty) rather than
 *  from a rounded exclusive rate, so the total reproduces "MRP less discount ×
 *  qty" exactly. Traditional lines are unchanged. */
export const computeLineTotal = (p) => {
  const qty = parseFloat(p.qty) || 0;
  const mrpLine = isMrpProduct(p);
  const netInclusiveLine = mrpLine ? mrpNetInclusiveUnit(p) * qty : 0;
  const gstRate = parseFloat(p.tax) || 0;
  const unit = mrpLine ? 0 : parseFloat(p.unit_price) || 0;
  // Exclusive base for the line: derived from the inclusive total on MRP lines.
  const base = mrpLine ? netInclusiveLine / (1 + gstRate / 100) : qty * unit;
  if (base <= 0) return 0;

  const baseTaxRate = parseFloat(p.tax) || 0;

  // Other charges + their (optional) per-charge GST
  let chargesAmount = 0;
  let chargesTax = 0;
  (p.other_charges || []).forEach((c) => {
    if (!c.name || c.name.trim() === "") return;
    const cAmt =
      c.amount_mode === "percentage"
        ? (base * (parseFloat(c.amount) || 0)) / 100
        : parseFloat(c.amount) || 0;
    chargesAmount += cAmt;

    // Per-charge GST: null = inherit base rate, explicit value (incl. 0) wins.
    const effRate =
      c.tax == null || c.tax === ""
        ? baseTaxRate
        : parseFloat(c.tax) || 0;
    const effMode =
      c.tax == null || c.tax === ""
        ? p.tax_mode || "percentage"
        : c.tax_mode || "percentage";
    const cTax =
      effMode === "percentage" ? (cAmt * effRate) / 100 : effRate;
    chargesTax += cTax;
  });

  // Base tax (on product subtotal only — per-charge tax handled above).
  // On an MRP line the tax is the RESIDUAL of the inclusive amount, so
  // base + baseTax is exactly what the vendor offered — the true split of a
  // repeating decimal cannot be represented at 2dp, and rounding both halves
  // independently can leave them failing to sum back to that amount.
  const baseTax = mrpLine
    ? netInclusiveLine - base
    : p.tax_mode === "percentage"
      ? (base * baseTaxRate) / 100
      : baseTaxRate;

  return base + chargesAmount + baseTax + chargesTax;
};

/** Aggregate totals + per-charge bucket for the hero summary.
 *  GST row shows ONLY the base product tax — per-charge tax is bundled into
 *  each charge's sub-line ({label, amount, tax}). */
export const computeTotals = (products) => {
  let subtotal = 0;
  let baseTaxTotal = 0;
  // { [chargeName]: { amount, tax } }
  const chargeBuckets = {};

  products.forEach((p) => {
    const qty = parseFloat(p.qty) || 0;
    const mrpLine = isMrpProduct(p);
    const baseTaxRate = parseFloat(p.tax) || 0;
    const netInclusiveLine = mrpLine ? mrpNetInclusiveUnit(p) * qty : 0;
    const unit = mrpLine ? 0 : parseFloat(p.unit_price) || 0;
    // MRP lines split the inclusive amount into base + tax; the two parts sum
    // back to the amount offered, so the hero's Subtotal + GST rows always
    // reconcile with the grand total.
    const base = mrpLine
      ? netInclusiveLine / (1 + baseTaxRate / 100)
      : qty * unit;
    if (base <= 0) return;
    subtotal += base;

    const baseTax = mrpLine
      ? netInclusiveLine - base
      : p.tax_mode === "percentage"
        ? (base * baseTaxRate) / 100
        : baseTaxRate;
    baseTaxTotal += baseTax;

    (p.other_charges || []).forEach((c) => {
      if (!c.name || c.name.trim() === "") return;
      const cAmt =
        c.amount_mode === "percentage"
          ? (base * (parseFloat(c.amount) || 0)) / 100
          : parseFloat(c.amount) || 0;

      // Per-charge tax (null = inherit base rate)
      const effRate =
        c.tax == null || c.tax === ""
          ? baseTaxRate
          : parseFloat(c.tax) || 0;
      const effMode =
        c.tax == null || c.tax === ""
          ? p.tax_mode || "percentage"
          : c.tax_mode || "percentage";
      const cTax =
        effMode === "percentage" ? (cAmt * effRate) / 100 : effRate;

      if (!chargeBuckets[c.name]) chargeBuckets[c.name] = { amount: 0, tax: 0 };
      chargeBuckets[c.name].amount += cAmt;
      chargeBuckets[c.name].tax += cTax;
    });
  });

  const extraCharges = Object.entries(chargeBuckets).map(([label, v]) => ({
    label,
    amount: v.amount,
    tax: v.tax,
  }));
  const extraTotal = extraCharges.reduce((s, c) => s + c.amount + c.tax, 0);
  const grand = subtotal + baseTaxTotal + extraTotal;
  return { subtotal, gst: baseTaxTotal, extraCharges, grand };
};

/** Diff old vs new payment terms for the update payload. */
export const diffPaymentTerms = (current, original) => {
  const origById = new Map((original || []).map((t) => [t.id, t]));
  const createdTerms = [];
  const updatedTerms = [];
  const deletedTerms = [];
  // Track which original ids are still present so we can derive deletions for
  // rows that were hard-removed from the list (no `action: "delete"` flag).
  const liveIds = new Set();

  current.forEach((t) => {
    if (t.action === "delete") {
      if (t.id) deletedTerms.push(t.id);
      return;
    }
    if (!t.id) {
      createdTerms.push(t);
      return;
    }
    liveIds.add(t.id);
    const orig = origById.get(t.id);
    if (!orig) return;
    const changed =
      orig.value !== t.value ||
      orig.type !== t.type ||
      orig.days !== t.days ||
      orig.comment !== t.comment;
    if (changed) updatedTerms.push(t);
  });

  // Any original term whose id is no longer in the list was removed.
  (original || []).forEach((t) => {
    if (t.id != null && !liveIds.has(t.id) && !deletedTerms.includes(t.id)) {
      deletedTerms.push(t.id);
    }
  });

  return { createdTerms, updatedTerms, deletedTerms };
};

/** Sum a payment terms list (ignores deleted). */
export const sumPaymentTerms = (terms) =>
  (terms || [])
    .filter((t) => t.action !== "delete")
    .reduce((s, t) => s + (Number(t.value) || 0), 0);

/** Generate a friendly reference like QUO-535804-K2A7. */
export const generateReference = (rfq_no) => {
  const code = Array.from({ length: 4 }, () =>
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
  ).join("");
  return `QUO-${rfq_no || "DRAFT"}-${code}`;
};
