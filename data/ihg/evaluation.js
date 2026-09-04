/**
 * Technical evaluation of ARC-2627-0014.
 *
 * Five clauses, five vendors under evaluation, nineteen evidence documents.
 * Three suppliers are on hold — they qualify but sit behind the five lowest
 * commercial bidders, and only come forward if one of those five fails.
 *
 * The narrative payoff: Aarvi was flagged by Vendor Match at RFQ stage for a
 * lapsed OEKO-TEX certificate. Here that flag becomes a score — they fail the
 * 70-mark threshold on sustainability. The assistant was right, and the buyer
 * can see the same evidence it used.
 */

export const MIN_SCORE = 70;

export const clauses = [
  {
    id: "c1",
    num: "4.1",
    title: "GSM and construction conformity",
    text: "Terry and woven goods to meet the stated GSM within ±3%, ring-spun cotton, no open-end or blended substitution. Independent lab report required per SKU.",
    maxMark: 25,
    evidenceType: "Lab test report",
  },
  {
    id: "c2",
    num: "4.2",
    title: "Colour fastness and dimensional stability",
    text: "Minimum grade 4 colour fastness to washing and rubbing. Shrinkage not to exceed 5% after 50 industrial wash cycles at 70°C.",
    maxMark: 20,
    evidenceType: "Wash-trial certificate",
  },
  {
    id: "c3",
    num: "4.3",
    title: "Capacity and lead time across all properties",
    text: "Demonstrated capacity to serve all five properties on a 30-day replenishment cycle, including Sawai Madhopur and Ramnagar.",
    maxMark: 20,
    evidenceType: "Capacity declaration",
  },
  {
    id: "c4",
    num: "4.4",
    title: "Chemical and sustainability compliance",
    text: "Valid OEKO-TEX Standard 100 for all textile SKUs. No azo dyes, no APEO. Social compliance audit within the last 24 months.",
    maxMark: 20,
    evidenceType: "Certificate",
  },
  {
    id: "c5",
    num: "4.5",
    title: "After-sales and reject handling",
    text: "Replacement of rejected goods within 14 days at supplier cost. Named account manager. Quarterly quality review.",
    maxMark: 15,
    evidenceType: "SLA commitment",
  },
];

/** Vendors in the technical round, ordered lowest commercial bid first. */
export const underEvaluation = ["sriram", "nandan", "trident", "welspun", "aarvi"];

/** Qualified but held behind the five above. */
export const onHold = ["greenleaf", "kaveri", "orientcraft"];

export const evidenceDocs = [
  { id: "d01", vendorId: "sriram", name: "SITRA lab report — terry SKUs", pages: 14, type: "Lab test report" },
  { id: "d02", vendorId: "sriram", name: "Wash trial, 50 cycles — Bureau Veritas", pages: 8, type: "Wash-trial certificate" },
  { id: "d03", vendorId: "sriram", name: "Capacity declaration FY26-27", pages: 3, type: "Capacity declaration" },
  { id: "d04", vendorId: "sriram", name: "OEKO-TEX Standard 100 certificate", pages: 2, type: "Certificate" },
  { id: "d05", vendorId: "sriram", name: "Service level commitment", pages: 4, type: "SLA commitment" },

  { id: "d06", vendorId: "nandan", name: "NITRA lab report — terry", pages: 11, type: "Lab test report" },
  { id: "d07", vendorId: "nandan", name: "Wash trial, 50 cycles", pages: 6, type: "Wash-trial certificate" },
  { id: "d08", vendorId: "nandan", name: "Plant capacity statement", pages: 5, type: "Capacity declaration" },
  { id: "d09", vendorId: "nandan", name: "OEKO-TEX + BSCI audit summary", pages: 9, type: "Certificate" },

  { id: "d10", vendorId: "trident", name: "In-house QC report — bed linen", pages: 7, type: "Lab test report" },
  { id: "d11", vendorId: "trident", name: "Wash trial, 30 cycles", pages: 4, type: "Wash-trial certificate" },
  { id: "d12", vendorId: "trident", name: "Logistics coverage note", pages: 2, type: "Capacity declaration" },
  { id: "d13", vendorId: "trident", name: "OEKO-TEX certificate", pages: 2, type: "Certificate" },

  { id: "d14", vendorId: "welspun", name: "SGS lab report — full range", pages: 22, type: "Lab test report" },
  { id: "d15", vendorId: "welspun", name: "Wash trial, 60 cycles — SGS", pages: 12, type: "Wash-trial certificate" },
  { id: "d16", vendorId: "welspun", name: "Group capacity and allocation plan", pages: 6, type: "Capacity declaration" },
  { id: "d17", vendorId: "welspun", name: "OEKO-TEX + GOTS certificates", pages: 5, type: "Certificate" },

  { id: "d18", vendorId: "aarvi", name: "Supplier self-declaration — GSM", pages: 3, type: "Lab test report" },
  { id: "d19", vendorId: "aarvi", name: "OEKO-TEX certificate (2023-26)", pages: 2, type: "Certificate" },
];

export const docsById = Object.fromEntries(evidenceDocs.map((d) => [d.id, d]));

/**
 * What the assistant proposes, clause by clause.
 *
 * `needsCheck` is the important field. It is set wherever the model is reading
 * something it cannot fully verify from the document — a self-declaration
 * instead of a lab report, a wash trial short of the required cycles, a
 * certificate whose dates need a human to confirm. Those are exactly the marks
 * a buyer must own personally.
 */
