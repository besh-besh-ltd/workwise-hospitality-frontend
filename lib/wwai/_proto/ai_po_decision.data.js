/* ═══════════════════════════════════════════════════════════════════
   Workwise · Purchase Orders — demo dataset + pre-authored AI verdicts
   Tenant: Workwise Hotels · IST · en-IN grouping · GST 18/12/5
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── formatting ─────────────────────────────────────────────────── */
  var nf2 = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var nf0 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

  function inr(n) { return '₹' + nf2.format(n); }
  function qty(n) { return nf0.format(n); }

  /* ── people ─────────────────────────────────────────────────────── */
  var PEOPLE = {
    kushal:  { name: 'Kushal Shah',  ini: 'KS', av: 'avGreen__pymZt' },
    ritika:  { name: 'Ritika Menon', ini: 'RM', av: 'avRose__QmMGS' },
    vikram:  { name: 'Vikram Nair',  ini: 'VN', av: 'avSky__QkqM5' },
    devika:  { name: 'Devika Rao',   ini: 'DR', av: 'avIndigo__pYPbr' },
    meera:   { name: 'Meera Iyer',   ini: 'MI', av: 'avZinc___YLe7' }
  };

  /* ── vendors ────────────────────────────────────────────────────── */
  var VENDORS = {
    novatech: {
      name: 'NovaTech Hospitality Solutions', ini: 'NS', av: 'avSky__QkqM5',
      tagline: 'Linen, amenities & guest supplies · Mumbai · vendor since Mar 2022',
      phone: '+91-98001 00006', email: 'procurement@novatech-hospitality.in',
      gstin: '27AAFCN4821K1ZQ', otd: '94.2%', pos: '18'
    },
    sparkline: {
      name: 'SparkLine Maintenance Corp', ini: 'SC', av: 'avIndigo__pYPbr',
      tagline: 'HVAC & building services · Pune · vendor since Aug 2023',
      phone: '+91-98220 41177', email: 'contracts@sparklinemaint.in',
      gstin: '27AAGCS9013M1Z4', otd: '81.3%', pos: '9'
    },
    shree: {
      name: 'Shree Textiles Pvt Ltd', ini: 'ST', av: 'avRose__QmMGS',
      tagline: 'Bed & bath textiles · Surat · vendor since Jun 2021',
      phone: '+91-99250 33481', email: 'sales@shreetextiles.co.in',
      gstin: '24AABCS7712H1ZP', otd: '97.8%', pos: '23'
    },
    anand: {
      name: 'Anand Linen Mills', ini: 'AL', av: 'avZinc___YLe7',
      tagline: 'Mattresses, linen & upholstery · Panipat · vendor since Nov 2020',
      phone: '+91-98123 55004', email: 'orders@anandlinenmills.in',
      gstin: '06AAACA3391N1ZR', otd: '96.1%', pos: '15'
    },
    meridian: {
      name: 'Meridian Engineering Services', ini: 'ME', av: 'avIndigo__pYPbr',
      tagline: 'Kitchen & refrigeration engineering · Bengaluru · vendor since Feb 2022',
      phone: '+91-99450 27718', email: 'projects@meridianeng.co.in',
      gstin: '27AACCM6621F1ZW', otd: '88.6%', pos: '11'
    },
    gokul:  { name: 'Gokul Hospitality Supplies', ini: 'GH', av: 'avGreen__pymZt' },
    itwale: { name: 'Workwise IT Wale',           ini: 'WW', av: 'avZinc___YLe7' }
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
      items: 'BANQUET CROCKERY SET · +2 more', itemsMeta: '3 items · 640 qty',
      value: 486200, initiator: 'kushal', created: '13 Aug 2026 · 06:12 PM', ago: '1d ago',
      ai: 'pending'
    },
    {
      po: '108222', status: 'pending_approval', statusLabel: 'Pending approval', pill: 'pending__q4HHd',
      pendingLine: 'on L2 — Kushal Shah, Meera Iyer',
      rfq: '536438', vendor: 'meridian',
      items: 'KITCHEN EXHAUST HOOD · +1 more', itemsMeta: '2 items · 6 qty',
      value: 869660, initiator: 'devika', created: '13 Aug 2026 · 02:40 PM', ago: '1d ago',
      ai: 'attention', aiNote: 'fire-damper certificate missing'
    },
    {
      po: '108221', status: 'pending_approval', statusLabel: 'Pending approval', pill: 'pending__q4HHd',
      pendingLine: 'on L3 — Kushal Shah, Meera Iyer',
      rfq: '536431', vendor: 'sparkline',
      items: 'CHILLER AMC — 450 TR · +1 more', itemsMeta: '2 items · 121 qty',
      value: 2781968, initiator: 'kushal', created: '12 Aug 2026 · 11:24 AM', ago: '2d ago',
      ai: 'no', aiNote: '19.0% above the ARC rate'
    },
    {
      po: '108219', status: 'pending_approval', statusLabel: 'Pending approval', pill: 'pending__q4HHd',
      pendingLine: 'on L2 — Kushal Shah',
      rfq: '536425', vendor: 'anand',
      items: 'MATTRESS 8IN POCKET SPRING', itemsMeta: '1 item · 180 qty',
      value: 596736, initiator: 'devika', created: '11 Aug 2026 · 05:03 PM', ago: '3d ago',
      ai: 'yes', aiNote: '4.1% below last purchase'
    },
    {
      po: '108215', status: 'pending_approval', statusLabel: 'Pending approval', pill: 'pending__q4HHd',
      pendingLine: 'on L3 — Kushal Shah, Meera Iyer',
      rfq: '536417', vendor: 'novatech',
      items: 'BATH TOWEL 500 GSM · +1 more', itemsMeta: '2 items · 1,600 qty',
      value: 1236480, initiator: 'kushal', created: '11 Aug 2026 · 10:18 AM', ago: '3d ago',
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
      po: '108209', status: 'pending_approval', statusLabel: 'Pending approval', pill: 'pending__q4HHd',
      pendingLine: 'on L2 — Kushal Shah',
      rfq: '536396', vendor: 'shree',
      items: 'BED LINEN SET 300 TC', itemsMeta: '1 item · 900 qty',
      value: 318528, initiator: 'ritika', created: '07 Aug 2026 · 09:55 AM', ago: '1w ago',
      ai: 'yes', aiNote: '3.7% below last purchase'
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
    { po: '108221', since: '2d waiting' },
    { po: '108215', since: '3d waiting' },
    { po: '108222', since: '1d waiting' },
    { po: '108219', since: '3d waiting' },
    { po: '108209', since: '7d waiting' }
  ];

  /* ═══════════════════════════════════════════════════════════════
     PO detail records
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
      finalizedBy: 'Kushal Shah',
      pendingNote: 'Pending approval — currently with L3: Kushal Shah (you).',
      asideNote: 'Currently with L3: Kushal Shah. Two approvers can act — any one is enough.',
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
        { vendor: VENDORS.novatech, gstin: '27AAFCN4821K1ZQ', amount: 1236480, delivery: '10 days', delta: 'baseline', winner: true },
        { vendor: VENDORS.anand,    gstin: '24AAECA5518J1ZL', amount: 1271320, delivery: '14 days', delta: '2.8%' },
        { vendor: VENDORS.shree,    gstin: '24AABCS7712H1ZP', amount: 1304960, delivery: '12 days', delta: '5.5%' }
      ],
      techEval: [
        {
          product: 'BATH TOWEL 500 GSM', round: 1, score: '88%', passed: true, mark: '60%',
          approver: 'Ritika Menon', when: '10 Aug 2026 · 04:12 PM',
          clauses: [
            { text: 'TC-01 — Towel must be 100% combed ring-spun cotton with double-stitched hem, colour-fast to ISO 105-C06 grade 4 or better.', max: 40, got: 40 },
            { text: 'TC-02 — Minimum 500 GSM measured per IS 1964. Negative tolerance is not acceptable.', max: 60, got: 48 }
          ]
        },
        {
          product: 'BATH MAT 900 GSM', round: 1, score: '92%', passed: true, mark: '60%',
          approver: 'Ritika Menon', when: '10 Aug 2026 · 04:12 PM',
          clauses: [
            { text: 'TC-01 — 900 GSM minimum with anti-skid latex backing, finished size 50 × 80 cm ± 2 cm.', max: 50, got: 46 },
            { text: 'TC-02 — No delamination or pile loss after 50 industrial wash cycles at 70°C.', max: 50, got: 46 }
          ]
        }
      ],
      docs: [
        { name: 'PO 108215.pdf', sub: 'po' },
        { name: 'NovaTech_Quote_R2_536417.pdf', sub: 'quote · round 2' },
        { name: 'NovaTech_TDS_BathTowel500.pdf', sub: 'technical data sheet' },
        { name: 'NovaTech_QAP_Linen_2026.pdf', sub: 'quality assurance plan' },
        { name: 'NovaTech_ISO9001.pdf', sub: 'certificate · expired' },
        { name: 'NovaTech_GST_Filing_Jul2026.pdf', sub: 'compliance' },
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
        { by: 'ritika', msg: 'uploaded NovaTech_QAP_Linen_2026.pdf', when: '12 Aug 2026 · 09:41 AM' },
        { by: 'meera',  msg: 'viewed this purchase order', when: '13 Aug 2026 · 06:02 PM' }
      ]
    },

    /* ── #108209 · CLEAR TO APPROVE ───────────────────────────────── */
    '108209': {
      po: '108209',
      status: 'Pending Approval',
      statusPill: 'pending__q4HHd',
      vendor: VENDORS.shree,
      rfq: '536396',
      rfqTitle: 'Bed linen replenishment — Lake Paradise, Udaipur',
      bu: 'Lake Paradise, Udaipur',
      dept: 'Housekeeping',
      bidders: 3,
      finalizedBy: 'Ritika Menon',
      pendingNote: 'Pending approval — currently with L2: Kushal Shah (you).',
      asideNote: 'Currently with L2: Kushal Shah. You are the only approver on this step.',
      pdf: 'PO 108209.pdf',
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
        { vendor: VENDORS.shree,    gstin: '24AABCS7712H1ZP', amount: 318528, delivery: '9 days',  delta: 'baseline', winner: true },
        { vendor: VENDORS.anand,    gstin: '24AAECA5518J1ZL', amount: 330624, delivery: '11 days', delta: '3.8%' },
        { vendor: VENDORS.novatech, gstin: '27AAFCN4821K1ZQ', amount: 345744, delivery: '8 days',  delta: '8.5%' }
      ],
      techEval: [
        {
          product: 'BED LINEN SET 300 TC', round: 1, score: '96%', passed: true, mark: '60%',
          approver: 'Ritika Menon', when: '06 Aug 2026 · 11:20 AM',
          clauses: [
            { text: 'TC-01 — 300 thread count, 60/40 cotton-polyester blend, 220 GSM ± 3%, sateen weave.', max: 50, got: 48 },
            { text: 'TC-02 — Wash shrinkage not to exceed 3% after 5 industrial cycles. Independent test certificate required.', max: 50, got: 48 }
          ]
        }
      ],
      docs: [
        { name: 'PO 108209.pdf', sub: 'po' },
        { name: 'ShreeTextiles_Quote_536396.pdf', sub: 'quote · round 1' },
        { name: 'ShreeTextiles_TDS_BedLinen300TC.pdf', sub: 'technical data sheet' },
        { name: 'ShreeTextiles_OEKOTEX_100.pdf', sub: 'certificate · valid' },
        { name: 'ShreeTextiles_Udyam_Certificate.pdf', sub: 'msme registration' }
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
        { by: 'ritika', msg: 'created purchase order 108209', when: '07 Aug 2026 · 09:55 AM' },
        { by: 'ritika', msg: 'initiated purchase order 108209', when: '07 Aug 2026 · 10:02 AM' },
        { by: 'vikram', msg: 'approved this purchase order', when: '07 Aug 2026 · 03:18 PM' },
        { by: 'devika', msg: 'uploaded ShreeTextiles_OEKOTEX_100.pdf', when: '08 Aug 2026 · 11:07 AM' }
      ]
    },

    /* ── #108222 · NEEDS ATTENTION (missing damper certificate) ───── */
    '108222': {
      po: '108222',
      status: 'Pending Approval',
      statusPill: 'pending__q4HHd',
      vendor: VENDORS.meridian,
      rfq: '536438',
      rfqTitle: 'Kitchen exhaust replacement — banquet kitchen, Phase 1',
      bu: 'Workwise Residency, Bengaluru',
      dept: 'Engineering',
      bidders: 3,
      finalizedBy: 'Devika Rao',
      pendingNote: 'Pending approval — currently with L2: Kushal Shah (you).',
      asideNote: 'Currently with L2: Kushal Shah. Two approvers can act — any one is enough.',
      pdf: 'PO 108222.pdf',
      total: 869660,
      items: [
        {
          name: 'KITCHEN EXHAUST HOOD', size: '3000 × 1200 mm',
          spec: 'SS 304, 1.2 mm canopy with stainless baffle filters, integrated grease gutter and drain cock, factory-fitted light fittings',
          comment: 'Replaces the 2016 hoods over the banquet range and the tandoor line',
          qty: 4, unit: 'units', rate: 145000.00, gst: 18
        },
        {
          name: 'INLINE CENTRIFUGAL FAN 5 HP', size: '500 mm impeller',
          spec: 'Backward-curved inline centrifugal fan, 4,500 CMH at 250 Pa, IE3 motor, anti-vibration mounts',
          comment: 'One fan per riser',
          qty: 2, unit: 'units', rate: 78500.00, gst: 18
        }
      ],
      compare: [
        { vendor: VENDORS.meridian,  gstin: '27AACCM6621F1ZW', amount: 869660, delivery: '35 days', delta: 'baseline', winner: true },
        { vendor: VENDORS.sparkline, gstin: '27AAGCS9013M1Z4', amount: 902840, delivery: '30 days', delta: '3.8%' },
        { vendor: VENDORS.gokul,     gstin: '29AAFCG2210K1ZB', amount: 944300, delivery: '42 days', delta: '8.6%' }
      ],
      techEval: [
        {
          product: 'KITCHEN EXHAUST HOOD', round: 1, score: '78%', passed: true, mark: '60%',
          approver: 'Vikram Nair', when: '12 Aug 2026 · 11:05 AM',
          clauses: [
            { text: 'TC-01 — Canopy in SS 304, 1.2 mm, 3000 × 1200 mm, with stainless baffle filters and an integrated grease gutter.', max: 40, got: 36 },
            { text: 'TC-02 — Rated airflow of at least 4,500 CMH at 250 Pa static, measured per IS 655.', max: 30, got: 26 },
            { text: 'TC-05 — Fire damper on each riser, with a UL 555 or IS 3588 test report submitted before handover.', max: 30, got: 16 }
          ]
        }
      ],
      docs: [
        { name: 'PO 108222.pdf', sub: 'po' },
        { name: 'Meridian_Quote_536438.pdf', sub: 'quote · round 1' },
        { name: 'Meridian_TDS_ExhaustHood.pdf', sub: 'technical data sheet' },
        { name: 'Meridian_QAP_Kitchen_2026.pdf', sub: 'quality assurance plan' },
        { name: 'Meridian_ISO9001.pdf', sub: 'certificate · valid' },
        { name: 'Meridian_GST_Filing_Jul2026.pdf', sub: 'compliance' },
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
        { by: 'devika', msg: 'created purchase order 108222', when: '13 Aug 2026 · 02:40 PM' },
        { by: 'devika', msg: 'initiated purchase order 108222', when: '13 Aug 2026 · 02:51 PM' },
        { by: 'vikram', msg: 'approved this purchase order', when: '13 Aug 2026 · 06:20 PM' },
        { by: 'vikram', msg: 'uploaded AirflowTestReport_IS655.pdf', when: '13 Aug 2026 · 06:24 PM' }
      ]
    },

    /* ── #108219 · CLEAR TO APPROVE ───────────────────────────────── */
    '108219': {
      po: '108219',
      status: 'Pending Approval',
      statusPill: 'pending__q4HHd',
      vendor: VENDORS.anand,
      rfq: '536425',
      rfqTitle: 'Mattress replacement — Lake Paradise, Udaipur · Phase 2',
      bu: 'Lake Paradise, Udaipur',
      dept: 'Housekeeping',
      bidders: 3,
      finalizedBy: 'Devika Rao',
      pendingNote: 'Pending approval — currently with L2: Kushal Shah (you).',
      asideNote: 'Currently with L2: Kushal Shah. You are the only approver on this step.',
      pdf: 'PO 108219.pdf',
      total: 596736,
      items: [
        {
          name: 'MATTRESS 8IN POCKET SPRING', size: 'Queen · 152 × 203 × 20 cm',
          spec: '8 inch pocket-spring core, 13 gauge, 486 springs per unit, high-resilience foam quilting, knitted stretch cover, BS 7177 Source 5 fire retardant',
          comment: 'Phase 2 — 180 of the 340 keys, remaining 160 scheduled for Q4',
          qty: 180, unit: 'pcs', rate: 2960.00, gst: 12
        }
      ],
      compare: [
        { vendor: VENDORS.anand,    gstin: '06AAACA3391N1ZR', amount: 596736, delivery: '16 days', delta: 'baseline', winner: true },
        { vendor: VENDORS.gokul,    gstin: '29AAFCG2210K1ZB', amount: 625632, delivery: '18 days', delta: '4.8%' },
        { vendor: VENDORS.novatech, gstin: '27AAFCN4821K1ZQ', amount: 644832, delivery: '14 days', delta: '8.1%' }
      ],
      techEval: [
        {
          product: 'MATTRESS 8IN POCKET SPRING', round: 1, score: '94%', passed: true, mark: '60%',
          approver: 'Ritika Menon', when: '10 Aug 2026 · 03:30 PM',
          clauses: [
            { text: 'TC-01 — Pocket-spring core, 8 inch, 13 gauge, minimum 480 springs per queen unit, high-resilience foam quilting.', max: 50, got: 47 },
            { text: 'TC-02 — Fire retardancy to BS 7177 Source 5, with a valid independent test certificate.', max: 50, got: 47 }
          ]
        }
      ],
      docs: [
        { name: 'PO 108219.pdf', sub: 'po' },
        { name: 'AnandLinen_Quote_536425.pdf', sub: 'quote · round 2' },
        { name: 'AnandLinen_TDS_Mattress8IN.pdf', sub: 'technical data sheet' },
        { name: 'AnandLinen_BS7177_TestCert.pdf', sub: 'certificate · valid' },
        { name: 'AnandLinen_GST_Filing_Jul2026.pdf', sub: 'compliance' },
        { name: 'ARC-2026-0118_Mattress_RateCard.pdf', sub: 'rate contract' }
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
        { by: 'devika', msg: 'created purchase order 108219', when: '11 Aug 2026 · 05:03 PM' },
        { by: 'devika', msg: 'initiated purchase order 108219', when: '11 Aug 2026 · 05:11 PM' },
        { by: 'vikram', msg: 'approved this purchase order', when: '12 Aug 2026 · 10:40 AM' },
        { by: 'ritika', msg: 'uploaded AnandLinen_BS7177_TestCert.pdf', when: '12 Aug 2026 · 11:02 AM' }
      ]
    },

    /* ── #108221 · HARD NO ────────────────────────────────────────── */
    '108221': {
      po: '108221',
      status: 'Pending Approval',
      statusPill: 'pending__q4HHd',
      vendor: VENDORS.sparkline,
      rfq: '536431',
      rfqTitle: 'Chiller AMC — 450 TR centrifugal, FY 2026-27',
      bu: 'Workwise Grand, Mumbai',
      dept: 'Engineering',
      bidders: 2,
      finalizedBy: 'Devika Rao',
      pendingNote: 'Pending approval — currently with L3: Kushal Shah (you).',
      asideNote: 'Currently with L3: Kushal Shah. Policy PROC-04 also requires an L4 step above ₹25L.',
      pdf: 'PO 108221.pdf',
      total: 2781968,
      items: [
        {
          name: 'CHILLER AMC — 450 TR CENTRIFUGAL', size: 'Carrier 19XR · comprehensive · 12 months',
          spec: 'Comprehensive annual maintenance: 4 preventive visits, unlimited breakdown calls, spares included, quarterly vibration analysis and oil sampling',
          comment: 'Renewal for the FY 2026-27 contract year starting 01 Sep 2026',
          qty: 1, unit: 'contract', rate: 2240000.00, gst: 18
        },
        {
          name: 'R-134a REFRIGERANT TOP-UP', size: 'Cylinder · per kg',
          spec: 'Virgin R-134a, 99.9% purity, OEM-approved supplier, batch certificate on delivery',
          comment: 'Estimated annual make-up quantity',
          qty: 120, unit: 'kg', rate: 980.00, gst: 18
        }
      ],
      compare: [
        { vendor: VENDORS.meridian,  gstin: '27AACCM6621F1ZW', amount: 2490640, delivery: '21 days', delta: 'baseline' },
        { vendor: VENDORS.sparkline, gstin: '27AAGCS9013M1Z4', amount: 2781968, delivery: '30 days', delta: '11.7%', winner: true }
      ],
      techEval: [
        {
          product: 'CHILLER AMC — 450 TR CENTRIFUGAL', round: 1, score: '58%', passed: false, mark: '70%',
          approver: 'Vikram Nair', when: '10 Aug 2026 · 06:05 PM',
          clauses: [
            { text: 'TC-03 (mandatory) — All spares must be OEM (Carrier) supplied for the installed 19XR unit. Third-party or equivalent-grade spares are not acceptable.', max: 40, got: 8 },
            { text: 'TC-04 — Minimum 4 preventive visits per year by OEM-certified technicians, with a 4-hour breakdown response window.', max: 30, got: 22 },
            { text: 'TC-05 — Vibration analysis and oil sampling reports submitted each quarter.', max: 30, got: 28 }
          ]
        }
      ],
      docs: [
        { name: 'PO 108221.pdf', sub: 'po' },
        { name: 'SparkLine_Quote_R3_536431.pdf', sub: 'quote · round 3' },
        { name: 'SparkLine_TDS_ChillerAMC.pdf', sub: 'technical data sheet' },
        { name: 'SparkLine_QAP_AMC_2026.pdf', sub: 'quality assurance plan' },
        { name: 'SparkLine_ISO9001.pdf', sub: 'certificate · valid' },
        { name: 'SparkLine_ISO45001.pdf', sub: 'certificate · expires 09 Sep 2026' },
        { name: 'ARC-2026-0041_ChillerAMC_RateCard.pdf', sub: 'rate contract' },
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
        { by: 'devika', msg: 'created purchase order 108221', when: '12 Aug 2026 · 11:24 AM' },
        { by: 'devika', msg: 'initiated purchase order 108221', when: '12 Aug 2026 · 11:39 AM' },
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
        { label: 'Reading PO #108215 line items', note: '2 lines · 1,600 units · ₹12,36,480.00', ms: 620 },
        { label: 'Matching against 14 prior purchases of BATH TOWEL 500 GSM', note: '18 months · 3 vendors', ms: 780 },
        { label: 'Reading ARC-2026-0117 linen rate card', note: 'ceiling ₹877.00/pc', ms: 520 },
        { label: 'Parsing NovaTech_TDS_BathTowel500.pdf against RFQ clause TC-02', note: 'GSM tolerance', ms: 700 },
        { label: 'Parsing NovaTech_ISO9001.pdf', note: 'validity window', ms: 460 },
        { label: 'Checking GSTIN 27AAFCN4821K1ZQ filing history', note: 'GSTR-1 / 3B, 12 months', ms: 540 },
        { label: 'Checking approval chain L1→L3 against policy PROC-04', note: '₹10L–₹15L band', ms: 480 },
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
            text: 'NovaTech was ' + b('L1 on a 3-bidder round') + ' — ' + m('₹34,840.00') +
                  ' under Anand Linen Mills and ' + m('₹68,480.00') + ' under Shree Textiles, on the shortest delivery of the three.',
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
              { label: 'NovaTech_ISO9001.pdf', target: '#docsCard' },
              { label: 'Vendor profile', target: '#vendorCard' }
            ]
          },
          {
            tone: 'good',
            text: 'GSTIN ' + m('27AAFCN4821K1ZQ') + ' is active. GSTR-1 and GSTR-3B filed through ' +
                  b('Jul 2026') + ' with no lapse in 12 months, so input credit is not at risk.',
            cites: [{ label: 'GST filing record', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: b('On-time delivery 94.2%') + ' across 18 POs in 12 months, averaging 2.1 days early. One quality complaint (lint shedding, Mar 2026) closed with a full replacement. No open disputes.',
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
              { label: 'NovaTech_TDS_BathTowel500.pdf', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'Colour-fastness, hem construction and yarn type in the TDS match TC-01 exactly. The QAP commits to per-lot GSM testing at dispatch, which is the control that would catch a short-weight batch.',
            cites: [{ label: 'NovaTech_QAP_Linen_2026.pdf', target: '#docsCard' }]
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
            text: 'Approval chain ' + b('L1→L3 matches policy PROC-04') + ' for the ₹10L–₹15L band. L1 Vikram Nair and L2 Ritika Menon both hold live delegations; you are a valid L3.',
            cites: [{ label: 'Audit trail', target: '#auditCard' }]
          },
          {
            tone: 'good',
            text: 'Budget line ' + m('HK-LIN-2627') + ' has ' + b('₹41.80L uncommitted') +
                  ' against the ₹12,36,480.00 required. Post-commitment utilisation reaches 61% of the annual linen budget at month 5 of 12.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'good',
            text: b('No duplicate.') + ' The nearest same-item order is PO #108102 (14 Mar 2026), 153 days apart and outside the 30-day duplicate window. Quantity is consistent with 320 keys at 3 sets plus a 15% float.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        change: 'A current ISO 9001 certificate on file, and a one-line written confirmation from NovaTech that delivered GSM will not fall below 500, would move this to a clean approve. Nothing about the price needs to change.',
        audit: '7 documents · 14 prior POs · 3 certificates · 2.9s',
        asideLine: 'Approve once the ISO 9001 renewal and the GSM confirmation are on file.'
      }
    },

    /* ── #108209 · yes ────────────────────────────────────────────── */
    '108209': {
      steps: [
        { label: 'Reading PO #108209 line items', note: '1 line · 900 sets · ₹3,18,528.00', ms: 560 },
        { label: 'Matching against 23 prior purchases of BED LINEN SET 300 TC', note: '24 months · 3 vendors', ms: 760 },
        { label: 'Reading ARC-2026-0117 linen rate card', note: 'ceiling ₹340.00/set', ms: 500 },
        { label: 'Parsing ShreeTextiles_TDS_BedLinen300TC.pdf against clause TC-01', note: 'thread count, GSM, blend', ms: 660 },
        { label: 'Verifying OEKO-TEX and Udyam certificates', note: '2 certificates', ms: 470 },
        { label: 'Checking approval chain L1→L2 against policy PROC-04', note: 'under ₹5L band', ms: 440 },
        { label: 'Scanning 41 open POs for a duplicate', note: '30-day window', ms: 400 }
      ],
      result: {
        verdict: 'yes',
        headline: 'Clear to approve',
        confidence: 94,
        summary: 'best price in 24 months, a spec that matches the RFQ line for line, and a vendor with the cleanest delivery record on your panel.',
        findingsLabel: 'Commercial — price against history',
        findings: [
          {
            tone: 'good',
            text: b('₹316.00/set is 3.7% below the ₹328.00 you paid on PO #107991, 09 Jan 2026') +
                  ' and 7.1% below the ARC ceiling of ' + m('₹340.00') + '. That is ' + m('₹10,800.00') +
                  ' saved against the last order at the same volume.',
            cites: [
              { label: 'Items & pricing', target: '#itemsCard' },
              { label: 'Quote comparison', target: '#compareCard' }
            ]
          },
          {
            tone: 'good',
            text: 'This is the ' + b('lowest unit rate recorded for the item in 24 months') +
                  '. The prior best was ₹319.00 on PO #107640, 18 Apr 2025.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          },
          {
            tone: 'good',
            text: 'L1 on a 3-bidder round, ' + m('₹12,096.00') + ' under Anand Linen Mills and ' +
                  m('₹27,216.00') + ' under NovaTech. The 9-day delivery is the middle of the three and fits the 22 Aug handover.',
            cites: [{ label: 'Quote comparison', target: '#compareCard' }]
          }
        ],
        compareLabel: 'BED LINEN SET 300 TC — unit rate against the benchmark',
        compareCols: 4,
        compare: [
          { k: 'This PO', v: '₹316.00', n: '900 sets · 07 Aug 2026' },
          { k: 'Last PO', v: '₹328.00', n: '#107991 · 09 Jan 2026' },
          { k: '24-mo best', v: '₹319.00', n: '#107640 · 18 Apr 2025' },
          { k: 'Δ vs last', v: '−3.7%', n: 'ARC ceiling ₹340.00 · 7.1% headroom', tone: 'down' }
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
            text: 'GSTIN ' + m('24AABCS7712H1ZP') + ' active, GSTR-1 and GSTR-3B filed through ' + b('Jul 2026') +
                  '. Udyam registration ' + m('UDYAM-GJ-01-0044817') + ' is valid, so the ' + b('45-day MSME payment clock') + ' applies.',
            cites: [{ label: 'ShreeTextiles_Udyam_Certificate.pdf', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: b('On-time delivery 97.8%') + ' across 23 POs in 24 months — the best on the linen panel. Zero open disputes, zero quality rejections in 12 months.',
            cites: [{ label: 'Vendor profile', target: '#vendorCard' }]
          },
          {
            tone: 'good',
            text: 'OEKO-TEX Standard 100 certificate valid to ' + b('31 Mar 2027') +
                  ', covering the full period of supply. No certificate expires inside the delivery window.',
            cites: [{ label: 'ShreeTextiles_OEKOTEX_100.pdf', target: '#docsCard' }]
          }
        ],
        techFindings: [
          {
            tone: 'good',
            text: 'The TDS states ' + b('300 TC, 60/40 cotton-polyester, 220 GSM ±2%') +
                  ' — inside the ±3% that clause TC-01 allows. No tolerance gap between the quoted spec and the RFQ.',
            cites: [
              { label: 'Technical evaluation', target: '#techCard' },
              { label: 'ShreeTextiles_TDS_BedLinen300TC.pdf', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'Independent wash-shrinkage report shows ' + m('2.1%') +
                  ' after 5 industrial cycles against the 3% ceiling in TC-02. Scored 48/50.',
            cites: [{ label: 'Technical evaluation', target: '#techCard' }]
          }
        ],
        processFindings: [
          {
            tone: 'good',
            text: 'Approval chain ' + b('L1→L2 matches policy PROC-04') +
                  ' for the sub-₹5L band. No step is missing and no approver is acting outside a live delegation.',
            cites: [{ label: 'Audit trail', target: '#auditCard' }]
          },
          {
            tone: 'good',
            text: 'Budget line ' + m('HK-LIN-2627') + ' (Lake Paradise) has ' + b('₹17.20L uncommitted') +
                  ' against ₹3,18,528.00 required.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'good',
            text: b('No duplicate.') + ' Nearest same-item order is PO #107991 (09 Jan 2026), 210 days apart. Quantity matches the 180-key wet-room refit at 5 sets per key.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        change: 'Nothing in the file argues against this one. It would only turn if the OEKO-TEX certificate lapsed before dispatch, or if the delivery slipped past 22 Aug and missed the wet-room handover.',
        audit: '5 documents · 23 prior POs · 2 certificates · 2.1s',
        asideLine: 'Clean on price, spec, vendor and chain. Safe to approve now.'
      }
    },

    /* ── #108222 · attention ──────────────────────────────────────── */
    '108222': {
      steps: [
        { label: 'Reading PO #108222 line items', note: '2 lines · 6 units · ₹8,69,660.00', ms: 580 },
        { label: 'Matching against 11 prior kitchen-ventilation orders', note: '18 months · 3 vendors', ms: 740 },
        { label: 'Parsing Meridian_TDS_ExhaustHood.pdf against clauses TC-01 and TC-02', note: 'grade, size, airflow', ms: 720 },
        { label: 'Reading AirflowTestReport_IS655.pdf', note: '4,620 CMH at 250 Pa', ms: 520 },
        { label: 'Searching the QAP pack for a fire-damper test report', note: 'clause TC-05', ms: 660 },
        { label: 'Checking approval chain L1→L2 against policy PROC-04', note: '₹5L–₹10L band', ms: 480 },
        { label: 'Checking budget line ENG-CAP-2627', note: 'uncommitted balance', ms: 420 }
      ],
      result: {
        verdict: 'attention',
        headline: 'Approve once the damper certificate is on file',
        confidence: 88,
        summary: 'price, spec and process all hold up. the one gap is the fire-damper test report that clause TC-05 makes a condition of handover.',
        findingsLabel: 'Commercial — price against history',
        findings: [
          {
            tone: 'warn',
            text: b('₹1,45,000.00/unit is 5.1% above the ₹1,38,000.00 you paid on PO #107930, 12 Dec 2025') +
                  ' — but 4.6% below the current category index of ' + m('₹1,52,000.00') +
                  '. SS 304 sheet moved 6.8% over the same period.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          },
          {
            tone: 'good',
            text: 'L1 on a 3-bidder round, ' + m('₹33,180.00') + ' under SparkLine and ' + m('₹74,640.00') +
                  ' under Gokul. The 35-day lead time is the longest of the three but still lands before the 20 Sep banquet reopening.',
            cites: [{ label: 'Quote comparison', target: '#compareCard' }]
          },
          {
            tone: 'good',
            text: 'The fan line at ' + m('₹78,500.00/unit') + ' is unchanged from PO #107930 and includes the IE3 motor upgrade at no cost.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        compareLabel: 'KITCHEN EXHAUST HOOD — unit rate against the benchmark',
        compareCols: 4,
        compare: [
          { k: 'This PO', v: '₹1,45,000.00', n: '4 units · 13 Aug 2026' },
          { k: 'Last PO', v: '₹1,38,000.00', n: '#107930 · 12 Dec 2025' },
          { k: '12-mo best', v: '₹1,36,500.00', n: '#107848 · 03 Oct 2025' },
          { k: 'Δ vs last', v: '+5.1%', n: 'category index ₹1,52,000.00 · 4.6% under', tone: 'up' }
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
            text: 'GSTIN ' + m('27AACCM6621F1ZW') + ' is active with GSTR-1 and GSTR-3B filed through ' + b('Jul 2026') +
                  '. ISO 9001 valid to 30 Nov 2026, which covers the whole installation window.',
            cites: [{ label: 'Meridian_ISO9001.pdf', target: '#docsCard' }]
          },
          {
            tone: 'warn',
            text: b('On-time delivery 88.6%') + ' across 11 POs. The last kitchen project (PO #107930) was commissioned ' +
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
            text: b('No fire-damper test report in the QAP pack.') + ' Clause TC-05 requires a ' +
                  b('UL 555 or IS 3588') + ' report before handover for any exhaust over a banquet range. The evaluator scored TC-05 at 16/30 for the same reason, and a fire NOC for the banquet block cannot be renewed without it.',
            cites: [
              { label: 'Technical evaluation', target: '#techCard' },
              { label: 'Meridian_QAP_Kitchen_2026.pdf', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'Canopy grade and dimensions match TC-01 exactly — ' + m('SS 304, 1.2 mm, 3000 × 1200 mm') +
                  ' with baffle filters and a grease gutter.',
            cites: [{ label: 'Meridian_TDS_ExhaustHood.pdf', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: 'Airflow tested at ' + m('4,620 CMH') + ' against the 4,500 CMH floor in TC-02, measured per IS 655 by an NABL lab.',
            cites: [{ label: 'AirflowTestReport_IS655.pdf', target: '#docsCard' }]
          }
        ],
        processFindings: [
          {
            tone: 'good',
            text: 'Approval chain ' + b('L1→L2 matches policy PROC-04') + ' for the ₹5L–₹10L band. L1 Vikram Nair signed within the delegation.',
            cites: [{ label: 'Audit trail', target: '#auditCard' }]
          },
          {
            tone: 'good',
            text: 'Budget line ' + m('ENG-CAP-2627') + ' has ' + b('₹26.40L uncommitted') + ' against ₹8,69,660.00 required.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'good',
            text: b('No duplicate.') + ' The Phase 2 hoods for the coffee-shop kitchen sit on a separate RFQ (#536455) that has not been awarded.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        change: 'Upload the UL 555 damper test report for the two banquet risers and this becomes a clean approve. Nothing about the price, the vendor or the chain needs to move.',
        audit: '8 documents · 11 prior POs · 3 certificates · 2.4s',
        asideLine: 'Only the fire-damper test report is missing. Everything else is clean.'
      }
    },

    /* ── #108219 · yes ────────────────────────────────────────────── */
    '108219': {
      steps: [
        { label: 'Reading PO #108219 line items', note: '1 line · 180 pcs · ₹5,96,736.00', ms: 540 },
        { label: 'Matching against 15 prior purchases of MATTRESS 8IN POCKET SPRING', note: '24 months · 3 vendors', ms: 760 },
        { label: 'Reading ARC-2026-0118 mattress rate card', note: 'ceiling ₹3,150.00/pc', ms: 500 },
        { label: 'Parsing AnandLinen_TDS_Mattress8IN.pdf against clause TC-01', note: 'gauge, spring count, foam', ms: 640 },
        { label: 'Verifying AnandLinen_BS7177_TestCert.pdf', note: 'Source 5 fire retardancy', ms: 480 },
        { label: 'Checking approval chain L1→L2 against policy PROC-04', note: '₹5L–₹10L band', ms: 440 },
        { label: 'Scanning 41 open POs for a duplicate', note: '90-day window', ms: 400 }
      ],
      result: {
        verdict: 'yes',
        headline: 'Clear to approve',
        confidence: 92,
        summary: '4.1% under the last purchase, 6.0% under the ARC ceiling, spec matches clause for clause and the fire-retardancy certificate is current.',
        findingsLabel: 'Commercial — price against history',
        findings: [
          {
            tone: 'good',
            text: b('₹2,960.00/pc is 4.1% below the ₹3,085.00 you paid on PO #108058, 28 Feb 2026') +
                  ' and 6.0% below the ARC ceiling of ' + m('₹3,150.00') + '. That is ' + m('₹22,500.00') +
                  ' saved against the last order at this volume.',
            cites: [
              { label: 'Items & pricing', target: '#itemsCard' },
              { label: 'ARC-2026-0118 rate card', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'L1 on a 3-bidder round, ' + m('₹28,896.00') + ' under Gokul and ' + m('₹48,096.00') +
                  ' under NovaTech. The 16-day lead time fits the phased room closure.',
            cites: [{ label: 'Quote comparison', target: '#compareCard' }]
          },
          {
            tone: 'good',
            text: 'Phase 1 of the same refit was bought at ₹3,085.00. Holding Phase 2 for a further round would risk the ' +
                  b('Q4 price revision') + ' the vendor has already flagged, for a saving the history does not support.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          }
        ],
        compareLabel: 'MATTRESS 8IN POCKET SPRING — unit rate against the benchmark',
        compareCols: 4,
        compare: [
          { k: 'This PO', v: '₹2,960.00', n: '180 pcs · 11 Aug 2026' },
          { k: 'Last PO', v: '₹3,085.00', n: '#108058 · 28 Feb 2026' },
          { k: '24-mo best', v: '₹2,960.00', n: 'this order sets it' },
          { k: 'Δ vs last', v: '−4.1%', n: 'ARC ceiling ₹3,150.00 · 6.0% headroom', tone: 'down' }
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
            text: 'GSTIN ' + m('06AAACA3391N1ZR') + ' is active with GSTR-1 and GSTR-3B filed through ' + b('Jul 2026') + '. No filing lapse in 24 months.',
            cites: [{ label: 'AnandLinen_GST_Filing_Jul2026.pdf', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: b('On-time delivery 96.1%') + ' across 15 POs. Phase 1 of this same refit landed 3 days early with zero rejections at GRN.',
            cites: [{ label: 'Vendor profile', target: '#vendorCard' }]
          },
          {
            tone: 'good',
            text: 'BS 7177 Source 5 test certificate valid to ' + b('14 Feb 2027') + ' — past the delivery date and past the warranty start. No open disputes.',
            cites: [{ label: 'AnandLinen_BS7177_TestCert.pdf', target: '#docsCard' }]
          }
        ],
        techFindings: [
          {
            tone: 'good',
            text: 'The TDS states ' + b('486 pocket springs at 13 gauge') + ' against the 480 minimum in TC-01, with high-resilience foam quilting as specified. No tolerance gap.',
            cites: [
              { label: 'Technical evaluation', target: '#techCard' },
              { label: 'AnandLinen_TDS_Mattress8IN.pdf', target: '#docsCard' }
            ]
          },
          {
            tone: 'good',
            text: 'Fire retardancy certified to ' + m('BS 7177 Source 5') + ' by an independent lab, which is what TC-02 asks for. Scored 47/50.',
            cites: [{ label: 'Technical evaluation', target: '#techCard' }]
          }
        ],
        processFindings: [
          {
            tone: 'good',
            text: 'Approval chain ' + b('L1→L2 matches policy PROC-04') + ' for the ₹5L–₹10L band, with no step missing.',
            cites: [{ label: 'Audit trail', target: '#auditCard' }]
          },
          {
            tone: 'good',
            text: 'Budget line ' + m('HK-CAP-2627') + ' (Lake Paradise) has ' + b('₹31.10L uncommitted') + ' against ₹5,96,736.00 required.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'good',
            text: b('No duplicate.') + ' PO #108058 covered Phase 1 (160 keys) and is closed. Quantity here matches the remaining 180 keys exactly.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        change: 'Only an expiry would turn this — the BS 7177 certificate runs to 14 Feb 2027, well past dispatch. Otherwise there is nothing in the file to argue with.',
        audit: '6 documents · 15 prior POs · 2 certificates · 2.3s',
        asideLine: 'Price, spec, vendor and chain all check out. Safe to approve now.'
      }
    },

    /* ── #108221 · hard no ────────────────────────────────────────── */
    '108221': {
      steps: [
        { label: 'Reading PO #108221 line items', note: '2 lines · ₹27,81,968.00', ms: 640 },
        { label: 'Reading ARC-2026-0041 chiller AMC rate card', note: 'negotiated ₹18,82,000.00/yr', ms: 700 },
        { label: 'Matching against 9 prior AMC renewals', note: '2023–2026 · 2 vendors', ms: 720 },
        { label: 'Parsing SparkLine_TDS_ChillerAMC.pdf and QAP against clause TC-03', note: 'mandatory · OEM spares', ms: 820 },
        { label: 'Reading TechEval_536431_Scorecard.pdf', note: '58% against a 70% pass mark', ms: 560 },
        { label: 'Checking approval chain against policy PROC-04', note: 'above ₹25L band', ms: 520 },
        { label: 'Checking budget line ENG-AMC-2627', note: 'uncommitted balance', ms: 460 },
        { label: 'Scanning 41 open POs for a duplicate', note: '90-day window · same scope', ms: 500 }
      ],
      result: {
        verdict: 'no',
        headline: 'Do not approve',
        confidence: 91,
        summary: 'the quoted scope fails a mandatory RFQ clause, the technical score is below the pass mark, and the rate is 19.0% above the ARC ceiling you already hold with this vendor.',
        findingsLabel: 'Commercial — price against history',
        findings: [
          {
            tone: 'bad',
            text: b('₹22,40,000.00 for the AMC line is 19.0% above the ₹18,82,000.00 negotiated rate') +
                  ' in ARC-2026-0041, which runs with this same vendor to 31 Mar 2027. The overspend on the AMC line alone is ' +
                  m('₹3,58,000.00') + ' before GST.',
            cites: [
              { label: 'Items & pricing', target: '#itemsCard' },
              { label: 'ARC-2026-0041 rate card', target: '#docsCard' }
            ]
          },
          {
            tone: 'bad',
            text: b('The award went to the higher of two bids.') + ' Meridian Engineering Services quoted ' +
                  m('₹24,90,640.00') + ' against SparkLine at ' + m('₹27,81,968.00') +
                  ' — 11.7% more — and the finalisation note records no technical reason for passing over L1.',
            cites: [{ label: 'Quote comparison', target: '#compareCard' }]
          },
          {
            tone: 'warn',
            text: 'The R-134a line at ' + m('₹980.00/kg') + ' is 12.6% above the ' + m('₹870.00') +
                  ' you paid on PO #108044, 21 Feb 2026, with no stated basis for the increase.',
            cites: [{ label: 'Items & pricing', target: '#itemsCard' }]
          }
        ],
        compareLabel: 'CHILLER AMC 450 TR — annual rate against the benchmark',
        compareCols: 4,
        compare: [
          { k: 'This PO', v: '₹22,40,000.00', n: '12 months · 12 Aug 2026', tone: 'up' },
          { k: 'Last renewal', v: '₹19,40,000.00', n: '#107712 · 04 Apr 2025' },
          { k: 'ARC rate', v: '₹18,82,000.00', n: 'ARC-2026-0041 · to 31 Mar 2027' },
          { k: 'Δ vs ARC', v: '+19.0%', n: '₹3,58,000.00 over ceiling', tone: 'up' }
        ],
        factors: [
          { name: 'Commercial', score: 22 },
          { name: 'Vendor reliability', score: 47 },
          { name: 'Technical compliance', score: 14 },
          { name: 'Process & budget', score: 31 }
        ],
        vendorFindings: [
          {
            tone: 'warn',
            text: b('On-time delivery 81.3%') + ' across 9 POs — the weakest on the engineering panel. Two preventive visits in the FY 2025-26 contract were logged more than 20 days late.',
            cites: [{ label: 'Vendor profile', target: '#vendorCard' }]
          },
          {
            tone: 'bad',
            text: b('Two open disputes totalling ₹3,42,000.00') +
                  ' — a Feb 2026 breakdown-response penalty and a Jun 2026 spares billing challenge, both unresolved. Awarding a fresh 12-month contract while these are live weakens your position on both.',
            cites: [{ label: 'Vendor profile', target: '#vendorCard' }]
          },
          {
            tone: 'warn',
            text: 'ISO 45001 certificate ' + b('expires 09 Sep 2026') +
                  ' — 8 days after the contract start date of 01 Sep 2026. Site access for the first preventive visit would lapse mid-contract.',
            cites: [{ label: 'SparkLine_ISO45001.pdf', target: '#docsCard' }]
          },
          {
            tone: 'good',
            text: 'GSTIN ' + m('27AAGCS9013M1Z4') + ' is active and GSTR-3B is filed through Jul 2026. Nothing here blocks input credit.',
            cites: [{ label: 'Vendor profile', target: '#vendorCard' }]
          }
        ],
        techFindings: [
          {
            tone: 'bad',
            text: b('Mandatory clause TC-03 fails.') + ' The RFQ requires OEM (Carrier) spares for the installed 19XR unit; the TDS and QAP both say spares are sourced ' +
                  b('"from OEM or equivalent-grade third-party suppliers"') +
                  '. TC-03 is a knockout clause — 8/40 on it cannot be cured by scoring elsewhere.',
            cites: [
              { label: 'Technical evaluation', target: '#techCard' },
              { label: 'SparkLine_TDS_ChillerAMC.pdf', target: '#docsCard' }
            ]
          },
          {
            tone: 'bad',
            text: 'Overall technical score is ' + b('58% against a 70% pass mark') +
                  ' — marked Failed by Vikram Nair on 10 Aug 2026. The PO was raised two days later against a bid that did not qualify.',
            cites: [
              { label: 'Technical evaluation', target: '#techCard' },
              { label: 'TechEval_536431_Scorecard.pdf', target: '#docsCard' }
            ]
          },
          {
            tone: 'warn',
            text: 'Breakdown response is quoted as ' + m('"within 8 working hours"') + ' against the ' + m('4-hour') +
                  ' window in TC-04. For a single 450 TR chiller with no standby, that is the difference between a warm afternoon and a closed banquet floor.',
            cites: [{ label: 'Technical evaluation', target: '#techCard' }]
          }
        ],
        processFindings: [
          {
            tone: 'bad',
            text: b('The approval chain is one level short.') + ' Policy PROC-04 requires ' + b('L1→L4') +
                  ' above ₹25L; this instance was built as L1→L3 against the ₹10L–₹25L band. Approving at L3 would conclude the PO without the authority the policy demands.',
            cites: [{ label: 'Audit trail', target: '#auditCard' }]
          },
          {
            tone: 'bad',
            text: 'Budget line ' + m('ENG-AMC-2627') + ' has ' + b('₹19.60L uncommitted') +
                  ' against ₹27,81,968.00 required — a shortfall of ' + m('₹8,21,968.00') +
                  '. No re-appropriation request is on file.',
            cites: [{ label: 'RFQ context', target: '#rfqCard' }]
          },
          {
            tone: 'warn',
            text: b('Possible duplicate.') + ' PO #108177 (28 Jul 2026) to Meridian Engineering Services covers the same 450 TR AMC scope for the same asset and is still open at L2. If both conclude you pay twice for one contract year.',
            cites: [{ label: 'Audit trail', target: '#auditCard' }]
          }
        ],
        change: 'Re-award at the ARC-2026-0041 rate of ₹18,82,000.00 with OEM spares confirmed in writing and a 4-hour response window, or run a fresh single-vendor negotiation against Meridian’s ₹24,90,640.00. Either route still needs the L4 step added and PO #108177 withdrawn first.',
        audit: '11 documents · 9 prior POs · 4 certificates · 3.6s',
        asideLine: 'Mandatory clause TC-03 failed and the chain is short an L4. Send it back.'
      }
    }
  };

  /* ═══════════════════════════════════════════════════════════════
     Dashboard triage plan
     ═══════════════════════════════════════════════════════════════ */
  var QUEUE = {
    steps: [
      { label: 'Loading your approval queue', note: '5 POs · ₹58,03,372.00 held', ms: 560 },
      { label: 'Reading 8 line items and vendor terms', note: '5 vendors · 3 business units', ms: 700 },
      { label: 'Matching rates against ARC ceilings and 12-month history', note: '312 prior order lines', ms: 860 },
      { label: 'Checking GSTIN, MSME, ISO and on-time delivery for each vendor', note: '37 documents', ms: 780 },
      { label: 'Verifying every approval chain against policy PROC-04', note: '5 instances', ms: 620 },
      { label: 'Scanning for duplicate and split orders', note: '90-day window', ms: 520 }
    ],
    triage: [
      { po: '108219', verdict: 'yes',       vendor: 'Anand Linen Mills',              line: '4.1% below the last purchase, chain and budget clean', amount: 596736 },
      { po: '108209', verdict: 'yes',       vendor: 'Shree Textiles Pvt Ltd',         line: 'best rate in 24 months, spec matches TC-01 exactly', amount: 318528 },
      { po: '108215', verdict: 'attention', vendor: 'NovaTech Hospitality Solutions', line: 'ISO 9001 expired 47 days ago; GSM tolerance wider than TC-02', amount: 1236480 },
      { po: '108222', verdict: 'attention', vendor: 'Meridian Engineering Services',  line: 'fire-damper test certificate missing from the QAP pack', amount: 869660 },
      { po: '108221', verdict: 'no',        vendor: 'SparkLine Maintenance Corp',     line: '19.0% above the ARC rate, mandatory clause TC-03 failed', amount: 2781968 }
    ],
    result: {
      verdict: 'attention',
      headline: '2 clear to approve · 2 need attention · 1 hard no',
      confidence: 89,
      summary: '₹9,15,264.00 is ready to release now. two POs are held on a single missing document each, and one should not be approved at all.',
      findingsLabel: 'What the model found across the queue',
      findings: [
        {
          tone: 'good',
          text: b('2 POs clear on every check') + ' — #108219 and #108209, ' + m('₹9,15,264.00') +
                ' combined. Both sit below their ARC ceiling, every certificate is current, and each approval chain matches policy PROC-04.',
          cites: [{ label: 'PO table', target: '#poTableCard' }]
        },
        {
          tone: 'warn',
          text: b('2 POs need one document each') + ' — #108215 (ISO 9001 lapsed 28 Jun 2026) and #108222 (fire-damper test report missing), holding ' +
                m('₹21,06,140.00') + '. Neither has a pricing problem.',
          cites: [{ label: 'Awaiting your approval', target: '#awaiting' }]
        },
        {
          tone: 'bad',
          text: b('1 hard no') + ' — #108221, ' + m('₹27,81,968.00') +
                ', is 19.0% above the ARC rate you already hold with the same vendor, fails mandatory clause TC-03, and is one approval level short of what PROC-04 requires above ₹25L.',
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
        { k: 'Ready to release', v: '₹9.15L', n: '2 POs · no conditions', tone: 'down' },
        { k: 'Held on a document', v: '₹21.06L', n: '2 POs · 1 item each' },
        { k: 'Should not proceed', v: '₹27.82L', n: '1 PO · #108221', tone: 'up' },
        { k: 'Review time saved', v: '2h 55m', n: 'vs. reading 37 documents by hand' }
      ],
      audit: '5 purchase orders · 37 documents · 312 prior order lines · 4.8s'
    }
  };

  global.WWData = {
    inr: inr, qty: qty, nf0: nf0, nf2: nf2,
    PEOPLE: PEOPLE, VENDORS: VENDORS,
    KPI: KPI, TABS: TABS, ROWS: ROWS, AWAITING: AWAITING,
    DETAIL: DETAIL, VERDICTS: VERDICTS, QUEUE: QUEUE,
    DEFAULT_PO: '108215'
  };
})(window);
