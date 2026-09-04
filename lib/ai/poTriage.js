import { pendingPos, heldValue } from "@/data/ihg/orders";
import { vendorsById } from "@/data/ihg/vendors";

/**
 * AI PO Triage — the approver's queue.
 *
 * Ranks what is waiting on you and puts a call against each: approve, hold or
 * reject. The ordering is by what needs a decision most, not by value or age —
 * a clean ₹9L order that has been sitting for two days matters less than an
 * off-contract ₹5L order placed with a non-compliant supplier.
 *
 * The point is not to approve for you. It is to make the queue's shape
 * obvious, so the clean ones go through in one action and your attention goes
 * where it is actually needed.
 */

const assess = (po) => {
  const vendor = vendorsById[po.vendorId];
  const reasons = [];
  let severity = 0;

  if (!po.contractId) {
    reasons.push({ tone: "danger", text: "Off-contract — no rate agreement backing it" });
    severity += 3;
  }
  if (vendor?.risk?.level === "high") {
    reasons.push({ tone: "danger", text: `Supplier risk: ${vendor.risk.note}` });
    severity += 3;
  }
  const expired = (vendor?.certifications || []).filter((c) => c.status === "expired");
  expired.forEach((c) => {
    reasons.push({ tone: "danger", text: `${c.name} expired ${c.expires}` });
    severity += 2;
  });

  const worstLine = [...po.lines].sort((a, b) => (b.vsLastAwardPct || 0) - (a.vsLastAwardPct || 0))[0];
  if (worstLine && worstLine.vsLastAwardPct > 3) {
    reasons.push({ tone: "warn", text: `${worstLine.vsLastAwardPct}% above your last awarded rate` });
    severity += 2;
  }

  const overCap = po.lines.filter((l) => l.overCap);
  overCap.forEach((l) => {
    reasons.push({ tone: "warn", text: `${l.name}: ${l.qty} against a ${l.cap} quarterly cap` });
    severity += 1;
  });

  if (po.budget) {
    const headroom = po.budget.allocated - po.budget.consumed - po.value;
    const usedPct = ((po.budget.consumed + po.value) / po.budget.allocated) * 100;
    if (headroom < 0) {
      reasons.push({ tone: "danger", text: "Exceeds the remaining budget on this head" });
      severity += 3;
    } else if (usedPct > 85) {
      reasons.push({ tone: "warn", text: `Takes this budget head to ${Math.round(usedPct)}% consumed` });
      severity += 1;
    }
  }

  if (po.pendingDays >= 7) {
    reasons.push({ tone: "warn", text: `Waiting ${po.pendingDays} days — the oldest in your queue` });
    severity += 1;
  }

  // "Approve" means nothing was flagged at all. An order carrying even one
  // warning must not land in the bulk-approve group — sweeping a budget
  // warning through in a single click is precisely the mistake this is here
  // to prevent.
  const call = severity >= 5 ? "reject" : reasons.length > 0 ? "hold" : "approve";

  return {
    call,
    severity,
    reasons,
    clean: reasons.length === 0,
    confidence: call === "approve" ? 93 - severity * 2 : 88 - severity,
  };
};

export const engine = {
  steps: [
    { label: "Opening what's pending on you", detail: `${pendingPos.length} orders`, ms: 620 },
    { label: "Checking each against its rate contract", ms: 820 },
    { label: "Re-pricing lines against your purchase history", ms: 900 },
    { label: "Reading supplier risk and certificate status", ms: 780 },
    { label: "Testing budget headroom and approval limits", ms: 720 },
    { label: "Ranking by what needs you most", ms: 520 },
  ],

  compute: () => {
    const rows = pendingPos
      .map((po) => ({ po, ...assess(po) }))
      // Most severe first — the queue should open on the thing most likely to
      // be wrong, not the biggest number.
      .sort((a, b) => b.severity - a.severity || b.po.value - a.po.value);

    const clear = rows.filter((r) => r.call === "approve");

    return {
      rows,
      clear,
      clearValue: clear.reduce((s, r) => s + r.po.value, 0),
      needsAttention: rows.filter((r) => r.call !== "approve"),
      total: rows.length,
      heldValue,
      confidence: 90,
    };
  },
};

export default engine;
