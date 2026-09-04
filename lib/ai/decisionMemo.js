import { getPo } from "@/data/ihg/orders";
import { vendorsById } from "@/data/ihg/vendors";
import { peopleById } from "@/data/ihg/org";

/**
 * AI Decision Memo — the long form of the triage call, for one order.
 *
 * Four checks, because these are the four things that actually decide a PO:
 * the price against your own history, the supplier's risk, the quoted spec
 * against the contract clauses, and whether the approval chain and budget
 * hold up. Every claim carries an evidence chip back to something visible on
 * the same page — no assertion the approver cannot check in one click.
 */

const scoreToVerdict = (s) => (s >= 85 ? "pass" : s >= 60 ? "caution" : "fail");

export const engine = {
  steps: [
    { label: "Reading the order and its lines", ms: 620 },
    { label: "Re-pricing against 24 months of your own purchase history", ms: 940 },
    { label: "Pulling supplier risk, certificates and delivery record", ms: 820 },
    { label: "Matching quoted specification to the contract clauses", ms: 880 },
    { label: "Testing the approval chain and budget headroom", ms: 760 },
    { label: "Writing the memo", ms: 560 },
  ],

  compute: ({ poId } = {}) => {
    const po = getPo(poId);
    if (!po) return null;

    const vendor = vendorsById[po.vendorId];
    const approver = peopleById[po.approverId];

    /* ── 1 · price against your own history ───────────────────── */
    const priced = po.lines.filter((l) => l.lastAwardRate);
    const avgDelta =
      priced.length > 0
        ? priced.reduce((s, l) => s + l.vsLastAwardPct, 0) / priced.length
        : po.lines[0]?.vsLastAwardPct || 0;
    const priceScore = Math.max(0, Math.min(100, Math.round(88 - avgDelta * 6)));
    const priceCheck = {
      key: "price",
      title: "Price against your purchase history",
      score: priceScore,
      verdict: scoreToVerdict(priceScore),
      summary:
        avgDelta < 0
          ? `Every line is at or below what you last paid — ${Math.abs(avgDelta).toFixed(1)}% under the previous award on average.`
          : `Lines are running ${avgDelta.toFixed(1)}% above your last awarded rate.`,
      points: po.lines
        .filter((l) => l.lastAwardRate)
        .map((l) => ({
          text: `${l.name}: ₹${l.rate} against ₹${l.lastAwardRate} last awarded (${l.vsLastAwardPct > 0 ? "+" : ""}${l.vsLastAwardPct}%)`,
          evidence: `po-line-${l.itemId}`,
          evidenceLabel: "line",
        })),
    };

    /* ── 2 · supplier risk ────────────────────────────────────── */
    const expired = (vendor.certifications || []).filter((c) => c.status === "expired");
    // Anchored at 100 for a flawless record and penalised from there, so a
    // supplier with 96% on-time and no disputes reads as the low risk it is.
    // The earlier scale topped out in the seventies, which made every supplier
    // look like a concern and so made the flag meaningless.
    const riskScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          100 -
            (100 - vendor.performance.onTimePct) * 2.2 -
            expired.length * 35 -
            (vendor.performance.disputes || 0) * 12
        )
      )
    );
    const riskCheck = {
      key: "risk",
      title: "Supplier risk",
      score: riskScore,
      verdict: scoreToVerdict(riskScore),
      summary: expired.length
        ? `${vendor.short} has ${expired.length} lapsed certificate on file. ${vendor.risk.note}`
        : `${vendor.short} delivers on time ${vendor.performance.onTimePct}% of the time with ${vendor.performance.disputes || 0} open disputes. ${vendor.risk.note}`,
      points: [
        { text: `On-time delivery ${vendor.performance.onTimePct}% across ${vendor.performance.contractsWon || 0} prior contracts`, evidence: "memo-vendor", evidenceLabel: "supplier" },
        ...(vendor.certifications || []).map((c) => ({
          text: `${c.name} — ${c.status === "valid" ? `valid to ${c.expires}` : `EXPIRED ${c.expires}`}`,
          evidence: "memo-vendor",
          evidenceLabel: "supplier",
        })),
      ],
    };

    /* ── 3 · specification against the contract ───────────────── */
    const overCap = po.lines.filter((l) => l.overCap);
    const specScore = po.contractId ? (overCap.length ? 66 : 94) : 38;
    const specCheck = {
      key: "spec",
      title: "Specification against the contract",
      score: specScore,
      verdict: scoreToVerdict(specScore),
      summary: !po.contractId
        ? "This order is not placed against any rate contract, so there are no agreed clauses to check it against."
        : overCap.length
        ? `Rates and specifications match ${po.contractId}, but ${overCap.length} line exceeds its agreed quarterly call-off cap.`
        : `Every line matches the rates and specifications agreed in ${po.contractId}.`,
      points: overCap.length
        ? overCap.map((l) => ({
            text: `${l.name}: ordering ${l.qty} against a ${l.cap} quarterly cap — ${l.qty - l.cap} over`,
            evidence: `po-line-${l.itemId}`,
            evidenceLabel: "line",
            flag: true,
          }))
        : [{ text: `All ${po.lines.length} lines within their agreed call-off caps`, evidence: "po-lines", evidenceLabel: "lines" }],
    };

    /* ── 4 · approval chain and budget ────────────────────────── */
    const headroom = po.budget ? po.budget.allocated - po.budget.consumed - po.value : 0;
    const withinLimit = po.value <= (approver?.approvalLimit || 0);
    const chainScore = withinLimit && headroom >= 0 ? 96 : withinLimit ? 55 : 40;
    const chainCheck = {
      key: "chain",
      title: "Approval chain and budget",
      score: chainScore,
      verdict: scoreToVerdict(chainScore),
      summary: withinLimit
        ? headroom >= 0
          ? `Within ${approver.name}'s limit, and the budget head has headroom after this order.`
          : `Within ${approver.name}'s limit, but this order takes the budget head over its allocation.`
        : `Above ${approver.name}'s approval limit — this needs to escalate.`,
      points: [
        { text: `Order value ₹${po.value.toLocaleString("en-IN")} against a ₹${(approver?.approvalLimit || 0).toLocaleString("en-IN")} limit`, evidence: "memo-chain", evidenceLabel: "chain" },
        ...(po.budget
          ? [{ text: `${po.budget.head}: ₹${headroom.toLocaleString("en-IN")} left after this order`, evidence: "memo-budget", evidenceLabel: "budget" }]
          : []),
        { text: `Requirement confirmed by ${peopleById[po.chain.find((c) => c.role.includes("confirmed"))?.personId]?.name || "the raising department"}`, evidence: "memo-chain", evidenceLabel: "chain" },
      ].filter(Boolean),
    };

    const checks = [priceCheck, riskCheck, specCheck, chainCheck];
    const overall = Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length);
    const anyFail = checks.some((c) => c.verdict === "fail");
    const anyCaution = checks.some((c) => c.verdict === "caution");

    const call = anyFail ? "reject" : anyCaution ? "approve-with-note" : "approve";

    return {
      po,
      vendor,
      approver,
      checks,
      overall,
      call,
      confidence: Math.max(55, Math.min(97, overall + (anyFail ? -6 : 3))),
      headline:
        call === "approve"
          ? "Approve. Nothing on this order needs a second look."
          : call === "approve-with-note"
          ? "Approve, with one thing to confirm first."
          : "Do not approve as it stands.",
      // The single sentence an approver would actually want. Stated plainly,
      // because a memo that buries its conclusion is not a memo.
      // The weakest check, not the first one in the list — an approver reading
      // one sentence should get the thing most likely to be wrong.
      bottomLine:
        anyFail || anyCaution
          ? [...checks].sort((a, b) => a.score - b.score)[0].summary
          : `Priced below your last award, placed against ${po.contractId}, with a supplier carrying no open issues.`,
    };
  },
};

export default engine;
