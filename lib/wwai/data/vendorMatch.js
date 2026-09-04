/* eslint-disable */
/**
 * Fixture for the vendorMatch AI panel — the prototype's own data, carried
 * across so the analysis, the numbers and the narrative are exactly what
 * was signed off. Only the client naming is re-badged for IHG; the
 * suppliers and their histories are the story and are untouched.
 *
 * Ported from workwise-ai-prototypes/ai_vendor_match/data.js
 */
/* ═══════════════════════════════════════════════════════════════════
   IHG · AI vendor matching — demo dataset + scoring model
   ───────────────────────────────────────────────────────────────────
   Tenant : IHG Hotels & Resorts
   BU     : InterContinental Marine Drive, Mumbai
   User   : Vivek Jaiswal  ·  14 Aug 2026, IST

   Every score on screen is COMPUTED from the raw history below by
   score() / confirmProbability() — nothing is typed in by hand — so the
   panel, the badges and the vendors table can never drift apart.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var TODAY = new Date(2026, 7, 14);      // 14 Aug 2026
  var RFQ_CLOSE = new Date(2026, 8, 4);   // 04 Sep 2026 — expected bid close
  var SUB_HORIZON = new Date(2027, 2, 31); // 31 Mar 2027 — subscription year end

  /* ── formatting ────────────────────────────────────────────────── */
  var inr0 = new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  });
  function money(n) { return inr0.format(n); }
  function num(n) { return new Intl.NumberFormat('en-IN').format(n); }
  function day(d) {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).format(d).replace(/ /g, ' ');
  }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }

  /* ── the model ─────────────────────────────────────────────────────
     Composite match score, 0–100, four weighted components.

       score = 0.35·performance + 0.30·response + 0.20·price + 0.15·compliance

     performance   0.60·on-time% + 0.25·turnaround + 0.15·dispute-free
     response      response-rate × recency-decay × award-affinity
     price         LPR against the best LPR in the eligible set, 6× levered
     compliance    approved-vendor list, subscription validity, docs on file

     A vendor is RECOMMENDED at score ≥ 60. One exception: a newly
     onboarded vendor with clean compliance and no history is admitted as
     a single-line price probe even below the bar — see coldStart().
     ─────────────────────────────────────────────────────────────────── */
  var MODEL = {
    version: 'vendor-match v0.9',
    bar: 60,
    weights: { performance: 0.35, response: 0.30, price: 0.20, compliance: 0.15 },
    priors: { performance: 62, response: 66, price: 50 },  // HOUSEKEEPING SUPPLY medians
    lprIndex: 408,        // 12-month category index, ₹/pc, bath & pool linen
    turnaroundFloorHrs: 12
  };

  function clamp(x, a, b) { return Math.max(a === undefined ? 0 : a, Math.min(b === undefined ? 100 : b, x)); }

  function recencyFactor(v) {
    if (!v.lastQuoteOn) return null;
    var d = daysBetween(v.lastQuoteOn, TODAY);
    return d < 60 ? 1.00 : d < 120 ? 0.92 : d < 240 ? 0.85 : 0.70;
  }
  function awardAffinity(v) { return Math.min(1.15, 0.85 + 0.03 * v.awards); }

  function components(v, bestLpr) {
    var c = {};
    if (v.rfqsInvited === 0) {                       // cold start — priors, not evidence
      c.performance = MODEL.priors.performance;
      c.response = MODEL.priors.response;
      c.price = MODEL.priors.price;
    } else {
      var turn = clamp(100 - (v.turnaroundHrs - MODEL.turnaroundFloorHrs) * 1.6);
      var clean = clamp(100 - v.disputes * 25);
      c.performance = 0.60 * v.onTimePct + 0.25 * turn + 0.15 * clean;
      c.response = clamp(v.responseRate * recencyFactor(v) * awardAffinity(v));
      c.price = v.lpr ? clamp(100 - (v.lpr - bestLpr) / bestLpr * 600) : MODEL.priors.price;
    }
    c.compliance =
      40 * (v.approvedVendorList ? 1 : 0.45) +
      35 * (v.subscriptionTill >= RFQ_CLOSE ? 1 : 0.2) +
      25 * (v.docsComplete ? 1 : 0);
    return c;
  }

  function score(v, bestLpr) {
    var c = components(v, bestLpr === undefined ? 392 : bestLpr);
    var w = MODEL.weights;
    return Math.round(
      w.performance * c.performance + w.response * c.response +
      w.price * c.price + w.compliance * c.compliance
    );
  }

  /* P(vendor submits a quote) — deliberately NOT the match score.
     Response rate is observed; recency and award affinity shape it. */
  function confirmProbability(v) {
    if (v.rfqsInvited === 0) return MODEL.priors.response;   // category prior
    return Math.round(clamp(v.responseRate * recencyFactor(v) * awardAffinity(v)));
  }

  /* Half-width of the 95% interval on the response estimate — the honest
     error bar. With zero observations the interval is barely narrower than
     the whole range, so a cold-start vendor gets the ceiling, not a number
     that flatters it. */
  function confidenceBand(v) {
    var n = v.rfqsInvited;
    if (n === 0) return 35;
    var p = v.quotesReturned / n;
    return Math.round(clamp(196 * Math.sqrt(p * (1 - p) / n), 4, 35));
  }

  function coldStart(v) { return v.rfqsInvited === 0; }

  /* ── vendor pool ───────────────────────────────────────────────────
     22 vendors are category-eligible for the staged basket under the
     current boolean rules. 12 of them have any trace at this BU and are
     profiled here; the other 10 have never been invited and never quoted.
     ─────────────────────────────────────────────────────────────────── */
  function V(o) {
    o.responseRate = o.rfqsInvited ? Math.round(1000 * o.quotesReturned / o.rfqsInvited) / 10 : 0;
    return o;
  }

  var VENDORS = [
    V({
      id: 'shree', name: 'Sriram Textiles Pvt Ltd', city: 'Bhiwandi, MH',
      onboardedOn: new Date(2023, 5, 12),
      rfqsInvited: 34, quotesReturned: 24, awards: 12,
      onTimePct: 96, turnaroundHrs: 14, disputes: 0,
      lpr: 392, lprOn: new Date(2026, 5, 11), lprPo: 'PO/WG/26-27/0412',
      lastQuoteOn: new Date(2026, 6, 28),
      approvedVendorList: true, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: true, gstin: '27AAECS4471M1Z2',
      rationale: 'Ranks first on every line. Twelve awarded POs at this BU, 96% of receipts on or before the promised date, and the lowest LPR in the set at ₹392. The only vendor on the approved-vendor list for HOUSEKEEPING SUPPLY.'
    }),
    V({
      id: 'anand', name: 'Nandan Terry Ltd', city: 'Solapur, MH',
      onboardedOn: new Date(2023, 10, 3),
      rfqsInvited: 28, quotesReturned: 23, awards: 9,
      onTimePct: 91, turnaroundHrs: 19, disputes: 1,
      lpr: 404, lprOn: new Date(2026, 4, 28), lprPo: 'PO/WG/26-27/0338',
      lastQuoteOn: new Date(2026, 7, 2),
      approvedVendorList: false, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: true, gstin: '27AACCA9911K1ZK',
      rationale: 'The most reliable responder in the pool — 23 of 28 invitations answered, median turnaround 19 h, last quote twelve days ago. One short-supply dispute on PO/WG/25-26/0291, closed.'
    }),
    V({
      id: 'trident', name: 'Trident Terry Mills', city: 'Karur, TN',
      onboardedOn: new Date(2024, 1, 20),
      rfqsInvited: 26, quotesReturned: 18, awards: 5,
      onTimePct: 92, turnaroundHrs: 22, disputes: 0,
      lpr: 396, lprOn: new Date(2026, 6, 5), lprPo: 'PO/WG/26-27/0451',
      lastQuoteOn: new Date(2026, 6, 15),
      approvedVendorList: false, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: true, gstin: '33AABCT2331P1ZQ',
      rationale: 'Second-cheapest observed rate at ₹396 and a clean delivery record — 92% on time across five awards, no disputes. Priced within 1% of Sriram without the approved-vendor status.'
    }),
    V({
      id: 'kohinoor', name: 'Kohinoor Terry Products', city: 'Karur, TN',
      onboardedOn: new Date(2023, 8, 8),
      rfqsInvited: 24, quotesReturned: 18, awards: 5,
      onTimePct: 93, turnaroundHrs: 24, disputes: 0,
      lpr: 408, lprOn: new Date(2026, 5, 18), lprPo: 'PO/WG/26-27/0424',
      lastQuoteOn: new Date(2026, 6, 22),
      approvedVendorList: false, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: true, gstin: '33AAFCK5580R1ZB',
      rationale: 'Sits exactly on the ₹408 category index — no price advantage, but 93% on-time and a 75% response rate make it a dependable body in the set.'
    }),
    V({
      id: 'rajhans', name: 'Rajhans Hometex LLP', city: 'Bhiwandi, MH',
      onboardedOn: new Date(2024, 3, 2),
      rfqsInvited: 22, quotesReturned: 17, awards: 6,
      onTimePct: 89, turnaroundHrs: 21, disputes: 0,
      lpr: 399, lprOn: new Date(2026, 3, 24), lprPo: 'PO/WG/26-27/0287',
      lastQuoteOn: new Date(2026, 5, 30),
      approvedVendorList: false, subscriptionTill: new Date(2026, 7, 23),
      docsComplete: true, gstin: '27AAOFR1180G1Z7',
      flag: 'expiring-subscription',
      rationale: 'Strong on every performance signal — 89% on-time, ₹399 LPR, 77% response. Its HOUSEKEEPING SUPPLY subscription lapses on 23 Aug 2026, before this RFQ is due to close, which is the only reason its compliance component sits at 50.'
    }),
    V({
      id: 'deccan', name: 'Deccan Mills Pvt Ltd', city: 'Ahmedabad, GJ',
      onboardedOn: new Date(2023, 2, 17),
      rfqsInvited: 20, quotesReturned: 16, awards: 3,
      onTimePct: 84, turnaroundHrs: 27, disputes: 0,
      lpr: 428, lprOn: new Date(2026, 6, 9), lprPo: 'PO/WG/26-27/0466',
      lastQuoteOn: new Date(2026, 6, 18),
      approvedVendorList: false, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: true, gstin: '24AADCD8802N1ZE',
      rationale: 'Answers 8 invitations in 10 and delivers acceptably, but its ₹428 LPR is 5% above the index — it earns its place on response reliability, not on price.'
    }),
    V({
      id: 'gokul', name: 'GreenLeaf Amenities Pvt Ltd', city: 'Vasai, MH',
      onboardedOn: new Date(2024, 0, 9),
      rfqsInvited: 19, quotesReturned: 12, awards: 4,
      onTimePct: 88, turnaroundHrs: 31, disputes: 0,
      lpr: 417, lprOn: new Date(2026, 3, 2), lprPo: 'PO/WG/26-27/0244',
      lastQuoteOn: new Date(2026, 6, 14),
      approvedVendorList: false, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: true, gstin: '27AAGFG7712L1ZM',
      rationale: 'Middle of the pack throughout — 63% response, 88% on-time, ₹417. Included because nothing about it is a risk, not because anything about it is strong.'
    }),
    V({
      id: 'vaibhav', name: 'Vaibhav Home Linen', city: 'Panipat, HR',
      onboardedOn: new Date(2025, 4, 26),
      rfqsInvited: 9, quotesReturned: 6, awards: 1,
      onTimePct: 81, turnaroundHrs: 34, disputes: 0,
      lpr: 413, lprOn: new Date(2026, 2, 21), lprPo: 'PO/WG/25-26/0193',
      lastQuoteOn: new Date(2026, 6, 2),
      approvedVendorList: false, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: true, gstin: '06AAJFV3320H1ZD',
      rationale: 'Thin but positive history — nine invitations, six answers, one award delivered at 81% on-time. Nine data points buy very little certainty: the interval on its response estimate is ±31, the widest of any vendor we are recommending on evidence.'
    }),
    V({
      id: 'nakshatra', name: 'Nakshatra Weaves & Co', city: 'Panipat, HR',
      onboardedOn: new Date(2026, 7, 2),
      rfqsInvited: 0, quotesReturned: 0, awards: 0,
      onTimePct: null, turnaroundHrs: null, disputes: 0,
      lpr: null, lprOn: null, lprPo: null,
      lastQuoteOn: null,
      approvedVendorList: false, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: false, docsNote: 'Bank account verification pending', docsFlag: 'Bank verification pending',
      gstin: '06AAKCN0912B1ZR',
      flag: 'cold-start',
      rationale: 'Onboarded twelve days ago. No RFQ history, no LPR, no GRN record — its 59 is the HOUSEKEEPING SUPPLY prior, not a measurement. With zero observations the interval on its response estimate is ±35, barely narrower than the whole range. Worth one line as a price probe; not worth counting on.'
    }),
    V({
      id: 'meridian', name: 'Kaveri Home Textiles', city: 'Surat, GJ',
      onboardedOn: new Date(2024, 7, 14),
      rfqsInvited: 11, quotesReturned: 5, awards: 1,
      onTimePct: 78, turnaroundHrs: 46, disputes: 1,
      lpr: null, lprOn: null, lprPo: null,
      lastQuoteOn: new Date(2026, 1, 12),
      approvedVendorList: false, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: true, gstin: '24AAMCM6621J1ZA',
      rationale: 'The closest miss at 56. Answers fewer than half its invitations, has not quoted since Feb 2026, and has never been awarded a towel line — so there is no LPR to price against. Add it manually if you want a fourth body on TOWEL BATH.'
    }),
    V({
      id: 'ashirwad', name: 'Ashirwad Textile Traders', city: 'Mumbai, MH',
      onboardedOn: new Date(2024, 2, 5),
      rfqsInvited: 13, quotesReturned: 7, awards: 2,
      onTimePct: 71, turnaroundHrs: 38, disputes: 2,
      lpr: 441, lprOn: new Date(2026, 0, 15), lprPo: 'PO/WG/25-26/0121',
      lastQuoteOn: new Date(2026, 2, 4),
      approvedVendorList: false, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: true, gstin: '27AAPFA4409C1ZN',
      rationale: 'Two open quality disputes, 71% on-time and the second-highest LPR in the pool at ₹441. Nothing here argues for an invitation.'
    }),
    V({
      id: 'suvarna', name: 'Solapur Terry Mills', city: 'Ichalkaranji, MH',
      onboardedOn: new Date(2024, 5, 22),
      rfqsInvited: 7, quotesReturned: 2, awards: 0,
      onTimePct: 62, turnaroundHrs: 62, disputes: 2,
      lpr: 455, lprOn: new Date(2025, 10, 19), lprPo: 'PO/WG/25-26/0048',
      lastQuoteOn: new Date(2025, 10, 12),
      approvedVendorList: false, subscriptionTill: new Date(2027, 2, 31),
      docsComplete: false, docsNote: 'Udyam (MSME) certificate expired 31 Mar 2026', docsFlag: 'MSME cert expired',
      gstin: '27AAWFS8830Q1ZG',
      rationale: 'Two answers out of seven invitations, no award ever, 62% on-time on the two POs it did receive, and an expired MSME certificate. Excluded.'
    })
  ];

  /* the ENGINEERING side — why TOWEL RACK SS has nobody */
  var ENGINEERING_NEAR_MISS = [
    {
      name: 'Sanghvi Steel Fittings',
      city: 'Bhiwandi, MH',
      holds: 'ENGINEERING category subscription, valid to 31 Mar 2027',
      missing: 'no InterContinental Marine Drive hotel subscription — mapped to voco Jim Corbett only',
      history: '8 RFQs at voco Jim Corbett · 75% response · 2 awards'
    },
    {
      name: 'Deccan Mills Pvt Ltd',
      city: 'Ahmedabad, GJ',
      holds: 'InterContinental Marine Drive hotel subscription, valid to 31 Mar 2027',
      missing: 'subscription covers HOUSEKEEPING SUPPLY only, not ENGINEERING',
      history: '20 RFQs at InterContinental Marine Drive · 80% response · 3 awards'
    }
  ];

  var byId = {};
  VENDORS.forEach(function (v) { byId[v.id] = v; });

  var BEST_LPR = VENDORS.reduce(function (m, v) {
    return v.lpr && v.lpr < m ? v.lpr : m;
  }, Infinity);

  VENDORS.forEach(function (v) {
    v.components = components(v, BEST_LPR);
    v.score = score(v, BEST_LPR);
    v.pQuote = confirmProbability(v);
    v.band = confidenceBand(v);
    v.coldStart = coldStart(v);
    v.subDaysLeft = daysBetween(TODAY, v.subscriptionTill);
    v.subExpiresBeforeClose = v.subscriptionTill < RFQ_CLOSE;
    v.recommended = v.score >= MODEL.bar || (v.coldStart && v.subscriptionTill >= RFQ_CLOSE);
    v.probeOnly = v.coldStart && v.score < MODEL.bar;
  });

  /* ── product pool ──────────────────────────────────────────────────
     The full linen catalogue a "towel" search reaches at this business
     unit. Every line is a real hotel housekeeping item with a plausible
     replenishment quantity; the eligible list reflects which of the 12
     mapped vendors actually hold that sub-category.

     A demo should not show the same basket twice. On each load we take a
     random 5–6 of these plus exactly one zero-vendor ENGINEERING line,
     and stage three. Add ?seed=<n> to pin a basket for a scripted run.
     ─────────────────────────────────────────────────────────────────── */
  function P(o) { return o; }

  var POOL = [
    /* ── terry: bath & pool ─────────────────────────────────────── */
    P({ id: 'towel-36x73-green', kw: ['terry','guest','housekeeping'], name: 'TOWEL 36X73 GREEN', category: 'HOUSEKEEPING SUPPLY', sub: 'TOWEL', qty: 500, uom: 'PCS',
        eligible: ['shree','anand','trident','kohinoor','rajhans','deccan','gokul','vaibhav','nakshatra','meridian','ashirwad','suvarna'], dormant: 4 }),
    P({ id: 'bath-towel-500', kw: ['terry','guest','housekeeping'], name: 'BATH TOWEL 500 GSM', category: 'HOUSEKEEPING SUPPLY', sub: 'TOWEL', qty: 350, uom: 'PCS',
        eligible: ['shree','anand','trident','kohinoor','rajhans','deccan','gokul','vaibhav','meridian','ashirwad'], dormant: 3 }),
    /* Already on an annual rate contract. A buyer can still search it and
       still try to add it — that is exactly the leak this control closes. */
    P({ id: 'bath-towel-550-arc', kw: ['terry','guest','housekeeping'], name: 'BATH TOWEL 550 GSM', category: 'HOUSEKEEPING SUPPLY', sub: 'TOWEL', qty: 600, uom: 'PCS',
        eligible: ['shree','anand','trident','kohinoor','deccan','vaibhav'], dormant: 3,
        arc: {
          contract: 'ARC-2026-27-0031',
          vendor: 'Sriram Textiles Pvt Ltd',
          rate: 396,
          uom: 'pc',
          validFrom: '01 Apr 2026',
          validTill: '31 Mar 2027',
          committedQty: 18000,
          drawnQty: 11240,
          owner: 'Group Procurement',
          signedBy: 'Varun Sahani, VP Operations',
          scope: 'All IHG Hotels & Resorts properties'
        } }),
    P({ id: 'bath-towel-600', kw: ['terry','guest','housekeeping'], name: 'BATH TOWEL 600 GSM PREMIUM', category: 'HOUSEKEEPING SUPPLY', sub: 'TOWEL', qty: 220, uom: 'PCS',
        eligible: ['shree','trident','kohinoor','rajhans','deccan','vaibhav','meridian'], dormant: 3 }),
    P({ id: 'hand-towel-400', kw: ['terry','guest','housekeeping'], name: 'HAND TOWEL 400 GSM', category: 'HOUSEKEEPING SUPPLY', sub: 'TOWEL', qty: 700, uom: 'PCS',
        eligible: ['shree','anand','trident','kohinoor','gokul','deccan','vaibhav','ashirwad','suvarna'], dormant: 2 }),
    P({ id: 'towel-bath', kw: ['terry','guest','housekeeping'], name: 'TOWEL BATH', category: 'HOUSEKEEPING SUPPLY', sub: '', qty: 400, uom: 'PCS',
        eligible: ['shree','anand','trident','kohinoor','rajhans','gokul','nakshatra','ashirwad','suvarna'], dormant: 3 }),
    P({ id: 'towel-face', kw: ['terry','guest','housekeeping'], name: 'TOWEL FACE', category: 'HOUSEKEEPING SUPPLY', sub: '', qty: 600, uom: 'PCS',
        eligible: ['anand','kohinoor','gokul','deccan','vaibhav','meridian','ashirwad','suvarna'], dormant: 2 }),
    P({ id: 'face-towel-12', kw: ['terry','guest','housekeeping'], name: 'FACE TOWEL 12 " x 12"', category: 'HOUSEKEEPING SUPPLY', sub: '', qty: 800, uom: 'PCS',
        eligible: ['shree','anand','trident','kohinoor','gokul','deccan','meridian','suvarna'], dormant: 2 }),
    P({ id: 'pool-towel', kw: ['terry','spa','pool','guest'], name: 'POOL TOWEL', category: 'HOUSEKEEPING SUPPLY', sub: '', qty: 300, uom: 'PCS',
        eligible: ['shree','anand','trident','kohinoor','rajhans','deccan','gokul','meridian','suvarna'], dormant: 3 }),
    P({ id: 'club-hand-towel', kw: ['terry','guest','housekeeping'], name: 'CLUB-HAND TOWEL 16 x 27', category: 'HOUSEKEEPING SUPPLY', sub: 'CLUB-HAND TOWEL', qty: 250, uom: 'PCS',
        eligible: ['anand','kohinoor','gokul','vaibhav','ashirwad','meridian'], dormant: 2 }),
    P({ id: 'bath-mat-900', kw: ['terry','spa','guest','housekeeping'], name: 'BATH MAT 900 GSM', category: 'HOUSEKEEPING SUPPLY', sub: 'TOWEL', qty: 280, uom: 'PCS',
        eligible: ['shree','anand','trident','kohinoor','deccan','gokul','vaibhav'], dormant: 3 }),
    P({ id: 'gym-towel', kw: ['terry','spa','guest'], name: 'GYM TOWEL 350 GSM', category: 'HOUSEKEEPING SUPPLY', sub: 'TOWEL', qty: 400, uom: 'PCS',
        eligible: ['anand','trident','kohinoor','gokul','vaibhav','nakshatra','ashirwad'], dormant: 2 }),
    P({ id: 'kitchen-towel', kw: ['banquet','kitchen','housekeeping'], name: 'KITCHEN / GLASS TOWEL 20X30', category: 'HOUSEKEEPING SUPPLY', sub: '', qty: 900, uom: 'PCS',
        eligible: ['anand','deccan','gokul','vaibhav','meridian','ashirwad','suvarna'], dormant: 2 }),

    /* ── robes, slippers ────────────────────────────────────────── */
    P({ id: 'bath-robe-terry', kw: ['terry','spa','guest'], name: 'BATH ROBE TERRY 400 GSM', category: 'HOUSEKEEPING SUPPLY', sub: 'ROBE', qty: 180, uom: 'PCS',
        eligible: ['shree','trident','kohinoor','rajhans','vaibhav','meridian'], dormant: 3 }),
    P({ id: 'bath-robe-waffle', kw: ['spa','guest'], name: 'BATH ROBE WAFFLE WEAVE', category: 'HOUSEKEEPING SUPPLY', sub: 'ROBE', qty: 150, uom: 'PCS',
        eligible: ['shree','trident','kohinoor','deccan','nakshatra'], dormant: 4 }),

    /* ── bed linen ──────────────────────────────────────────────── */
    P({ id: 'bed-sheet-300-king', kw: ['room','guest','housekeeping'], name: 'BED SHEET 300 TC KING', category: 'HOUSEKEEPING SUPPLY', sub: 'BED LINEN', qty: 320, uom: 'PCS',
        eligible: ['shree','anand','deccan','gokul','vaibhav','nakshatra','meridian','ashirwad'], dormant: 3 }),
    /* Second live contract, bed linen side — so whichever term the buyer
       searches, the rate-contract control is reachable. */
    P({ id: 'bed-sheet-400-arc', kw: ['room','guest','housekeeping'], name: 'BED SHEET 400 TC QUEEN', category: 'HOUSEKEEPING SUPPLY', sub: 'BED LINEN', qty: 280, uom: 'PCS',
        eligible: ['anand','deccan','vaibhav','nakshatra','gokul'], dormant: 4,
        arc: {
          contract: 'ARC-2026-27-0018',
          vendor: 'Deccan Mills Pvt Ltd',
          rate: 1180,
          uom: 'pc',
          validFrom: '01 Apr 2026',
          validTill: '31 Mar 2027',
          committedQty: 4200,
          drawnQty: 1960,
          owner: 'Group Procurement',
          signedBy: 'Smita Nanda, Chief Financial Officer',
          scope: 'All IHG Hotels & Resorts properties'
        } }),
    P({ id: 'pillow-cover-300', kw: ['room','guest','housekeeping'], name: 'PILLOW COVER 300 TC', category: 'HOUSEKEEPING SUPPLY', sub: 'BED LINEN', qty: 950, uom: 'PCS',
        eligible: ['shree','anand','deccan','gokul','vaibhav','nakshatra','ashirwad','suvarna'], dormant: 2 }),
    P({ id: 'duvet-cover-king', kw: ['room','guest','housekeeping'], name: 'DUVET COVER KING 300 TC', category: 'HOUSEKEEPING SUPPLY', sub: 'BED LINEN', qty: 240, uom: 'PCS',
        eligible: ['anand','deccan','vaibhav','nakshatra','meridian'], dormant: 4 }),
    P({ id: 'mattress-protector', kw: ['room','guest','housekeeping'], name: 'MATTRESS PROTECTOR KING', category: 'HOUSEKEEPING SUPPLY', sub: 'BED LINEN', qty: 160, uom: 'PCS',
        eligible: ['anand','deccan','gokul','vaibhav','nakshatra'], dormant: 3 }),

    /* ── F&B linen ──────────────────────────────────────────────── */
    P({ id: 'napkin-cotton', kw: ['banquet','fnb','restaurant'], name: 'TABLE NAPKIN COTTON 20X20', category: 'HOUSEKEEPING SUPPLY', sub: 'F&B LINEN', qty: 1200, uom: 'PCS',
        eligible: ['anand','deccan','gokul','vaibhav','meridian','ashirwad','suvarna'], dormant: 2 }),
    P({ id: 'table-cloth-108', kw: ['banquet','fnb','restaurant'], name: 'TABLE CLOTH 108" ROUND', category: 'HOUSEKEEPING SUPPLY', sub: 'F&B LINEN', qty: 140, uom: 'PCS',
        eligible: ['anand','deccan','vaibhav','meridian','ashirwad'], dormant: 3 })
  ];

  /* Engineering lines the same search surfaces. None can be sourced:
     no vendor holds both the ENGINEERING category and this hotel. */
  var ENG_POOL = [
    P({ id: 'towel-rack-ss', name: 'TOWEL RACK SS', category: 'ENGINEERING', sub: '', qty: 40, uom: 'NOS', eligible: [], dormant: 0, noVendors: true }),
    P({ id: 'robe-hook-ss', name: 'ROBE HOOK SS 304', category: 'ENGINEERING', sub: '', qty: 120, uom: 'NOS', eligible: [], dormant: 0, noVendors: true }),
    P({ id: 'towel-ring-ss', name: 'TOWEL RING SS 304 SATIN', category: 'ENGINEERING', sub: '', qty: 90, uom: 'NOS', eligible: [], dormant: 0, noVendors: true })
  ];

  /* ── per-load basket selection ─────────────────────────────────── */
  /* mulberry32 — small, seedable, and stable for a whole page life so
     that clicking around never reshuffles what the visitor is looking at. */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function seedFromUrl() {
    var m = /[?&]seed=(\d+)/.exec(global.location ? global.location.search : '');
    if (m) return parseInt(m[1], 10);
    return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
  }

  var SEED = seedFromUrl();
  var rand = rng(SEED);

  function pick(arr, n) {
    var copy = arr.slice(), out = [];
    while (out.length < n && copy.length) {
      out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
    }
    return out;
  }

  /* Every line is in the catalogue; the search box decides what the buyer
     actually sees. visibleFor() below caps a result set at 5–6 rows and
     picks WHICH ones at random, so two demos of the same term still differ. */
  var CATALOGUE = POOL.concat(ENG_POOL);

  var catById = {};
  CATALOGUE.forEach(function (p) {
    catById[p.id] = p;
    p.matches = p.eligible
      .map(function (id) { return byId[id]; })
      .filter(function (v) { return v.recommended; })
      .sort(function (a, b) { return b.score - a.score; });
    p.rejected = p.eligible
      .map(function (id) { return byId[id]; })
      .filter(function (v) { return !v.recommended; })
      .sort(function (a, b) { return b.score - a.score; });
    p.topScore = p.matches.length ? p.matches[0].score : 0;
    p.avgScore = p.matches.length
      ? Math.round(p.matches.reduce(function (s, v) { return s + v.score; }, 0) / p.matches.length)
      : 0;
    p.expectedQuotes = p.matches.reduce(function (s, v) { return s + v.pQuote; }, 0) / 100;
    p.mappedByRules = p.eligible.length + p.dormant;
  });

  /* ── search ────────────────────────────────────────────────────────
     The demo starts on an empty search. The presenter picks one of the
     suggested terms (or types their own), the results come back, and they
     add lines — which is how a buyer actually uses this page. Nothing is
     pre-staged, so the AI panel has a real before-and-after to show.
     ─────────────────────────────────────────────────────────────────── */
  var SUGGESTION_POOL = [
    { term: 'towel',   label: 'towel' },
    { term: 'bath',    label: 'bath linen' },
    { term: 'bed',     label: 'bed linen' },
    { term: 'linen',   label: 'linen' },
    { term: 'terry',   label: 'terry' },
    { term: 'guest',   label: 'guest room' },
    { term: 'spa',     label: 'spa & pool' },
    { term: 'banquet', label: 'banquet' },
    { term: 'room',    label: 'room linen' }
  ];

  /* Only suggest terms that actually return a usable result set. */
  function matchesFor(term) {
    var q = String(term || '').trim().toLowerCase();
    if (!q) return [];
    return CATALOGUE.filter(function (p) {
      return p.name.toLowerCase().indexOf(q) !== -1 ||
             (p.sub || '').toLowerCase().indexOf(q) !== -1 ||
             p.category.toLowerCase().indexOf(q) !== -1 ||
             (p.kw || []).some(function (k) { return k.indexOf(q) !== -1; });
    });
  }

  /* A term earns a chip if it returns at least two sourceable lines —
     tight enough that no chip lands on an empty page, loose enough that
     the set on offer changes between demos. */
  var eligibleTerms = SUGGESTION_POOL.filter(function (s) {
    return matchesFor(s.term).filter(function (p) { return !p.noVendors; }).length >= 4;
  });
  var SUGGESTIONS = pick(eligibleTerms, 4 + Math.floor(rand() * 2));   // 4 or 5 chips

  /* Which rows a term shows: capped at 5–6, random within the matches, and
     stable for a given term so typing does not reshuffle under the cursor. */
  var visibleCache = {};
  function visibleFor(term) {
    var q = String(term || '').trim().toLowerCase();
    if (!q) return [];
    if (visibleCache[q]) return visibleCache[q];

    var all = matchesFor(q);
    var eng = all.filter(function (p) { return p.noVendors; });
    /* A line under a live rate contract is always shown when it matches —
       it is the control we most want a buyer to run into, not a lottery. */
    var arc = all.filter(function (p) { return !!p.arc; });
    var src = all.filter(function (p) { return !p.noVendors && !p.arc; });

    var localRand = rng(SEED ^ hashStr(q));
    function take(arr, n) {
      var copy = arr.slice(), out = [];
      while (out.length < n && copy.length) {
        out.push(copy.splice(Math.floor(localRand() * copy.length), 1)[0]);
      }
      return out;
    }

    var wantEng = eng.length ? 1 : 0;
    var total = 5 + Math.floor(localRand() * 2);          // 5 or 6 rows
    var room = Math.max(1, total - wantEng - arc.length);
    var out = take(src, room).concat(arc).concat(take(eng, wantEng));
    visibleCache[q] = out;
    return out;
  }

  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  var STAGED = [];

  /* ── basket-level roll-up ──────────────────────────────────────── */
  function basket(stagedIds) {
    var prods = stagedIds.map(function (id) { return catById[id]; });
    var union = {}, mapped = {};
    prods.forEach(function (p) {
      p.matches.forEach(function (v) { union[v.id] = v; });
      p.eligible.forEach(function (id) { mapped[id] = 1; });
    });
    var rec = Object.keys(union).map(function (k) { return union[k]; })
      .sort(function (a, b) { return b.score - a.score; });
    var mappedCount = Object.keys(mapped).length +
      prods.reduce(function (s, p) { return s + p.dormant; }, 0);
    var expected = rec.reduce(function (s, v) { return s + v.pQuote; }, 0) / 100;
    var qty = prods.reduce(function (s, p) { return s + p.qty; }, 0);
    return {
      products: prods,
      recommended: rec,
      mappedByRules: mappedCount,
      expectedQuotes: expected,
      qty: qty,
      avgScore: rec.length
        ? Math.round(rec.reduce(function (s, v) { return s + v.score; }, 0) / rec.length) : 0,
      factors: [
        { name: 'Past performance', score: avg(rec, 'performance') },
        { name: 'Response likelihood', score: avg(rec, 'response') },
        { name: 'Price competitiveness', score: avg(rec, 'price') },
        { name: 'Compliance & approvals', score: avg(rec, 'compliance') }
      ]
    };
  }
  function avg(list, key) {
    if (!list.length) return 0;
    return Math.round(list.reduce(function (s, v) { return s + v.components[key]; }, 0) / list.length);
  }

  /* ── baseline the buyer lives with today ───────────────────────── */
  var BASELINE = {
    typicalInvited: 6,
    medianQuotes: 4,
    note: 'median over the last 6 comparable towel RFQs at InterContinental Marine Drive',
    bestRate: 404,           // best rate actually achieved on those RFQs
    ranked: false
  };

  /* ── modelled outcome ──────────────────────────────────────────── */
  var FORECAST = {
    bestRate: 389,           // ₹/pc modelled at 1,200 pcs, volume break at 1,000+
    bestRateBasisPo: 'PO/WG/26-27/0412',
    indexRate: MODEL.lprIndex,
    yarnIndexMove: -1.2,     // % since Sriram's last award
    volumeBreakAt: 1000
  };

  /* ── provenance: what is observed vs what is derived ───────────── */
  var PROVENANCE = [
    { signal: 'Response rate', kind: 'observed', source: 'quotes received ÷ RFQs invited, tbl_rfq_product_vendors' },
    { signal: 'Award history', kind: 'observed', source: 'awarded PO lines per vendor at this business unit' },
    { signal: 'Last purchase rate', kind: 'observed', source: 'unit rate on the most recent awarded PO line' },
    { signal: 'Approved-vendor list', kind: 'observed', source: 'buyer-maintained AVL flag on the vendor record' },
    { signal: 'Subscription validity', kind: 'observed', source: 'category + hotel subscription valid_till' },
    { signal: 'On-time delivery %', kind: 'derived', source: 'GRN posting date against the PO promised date — not a stored field today' },
    { signal: 'Quote turnaround', kind: 'derived', source: 'quote submission timestamp minus RFQ publish timestamp' },
    { signal: 'Dispute count', kind: 'derived', source: 'short-supply and rejection events raised against GRN lines' }
  ];

  var AUDIT = {
    rfqs: 34, grns: 118, quoteTimestamps: 214, subscriptions: 22,
    window: 'Apr 2024 – Aug 2026',
    at: '14 Aug 2026, 3:42 pm IST'
  };

