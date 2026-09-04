/* ═══════════════════════════════════════════════════════════════════
   Workwise · ARC technical evaluation — demo fixture
   Tenant: Workwise Hotels · BU: Workwise Grand, Mumbai
   Contract: #ARC-2026-27-0014 "Housekeeping Linen & Amenities — FY 2026-27"

   BLIND EVAL: the matrix is keyed on vendor_alias_key (a small per-ARC
   index), never a real vendor id or name — exactly as the live product
   does it. No real vendor identity exists in this file.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  /* ── items (the tab strip) ────────────────────────────────────────── */
  var ITEMS = [
    { id: 'bath-towel-500', name: 'BATH TOWEL 500 GSM',  slug: 'bath-towel-500-gsm',  state: 'pending' },
    { id: 'hand-towel-400', name: 'HAND TOWEL 400 GSM',  slug: 'hand-towel-400-gsm',  state: 'pending' },
    { id: 'bath-mat',       name: 'BATH MAT',            slug: 'bath-mat-cotton',     state: 'pending' },
    { id: 'pool-towel',     name: 'POOL TOWEL',          slug: 'pool-towel-450-gsm',  state: 'pending' }
  ];

  /* ── clauses for BATH TOWEL 500 GSM · weights sum to 100 ──────────── */
  var CLAUSES = [
    {
      id: 'c1',
      text: 'Fabric weight verified at 500 GSM ±3% (485–515 GSM) on a third-party lab report issued within 12 months of bid close, per IS 1964 / ASTM D3776.',
      weight: 25,
      type: 'spec',
      is_mandatory: true
    },
    {
      id: 'c2',
      text: '100% combed ring-spun cotton, 16s/2 ground yarn — no polyester, viscose or regenerated-cellulose blend. Mill fibre-composition report required.',
      weight: 20,
      type: 'material',
      is_mandatory: false
    },
    {
      id: 'c3',
      text: 'Colour fastness to domestic and commercial laundering ≥ grade 4 on ISO 105-C06 (C2S) after 20 industrial wash cycles at 60 °C.',
      weight: 20,
      type: 'test',
      is_mandatory: false
    },
    {
      id: 'c4',
      text: 'Dimensional change (shrinkage) ≤ 5% in warp and weft after 5 wash-and-dry cycles, tested to IS 3361.',
      weight: 20,
      type: 'test',
      is_mandatory: true
    },
    {
      id: 'c5',
      text: 'OEKO-TEX Standard 100 (Product Class II) certification, scope covering terry towelling, valid through the full contract term to 31 Mar 2027.',
      weight: 15,
      type: 'certification',
      is_mandatory: false
    }
  ];

  var MIN_PASS = 65;

  /* ── vendors · blind aliases only ─────────────────────────────────── */
  var VENDORS = [
    { vendor_alias_key: 1, vendor_alias: 'Vendor A' },
    { vendor_alias_key: 2, vendor_alias: 'Vendor B' },
    { vendor_alias_key: 3, vendor_alias: 'Vendor C' },
    { vendor_alias_key: 4, vendor_alias: 'Vendor D' },
    { vendor_alias_key: 5, vendor_alias: 'Vendor E' }
  ];

  /* ── vendor responses + evidence ──────────────────────────────────── */
  /* files: [{ file_id, name, pages }] — rendered as "Evidence #5511" chips */
  var RESPONSES = [
    /* ── Vendor A ─────────────────────────────────────────────────── */
    { vendor_alias_key: 1, clause_id: 'c1',
      text: 'Offered construction is 500 GSM terry. Third-party report from SITRA Coimbatore dated 12 Mar 2026 records 501.4 GSM mean of 5 coupons (CV 0.9%). Report attached.',
      files: [{ file_id: 5511, name: 'VendorA_LabReport_GSM.pdf', pages: 3 }] },
    { vendor_alias_key: 1, clause_id: 'c2',
      text: '100% combed ring-spun cotton, 16s/2 ground and 20s/1 pile. Fibre composition report confirms 100.0% cotton, nil regenerated cellulose.',
      files: [{ file_id: 5512, name: 'VendorA_FibreComposition_SITRA.pdf', pages: 2 }] },
    { vendor_alias_key: 1, clause_id: 'c3',
      text: 'ISO 105-C06 C2S after 20 cycles: change in shade grade 4–5, staining on cotton grade 4–5, staining on polyester grade 5. Certificate attached.',
      files: [{ file_id: 5513, name: 'VendorA_ColourFastness_ISO105C06.pdf', pages: 2 }] },
    { vendor_alias_key: 1, clause_id: 'c4',
      text: 'IS 3361, 5 wash-and-dry cycles at 60 °C: warp 3.8%, weft 2.9%. Both within the 5% ceiling.',
      files: [{ file_id: 5514, name: 'VendorA_Shrinkage_IS3361.pdf', pages: 2 }] },
    { vendor_alias_key: 1, clause_id: 'c5',
      text: 'OEKO-TEX Standard 100 certificate 23.HIN.77401, Product Class II, scope "terry towelling, woven, bleached and dyed", valid to 12 Aug 2027.',
      files: [{ file_id: 5515, name: 'VendorA_OEKOTEX_23HIN77401.pdf', pages: 4 }] },

    /* ── Vendor B ─────────────────────────────────────────────────── */
    { vendor_alias_key: 2, clause_id: 'c1',
      text: 'We confirm 500 GSM. Consolidated four-page lab report attached (GSM, absorbency, shrinkage). Measured GSM 498.2, within the stated tolerance band.',
      files: [{ file_id: 5521, name: 'VendorB_LabReport_GSM.pdf', pages: 4 }] },
    { vendor_alias_key: 2, clause_id: 'c2',
      text: '100% combed cotton as per our mill certificate. Ring-spun ground yarn 16s/2. No blended stock used on this order.',
      files: [{ file_id: 5522, name: 'VendorB_MillCertificate.pdf', pages: 1 }] },
    { vendor_alias_key: 2, clause_id: 'c3',
      text: 'Colour fastness tested to ISO 105-C06. Change in shade grade 4, staining grade 4. Meets the ≥ 4 requirement.',
      files: [{ file_id: 5523, name: 'LabReport_ColourFastness.pdf', pages: 2 }] },
    { vendor_alias_key: 2, clause_id: 'c4',
      text: 'Shrinkage is fully compliant and within the permitted limit. Refer to the consolidated lab report submitted against the weight clause.',
      files: [{ file_id: 5521, name: 'VendorB_LabReport_GSM.pdf', pages: 4 }] },
    { vendor_alias_key: 2, clause_id: 'c5',
      text: 'OEKO-TEX Standard 100 certificate 21.HIN.65432 held at group level, valid to 30 Jun 2027. Certificate attached.',
      files: [{ file_id: 5524, name: 'VendorB_OEKOTEX_21HIN65432.pdf', pages: 3 }] },

    /* ── Vendor C ─────────────────────────────────────────────────── */
    { vendor_alias_key: 3, clause_id: 'c1',
      text: 'Product is manufactured at 500 GSM. Test certificate attached showing 503 GSM against IS 1964.',
      files: [{ file_id: 5531, name: 'VendorC_GSM_TestCertificate.pdf', pages: 2 }] },
    { vendor_alias_key: 3, clause_id: 'c2',
      text: '100% combed ring-spun cotton. SITRA fibre analysis attached — 100% cotton, no blend detected at 0.5% resolution.',
      files: [{ file_id: 5532, name: 'VendorC_FibreComposition.pdf', pages: 2 }] },
    { vendor_alias_key: 3, clause_id: 'c3',
      text: 'We self-certify colour fastness of grade 4 to ISO 105-C06. A third-party wash-test report can be furnished within 10 days of award if required.',
      files: [] },
    { vendor_alias_key: 3, clause_id: 'c4',
      text: 'IS 3361 dimensional change after 5 cycles: warp 3.9%, weft 3.1%. Report attached, issued 04 Apr 2026.',
      files: [{ file_id: 5533, name: 'VendorC_Shrinkage_IS3361.pdf', pages: 2 }] },
    { vendor_alias_key: 3, clause_id: 'c5',
      text: 'OEKO-TEX Standard 100 certificate 23.HIN.81190, Product Class II, scope "terry and pile fabrics", valid to 30 Sep 2027.',
      files: [{ file_id: 5534, name: 'VendorC_OEKOTEX_23HIN81190.pdf', pages: 3 }] },

    /* ── Vendor D ─────────────────────────────────────────────────── */
    { vendor_alias_key: 4, clause_id: 'c1',
      text: 'Confirmed 500 GSM ±3%. In-house and third-party testing both record 496 GSM. Report attached.',
      files: [{ file_id: 5541, name: 'VendorD_GSM_Report.pdf', pages: 2 }] },
    { vendor_alias_key: 4, clause_id: 'c2',
      text: 'We confirm the towel is 100% combed ring-spun cotton with no blends whatsoever. Mill datasheet attached for reference.',
      files: [{ file_id: 5542, name: 'VendorD_MillDatasheet_Terry.pdf', pages: 6 }] },
    { vendor_alias_key: 4, clause_id: 'c3',
      text: 'Colour fastness grade 4 to ISO 105-C06 after 20 cycles as per our internal laboratory. Third-party report not attached at this stage.',
      files: [] },
    { vendor_alias_key: 4, clause_id: 'c4',
      text: 'IS 3361: warp 4.1%, weft 3.4% after 5 cycles. Within the ≤ 5% ceiling. Report attached.',
      files: [{ file_id: 5543, name: 'VendorD_Shrinkage_IS3361.pdf', pages: 2 }] },
    { vendor_alias_key: 4, clause_id: 'c5',
      text: 'OEKO-TEX Standard 100 certificate 22.HIN.70118, Product Class II, terry towelling in scope, valid to 28 Feb 2027.',
      files: [{ file_id: 5544, name: 'VendorD_OEKOTEX_22HIN70118.pdf', pages: 3 }] },

    /* ── Vendor E ─────────────────────────────────────────────────── */
    { vendor_alias_key: 5, clause_id: 'c1',
      text: 'GSM 496 as per attached report, within the tolerance band. Manufactured on Toyota air-jet looms.',
      files: [{ file_id: 5551, name: 'VendorE_GSM_Report.pdf', pages: 2 }] },
    { vendor_alias_key: 5, clause_id: 'c2',
      text: '100% cotton. Fibre composition report is being retrieved from the mill and will be uploaded on request.',
      files: [] },
    { vendor_alias_key: 5, clause_id: 'c3',
      text: 'Colour fastness meets the requirement. Wash-test report attached.',
      files: [{ file_id: 5552, name: 'LabReport_ColourFastness.pdf', pages: 2 }] },
    { vendor_alias_key: 5, clause_id: 'c4',
      text: 'Dimensional change 4.9% warp after 5 cycles, marginally inside the ceiling. Independent report not attached — our QA sheet can be shared.',
      files: [] },
    { vendor_alias_key: 5, clause_id: 'c5',
      text: 'OEKO-TEX Standard 100 certificate 20.HIN.59004 on file, expiring 31 Dec 2026. Renewal application submitted to the institute.',
      files: [] }
  ];

  /* ── AI per-cell suggestions ──────────────────────────────────────── */
  /* key: `${vendor_alias_key}|${clause_id}`
     mark    — proposed marks, always ≤ clause weight
     verdict — mandatory clauses only: true (Pass) | false (Fail)
     tone    — v-yes | v-attention | v-no  (drives the badge colour)
     why     — one line of rationale shown next to the badge            */
  var SUGGESTIONS = {
    /* Vendor A */
    '1|c1': { mark: 24, verdict: true,  tone: 'v-yes',       why: '501.4 GSM, mid-band; report 12 Mar 2026, in window' },
    '1|c2': { mark: 18, tone: 'v-yes',       why: '100.0% cotton confirmed by SITRA fibre analysis' },
    '1|c3': { mark: 19, tone: 'v-yes',       why: 'Grade 4–5 shade and staining, exceeds the ≥ 4 floor' },
    '1|c4': { mark: 19, verdict: true,  tone: 'v-yes',       why: 'Warp 3.8% / weft 2.9%, comfortably under 5%' },
    '1|c5': { mark: 15, tone: 'v-yes',       why: 'Cert 23.HIN.77401 in scope, valid past contract end' },

    /* Vendor B */
    '2|c1': { mark: 23, verdict: true,  tone: 'v-yes',       why: '498.2 GSM, inside the 485–515 band' },
    '2|c2': { mark: 17, tone: 'v-attention', why: 'Mill certificate only — no independent fibre analysis' },
    '2|c3': { mark: 16, tone: 'v-attention', why: 'Grade 4 exactly; report is a duplicate of another bid' },
    '2|c4': { mark: 4,  verdict: false, tone: 'v-no',        why: 'Own report p.3: warp 6.8% — breaches the 5% gate' },
    '2|c5': { mark: 6,  tone: 'v-no',        why: 'Cert 21.HIN.65432 scope is woven bed linen, not terry' },

    /* Vendor C */
    '3|c1': { mark: 15, verdict: true,  tone: 'v-attention', why: '503 GSM passes, but report is 19 months old' },
    '3|c2': { mark: 18, tone: 'v-yes',       why: '100% cotton, nil blend at 0.5% resolution' },
    '3|c3': { mark: 12, tone: 'v-attention', why: 'Self-certified only — no ISO 105-C06 report attached' },
    '3|c4': { mark: 17, verdict: true,  tone: 'v-yes',       why: 'Warp 3.9% / weft 3.1%, report dated 04 Apr 2026' },
    '3|c5': { mark: 15, tone: 'v-yes',       why: 'Cert 23.HIN.81190 in scope, valid to 30 Sep 2027' },

    /* Vendor D */
    '4|c1': { mark: 22, verdict: true,  tone: 'v-yes',       why: '496 GSM, inside band; report traceable to NABL lab' },
    '4|c2': { mark: 6,  tone: 'v-no',        why: 'Datasheet p.2 reads 80% cotton / 20% viscose' },
    '4|c3': { mark: 15, tone: 'v-attention', why: 'Internal lab only — no third-party report on file' },
    '4|c4': { mark: 18, verdict: true,  tone: 'v-yes',       why: 'Warp 4.1% / weft 3.4%, inside the gate' },
    '4|c5': { mark: 13, tone: 'v-attention', why: 'Cert valid to 28 Feb 2027 — 31 days short of term end' },

    /* Vendor E */
    '5|c1': { mark: 20, verdict: true,  tone: 'v-yes',       why: '496 GSM inside band; single-coupon test only' },
    '5|c2': { mark: 12, tone: 'v-attention', why: 'Declared 100% cotton, no fibre report submitted' },
    '5|c3': { mark: 9,  tone: 'v-no',        why: 'Report records grade 3–4, below the ≥ 4 floor' },
    '5|c4': { mark: 14, verdict: true,  tone: 'v-attention', why: 'Declared 4.9% — inside, but self-reported' },
    '5|c5': { mark: 4,  tone: 'v-no',        why: 'Cert 20.HIN.59004 expires 31 Dec 2026, mid-term' }
  };

  /* ── AI panel: thinking steps ─────────────────────────────────────── */
  var STEPS = [
    { label: 'Loading clause set for <b>BATH TOWEL 500 GSM</b>', note: '5 clauses · 2 mandatory gates · min 65%', ms: 460 },
    { label: 'Parsing <span class="mono">VendorB_LabReport_GSM.pdf</span> (4 pages)', note: 'GSM · absorbency · dimensional change', ms: 620 },
    { label: 'Parsing <span class="mono">VendorC_GSM_TestCertificate.pdf</span> (2 pages)', note: 'issue date 14 Nov 2024', ms: 520 },
    { label: 'Reading <span class="mono">VendorD_MillDatasheet_Terry.pdf</span> fibre composition table', note: 'page 2 of 6', ms: 560 },
    { label: 'Cross-checking OEKO-TEX cert <span class="mono">21.HIN.65432</span> against issuer registry', note: 'scope annexure', ms: 640 },
    { label: 'Comparing response text to clause 3 acceptance criteria', note: 'ISO 105-C06 · grade ≥ 4 after 20 cycles', ms: 500 },
    { label: 'Hashing 19 evidence files for duplicate submissions', note: '1 collision', ms: 470 },
    { label: 'Scoring 25 cells against clause weights', note: 'Σ weights = 100', ms: 540 }
  ];

  /* ── AI panel: findings ───────────────────────────────────────────── */
  var FINDINGS = [
    {
      tone: 'bad',
      text: '<strong>Vendor B fails a mandatory gate on its own evidence.</strong> The response against the shrinkage clause says "fully compliant", but page 3 of the vendor\'s own <span class="mono">VendorB_LabReport_GSM.pdf</span> records dimensional change of <span class="mono">6.8%</span> in warp after 5 cycles — against a ceiling of <span class="mono">5.0%</span>. That is a knockout, not a deduction: Vendor B cannot qualify on this item whatever the weighted score.',
      cites: [{ label: 'Clause 4 · shrinkage gate', target: '#clause-c4' }, { label: 'Vendor B · clause 4 cell', target: '#cell-2-c4' }]
    },
    {
      tone: 'bad',
      text: '<strong>Certificate scope covers a different product line.</strong> Vendor B\'s OEKO-TEX Standard 100 certificate <span class="mono">21.HIN.65432</span> is live and in date, but its scope annexure lists <em>woven bed linen, percale 200 TC</em>. Terry towelling is not certified under it, so the certificate does not satisfy clause 5 as written.',
      cites: [{ label: 'Vendor B · clause 5 cell', target: '#cell-2-c5' }]
    },
    {
      tone: 'bad',
      text: '<strong>The response contradicts the datasheet it attaches.</strong> Vendor D states "100% combed ring-spun cotton with no blends whatsoever". The fibre-composition table on page 2 of <span class="mono">VendorD_MillDatasheet_Terry.pdf</span> reads <span class="mono">80% cotton / 20% viscose</span>. Marks proposed on the datasheet figure, not the claim.',
      cites: [{ label: 'Clause 2 · fibre composition', target: '#clause-c2' }, { label: 'Vendor D · clause 2 cell', target: '#cell-4-c2' }]
    },
    {
      tone: 'warn',
      text: '<strong>Lab report dated outside the validity window.</strong> Vendor C\'s <span class="mono">VendorC_GSM_TestCertificate.pdf</span> was issued <span class="mono">14 Nov 2024</span>. Clause 1 requires a report issued within 12 months of bid close (<span class="mono">28 Jun 2026</span>), so it is stale by roughly <span class="mono">7 months</span>. The measured value of <span class="mono">503 GSM</span> is inside the band, so the gate is proposed as a pass — but a current report should be called for before award.',
      cites: [{ label: 'Vendor C · clause 1 cell', target: '#cell-3-c1' }]
    },
    {
      tone: 'warn',
      text: '<strong>Two vendors submitted the same document.</strong> Vendor E\'s <span class="mono">LabReport_ColourFastness.pdf</span> is byte-identical to Vendor B\'s submission against the same clause — same lab job number <span class="mono">BLR/TX/26-1183</span>, same issue date, same signatory. Under blind evaluation this may be a shared testing house, a copied submission, or two aliases of one supply chain. It needs a human decision, and the report itself records grade <span class="mono">3–4</span>, below the ≥ 4 floor.',
      cites: [{ label: 'Vendor B · clause 3 cell', target: '#cell-2-c3' }, { label: 'Vendor E · clause 3 cell', target: '#cell-5-c3' }]
    },
    {
      tone: 'warn',
      text: '<strong>Two certificates lapse inside the contract term.</strong> Vendor E\'s <span class="mono">20.HIN.59004</span> expires <span class="mono">31 Dec 2026</span> and Vendor D\'s <span class="mono">22.HIN.70118</span> on <span class="mono">28 Feb 2027</span> — both before the term ends on <span class="mono">31 Mar 2027</span>. Clause 5 asks for cover through the full term.',
      cites: [{ label: 'Clause 5 · certification', target: '#clause-c5' }]
    },
    {
      tone: 'good',
      text: '<strong>Vendor A is clean across all five clauses.</strong> Every claim is backed by a third-party report inside the validity window, the fibre analysis resolves to 100.0% cotton, and the OEKO-TEX scope explicitly names terry towelling. Nothing here needs a second look.',
      cites: [{ label: 'Vendor A · clause 1 cell', target: '#cell-1-c1' }]
    }
  ];

  var FACTORS = [
    { name: 'Evidence completeness',  score: 74 },
    { name: 'Spec conformance',       score: 61 },
    { name: 'Certification validity', score: 52 },
    { name: 'Response specificity',   score: 70 }
  ];

  /* ── AI panel: per-vendor recommendation rows ─────────────────────── */
  /* score/gate are DERIVED in app.js from SUGGESTIONS — never hardcoded. */
  var VENDOR_NOTES = {
    1: { confidence: 94, badge: 'v-yes',       badgeText: 'Pass',      note: 'Fully evidenced' },
    2: { confidence: 91, badge: 'v-no',        badgeText: 'Fail gate', note: 'Shrinkage 6.8% > 5.0%' },
    3: { confidence: 68, badge: 'v-attention', badgeText: 'Verify',    note: 'Stale GSM report' },
    4: { confidence: 74, badge: 'v-attention', badgeText: 'Verify',    note: 'Datasheet contradicts claim' },
    5: { confidence: 62, badge: 'v-attention', badgeText: 'Verify',    note: 'Duplicate evidence · cert lapses' }
  };

  var VERDICT = {
    verdict: 'attention',
    headline: '1 knockout, 4 things a human must check',
    confidence: 86,
    summary: 'Three of five vendors are clean enough to carry into Commercial. One fails a mandatory gate on evidence it submitted itself, and four separate document defects would not survive an audit if they were scored as claimed.',
    audit: '19 documents · 5 vendors × 5 clauses · 3.4s',
    disclaimerText: 'Every mark below is a proposal. Nothing is written to the evaluation until you accept it, each cell stays editable, and the marks that reach the approver are the ones you signed off on.'
  };

  global.ARC_DATA = {
    contract: {
      number: '#ARC-2026-27-0014',
      title: 'Housekeeping Linen & Amenities — FY 2026-27',
      status: 'tech_eval',
      statusLabel: 'Technical evaluation',
      category: 'HOUSEKEEPING SUPPLY',
      businessUnit: 'Workwise Grand, Mumbai',
      department: 'Housekeeping',
      evaluator: 'Kushal Shah',
      bidClose: '28 Jun 2026',
      termEnd: '31 Mar 2027'
    },
    items: ITEMS,
    activeItemId: 'bath-towel-500',
    clauses: CLAUSES,
    minPass: MIN_PASS,
    vendors: VENDORS,
    responses: RESPONSES,
    shortlist: { in_evaluation: 5, total_participating: 8, on_hold: 3 },
    documentsRead: 19,
    ai: {
      steps: STEPS,
      findings: FINDINGS,
      factors: FACTORS,
      vendorNotes: VENDOR_NOTES,
      verdict: VERDICT,
      suggestions: SUGGESTIONS
    }
  };
})(window);
