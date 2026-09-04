import { lineItems } from "./thread";

/**
 * The six responses to RFQ #535944.
 *
 * Nobody quotes every line — a terry mill does not bid bed linen, an amenities
 * specialist does not bid towels. That partial coverage is the point: it is
 * what makes the comparison grid worth looking at, and it is why the award
 * ends up split across suppliers rather than going to one.
 *
 * Rates are ex-works per unit in rupees, before freight and GST.
 */

const RATES = {
  //            bath   hand   sheet  duvet  pillow  mat    robe   amenity
  sriram:    { "twl-bath-500": 412, "twl-hand-500": 158, "bath-mat": 369, "bathrobe": 1109 },
  nandan:    { "twl-bath-500": 421, "twl-hand-500": 161, "bath-mat": 376 },
  trident:   { "twl-bath-500": 431, "twl-hand-500": 163, "bed-sheet-300": 1086, "duvet-cover": 1421, "pillow-cover": 229, "bath-mat": 380 },
  welspun:   { "twl-bath-500": 448, "twl-hand-500": 172, "bed-sheet-300": 1142, "duvet-cover": 1494, "pillow-cover": 241, "bath-mat": 400, "bathrobe": 1204 },
  aarvi:     { "twl-bath-500": 470, "twl-hand-500": 180, "bath-mat": 419, "bathrobe": 1262, "amenity-kit": 159 },
  greenleaf: { "amenity-kit": 146 },
};

const TERMS = {
  welspun:   { submittedOn: "2026-06-11", leadTimeDays: 35, paymentTerms: "30 days from GRN", freight: "Included, all 5 properties", moq: "500 pc per SKU", validityDays: 60 },
  sriram:    { submittedOn: "2026-06-14", leadTimeDays: 28, paymentTerms: "45 days from GRN", freight: "Included, all 5 properties", moq: "250 pc per SKU", validityDays: 90 },
  nandan:    { submittedOn: "2026-06-17", leadTimeDays: 32, paymentTerms: "30 days from GRN", freight: "Included, all 5 properties", moq: "400 pc per SKU", validityDays: 60 },
  trident:   { submittedOn: "2026-06-21", leadTimeDays: 40, paymentTerms: "30 days from GRN", freight: "Extra for Sawai Madhopur", moq: "600 pc per SKU", validityDays: 45 },
  greenleaf: { submittedOn: "2026-06-24", leadTimeDays: 21, paymentTerms: "30 days from GRN", freight: "Included, all 5 properties", moq: "2,000 sets", validityDays: 90 },
  aarvi:     { submittedOn: "2026-06-27", leadTimeDays: 45, paymentTerms: "15 days from GRN", freight: "Ex-works Mumbai", moq: "300 pc per SKU", validityDays: 30 },
};

const qtyOf = (itemId) => lineItems.find((i) => i.id === itemId)?.annualQty || 0;
const baseOf = (itemId) => lineItems.find((i) => i.id === itemId)?.lastRate || 0;

/** One quote per responding vendor, with its lines and computed totals. */
export const quotes = Object.entries(RATES).map(([vendorId, rates]) => {
  const lines = Object.entries(rates).map(([itemId, rate]) => {
    const qty = qtyOf(itemId);
    const base = baseOf(itemId);
    return {
      itemId,
      rate,
      qty,
      value: rate * qty,
      // Movement against what IHG last paid — the number a buyer actually reads.
      vsLastPct: Number((((rate - base) / base) * 100).toFixed(1)),
    };
  });
  return {
    vendorId,
    ...TERMS[vendorId],
    lines,
    itemsQuoted: lines.length,
    value: lines.reduce((s, l) => s + l.value, 0),
  };
});

export const quotesByVendor = Object.fromEntries(quotes.map((q) => [q.vendorId, q]));

/** Every quote for one line item, cheapest first. */
export const quotesForItem = (itemId) =>
  quotes
    .map((q) => {
      const line = q.lines.find((l) => l.itemId === itemId);
      return line ? { vendorId: q.vendorId, ...line } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.rate - b.rate);

/** Low / high / spread for a line item, for the comparison grid header. */
export const rangeForItem = (itemId) => {
  const rows = quotesForItem(itemId);
  if (!rows.length) return null;
  const low = rows[0];
  const high = rows[rows.length - 1];
  return {
    low,
    high,
    count: rows.length,
    spreadPct: Number((((high.rate - low.rate) / low.rate) * 100).toFixed(1)),
  };
};

/**
 * Best achievable spend if every line went to its cheapest bidder, against
 * what the same basket cost at last year's rates. This is the headline the
 * comparison screen leads with.
 */
export const bestCaseSummary = () => {
  let best = 0;
  let baseline = 0;
  const awards = [];
  lineItems.forEach((item) => {
    const rows = quotesForItem(item.id);
    baseline += item.lastRate * item.annualQty;
    if (!rows.length) {
      // Nobody bid this line — it stays at last year's rate for comparison
      // purposes rather than silently vanishing from the total.
      best += item.lastRate * item.annualQty;
      awards.push({ itemId: item.id, vendorId: null, rate: item.lastRate, unbid: true });
      return;
    }
    best += rows[0].value;
    awards.push({ itemId: item.id, vendorId: rows[0].vendorId, rate: rows[0].rate });
  });
  return {
    best,
    baseline,
    saving: baseline - best,
    savingPct: Number((((baseline - best) / baseline) * 100).toFixed(1)),
    awards,
  };
};

export default quotes;
