/* eslint-disable */
/**
 * AI Technical Evaluator — the prototype's panel, carried across intact.
 *
 * Almost all of the analysis lives in the fixture (`ARC_DATA.ai`): the steps,
 * the verdict, the findings and the quality factors are the signed-off copy.
 * Only the per-vendor recommendation table is built here, exactly as the
 * prototype builds it.
 *
 * Dropped: the prototype's onDone wiring, which reached into its own matrix to
 * write marks. The real TechnicalStage owns the cells, so applying marks is
 * left to the host screen.
 *
 * Ported from workwise-ai-prototypes/ai_tech_eval/app.js
 */
import "../data/techEval";

  var ICON_SPARK = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';

export function buildTechEvalPlan() {
  var AV_CLASSES = ['av-1', 'av-2', 'av-3', 'av-4', 'av-5', 'av-6'];
  const D = window.ARC_DATA;
  const AI = D.ai;
  const CL = D.clauses;
  const VN = D.vendors;
  const esc = window.WWAi.esc;
  const MIN_PASS = D.minPass;
  var K = function (vk, cid) { return vk + '|' + cid; };

    function vendorTableHtml() {
      var rows = VN.map(function (v) {
        var vk = v.vendor_alias_key;
        var sc = suggestedScore(vk);
        var g = suggestedGates(vk);
        var gateOk = g.passed === g.total;
        var meta = AI.vendorNotes[vk];
        var qual = gateOk && sc >= MIN_PASS;
        return '<tr>' +
          '<td>' +
            '<div class="ai-vname"><span class="v-av ' + vendorAvClass(vk) + '">' + vendorInitials(v.vendor_alias) + '</span>' +
            '<span><span class="ai-vlabel">' + esc(v.vendor_alias) + '</span>' +
            '<span class="ai-vnote">' + esc(meta.note) + '</span></span></div>' +
          '</td>' +
          '<td class="num"><span class="ai-vscore ' + (qual ? 'pass' : 'fail') + '">' + sc + '</span><span class="ai-vmax">/100</span></td>' +
          '<td class="num"><span class="ai-gate ' + (gateOk ? 'ok' : 'bad') + '">' + g.passed + ' / ' + g.total + '</span> passed</td>' +
          '<td class="num"><span class="mono">' + meta.confidence + '%</span></td>' +
          '<td><span class="ww-ai-badge ' + meta.badge + '"><span class="bdot"></span>' + esc(meta.badgeText) + '</span></td>' +
        '</tr>';
      }).join('');
  
      return '<div class="ww-ai-sec ai-vsec">' +
        '<div class="ww-ai-sec-label">Per-vendor recommendation · marks are proposals</div>' +
        '<div class="ai-vtable-wrap"><table class="ai-vtable">' +
          '<thead><tr><th>Vendor</th><th class="num">Proposed</th><th class="num">Mandatory gates</th><th class="num">Confidence</th><th>Verdict</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table></div></div>';
    }
  
    function suggestedScore(vk) {
      return CL.reduce(function (s, c) {
        var sg = AI.suggestions[K(vk, c.id)];
        return s + (sg ? sg.mark : 0);
      }, 0);
    }
  
    function suggestedGates(vk) {
      var gates = CL.filter(function (c) { return c.is_mandatory; });
      var passed = gates.filter(function (c) {
        var sg = AI.suggestions[K(vk, c.id)];
        return sg && sg.verdict === true;
      }).length;
      return { total: gates.length, passed: passed };
    }
  
    function vendorAvClass(k) { return AV_CLASSES[Math.abs(Number(k) || 0) % AV_CLASSES.length]; }
    function vendorInitials(name) {
      var p = String(name || '').trim().split(/\s+/);
      return ((p[0] || '').charAt(0) + (p[1] || '').charAt(0)).toUpperCase() || 'VN';
    }
  
    function vendorInitials(name) {
      var p = String(name || '').trim().split(/\s+/);
      return ((p[0] || '').charAt(0) + (p[1] || '').charAt(0)).toUpperCase() || 'VN';
    }

  return {
    steps: AI.steps,
    result: {
      verdict: AI.verdict.verdict,
      headline: AI.verdict.headline,
      confidence: AI.verdict.confidence,
      summary: AI.verdict.summary,
      findingsLabel: 'What the evaluator found in the documents',
      findings: AI.findings,
      factorsLabel: 'Submission quality across the item',
      factors: AI.factors,
      extra: vendorTableHtml(),
      audit: AI.verdict.audit,
      disclaimerText: AI.verdict.disclaimerText,
      actions:
        '<button type="button" class="ww-ai-run ghost" id="aiApplyClean">Keep my marks</button>' +
        '<button type="button" class="ww-ai-run" id="aiApplyAll">' + ICON_SPARK +
          '<span>Apply all suggested marks</span></button>'
    },
    onDone: function (body) {
      // The engine appends `extra` after the factor bars; the per-vendor
      // recommendation reads first, so lift it above the findings list.
      var vsec = body.querySelector('.ai-vsec');
      var firstSec = body.querySelector('.ww-ai-sec');
      if (vsec && firstSec && vsec !== firstSec) body.insertBefore(vsec, firstSec);
    }
  };
}

export default buildTechEvalPlan;
