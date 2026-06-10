import { getChargeTargetKey } from '../NegotiationFieldsSelect';
import { compareTargetToQuoted, TEXT_ONLY_NEG_FIELDS, targetTaxBeatsQuoted } from './negotiationHelpers';

// Fields handled by a separate surface — never participate in the projection.
const DEFERRED_FIELDS = new Set(['payment_terms', 'global_comment']);

const isAmountOnly = (slug) => slug === 'base_price' || slug === 'delivery_period';

// Resolve a charge from chargeNamesList. Useful for demand entries where the
// vendor doesn't carry the metadata.
const resolveChargeMeta = (slug, chargeNamesList) =>
  (chargeNamesList || []).find(c => (c.slug || c.name) === slug) || null;

// Map a slug → the global formData target key + mode (e.g. base_price → target_base_price + target_base_price_mode).
const globalTargetFor = (slug, formData) => {
  const targetKey = getChargeTargetKey(slug);
  if (!targetKey) return { value: null, mode: null };
  const raw = formData?.[targetKey];
  if (raw === undefined || raw === null || raw === '') return { value: null, mode: null };
  const mode = formData?.[`target_${slug}_mode`] || (isAmountOnly(slug) ? 'amount' : 'percentage');
  return { value: raw, mode };
};

// Map a slug → the global formData target TAX key + mode.
const globalTargetTaxFor = (slug, formData) => {
  const raw = formData?.[`target_${slug}_tax`];
  if (raw === undefined || raw === null || raw === '') return { value: null, mode: null };
  const mode = formData?.[`target_${slug}_tax_mode`] || 'percentage';
  return { value: raw, mode };
};

// Is `target` actually better than what the vendor quoted on this slug? We
// reuse the same comparison used by validators and the submit payload builder
// so the projection never includes a target the BE would drop.
const targetBeatsQuoted = (slug, targetValue, targetMode, vendorQuoteData) => {
  const cmp = compareTargetToQuoted(targetValue, targetMode, vendorQuoteData, slug);
  if (!cmp) return false;          // can't compare (text field, no quoted value) → leave to caller's defaults
  return cmp.result === 'lower';
};

