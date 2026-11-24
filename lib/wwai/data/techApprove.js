/**
 * Fixture for the AI Technical Approver panel — prototype 2, the second half
 * of the technical evaluation.
 *
 * Prototype 1 (`./techEval`, the AI Technical Evaluator) helps the evaluator
 * give marks. This one helps the approver check them. It reads the SAME
 * evaluation — the clauses, the five blind-aliased vendors, their responses
 * and evidence all come from `ARC_DATA` — plus the marks the evaluator
 * actually submitted, which live here.
 *
 * The story the two tell together: the evaluator took the AI's proposals on
 * most cells, made two judgement calls of their own, and overrode one flag —
 * Vendor B's shrinkage gate, passed on the vendor's "fully compliant" claim.
 * That override is the one mark the vendor's own lab report contradicts, and
 * it is the one this panel sends back.
 *
 * Everything below is pre-authored and deterministic. No model is called;
 * totals, gate counts and the per-vendor table are DERIVED from these marks
 * in the plan builder, never typed twice.
 */
import "./techEval";

const root = typeof window !== "undefined" ? window : globalThis;

/** The evaluation this approval is about — prototype 1's fixture, unchanged. */
export const ARC = root.ARC_DATA;

/* ── what the evaluator submitted ──────────────────────────────────────────
   key: `${vendor_alias_key}|${clause_id}`
   mark   — marks given, always ≤ the clause weight
   pass   — mandatory clauses only: the evaluator's Pass / Fail on the gate
   remark — the evaluator's own remark, as it reached the approver           */
export const SUBMISSION = {
  evaluatorId: "purchase",   // Ananya Rao, who scored it
  approverId: "regional",    // Sameer Nair, who signs it off
  submittedAt: "2026-07-14T11:20:00+05:30",
  itemName: "BATH TOWEL 500 GSM",
  marks: {
    /* Vendor A */
    "1|c1": { mark: 25, pass: true, remark: "SITRA 501.4 GSM, mid-band, report in window. Full marks." },
    "1|c2": { mark: 18, remark: "100% cotton on the SITRA fibre report." },
    "1|c3": { mark: 19, remark: "Grade 4–5 after 20 cycles." },
    "1|c4": { mark: 19, pass: true, remark: "Warp 3.8% / weft 2.9%, inside 5%." },
    "1|c5": { mark: 15, remark: "Cert 23.HIN.77401 in scope, valid past term end." },

    /* Vendor B */
    "2|c1": { mark: 23, pass: true, remark: "498.2 GSM, inside the band." },
    "2|c2": { mark: 17, remark: "Mill certificate only, no independent fibre test." },
    "2|c3": { mark: 16, remark: "Grade 4 exactly." },
    "2|c4": { mark: 17, pass: true, remark: "Vendor confirms compliant; consolidated report on file." },
    "2|c5": { mark: 6, remark: "Cert scope is woven bed linen, not terry." },

    /* Vendor C */
    "3|c1": { mark: 15, pass: true, remark: "503 GSM passes, but the report is 19 months old. Call for a current one before award." },
    "3|c2": { mark: 18, remark: "100% cotton, nil blend at 0.5%." },
    "3|c3": { mark: 12, remark: "Self-certified only, so partial marks." },
    "3|c4": { mark: 17, pass: true, remark: "Warp 3.9% / weft 3.1%, report Apr 2026." },
    "3|c5": { mark: 15, remark: "Cert 23.HIN.81190 in scope to Sep 2027." },

    /* Vendor D */
    "4|c1": { mark: 22, pass: true, remark: "496 GSM, NABL-traceable report." },
    "4|c2": { mark: 6, remark: "Datasheet p.2 reads 80% cotton / 20% viscose. Marked on the datasheet, not the claim." },
    "4|c3": { mark: 15, remark: "Internal lab only." },
    "4|c4": { mark: 18, pass: true, remark: "Warp 4.1% / weft 3.4%." },
    "4|c5": { mark: 12, remark: "Cert lapses 28 Feb 2027, a month before term end." },

    /* Vendor E */
    "5|c1": { mark: 20, pass: true, remark: "496 GSM, single coupon." },
    "5|c2": { mark: 12, remark: "No fibre report submitted." },
    "5|c3": { mark: 9, remark: "Report shows grade 3–4, below the floor." },
    "5|c4": { mark: 14, pass: true, remark: "Declared 4.9% on its own QA sheet." },
    "5|c5": { mark: 4, remark: "Cert expires 31 Dec 2026, mid-term." },
  },
};

