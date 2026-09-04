import { lineItems, rfq, CATEGORY, FY } from "@/data/ihg/thread";
import { quotesByVendor } from "@/data/ihg/quotes";
import { vendorsById } from "@/data/ihg/vendors";
import { peopleById, propertiesById, company } from "@/data/ihg/org";
import { vendorNumericId, lineCharges } from "./demoQuotes";

/**
 * The commercial evaluation screen's payload.
 *
 * QuoteComparison does almost no arithmetic of its own — computeHelpers.js
 * reads `product.quotes[vendorId]` and derives every rank, subtotal, saving and
 * grand total from the cell fields below. So this file's only real job is to
 * emit cells that reconcile: `total` must equal subtotal + line charges + tax,
 * or the L1 badge, the vendor grand total and the savings KPI quietly disagree
 * with the rows the buyer is reading.
 *
 * Quote-level global charges (TCS and friends) are deliberately absent. The
 * helpers distribute a global across products and then add its GST back once,
 * which is correct but impossible to eyeball; with no globals a vendor's grand
 * total is exactly the sum of its visible line totals.
 */

const GST_PCT = 12;

/**
 * One cell: what this supplier quoted for this line.
 *
 * `total` is the landed figure everything else ranks on.
 */
const cell = (rate, qty, vendorSlug, leadDays, withFreight) => {
  const subtotal = rate * qty;
  // Same charge profile the negotiation wizard reads, so the two screens can
  // never show different landed costs for one quote.
  const charges = withFreight ? lineCharges(vendorSlug, subtotal) : [];
  const freight = charges.find((c) => c.slug === "freight")?.amount || 0;
  const packaging = charges.find((c) => c.slug === "packaging")?.amount || 0;
  const chargeSum = freight + packaging;
  const taxAmt = Math.round(((subtotal + chargeSum) * GST_PCT) / 100);

  return {
    base: rate,
    subtotal,
    freight,
    packaging,
    other_charges: charges,
    global_charges: [],
    tax_pct: GST_PCT,
    tax_amt: taxAmt,
    total: subtotal + chargeSum + taxAmt,
    delivery: `${leadDays} days`,
    pay: quotesByVendor[vendorSlug]?.paymentTerms || "30 days from GRN",
    comment: freight ? "Freight quoted separately — ex-works." : "Delivered to all sites.",
    docs: [],
    missing: false,
    history: [],
  };
};

/** The vendor strip above the grid: who they are and how they have performed. */
const vendorRow = (slug, products) => {
  const v = vendorsById[slug];
  const perf = v?.performance || {};
  const quoted = products.filter((p) => p.quotes[vendorNumericId(slug)]).length;

  return {
    id: vendorNumericId(slug),
    name: v?.name || slug,
    short: v?.short || v?.name || slug,
    // How much of THIS RFQ they bid — the "5 of 8 items" figure on their card.
    quote_pct: products.length ? Math.round((quoted / products.length) * 100) : 0,
    tech_score: null,
    track_record: perf.onTimePct != null ? `${perf.onTimePct}% on time` : null,
    orders_done: perf.contractsWon ?? 0,
    pos_accepted: perf.contractsWon ?? 0,
    po_value: perf.priorSpend ?? 0,
    is_new: !v?.incumbent && (perf.contractsWon ?? 0) === 0,
    invited_rfqs: 1,
    quoted_rfqs: quoted > 0 ? 1 : 0,
  };
};

/**
 * Build the whole payload from a list of (item, quotes) pairs.
 *
 * @param {{item: object, quotes: {vendorSlug: string, rate: number, leadDays: number}[]}[]} rows
 */