// Build the single `items[i]` payload for one vendor with all in-scope target
// overrides applied. Returns `null` when nothing in this vendor's effective
// state differs from the quoted line — caller can skip the POST entirely.
//
// Mirrors the rules documented in the plan / used by buildVendorTargetsPayload
// so the projected number matches what /negotiation/rounds will eventually
// settle on.
export const buildPreviewItem = ({
  vendorQuoteData,           // entry from productPriceData.vendors[*]
  vendorId,
  formData,
  vendorTargets,
  globalSelectedFields = [],
  chargeNamesList = [],
}) => {
  if (!vendorQuoteData) return null;

  const vt = vendorTargets?.[vendorId] || {};
  const localFields = new Set(vt._localFields || []);
  const excluded = new Set(vt._excludedFields || []);
  const globalFields = new Set(globalSelectedFields);

  // Track whether any field actually changed vs the original quote — if not,
  // we don't bother sending the preview (saves a round trip).
  let dirty = false;

  // ─── Base ─────────────────────────────────────────────────────────────
  let effectiveUnitPrice = parseFloat(vendorQuoteData.unitPrice) || 0;
  let baseTax = parseFloat(vendorQuoteData.tax) || 0;
  let baseTaxMode = vendorQuoteData.taxMode || 'percentage';
  if (globalFields.has('base_price') && !excluded.has('base_price')) {
    const { value } = globalTargetFor('base_price', formData);
    const numeric = value != null ? parseFloat(value) : NaN;
    if (Number.isFinite(numeric) && numeric > 0
        && targetBeatsQuoted('base_price', value, 'amount', vendorQuoteData)) {
      effectiveUnitPrice = numeric;
      dirty = true;
    }
    // Base GST target (e.g. user wants the line tax at 12% instead of the
    // vendor's quoted 18%). Per-vendor override wins over global. Only
    // applied when the target beats the quoted tax.
    const localBaseTax = vt['base_price_tax'];
    const globalBaseTax = formData?.['target_base_price_tax'];
    const baseTaxRaw = localBaseTax != null && localBaseTax !== '' ? localBaseTax : globalBaseTax;
    if (baseTaxRaw != null && baseTaxRaw !== '') {
      const localBaseTaxMode = vt['base_price_tax_mode'];
      const globalBaseTaxMode = formData?.['target_base_price_tax_mode'];
      const candidateMode = localBaseTaxMode || globalBaseTaxMode || 'percentage';
      if (targetTaxBeatsQuoted({
        targetTax: baseTaxRaw,
        targetTaxMode: candidateMode,
        quoteData: vendorQuoteData,
        fieldKey: 'base_price',
      })) {
        baseTax = parseFloat(baseTaxRaw);
        baseTaxMode = candidateMode;
        dirty = true;
      }
    }
  }

  const quantity = parseFloat(vendorQuoteData.quantity) || 0;
  if (!quantity) return null; // engine needs qty to compute anything

  const item = {
    unit_price: effectiveUnitPrice,
    quantity,
    tax: Number.isFinite(baseTax) ? baseTax : 0,
    tax_mode: baseTaxMode,
    other_charges: [],
  };

  // ─── Other charges (vendor-quoted, possibly overridden) ───────────────
  const quotedSlugs = new Set();
  (vendorQuoteData.otherCharges || []).forEach((c) => {
    const slug = c.slug || c.name;
    if (!slug || DEFERRED_FIELDS.has(slug)) return;
    if (c.is_global) return; // page hides quote-level global charges

    quotedSlugs.add(slug);

    let amount = parseFloat(c.amount);
    let amount_mode = c.amount_mode || 'percentage';
    let tax = c.tax !== undefined && c.tax !== null && c.tax !== '' ? parseFloat(c.tax) : null;
    let tax_mode = c.tax_mode || null;
    let used = 'quoted';

    if (globalFields.has(slug)) {
      // Global selected. If vendor opted-out via _excludedFields, drop the
      // charge entirely (round won't apply it to this vendor).
      if (excluded.has(slug)) return;

      const { value: gVal, mode: gMode } = globalTargetFor(slug, formData);
      if (gVal != null && targetBeatsQuoted(slug, gVal, gMode, vendorQuoteData)) {
        amount = parseFloat(gVal);
        amount_mode = gMode;
        used = 'global';
      }
      // Target tax overrides vendor's quoted tax when present AND when it
      // strictly beats the quoted tax (same rule as the amount).
      const { value: gTaxVal, mode: gTaxMode } = globalTargetTaxFor(slug, formData);
      if (gTaxVal != null && targetTaxBeatsQuoted({
        targetTax: gTaxVal,
        targetTaxMode: gTaxMode,
        quoteData: vendorQuoteData,
        fieldKey: slug,
      })) {
        tax = parseFloat(gTaxVal);
        tax_mode = gTaxMode;
        used = 'global';
      }
    } else if (localFields.has(slug)) {
      const lVal = vt[slug];
      const lMode = vt[`${slug}_mode`] || amount_mode || 'percentage';
      if (lVal != null && lVal !== ''
          && targetBeatsQuoted(slug, lVal, lMode, vendorQuoteData)) {
        amount = parseFloat(lVal);
        amount_mode = lMode;
        used = 'local';
      }
      const lTax = vt[`${slug}_tax`];
      if (lTax != null && lTax !== '') {
        const lTaxMode = vt[`${slug}_tax_mode`] || 'percentage';
        if (targetTaxBeatsQuoted({
          targetTax: lTax,
          targetTaxMode: lTaxMode,
          quoteData: vendorQuoteData,
          fieldKey: slug,
        })) {
          tax = parseFloat(lTax);
          tax_mode = lTaxMode;
          used = 'local';
        }
      }
    }

    if (used !== 'quoted') dirty = true;

    // Push the charge through even when `amount === 0` — otherwise zeroing
    // the amount drops the entire entry (including its tax), and the user
    // (who left the tax field empty meaning "keep vendor's tax") sees the
    // line drop by amount + tax instead of just the amount.
    // For percentage tax this still computes to 0 contribution; for flat
    // tax the tax piece is preserved, matching the buyer's intent.
    if (Number.isFinite(amount) && amount >= 0) {
      const entry = { name: c.name || slug, amount, amount_mode };
      if (Number.isFinite(tax)) entry.tax = tax;
      if (tax_mode) entry.tax_mode = tax_mode;
      item.other_charges.push(entry);
    }
  });

  // ─── Demand: globally-selected fields the vendor didn't quote ─────────
  globalSelectedFields.forEach((slug) => {
    if (!slug || DEFERRED_FIELDS.has(slug)) return;
    if (slug === 'base_price' || slug === 'delivery_period') return; // not other-charge fields
    if (quotedSlugs.has(slug)) return;        // already handled above
    if (excluded.has(slug)) return;            // vendor opted-out
    if (TEXT_ONLY_NEG_FIELDS.has(slug)) return; // text fields don't affect the line subtotal

    const { value: gVal, mode: gMode } = globalTargetFor(slug, formData);
    if (gVal == null) return;
    const numeric = parseFloat(gVal);
    if (!Number.isFinite(numeric) || numeric <= 0) return;

    const meta = resolveChargeMeta(slug, chargeNamesList);
    const name = meta?.name || slug;
    // Default tax to 0 (no inherited tax for a charge the vendor never quoted)
    // but if the user supplied a target tax, use that instead.
    const { value: gTaxVal, mode: gTaxMode } = globalTargetTaxFor(slug, formData);
    const taxNum = gTaxVal != null ? parseFloat(gTaxVal) : 0;
    item.other_charges.push({
      name,
      amount: numeric,
      amount_mode: gMode || 'percentage',
      tax: Number.isFinite(taxNum) ? taxNum : 0,
      tax_mode: gTaxMode || 'percentage',
    });
    dirty = true;
  });

  if (!dirty) return null;

  return item;
};

