// Pure helpers shared by the Create Negotiation Round wizard.
// These are lifted from NegotiationModal.js create-mode so the new page
// behaves identically. Keep them stateless — anything that needs React
// state should live in the calling component.

import moment from 'moment';
import { getChargeTargetKey } from '../NegotiationFieldsSelect';
import { parseLocalDateTimeInput } from '@/utils/negotiationTime';

// Engine total reader: quote_details rows enriched by quote-compare carry
// `engine.total`; legacy stored `total_price` is the authoritative fallback.
export const lineEngineTotal = (info) => {
  if (!info) return 0;
  const fromEngine = Number(info.engine?.total);
  if (Number.isFinite(fromEngine) && fromEngine > 0) return fromEngine;
  return Number(info.total_price) || 0;
};

export const isQuoteRegretted = (q) => {
  const topLevelRegret = q?.is_regret;
  const nestedRegret = q?.quote_details && q.quote_details.is_regret;
  return topLevelRegret == 1 || nestedRegret == 1;
};

export const getVendorDetailsFromQuote = (q) => {
  const vdRaw =
    q?.vendor_details ||
    (q?.quote_details && q.quote_details.vendor_details);
  if (!vdRaw) return null;
  return Array.isArray(vdRaw) ? vdRaw[0] : vdRaw;
};

export const hasQuotes = (product) => {
  const quotations = product?.quotations || [];
  if (quotations.length === 0) return false;
  return quotations.some(q => {
    const hasId = q.id != null || q.quote_id != null || q.quote_item_id != null;
    return hasId && !isQuoteRegretted(q);
  });
};

export const getVendorIdsForProduct = (product) => {
  const productVendors = product?.product_vendors || [];
  const ids = new Set();
  productVendors.forEach(v => {
    const vid = Number(v.id || v.user_id);
    if (vid) ids.add(vid);
  });
  return ids;
};

export const getVendorDisplayName = (v) =>
  v?.organization_name || v?.company_name || v?.vendor_company_name || v?.name || v?.email || 'Unknown Vendor';

export const getProductName = (product) => {
  return product?.product_details?.[0]?.name
      || product?.product_details?.[0]?.product_name
      || product?.product_name
      || product?.name
      || `Product ${product?.id}`;
};

export const getProductDetails = (product) => {
  const details = product?.product_details?.[0] || {};
  const productSpecs = product?.product_specs || [];
  const rfqDetails = details?.rfq_details || [];

  const spec = productSpecs.find(s => s.title === 'Spec')?.value ||
               rfqDetails.find(d => d.title === 'Spec')?.value;
  const size = productSpecs.find(s => s.title === 'Size')?.value ||
               rfqDetails.find(d => d.title === 'Size')?.value;
  const quantity = rfqDetails.find(d => d.title === 'Quantity')?.value ||
                   product?.quantity;
  const unit = rfqDetails.find(d => d.title === 'Unit')?.value ||
               product?.unit;

  return {
    name: details?.name || details?.product_name || `Product ${product?.id}`,
    spec,
    size,
    quantity,
    unit,
  };
};

export const getVendorNames = (product) => {
  const productVendors = product?.product_vendors || [];
  const quotations = product?.quotations || [];

  if (productVendors.length > 0) {
    const names = productVendors.slice(0, 3).map(v => getVendorDisplayName(v));
    if (productVendors.length > 3) {
      return `${names.join(', ')} +${productVendors.length - 3} more`;
    }
    return names.join(', ');
  }

  const validQuotations = quotations.filter(q => {
    const hasId = q.id != null || q.quote_id != null || q.quote_item_id != null;
    return hasId && !isQuoteRegretted(q);
  });

  if (validQuotations.length === 0) return 'No quotes';

  const names = validQuotations.slice(0, 3).map(q => {
    const vendorDetails = getVendorDetailsFromQuote(q);
    if (vendorDetails) {
      const name = getVendorDisplayName(vendorDetails);
      if (name !== 'Unknown Vendor') return name;
    }
    return null;
  }).filter(Boolean);

  if (names.length > 0) {
    if (validQuotations.length > 3) {
      return `${names.join(', ')} +${validQuotations.length - 3} more`;
    }
    return names.join(', ');
  }

  return `${validQuotations.length} quote(s)`;
};

