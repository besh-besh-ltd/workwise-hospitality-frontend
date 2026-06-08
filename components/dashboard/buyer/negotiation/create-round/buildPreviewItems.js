import { getChargeTargetKey } from '../NegotiationFieldsSelect';
import { compareTargetToQuoted, TEXT_ONLY_NEG_FIELDS } from './negotiationHelpers';

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
  if (globalFields.has('base_price') && !excluded.has('base_price')) {
    const { value } = globalTargetFor('base_price', formData);
    const numeric = value != null ? parseFloat(value) : NaN;
    if (Number.isFinite(numeric) && numeric > 0
        && targetBeatsQuoted('base_price', value, 'amount', vendorQuoteData)) {
      effectiveUnitPrice = numeric;
      dirty = true;
    }
  }

  const quantity = parseFloat(vendorQuoteData.quantity) || 0;
  if (!quantity) return null; // engine needs qty to compute anything

  const item = {
    unit_price: effectiveUnitPrice,
    quantity,
    tax: parseFloat(vendorQuoteData.tax) || 0,
    tax_mode: vendorQuoteData.taxMode || 'percentage',
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
    } else if (localFields.has(slug)) {
      const lVal = vt[slug];
      const lMode = vt[`${slug}_mode`] || amount_mode || 'percentage';
      if (lVal != null && lVal !== ''
          && targetBeatsQuoted(slug, lVal, lMode, vendorQuoteData)) {
        amount = parseFloat(lVal);
        amount_mode = lMode;
        used = 'local';
      }
    }

    if (used !== 'quoted') dirty = true;

    if (Number.isFinite(amount) && amount > 0) {
      const entry = { name: c.name || slug, amount, amount_mode };
      if (c.tax !== undefined && c.tax !== null && c.tax !== '') entry.tax = parseFloat(c.tax);
      if (c.tax_mode) entry.tax_mode = c.tax_mode;
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
    item.other_charges.push({
      name,
      amount: numeric,
      amount_mode: gMode || 'percentage',
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

  // slug → { target, mode } for fields that actually move money on the line
  // subtotal. Text-only / deferred fields are excluded.
  const targetMap = {};
  (fields || []).forEach((f) => {
    if (!f?.name) return;
    if (DEFERRED_FIELDS.has(f.name)) return;
    if (TEXT_ONLY_NEG_FIELDS.has(f.name)) return;
    if (f.name === 'documents' || f.name === 'delivery_period') return;
    const mode = f.mode === 'absolute' ? 'amount' : (f.mode || 'percentage');
    targetMap[f.name] = { target: f.target, mode };
  });

  let effectiveUnitPrice = parseFloat(vendorQuoteData.unitPrice) || 0;
  if (targetMap.base_price) {
    const numeric = parseFloat(targetMap.base_price.target);
    if (Number.isFinite(numeric) && numeric > 0 && numeric < effectiveUnitPrice) {
      effectiveUnitPrice = numeric;
    }
  }

  const item = {
    unit_price: effectiveUnitPrice,
    quantity,
    tax: parseFloat(vendorQuoteData.tax) || 0,
    tax_mode: vendorQuoteData.taxMode || 'percentage',
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

    if (targetMap[slug]) {
      const tNum = parseFloat(targetMap[slug].target);
      if (Number.isFinite(tNum) && tNum > 0) {
        amount = tNum;
        amount_mode = targetMap[slug].mode;
      }
    }

    if (Number.isFinite(amount) && amount > 0) {
      const entry = { name: c.name || slug, amount, amount_mode };
      if (c.tax !== undefined && c.tax !== null && c.tax !== '') entry.tax = parseFloat(c.tax);
      if (c.tax_mode) entry.tax_mode = c.tax_mode;
      item.other_charges.push(entry);
    }
  });

  // Demand entries: targets for fields the vendor didn't quote.
  Object.keys(targetMap).forEach((slug) => {
    if (slug === 'base_price') return;
    if (quotedSlugs.has(slug)) return;
    const tNum = parseFloat(targetMap[slug].target);
    if (!Number.isFinite(tNum) || tNum <= 0) return;
    const meta = (chargeNamesList || []).find(c => (c.slug || c.name) === slug);
    item.other_charges.push({
      name: meta?.name || slug,
      amount: tNum,
      amount_mode: targetMap[slug].mode,
    });
  });

  return item;
};
