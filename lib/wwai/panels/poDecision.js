/* eslint-disable */
/**
 * AI approval queue + AI decision memo — the prototype's two PO panels.
 * The triage call per order, the four checks, the scoring breakdown and the
 * "what would change this verdict" note are the signed-off copy.
 *
 * Ported from workwise-ai-prototypes/ai_po_decision/app.js
 */
import "../data/poDecision";



export function buildPoDecisionQueuePlan() {
  var BADGE = {
    yes:       { cls: 'v-yes',       label: 'Approve' },
    attention: { cls: 'v-attention', label: 'Review' },
    no:        { cls: 'v-no',        label: 'Hold' },
    pending:   { cls: 'v-pending',   label: '—' }
  };
  const D = window.WWData;
  const AI = window.WWAi;
  const inr = D.inr;
  // The prototype navigated to its own detail.html; inside the portal the
  // same gesture opens the real PO detail screen.
  const go = (po) => { window.location.href = '/dashboard/buyer/purchase-orders/' + po; };
    function badge(kind, title) {
      var b = BADGE[kind] || BADGE.pending;
      return '<span class="ww-ai-badge ' + b.cls + '"' +
             (title ? ' title="' + esc(title) + '"' : '') +
             '><span class="bdot"></span>' + b.label + '</span>';
    }
  const esc = AI.esc;
    function queuePlan() {
      var q = D.QUEUE;
      var rows = q.triage.map(function (t) {
        return '<button type="button" class="ww-ai-triage-row" data-po="' + t.po + '">' +
          badge(t.verdict) +
          '<span class="tpo mono">#' + t.po + '</span>' +
          '<span class="tv">' + esc(t.vendor) + '</span>' +
          '<span class="tl">' + esc(t.line) + '</span>' +
          '<span class="ta mono">' + inr(t.amount) + '</span>' +
        '</button>';
      }).join('');
  
      var r = q.result;
      return {
        steps: q.steps,
        result: {
          verdict: r.verdict, headline: r.headline, confidence: r.confidence, summary: r.summary,
          findingsLabel: r.findingsLabel, findings: r.findings,
          compareLabel: r.compareLabel, compare: r.compare, compareCols: r.compareCols,
          extra: AI.section('The queue, PO by PO', '<div class="ww-ai-triage">' + rows + '</div>'),
          audit: r.audit,
          actions: '<button type="button" class="ww-ai-run" data-act="open-clear">Review the 3 clear POs</button>' +
                   '<button type="button" class="ww-ai-run ghost" data-act="export">Export triage</button>'
        },
        onDone: function (body) {
          body.querySelectorAll('.ww-ai-triage-row').forEach(function (b) {
            b.addEventListener('click', function () { go(b.getAttribute('data-po')); });
          });
          var open = body.querySelector('[data-act="open-clear"]');
          if (open) open.addEventListener('click', function () { go('108209'); });
          var exp = body.querySelector('[data-act="export"]');
          if (exp) exp.addEventListener('click', function () {
            exp.textContent = 'Triage exported';
            setTimeout(function () { exp.textContent = 'Export triage'; }, 2200);
          });
        }
      };
    }
  
    function memoPlan(d, v) {
      var r = v.result;
      var extra =
        AI.section('Vendor risk', AI.renderFindings(r.vendorFindings)) +
        AI.section('Technical & document check', AI.renderFindings(r.techFindings)) +
        AI.section('Process integrity', AI.renderFindings(r.processFindings)) +
        AI.section('Scoring breakdown', AI.renderFactors(r.factors)) +
        AI.section('What would change this verdict', '<div class="ww-ai-change">' + r.change + '</div>');
  
      return {
        steps: v.steps,
        result: {
          verdict: r.verdict, headline: r.headline, confidence: r.confidence, summary: r.summary,
          findingsLabel: r.findingsLabel, findings: r.findings,
          compareLabel: r.compareLabel, compare: r.compare, compareCols: r.compareCols,
          extra: extra,
          audit: r.audit,
          actions: '<button type="button" class="ww-ai-run" data-act="approve">Approve with AI note</button>' +
                   '<button type="button" class="ww-ai-run ghost" data-act="override">Override</button>'
        },
        onDone: function (body) {

          var ap = body.querySelector('[data-act="approve"]');
          if (ap) ap.addEventListener('click', function () {
            ap.disabled = true;
            ap.textContent = r.verdict === 'no' ? 'Blocked — see the memo' : 'Approved · AI note attached';
          });
          var ov = body.querySelector('[data-act="override"]');
          if (ov) ov.addEventListener('click', function () {
            ov.textContent = 'Override logged';
            setTimeout(function () { ov.textContent = 'Override'; }, 2200);
          });
        }
      };
    }
  return queuePlan();
}

