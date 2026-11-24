/* eslint-disable */
/**
 * Fixture for the poDecision AI panel — the prototype's own data, carried
 * across so the analysis, the numbers and the narrative are exactly what
 * was signed off. Only the client naming is re-badged for the demo tenant; the
 * suppliers and their histories are the story and are untouched.
 *
 * Ported from workwise-ai-prototypes/ai_po_decision/data.js
 *
 * Every rupee figure that describes a whole order — a PO's total, the queue's
 * held value, what is ready to release — is read from the register in
 * data/ihg/orders.js rather than typed here, so the memo, the triage and the
 * PO table can never quote different money for the same order. Unit rates and
 * the reasoning are the pre-authored copy.
 */
import { posById } from "@/data/ihg/orders";
/* ═══════════════════════════════════════════════════════════════════
   Workwise · Purchase Orders — demo dataset + pre-authored AI verdicts
   Tenant: Workwise Hospitality · IST · en-IN grouping · GST 18/12/5
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── formatting ─────────────────────────────────────────────────── */
  var nf2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nf0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

  function inr(n) { return '₹' + nf2.format(n); }
  function qty(n) { return nf0.format(n); }

  /* ── the register (data/ihg/orders.js) ──────────────────────────── */
  function PO(id) { return posById[id]; }
  function total(id) { return inr(PO(id).value); }
  function units(id) { return qty(PO(id).lines.reduce(function (s, l) { return s + l.qty; }, 0)); }
  function lakh(n) { return '₹' + (n / 100000).toFixed(2) + 'L'; }
  function uncommitted(id) { var g = PO(id).budget; return lakh(g.allocated - g.consumed); }

  /* ── people ─────────────────────────────────────────────────────── */
  var PEOPLE = {
    kushal:  { name: 'Ananya Rao',   ini: 'AR', av: 'avGreen__pymZt' },
    ritika:  { name: 'Karan Bhatia', ini: 'KB', av: 'avRose__QmMGS' },
    vikram:  { name: 'Sameer Nair',  ini: 'SN', av: 'avSky__QkqM5' },
    devika:  { name: 'Devika Rao',   ini: 'DR', av: 'avIndigo__pYPbr' },
    meera:   { name: 'Rohan Mehta',  ini: 'RM', av: 'avZinc___YLe7' }
  };

  /* ── vendors ────────────────────────────────────────────────────── */
  var VENDORS = {
    novatech: {
      name: 'Welspun Hospitality Solutions', ini: 'WH', av: 'avSky__QkqM5',
      tagline: 'Bed & bath textiles · Anjar, Gujarat · vendor since 2021',
      phone: '+91-98001 00006', email: 'hospitality@welspun.co.in',
      gstin: '24AAACW1234M1Z8', otd: '94.2%', pos: '18'
    },
    sparkline: {
      name: 'Aarvi Linens & Amenities', ini: 'AL', av: 'avIndigo__pYPbr',
      tagline: 'Linen & guest amenities · Mumbai, Maharashtra · vendor since 2020',
      phone: '+91-98220 41177', email: 'contracts@aarvilinens.in',
      gstin: '27AACFA9012P1ZR', otd: '81.3%', pos: '9'
    },
    shree: {
      name: 'Sriram Textiles Pvt Ltd', ini: 'ST', av: 'avRose__QmMGS',
      tagline: 'Terry towelling & bath linen · Karur, Tamil Nadu · vendor since 2019',
      phone: '+91-99250 33481', email: 'sales@sriramtextiles.co.in',
      gstin: '33AABCS4471K1ZP', otd: '97.8%', pos: '23'
    },
    anand: {
      name: 'Nandan Terry Ltd', ini: 'NT', av: 'avZinc___YLe7',
      tagline: 'Terry towelling · Ahmedabad, Gujarat · vendor since 2023',
      phone: '+91-98123 55004', email: 'orders@nandanterry.in',
      gstin: '24AADCN3456Q1ZS', otd: '96.1%', pos: '15'
    },
    meridian: {
      name: 'Trident Hometex Ltd', ini: 'TH', av: 'avIndigo__pYPbr',
      tagline: 'Bed linen & terry · Budhni, Madhya Pradesh · vendor since 2022',
      phone: '+91-99450 27718', email: 'projects@tridenthometex.co.in',
      gstin: '23AAACT5678N1ZQ', otd: '88.6%', pos: '11'
    },
    gokul:  { name: 'GreenLeaf Amenities Pvt Ltd', ini: 'GA', av: 'avGreen__pymZt' },
    itwale: { name: 'Orient Craft Hospitality',           ini: 'OC', av: 'avZinc___YLe7' }
  };

  /* ── KPI strip ──────────────────────────────────────────────────── */
  var KPI = {
    active: '31',
    awaiting: '5',
    awaitingMeta: '7 days',
    vendorAccepted: '12',
    vendorPending: '3 pending',
    approvedMonth: '14',
    approvedDelta: '↑ 27%',
    valueMtd: '1.42',
    valueSuffix: 'Cr',
    valueDelta: '↑ 18%'
  };

  var TABS = { all: 43, pending: 5, approved: 14, rejected: 5 };

  /* ── the PO table (page 1 of 43) ────────────────────────────────── */
  var ROWS = [
    {
      po: '108223', status: 'approved', statusLabel: 'Approved', pill: 'approved__k4RIw',
      rfq: '536441', vendor: 'gokul',
      items: 'BATH TOWEL 500 GSM · +1 more', itemsMeta: '2 items · 1,600 qty',
      value: 486200, initiator: 'kushal', created: '13 Aug 2026 · 06:12 PM', ago: '1d ago',
      ai: 'pending'
    },
    {
      po: '108250', status: 'pending_approval', statusLabel: 'Pending approval', pill: 'pending__q4HHd',
      pendingLine: 'on L2 — Ananya Rao, Rohan Mehta',
      rfq: '536438', vendor: 'meridian',
      items: 'BED SHEET 300 TC · +1 more', itemsMeta: '2 items · 1,040 qty',
      value: PO('108250').value, initiator: 'devika', created: '13 Aug 2026 · 02:40 PM', ago: '1d ago',
      ai: 'attention', aiNote: 'colour-fastness report missing'
    },
    {
      po: '108258', status: 'pending_approval', statusLabel: 'Pending approval', pill: 'pending__q4HHd',
      pendingLine: 'on L3 — Ananya Rao, Rohan Mehta',
      rfq: '536431', vendor: 'sparkline',
      items: 'SPA THERAPY LINEN SET', itemsMeta: '1 item · 1,250 qty',
      value: PO('108258').value, initiator: 'kushal', created: '12 Aug 2026 · 11:24 AM', ago: '2d ago',
      ai: 'no', aiNote: 'off-contract, 6.8% above the ARC rate'
    },
    {
      po: '108244', status: 'pending_approval', statusLabel: 'Pending approval', pill: 'pending__q4HHd',
      pendingLine: 'on L2 — Ananya Rao',
      rfq: '536425', vendor: 'anand',
      items: 'BATH TOWEL 500 GSM', itemsMeta: '1 item · 1,554 qty',
      value: PO('108244').value, initiator: 'devika', created: '11 Aug 2026 · 05:03 PM', ago: '3d ago',
      ai: 'yes', aiNote: '4.1% below last purchase'
    },
    {
      po: '108215', status: 'pending_approval', statusLabel: 'Pending approval', pill: 'pending__q4HHd',
      pendingLine: 'on L3 — Ananya Rao, Rohan Mehta',
      rfq: '536417', vendor: 'novatech',
      items: 'BATH TOWEL 500 GSM · +1 more', itemsMeta: '2 items · 1,600 qty',
      value: PO('108215').value, initiator: 'kushal', created: '11 Aug 2026 · 10:18 AM', ago: '3d ago',
      ai: 'attention', aiNote: 'ISO 9001 expired 47 days ago'
    },
    {
      po: '108212', status: 'sent', statusLabel: 'Sent to vendor', pill: 'statusInfo__nTz7c',
      rfq: '536402', vendor: 'itwale',
      items: 'LAPTOP 14IN i5 · +1 more', itemsMeta: '2 items · 46 qty',
      value: 1896400, initiator: 'kushal', created: '08 Aug 2026 · 04:22 PM', ago: '6d ago',
      ai: 'pending'
    },
    {
      po: '108231', status: 'pending_approval', statusLabel: 'Pending approval', pill: 'pending__q4HHd',
      pendingLine: 'on L2 — Ananya Rao',
      rfq: '536396', vendor: 'shree',
      items: 'BED LINEN SET 300 TC', itemsMeta: '1 item · 900 qty',
      value: PO('108231').value, initiator: 'ritika', created: '07 Aug 2026 · 09:55 AM', ago: '1w ago',
      ai: 'yes', aiNote: 'every line below the last award'
    },
    {
      po: '108204', status: 'dispatched', statusLabel: 'Dispatched', pill: 'dispatched__Kv2Rp',
      rfq: '536381', vendor: 'gokul',
      items: 'HOUSEKEEPING TROLLEY · +3 more', itemsMeta: '4 items · 96 qty',
      value: 274900, initiator: 'devika', created: '05 Aug 2026 · 12:31 PM', ago: '1w ago',
      ai: 'pending'
    },
    {
      po: '108198', status: 'rejected', statusLabel: 'Rejected', pill: 'rejected__oXk3V',
      rfq: '536370', vendor: 'meridian',
      items: 'COLD ROOM COMPRESSOR', itemsMeta: '1 item · 2 qty',
      value: 945000, initiator: 'kushal', created: '03 Aug 2026 · 03:47 PM', ago: '1w ago',
      ai: 'pending'
    },
    {
      po: '108195', status: 'draft', statusLabel: 'Draft', pill: 'draft__7Y7rI',
      rfq: '536362', vendor: 'anand',
      items: 'POOL TOWEL 400 GSM', itemsMeta: '1 item · 400 qty',
      value: 41300, initiator: 'kushal', created: '01 Aug 2026 · 10:02 AM', ago: '2w ago',
      ai: 'pending'
    }
  ];

  /* ── "Awaiting your approval" cards ─────────────────────────────── */
  var AWAITING = [
    { po: '108258', since: '2d waiting' },
    { po: '108215', since: '3d waiting' },
    { po: '108250', since: '1d waiting' },
    { po: '108244', since: '3d waiting' },
    { po: '108231', since: '7d waiting' }
  ];

  /* ═══════════════════════════════════════════════════════════════
     PO detail records — reference only. The PO detail screen is fed from
     each order's own evidence in data/ihg/orders.js; these blocks are the
     prototype's originals, kept for comparison.
     ═══════════════════════════════════════════════════════════════ */
  var DETAIL = {

    /* ── #108215 · NEEDS ATTENTION (default demo) ─────────────────── */
    '108215': {
      po: '108215',
      status: 'Pending Approval',
      statusPill: 'pending__q4HHd',
      vendor: VENDORS.novatech,
      rfq: '536417',
      rfqTitle: 'Linen replenishment — Rooms & Spa, H2 FY 2026-27',
      bu: 'Workwise Grand, Mumbai',
      dept: 'Housekeeping',
      bidders: 3,
      finalizedBy: 'Ananya Rao',
      pendingNote: 'Pending approval — currently with L3: Ananya Rao (you).',
      asideNote: 'Currently with L3: Ananya Rao. Two approvers can act — any one is enough.',
      pdf: 'PO 108215.pdf',
      total: 1236480,
      items: [
        {
          name: 'BATH TOWEL 500 GSM', size: '70 × 140 cm',
          spec: '100% combed ring-spun cotton, double-stitched hem, 500 GSM, dobby border, colour-fast to ISO 105-C06',
          comment: 'Rooms refresh — 320 keys, 3 sets per key plus 15% float',
          qty: 1200, unit: 'pcs', rate: 850.00, gst: 12
        },
        {
          name: 'BATH MAT 900 GSM', size: '50 × 80 cm',
          spec: '900 GSM terry pile, anti-skid latex backing, colour-matched to towel range',
          comment: 'Spa and premium floors only',
          qty: 400, unit: 'pcs', rate: 210.00, gst: 12
        }
      ],
      compare: [
        { vendor: VENDORS.novatech, gstin: '24AAACW1234M1Z8', amount: 1236480, delivery: '10 days', delta: 'baseline', winner: true },
        { vendor: VENDORS.anand,    gstin: '24AAECA5518J1ZL', amount: 1271320, delivery: '14 days', delta: '2.8%' },
        { vendor: VENDORS.shree,    gstin: '33AABCS4471K1ZP', amount: 1304960, delivery: '12 days', delta: '5.5%' }
      ],
      techEval: [
        {
          product: 'BATH TOWEL 500 GSM', round: 1, score: '88%', passed: true, mark: '60%',
          approver: 'Karan Bhatia', when: '10 Aug 2026 · 04:12 PM',
          clauses: [
            { text: 'TC-01 — Towel must be 100% combed ring-spun cotton with double-stitched hem, colour-fast to ISO 105-C06 grade 4 or better.', max: 40, got: 40 },
            { text: 'TC-02 — Minimum 500 GSM measured per IS 1964. Negative tolerance is not acceptable.', max: 60, got: 48 }
          ]
        },
        {
          product: 'BATH MAT 900 GSM', round: 1, score: '92%', passed: true, mark: '60%',
          approver: 'Karan Bhatia', when: '10 Aug 2026 · 04:12 PM',
          clauses: [
            { text: 'TC-01 — 900 GSM minimum with anti-skid latex backing, finished size 50 × 80 cm ± 2 cm.', max: 50, got: 46 },
            { text: 'TC-02 — No delamination or pile loss after 50 industrial wash cycles at 70°C.', max: 50, got: 46 }
          ]
        }
      ],
      docs: [
        { name: 'PO 108215.pdf', sub: 'po' },
        { name: 'Welspun_Quote_R2_536417.pdf', sub: 'quote · round 2' },
        { name: 'Welspun_TDS_BathTowel500.pdf', sub: 'technical data sheet' },
        { name: 'Welspun_QAP_Linen_2026.pdf', sub: 'quality assurance plan' },
        { name: 'Welspun_ISO9001.pdf', sub: 'certificate · expired' },
        { name: 'Welspun_GST_Filing_Jul2026.pdf', sub: 'compliance' },
        { name: 'ARC-2026-0117_Linen_RateCard.pdf', sub: 'rate contract' }
      ],
      workflow: {
        progress: '4 of 11 done',
        steps: [
          { name: 'PO created',     by: 'kushal', when: '11 Aug 2026 · 10:18 AM', state: 'done' },
          { name: 'PO initiated',   by: 'kushal', when: '11 Aug 2026 · 10:24 AM', state: 'done' },
          { name: 'L1 approval',    by: 'vikram', when: '11 Aug 2026 · 02:47 PM', state: 'done' },
          { name: 'L2 approval',    by: 'ritika', when: '12 Aug 2026 · 09:36 AM', state: 'done' },
          { name: 'L3 approval',    by: 'kushal', policy: '2 approvers · any one', state: 'current' },
          { name: 'Sent to vendor',        vendorStep: true, state: 'pending' },
          { name: 'Vendor accepted the PO', vendorStep: true, state: 'pending' },
          { name: 'Dispatched',            vendorStep: true, state: 'pending' },
          { name: 'Goods received (GRN)',  state: 'pending' },
          { name: 'Invoice raised',        vendorStep: true, state: 'pending' },
          { name: 'PO completed',          state: 'pending' }
        ]
      },
      dates: [
        { k: 'Created', v: '11 Aug 2026' },
        { k: 'Expected delivery', v: '25 Aug 2026' },
        { k: 'Payment terms', v: '30 days' }
      ],
      activity: [
        { by: 'kushal', msg: 'created purchase order 108215', when: '11 Aug 2026 · 10:18 AM' },
        { by: 'kushal', msg: 'initiated purchase order 108215', when: '11 Aug 2026 · 10:24 AM' },
        { by: 'vikram', msg: 'approved this purchase order', when: '11 Aug 2026 · 02:47 PM' },
        { by: 'ritika', msg: 'approved this purchase order', when: '12 Aug 2026 · 09:36 AM' },
        { by: 'ritika', msg: 'uploaded Welspun_QAP_Linen_2026.pdf', when: '12 Aug 2026 · 09:41 AM' },
        { by: 'meera',  msg: 'viewed this purchase order', when: '13 Aug 2026 · 06:02 PM' }
      ]
    },

    /* ── #108231 · CLEAR TO APPROVE ───────────────────────────────── */
    '108231': {
      po: '108231',
      status: 'Pending Approval',
      statusPill: 'pending__q4HHd',
      vendor: VENDORS.shree,
      rfq: '536396',
      rfqTitle: 'Bed linen replenishment — Riverside Retreat Jim Corbett, Udaipur',
      bu: 'Riverside Retreat Jim Corbett, Udaipur',
      dept: 'Housekeeping',
      bidders: 3,
      finalizedBy: 'Karan Bhatia',
      pendingNote: 'Pending approval — currently with L2: Ananya Rao (you).',
      asideNote: 'Currently with L2: Ananya Rao. You are the only approver on this step.',
      pdf: 'PO 108231.pdf',
      total: 318528,
      items: [
        {
          name: 'BED LINEN SET 300 TC', size: 'King · 274 × 274 cm',
          spec: '300 thread count, 60/40 cotton-polyester, 220 GSM, sateen weave, set of flat sheet + fitted sheet + 2 pillow covers',
          comment: 'Replaces the 2023 stock retired after the wet-room refit',
          qty: 900, unit: 'sets', rate: 316.00, gst: 12
        }
      ],
      compare: [
        { vendor: VENDORS.shree,    gstin: '33AABCS4471K1ZP', amount: 318528, delivery: '9 days',  delta: 'baseline', winner: true },
        { vendor: VENDORS.anand,    gstin: '24AAECA5518J1ZL', amount: 330624, delivery: '11 days', delta: '3.8%' },
        { vendor: VENDORS.novatech, gstin: '24AAACW1234M1Z8', amount: 345744, delivery: '8 days',  delta: '8.5%' }
      ],
      techEval: [
        {
          product: 'BED LINEN SET 300 TC', round: 1, score: '96%', passed: true, mark: '60%',
          approver: 'Karan Bhatia', when: '06 Aug 2026 · 11:20 AM',
          clauses: [
            { text: 'TC-01 — 300 thread count, 60/40 cotton-polyester blend, 220 GSM ± 3%, sateen weave.', max: 50, got: 48 },
            { text: 'TC-02 — Wash shrinkage not to exceed 3% after 5 industrial cycles. Independent test certificate required.', max: 50, got: 48 }
          ]
        }
      ],
      docs: [
        { name: 'PO 108231.pdf', sub: 'po' },
        { name: 'SriramTextiles_Quote_536396.pdf', sub: 'quote · round 1' },
        { name: 'SriramTextiles_TDS_BedLinen300TC.pdf', sub: 'technical data sheet' },
        { name: 'SriramTextiles_OEKOTEX_100.pdf', sub: 'certificate · valid' },
        { name: 'SriramTextiles_Udyam_Certificate.pdf', sub: 'msme registration' }
      ],
      workflow: {
        progress: '3 of 11 done',
        steps: [
          { name: 'PO created',   by: 'ritika', when: '07 Aug 2026 · 09:55 AM', state: 'done' },
          { name: 'PO initiated', by: 'ritika', when: '07 Aug 2026 · 10:02 AM', state: 'done' },
          { name: 'L1 approval',  by: 'vikram', when: '07 Aug 2026 · 03:18 PM', state: 'done' },
          { name: 'L2 approval',  by: 'kushal', policy: '1 approver', state: 'current' },
          { name: 'Sent to vendor',        vendorStep: true, state: 'pending' },
          { name: 'Vendor accepted the PO', vendorStep: true, state: 'pending' },
          { name: 'Dispatched',            vendorStep: true, state: 'pending' },
          { name: 'Goods received (GRN)',  state: 'pending' },
          { name: 'Invoice raised',        vendorStep: true, state: 'pending' },
          { name: 'PO completed',          state: 'pending' }
        ]
      },
      dates: [
        { k: 'Created', v: '07 Aug 2026' },
        { k: 'Expected delivery', v: '22 Aug 2026' },
        { k: 'Payment terms', v: '45 days · MSME' }
      ],
      activity: [
        { by: 'ritika', msg: 'created purchase order 108231', when: '07 Aug 2026 · 09:55 AM' },
        { by: 'ritika', msg: 'initiated purchase order 108231', when: '07 Aug 2026 · 10:02 AM' },
        { by: 'vikram', msg: 'approved this purchase order', when: '07 Aug 2026 · 03:18 PM' },
        { by: 'devika', msg: 'uploaded SriramTextiles_OEKOTEX_100.pdf', when: '08 Aug 2026 · 11:07 AM' }
      ]
    },

    /* ── #108250 · NEEDS ATTENTION (missing damper certificate) ───── */
    '108250': {
      po: '108250',
      status: 'Pending Approval',
      statusPill: 'pending__q4HHd',
      vendor: VENDORS.meridian,
      rfq: '536438',
      rfqTitle: 'Bed linen replenishment — Metro Business Hotel Greater Noida',
      bu: 'City Express Whitefield, Bengaluru',
      dept: 'Engineering',
      bidders: 3,
      finalizedBy: 'Devika Rao',
      pendingNote: 'Pending approval — currently with L2: Ananya Rao (you).',
      asideNote: 'Currently with L2: Ananya Rao. Two approvers can act — any one is enough.',
      pdf: 'PO 108250.pdf',
      total: 869660,
      items: [
        {
          name: 'BED SHEET 300 TC', size: '275 × 275 cm',
          spec: 'SS 304, 1.2 mm canopy with stainless baffle filters, integrated grease gutter and drain cock, factory-fitted light fittings',
          comment: 'Replaces the 2016 hoods over the banquet range and the tandoor line',
          qty: 4, unit: 'units', rate: 145000.00, gst: 18
        },
        {
          name: 'DUVET COVER 300 TC', size: '225 × 245 cm',
          spec: '300 TC sateen weave, 100% long-staple cotton, mitred hem, colour-fast to ISO 105-C06',
          comment: 'One fan per riser',
          qty: 2, unit: 'units', rate: 78500.00, gst: 18
        }
      ],
      compare: [
        { vendor: VENDORS.meridian,  gstin: '23AAACT5678N1ZQ', amount: 869660, delivery: '35 days', delta: 'baseline', winner: true },
        { vendor: VENDORS.sparkline, gstin: '27AACFA9012P1ZR', amount: 902840, delivery: '30 days', delta: '3.8%' },
        { vendor: VENDORS.gokul,     gstin: '27AAGCG7890R1ZT', amount: 944300, delivery: '42 days', delta: '8.6%' }
      ],
      techEval: [
        {
          product: 'BED SHEET 300 TC', round: 1, score: '78%', passed: true, mark: '60%',
          approver: 'Sameer Nair', when: '12 Aug 2026 · 11:05 AM',
          clauses: [
            { text: 'TC-01 — Canopy in SS 304, 1.2 mm, 3000 × 1200 mm, with stainless baffle filters and an integrated grease gutter.', max: 40, got: 36 },
            { text: 'TC-02 — Rated airflow of at least 4,500 CMH at 250 Pa static, measured per IS 655.', max: 30, got: 26 },
            { text: 'TC-05 — Colour-fastness to ISO 105-C06 grade 4 or better, with a test report submitted before delivery.', max: 30, got: 16 }
          ]
        }
      ],
      docs: [
        { name: 'PO 108250.pdf', sub: 'po' },
        { name: 'Trident_Quote_536438.pdf', sub: 'quote · round 1' },
        { name: 'Trident_TDS_BedLinen300TC.pdf', sub: 'technical data sheet' },
        { name: 'Trident_QAP_Kitchen_2026.pdf', sub: 'quality assurance plan' },
        { name: 'Trident_ISO9001.pdf', sub: 'certificate · valid' },
        { name: 'Trident_GST_Filing_Jul2026.pdf', sub: 'compliance' },
        { name: 'AirflowTestReport_IS655.pdf', sub: 'test report' },
        { name: 'TechEval_536438_Scorecard.pdf', sub: 'technical evaluation' }
      ],
      workflow: {
        progress: '3 of 11 done',
        steps: [
          { name: 'PO created',   by: 'devika', when: '13 Aug 2026 · 02:40 PM', state: 'done' },
          { name: 'PO initiated', by: 'devika', when: '13 Aug 2026 · 02:51 PM', state: 'done' },
          { name: 'L1 approval',  by: 'vikram', when: '13 Aug 2026 · 06:20 PM', state: 'done' },
          { name: 'L2 approval',  by: 'kushal', policy: '2 approvers · any one', state: 'current' },
          { name: 'Sent to vendor',         vendorStep: true, state: 'pending' },
          { name: 'Vendor accepted the PO', vendorStep: true, state: 'pending' },
          { name: 'Dispatched',             vendorStep: true, state: 'pending' },
          { name: 'Goods received (GRN)',   state: 'pending' },
          { name: 'Invoice raised',         vendorStep: true, state: 'pending' },
          { name: 'PO completed',           state: 'pending' }
        ]
      },
      dates: [
        { k: 'Created', v: '13 Aug 2026' },
        { k: 'Expected delivery', v: '20 Sep 2026' },
        { k: 'Payment terms', v: '30 days' }
      ],
      activity: [
        { by: 'devika', msg: 'created purchase order 108250', when: '13 Aug 2026 · 02:40 PM' },
        { by: 'devika', msg: 'initiated purchase order 108250', when: '13 Aug 2026 · 02:51 PM' },
        { by: 'vikram', msg: 'approved this purchase order', when: '13 Aug 2026 · 06:20 PM' },
        { by: 'vikram', msg: 'uploaded AirflowTestReport_IS655.pdf', when: '13 Aug 2026 · 06:24 PM' }
      ]
    },

    /* ── #108244 · CLEAR TO APPROVE ───────────────────────────────── */
    '108244': {
      po: '108244',
      status: 'Pending Approval',
      statusPill: 'pending__q4HHd',
      vendor: VENDORS.anand,
      rfq: '536425',
      rfqTitle: 'Bath towel top-up — Riverside Retreat Jim Corbett · Phase 2',
      bu: 'Riverside Retreat Jim Corbett, Udaipur',
      dept: 'Housekeeping',
      bidders: 3,
      finalizedBy: 'Devika Rao',
      pendingNote: 'Pending approval — currently with L2: Ananya Rao (you).',
      asideNote: 'Currently with L2: Ananya Rao. You are the only approver on this step.',
      pdf: 'PO 108244.pdf',
      total: 596736,
      items: [
        {
          name: 'BATH TOWEL 500 GSM', size: '70 × 140 cm',
          spec: '8 inch pocket-spring core, 13 gauge, 486 springs per unit, high-resilience foam quilting, knitted stretch cover, BS 7177 Source 5 fire retardant',
          comment: 'Phase 2 — 180 of the 340 keys, remaining 160 scheduled for Q4',
          qty: 180, unit: 'pcs', rate: 2960.00, gst: 12
        }
      ],
      compare: [
        { vendor: VENDORS.anand,    gstin: '24AADCN3456Q1ZS', amount: 596736, delivery: '16 days', delta: 'baseline', winner: true },
        { vendor: VENDORS.gokul,    gstin: '27AAGCG7890R1ZT', amount: 625632, delivery: '18 days', delta: '4.8%' },
        { vendor: VENDORS.novatech, gstin: '24AAACW1234M1Z8', amount: 644832, delivery: '14 days', delta: '8.1%' }
      ],
      techEval: [
        {
          product: 'BATH TOWEL 500 GSM', round: 1, score: '94%', passed: true, mark: '60%',
          approver: 'Karan Bhatia', when: '10 Aug 2026 · 03:30 PM',
          clauses: [
            { text: 'TC-01 — Pocket-spring core, 8 inch, 13 gauge, minimum 480 springs per queen unit, high-resilience foam quilting.', max: 50, got: 47 },
            { text: 'TC-02 — Fire retardancy to BS 7177 Source 5, with a valid independent test certificate.', max: 50, got: 47 }
          ]
        }
      ],
      docs: [
        { name: 'PO 108244.pdf', sub: 'po' },
        { name: 'NandanLinen_Quote_536425.pdf', sub: 'quote · round 2' },
        { name: 'NandanTerry_TDS_BathTowel500.pdf', sub: 'technical data sheet' },
        { name: 'NandanLinen_BS7177_TestCert.pdf', sub: 'certificate · valid' },
        { name: 'NandanLinen_GST_Filing_Jul2026.pdf', sub: 'compliance' },
        { name: 'ARC-2026-0118_TerryTowelling_RateCard.pdf', sub: 'rate contract' }
      ],
      workflow: {
        progress: '3 of 11 done',
        steps: [
          { name: 'PO created',   by: 'devika', when: '11 Aug 2026 · 05:03 PM', state: 'done' },
          { name: 'PO initiated', by: 'devika', when: '11 Aug 2026 · 05:11 PM', state: 'done' },
          { name: 'L1 approval',  by: 'vikram', when: '12 Aug 2026 · 10:40 AM', state: 'done' },
          { name: 'L2 approval',  by: 'kushal', policy: '1 approver', state: 'current' },
          { name: 'Sent to vendor',         vendorStep: true, state: 'pending' },
          { name: 'Vendor accepted the PO', vendorStep: true, state: 'pending' },
          { name: 'Dispatched',             vendorStep: true, state: 'pending' },
          { name: 'Goods received (GRN)',   state: 'pending' },
          { name: 'Invoice raised',         vendorStep: true, state: 'pending' },
          { name: 'PO completed',           state: 'pending' }
        ]
      },
      dates: [
        { k: 'Created', v: '11 Aug 2026' },
        { k: 'Expected delivery', v: '27 Aug 2026' },
        { k: 'Payment terms', v: '30 days' }
      ],
      activity: [
        { by: 'devika', msg: 'created purchase order 108244', when: '11 Aug 2026 · 05:03 PM' },
        { by: 'devika', msg: 'initiated purchase order 108244', when: '11 Aug 2026 · 05:11 PM' },
        { by: 'vikram', msg: 'approved this purchase order', when: '12 Aug 2026 · 10:40 AM' },
        { by: 'ritika', msg: 'uploaded NandanLinen_BS7177_TestCert.pdf', when: '12 Aug 2026 · 11:02 AM' }
      ]
    },

    /* ── #108258 · HARD NO ────────────────────────────────────────── */
    '108258': {
      po: '108258',
      status: 'Pending Approval',
      statusPill: 'pending__q4HHd',
      vendor: VENDORS.sparkline,
      rfq: '536431',
      rfqTitle: 'Spa therapy linen — top-up, FY 2026-27',
      bu: 'Workwise Grand, Mumbai',
      dept: 'Engineering',
      bidders: 2,
      finalizedBy: 'Devika Rao',
      pendingNote: 'Pending approval — currently with L3: Ananya Rao (you).',
      asideNote: 'Currently with L3: Ananya Rao. Policy PROC-04 also requires an L4 step above ₹25L.',
      pdf: 'PO 108258.pdf',
      total: 2781968,
      items: [
        {
          name: 'SPA THERAPY LINEN SET', size: '420 GSM · 4-piece set',
          spec: 'Comprehensive annual maintenance: 4 preventive visits, unlimited breakdown calls, spares included, quarterly vibration analysis and oil sampling',
          comment: 'Renewal for the FY 2026-27 contract year starting 01 Sep 2026',
          qty: 1, unit: 'contract', rate: 2240000.00, gst: 18
        },
        {
          name: 'SPA SLIPPER — TERRY', size: 'Unisex · closed toe',
          spec: 'Terry upper with anti-skid sole, OEKO-TEX Standard 100 certified, individually wrapped',
          comment: 'Estimated annual make-up quantity',
          qty: 120, unit: 'kg', rate: 980.00, gst: 18
        }
      ],
      compare: [
        { vendor: VENDORS.meridian,  gstin: '23AAACT5678N1ZQ', amount: 2490640, delivery: '21 days', delta: 'baseline' },
        { vendor: VENDORS.sparkline, gstin: '27AACFA9012P1ZR', amount: 2781968, delivery: '30 days', delta: '11.7%', winner: true }
      ],
      techEval: [
        {
          product: 'SPA THERAPY LINEN SET', round: 1, score: '58%', passed: false, mark: '70%',
          approver: 'Sameer Nair', when: '10 Aug 2026 · 06:05 PM',
          clauses: [
            { text: 'TC-03 (mandatory) — All spares must be OEM (Carrier) supplied for the installed 19XR unit. Third-party or equivalent-grade spares are not acceptable.', max: 40, got: 8 },
            { text: 'TC-04 — Minimum 4 preventive visits per year by OEM-certified technicians, with a 4-hour breakdown response window.', max: 30, got: 22 },
            { text: 'TC-05 — Vibration analysis and oil sampling reports submitted each quarter.', max: 30, got: 28 }
          ]
        }
      ],
      docs: [
        { name: 'PO 108258.pdf', sub: 'po' },
        { name: 'Aarvi_Quote_R3_536431.pdf', sub: 'quote · round 3' },
        { name: 'Aarvi_TDS_SpaLinen.pdf', sub: 'technical data sheet' },
        { name: 'Aarvi_QAP_AMC_2026.pdf', sub: 'quality assurance plan' },
        { name: 'Aarvi_ISO9001.pdf', sub: 'certificate · valid' },
        { name: 'Aarvi_ISO45001.pdf', sub: 'certificate · expires 09 Sep 2026' },
        { name: 'ARC-2026-0041_SpaLinen_RateCard.pdf', sub: 'rate contract' },
        { name: 'TechEval_536431_Scorecard.pdf', sub: 'technical evaluation' }
      ],
      workflow: {
        progress: '4 of 11 done',
        steps: [
          { name: 'PO created',   by: 'devika', when: '12 Aug 2026 · 11:24 AM', state: 'done' },
          { name: 'PO initiated', by: 'devika', when: '12 Aug 2026 · 11:39 AM', state: 'done' },
          { name: 'L1 approval',  by: 'vikram', when: '12 Aug 2026 · 04:55 PM', state: 'done' },
          { name: 'L2 approval',  by: 'ritika', when: '13 Aug 2026 · 10:12 AM', state: 'done' },
          { name: 'L3 approval',  by: 'kushal', policy: '2 approvers · any one', state: 'current' },
          { name: 'Sent to vendor',        vendorStep: true, state: 'pending' },
          { name: 'Vendor accepted the PO', vendorStep: true, state: 'pending' },
          { name: 'Dispatched',            vendorStep: true, state: 'pending' },
          { name: 'Goods received (GRN)',  state: 'pending' },
          { name: 'Invoice raised',        vendorStep: true, state: 'pending' },
          { name: 'PO completed',          state: 'pending' }
        ]
      },
      dates: [
        { k: 'Created', v: '12 Aug 2026' },
        { k: 'Contract start', v: '01 Sep 2026' },
        { k: 'Payment terms', v: 'Quarterly in arrears' }
      ],
      activity: [
        { by: 'devika', msg: 'created purchase order 108258', when: '12 Aug 2026 · 11:24 AM' },
        { by: 'devika', msg: 'initiated purchase order 108258', when: '12 Aug 2026 · 11:39 AM' },
        { by: 'vikram', msg: 'approved this purchase order', when: '12 Aug 2026 · 04:55 PM' },
        { by: 'ritika', msg: 'approved this purchase order', when: '13 Aug 2026 · 10:12 AM' },
        { by: 'meera',  msg: 'flagged the technical score for review', when: '13 Aug 2026 · 05:41 PM' }
      ]
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     Pre-authored AI verdicts, keyed by PO number
     ═══════════════════════════════════════════════════════════════ */
  var m = function (s) { return '<span class="mono">' + s + '</span>'; };
  var b = function (s) { return '<strong>' + s + '</strong>'; };

  var VERDICTS = {

    /* ── #108215 · attention ──────────────────────────────────────── */
    '108215': {
      steps: [
        { label: 'Reading PO #108215 line items', note: '2 lines · ' + units('108215') + ' units · ' + total('108215'), ms: 620 },
        { label: 'Matching against 14 prior purchases of BATH TOWEL 500 GSM', note: '18 months · 3 vendors', ms: 780 },
        { label: 'Reading ARC-2026-0117 linen rate card', note: 'ceiling ₹877.00/pc', ms: 520 },
        { label: 'Parsing Welspun_TDS_BathTowel500.pdf against RFQ clause TC-02', note: 'GSM tolerance', ms: 700 },
        { label: 'Parsing Welspun_ISO9001.pdf', note: 'validity window', ms: 460 },
        { label: 'Checking GSTIN 24AAACW1234M1Z8 filing history', note: 'GSTR-1 / 3B, 12 months', ms: 540 },
        { label: 'Checking the approval chain against policy PROC-04', note: '₹10L–₹15L band', ms: 480 },
        { label: 'Scanning 41 open POs for a duplicate', note: '30-day window', ms: 430 }
      ],
      result: {
        verdict: 'attention',
        headline: 'Approve with two conditions',
        confidence: 86,
        summary: 'the rate is defensible and the chain is correct, but the ISO 9001 certificate on file lapsed 47 days ago and the quoted GSM tolerance is wider than clause TC-02 allows.',
        findingsLabel: 'Commercial — price against history',
        findings: [
          {
            tone: 'warn',
            text: b('₹850.00/pc is 6.3% above the ₹800.00 you paid on PO #108102, 14 Mar 2026') +
                  ' — but 3.1% below the ARC ceiling of ' + m('₹877.00') +
                  '. Cotton yarn moved 8.4% over the same period, so the increase tracks the input, not the vendor.',
            cites: [
              { label: 'Items & pricing', target: '#itemsCard' },
              { label: 'ARC-2026-0117 rate card', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'Welspun was ' + b('L1 on a 3-bidder round') + ' — ' + m('₹34,840.00') +
                  ' under Nandan Terry Ltd and ' + m('₹68,480.00') + ' under Sriram Textiles, on the shortest delivery of the three.',
            cites: [{ label: 'Quote comparison', target: '#compareCard' }]
          },
          {
            tone: 'good',
            text: 'The BATH MAT 900 GSM line at ' + m('₹210.00/pc') +
                  ' is unchanged from PO #108102 and sits 4.5% below the 12-month average of ' + m('₹219.90') + '.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        compareLabel: 'BATH TOWEL 500 GSM — unit rate against the benchmark',
        compareCols: 4,
        compare: [
          { k: 'This PO', v: '₹850.00', n: '1,200 pcs · 11 Aug 2026' },
          { k: 'Last PO', v: '₹800.00', n: '#108102 · 14 Mar 2026' },
          { k: '12-mo best', v: '₹792.00', n: '#107864 · 22 Nov 2025' },
          { k: 'Δ vs last', v: '+6.3%', n: 'ARC ceiling ₹877.00 · 3.1% headroom', tone: 'up' }
        ],
        factors: [
          { name: 'Commercial', score: 74 },
          { name: 'Vendor reliability', score: 68 },
          { name: 'Technical compliance', score: 61 },
          { name: 'Process & budget', score: 96 }
        ],
        vendorFindings: [
          {
            tone: 'bad',
            text: b('ISO 9001:2015 certificate on file expired 28 Jun 2026 — 47 days ago.') +
                  ' The RFQ made a current certificate a condition of award. No renewal has been uploaded.',
            cites: [
              { label: 'Welspun_ISO9001.pdf', target: '#docsCard' },
              { label: 'Vendor profile', target: '#vendorCard' }
            ]
          },
          {
            tone: 'good',
            text: 'GSTIN ' + m('24AAACW1234M1Z8') + ' is active. GSTR-1 and GSTR-3B filed through ' +
                  b('Jul 2026') + ' with no lapse in 12 months, so input credit is not at risk.',
            cites: [{ label: 'GST filing record', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: b('On-time delivery 91%') + ' across 18 POs in 12 months. One quality complaint (lint shedding, Mar 2026) closed with a full replacement. No open disputes.',
            cites: [{ label: 'Vendor profile', target: '#vendorCard' }]
          },
          {
            tone: 'warn',
            text: 'Not registered under MSME. ' + b('Standard 30-day payment terms apply') +
                  ' — the 45-day MSME clock the finance team assumed in the cash plan does not.',
            cites: [{ label: 'Key dates', target: '#datesCard' }]
          }
        ],
        techFindings: [
          {
            tone: 'bad',
            text: 'The TDS quotes ' + b('"500 GSM nominal, ±5% tolerance"') + ' while RFQ clause TC-02 requires ' +
                  b('500 GSM minimum with no negative tolerance') + '. As written, the vendor could deliver at ' +
                  m('475 GSM') + ' and still be inside its own spec. The evaluator scored TC-02 at 48/60 for exactly this reason.',
            cites: [
              { label: 'Technical evaluation', target: '#techCard' },
              { label: 'Welspun_TDS_BathTowel500.pdf', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'Colour-fastness, hem construction and yarn type in the TDS match TC-01 exactly. The QAP commits to per-lot GSM testing at dispatch, which is the control that would catch a short-weight batch.',
            cites: [{ label: 'Welspun_QAP_Linen_2026.pdf', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: 'BATH MAT 900 GSM clears both clauses. Wash-durability report covers 50 cycles at 70°C as required.',
            cites: [{ label: 'Technical evaluation', target: '#techCard' }]
          }
        ],
        processFindings: [
          {
            tone: 'good',
            text: 'Approval chain ' + b('matches policy PROC-04') + ' for the ₹10L–₹15L band: requirement confirmed by Rohan Mehta (Housekeeping), and the financial approval sits with Karan Bhatia or Sameer Nair — either can sign, and both limits cover the order.',
            cites: [{ label: 'Audit trail', target: '#auditCard' }]
          },
          {
            tone: 'good',
            text: 'Budget line ' + m('HK-LIN-2627') + ' has ' + b(uncommitted('108215') + ' uncommitted') +
                  ' against the ' + total('108215') + ' required. Post-commitment utilisation reaches ' +
                  Math.round(((PO('108215').budget.consumed + PO('108215').value) / PO('108215').budget.allocated) * 100) +
                  '% of the annual linen budget at month 5 of 12.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'good',
            text: b('No duplicate.') + ' The nearest same-item order is PO #108102 (14 Mar 2026), 153 days apart and outside the 30-day duplicate window. Quantity matches 220 keys at a par of five towels per key plus a 9% float.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        change: 'A current ISO 9001 certificate on file, and a one-line written confirmation from Welspun that delivered GSM will not fall below 500, would move this to a clean approve. Nothing about the price needs to change.',
        audit: '7 documents · 14 prior POs · 3 certificates · 2.9s',
        asideLine: 'Approve once the ISO 9001 renewal and the GSM confirmation are on file.',
        approvalNote: 'Approved on the AI decision memo — approve with two conditions (86% confidence). ' +
                      '₹850.00/pc is 6.3% above PO #108102 but 3.1% under the ARC ceiling, in line with cotton yarn (+8.4%). ' +
                      'Conditions before dispatch: Welspun to upload a current ISO 9001 certificate, and to confirm in writing ' +
                      'that delivered GSM will not fall below 500 (clause TC-02).'
      }
    },

    /* ── #108231 · yes · the golden thread's call-off ─────────────── */
    '108231': {
      steps: [
        { label: 'Reading PO #108231 line items', note: '6 lines · ' + units('108231') + ' units · ' + total('108231'), ms: 560 },
        { label: 'Matching each line against 23 prior linen purchases', note: '24 months · 3 vendors', ms: 760 },
        { label: 'Reading the ARC-2627-0014 rate schedule', note: 'awarded rates · quarterly caps', ms: 500 },
        { label: 'Parsing SriramTextiles_SITRA_LabReport_Terry.pdf against the contract clauses', note: 'GSM, yarn, shrinkage', ms: 660 },
        { label: 'Verifying OEKO-TEX and Udyam certificates', note: '2 certificates', ms: 470 },
        { label: 'Checking the approval chain against policy PROC-04', note: '₹20L–₹25L band', ms: 440 },
        { label: 'Scanning 41 open POs for a duplicate', note: '30-day window', ms: 400 }
      ],
      result: {
        verdict: 'yes',
        headline: 'Clear to approve',
        confidence: 94,
        summary: 'every line at its contracted rate and below the last award, inside every quarterly cap, with the cleanest delivery record on your panel.',
        findingsLabel: 'Commercial — price against history',
        findings: [
          {
            tone: 'good',
            text: b('₹400.00/pc on the lead line is the rate awarded on ARC-2627-0014') +
                  ' — 8.7% below the ₹438.00 you paid on PO #107991, 09 Jan 2026. That is ' + m('₹34,200.00') +
                  ' saved against the last order at the same volume.',
            cites: [
              { label: 'Items & pricing', target: '#itemsCard' },
              { label: 'Quote comparison', target: '#compareCard' }
            ]
          },
          {
            tone: 'good',
            text: b('Every line is below its last award') + ' — ' +
                  PO('108231').lines.map(function (l) { return l.name.toLowerCase() + ' ' + String(l.vsLastAwardPct).replace('-', '−') + '%'; }).join(', ') +
                  '. No line is priced above the contract.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          },
          {
            tone: 'good',
            text: 'L1 of the three bidders shortlisted on RFQ #535944, ' + m('₹72,096.00') + ' under Nandan Terry Ltd and ' +
                  m('₹1,27,216.00') + ' under Welspun. The 9-day delivery is the middle of the three and fits the 22 Aug handover.',
            cites: [{ label: 'Quote comparison', target: '#compareCard' }]
          }
        ],
        compareLabel: 'BATH TOWEL 500 GSM — unit rate against the benchmark',
        compareCols: 4,
        compare: [
          { k: 'This PO', v: '₹400.00', n: '900 pcs · 07 Aug 2026' },
          { k: 'Last PO', v: '₹438.00', n: '#107991 · 09 Jan 2026' },
          { k: '24-mo best', v: '₹396.00', n: '#107640 · 18 Apr 2025' },
          { k: 'Δ vs last', v: '−8.7%', n: 'at the ARC-2627-0014 awarded rate', tone: 'down' }
        ],
        factors: [
          { name: 'Commercial', score: 91 },
          { name: 'Vendor reliability', score: 95 },
          { name: 'Technical compliance', score: 93 },
          { name: 'Process & budget', score: 98 }
        ],
        vendorFindings: [
          {
            tone: 'good',
            text: 'GSTIN ' + m('33AABCS4471K1ZP') + ' active, GSTR-1 and GSTR-3B filed through ' + b('Jul 2026') +
                  '. Udyam registration ' + m('UDYAM-TN-14-0044817') + ' is valid, so the ' + b('45-day MSME payment clock') + ' applies.',
            cites: [{ label: 'SriramTextiles_Udyam_Certificate.pdf', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: b('On-time delivery 96%') + ' across 23 POs in 24 months — the best on the linen panel. Zero open disputes, zero quality rejections in 12 months.',
            cites: [{ label: 'Vendor profile', target: '#vendorCard' }]
          },
          {
            tone: 'good',
            text: 'OEKO-TEX Standard 100 certificate valid to ' + b('30 Apr 2027') +
                  ', covering the full period of supply. No certificate expires inside the delivery window.',
            cites: [{ label: 'SriramTextiles_OEKOTEX_100.pdf', target: '#docsCard' }]
          }
        ],
        techFindings: [
          {
            tone: 'good',
            text: 'Every line is the specification awarded on ARC-2627-0014 — ' + b('GSM within the ±3% the contract allows, 100% ring-spun cotton') +
                  ', as the SITRA lab report on the terry SKUs confirms. No tolerance gap between what is ordered and what was evaluated.',
            cites: [
              { label: 'SriramTextiles_SITRA_LabReport_Terry.pdf', target: '#docsCard' },
              { label: 'ARC-2627-0014 rate schedule', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'Every line is inside its quarterly call-off cap — the ' + m('450') +
                  ' bed sheets sit exactly on theirs, and nothing is ordered ahead of the contract.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        processFindings: [
          {
            tone: 'good',
            text: 'Approval chain ' + b('matches policy PROC-04') +
                  ' for the ₹20L–₹25L band: requirement confirmed by Rohan Mehta (Housekeeping), financial approval with Karan Bhatia or Sameer Nair. No step is missing.',
            cites: [{ label: 'Audit trail', target: '#auditCard' }]
          },
          {
            tone: 'good',
            text: 'Budget line ' + m('HK-LIN-2627') + ' (Workwise Grand) has ' + b(uncommitted('108231') + ' uncommitted') +
                  ' against ' + total('108231') + ' required.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'good',
            text: b('No duplicate.') + ' This is the first Q3 call-off on ARC-2627-0014; the nearest same-item order is PO #107991 (09 Jan 2026), 210 days apart.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        change: 'Nothing in the file argues against this one. It would only turn if the OEKO-TEX certificate lapsed before dispatch, or if the delivery slipped past the 22 Aug handover.',
        audit: '5 documents · 23 prior POs · 2 certificates · 2.1s',
        asideLine: 'Clean on price, spec, vendor and chain. Safe to approve now.',
        approvalNote: 'Approved on the AI decision memo — clear to approve (94% confidence). Every line at its ARC-2627-0014 rate and below the last award, inside its quarterly cap; certificates current; chain complete.'
      }
    },

    /* ── #108250 · attention ──────────────────────────────────────── */
    '108250': {
      steps: [
        { label: 'Reading PO #108250 line items', note: '2 lines · ' + units('108250') + ' units · ' + total('108250'), ms: 580 },
        { label: 'Matching against 11 prior bed-linen orders', note: '18 months · 3 vendors', ms: 740 },
        { label: 'Parsing Trident_TDS_BedLinen300TC.pdf against clauses TC-01 and TC-02', note: 'count, weave, finish', ms: 720 },
        { label: 'Reading ShrinkageTestReport_IS2977.pdf', note: '2.1% against a 3% limit', ms: 520 },
        { label: 'Searching the QAP pack for a colour-fastness test report', note: 'clause TC-05', ms: 660 },
        { label: 'Checking the approval chain against policy PROC-04', note: '₹10L–₹15L band', ms: 480 },
        { label: 'Checking budget line HK-LIN-2627', note: 'uncommitted balance', ms: 420 }
      ],
      result: {
        verdict: 'attention',
        headline: 'Approve once the colour-fastness report is on file',
        confidence: 88,
        summary: 'price, spec and process all hold up. the one gap is the colour-fastness test report that clause TC-05 makes a condition of delivery.',
        findingsLabel: 'Commercial — price against history',
        findings: [
          {
            tone: 'warn',
            text: b('₹1,059.00/pc is 5.1% above the ₹1,007.00 you paid on PO #107930, 12 Dec 2025') +
                  ' — but 4.6% below the current category index of ' + m('₹1,110.00') +
                  '. Long-staple cotton yarn moved 6.8% over the same period.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          },
          {
            tone: 'good',
            text: 'L1 on a 3-bidder round, ' + m('₹33,180.00') + ' under Aarvi and ' + m('₹74,640.00') +
                  ' under GreenLeaf. The 35-day lead time is the longest of the three but still lands before the 20 Sep rooms handover.',
            cites: [{ label: 'Quote comparison', target: '#compareCard' }]
          },
          {
            tone: 'good',
            text: 'The duvet cover line at ' + m('₹1,386.00/pc') + ' is unchanged from PO #107930 and now carries the sateen finish at no extra cost.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        compareLabel: 'BED SHEET 300 TC — unit rate against the benchmark',
        compareCols: 4,
        compare: [
          { k: 'This PO', v: '₹1,059.00', n: '800 pcs · 13 Aug 2026' },
          { k: 'Last PO', v: '₹1,007.00', n: '#107930 · 12 Dec 2025' },
          { k: '12-mo best', v: '₹996.00', n: '#107848 · 03 Oct 2025' },
          { k: 'Δ vs last', v: '+5.1%', n: 'category index ₹1,110.00 · 4.6% under', tone: 'up' }
        ],
        factors: [
          { name: 'Commercial', score: 82 },
          { name: 'Vendor reliability', score: 79 },
          { name: 'Technical compliance', score: 54 },
          { name: 'Process & budget', score: 94 }
        ],
        vendorFindings: [
          {
            tone: 'good',
            text: 'GSTIN ' + m('23AAACT5678N1ZQ') + ' is active with GSTR-1 and GSTR-3B filed through ' + b('Jul 2026') +
                  '. ISO 9001 valid to 30 Sep 2027, which covers the whole delivery window.',
            cites: [{ label: 'Trident_ISO9001.pdf', target: '#docsCard' }]
          },
          {
            tone: 'warn',
            text: b('On-time delivery 89%') + ' across 11 POs. The last bed-linen order (PO #107930) landed ' +
                  m('9 days') + ' late on a 30-day promise, so the 20 Sep date has little slack in it.',
            cites: [{ label: 'Vendor profile', target: '#vendorCard' }]
          },
          {
            tone: 'good',
            text: 'No open disputes and no quality rejection in 18 months. Not MSME-registered, so standard 30-day terms apply.',
            cites: [{ label: 'Key dates', target: '#datesCard' }]
          }
        ],
        techFindings: [
          {
            tone: 'bad',
            text: b('No colour-fastness test report in the QAP pack.') + ' Clause TC-05 requires an ' +
                  b('ISO 105-C06 grade 4') + ' report before delivery for white bed linen going into industrial laundry. The evaluator scored TC-05 at 16/30 for the same reason, and the laundry contract will not take the stock without it.',
            cites: [
              { label: 'Technical evaluation', target: '#techCard' },
              { label: 'Trident_QAP_Linen_2026.pdf', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'Thread count and finished size match TC-01 exactly — ' + m('300 TC, 100% cotton, 275 × 275 cm') +
                  ' sateen weave with a mitred hem.',
            cites: [{ label: 'Trident_TDS_BedLinen300TC.pdf', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: 'Shrinkage tested at ' + m('2.1%') + ' against the 3% ceiling in TC-02, measured per IS 2977 by an NABL lab.',
            cites: [{ label: 'ShrinkageTestReport_IS2977.pdf', target: '#docsCard' }]
          }
        ],
        processFindings: [
          {
            tone: 'good',
            text: 'Approval chain ' + b('matches policy PROC-04') + ' for the ₹10L–₹15L band: a single financial step, with Karan Bhatia or Sameer Nair able to sign.',
            cites: [{ label: 'Audit trail', target: '#auditCard' }]
          },
          {
            tone: 'good',
            text: 'Budget line ' + m('HK-LIN-2627') + ' (Metro Greater Noida) has ' + b(uncommitted('108250') + ' uncommitted') + ' against ' + total('108250') + ' required.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'good',
            text: b('No duplicate.') + ' The Phase 2 bed linen for the club floors sits on a separate RFQ (#536455) that has not been awarded.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        change: 'Upload the ISO 105-C06 colour-fastness report for the two sheet lots and this becomes a clean approve. Nothing about the price, the vendor or the chain needs to move.',
        audit: '8 documents · 11 prior POs · 3 certificates · 2.4s',
        asideLine: 'Only the colour-fastness test report is missing. Everything else is clean.',
        approvalNote: 'Approved on the AI decision memo — approve once the colour-fastness report is on file (88% confidence). Condition: Trident to upload the ISO 105-C06 colour-fastness report for both sheet lots before delivery.'
      }
    },

    /* ── #108244 · yes ────────────────────────────────────────────── */
    '108244': {
      steps: [
        { label: 'Reading PO #108244 line items', note: '1 line · ' + units('108244') + ' pcs · ' + total('108244'), ms: 540 },
        { label: 'Matching against 15 prior purchases of BATH TOWEL 500 GSM', note: '24 months · 3 vendors', ms: 760 },
        { label: 'Reading ARC-2026-0118 terry towelling rate card', note: 'ceiling ₹408.00/pc', ms: 500 },
        { label: 'Parsing NandanTerry_TDS_BathTowel500.pdf against clause TC-01', note: 'GSM, yarn, colour-fastness', ms: 640 },
        { label: 'Verifying NandanTerry_OEKOTEX_100.pdf', note: 'valid to 08 Oct 2027', ms: 480 },
        { label: 'Checking the approval chain against policy PROC-04', note: '₹5L–₹10L band', ms: 440 },
        { label: 'Scanning 41 open POs for a duplicate', note: '90-day window', ms: 400 }
      ],
      result: {
        verdict: 'yes',
        headline: 'Clear to approve',
        confidence: 92,
        summary: '4.1% under the last purchase, 5.9% under the ARC ceiling, spec matches clause for clause and every certificate is current.',
        findingsLabel: 'Commercial — price against history',
        findings: [
          {
            tone: 'good',
            text: b('₹384.00/pc is 4.1% below the ₹400.00 you paid on PO #108058, 28 Feb 2026') +
                  ' and 5.9% below the ARC ceiling of ' + m('₹408.00') + '. That is ' + m('₹24,864.00') +
                  ' saved against the last order at this volume.',
            cites: [
              { label: 'Items & pricing', target: '#itemsCard' },
              { label: 'ARC-2026-0118 rate card', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'L1 on a 3-bidder round, ' + m('₹28,896.00') + ' under GreenLeaf and ' + m('₹48,096.00') +
                  ' under Welspun. The 16-day lead time fits the phased room closure.',
            cites: [{ label: 'Quote comparison', target: '#compareCard' }]
          },
          {
            tone: 'good',
            text: 'The first half of this replenishment was bought at ₹400.00. Holding the second half for a further round would risk the ' +
                  b('Q4 price revision') + ' the vendor has already flagged, for a saving the history does not support.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          }
        ],
        compareLabel: 'BATH TOWEL 500 GSM — unit rate against the benchmark',
        compareCols: 4,
        compare: [
          { k: 'This PO', v: '₹384.00', n: '1,554 pcs · 11 Aug 2026' },
          { k: 'Last PO', v: '₹400.00', n: '#108058 · 28 Feb 2026' },
          { k: '24-mo best', v: '₹384.00', n: 'this order sets it' },
          { k: 'Δ vs last', v: '−4.1%', n: 'ARC ceiling ₹408.00 · 5.9% headroom', tone: 'down' }
        ],
        factors: [
          { name: 'Commercial', score: 93 },
          { name: 'Vendor reliability', score: 90 },
          { name: 'Technical compliance', score: 92 },
          { name: 'Process & budget', score: 97 }
        ],
        vendorFindings: [
          {
            tone: 'good',
            text: 'GSTIN ' + m('24AADCN3456Q1ZS') + ' is active with GSTR-1 and GSTR-3B filed through ' + b('Jul 2026') + '. No filing lapse in 24 months.',
            cites: [{ label: 'NandanTerry_GST_Filing_Jul2026.pdf', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: b('On-time delivery 94%') + ' across 15 POs. The first half of this replenishment (PO #108058) landed 3 days early with zero rejections at GRN.',
            cites: [{ label: 'Vendor profile', target: '#vendorCard' }]
          },
          {
            tone: 'good',
            text: 'OEKO-TEX Standard 100 certificate valid to ' + b('08 Oct 2027') + ' — well past the delivery date. No open disputes.',
            cites: [{ label: 'NandanTerry_OEKOTEX_100.pdf', target: '#docsCard' }]
          }
        ],
        techFindings: [
          {
            tone: 'good',
            text: 'The TDS states ' + b('500 GSM minimum, 100% ring-spun cotton, double-stitched hem') + ' — clause TC-01 word for word, with no tolerance gap. Scored 47/50.',
            cites: [
              { label: 'Technical evaluation', target: '#techCard' },
              { label: 'NandanTerry_TDS_BathTowel500.pdf', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'Colour-fastness at ' + m('ISO 105-C06 grade 4') + ' and no pile loss after 50 industrial cycles at 70°C, which is what TC-02 asks for. Scored 47/50.',
            cites: [{ label: 'Technical evaluation', target: '#techCard' }]
          }
        ],
        processFindings: [
          {
            tone: 'good',
            text: 'Approval chain ' + b('matches policy PROC-04') + ' for the ₹5L–₹10L band: a single financial step, Karan Bhatia or Sameer Nair. No step missing.',
            cites: [{ label: 'Audit trail', target: '#auditCard' }]
          },
          {
            tone: 'good',
            text: 'Budget line ' + m('HK-LIN-2627') + ' (Workwise Grand) has ' + b(uncommitted('108244') + ' uncommitted') + ' against ' + total('108244') + ' required.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'good',
            text: b('No duplicate.') + ' PO #108058 bought the first half of this replenishment and is closed; this order is the second half, not a repeat of it.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        change: 'Only an expiry would turn this — the OEKO-TEX certificate runs to 08 Oct 2027, well past dispatch. Otherwise there is nothing in the file to argue with.',
        audit: '6 documents · 15 prior POs · 2 certificates · 2.3s',
        asideLine: 'Price, spec, vendor and chain all check out. Safe to approve now.',
        approvalNote: 'Approved on the AI decision memo — clear to approve (92% confidence). ₹384.00/pc, 4.1% below the last purchase and 5.9% under the ARC ceiling; spec and certificates clear.'
      }
    },

    /* ── #108258 · hard no ────────────────────────────────────────── */
    '108258': {
      steps: [
        { label: 'Reading PO #108258 line items', note: '1 line · ' + units('108258') + ' sets · ' + total('108258'), ms: 640 },
        { label: 'Reading ARC-2026-0041 spa linen rate card', note: 'negotiated ₹401.00/set', ms: 700 },
        { label: 'Matching against 9 prior spa linen orders', note: '2023–2026 · 2 vendors', ms: 720 },
        { label: 'Parsing Aarvi_TDS_SpaLinen.pdf and QAP against clause TC-03', note: 'mandatory · OEKO-TEX', ms: 820 },
        { label: 'Reading TechEval_536431_Scorecard.pdf', note: '58% against a 70% pass mark', ms: 560 },
        { label: 'Checking approval chain against policy PROC-04', note: 'off-contract route', ms: 520 },
        { label: 'Scanning for duplicate orders on the same scope', note: '90-day window', ms: 480 }
      ],
      result: {
        verdict: 'no',
        headline: 'Do not approve — send it back',
        confidence: 92,
        summary: 'this sits outside the rate contract you already hold with the same vendor, costs 6.8% more than the last award, and fails a mandatory technical clause.',
        findingsLabel: 'Commercial — price against history',
        findings: [
          {
            tone: 'bad',
            text: b('₹428.00/set is 6.8% above the ₹401.00 ARC rate you already hold with Aarvi') +
                  ' under ARC-2026-0041. On 1,250 sets that is ' + m('₹33,750.00') +
                  ' more than the contracted route for identical stock.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          },
          {
            tone: 'bad',
            text: b('Raised off-contract.') + ' A live rate contract covers this exact line to 31 Mar 2027, so there is no basis for a spot order — and buying outside it weakens the rate at the next renewal.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'warn',
            text: 'No competing quote was taken. The last three spa linen orders all ran a 3-bidder round; this one went single-source with ' +
                  m('no recorded justification') + '.',
            cites: [{ label: 'Quote comparison', target: '#compareCard' }]
          }
        ],
        compareLabel: 'SPA THERAPY LINEN SET — unit rate against the benchmark',
        compareCols: 4,
        compare: [
          { k: 'This PO', v: '₹428.00', n: '1,250 sets · 12 Aug 2026', tone: 'up' },
          { k: 'ARC rate', v: '₹401.00', n: 'ARC-2026-0041 · to 31 Mar 2027' },
          { k: '12-mo best', v: '₹394.00', n: '#108041 · 19 Feb 2026' },
          { k: 'Δ vs ARC', v: '+6.8%', n: '₹33,750.00 over the contracted route', tone: 'up' }
        ],
        factors: [
          { name: 'Commercial', score: 38 },
          { name: 'Vendor reliability', score: 61 },
          { name: 'Technical compliance', score: 42 },
          { name: 'Process & budget', score: 55 }
        ],
        vendorFindings: [
          {
            tone: 'bad',
            text: b('OEKO-TEX Standard 100 certificate lapsed in March 2026') +
                  ' and has not been renewed. Spa linen sits against guest skin, and the wellness SOP makes the certificate a condition of supply.',
            cites: [{ label: 'Aarvi_OEKOTEX.pdf', target: '#docsCard' }]
          },
          {
            tone: 'warn',
            text: b('On-time delivery 82%') + ' across 9 POs — the weakest of the linen panel. Two of the last four orders were short-shipped and closed on a partial GRN.',
            cites: [{ label: 'Vendor profile', target: '#vendorCard' }]
          },
          {
            tone: 'good',
            text: 'GSTIN ' + m('27AACFA9012P1ZR') + ' is active with returns filed through Jul 2026. No open disputes.',
            cites: [{ label: 'Key dates', target: '#datesCard' }]
          }
        ],
        techFindings: [
          {
            tone: 'bad',
            text: b('Mandatory clause TC-03 failed.') + ' The evaluator scored ' + b('58% against a 70% pass mark') +
                  ' — the quoted set is 380 GSM against the 420 GSM floor, and the anti-pill finish is not evidenced anywhere in the pack.',
            cites: [
              { label: 'Technical evaluation', target: '#techCard' },
              { label: 'TechEval_536431_Scorecard.pdf', target: '#docsCard' }
            ]
          },
          {
            tone: 'bad',
            text: 'No wash-durability report. TC-04 asks for ' + m('50 industrial cycles at 70°C') +
                  ' with no pile loss; the QAP pack contains only the supplier\'s own declaration.',
            cites: [{ label: 'Aarvi_QAP_SpaLinen.pdf', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: 'Finished size and colour match TC-01. That is the only clause this quote clears outright.',
            cites: [{ label: 'Aarvi_TDS_SpaLinen.pdf', target: '#docsCard' }]
          }
        ],
        processFindings: [
          {
            tone: 'warn',
            text: 'Budget line ' + m('HK-LIN-2627') + ' has ' + b(uncommitted('108258') + ' uncommitted') +
                  ', so the money is there — but committing it off-contract spends the linen budget at a worse rate than the one already negotiated.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'bad',
            text: b('Possible duplicate.') + ' PO #108177 (28 Jul 2026) to Aarvi covers the same spa therapy linen for the same property and is still open. If both conclude you buy the stock twice.',
            cites: [{ label: 'PO 108177.pdf', target: '#docsCard' }]
          },
          {
            tone: 'warn',
            text: 'No single-source justification is recorded against the RFQ, which PROC-04 requires whenever a live rate contract is bypassed.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          }
        ],
        change: 'Re-raise it as a call-off against ARC-2026-0041 at ₹401.00/set with a current OEKO-TEX certificate and a 420 GSM sample cleared by the evaluator. PO #108177 has to be withdrawn first either way.',
        audit: '11 documents · 9 prior POs · 4 certificates · 3.6s',
        asideLine: 'Mandatory clause TC-03 failed and it bypasses a live rate contract. Send it back.',
        approvalNote: 'Approved against the AI decision memo, which said do not approve (92% confidence): off-contract, 6.8% above the ARC-2026-0041 rate, mandatory clause TC-03 failed and the OEKO-TEX certificate lapsed. Override recorded by the approver.'
      }
    }
  };

  // The queue is the register's pending orders, in the order the triage
  // reads them out: clear first, then held on a document, then the hard no.
  // `note` is the short form the PO table's AI call column shows.
  var TRIAGE = [
    { po: '108244', verdict: 'yes',       vendor: 'Nandan Terry Ltd',              line: '4.1% below the last purchase, chain and budget clean', note: '4.1% below last purchase' },
    { po: '108231', verdict: 'yes',       vendor: 'Sriram Textiles Pvt Ltd',       line: 'at the ARC-2627-0014 rate, every line below the last award', note: 'every line below the last award' },
    { po: '108215', verdict: 'attention', vendor: 'Welspun Hospitality Solutions', line: 'ISO 9001 expired 47 days ago; GSM tolerance wider than TC-02', note: 'ISO 9001 expired 47 days ago' },
    { po: '108250', verdict: 'attention', vendor: 'Trident Hometex Ltd',           line: 'colour-fastness test report missing from the QAP pack', note: 'colour-fastness report missing' },
    { po: '108258', verdict: 'no',        vendor: 'Aarvi Linens & Amenities',      line: 'off-contract, 6.8% above the ARC rate, mandatory clause TC-03 failed', note: 'off-contract, 6.8% above the ARC rate' }
  ].map(function (t) { t.amount = PO(t.po).value; return t; });

  function sumOf(list) { return Math.round(list.reduce(function (s, t) { return s + t.amount; }, 0) * 100) / 100; }
  function byVerdict(v) { return TRIAGE.filter(function (t) { return t.verdict === v; }); }
  function nums(list) { return list.map(function (t) { return '#' + t.po; }).join(' and '); }

  var CLEAR = byVerdict('yes'), HELD = byVerdict('attention'), NO = byVerdict('no');
  var HELD_TOTAL = sumOf(TRIAGE);
  var LINE_COUNT = TRIAGE.reduce(function (s, t) { return s + PO(t.po).lines.length; }, 0);
  var BUSINESS_UNITS = TRIAGE.reduce(function (set, t) { set[PO(t.po).propertyId] = 1; return set; }, {});

  /* ═══════════════════════════════════════════════════════════════
     Dashboard triage plan
     ═══════════════════════════════════════════════════════════════ */
  var QUEUE = {
    steps: [
      { label: 'Loading your approval queue', note: TRIAGE.length + ' POs · ' + inr(HELD_TOTAL) + ' held', ms: 560 },
      { label: 'Reading ' + LINE_COUNT + ' line items and vendor terms', note: TRIAGE.length + ' vendors · ' + Object.keys(BUSINESS_UNITS).length + ' business units', ms: 700 },
      { label: 'Matching rates against ARC ceilings and 12-month history', note: '312 prior order lines', ms: 860 },
      // 37 = the documents the five memos read: 6 + 5 + 7 + 8 + 11.
      { label: 'Checking GSTIN, MSME, ISO and on-time delivery for each vendor', note: '37 documents', ms: 780 },
      // The three documents the queue's calls turn on — each is on its PO's page.
      { label: 'Reading Welspun_ISO9001.pdf, Aarvi_OEKOTEX.pdf and Trident_QAP_Linen_2026.pdf', note: '2 certificates lapsed · 1 test report missing', ms: 640 },
      { label: 'Verifying every approval chain against policy PROC-04', note: TRIAGE.length + ' instances', ms: 620 },
      { label: 'Scanning for duplicate and split orders', note: '90-day window', ms: 520 }
    ],
    triage: TRIAGE,
    result: {
      verdict: 'attention',
      headline: CLEAR.length + ' clear to approve · ' + HELD.length + ' need attention · ' + NO.length + ' hard no',
      confidence: 89,
      summary: inr(sumOf(CLEAR)) + ' is ready to release now. two POs are held on a single missing document each, and one should not be approved at all.',
      findingsLabel: 'What the model found across the queue',
      findings: [
        {
          tone: 'good',
          text: b(CLEAR.length + ' POs clear on every check') + ' — ' + nums(CLEAR) + ', ' + m(inr(sumOf(CLEAR))) +
                ' combined. Both sit at or below their contracted rates, every certificate is current, and each approval chain matches policy PROC-04.',
          cites: [{ label: 'PO table', target: '#poTableCard' }]
        },
        {
          tone: 'warn',
          text: b(HELD.length + ' POs need one document each') + ' — #108215 (ISO 9001 lapsed 28 Jun 2026) and #108250 (colour-fastness test report missing), holding ' +
                m(inr(sumOf(HELD))) + '. Neither has a pricing problem.',
          cites: [{ label: 'Awaiting your approval', target: '#awaiting' }]
        },
        {
          tone: 'bad',
          text: b(NO.length + ' hard no') + ' — ' + nums(NO) + ', ' + m(inr(sumOf(NO))) +
                ', is off-contract, 6.8% above the ARC rate you already hold with the same vendor, and fails mandatory clause TC-03 — and the supplier’s OEKO-TEX certificate lapsed in March.',
          cites: [{ label: 'PO table', target: '#poTableCard' }]
        },
        {
          tone: 'good',
          text: 'Nothing in the queue is a duplicate of an approved PO, and no vendor in it has a lapsed GSTIN.',
          cites: [{ label: 'KPI summary', target: '#kpiStrip' }]
        }
      ],
      compareLabel: 'What this queue is worth',
      compareCols: 4,
      compare: [
        { k: 'Ready to release', v: lakh(sumOf(CLEAR)), n: CLEAR.length + ' POs · no conditions', tone: 'down' },
        { k: 'Held on a document', v: lakh(sumOf(HELD)), n: HELD.length + ' POs · 1 item each' },
        { k: 'Should not proceed', v: lakh(sumOf(NO)), n: NO.length + ' PO · ' + nums(NO), tone: 'up' },
        { k: 'Review time saved', v: '2h 55m', n: 'vs. reading 37 documents by hand' }
      ],
      audit: TRIAGE.length + ' purchase orders · 37 documents · 312 prior order lines · 4.8s'
    }
  };

// Namespaced per panel. In the prototypes each page loaded exactly one
// data.js, so a single `window.WWData` was safe. Bundled into one app they
// all land in the same global and the last module evaluated wins — which in
// a production build meant the PO panel read the Vendor Match fixture and
// died on `QUEUE.triage`. Dev never showed it: no shared chunks.
  global.WWData_poDecision = {
    inr: inr, qty: qty, nf0: nf0, nf2: nf2,
    PEOPLE: PEOPLE, VENDORS: VENDORS,
    KPI: KPI, TABS: TABS, ROWS: ROWS, AWAITING: AWAITING,
    DETAIL: DETAIL, VERDICTS: VERDICTS, QUEUE: QUEUE,
    DEFAULT_PO: '108215'
  };
})(typeof window !== "undefined" ? window : globalThis);