// Vendor price data: rolls quotations into a sorted vendor list with L1
// at index 0. Shape stays identical to the modal so VendorAccordionPanel /
// chart code consume it unchanged.
//
// Note: this wizard intentionally uses the line-level subtotal (base + GST +
// other charges + their taxes) and *excludes* the proportional share of
// quote-level global charges (TCS, etc.). The buyer-wide breakdown lives on
// /quote-compare via its own helpers — those still read `engine_grand_total`
// and remain unchanged.
export const getVendorPriceData = (product) => {
  const quotations = product?.quotations || [];
  const validQuotations = quotations.filter(q => {
    const hasId = q.id != null || q.quote_id != null || q.quote_item_id != null;
    return hasId;
  });

  if (validQuotations.length === 0) return { vendors: [], l1: null, l1BasePrice: null };

  const vendors = validQuotations.map(q => {
    const isRegret = isQuoteRegretted(q);
    const vendorDetails = getVendorDetailsFromQuote(q);
    const vendorName = vendorDetails ? getVendorDisplayName(vendorDetails) : 'Unknown';

    // Line subtotal only — skips engine_grand_total (which folds in the
    // proportional TCS / global-charges allocation). Read from quote_details
    // FIRST: the parent `q.total_price` / `q.engine.total` is the rolled-up
    // grand (TCS included) and would leak global charges into the wizard math.
    const detailRow = Array.isArray(q.quote_details) && q.quote_details[0];
    let totalPrice = detailRow ? lineEngineTotal(detailRow) : 0;
    if (totalPrice === 0) totalPrice = lineEngineTotal(q);

    const src = (Array.isArray(q.quote_details) && q.quote_details[0]) || q;
    const unitPrice = parseFloat(src.unit_price || 0);
    const otherCharges = src.other_charges || [];
    const globalCharges = q.global_charges || [];
    const tax = parseFloat(src.tax || 0);
    const taxMode = src.tax_mode || 'percentage';
    const quantity = parseFloat(src.quantity || q.quantity || product?.quantity || 0);

    const deliveryPeriod = src.delivery_period || null;
    const paymentTerms = src.payment_terms || null;
    const vendorTC = (() => {
      const gpt = src.global_payment_term;
      return Array.isArray(gpt) ? (gpt[0]?.details || '') : (typeof gpt === 'string' ? gpt : '');
    })();
    const comment = src.comment || null;
    const globalComment = src.global_comment || null;
    // The vendor's quote-wide attachments (uploaded under "Attachments" → stored
    // in tbl_quotes_files, surfaced as `global_document_files`). This is what the
    // buyer negotiates on as "RFQ Documents" — NOT the per-line product files
    // (`document_files` / tbl_quote_item_files), which are a different set.
    const documentFiles = src.global_document_files || q.global_document_files || [];
    const vendorId = (() => {
      const vd = getVendorDetailsFromQuote(q);
      return Number(vd?.id || vd?.user_id || q.vendor_id || q.created_by || 0);
    })();

    return {
      vendorName, totalPrice, unitPrice, quantity,
      otherCharges, globalCharges, tax, taxMode,
      deliveryPeriod, paymentTerms, vendorTC, comment, globalComment, documentFiles, vendorId,
      isRegret,
    };
  }).filter(v => v.totalPrice > 0 || v.isRegret);

  vendors.sort((a, b) => a.totalPrice - b.totalPrice);
  const l1 = vendors.length > 0 ? vendors[0].totalPrice : null;
  const l1BasePrice = vendors.length > 0 ? vendors[0].unitPrice : null;
  vendors.forEach(v => { v.isL1 = v.totalPrice === l1; });

  return { vendors, l1, l1BasePrice };
};

// Eligibility for starting a new round on a product. Mirrors modal's
// getProductRoundStatus but takes the lookup map as an arg (no Redux access here).
//   quoteApprovalStatuses: { [productId]: { status: 'APPROVED'|'PENDING'|... } }
// True when a negotiation round covers a given product — handles both the
// legacy single-product shape (`round.rfq_product_id`) and the multi-product
// shape (`round.products[].rfq_product_id`). Mirrors the local helper in
// NegotiationModal.js and the backend `coversProductSql` predicate.
export const roundCoversProduct = (round, productId) => {
  if (round?.rfq_product_id != null && String(round.rfq_product_id) === String(productId)) return true;
  if (Array.isArray(round?.products)) {
    return round.products.some(p => p?.rfq_product_id != null && String(p.rfq_product_id) === String(productId));
  }
  return false;
};

export const getProductRoundStatus = (product, quoteApprovalStatuses = {}) => {
  if (!product) return { isDisabled: true, statusLabel: '', statusClass: '' };

  const approval = quoteApprovalStatuses[product.id];
  if (approval?.status === 'APPROVED') {
    return { isDisabled: true, statusLabel: 'Approved', statusClass: 'createStatusApproved' };
  }
  if (approval?.status === 'PENDING') {
    return { isDisabled: true, statusLabel: 'Pending Approval', statusClass: 'createStatusPartial' };
  }

  if (!hasQuotes(product)) {
    return { isDisabled: true, statusLabel: 'No Quotes', statusClass: 'createStatusNoQuotes' };
  }

  const activeRound = product.active_round;
  if (!activeRound) {
    return { isDisabled: false, statusLabel: 'Available', statusClass: '' };
  }

  const roundStatus = (activeRound.status || '').toUpperCase();
  if (roundStatus === 'PENDING_APPROVAL') {
    return { isDisabled: true, statusLabel: 'Pending Approval', statusClass: 'createStatusPartial' };
  }
  if (roundStatus === 'ACTIVE') {
    return { isDisabled: true, statusLabel: 'In Negotiation', statusClass: 'createStatusPartial' };
  }
  return { isDisabled: false, statusLabel: 'Available', statusClass: '' };
};

