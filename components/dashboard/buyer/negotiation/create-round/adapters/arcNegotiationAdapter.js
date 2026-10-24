// arcNegotiationAdapter — bridges ARC data into the shared RFQ create-round
// module so the ARC negotiation page reuses the SAME rich field components
// (NegotiationFieldsSelect, VendorChargeCard, StepVendorsAndTargets) as RFQ.
//
// The RFQ module consumes `products[]`, each shaped so `getVendorPriceData`
// (negotiationHelpers) can roll it into `{ vendors:[{vendorId, unitPrice, tax,
// otherCharges, ...}], l1 }`. This adapter synthesizes that shape from the ARC
// comm-eval payload (`items` + per-vendor `quotes`), and maps the module's
// per-round payloads back onto the ARC create endpoint.

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

// ── ARC comm-eval data → RFQ-shaped products[] ────────────────────────────────
// items:  [{ id|arc_item_id, variant_name|name, indicative_qty|committed_qty, uom }]
// quotes: [{ vendor_id, vendor_name, arc_item_id, rate, gst_pct, charges, technically_disqualified }]
// qualifiedMap: { [arc_item_id]: [qualified vendor ids] }  (absent ⇒ no tech restriction)
export function normalizeArcProducts({ items = [], quotes = [], qualifiedMap = {} } = {}) {
  return (items || []).map((item) => {
    const itemId = Number(item.id ?? item.arc_item_id);
    const qty = num(item.committed_qty ?? item.indicative_qty ?? item.quantity ?? 0) || 1;
    const itemName = item.variant_name || item.name || item.title || `Item ${itemId}`;
    const allowed = qualifiedMap[itemId]; // undefined ⇒ no technical gate for this item
    const itemQuotes = (quotes || []).filter((q) => Number(q.arc_item_id) === itemId);

    const product_vendors = [];
    const quotations = itemQuotes.map((q) => {
      const vid = Number(q.vendor_id);
      const rate = num(q.rate ?? q.quoted_price);
      const gst = num(q.gst_pct);
      const charges = Array.isArray(q.charges) ? q.charges : [];
      // Disqualified = flagged by the server OR not in this item's qualified set.
      // Shown but marked regret so the wizard doesn't auto-select them (and the
      // backend create guard would reject them anyway).
      const disqualified = !!q.technically_disqualified || (Array.isArray(allowed) && !allowed.includes(vid));
      const vname = q.vendor_name || `Vendor ${vid}`;
      // Landed line total — only used by getVendorPriceData for L1 ordering + the
      // ">0" keep filter; must be positive for a real quote.
      const landed = rate * qty * (1 + gst / 100);
      if (!disqualified) product_vendors.push({ id: vid, name: vname });
      return {
        id: `arc-${itemId}-${vid}`, // non-null id so the quote is counted
        vendor_id: vid,
        created_by: vid,
        vendor_details: { id: vid, user_id: vid, name: vname, company_name: vname },
        quantity: qty,
        is_regret: disqualified ? 1 : 0,
        quote_details: [{
          unit_price: rate,
          tax: gst,
          tax_mode: 'percentage',
          other_charges: charges,
          quantity: qty,
          total_price: landed > 0 ? landed : rate,
          payment_terms: null,
        }],
      };
    });

    return {
      id: itemId,
      quantity: qty,
      unit: item.uom || '',
      product_details: [{ name: itemName, product_name: itemName }],
      product_specs: [],
      product_vendors,
      quotations,
      // ARC create wizard has no per-product approval/lock concept — always open.
      active_round: null,
    };
  });
}

