// Pure helpers shared by the Create Negotiation Round wizard.
// These are lifted from NegotiationModal.js create-mode so the new page
// behaves identically. Keep them stateless — anything that needs React
// state should live in the calling component.

import moment from 'moment';
import { getChargeTargetKey } from '../NegotiationFieldsSelect';

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
    const documentFiles = src.document_files || [];
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

// Per-(vendor, field) check: is the effective target ≥ the vendor's quoted
// value? Numeric only — text fields always return false.
export const isFieldTargetInvalid = (fieldKey, vendorTargetMap, vendorData, formData) => {
  if (!vendorData || TEXT_ONLY_NEG_FIELDS.has(fieldKey)) return false;
  const unitPrice = parseFloat(vendorData.unitPrice) || 0;
  const quantity = parseFloat(vendorData.quantity) || 1;
  const basePrice = unitPrice * quantity;

  const localVal = vendorTargetMap?.[fieldKey];
  const globalKey = getChargeTargetKey(fieldKey);
  const globalVal = globalKey ? formData?.[globalKey] : '';
  const rawTarget = localVal != null && localVal !== '' ? localVal : globalVal;
  const target = parseFloat(rawTarget);
  if (!Number.isFinite(target) || target <= 0) return false;

  if (fieldKey === 'base_price') {
    return unitPrice > 0 && target >= unitPrice;
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

    // Per-vendor local targets (only for fields NOT globally claimed)
    Object.keys(vt).forEach(k => {
      if (k === '_localFields' || k === '_excludedFields' || k.endsWith('_mode')) return;
      if (vt[k] == null || vt[k] === '') return;
      if (globalFields.has(k)) return;

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
      fields.push(fieldObj);
    });

    // Global fallback for effective fields not already set per-vendor.
    // Each vendor can explicitly opt out of a globally-claimed field via
    // _excludedFields, in which case we skip that field entirely for them.
    const setFieldNames = new Set(fields.map(f => f.name));
    effectiveFields.forEach(f => {
      if (setFieldNames.has(f)) return;
      if (excludedForVendor.has(f)) return;
      const targetKey = getChargeTargetKey(f);
      const globalVal = targetKey && formData[targetKey];
      if (!globalVal) return;
      if (isFieldTargetInvalid(f, vt, vendorDataForCheck, formData)) return;

      const fieldObj = { name: f, target: globalVal };
      if (!nonModeKeys.includes(f)) {
        const modeKey = `target_${f}_mode`;
        const modeVal = formData[modeKey] || 'percentage';
        fieldObj.mode = modeVal === 'amount' ? 'absolute' : modeVal;
      }
      fields.push(fieldObj);
    });

    return { vendor_id: vid, fields };
  }).filter(v => v.fields.length > 0);
};

// Convert datetime-local input → UTC ISO string for the API.
export const toUtcEndDate = (local) => moment(local).utc().format();

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
      const basePrice = (parseFloat(v.unitPrice) || 0) * (parseFloat(v.quantity) || 1);
      amount = mode === 'percentage' ? (value / 100) * basePrice : value;
    }

    if (!Number.isFinite(value) || value <= 0) return;
    if (!Number.isFinite(amount) || amount <= 0) return;

    if (!best || amount < best.amount) {
      best = { value, mode, amount, vendorName: v.vendorName };
    }
  });

  if (!best) return null;

  const displayText = best.mode === 'percentage'
    ? `${best.value}%`
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
  const unitPrice = parseFloat(quoteData.unitPrice) || 0;
  const quantity = parseFloat(quoteData.quantity) || 1;
  const basePrice = unitPrice * quantity;

  if (fieldKey === 'base_price') {
    quotedValue = parseFloat(quoteData.unitPrice);
    if (isNaN(quotedValue) || quotedValue <= 0) return null;
    const diff = Math.abs(target - quotedValue);
    const diffPct = ((diff / quotedValue) * 100);
    const fmtDiff = `₹${diff.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    const fmtPct = `${diffPct.toFixed(2)}%`;
    if (target > quotedValue) return { result: 'greater', diffAmt: fmtDiff, diffPct: fmtPct };
    if (target === quotedValue) return { result: 'equal', diffAmt: '₹0', diffPct: '0%' };
    return { result: 'lower', diffAmt: fmtDiff, diffPct: fmtPct };
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

  if (Math.abs(targetAmt - quotedAmt) < 0.01) return { result: 'equal', diffAmt: '₹0', diffPct: '0%' };
  if (targetAmt > quotedAmt) return { result: 'greater', diffAmt: fmtDiff, diffPct: fmtPct };
  return { result: 'lower', diffAmt: fmtDiff, diffPct: fmtPct };
};
