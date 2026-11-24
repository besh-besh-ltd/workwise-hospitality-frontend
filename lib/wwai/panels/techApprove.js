/**
 * AI Technical Approver — prototype 2, built to sit beside prototype 1.
 *
 * The AI Technical Evaluator (`./techEval`) helps the evaluator give marks.
 * This panel runs on the approver's screen once those marks are submitted:
 * it re-reads every mark against the vendor's evidence and the clause's
 * acceptance criteria, rechecks the weighting and the pass mark, and either
 * recommends approving as scored or sending one mark back with a note it has
 * already written.
 *
 * The analysis copy is pre-authored (`../data/techApprove`). The per-vendor
 * table and the comparison strip are derived here from the submitted marks,
 * the same way techEval derives its table, so a changed mark cannot leave a
 * stale total behind.
 *
 * The panel never decides. Its two actions hand off to the screen's own
 * approval controls through the callbacks the host passes in:
 *   onSendBack(note) — puts the note in the decision card for the approver
 *                      to read and send;
 *   onApprove(note)  — approves through the same path as the card's button.
 * `onReady(api)` hands back `api.markDecided(decision)` so the host can bring
 * the buttons in line when the decision is made on the card instead.
 */
import { ARC, SUBMISSION, AI } from "../data/techApprove";

const SPARK = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';
const AV_CLASSES = ["av-1", "av-2", "av-3", "av-4", "av-5", "av-6"];

const K = (vk, cid) => `${vk}|${cid}`;
const vendorAvClass = (k) => AV_CLASSES[Math.abs(Number(k) || 0) % AV_CLASSES.length];
const vendorInitials = (name) => {
  const p = String(name || "").trim().split(/\s+/);
  return ((p[0] || "").charAt(0) + (p[1] || "").charAt(0)).toUpperCase() || "VN";
};
// "Vendor B" → "B", for the compact lists in the comparison strip.
const aliasLetter = (name) => String(name || "").replace(/^Vendor\s+/i, "");

/** The evaluator's cell, and the AI's reading of the same cell. */
const evaluatorCell = (vk, cid) => SUBMISSION.marks[K(vk, cid)] || null;
const aiCell = (vk, cid) => ({ ...(evaluatorCell(vk, cid) || {}), ...(AI.view[K(vk, cid)] || {}) });

/** Points, gates and the qualify call for one vendor under a given reading. */
const standing = (vk, cellFor) => {
  const clauses = ARC.clauses;
  const total = clauses.reduce((s, c) => s + (Number(cellFor(vk, c.id)?.mark) || 0), 0);
  const gates = clauses.filter((c) => c.is_mandatory);
  const passed = gates.filter((c) => cellFor(vk, c.id)?.pass === true).length;
  const max = clauses.reduce((s, c) => s + c.weight, 0) || 100;
  const pct = Math.round((total / max) * 100);
  return {
    total,
    gatesPassed: passed,
    gatesTotal: gates.length,
    // A failed gate is a knockout whatever the points — the product's rule.
    qualifies: passed === gates.length && pct >= ARC.minPass,
  };
};