// Text-only negotiation fields (skip the ≥-quoted numeric check).
export const TEXT_ONLY_NEG_FIELDS = new Set(['payment_terms', 'comment', 'global_comment', 'vendor_tc', 'documents']);

// The rupee base a charge percentage is computed against. For a quote-level
// global charge (RFQ mode) that's the vendor's WHOLE-quote line subtotal
// (`rfqSubtotal`); for a per-line charge it's the line base (unit × qty).
export const chargeBase = (vendorData) => {
  const rfqSub = parseFloat(vendorData?.rfqSubtotal);
  if (Number.isFinite(rfqSub) && rfqSub > 0) return rfqSub;
  return (parseFloat(vendorData?.unitPrice) || 0) * (parseFloat(vendorData?.quantity) || 1);
};

// Per-(vendor, field) check: is the effective target ≥ the vendor's quoted
// value? Numeric only — text fields always return false.
export const isFieldTargetInvalid = (fieldKey, vendorTargetMap, vendorData, formData) => {
  if (!vendorData || TEXT_ONLY_NEG_FIELDS.has(fieldKey)) return false;
  const unitPrice = parseFloat(vendorData.unitPrice) || 0;
  const basePrice = chargeBase(vendorData);

  const localVal = vendorTargetMap?.[fieldKey];
  const globalKey = getChargeTargetKey(fieldKey);
  const globalVal = globalKey ? formData?.[globalKey] : '';
  const rawTarget = localVal != null && localVal !== '' ? localVal : globalVal;
  const target = parseFloat(rawTarget);
  if (!Number.isFinite(target) || target <= 0) return false;

  if (fieldKey === 'base_price') {
    return unitPrice > 0 && target >= unitPrice;
  }

  // Delivery period: target must be fewer days than quoted to be sent.
  if (fieldKey === 'delivery_period') {
    const quotedDays = parseFloat(vendorData.deliveryPeriod) || 0;
    return quotedDays > 0 && target >= quotedDays;
  }

  const charge = (vendorData.otherCharges || []).find((c) =>
    (c.slug || c.name) === fieldKey || c.name === fieldKey
  );
  const globalCharge = !charge
    ? (vendorData.globalCharges || []).find((c) => (c.slug || c.name) === fieldKey || c.name === fieldKey)
    : null;
  if (!charge && !globalCharge) return false;
  const quotedValue = parseFloat(charge ? charge.amount : globalCharge.tax);
  if (!Number.isFinite(quotedValue) || quotedValue <= 0 || basePrice <= 0) return false;
  const quotedMode = (charge ? charge.amount_mode : globalCharge.tax_mode) || 'percentage';
  const quotedAmt = quotedMode === 'percentage' ? (quotedValue / 100) * basePrice : quotedValue;

  const modeKey = `${fieldKey}_mode`;
  const localMode = vendorTargetMap?.[modeKey];
  const globalMode = formData?.[`target_${fieldKey}_mode`];
  const targetMode = localMode || globalMode || 'percentage';
  const targetAmt = targetMode === 'percentage' ? (target / 100) * basePrice : target;

  return targetAmt >= quotedAmt;
};