/* ── the AI's reading of those marks ───────────────────────────────────────
   Only cells where the AI's view differs from, or qualifies, the evaluator's
   are listed; every other cell the AI agrees with as scored.
   status — "contradicted": the evidence says otherwise (sent back)
            "thin":         rests on a self-declaration, outcome unchanged    */
const AI_VIEW = {
  "2|c4": { mark: 4, pass: false, status: "contradicted" },
  "5|c4": { status: "thin" },
};

const STEPS = [
  { label: "Opening the evaluation submitted for <b>BATH TOWEL 500 GSM</b>", note: "Ananya Rao · 25 marks · 2 mandatory gates", ms: 480 },
  { label: "Reading the evaluator’s marks and remarks", note: "5 vendors × 5 clauses · pass mark 65 of 100", ms: 520 },
  { label: "Comparing each mark with the AI Technical Evaluator’s proposal", note: "3 departures", ms: 460 },
  { label: "Re-reading <span class=\"mono\">VendorB_LabReport_GSM.pdf</span> (4 pages)", note: "page 3 · dimensional change table", ms: 640 },
  { label: "Checking the issue date on <span class=\"mono\">VendorC_GSM_TestCertificate.pdf</span>", note: "14 Nov 2024 · outside the 12-month window", ms: 500 },
  { label: "Reading the fibre table in <span class=\"mono\">VendorD_MillDatasheet_Terry.pdf</span> against the clause 2 mark", note: "page 2 of 6", ms: 520 },
  { label: "Looking for an IS 3361 report behind Vendor E’s shrinkage answer", note: "none attached · self-reported 4.9%", ms: 480 },
  { label: "Checking every mark against its clause acceptance criteria", note: "IS 1964 · ISO 105-C06 · IS 3361 · OEKO-TEX scope", ms: 560 },
  { label: "Recomputing weighted totals against the pass mark", note: "Σ weights = 100 · a failed gate overrides points", ms: 500 },
];

const FINDINGS = [
  {
    tone: "bad",
    text: "<strong>Vendor B passes a mandatory gate its own lab report fails.</strong> Clause 4 (shrinkage ≤ 5% after 5 cycles, IS 3361) is marked <span class=\"mono\">Pass · 17/20</span> on the response text, which says “fully compliant and within the permitted limit”. Page 3 of the vendor’s own <span class=\"mono\">VendorB_LabReport_GSM.pdf</span> records dimensional change of <span class=\"mono\">6.8%</span> in warp against a ceiling of <span class=\"mono\">5.0%</span>. A failed gate is a knockout, not a deduction: Vendor B cannot qualify whatever its 79 points. This is the knockout the AI Technical Evaluator raised at scoring, and the mark that reached you does not reflect it.",
    cites: [
      { label: "Clause 4 · shrinkage gate", target: "#clause-c4" },
      { label: "Vendor B · clause 4 cell", target: "#cell-2-c4" },
      { label: "Evidence #5521 · p.3", target: "#cell-2-c4" },
    ],
  },
  {
    tone: "good",
    text: "<strong>23 of 25 marks stand on the documents.</strong> Vendor A’s five marks each rest on a third-party report inside the validity window. Vendor D’s <span class=\"mono\">6/20</span> on fibre follows the datasheet (<span class=\"mono\">80% cotton / 20% viscose</span>), not the vendor’s “no blends” claim. Vendor C’s partial marks on weight (<span class=\"mono\">15/25</span>) and colour fastness (<span class=\"mono\">12/20</span>) match a stale report and a self-certificate, and the evaluator’s remark already calls for a current report before award.",
    cites: [
      { label: "Vendor D · clause 2 cell", target: "#cell-4-c2" },
      { label: "Vendor C · clause 1 cell", target: "#cell-3-c1" },
    ],
  },
  {
    tone: "good",
    text: "<strong>The evaluator’s own judgement calls hold up.</strong> Three marks differ from what the AI Technical Evaluator proposed. Two sit inside the evidence: full marks to Vendor A on weight (<span class=\"mono\">25</span> against a proposed 24, for 501.4 GSM mid-band) and one mark fewer to Vendor D on certification (<span class=\"mono\">12</span> against 13, for a certificate that lapses a month before term end). The third is Vendor B’s gate, above.",
    cites: [
      { label: "Vendor A · clause 1 cell", target: "#cell-1-c1" },
      { label: "Vendor D · clause 5 cell", target: "#cell-4-c5" },
    ],
  },
  {
    tone: "warn",
    text: "<strong>One gate rests on a self-declaration, but it changes nothing.</strong> Vendor E’s shrinkage gate is passed on a self-reported <span class=\"mono\">4.9%</span> with no IS 3361 report attached. On its own that would be a question. Vendor E already falls short of the pass mark at <span class=\"mono\">59/100</span>, so the result is the same either way. Worth a line in the record; not worth a send-back.",
    cites: [{ label: "Vendor E · clause 4 cell", target: "#cell-5-c4" }],
  },
  {
    tone: "good",
    text: "<strong>Weighting and the pass mark check out.</strong> The clause weights sum to <span class=\"mono\">100</span> (25 + 20 + 20 + 20 + 15), no mark exceeds its weight, and every vendor total recomputes from its five cells to the figure on screen against a pass mark of <span class=\"mono\">65</span>. Marks and remarks refer to aliases only, so the evaluation stayed blind. The one change to the outcome comes from Vendor B’s gate.",
    cites: [{ label: "Vendor totals · matrix header", target: ".eval-table thead" }],
  },
];