const build = (rows, meta, withFreight = true) => {
  const products = rows.map(({ item, quotes }, idx) => {
    const cells = {};
    quotes.forEach((q) => {
      cells[vendorNumericId(q.vendorSlug)] = cell(q.rate, item.annualQty, q.vendorSlug, q.leadDays, withFreight);
    });

    return {
      id: idx + 1,
      product_variant_id: idx + 1,
      name: item.name,
      variant: item.spec,
      category: CATEGORY,
      qty: item.annualQty,
      unit: item.uom,
      // Nothing is awarded yet — the buyer has just opened the comparison.
      state: "open",
      finalized_vendor: null,
      finalized_by: null,
      awaiting_me: false,
      reject_info: null,
      quoted_count: quotes.length,
      // What IHG last paid, all-in. The savings KPI is measured against this.
      lpr: { rate: item.lastRate, landed_unit: Math.round(item.lastRate * (1 + GST_PCT / 100)) },
      tech: { configured: false, scores: {} },
      quotes_absence: {},
      quotes: cells,
    };
  });

  const slugs = Array.from(new Set(rows.flatMap((r) => r.quotes.map((q) => q.vendorSlug))));
  const vendors = slugs.map((s) => vendorRow(s, products));
  const owner = peopleById[rfq.ownerId] || Object.values(peopleById)[0];

  return {
    rfq: {
      id: meta.id,
      rfq_no: String(meta.id),
      number: String(meta.id),
      title: meta.title,
      company: company.name,
      hotel: meta.hotel,
      department: meta.department,
      contact: owner.name,
      phone: owner.phone,
      email: company.procurementEmail,
      delivery_location: propertiesById["ic-mumbai"].address,
      deadline: meta.deadline,
      status: "Quotes received",
      reverse_auction: false,
      tech_clauses: 0,
      quotes_invited: vendors.length,
      quotes_received: vendors.filter((v) => v.quoted_rfqs > 0).length,
      rounds: { ended: 0, active: 0 },
      project_id: -1,
    },
    bid_end_date: meta.deadline,
    quotes_locked: !!meta.locked,
    categories: [{ id: 1, title: CATEGORY }],
    has_delivery_charges: true,
    approval_chain: [],
    stage_actors: [],
    vendors,
    products,
  };
};

/** The golden thread's RFQ, straight from the signed-off quote fixture. */
export const threadCompareView = (id, withFreight = true) =>
  build(
    lineItems.map((item) => ({
      item,
      quotes: Object.keys(quotesByVendor)
        .map((slug) => {
          const line = quotesByVendor[slug].lines.find((l) => l.itemId === item.id);
          return line
            ? { vendorSlug: slug, rate: line.rate, leadDays: quotesByVendor[slug].leadTimeDays }
            : null;
        })
        .filter(Boolean),
    })),
    {
      id: Number(id) || Number(rfq.id),
      title: `${CATEGORY} — ${FY}`,
      hotel: rfq.propertyIds.map((p) => propertiesById[p]?.shortName).join(", "),
      department: rfq.department,
      deadline: `${rfq.closesOn}T10:00:00+05:30`,
      locked: false,
    },
    withFreight
  );

/** An RFQ raised this session, from the responses Publish now collected. */
export const sessionCompareView = (id, record, collected, withFreight = true) =>
  build(
    Object.values(collected.products).map((bucket) => ({
      item: lineItems.find((i) => i.id === bucket.itemId) || {
        name: bucket.name,
        spec: bucket.name,
        uom: bucket.uom,
        annualQty: bucket.qty,
        lastRate: Math.round((bucket.quotes.find((q) => !q.regret)?.rate || 100) * 1.04),
      },
      quotes: bucket.quotes
        .filter((q) => !q.regret)
        .map((q) => ({ vendorSlug: q.vendorSlug, rate: q.rate, leadDays: q.leadDays })),
    })),
    {
      id: Number(id),
      title: record.title,
      hotel: propertiesById["ic-mumbai"].shortName,
      department: "Housekeeping",
      deadline: record.bid_end_date || `${rfq.closesOn}T10:00:00+05:30`,
      // The real rule: sealed until the deadline. "Close bidding now" lifts it.
      locked: !record.bidding_closed,
    },
    withFreight
  );
