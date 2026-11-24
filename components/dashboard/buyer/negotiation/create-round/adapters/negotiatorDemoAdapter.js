// Demo-only data for the stand runbook's negotiator stop
// (`/dashboard/buyer/negotiation/535944/create?demo=round`).
//
// The AI Negotiator's analysis is written against five quotes for BATH TOWEL
// 500 GSM on RFQ #535944 — 4,000 pcs, ₹412 to ₹470, freight and packaging as
// a % of the base, 18% GST. The quote-comparison fixture behind the normal
// wizard prices a different round (11,600 pcs, other suppliers, 12% GST), so
// with it the panel's numbers and the vendor rows disagreed and "Apply
// suggested targets" had nothing to write its per-vendor targets onto.
//
// With the flag, the Bath Towel line's quotations are rebuilt from the same
// dataset the panel reads (lib/wwai/data/negotiator.js), in the exact shape
// getVendorPriceData walks. Every other product, and the wizard without the
// flag, is untouched.
import '@/lib/wwai/data/negotiator';
import { getProductName } from '../negotiationHelpers';

export const DEMO_FLAG = 'round';
export const DEMO_RFQ_ID = 535944;

// Numeric vendor ids the rest of the demo already knows, by quote rank
// (L1 → L5), so a round sent from the demo still resolves to real vendors
// downstream.
const VENDOR_IDS = { shree: 7101, anand: 7102, gokul: 7103, meridian: 7104, suvarna: 7105 };

const dataset = () => (typeof window !== 'undefined' ? window : globalThis).WWData_negotiator;

const norm = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();

/** Is this RFQ product the line the AI Negotiator analyses? */
export const isNegotiatorDemoProduct = (product) => {
  const D = dataset();
  return !!D && norm(getProductName(product)) === norm(D.product.name);
};

const r2 = (n) => Math.round(n * 100) / 100;

const buildQuotation = (product, v, idx, D) => {
  const qty = D.product.qty;
  const gst = D.rfq.gstPct;
  const base = v.unit * qty;
  const freight = v.freightPct != null ? (base * v.freightPct) / 100 : 0;
  const packaging = v.packagingPct != null ? (base * v.packagingPct) / 100 : 0;
  // landed = (base + freight + packaging) × (1 + GST) — the prototype's formula
  const total = r2((base + freight + packaging) * (1 + gst / 100));

  const charges = [];
  if (v.freightPct != null) {
    charges.push({ name: 'Freight', slug: 'freight', amount: v.freightPct, amount_mode: 'percentage', tax: gst, tax_mode: 'percentage' });
  }
  if (v.packagingPct != null) {
    charges.push({ name: 'Packaging', slug: 'packaging', amount: v.packagingPct, amount_mode: 'percentage', tax: gst, tax_mode: 'percentage' });
  }

  const short = v.name.split(' ')[0];
  const vendorId = VENDOR_IDS[v.id] || 7190 + idx;
  return {
    id: Number(product.id) * 100 + idx,
    vendor_id: vendorId,
    vendor_details: { id: vendorId, organization_name: v.name },
    global_charges: [],
    quote_details: [
      {
        unit_price: v.unit,
        quantity: qty,
        tax: gst,
        tax_mode: 'percentage',
        total_price: total,
        other_charges: charges,
        delivery_period: String(v.deliveryDays),
        payment_terms: v.paymentTerms,
        global_payment_term: [{ details: v.paymentTerms }],
        comment: v.terms,
        global_comment: `${v.city} · ${v.history.note}`,
        document_files: (v.documents || []).map((d) => ({ name: `${short}_${d.replace(/[^A-Za-z0-9]+/g, '_')}.pdf`, url: '#' })),
        global_document_files: [{ name: `${short}_Quote_${D.rfq.no}.pdf`, url: '#' }],
      },
    ],
  };
};

/**
 * Products as loaded, with the negotiator's line re-priced from the dataset.
 * Returns the input unchanged when the dataset or the line is missing.
 */
export const applyNegotiatorDemo = (products = []) => {
  const D = dataset();
  if (!D) return products;
  return products.map((p) => {
    if (!isNegotiatorDemoProduct(p)) return p;
    const quotations = D.vendors.map((v, i) => buildQuotation(p, v, i, D));
    return {
      ...p,
      quantity: D.product.qty,
      unit: D.product.uom,
      product_specs: [
        { title: 'Spec', value: D.product.spec },
        { title: 'Size', value: D.product.spec.split(',')[0] },
      ],
      product_vendors: quotations.map((q) => q.vendor_details),
      quotations,
    };
  });
};
