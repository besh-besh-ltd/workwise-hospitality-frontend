/* eslint-disable */
/**
 * Fixture for the negotiator AI panel — the prototype's own data, carried
 * across so the analysis, the numbers and the narrative are exactly what
 * was signed off. Only the client naming is re-badged for IHG; the
 * suppliers and their histories are the story and are untouched.
 *
 * Ported from workwise-ai-prototypes/ai_negotiator/data.js
 */
/* ═══════════════════════════════════════════════════════════════════
   IHG · AI Negotiator prototype — demo dataset
   RFQ #535944 · Housekeeping Linen & Amenities — Q3 FY 2026-27
   Tenant: IHG Hotels & Resorts · BU: InterContinental Marine Drive, Mumbai · Housekeeping

   Every rupee figure rendered in the UI is DERIVED from the primitives
   below (unit rate, charge %, GST). Nothing downstream is hardcoded.
   Landed total = (base + freight + packaging + other charges) × (1 + GST)
   ═══════════════════════════════════════════════════════════════════ */
(typeof window !== 'undefined' ? window : globalThis).WWData = (function () {
  'use strict';

  var rfq = {
    no: '535944',
    title: 'Housekeeping Linen & Amenities — Q3 FY 2026-27',
    status: 'PUBLISHED',
    company: 'IHG Hotels & Resorts',
    businessUnit: 'InterContinental Marine Drive, Mumbai',
    department: 'Housekeeping',
    contactPerson: 'Dhruv Menon',
    contactNumber: '+91-8454008272',
    responseEmail: 'procurement@ihg-demo.in',
    submissionDeadline: '12 Aug 2026, 06:00 pm',
    deliveryLocation: 'InterContinental Marine Drive, Marine Drive — Linen Store, Mumbai 400020',
    reverseAuction: 'Disabled',
    roundsSummary: '0 ended · 0 active',
    technicalClauses: 'Configured',
    quotesChip: '6 of 9 quotes received',
    roundNo: 1,
    roundCloses: '18 Aug 2026, 06:00 pm',
    gstPct: 18
  };

  var product = {
    name: 'BATH TOWEL 500 GSM',
    spec: '70×140 cm, combed cotton, white, double-stitched hem',
    qty: 4000,
    uom: 'pcs',
    hsn: '6302.60'
  };

  /* ── vendors ──────────────────────────────────────────────────────
     freightPct: null  → vendor did not quote freight (buyer "Demand")
     charges are a % of the base line value (unit × qty), exactly as
     the live Negotiation Fields grid computes them.                   */
  var vendors = [
    {
      id: 'shree',
      name: 'Sriram Textiles Pvt Ltd',
      initials: 'ST',
      avatarBg: 'rgb(219, 242, 247)',
      avatarFg: 'rgb(12, 107, 128)',
      city: 'Solapur, MH',
      unit: 412,
      freightPct: 2.5,
      packagingPct: 1.5,
      deliveryDays: 21,
      paymentTerms: '30 days from GRN',
      gstPct: 18,
      terms: 'Rates firm 90 days · Defect replacement within 15 days of GRN · Ex-works Solapur',
      documents: ['GST invoice', 'GSM / shrinkage test certificate', 'Packing list'],
      history: {
        rounds: 8,
        avgConcession: 1.8,
        lastTwoMoves: '0.4% and 0.0%',
        medianResponseHrs: 34,
        floorSeen: 408,
        note: 'Freight waived on 3 of its last 5 POs'
      },
      ai: {
        include: true,
        tone: 'attention',
        badge: 'Light touch',
        probability: 26,
        secondaryProbability: 71,
        secondaryLabel: 'freight + packaging waiver',
        target: { unit: 406, freightPct: 0, packagingPct: 1.0, deliveryDays: 18 },
        skip: [],
        why: 'Already at its floor. In 8 rounds it has never printed below ₹408 and its last two rounds moved 0.4% and 0.0%. The money here is in the charges, not the rate — it waived freight on 3 of its last 5 POs.',
        ask: 'Hold the rate ask at ₹406 and spend the round on a full freight waiver plus packaging down to 1%.'
      }
    },
    {
      id: 'anand',
      name: 'Nandan Terry Ltd',
      initials: 'AL',
      avatarBg: 'rgb(237, 229, 250)',
      avatarFg: 'rgb(93, 59, 156)',
      city: 'Erode, TN',
      unit: 428,
      freightPct: 3.5,
      packagingPct: 2.0,
      deliveryDays: 18,
      paymentTerms: '45 days from invoice',
      gstPct: 18,
      terms: 'Rates firm 60 days · 2% price escalation clause on yarn index · FOR Mumbai',
      documents: ['GST invoice', 'Mill test report', 'E-way bill', 'Packing list'],
      history: {
        rounds: 6,
        avgConcession: 7.4,
        lastTwoMoves: '6.9% and 8.1%',
        medianResponseHrs: 18,
        concessionRange: 11,
        floorSeen: 392,
        note: 'Supplied 3,200 pcs at ₹392 on ARC-2026-27-0007 (Feb 2026)'
      },
      ai: {
        include: true,
        tone: 'yes',
        badge: 'Push hard',
        probability: 78,
        target: { unit: 389, freightPct: 0, packagingPct: 1.0, deliveryDays: 16 },
        skip: [],
        why: 'The widest gap between what it quoted and what it has actually accepted. 7.4% average concession across its last 4 rounds, median response 18 h, and it already sold this exact towel at ₹392 in February. Two of its four Erode lines are idle through Q3.',
        ask: 'Open at ₹389 and trade 30-day payment (down from its own 45-day ask) for a full freight waiver.'
      }
    },
    {
      id: 'gokul',
      name: 'GreenLeaf Amenities Pvt Ltd',
      initials: 'GH',
      avatarBg: 'rgb(220, 252, 231)',
      avatarFg: 'rgb(21, 128, 61)',
      city: 'Karur, TN',
      unit: 441,
      freightPct: 2.0,
      packagingPct: 1.75,
      deliveryDays: 25,
      paymentTerms: '30 days from GRN',
      gstPct: 18,
      terms: 'Rates firm 45 days · Partial dispatch permitted · FOR Mumbai',
      documents: ['GST invoice', 'Packing list'],
      history: {
        rounds: 4,
        avgConcession: 5.1,
        lastTwoMoves: '4.6% and 5.8%',
        medianResponseHrs: 26,
        floorSeen: 404,
        note: 'Billed ₹404 to voco Jim Corbett on PO-2026-04127 (May 2026)'
      },
      ai: {
        include: true,
        tone: 'yes',
        badge: 'Push hard',
        probability: 64,
        target: { unit: 396, freightPct: 1.5, packagingPct: 1.0, deliveryDays: 20 },
        skip: [],
        why: 'Quoted ₹441 here but billed ₹404 to voco Jim Corbett eleven weeks ago for the same 500 GSM construction. Three of its looms are idle this quarter and its 25-day lead time says it is chasing volume, not schedule.',
        ask: 'Confront the ₹404 internal benchmark, ask ₹396, and give back 20 days of lead time to pay for it.'
      }
    },
    {
      id: 'meridian',
      name: 'Kaveri Home Textiles',
      initials: 'MT',
      avatarBg: 'rgb(254, 243, 199)',
      avatarFg: 'rgb(146, 64, 14)',
      city: 'Panipat, HR',
      unit: 455,
      freightPct: null,
      packagingPct: 2.5,
      deliveryDays: 15,
      paymentTerms: '25% advance + 30 days from GRN',
      gstPct: 18,
      terms: 'Delivered to site · OEKO-TEX certified · Rates firm 90 days',
      documents: ['GST invoice', 'OEKO-TEX certificate', 'Shrinkage test report', 'Packing list'],
      history: {
        rounds: 2,
        avgConcession: 3.2,
        lastTwoMoves: '3.2% and 3.1%',
        medianResponseHrs: 41,
        floorSeen: 430,
        note: 'Own mill, no jobber — structurally ~6% above the Erode/Karur cluster'
      },
      ai: {
        include: true,
        tone: 'attention',
        badge: 'Light touch',
        probability: 31,
        regretRisk: true,
        target: { unit: 432, freightPct: null, packagingPct: 1.0, deliveryDays: 14 },
        skip: ['freight'],
        why: 'The only vendor holding OEKO-TEX plus a shrinkage report and a 15-day lead time, so it is worth keeping in the round for schedule leverage. Its cost base is real, though — own mill, no jobber — so it sits ~6% above the southern cluster whatever you ask.',
        ask: 'Ask ₹432 (it has printed ₹430 before) and skip freight entirely — it quotes delivered-to-site, so a freight line would double-count.'
      }
    },
    {
      id: 'suvarna',
      name: 'Solapur Terry Mills',
      initials: 'SL',
      avatarBg: 'rgb(254, 226, 226)',
      avatarFg: 'rgb(185, 28, 28)',
      city: 'Ichalkaranji, MH',
      unit: 470,
      freightPct: 4.0,
      packagingPct: 3.0,
      deliveryDays: 12,
      paymentTerms: '15 days from invoice',
      gstPct: 18,
      terms: 'Rates firm 30 days · No partial dispatch · Ex-works',
      documents: ['GST invoice'],
      history: {
        rounds: 3,
        avgConcession: 0.9,
        lastTwoMoves: 'withdrew, withdrew',
        medianResponseHrs: 52,
        floorSeen: 466,
        note: 'Withdrew from 2 of its last 3 rounds once pushed beyond 3%'
      },
      ai: {
        include: false,
        tone: 'no',
        badge: "Don't push — regret risk",
        probability: 9,
        regretRisk: true,
        target: null,
        skip: ['all'],
        why: 'Highest rate in the set and the shortest fuse. It walked away from 2 of its last 3 rounds the moment the ask went past 3%, and at 14% above L1 there is no realistic path to award. Including it only risks dropping the round from 5 responders to 4.',
        ask: 'Leave it out of the round. Keep the quote on file as cover if Trident regrets.'
      }
    }
  ];

  /* ── market / benchmark ──────────────────────────────────────────── */
  var market = {
    asOf: '12 Aug 2026',
    indexName: 'IHG linen index · bath towel 500 GSM (west India)',
    indexUnit: 401,
    bestTwelveMonth: { unit: 392, ref: 'ARC-2026-27-0007', when: 'Feb 2026', vendor: 'Nandan Terry Ltd', qty: 3200 },
    yarnMove: -4.1,
    yarnNote: 'Cotton yarn 30s combed spot, Erode — down 4.1% since Feb 2026',
    priorRoundsReplayed: 23,
    quotesRead: 5
  };

  /* ── the pre-authored strategy the AI Negotiator replays ─────────── */
  var strategy = {
    verdict: 'yes',
    headline: 'Run the round — but not against L1',
    confidence: 84,
    summary:
      'Sriram is L1 at ₹412 and is already at its floor; the recoverable money sits with Nandan and GreenLeaf, who are both quoting well above rates they have personally accepted in the last six months.',

    anchor: {
      target: 389,
      expectedLanding: 395,
      walkAway: 402,
      rationale:
        '₹389/unit — you paid ₹392 on ARC-2026-27-0007 in Feb and the cotton yarn index is down 4.1% since, which is worth ₹3.2/unit on a 500 GSM towel.'
    },

    steps: [
      { label: 'Reading 5 quotes on RFQ #535944', note: '6 of 9 vendors responded', ms: 620 },
      { label: 'Replaying 23 prior rounds with these vendors', note: '9 RFQs · 4 rate contracts', ms: 780 },
      { label: 'Indexing cotton yarn spot rates to 12 Aug 2026', note: '−4.1% since Feb', ms: 700 },
      { label: 'Scoring concession probability per vendor', note: '5 vendors · 15 candidate targets', ms: 760 },
      { label: 'Drafting targets under the better-than-quoted rule', note: 'dropped 3 invalid targets', ms: 560 }
    ],

    findings: [
      {
        tone: 'warn',
        text: '<strong>L1 is the wrong target.</strong> Sriram Textiles has quoted below ₹408 exactly zero times in 8 rounds, and its last two rounds moved <span class="mono">0.4%</span> and <span class="mono">0.0%</span>. Every rupee you ask off its rate costs round time you could spend elsewhere.',
        cites: [
          { label: 'Sriram Textiles — quote', target: '#v-shree' },
          { label: 'Base Price target', target: '#field-base' }
        ]
      },
      {
        tone: 'good',
        text: '<strong>Nandan Terry Ltd is the real headroom.</strong> It conceded <span class="mono">7.4%</span> on average across its last 4 rounds, replies in a median <span class="mono">18h</span>, and already supplied this exact towel at <span class="mono">₹392</span> on ARC-2026-27-0007. Two Erode lines are idle through Q3.',
        cites: [
          { label: 'Nandan Terry Ltd — quote', target: '#v-anand' },
          { label: 'Nandan · freight card', target: '#v-anand-freight' }
        ]
      },
      {
        tone: 'good',
        text: '<strong>GreenLeaf is quoting 9% above its own invoice.</strong> ₹441 here versus <span class="mono">₹404</span> billed to voco Jim Corbett on PO-2026-04127 in May, same 500 GSM construction. Its 25-day lead time says it wants volume, so lead time is your currency.',
        cites: [{ label: 'GreenLeaf Hospitality — quote', target: '#v-gokul' }]
      },
      {
        tone: 'warn',
        text: '<strong>Trident quotes delivered-to-site.</strong> Freight is already inside its ₹455 — demanding a freight line would double-count it and hand it a reason to re-price. The freight field is skipped for this vendor only.',
        cites: [{ label: 'Trident · freight card', target: '#v-meridian-freight' }]
      },
      {
        tone: 'bad',
        text: '<strong>Solapur Terry Mills is a regret risk.</strong> It withdrew from 2 of its last 3 rounds once the ask went past 3%, and at ₹470 it is 14.1% above L1 with no path to award. Pushing it converts a 5-quote RFQ into a 4-quote RFQ.',
        cites: [{ label: 'Solapur Terry Mills — quote', target: '#v-suvarna' }]
      }
    ],

    factors: [
      { name: 'Price headroom', score: 82 },
      { name: 'Vendor hunger', score: 74 },
      { name: 'Market timing', score: 88 },
      { name: 'Relationship risk', score: 46 }
    ],
    factorNote: 'Higher is more favourable to a hard push. Relationship risk is scored low because two of five vendors have walked from pushed rounds in the last year.',

    /* what to negotiate, field by field */
    fieldPlan: [
      {
        field: 'Base price',
        target: '₹389/unit global · per-vendor ₹406 / ₹389 / ₹396 / ₹432',
        evidence: '₹392 paid in Feb on ARC-2026-27-0007; yarn index −4.1%; market index ₹401.'
      },
      {
        field: 'Freight',
        target: '1.5% global · full waiver from Sriram and Nandan',
        evidence: 'Sriram waived freight on 3 of its last 5 POs. Nandan will trade it for 30-day payment. Skipped for Trident (delivered-to-site).'
      },
      {
        field: 'Packaging',
        target: '1.0% global — currently unselected',
        evidence: 'Lowest quoted is 1.5%; bulk-bale packing on a 4,000 pc single lot has run at 0.9–1.1% on the last four linen POs.'
      },
      {
        field: 'Delivery period',
        target: '18 / 16 / 20 / 14 days per vendor',
        evidence: 'Linen store needs stock by 12 Sep. GreenLeaf gets 20 days as the concession that pays for ₹396; Trident holds 14.'
      },
      {
        field: 'Payment terms',
        target: 'Offer 30 days from GRN (Nandan asked 45)',
        evidence: 'Faster payment is worth ~1.1% to an Erode mill at current working-capital rates — cheaper than 3.5% freight.'
      },
      {
        field: 'Documents',
        target: 'Demand GSM + shrinkage test certificate from all four',
        evidence: 'GreenLeaf and Nandan did not attach one. Two 2025 linen claims were lost for want of a GSM certificate at GRN.'
      }
    ],

    giveToGet: [
      'Offer <strong>30-day payment</strong> instead of Nandan\'s 45 to buy the <strong>freight waiver</strong> — costs ~1.1%, saves 3.5%.',
      'Offer a <strong>single 4,000 pc lot</strong> with one dispatch to Sriram in exchange for packaging at 1.0% and freight at nil.',
      'Concede <strong>20 days lead time</strong> to GreenLeaf (its quote said 25) as the price of ₹396.',
      'Leave Trident\'s <strong>25% advance</strong> untouched — it is the only certified supplier and the advance is what buys the 15-day lead time.'
    ],

    include: ['shree', 'anand', 'gokul', 'meridian'],
    exclude: ['suvarna'],

    audit: 'RFQ #535944 · 5 quotes · 23 prior rounds · yarn index to 12 Aug 2026',
    disclaimerText:
      'A drafted round, not a sent one. Targets, vendor selection and the audit record stay yours — nothing goes to a vendor until you press Send.'
  };

  return {
    rfq: rfq,
    product: product,
    vendors: vendors,
    market: market,
    strategy: strategy
  };
})();
