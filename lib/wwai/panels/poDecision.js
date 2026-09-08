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
  const D = window.WWData_poDecision;
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
          if (open) open.addEventListener('click', function () { go('108215'); });
          var exp = body.querySelector('[data-act="export"]');
          if (exp) exp.addEventListener('click', function () {
            exp.textContent = 'Triage exported';
            setTimeout(function () { exp.textContent = 'Export triage'; }, 2200);
          });
        }
      };
    }
  
    // DEAD: this builder always returns queuePlan() below. The memo the PO
    // detail screen actually renders is the copy in buildPoDecisionMemoPlan —
    // fix that one.
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
  const D = window.WWData_poDecision;
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
          if (open) open.addEventListener('click', function () { go('108215'); });
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
        // The prototype's button only relabelled itself, because in the
        // prototype there was no purchase order to approve. Inside the portal
        // there is: this is the same approval the Approve button on the screen
        // performs, with the memo's own verdict recorded as the remark.
        onDone: function (body) {

          var ap = body.querySelector('[data-act="approve"]');
          if (ap) ap.addEventListener('click', function () {
            if (ap.dataset.busy || ap.dataset.done) return;

            // A memo that says hold is not an approval route.
            if (r.verdict === 'no') {
              ap.disabled = true;
              ap.dataset.done = '1';
              ap.textContent = 'Blocked — see the memo';
              return;
            }

            ap.dataset.busy = '1';
            ap.disabled = true;
            ap.textContent = 'Approving\u2026';

            var note = 'Approved on the AI decision memo: ' + (r.headline || '') +
                       (r.confidence != null ? ' (confidence ' + r.confidence + '%).' : '.');

            var finish = function (ok, why) {
              delete ap.dataset.busy;
              if (!ok) {
                ap.disabled = false;
                ap.textContent = why || 'Could not approve — use the Approve button above';
                return;
              }
              ap.dataset.done = '1';
              ap.textContent = 'Approved \u00b7 AI note attached';
              // The screen behind the panel still shows the old status, so
              // bring it in line rather than leaving two truths on one page.
              setTimeout(function () { window.location.reload(); }, 1100);
            };

            if (!window.WWApi) return finish(false);
            window.WWApi
              .post('/po/approve/' + po, { type: 'approval', decision: 'approved', remarks: note })
              .then(function (res) {
                var d = res && res.data ? res.data : res;
                finish(!d || d.status !== 2, d && d.status === 2 ? d.message : null);
              })
              .catch(function () { finish(false); });
          });
          // Override is the approver disagreeing with the memo, so it takes
          // the OPPOSITE decision and says so in the audit trail. It used to
          // flash 'Override logged' and forget, which recorded nothing at all.
          // Two clicks, because this is the destructive half of the pair.
          var ov = body.querySelector('[data-act="override"]');
          if (ov) ov.addEventListener('click', function () {
            if (ov.dataset.busy || ov.dataset.done) return;

            var holding = r.verdict === 'no';
            var decision = holding ? 'approved' : 'rejected';

            if (!ov.dataset.armed) {
              ov.dataset.armed = '1';
              ov.textContent = holding
                ? 'Approve anyway — click to confirm'
                : 'Reject instead — click to confirm';
              setTimeout(function () {
                if (ov.dataset.armed && !ov.dataset.busy) {
                  delete ov.dataset.armed;
                  ov.textContent = 'Override';
                }
              }, 4000);
              return;
            }

            delete ov.dataset.armed;
            ov.dataset.busy = '1';
            ov.textContent = holding ? 'Approving\u2026' : 'Rejecting\u2026';

            var why = 'Override \u2014 the approver did not take the AI recommendation (' +
                      (r.headline || '') + ').';

            var settle = function (ok) {
              delete ov.dataset.busy;
              if (!ok) {
                ov.textContent = 'Could not record \u2014 use the buttons above';
                return;
              }
              ov.dataset.done = '1';
              ov.textContent = holding ? 'Approved over the memo' : 'Rejected over the memo';
              setTimeout(function () { window.location.reload(); }, 1100);
            };

            if (!window.WWApi) return settle(false);
            window.WWApi
              .post('/po/approve/' + po, { type: 'approval', decision: decision, remarks: why })
              .then(function (res) {
                var d = res && res.data ? res.data : res;
                settle(!d || d.status !== 2);
              })
              .catch(function () { settle(false); });
          });
        }
      };
    }
  const po = String(poNumber || D.DEFAULT_PO);
  const d = D.DETAIL[po] || D.DETAIL[D.DEFAULT_PO];
  const v = D.VERDICTS[po] || D.VERDICTS[D.DEFAULT_PO];
  return memoPlan(d, v);
}