export const proposed = {
  // ── Sriram — the incumbent, and it shows ──
  "sriram:c1": { mark: 23, confidence: 94, docId: "d01", page: 4, rationale: "SITRA report confirms 502 GSM against a 500 GSM spec, ring-spun, all eight SKUs tested." },
  "sriram:c2": { mark: 18, confidence: 91, docId: "d02", page: 3, rationale: "Grade 4-5 fastness; shrinkage 4.1% at 50 cycles, inside the 5% limit." },
  "sriram:c3": { mark: 19, confidence: 89, docId: "d03", page: 2, rationale: "Declares direct delivery to all five properties on a 28-day cycle." },
  "sriram:c4": { mark: 18, confidence: 92, docId: "d04", page: 1, rationale: "OEKO-TEX valid to Apr 2027; SA8000 social audit on file from Dec 2025." },
  "sriram:c5": { mark: 13, confidence: 88, docId: "d05", page: 2, rationale: "14-day replacement and a named account manager, both committed in writing." },

  // ── Nandan — clean, slightly thinner paperwork ──
  "nandan:c1": { mark: 22, confidence: 90, docId: "d06", page: 6, rationale: "NITRA report shows 498 GSM, within tolerance. Bed linen SKUs not covered — terry only." },
  "nandan:c2": { mark: 17, confidence: 87, docId: "d07", page: 2, rationale: "Grade 4 fastness, shrinkage 4.6% at 50 cycles. Passes, with less headroom than Sriram." },
  "nandan:c3": { mark: 18, confidence: 85, docId: "d08", page: 3, rationale: "Capacity confirmed for all five; Sawai Madhopur served via a Jaipur consolidation point." },
  "nandan:c4": { mark: 19, confidence: 93, docId: "d09", page: 1, rationale: "OEKO-TEX valid to Oct 2027 and a BSCI audit from Mar 2026 — the strongest compliance file in the round." },
  "nandan:c5": { mark: 12, confidence: 79, docId: null, page: null, rationale: "No standalone SLA document submitted; terms are inferred from their covering letter.", needsCheck: true },

  // ── Trident — competent, but gaps that matter ──
  "trident:c1": { mark: 20, confidence: 82, docId: "d10", page: 3, rationale: "In-house QC rather than an independent lab. Figures conform, but the source is the supplier's own." , needsCheck: true },
  "trident:c2": { mark: 16, confidence: 74, docId: "d11", page: 2, rationale: "Wash trial run to 30 cycles, not the 50 the clause requires. Extrapolating the remaining 20 is not something the model should do for you.", needsCheck: true },
  "trident:c3": { mark: 15, confidence: 88, docId: "d12", page: 1, rationale: "Coverage note excludes Sawai Madhopur; freight to Rajasthan quoted separately." },
  "trident:c4": { mark: 16, confidence: 90, docId: "d13", page: 1, rationale: "OEKO-TEX valid to Jan 2027. No social compliance audit submitted." },
  "trident:c5": { mark: 11, confidence: 81, docId: null, page: null, rationale: "21-day replacement offered against the 14 days required." },

  // ── Welspun — the strongest technical file in the round ──
  "welspun:c1": { mark: 24, confidence: 96, docId: "d14", page: 9, rationale: "SGS report covers every SKU at 500-505 GSM, ring-spun confirmed by fibre analysis." },
  "welspun:c2": { mark: 19, confidence: 95, docId: "d15", page: 7, rationale: "Tested to 60 cycles — beyond the requirement. Shrinkage 3.4%, fastness grade 5." },
  "welspun:c3": { mark: 20, confidence: 94, docId: "d16", page: 4, rationale: "Allocation plan reserves capacity for all five properties with a 25-day cycle." },
  "welspun:c4": { mark: 18, confidence: 92, docId: "d17", page: 2, rationale: "OEKO-TEX and GOTS both valid. Social audit is 26 months old, marginally outside the 24-month window.", needsCheck: true },
  "welspun:c5": { mark: 13, confidence: 86, docId: null, page: null, rationale: "14-day replacement and quarterly reviews committed in the quote covering letter." },

  // ── Aarvi — the supplier Vendor Match flagged at RFQ stage ──
  "aarvi:c1": { mark: 17, confidence: 68, docId: "d18", page: 1, rationale: "Self-declaration only; no independent lab report submitted against a clause that requires one.", needsCheck: true },
  "aarvi:c2": { mark: 13, confidence: 61, docId: null, page: null, rationale: "No wash-trial certificate in the submission. Marked on the strength of prior supply history alone.", needsCheck: true },
  "aarvi:c3": { mark: 12, confidence: 84, docId: null, page: null, rationale: "Serves three of five properties. No stated route to Ramnagar or Sawai Madhopur." },
  "aarvi:c4": { mark: 6, confidence: 97, docId: "d19", page: 1, rationale: "OEKO-TEX certificate expired 31 Mar 2026. The clause requires a valid certificate for all textile SKUs — this is a hard fail, not a deduction." },
  "aarvi:c5": { mark: 9, confidence: 77, docId: null, page: null, rationale: "Replacement terms offered at 30 days against the 14 required." },
};

export const proposedFor = (vendorId, clauseId) => proposed[`${vendorId}:${clauseId}`] || null;

/** Total for a vendor, given a map of accepted/overridden marks. */
export const totalFor = (vendorId, marks = {}) =>
  clauses.reduce((sum, c) => {
    const key = `${vendorId}:${c.id}`;
    const override = marks[key];
    const base = proposed[key];
    return sum + (override ? override.mark : base ? base.mark : 0);
  }, 0);

export const MAX_TOTAL = clauses.reduce((s, c) => s + c.maxMark, 0);