/* Per-vendor row notes. The numbers beside them are derived, never typed. */
const VENDOR_NOTES = {
  1: { check: "agrees", note: "Every mark on a third-party report" },
  2: { check: "question", note: "Clause 4 gate: own report 6.8% > 5.0%" },
  3: { check: "agrees", note: "Stale GSM report already remarked" },
  4: { check: "agrees", note: "Fibre marked on the datasheet" },
  5: { check: "agrees", note: "Below pass mark · gate self-reported" },
};

/* The note that goes back to the evaluator. Plain text: it is dropped into
   the decision card's comment box as written, and the evaluator reads it
   exactly as the approver sent it. */
const SEND_BACK_NOTE =
  "Sending back one mark for re-scoring: Vendor B · Clause 4 (shrinkage ≤ 5% after 5 wash cycles, IS 3361 — mandatory gate).\n\n" +
  "It is marked Pass, 17/20, on the response text: \"Shrinkage is fully compliant and within the permitted limit.\" " +
  "The vendor's own consolidated lab report (VendorB_LabReport_GSM.pdf, Evidence #5521, page 3) records: " +
  "\"Dimensional change after 5 cycles — warp 6.8%\". The ceiling is 5.0%.\n\n" +
  "Please re-judge the gate against the report and re-mark the cell. The other 24 marks and the weighting stand as scored. " +
  "If the gate is a Fail, Vendor B does not qualify and 3 vendors go to Commercial, not 4.";

const APPROVE_NOTE =
  "Approved as scored. The AI check questioned Vendor B · Clause 4 (own lab report p.3: warp 6.8% against a 5.0% ceiling); " +
  "I have reviewed it and accept the evaluator's marks.";

const VERDICT = {
  verdict: "attention",
  headline: "Send back one mark",
  confidence: 93,
  summary: "23 of 25 marks stand on the documents and the arithmetic checks out. One does not: Vendor B is marked Pass on the mandatory shrinkage gate, but its own lab report records 6.8% against a 5.0% ceiling. Corrected, Vendor B does not qualify, so 3 vendors go to Commercial, not 4.",
  audit: "19 documents · 25 marks · 5 vendors × 5 clauses · 2.8s",
  disclaimerText: "A second reading of the evaluator’s marks, not a decision. Approving or sending back stays with you, and the evaluator sees only the note you choose to send.",
};

export const AI = {
  steps: STEPS,
  findings: FINDINGS,
  view: AI_VIEW,
  vendorNotes: VENDOR_NOTES,
  verdict: VERDICT,
  sendBackNote: SEND_BACK_NOTE,
  approveNote: APPROVE_NOTE,
};

export default { ARC, SUBMISSION, AI };
