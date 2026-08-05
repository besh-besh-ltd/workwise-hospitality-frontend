/* ═══════════════════════════════════════════════════════════
   Quote Comparison — client-side compute helpers.
   Ported from the prototype's data.js, but every cell total is
   sourced from the BACKEND engine (quote.total) instead of being
   recomputed on the client.

   The delivery-charge toggle is applied ENTIRELY server-side: with
   ?freight=0 the payload's cells carry a reduced `total` AND an
   `other_charges` array with the delivery entries removed, so every
   helper here derives the ex-delivery figure without knowing the
   toggle exists. Do not reintroduce a per-call-site flag — that was
   the first attempt and it silently missed nine call sites (vendor
   ranks, the Overall-cost tab, the savings KPI, category subtotals).
   The comment this replaced claimed the toggle was "handled by
   refetching", which was false in both directions: the backend flag
   was dead AND these helpers re-added freight regardless.
   ═══════════════════════════════════════════════════════════ */

export const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
export const fmtLakh = (n) => {
  const l = (n || 0) / 100000;
  return l >= 100 ? (l / 100).toFixed(2) + " Cr" : l.toFixed(2) + " L";
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Per-cell landed total straight from the backend engine. This INCLUDES the
// product's share of quote-level global charges (e.g. TCS) and is the basis for
// ranking, vendor grand totals and award amounts — do not change it lightly.
export const cellTotal = (product, vendorId) => {
  const q = product?.quotes?.[vendorId];
  if (!q) return null;
  return num(q.total);
};

// Per-item LINE total: subtotal (base×qty) + GST + line charges (freight /
// packaging / other), EXCLUDING global charges. The backend's q.total folds the
// quote-level globals into every line, which over-states the per-item cost and
// makes the breakdown rows fail to reconcile. For the per-item DISPLAY we
// recompute from the line components so the shown total matches the vendor's
// submitted line total and its own breakdown. (Award / ranking / vendor grand
// still use cellTotal so globals are counted once at the quote level.)
export const cellLineTotal = (product, vendorId) => {
  const q = product?.quotes?.[vendorId];
  if (!q) return null;
  const subtotal = num(q.subtotal) ?? (num(q.base) || 0) * (product.qty || 0);
  const tax = num(q.tax_amt) || 0;
  // other_charges already contains freight + packaging (plus any custom line
  // charges); fall back to the scalar fields only when it's absent.
  const lineCharges = Array.isArray(q.other_charges)
    ? q.other_charges.reduce((s, c) => s + (num(c.amount) || 0), 0)
    : (num(q.freight) || 0) + (num(q.packaging) || 0);
  return (subtotal || 0) + tax + lineCharges;
};

// Per-unit version of cellLineTotal (line cost / qty).
export const landedLinePerUnit = (product, vendorId) => {
  const t = cellLineTotal(product, vendorId);
  if (t == null || !product.qty) return null;
  return Math.round(t / product.qty);
};

export const cellSubtotal = (product, vendorId) => {
  const q = product?.quotes?.[vendorId];
  if (!q) return null;
  // Prefer the backend-supplied subtotal; fall back to base × qty.
  const backend = num(q.subtotal);
  if (backend != null) return backend;
  const base = num(q.base);
  return base == null ? null : Math.round(base * (product.qty || 0));
};

export const landedPerUnit = (product, vendorId) => {
  const t = cellTotal(product, vendorId);
  if (t == null || !product.qty) return null;
  return Math.round(t / product.qty);
};

// LPR all-in per-unit reference (last purchase landed cost incl. GST + charges).
// Prefer the backend `landed_unit` (total_price / qty); fall back to the base
// `rate` only when no all-in figure exists.
export const lprUnit = (product) => {
  const lu = product?.lpr?.landed_unit;
  if (lu != null) return lu;
  const rate = product?.lpr?.rate;
  return rate != null ? rate : null;
};
// The LPR "grand total" for THIS product's quantity (the comparable basis to a
// cell's landed total). null when there's no LPR reference.
export const lprTotalFor = (product) => {
  const u = lprUnit(product);
  return u == null ? null : Math.round(u * (product.qty || 0));
};

// vendorId -> rank (1-based) for a product, ordered by backend total asc
export const productRanks = (product, vendors) => {
  const entries = vendors
    .map((v) => ({ id: v.id, total: cellTotal(product, v.id) }))
    .filter((e) => e.total != null)
    .sort((a, b) => a.total - b.total);
  const map = {};
  entries.forEach((e, i) => {
    map[e.id] = i + 1;
  });
  return map;
};

export const l1VendorFor = (product, vendors) => {
  const ranks = productRanks(product, vendors);
  return Object.keys(ranks).find((id) => ranks[id] === 1) || null;
};

// Per-product technical rank: T1 = highest technical score for THIS product,
// ranked ONLY among vendors who actually quoted it (a vendor that was tech-scored
// but didn't submit a price quote has no cell and must NOT consume a rank — else
// the visible cells start at T2 with no T1). Mirrors productRanks' quote filter.
// Ranks are independent per product (a vendor can be T1 here and T3 elsewhere).
export const productTechRanks = (product) => {
  const scores = product?.tech?.scores || {};
  const quotes = product?.quotes || {};
  const entries = Object.keys(scores)
    .filter((id) => quotes[id] != null)
    .map((id) => ({ id, score: Number(scores[id]) }))
    .filter((e) => Number.isFinite(e.score))
    .sort((a, b) => b.score - a.score);
  const map = {};
  entries.forEach((e, i) => {
    map[e.id] = i + 1;
  });
  return map;
};

// Technical rank for one vendor on one product. null when tech isn't configured
// for the product or the vendor has no scored verdict.
export const productTechRank = (product, vendorId) => {
  if (!product?.tech?.configured) return null;
  return productTechRanks(product)[String(vendorId)] || null;
};

// Shared rank -> colour tone for L and T badges: 1 green, 2 yellow, 3 orange, 4+ grey.
export const rankTone = (rank) => {
  if (rank === 1) return "r1";
  if (rank === 2) return "r2";
  if (rank === 3) return "r3";
  return "r4";
};

// Quote-participation % -> colour tone: >=70 green, 40-69 amber, <40 red.
export const pctTone = (pct) => {
  if (pct == null) return "pctNa";
  if (pct >= 70) return "pctHi";
  if (pct >= 40) return "pctMid";
  return "pctLo";
};

export const l1TotalFor = (product, vendors) => {
  const id = l1VendorFor(product, vendors);
  return id ? cellLineTotal(product, id) || 0 : 0;
};

// Quote-level global charges (e.g. TCS) for a vendor, counted ONCE.
// The backend distributes the global AMOUNT across products (each product's
// global_charges[].amount is its share, summing to the quote total) but folds
// the FULL global GST into EVERY product's q.total — so summing q.total
// over-counts the GST by (numProducts − 1) × GST. We sum the distributed
// amounts and add the GST a single time, taken from any one product's residual
// (q.total − line total − that product's global amount).
export const vendorGlobalCharges = (vendorId, products) => {
  let amountSum = 0;
  let gstOnce = 0;
  (products || []).forEach((p) => {
    const q = p?.quotes?.[vendorId];
    if (!q || !Array.isArray(q.global_charges) || q.global_charges.length === 0) return;
    const gAmt = q.global_charges.reduce((s, c) => s + (num(c.amount) || 0), 0);
    amountSum += gAmt;
    if (gstOnce === 0) {
      const residual = (num(q.total) || 0) - (cellLineTotal(p, vendorId) || 0) - gAmt;
      if (residual > 0.5) gstOnce = residual;
    }
  });
  return amountSum + gstOnce;
};

// Vendor grand total = Σ per-item LINE totals + quote-level globals (once).
export const vendorTotal = (vendorId, products) => {
  const lineSum = (products || []).reduce(
    (s, p) => s + (cellLineTotal(p, vendorId) || 0),
    0
  );
  return lineSum + vendorGlobalCharges(vendorId, products);
};

// Transparency breakdown of the vendor grand total.
export const vendorTotalBreakdown = (vendorId, products) => {
  const lines = (products || []).reduce(
    (s, p) => s + (cellLineTotal(p, vendorId) || 0),
    0
  );
  const globals = vendorGlobalCharges(vendorId, products);
  return { lines, globals, total: lines + globals };
};

// coverage: how many of all products a vendor quoted (non-null cell)
export const vendorCoverage = (vendorId, products) =>
  products.filter((p) => p.quotes?.[vendorId]).length;

export const isFullCoverage = (vendorId, products) =>
  products.length > 0 && vendorCoverage(vendorId, products) === products.length;

// Overall vendor rank — ONLY full-coverage vendors are comparable on grand total.
// Partial vendors get NO rank (their grand total isn't apples-to-apples).
export const vendorRanks = (vendors, products) => {
  const entries = vendors
    .filter((v) => isFullCoverage(v.id, products))
    .map((v) => ({ id: v.id, total: vendorTotal(v.id, products) }))
    .sort((a, b) => a.total - b.total);
  const map = {};
  entries.forEach((e, i) => {
    map[e.id] = i + 1;
  });
  return map;
};

export const l1GrandTotal = (vendors, products) => {
  // Σ per-product L1 LINE totals + each winning vendor's quote-level globals,
  // counted once over the products they win (exact for a single-vendor mix).
  const lineSum = products.reduce((s, p) => s + l1TotalFor(p, vendors), 0);
  const wonByVendor = {};
  products.forEach((p) => {
    const vid = l1VendorFor(p, vendors);
    if (!vid) return;
    (wonByVendor[vid] = wonByVendor[vid] || []).push(p);
  });
  const globalsSum = Object.entries(wonByVendor).reduce(
    (s, [vid, won]) => s + vendorGlobalCharges(vid, won),
    0
  );
  return lineSum + globalsSum;
};

export const finalizedGrandTotal = (products) => {
  // Σ line totals of finalized products + each finalized vendor's quote-level
  // globals once (over the products finalized to them) — same basis as the
  // vendor total, excluding the per-product global over-count.
  const wonByVendor = {};
  products.forEach((p) => {
    if (p.finalized_vendor && (p.state === "pending" || p.state === "approved")) {
      (wonByVendor[p.finalized_vendor] = wonByVendor[p.finalized_vendor] || []).push(p);
    }
  });
  return Object.entries(wonByVendor).reduce((s, [vid, won]) => {
    const lineSum = won.reduce((a, p) => a + (cellLineTotal(p, vid) || 0), 0);
    return s + lineSum + vendorGlobalCharges(vid, won);
  }, 0);
};

export const baselineTotal = (products) =>
  products.reduce((s, p) => s + (lprTotalFor(p) || 0), 0);

export const potentialSavings = (vendors, products) =>
  Math.max(0, baselineTotal(products) - l1GrandTotal(vendors, products));

export const riskFlagCount = (vendors, products) => {
  let c = 0;
  products.forEach((p) => {
    vendors.forEach((v) => {
      if (p.quotes?.[v.id] && p.quotes[v.id].missing) c++;
    });
  });
  return c;
};

export const coverageVendors = (vendors, products) =>
  vendors.filter((v) => products.some((p) => p.quotes?.[v.id])).length;

export const stateCounts = (products) => {
  const c = { total: products.length, approved: 0, pending: 0, rejected: 0, open: 0 };
  products.forEach((p) => {
    if (c[p.state] != null) c[p.state]++;
  });
  return c;
};

export const approvalPct = (products) => {
  const c = stateCounts(products);
  return c.total ? Math.round((c.approved / c.total) * 100) : 0;
};

export const lprDelta = (product, vendorId) => {
  // Compare the cell's line/unit against the LPR/unit. Uses the same line-only
  // basis as the displayed per-item total so the cell stays internally
  // consistent (shown landed/unit and the % move agree).
  const l = landedLinePerUnit(product, vendorId);
  const u = lprUnit(product);
  if (l == null || !u) return null;
  const pct = ((l - u) / u) * 100;
  return { pct: Math.abs(pct).toFixed(1), down: pct < 0 };
};

export const cellTaxAmt = (product, vendorId) => {
  const q = product?.quotes?.[vendorId];
  if (!q) return null;
  // Prefer the backend-supplied tax amount; fall back to a derived estimate.
  const backend = num(q.tax_amt);
  if (backend != null) return backend;
  const taxable = (num(q.base) || 0) * (product.qty || 0) + (num(q.freight) || 0) + (num(q.packaging) || 0);
  return Math.round(taxable * ((num(q.tax_pct) || 0) / 100));
};

// Union of charge labels across all vendors for a given product + array key.
// `key` is "other_charges" | "global_charges". Returns ordered, de-duped labels.
export const chargeLabels = (product, vendors, key) => {
  const labels = [];
  const seen = new Set();
  vendors.forEach((v) => {
    const arr = product?.quotes?.[v.id]?.[key];
    if (!Array.isArray(arr)) return;
    arr.forEach((c) => {
      const label = c?.label;
      if (label == null || label === "" || seen.has(label)) return;
      seen.add(label);
      labels.push(label);
    });
  });
  return labels;
};

// Amount for a specific charge label from a vendor's array (null if absent).
export const chargeAmount = (product, vendorId, key, label) => {
  const arr = product?.quotes?.[vendorId]?.[key];
  if (!Array.isArray(arr)) return null;
  const hit = arr.find((c) => c?.label === label);
  return hit ? num(hit.amount) : null;
};

// rank N vendor for a product { vendor, total }
export const rankVendor = (product, vendors, rank) => {
  const ranks = productRanks(product, vendors);
  const vid = Object.keys(ranks).find((id) => ranks[id] === rank);
  if (!vid) return null;
  const vendor = vendors.find((v) => String(v.id) === String(vid));
  return vendor ? { vendor, total: cellTotal(product, vid) } : null;
};

export const rankTotal = (vendors, products, rank) =>
  products.reduce((s, p) => {
    const rv = rankVendor(p, vendors, rank);
    return s + (rv ? rv.total || 0 : 0);
  }, 0);

// Line-based "total by rank": Σ per-product (rank-N vendor's LINE total) + each
// contributing vendor's quote-level globals once. Mirrors l1GrandTotal so the
// per-rank totals exclude the per-product global over-count.
export const rankLineTotal = (vendors, products, rank) => {
  let lineSum = 0;
  const wonByVendor = {};
  products.forEach((p) => {
    const ranks = productRanks(p, vendors);
    const vid = Object.keys(ranks).find((id) => ranks[id] === rank);
    if (!vid) return;
    lineSum += cellLineTotal(p, vid) || 0;
    (wonByVendor[vid] = wonByVendor[vid] || []).push(p);
  });
  const globalsSum = Object.entries(wonByVendor).reduce(
    (s, [vid, won]) => s + vendorGlobalCharges(vid, won),
    0
  );
  return lineSum + globalsSum;
};

export const catVendorSubtotal = (catId, vendorId, products) =>
  products
    .filter((p) => p.category === catId)
    .reduce((s, p) => s + (cellTotal(p, vendorId) || 0), 0);

// Average per-product technical score for a vendor (consistent with the per-cell
// T-rank badges, which read product.tech.scores). Vendors with no scored verdict
// sort last (-1). For a single-product RFQ this equals that product's score, so
// sorting by it puts T1 first.
export const vendorTechScore = (vendorId, products) => {
  let sum = 0;
  let n = 0;
  (products || []).forEach((p) => {
    if (p?.quotes?.[String(vendorId)] == null) return; // only items the vendor quoted
    const s = Number(p?.tech?.scores?.[String(vendorId)]);
    if (Number.isFinite(s)) {
      sum += s;
      n += 1;
    }
  });
  return n ? sum / n : -1;
};

// Weighted track-record score for a vendor, normalised across the comparison set:
//   POs accepted 40% + total PO value 40% + RFQs quoted 20% (higher = better).
// `maxes` carries the per-metric maxima so each term is scaled to 0-1.
export const vendorTrackScore = (vendor, maxes) => {
  const pos = (Number(vendor?.pos_accepted) || 0) / (maxes.pos || 1);
  const val = (Number(vendor?.po_value) || 0) / (maxes.val || 1);
  const quoted = (Number(vendor?.quoted_rfqs) || 0) / (maxes.quoted || 1);
  return 0.4 * pos + 0.4 * val + 0.2 * quoted;
};

// Vendor column ordering. Mirrors the prototype's sortedVendors:
//  - price : full-coverage-first, then by vendorTotal asc
//  - tech  : by average per-product technical score desc (matches T-rank badges)
//  - track : by weighted composite (PO accepted 40% + PO value 40% + quoted 20%)
export const sortedVendors = (vendors, products, mode = "price") => {
  const vs = [...vendors];
  if (mode === "tech") {
    vs.sort((a, b) => vendorTechScore(b.id, products) - vendorTechScore(a.id, products));
  } else if (mode === "track") {
    const maxes = {
      pos: Math.max(1, ...vs.map((v) => Number(v.pos_accepted) || 0)),
      val: Math.max(1, ...vs.map((v) => Number(v.po_value) || 0)),
      quoted: Math.max(1, ...vs.map((v) => Number(v.quoted_rfqs) || 0)),
    };
    vs.sort((a, b) => vendorTrackScore(b, maxes) - vendorTrackScore(a, maxes));
  } else {
    vs.sort((a, b) => {
      const fa = isFullCoverage(a.id, products);
      const fb = isFullCoverage(b.id, products);
      if (fa !== fb) return fa ? -1 : 1;
      return vendorTotal(a.id, products) - vendorTotal(b.id, products);
    });
  }
  return vs;
};

// recommendNext: L1 vendor for a product EXCLUDING the rejected one.
// (The contract doesn't ship a recommendation, so compute it on the FE.)
export const recommendNextVendor = (product, vendors, excludeVendorId) => {
  const entries = vendors
    .filter((v) => String(v.id) !== String(excludeVendorId))
    .map((v) => ({ id: v.id, total: cellTotal(product, v.id) }))
    .filter((e) => e.total != null)
    .sort((a, b) => a.total - b.total);
  if (!entries.length) return null;
  return vendors.find((v) => String(v.id) === String(entries[0].id)) || null;
};

// ── Quote (negotiation) history per product × vendor ──
// Sourced from REAL data: the legacy getQuoteComparison(include_negotiation:true)
// quotation carries previous_quotes[] (prior rounds) + the current submission.
// Builds R1→Rn oldest→newest with per-round price, date, note + savings delta.
const histNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const quoteHistoryFor = (legacyQuotation, getDetails) => {
  if (!legacyQuotation) return [];
  const rows = [];
  const prev = Array.isArray(legacyQuotation.previous_quotes)
    ? [...legacyQuotation.previous_quotes]
    : [];

  // previous_quotes is newest-first in the legacy payload → reverse to oldest-first.
  prev.reverse();

  const pickPrice = (q, d) =>
    histNum(d?.unit_price) ??
    histNum(q?.unit_price) ??
    histNum(d?.total_price) ??
    histNum(q?.total_price);

  prev.forEach((pq) => {
    const d = getDetails ? getDetails(pq) || pq : pq;
    rows.push({
      price: pickPrice(pq, d),
      date: pq.created_at || d?.created_at || null,
      note: pq.comment || d?.comment || "Revised submission",
    });
  });

  // current/final round
  const cd = getDetails ? getDetails(legacyQuotation) || legacyQuotation : legacyQuotation;
  rows.push({
    price: pickPrice(legacyQuotation, cd),
    date: legacyQuotation.created_at || cd?.created_at || null,
    note: cd?.comment || legacyQuotation.comment || "Best & final",
    final: true,
  });

  // assign round numbers + savings delta vs prior round
  return rows.map((r, i) => {
    const prior = i > 0 ? rows[i - 1].price : null;
    const delta = prior != null && r.price != null ? prior - r.price : null;
    return {
      round: i + 1,
      price: r.price,
      date: r.date,
      note: r.note,
      delta: delta != null && delta > 0 ? delta : null,
      final: !!r.final,
    };
  });
};

// Avatar palette cycle for vendor short badges.
const AVATARS = ["av-indigo", "av-rose", "av-green", "av-warm", "av-blue"];
export const avatarFor = (vendorId, idx = 0) => AVATARS[idx % AVATARS.length];