/**
 * @param {string} [poNumber] defaults to the fixture's own PO, which is the
 *   same order the golden thread ends on.
 */
export function buildPoDecisionMemoPlan(poNumber) {
  var BADGE = {
    yes:       { cls: 'v-yes',       label: 'Approve' },
    attention: { cls: 'v-attention', label: 'Review' },
    no:        { cls: 'v-no',        label: 'Hold' },
    pending:   { cls: 'v-pending',   label: '—' }
  };
  const D = window.WWData;
  const AI = window.WWAi;
  const inr = D.inr;
  // The prototype navigated to its own detail.html; inside the portal the
  // same gesture opens the real PO detail screen.
  const go = (po) => { window.location.href = '/dashboard/buyer/purchase-orders/' + po; };
    function badge(kind, title) {
      var b = BADGE[kind] || BADGE.pending;
      return '<span class="ww-ai-badge ' + b.cls + '"' +
             (title ? ' title="' + esc(title) + '"' : '') +
             '><span class="bdot"></span>' + b.label + '</span>';
    }
  const esc = AI.esc;
    function queuePlan() {
      var q = D.QUEUE;
      var rows = q.triage.map(function (t) {
        return '<button type="button" class="ww-ai-triage-row" data-po="' + t.po + '">' +
          badge(t.verdict) +
          '<span class="tpo mono">#' + t.po + '</span>' +
          '<span class="tv">' + esc(t.vendor) + '</span>' +
          '<span class="tl">' + esc(t.line) + '</span>' +
          '<span class="ta mono">' + inr(t.amount) + '</span>' +
        '</button>';
      }).join('');
  
      var r = q.result;
      return {
        steps: q.steps,
        result: {
          verdict: r.verdict, headline: r.headline, confidence: r.confidence, summary: r.summary,
          findingsLabel: r.findingsLabel, findings: r.findings,
          compareLabel: r.compareLabel, compare: r.compare, compareCols: r.compareCols,
          extra: AI.section('The queue, PO by PO', '<div class="ww-ai-triage">' + rows + '</div>'),
          audit: r.audit,
          actions: '<button type="button" class="ww-ai-run" data-act="open-clear">Review the 3 clear POs</button>' +
                   '<button type="button" class="ww-ai-run ghost" data-act="export">Export triage</button>'
        },
        onDone: function (body) {
          body.querySelectorAll('.ww-ai-triage-row').forEach(function (b) {
            b.addEventListener('click', function () { go(b.getAttribute('data-po')); });
          });
          var open = body.querySelector('[data-act="open-clear"]');
          if (open) open.addEventListener('click', function () { go('108209'); });
          var exp = body.querySelector('[data-act="export"]');
          if (exp) exp.addEventListener('click', function () {
            exp.textContent = 'Triage exported';
            setTimeout(function () { exp.textContent = 'Export triage'; }, 2200);
          });
        }
      };
    }
  
    function memoPlan(d, v) {
      var r = v.result;
      var extra =
        AI.section('Vendor risk', AI.renderFindings(r.vendorFindings)) +
        AI.section('Technical & document check', AI.renderFindings(r.techFindings)) +
        AI.section('Process integrity', AI.renderFindings(r.processFindings)) +
        AI.section('Scoring breakdown', AI.renderFactors(r.factors)) +
        AI.section('What would change this verdict', '<div class="ww-ai-change">' + r.change + '</div>');
  
      return {
        steps: v.steps,
        result: {
          verdict: r.verdict, headline: r.headline, confidence: r.confidence, summary: r.summary,
          findingsLabel: r.findingsLabel, findings: r.findings,
          compareLabel: r.compareLabel, compare: r.compare, compareCols: r.compareCols,
          extra: extra,
          audit: r.audit,
          actions: '<button type="button" class="ww-ai-run" data-act="approve">Approve with AI note</button>' +
                   '<button type="button" class="ww-ai-run ghost" data-act="override">Override</button>'
        },
        onDone: function (body) {

          var ap = body.querySelector('[data-act="approve"]');
          if (ap) ap.addEventListener('click', function () {
            ap.disabled = true;
            ap.textContent = r.verdict === 'no' ? 'Blocked — see the memo' : 'Approved · AI note attached';
          });
          var ov = body.querySelector('[data-act="override"]');
          if (ov) ov.addEventListener('click', function () {
            ov.textContent = 'Override logged';
            setTimeout(function () { ov.textContent = 'Override'; }, 2200);
          });
        }
      };
    }
  const po = String(poNumber || D.DEFAULT_PO);
  const d = D.DETAIL[po] || D.DETAIL[D.DEFAULT_PO];
  const v = D.VERDICTS[po] || D.VERDICTS[D.DEFAULT_PO];
  return memoPlan(d, v);
}