// Variant of buildPreviewItem that consumes the SUBMITTED-shape
// `vendor_targets[i].fields[]` array (used for queued rounds on Step 3 review,
// where we no longer have the original wizard's formData / vendorTargets /
// globalSelectedFields). Targets are applied unconditionally — the queued
// payload was already filtered through buildVendorTargetsPayload, so anything
// present is meant to override the quote.
export const buildPreviewItemFromQueuedFields = ({
  vendorQuoteData,
  fields = [],
  chargeNamesList = [],
}) => {
  if (!vendorQuoteData) return null;
  const quantity = parseFloat(vendorQuoteData.quantity) || 0;
  if (!quantity) return null;

  // slug → { target, mode, tax?, taxMode? } for fields that actually move
  // money on the line subtotal. Text-only / deferred fields are excluded.
  const targetMap = {};
  (fields || []).forEach((f) => {
    if (!f?.name) return;
    if (DEFERRED_FIELDS.has(f.name)) return;
    if (TEXT_ONLY_NEG_FIELDS.has(f.name)) return;
    if (f.name === 'documents' || f.name === 'delivery_period') return;
    const mode = f.mode === 'absolute' ? 'amount' : (f.mode || 'percentage');
    const entry = { target: f.target, mode };
    if (f.tax !== undefined && f.tax !== null && f.tax !== '') {
      entry.tax = f.tax;
      entry.taxMode = f.tax_mode === 'absolute' ? 'amount' : (f.tax_mode || 'percentage');
    }
    targetMap[f.name] = entry;
  });

  let effectiveUnitPrice = parseFloat(vendorQuoteData.unitPrice) || 0;
  let baseTax = parseFloat(vendorQuoteData.tax) || 0;
  let baseTaxMode = vendorQuoteData.taxMode || 'percentage';
  if (targetMap.base_price) {
    const numeric = parseFloat(targetMap.base_price.target);
    if (Number.isFinite(numeric) && numeric > 0 && numeric < effectiveUnitPrice) {
      effectiveUnitPrice = numeric;
    }
    if (targetMap.base_price.tax !== undefined) {
      const t = parseFloat(targetMap.base_price.tax);
      if (Number.isFinite(t)) {
        baseTax = t;
        baseTaxMode = targetMap.base_price.taxMode || 'percentage';
      }
    }
  }

  const item = {
    unit_price: effectiveUnitPrice,
    quantity,
    tax: baseTax,
    tax_mode: baseTaxMode,
    other_charges: [],
  };

  const quotedSlugs = new Set();
  (vendorQuoteData.otherCharges || []).forEach((c) => {
    const slug = c.slug || c.name;
    if (!slug || DEFERRED_FIELDS.has(slug)) return;
    if (c.is_global) return;
    quotedSlugs.add(slug);

    let amount = parseFloat(c.amount);
    let amount_mode = c.amount_mode || 'percentage';
    let tax = c.tax !== undefined && c.tax !== null && c.tax !== '' ? parseFloat(c.tax) : null;
    let tax_mode = c.tax_mode || null;

    if (targetMap[slug]) {
      const tNum = parseFloat(targetMap[slug].target);
      if (Number.isFinite(tNum) && tNum > 0) {
        amount = tNum;
        amount_mode = targetMap[slug].mode;
      }
      if (targetMap[slug].tax !== undefined) {
        tax = parseFloat(targetMap[slug].tax);
        tax_mode = targetMap[slug].taxMode;
      }
    }

    // See note in buildPreviewItem: keep the entry even when amount === 0 so
    // a flat tax that the user didn't override is preserved on the line.
    if (Number.isFinite(amount) && amount >= 0) {
      const entry = { name: c.name || slug, amount, amount_mode };
      if (Number.isFinite(tax)) entry.tax = tax;
      if (tax_mode) entry.tax_mode = tax_mode;
      item.other_charges.push(entry);
    }
  });

  // Demand entries: targets for fields the vendor didn't quote.
  // Default to `tax: 0` so the engine doesn't inherit a line tax, but honour
  // a target tax from the queued payload when the user supplied one.
  Object.keys(targetMap).forEach((slug) => {
    if (slug === 'base_price') return;
    if (quotedSlugs.has(slug)) return;
    const tNum = parseFloat(targetMap[slug].target);
    if (!Number.isFinite(tNum) || tNum <= 0) return;
    const meta = (chargeNamesList || []).find(c => (c.slug || c.name) === slug);
    const taxNum = targetMap[slug].tax !== undefined ? parseFloat(targetMap[slug].tax) : 0;
    item.other_charges.push({
      name: meta?.name || slug,
      amount: tNum,
      amount_mode: targetMap[slug].mode,
      tax: Number.isFinite(taxNum) ? taxNum : 0,
      tax_mode: targetMap[slug].taxMode || 'percentage',
    });
  });

  return item;
};