// Build the per-product POST payload identical to NegotiationModal.js:740-810.
// Returns { vendor_targets: [...] } — caller adds rfq_id, rfq_product_id, end_date.
//
// Rule (per latest design): a field can be EITHER globally selected (same
// target for every vendor) OR set per-vendor — never both. Per-vendor local
// values for fields that are also in `negotiation_fields` are ignored so a
// stale local value can't leak into the payload when the user toggles the
// global card on after typing a per-vendor target.
export const buildVendorTargetsPayload = ({
  selectedVendorIds,
  vendorTargets,
  effectiveFields,
  formData,
  productPriceData,
}) => {
  const nonModeKeys = ['base_price', 'payment_terms', 'comment', 'global_comment', 'vendor_tc', 'documents', 'delivery_period'];
  const globalFields = new Set(formData?.negotiation_fields || []);

  return selectedVendorIds.map(vid => {
    const vt = vendorTargets[vid] || {};
    const vendorDataForCheck = (productPriceData.vendors || []).find((v) => v.vendorId === vid);
    const excludedForVendor = new Set(vt._excludedFields || []);
    const fields = [];

    // Per-vendor local targets (only for fields NOT globally claimed).
    // `_tax` and `_tax_mode` siblings of each field aren't field names — they
    // attach to the parent entry below.
    Object.keys(vt).forEach(k => {
      if (k === '_localFields' || k === '_excludedFields' || k.endsWith('_mode')) return;
      if (k.endsWith('_tax')) return;
      if (vt[k] == null || vt[k] === '') return;
      // `documents` is special: its demand + per-doc comments are ALWAYS stored
      // per vendor (there's no global documents target), so it must be emitted
      // even when documents is a globally-claimed RFQ-level field. Other
      // globally-claimed fields are handled by the global fallback below.
      if (k !== 'documents' && globalFields.has(k)) return;

      if (k === 'documents') {
        try {
          const docComments = typeof vt[k] === 'string' ? JSON.parse(vt[k]) : vt[k];
          const state = docComments && typeof docComments === 'object' ? docComments : {};
          const demand = (state.demand || '').trim();
          const docFiles = vendorDataForCheck?.documentFiles || [];
          const docTargets = Object.entries(state)
            .filter(([key, comment]) => key !== 'demand' && comment && String(comment).trim())
            .map(([idx, comment]) => ({
              document_index: parseInt(idx),
              file_url: docFiles[parseInt(idx)]?.file_url || null,
              comment,
            }));
          if (docTargets.length > 0 || demand) {
            const fieldEntry = { name: 'documents', target: docTargets };
            if (demand) fieldEntry.demand = demand;
            fields.push(fieldEntry);
          }
        } catch { /* skip malformed */ }
        return;
      }

      if (isFieldTargetInvalid(k, vt, vendorDataForCheck, formData)) return;

      const fieldObj = { name: k, target: vt[k] };
      if (!nonModeKeys.includes(k)) {
        const modeVal = vt[`${k}_mode`] || 'percentage';
        fieldObj.mode = modeVal === 'amount' ? 'absolute' : modeVal;
      }
      // Buyer's free-text tax demand/negotiation note for this field —
      // attaches to base_price (GST) and dynamic numeric charges, never to
      // text-only / delivery_period fields.
      if (k === 'base_price' || !nonModeKeys.includes(k)) {
        const taxNote = vt[`${k}_tax`];
        if (taxNote != null && String(taxNote).trim() !== '') {
          fieldObj.tax_demand = String(taxNote).trim();
        }
      }
      fields.push(fieldObj);
    });

    // Global fallback for effective fields not already set per-vendor.
    // Each vendor can explicitly opt out of a globally-claimed field via
    // _excludedFields, in which case we skip that field entirely for them.
    // A per-vendor override (vt[f]) wins over the global value for this
    // vendor; left blank, the global target applies. (documents keep the
    // global value — their per-vendor structure is handled separately.)
    const setFieldNames = new Set(fields.map(f => f.name));
    effectiveFields.forEach(f => {
      if (setFieldNames.has(f)) return;
      if (excludedForVendor.has(f)) return;
      const targetKey = getChargeTargetKey(f);
      const globalVal = targetKey && formData[targetKey];
      const overrideVal = f === 'documents' ? null : vt[f];
      const hasOverride = overrideVal != null && overrideVal !== '';
      const effVal = hasOverride ? overrideVal : globalVal;
      if (!effVal) return;
      if (isFieldTargetInvalid(f, vt, vendorDataForCheck, formData)) return;

      const fieldObj = { name: f, target: effVal };
      if (!nonModeKeys.includes(f)) {
        const modeVal = (hasOverride ? vt[`${f}_mode`] : formData[`target_${f}_mode`]) || 'percentage';
        fieldObj.mode = modeVal === 'amount' ? 'absolute' : modeVal;
      }
      if (f === 'base_price' || !nonModeKeys.includes(f)) {
        const taxNote = vt[`${f}_tax`];
        if (taxNote != null && String(taxNote).trim() !== '') {
          fieldObj.tax_demand = String(taxNote).trim();
        }
      }
      fields.push(fieldObj);
    });

    // Tax-only entries: the buyer raised a tax demand/negotiation on a field
    // without setting any amount target (and no global target exists). These
    // still make the round valid — emit the field with just the note.
    const named = new Set(fields.map(f => f.name));
    Object.keys(vt).forEach(k => {
      if (!k.endsWith('_tax')) return;
      const base = k.slice(0, -4);
      if (named.has(base)) return;
      if (excludedForVendor.has(base)) return;
      if (TEXT_ONLY_NEG_FIELDS.has(base) || base === 'delivery_period' || base === 'documents') return;
      const note = vt[k];
      if (note == null || String(note).trim() === '') return;
      fields.push({ name: base, tax_demand: String(note).trim() });
    });

    return { vendor_id: vid, fields };
  }).filter(v => v.fields.length > 0);
};

// Convert datetime-local input → UTC ISO string for the API.
//
// The input is a LOCAL wall clock ("2026-08-13T12:30"), not an instant, so it
// goes through parseLocalDateTimeInput rather than parseNegotiationTime — the
// latter would read it as UTC and store the round 5h30m late. Naming the two
// shapes apart is exactly what ticket 1 fell through.
export const toUtcEndDate = (local) => {
  const d = parseLocalDateTimeInput(local);
  return d ? d.toISOString() : null;
};