// ── module per-round payloads → ONE ARC create payload ────────────────────────
// The RFQ module builds one payload per queued round (`{rfq_product_id|is_rfq_level,
// end_date, vendor_targets}`); ARC persists them all inside a SINGLE round's
// `products[]`, so we fold them together. `vendor_targets` already carries the
// field-keyed `fields[]` the ARC backend (I1) accepts verbatim.
export function buildArcCreatePayload(moduleRounds = [], endDateOverride = null, creatorRemarks = null) {
  const products = [];
  let endDate = endDateOverride;
  (moduleRounds || []).filter(Boolean).forEach((r) => {
    if (!endDate && r.end_date) endDate = r.end_date; // one shared deadline
    if (r.is_rfq_level) {
      products.push({ is_arc_level: true, vendor_targets: r.vendor_targets });
    } else if (r.rfq_product_id != null) {
      products.push({ arc_item_id: Number(r.rfq_product_id), vendor_targets: r.vendor_targets });
    }
  });
  return { end_date: endDate, products, creator_remarks: creatorRemarks?.trim() || null };
}

// ── stored ARC round → the queued-round entries StepReview renders ────────────
// The ARC twin of ApproveRoundPage's roundToReviewEntries, against the products
// normalizeArcProducts built (product id = arc item id). Targets live per vendor
// in products[].vendor_targets[].fields; older shapes are read too:
//   - a vendor target carrying only `target_rate` (the first ARC payload shape)
//   - a legacy single-item round: arc_item_id + vendor_ids, with the ask in the
//     round's own target_price (or vendor_approvals[].negotiation_fields)
// An ARC-level entry is the RFQ module's RFQ-level card ("Whole rate contract").
export const WHOLE_ARC_LABEL = 'Whole rate contract';

export function arcRoundToReviewEntries(round, products = []) {
  const vendorNames = new Map();
  (products || []).forEach((p) => (p.quotations || []).forEach((q) => {
    if (q?.vendor_details?.name) vendorNames.set(Number(q.vendor_id), q.vendor_details.name);
  }));
  const itemName = (itemId) => {
    const p = (products || []).find((x) => Number(x.id) === Number(itemId));
    return p?.product_details?.[0]?.name || round.arc_item_name || `Item ${itemId}`;
  };
  const withNames = (vts) => (vts || []).map((vt) => ({
    ...vt,
    vendor_name: vendorNames.get(Number(vt.vendor_id)) || null,
    fields: Array.isArray(vt.fields) && vt.fields.length > 0
      ? vt.fields
      : vt.target_rate != null && vt.target_rate !== ''
        ? [{ name: 'base_price', target: String(vt.target_rate) }]
        : [],
  }));

  if (Array.isArray(round.products) && round.products.length > 0) {
    return round.products.map((p) => (p?.is_arc_level === true || p?.arc_item_id == null
      ? { mode: 'rfq', rfq_product_id: null, vendor_targets: withNames(p?.vendor_targets), productName: WHOLE_ARC_LABEL }
      : {
          mode: 'product',
          rfq_product_id: Number(p.arc_item_id),
          vendor_targets: withNames(p.vendor_targets),
          productName: itemName(p.arc_item_id),
        }));
  }

  // Legacy rounds: one ask for every vendor on the round.
  const vendorIds = [...new Set([
    ...(round.vendor_ids || []),
    ...(round.vendor_approvals || []).map((va) => va?.vendor_id),
  ].filter((v) => v != null).map(Number))];
  const legacyFields = (vendorId) => {
    if (round.target_price != null && round.target_price !== '') {
      return [{ name: 'base_price', target: String(Number(round.target_price)) }];
    }
    const va = (round.vendor_approvals || []).find((v) => Number(v?.vendor_id) === vendorId);
    return va?.negotiation_fields || [];
  };
  const vendor_targets = withNames(vendorIds.map((vid) => ({ vendor_id: vid, fields: legacyFields(vid) })));
  return [round.arc_item_id != null
    ? { mode: 'product', rfq_product_id: Number(round.arc_item_id), vendor_targets, productName: itemName(round.arc_item_id) }
    : { mode: 'rfq', rfq_product_id: null, vendor_targets, productName: WHOLE_ARC_LABEL }];
}