export function buildTechApprovePlan(opts = {}) {
  const esc = window.WWAi.esc;
  const section = window.WWAi.section;
  const VN = ARC.vendors;
  const decision = opts.decision || null;   // null | "approved" | "rejected"
  const canDecide = !!opts.canDecide && !decision;
  const approverName = opts.approverName || "the technical approver";

  const rows = VN.map((v) => {
    const vk = v.vendor_alias_key;
    return {
      v,
      asScored: standing(vk, evaluatorCell),
      onEvidence: standing(vk, aiCell),
      meta: AI.vendorNotes[vk] || { check: "agrees", note: "" },
    };
  });

  const scoreCell = (s) =>
    `<span class="ai-vscore ${s.qualifies ? "pass" : "fail"}">${s.total}</span><span class="ai-vmax">/100</span>` +
    `<span class="ai-vnote">${s.qualifies ? "Qualified" : "Not qualified"}</span>`;

  const vendorTableHtml = () => {
    const body = rows.map(({ v, asScored, onEvidence, meta }) => {
      const gateChanged = asScored.gatesPassed !== onEvidence.gatesPassed;
      const question = meta.check === "question";
      return "<tr>" +
        "<td>" +
          `<div class="ai-vname"><span class="v-av ${vendorAvClass(v.vendor_alias_key)}">${vendorInitials(v.vendor_alias)}</span>` +
          `<span><span class="ai-vlabel">${esc(v.vendor_alias)}</span>` +
          `<span class="ai-vnote">${esc(meta.note)}</span></span></div>` +
        "</td>" +
        `<td class="num">${scoreCell(asScored)}</td>` +
        `<td class="num">${scoreCell(onEvidence)}</td>` +
        `<td class="num"><span class="ai-gate ${onEvidence.gatesPassed === onEvidence.gatesTotal ? "ok" : "bad"}">` +
          (gateChanged
            ? `${asScored.gatesPassed}/${asScored.gatesTotal} → ${onEvidence.gatesPassed}/${onEvidence.gatesTotal}`
            : `${onEvidence.gatesPassed}/${onEvidence.gatesTotal}`) +
        "</span></td>" +
        `<td><span class="ww-ai-badge ${question ? "v-no" : "v-yes"}"><span class="bdot"></span>${question ? "Question" : "Agrees"}</span></td>` +
      "</tr>";
    }).join("");

    return '<div class="ww-ai-sec ai-vsec">' +
      '<div class="ww-ai-sec-label">The evaluator’s marks against the evidence · per vendor</div>' +
      '<div class="ai-vtable-wrap"><table class="ai-vtable">' +
        '<thead><tr><th>Vendor</th><th class="num">Evaluator</th><th class="num">AI view</th><th class="num">Mandatory gates</th><th>Check</th></tr></thead>' +
        `<tbody>${body}</tbody>` +
      "</table></div></div>";
  };

  // The comparison strip: what changes between "as scored" and "on the evidence".
  const cellCount = ARC.clauses.length * VN.length;
  const viewed = Object.values(AI.view);
  const contradicted = viewed.filter((c) => c.status === "contradicted").length;
  const thin = viewed.filter((c) => c.status === "thin").length;
  const qualAsScored = rows.filter((r) => r.asScored.qualifies).map((r) => aliasLetter(r.v.vendor_alias));
  const qualOnEvidence = rows.filter((r) => r.onEvidence.qualifies).map((r) => aliasLetter(r.v.vendor_alias));
  const compare = [
    { k: "Marks checked", v: String(cellCount), n: `${VN.length} vendors × ${ARC.clauses.length} clauses` },
    { k: "Stand on the documents", v: String(cellCount - contradicted - thin), n: `${thin} thin · ${contradicted} contradicted` },
    { k: "Qualify as scored", v: `${qualAsScored.length} of ${VN.length}`, n: qualAsScored.join(" · ") },
    { k: "Qualify on the evidence", v: `${qualOnEvidence.length} of ${VN.length}`, n: qualOnEvidence.join(" · "), tone: qualOnEvidence.length !== qualAsScored.length ? "up" : "" },
  ];

  const noteHtml = section(
    "The note that goes back to the evaluator",
    `<div class="ai-strategy ta-note" style="white-space:pre-line;font-size:12.5px;line-height:1.6;color:var(--fg-2)">${esc(AI.sendBackNote)}</div>`
  );

  const lockedHint = `Only ${approverName} can approve or send back this evaluation`;
  const actionsHtml = () => {
    if (decision === "approved") {
      return '<button type="button" class="ww-ai-run ghost" data-act="approve" disabled>Approved as scored</button>';
    }
    if (decision === "rejected") {
      return '<button type="button" class="ww-ai-run" data-act="send-back" disabled>Sent back · note recorded</button>';
    }
    const dis = canDecide ? "" : ` disabled title="${esc(lockedHint)}"`;
    return `<button type="button" class="ww-ai-run ghost" data-act="approve"${dis}>Approve as scored</button>` +
      `<button type="button" class="ww-ai-run" data-act="send-back"${dis}>${SPARK}<span>Send back with this note</span></button>`;
  };

  return {
    steps: AI.steps,
    result: {
      verdict: AI.verdict.verdict,
      headline: AI.verdict.headline,
      confidence: AI.verdict.confidence,
      summary: AI.verdict.summary,
      findingsLabel: "What the approver check found",
      findings: AI.findings,
      compareLabel: "The evaluation as scored, against the evidence",
      compare,
      compareCols: 4,
      extra: vendorTableHtml() + noteHtml,
      audit: AI.verdict.audit,
      disclaimerText: AI.verdict.disclaimerText,
      actions: actionsHtml(),
    },
    onDone: (body) => {
      // The engine appends `extra` last; the per-vendor table reads first,
      // as it does on the evaluator panel, so lift it above the findings.
      const vsec = body.querySelector(".ai-vsec");
      const firstSec = body.querySelector(".ww-ai-sec");
      if (vsec && firstSec && vsec !== firstSec) body.insertBefore(vsec, firstSec);

      const approveBtn = body.querySelector('[data-act="approve"]');
      const sendBtn = body.querySelector('[data-act="send-back"]');

      const markDecided = (d) => {
        if (approveBtn) {
          approveBtn.disabled = true;
          approveBtn.textContent = d === "approved" ? "Approved as scored" : "Approve as scored";
        }
        if (sendBtn) {
          sendBtn.disabled = true;
          sendBtn.innerHTML = d === "rejected" ? "<span>Sent back · note recorded</span>" : "<span>Send back with this note</span>";
        }
      };
      if (typeof opts.onReady === "function") opts.onReady({ markDecided });
      if (!canDecide) return;

      if (sendBtn) sendBtn.addEventListener("click", () => {
        if (sendBtn.disabled) return;
        const ok = typeof opts.onSendBack === "function" && opts.onSendBack(AI.sendBackNote);
        // The note is now in the decision card; sending it is the approver's
        // click, not ours. Say where it went rather than pretending it left.
        sendBtn.innerHTML = ok
          ? "<span>Note added · press Send back to confirm</span>"
          : "<span>Could not reach the decision card</span>";
      });

      if (approveBtn) approveBtn.addEventListener("click", () => {
        if (approveBtn.disabled || approveBtn.dataset.busy) return;
        // Approving over the AI's own recommendation is the riskier half of
        // the pair, so it takes a second, deliberate click.
        if (AI.verdict.verdict !== "yes" && !approveBtn.dataset.armed) {
          approveBtn.dataset.armed = "1";
          approveBtn.textContent = "Approve over the flag? Click to confirm";
          setTimeout(() => {
            if (approveBtn.dataset.armed && !approveBtn.dataset.busy) {
              delete approveBtn.dataset.armed;
              approveBtn.textContent = "Approve as scored";
            }
          }, 4000);
          return;
        }
        delete approveBtn.dataset.armed;
        approveBtn.dataset.busy = "1";
        approveBtn.disabled = true;
        approveBtn.textContent = "Approving…";
        Promise.resolve(typeof opts.onApprove === "function" ? opts.onApprove(AI.approveNote) : false)
          .then((ok) => {
            delete approveBtn.dataset.busy;
            if (ok) { markDecided("approved"); return; }
            approveBtn.disabled = false;
            approveBtn.textContent = "Could not approve · use the decision card";
          });
      });
    },
  };
}

export default buildTechApprovePlan;