// Aggregate vendors across every product in the RFQ for the RFQ-level
// negotiation round flow. Returns a `productPriceData`-shaped object
// (`{ vendors, l1: null, l1BasePrice: null }`) so downstream consumers
// (VendorListPanel, computeFieldL1, useVendorProjection, …) don't need to
// branch.
//
// Dedupe rule per vendor: globals (globalCharges, paymentTerms, globalComment,
// documentFiles, vendorTC, comment) are quote-wide — the first non-empty
// occurrence across the vendor's product lines wins. Numeric line fields
// (unitPrice, quantity, tax, taxMode, totalPrice) come from the vendor's
// first product line and are used only as a projection base.
export const aggregateRfqVendors = (products = []) => {
  const byVendor = new Map();
  products.forEach((p) => {
    const pd = getVendorPriceData(p);
    pd.vendors.forEach((v) => {
      if (!v.vendorId) return;
      const existing = byVendor.get(v.vendorId);
      if (!existing) {
        // rfqSubtotal = Σ per-product line subtotals — the correct base for a
        // quote-level global charge percentage (e.g. TCS 10% of the whole quote).
        byVendor.set(v.vendorId, { ...v, rfqSubtotal: Number(v.totalPrice) || 0 });
        return;
      }
      existing.rfqSubtotal = (existing.rfqSubtotal || 0) + (Number(v.totalPrice) || 0);
      // Merge globals (first non-empty wins). Keeps existing line numbers
      // (unitPrice/qty/totalPrice) from the first product we saw.
      if ((!existing.globalCharges || existing.globalCharges.length === 0) && v.globalCharges?.length) {
        existing.globalCharges = v.globalCharges;
      }
      if (!existing.paymentTerms && v.paymentTerms) existing.paymentTerms = v.paymentTerms;
      if (!existing.globalComment && v.globalComment) existing.globalComment = v.globalComment;
      if (!existing.vendorTC && v.vendorTC) existing.vendorTC = v.vendorTC;
      if (!existing.comment && v.comment) existing.comment = v.comment;
      if ((!existing.documentFiles || existing.documentFiles.length === 0) && v.documentFiles?.length) {
        existing.documentFiles = v.documentFiles;
      }
      // A vendor is regret-only if every product's row is a regret.
      existing.isRegret = existing.isRegret && v.isRegret;
    });
  });
  const vendors = Array.from(byVendor.values());
  return { vendors, l1: null, l1BasePrice: null };
};

// Resolve a quote-level global charge (TCS etc.) to a rupee amount against a
// given base (the vendor's whole-quote line subtotal). Mirrors the math in
// quoteCompare/BreakupInsightModal: the charge value lives in `.tax` and an
// optional GST-on-charge in `.additional_tax`.
const resolveGlobalChargeAmount = (charge, base) => {
  const val = parseFloat(charge?.tax);
  if (!Number.isFinite(val) || val <= 0) return 0;
  const mode = charge.tax_mode || 'percentage';
  const chargeBase = mode === 'percentage' ? (base * val) / 100 : val;
  const extra = parseFloat(charge?.additional_tax);
  const extraAmt = Number.isFinite(extra) && extra > 0
    ? (charge.additional_tax_mode === 'percentage' ? (chargeBase * extra) / 100 : extra)
    : 0;
  return chargeBase + extraAmt;
};

// Per-vendor full-RFQ grand total (incl. GST and quote-level globals like
// TCS), matching what the vendor sees on their send-quote summary. Computed
// as Σ(per-product line totals, incl. line taxes) + global charges resolved
// ONCE against that sum. Returns `{ [vendorId]: grandTotal }`.
//
// Why not sum per-product `engine_grand_total`? A flat global charge (e.g.
// TCS ₹1,000) is folded into EVERY product's grand, so summing would multiply
// it. Resolving globals once against the total subtotal counts them correctly
// for both flat and percentage modes.
export const computeVendorGrandTotals = (products = []) => {
  const acc = new Map(); // vendorId -> { lineSum, globalCharges }
  products.forEach((p) => {
    const pd = getVendorPriceData(p);
    pd.vendors.forEach((v) => {
      if (!v.vendorId || v.isRegret) return;
      const entry = acc.get(v.vendorId) || { lineSum: 0, globalCharges: null };
      entry.lineSum += Number(v.totalPrice) || 0;
      if ((!entry.globalCharges || entry.globalCharges.length === 0) && v.globalCharges?.length) {
        entry.globalCharges = v.globalCharges;
      }
      acc.set(v.vendorId, entry);
    });
  });
  const out = {};
  acc.forEach((entry, vid) => {
    const base = entry.lineSum;
    const globalTotal = (entry.globalCharges || [])
      .reduce((sum, c) => sum + resolveGlobalChargeAmount(c, base), 0);
    out[vid] = base + globalTotal;
  });
  return out;
};