// Namespaced per panel. In the prototypes each page loaded exactly one
// data.js, so a single `window.WWData` was safe. Bundled into one app they
// all land in the same global and the last module evaluated wins — which in
// a production build meant the PO panel read the Vendor Match fixture and
// died on `QUEUE.triage`. Dev never showed it: no shared chunks.
  global.WWData_vendorMatch = {
    today: TODAY, rfqClose: RFQ_CLOSE, subHorizon: SUB_HORIZON,
    tenant: 'IHG Hotels & Resorts',
    bu: 'InterContinental Marine Drive, Mumbai',
    user: 'Vivek Jaiswal',
    query: '',
    suggestions: SUGGESTIONS,
    matchesFor: matchesFor,
    visibleFor: visibleFor,
    totalCatalogue: 2841,
    arcPolicy: {
      ref: 'PROC-11 · Rate contract precedence',
      line1: 'An item covered by a live rate contract must be drawn against that contract. Raising a fresh RFQ for it splits volume across business units and loses the committed rate.',
      line2: 'You can override this. The RFQ is then marked as a rate-contract bypass, Group Procurement and the Finance Controller are added as mandatory approvers, and the override is written to the audit trail against your name.',
      approvers: ['Group Procurement', 'Finance Controller']
    },
    seed: SEED,
    pool: POOL, engPool: ENG_POOL,
    MODEL: MODEL,
    vendors: VENDORS, vendorById: byId,
    catalogue: CATALOGUE, catalogueById: catById,
    staged: STAGED.slice(),
    engineeringNearMiss: ENGINEERING_NEAR_MISS,
    baseline: BASELINE, forecast: FORECAST,
    provenance: PROVENANCE, audit: AUDIT,
    basket: basket,
    money: money, num: num, day: day, daysBetween: daysBetween,
    score: score, components: components,
    confirmProbability: confirmProbability, confidenceBand: confidenceBand
  };
})(typeof window !== "undefined" ? window : globalThis);
