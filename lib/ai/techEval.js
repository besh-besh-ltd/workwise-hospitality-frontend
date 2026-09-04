import { clauses, proposed, underEvaluation, docsById, MIN_SCORE, MAX_TOTAL } from "@/data/ihg/evaluation";

/**
 * AI Technical Evaluator — the tech-eval stage of a rate contract.
 *
 * Reads the evidence pack and proposes a mark per clause per vendor. It does
 * not award anything. Every proposed mark carries the document and page it
 * came from, a confidence, and — where the evidence does not actually support
 * the clause — an explicit flag saying a person has to decide this one.
 *
 * That last part is the whole design. A model that quietly scores a
 * self-declaration as though it were a lab report is worse than no model.
 */
export const engine = {
  steps: [
    { label: "Opening the evidence pack", detail: "19 documents across 5 vendors", ms: 700 },
    { label: "Reading lab reports and wash trials", detail: "Extracting GSM, fastness and shrinkage figures", ms: 980 },
    { label: "Checking certificates against clause 4.4", detail: "OEKO-TEX, GOTS, social compliance", ms: 840 },
    { label: "Matching each document to the clause it answers", ms: 760 },
    { label: "Proposing marks and flagging what it cannot verify", ms: 820 },
  ],

  compute: () => {
    const vendors = underEvaluation.map((vendorId) => {
      const marks = clauses.map((clause) => {
        const p = proposed[`${vendorId}:${clause.id}`];
        const doc = p?.docId ? docsById[p.docId] : null;
        return {
          clauseId: clause.id,
          clauseNum: clause.num,
          clauseTitle: clause.title,
          maxMark: clause.maxMark,
          mark: p?.mark ?? 0,
          confidence: p?.confidence ?? 0,
          rationale: p?.rationale ?? "",
          needsCheck: !!p?.needsCheck,
          doc,
          page: p?.page ?? null,
          // No document at all is its own signal — the model is marking from
          // context rather than evidence, and should say so.
          evidenceMissing: !doc,
        };
      });

      const total = marks.reduce((s, m) => s + m.mark, 0);
      const flagged = marks.filter((m) => m.needsCheck).length;

      return {
        vendorId,
        marks,
        total,
        maxTotal: MAX_TOTAL,
        passes: total >= MIN_SCORE,
        flagged,
        // Averaged across clauses, then knocked down for anything unverified —
        // a headline confidence that ignored the flags would be misleading.
        confidence: Math.round(
          marks.reduce((s, m) => s + m.confidence, 0) / marks.length - flagged * 4
        ),
      };
    });

    const ranked = [...vendors].sort((a, b) => b.total - a.total);

    return {
      vendors,
      ranked,
      passing: ranked.filter((v) => v.passes),
      failing: ranked.filter((v) => !v.passes),
      totalFlagged: vendors.reduce((s, v) => s + v.flagged, 0),
      minScore: MIN_SCORE,
    };
  },
};

export default engine;