// Compute the L1 (lowest) value across vendors for a single negotiation
// field. Charges in %/₹ are normalized to amount using each vendor's
// base price (unit × qty) before comparing, so 5% on (300 × 4) competes
// fairly against a flat ₹50.
//
// Returns { value, mode, amount, vendorName, displayText } or null when no
// vendor has a quoted value for this field.
export const computeFieldL1 = (fieldKey, productPriceData) => {
  if (!fieldKey || !productPriceData?.vendors?.length) return null;
  if (TEXT_ONLY_NEG_FIELDS.has(fieldKey)) return null;

  let best = null;
  productPriceData.vendors.forEach((v) => {
    if (v.isRegret) return;

    let value;
    let mode = 'amount';
    let amount;

    if (fieldKey === 'base_price') {
      value = parseFloat(v.unitPrice);
      amount = value;
    } else if (fieldKey === 'delivery_period') {
      value = parseFloat(v.deliveryPeriod);
      amount = value;
    } else {
      const charge = (v.otherCharges || []).find(c =>
        (c.slug || c.name) === fieldKey || c.name === fieldKey
      );
      const gCharge = !charge
        ? (v.globalCharges || []).find(c => (c.slug || c.name) === fieldKey || c.name === fieldKey)
        : null;
      if (charge) {
        value = parseFloat(charge.amount);
        mode = charge.amount_mode || 'percentage';
      } else if (gCharge) {
        value = parseFloat(gCharge.tax);
        mode = gCharge.tax_mode || 'percentage';
      } else {
        return; // vendor didn't quote this field
      }
      const basePrice = chargeBase(v);
      amount = mode === 'percentage' ? (value / 100) * basePrice : value;
    }

    if (!Number.isFinite(value) || value <= 0) return;
    if (!Number.isFinite(amount) || amount <= 0) return;

    if (!best || amount < best.amount) {
      best = { value, mode, amount, vendorName: v.vendorName };
    }
  });

  if (!best) return null;

  // For percentage L1 also surface the rupee equivalent in brackets — e.g.
  // `5% (₹250)` — so the badge reads the same as the per-vendor cards.
  const amtTxt = `₹${Number(best.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const displayText = best.mode === 'percentage'
    ? (best.amount > 0 ? `${best.value}% (${amtTxt})` : `${best.value}%`)
    : `₹${best.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return { ...best, displayText };
};

// Compare a target against a vendor's quoted value for a given field.
// Normalizes both to amount (using base price = unit × qty) before comparing.
// Returns { result: 'greater'|'equal'|'lower', diffAmt, diffPct } or null when
// the comparison can't be done (text fields, no quoted value, etc.).
// Lifted from VendorAccordionPanel.compareTargetToQuoted so the new wizard
// cards show the same delta math as the modal did.
export const compareTargetToQuoted = (targetValue, targetMode, quoteData, fieldKey) => {
  if (!targetValue || !quoteData) return null;
  if (TEXT_ONLY_NEG_FIELDS.has(fieldKey)) return null;
  const target = parseFloat(targetValue);
  if (isNaN(target)) return null;

  let quotedValue, quotedMode;
  // Globals (RFQ mode) normalize against the whole-quote subtotal; per-line
  // charges against the line base (unit × qty).
  const basePrice = chargeBase(quoteData);

  if (fieldKey === 'base_price') {
    quotedValue = parseFloat(quoteData.unitPrice);
    if (isNaN(quotedValue) || quotedValue <= 0) return null;
    const diff = Math.abs(target - quotedValue);
    const diffPct = ((diff / quotedValue) * 100);
    const fmtDiff = `₹${diff.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const fmtPct = `${diffPct.toFixed(2)}%`;
    const fmtQuoted = `₹${quotedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const fmtTarget = `₹${target.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    if (target > quotedValue) return { result: 'greater', diffAmt: fmtDiff, diffPct: fmtPct, diffValue: diff, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
    if (target === quotedValue) return { result: 'equal', diffAmt: '₹0', diffPct: '0%', diffValue: 0, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
    return { result: 'lower', diffAmt: fmtDiff, diffPct: fmtPct, diffValue: diff, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
  }

  // Delivery period is compared in DAYS (fewer is better). diffValue stays in
  // days — StepReview deliberately excludes delivery_period from the rupee
  // savings total so these days don't pollute it.
  if (fieldKey === 'delivery_period') {
    quotedValue = parseFloat(quoteData.deliveryPeriod);
    if (isNaN(quotedValue) || quotedValue <= 0) return null;
    const diff = Math.abs(target - quotedValue);
    const diffPct = ((diff / quotedValue) * 100);
    const fmtDiff = `${diff} day(s)`;
    const fmtPct = `${diffPct.toFixed(2)}%`;
    const fmtQuoted = `${quotedValue} day(s)`;
    const fmtTarget = `${target} day(s)`;
    if (target > quotedValue) return { result: 'greater', diffAmt: fmtDiff, diffPct: fmtPct, diffValue: diff, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
    if (target === quotedValue) return { result: 'equal', diffAmt: '0 day(s)', diffPct: '0%', diffValue: 0, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
    return { result: 'lower', diffAmt: fmtDiff, diffPct: fmtPct, diffValue: diff, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
  }

  const charge = (quoteData.otherCharges || []).find(c => (c.slug || c.name) === fieldKey || c.name === fieldKey);
  if (charge) {
    quotedValue = parseFloat(charge.amount);
    quotedMode = charge.amount_mode || 'percentage';
  } else {
    const globalCharge = (quoteData.globalCharges || []).find(c => (c.slug || c.name) === fieldKey || c.name === fieldKey);
    if (!globalCharge) return null;
    quotedValue = parseFloat(globalCharge.tax);
    quotedMode = globalCharge.tax_mode || 'percentage';
  }

  if (isNaN(quotedValue) || quotedValue <= 0 || !basePrice) return null;

  const quotedAmt = quotedMode === 'percentage' ? (quotedValue / 100) * basePrice : quotedValue;
  const targetAmt = targetMode === 'percentage' ? (target / 100) * basePrice : target;
  const diffAmt = Math.abs(targetAmt - quotedAmt);
  const diffPct = quotedAmt > 0 ? ((diffAmt / quotedAmt) * 100) : 0;
  const fmtDiff = `₹${diffAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const fmtPct = `${diffPct.toFixed(2)}%`;
  const fmtQuoted = `₹${quotedAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const fmtTarget = `₹${targetAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  if (Math.abs(targetAmt - quotedAmt) < 0.01) return { result: 'equal', diffAmt: '₹0', diffPct: '0%', diffValue: 0, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
  if (targetAmt > quotedAmt) return { result: 'greater', diffAmt: fmtDiff, diffPct: fmtPct, diffValue: diffAmt, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
  return { result: 'lower', diffAmt: fmtDiff, diffPct: fmtPct, diffValue: diffAmt, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
};

// Compare a target TAX against the vendor's quoted tax for the same field.
// Tax target must be strictly lower than quoted to be sent (same rule as the
// amount target). Both values are normalized to rupees using the field's
// quoted charge amount as the tax base, so a 18% tax target competes fairly
// against a flat ₹150 tax. Returns the same shape as compareTargetToQuoted.
//
// `quotedAmount` is the rupee amount the quoted tax applies to:
//   - base_price: unitPrice × qty
//   - charge with %: charge.amount / 100 × basePrice
//   - charge with ₹: charge.amount
export const compareTaxToQuoted = ({ targetTax, targetTaxMode, quotedTax, quotedTaxMode, quotedAmount }) => {
  if (targetTax == null || targetTax === '') return null;
  const target = parseFloat(targetTax);
  const quoted = parseFloat(quotedTax);
  if (!Number.isFinite(target) || !Number.isFinite(quoted) || quoted <= 0) return null;
  const base = parseFloat(quotedAmount) || 0;
  if (base <= 0) return null;
  const tMode = (targetTaxMode === 'amount' || targetTaxMode === 'absolute') ? 'amount' : 'percentage';
  const qMode = (quotedTaxMode === 'amount' || quotedTaxMode === 'absolute') ? 'amount' : 'percentage';
  const targetAmt = tMode === 'percentage' ? (target / 100) * base : target;
  const quotedAmt = qMode === 'percentage' ? (quoted / 100) * base : quoted;
  const diff = Math.abs(targetAmt - quotedAmt);
  const diffPct = quotedAmt > 0 ? (diff / quotedAmt) * 100 : 0;
  const fmtDiff = `₹${diff.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const fmtPct = `${diffPct.toFixed(2)}%`;
  const fmtQuoted = `₹${quotedAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const fmtTarget = `₹${targetAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  if (Math.abs(targetAmt - quotedAmt) < 0.01) return { result: 'equal', diffAmt: '₹0', diffPct: '0%', quotedAmt: fmtQuoted, targetAmt: fmtTarget };
  if (targetAmt > quotedAmt) return { result: 'greater', diffAmt: fmtDiff, diffPct: fmtPct, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
  return { result: 'lower', diffAmt: fmtDiff, diffPct: fmtPct, quotedAmt: fmtQuoted, targetAmt: fmtTarget };
};

// Resolve the rupee amount that the quoted tax applies to for a given field.
// Used by compareTaxToQuoted and the payload builder to make tax comparisons
// apples-to-apples.
export const quotedAmountFor = (fieldKey, quoteData) => {
  if (!quoteData) return 0;
  const basePrice = chargeBase(quoteData);
  if (fieldKey === 'base_price') return basePrice;
  const charge = (quoteData.otherCharges || []).find(c => (c.slug || c.name) === fieldKey || c.name === fieldKey);
  if (charge) {
    const val = parseFloat(charge.amount);
    if (!Number.isFinite(val) || val <= 0) return 0;
    const mode = charge.amount_mode || 'percentage';
    return mode === 'percentage' ? (val / 100) * basePrice : val;
  }
  // Quote-level global charge: value lives in `.tax` / `.tax_mode`.
  const g = (quoteData.globalCharges || []).find(c => (c.slug || c.name) === fieldKey || c.name === fieldKey);
  if (g) {
    const val = parseFloat(g.tax);
    if (!Number.isFinite(val) || val <= 0) return 0;
    const mode = g.tax_mode || 'percentage';
    return mode === 'percentage' ? (val / 100) * basePrice : val;
  }
  return 0;
};

// Mirrors computeFieldL1 but for the field's TAX (GST). Each vendor's quoted
// tax is normalized to a rupee amount using their own charge amount as the
// base, so 18% on (5% × 2100) competes fairly against a flat ₹150.
export const computeFieldTaxL1 = (fieldKey, productPriceData) => {
  if (!fieldKey || !productPriceData?.vendors?.length) return null;
  if (TEXT_ONLY_NEG_FIELDS.has(fieldKey)) return null;
  if (fieldKey === 'delivery_period') return null;

  let best = null;
  productPriceData.vendors.forEach((v) => {
    if (v.isRegret) return;

    let taxValue;
    let taxMode = 'percentage';
    let chargeAmt;

    const basePrice = chargeBase(v);

    if (fieldKey === 'base_price') {
      taxValue = parseFloat(v.tax);
      taxMode = v.taxMode || 'percentage';
      chargeAmt = basePrice;
    } else {
      const charge = (v.otherCharges || []).find(c =>
        (c.slug || c.name) === fieldKey || c.name === fieldKey
      );
      const gCharge = !charge
        ? (v.globalCharges || []).find(c => (c.slug || c.name) === fieldKey || c.name === fieldKey)
        : null;
      if (charge) {
        taxValue = parseFloat(charge.tax);
        taxMode = charge.tax_mode || 'percentage';
        const amtVal = parseFloat(charge.amount);
        const amtMode = charge.amount_mode || 'percentage';
        if (!Number.isFinite(amtVal) || amtVal <= 0) return;
        chargeAmt = amtMode === 'percentage' ? (amtVal / 100) * basePrice : amtVal;
      } else if (gCharge) {
        // Global charges store the charge amount in `tax` and the GST on top
        // (if any) in `additional_tax`. For tax L1 we surface the GST.
        taxValue = parseFloat(gCharge.additional_tax);
        taxMode = gCharge.additional_tax_mode || 'percentage';
        const amtVal = parseFloat(gCharge.tax);
        const amtMode = gCharge.tax_mode || 'percentage';
        if (!Number.isFinite(amtVal) || amtVal <= 0) return;
        chargeAmt = amtMode === 'percentage' ? (amtVal / 100) * basePrice : amtVal;
      } else {
        return;
      }
    }

    if (!Number.isFinite(taxValue) || taxValue <= 0) return;
    if (!Number.isFinite(chargeAmt) || chargeAmt <= 0) return;
    const amount = (taxMode === 'amount' || taxMode === 'absolute')
      ? taxValue
      : (taxValue / 100) * chargeAmt;
    if (!Number.isFinite(amount) || amount <= 0) return;

    if (!best || amount < best.amount) {
      best = { value: taxValue, mode: taxMode, amount, vendorName: v.vendorName };
    }
  });

  if (!best) return null;
  // Percentage tax L1 also shows its rupee equivalent in brackets, e.g.
  // `18% (₹45)`.
  const taxAmtTxt = `₹${Number(best.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  const displayText = (best.mode === 'amount' || best.mode === 'absolute')
    ? `₹${best.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
    : (best.amount > 0 ? `${best.value}% (${taxAmtTxt})` : `${best.value}%`);
  return { ...best, displayText };
};

// True when the target tax is strictly lower than the quoted tax (the only
// case where we send it). Mirrors `targetBeatsQuoted` for the amount side.
export const targetTaxBeatsQuoted = ({ targetTax, targetTaxMode, quoteData, fieldKey }) => {
  const charge = fieldKey === 'base_price'
    ? null
    : (quoteData?.otherCharges || []).find(c => (c.slug || c.name) === fieldKey || c.name === fieldKey);
  const quotedTax = fieldKey === 'base_price'
    ? parseFloat(quoteData?.tax)
    : (charge ? parseFloat(charge.tax) : NaN);
  const quotedTaxMode = fieldKey === 'base_price'
    ? (quoteData?.taxMode || 'percentage')
    : (charge?.tax_mode || 'percentage');
  if (!Number.isFinite(quotedTax) || quotedTax <= 0) return false;
  const cmp = compareTaxToQuoted({
    targetTax, targetTaxMode, quotedTax, quotedTaxMode,
    quotedAmount: quotedAmountFor(fieldKey, quoteData),
  });
  return cmp?.result === 'lower';
};
