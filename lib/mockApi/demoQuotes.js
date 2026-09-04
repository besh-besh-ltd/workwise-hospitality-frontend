import { lineItems } from "@/data/ihg/thread";
import { vendors } from "@/data/ihg/vendors";
import { quotesByVendor } from "@/data/ihg/quotes";

/**
 * Vendor responses for an RFQ raised during the demo.
 *
 * An RFQ you create yourself is a dead end without these: the portal's whole
 * downstream — comparison, negotiation, evaluation, award — is gated on quotes
 * existing, and there is no vendor side of this demo to send any. So "Publish
 * now" calls this, six suppliers answer, and the thread continues.
 *
 * Generated rather than fixed, because the products are whatever the buyer
 * happened to pick in the wizard. Deterministic from the RFQ and product ids,
 * so the same RFQ always shows the same numbers — a demo that reshuffles its
 * prices on every reload is worse than one with no quotes at all.
 */

/** FNV-1a → xorshift. Same seed, same sequence, no Math.random. */
const rng = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
};

/**
 * Freight and packaging behaviour, per supplier — as percentages of the line.
 *
 * Shared by the comparison grid and the negotiation wizard so the two screens
 * cannot quote different landed costs for the same quote. Not every vendor
 * charges both: a delivered-to-site quote has no freight line, and that
 * difference is exactly what the buyer negotiates on.
 */
export const CHARGE_PROFILE = {
  sriram: { freight: 0, packaging: 0.8 },
  welspun: { freight: 1.6, packaging: 0.6 },
  trident: { freight: 2.4, packaging: 0.9 },
  aarvi: { freight: 3.1, packaging: 1.2 },
  nandan: { freight: 1.9, packaging: 0 },
  greenleaf: { freight: 0, packaging: 1.4 },
};

/**
 * The charge rows for one line, as both screens render them.
 *
 * `amount` is in rupees and `amount_mode` says so. The key is `amount_mode`,
 * not `mode` — VendorListPanel defaults an absent one to "percentage", which
 * renders a ₹38,234 packaging charge as "38234% of base".
 *
 * `tax` is carried too: without it every charge card reads "No tax was given".
 */
const chargeRow = (name, slug, base, pct) => ({
  name,
  slug,
  amount: Math.round((base * pct) / 100),
  amount_mode: "amount",
  is_global: false,
  tax: 12,
  tax_mode: "percentage",
});

export const lineCharges = (vendorSlug, base) => {
  const p = CHARGE_PROFILE[vendorSlug] || { freight: 1.5, packaging: 0.7 };
  const rows = [];
  if (p.freight) rows.push(chargeRow("Freight", "freight", base, p.freight));
  if (p.packaging) rows.push(chargeRow("Packaging", "packaging", base, p.packaging));
  return rows;
};

/** Suppliers who bid this line in the real quote fixture, else the whole base. */
const bidderSlugsFor = (itemId) => {
  const known = Object.keys(quotesByVendor).filter((v) =>
    quotesByVendor[v].lines.some((l) => l.itemId === itemId)
  );
  return known.length >= 3 ? known : vendors.slice(0, 6).map((v) => v.id);
};

/** What that supplier quoted for this line last time, as the anchor price. */
const anchorRate = (vendorSlug, item) => {
  const line = quotesByVendor[vendorSlug]?.lines.find((l) => l.itemId === item.id);
  return line ? line.rate : Math.round(item.lastRate * 0.98);
};

/** Numeric vendor ids — the wizard and the grid both do Number(vendor.id). */
export const vendorNumericId = (slug) => 7101 + vendors.findIndex((v) => v.id === slug);

/**
 * Build one RFQ's worth of responses.
 *
 * @param {string} rfqId
 * @param {number[]} variantIds 1-based indexes into the catalogue, as stored on
 *   the draft by /rfq/add-products-to-draft.
 */
export const generateQuotes = (rfqId, variantIds) => {
  const items = (variantIds && variantIds.length ? variantIds : [1, 2, 3])
    .map((v) => lineItems[Number(v) - 1])
    .filter(Boolean);
  const chosen = items.length ? items : lineItems.slice(0, 3);

  const invited = new Set();
  const submitted = new Set();
  const regretted = new Set();
  const products = {};

  chosen.forEach((item, idx) => {
    const productId = idx + 1;
    const slugs = bidderSlugsFor(item.id);
    const quotes = [];

    slugs.forEach((slug) => {
      invited.add(slug);
      const r = rng(`${rfqId}:${item.id}:${slug}`);

      // Roughly one supplier in seven sits a line out. A grid where everybody
      // quotes everything looks generated; partial coverage is what makes the
      // comparison worth reading.
      if (r() < 0.14) {
        regretted.add(slug);
        quotes.push({ vendorSlug: slug, regret: true });
        return;
      }

      // ±4% around what they last quoted, so the spread is realistic and the
      // L1 is not always the same supplier.
      const rate = Math.round(anchorRate(slug, item) * (0.96 + r() * 0.08));
      submitted.add(slug);
      quotes.push({
        vendorSlug: slug,
        rate,
        qty: item.annualQty,
        value: rate * item.annualQty,
        leadDays: 21 + Math.round(r() * 24),
        regret: false,
      });
    });

    products[productId] = { itemId: item.id, name: item.name, uom: item.uom, qty: item.annualQty, quotes };
  });

  // A supplier that regretted every line it saw did not really submit.
  regretted.forEach((s) => { if (submitted.has(s)) regretted.delete(s); });

  return {
    rfqId: String(rfqId),
    at: new Date().toISOString(),
    invited: invited.size,
    submitted: submitted.size,
    regretted: regretted.size,
    vendorSlugs: Array.from(invited),
    products,
  };
};
