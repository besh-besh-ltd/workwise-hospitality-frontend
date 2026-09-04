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
export function buildArcCreatePayload(moduleRounds = [], endDateOverride = null) {
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
  return { end_date: endDate, products };
}
