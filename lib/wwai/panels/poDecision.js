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
      // The prototype's button said "Review the 3 clear POs" over a queue with
      // two. It now counts them, and opens the first.
      var clear = q.triage.filter(function (t) { return t.verdict === 'yes'; });
      return {
        steps: q.steps,
        result: {
          verdict: r.verdict, headline: r.headline, confidence: r.confidence, summary: r.summary,
          findingsLabel: r.findingsLabel, findings: r.findings,
          compareLabel: r.compareLabel, compare: r.compare, compareCols: r.compareCols,
          extra: AI.section('The queue, PO by PO', '<div class="ww-ai-triage">' + rows + '</div>'),
          audit: r.audit,
          actions: '<button type="button" class="ww-ai-run" data-act="open-clear">Review the ' + clear.length + ' clear PO' + (clear.length === 1 ? '' : 's') + '</button>' +
                   '<button type="button" class="ww-ai-run ghost" data-act="export">Export triage</button>'
        },
        onDone: function (body) {
          body.querySelectorAll('.ww-ai-triage-row').forEach(function (b) {
            b.addEventListener('click', function () { go(b.getAttribute('data-po')); });
          });
          var open = body.querySelector('[data-act="open-clear"]');
          if (open) open.addEventListener('click', function () { if (clear[0]) go(clear[0].po); });
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
 * @param {string} [poNumber] defaults to the fixture's own PO, #108215 — the
 *   stand demo's "approve with two conditions" order.
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
      // The prototype's button said "Review the 3 clear POs" over a queue with
      // two. It now counts them, and opens the first.
      var clear = q.triage.filter(function (t) { return t.verdict === 'yes'; });
      return {
        steps: q.steps,
        result: {
          verdict: r.verdict, headline: r.headline, confidence: r.confidence, summary: r.summary,
          findingsLabel: r.findingsLabel, findings: r.findings,
          compareLabel: r.compareLabel, compare: r.compare, compareCols: r.compareCols,
          extra: AI.section('The queue, PO by PO', '<div class="ww-ai-triage">' + rows + '</div>'),
          audit: r.audit,
          actions: '<button type="button" class="ww-ai-run" data-act="open-clear">Review the ' + clear.length + ' clear PO' + (clear.length === 1 ? '' : 's') + '</button>' +
                   '<button type="button" class="ww-ai-run ghost" data-act="export">Export triage</button>'
        },
        onDone: function (body) {
          body.querySelectorAll('.ww-ai-triage-row').forEach(function (b) {
            b.addEventListener('click', function () { go(b.getAttribute('data-po')); });
          });
          var open = body.querySelector('[data-act="open-clear"]');
          if (open) open.addEventListener('click', function () { if (clear[0]) go(clear[0].po); });
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

            // The same note the phone's approve sheet pre-fills, so either
            // route records the memo's own words.
            var note = r.approvalNote ||
                       ('Approved on the AI decision memo: ' + (r.headline || '') +
                        (r.confidence != null ? ' (confidence ' + r.confidence + '%).' : '.'));

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


/* ── per-PO reads for the React screens ─────────────────────────────
   The PO table's AI call column and the phone's pinned decision bar read the
   same pre-authored verdicts the two panels narrate, so a badge on the table,
   a row in the triage and the memo's headline cannot disagree. */
const AI_CALL = {
  yes:       { cls: 'v-yes',       label: 'Approve' },
  attention: { cls: 'v-attention', label: 'Review' },
  no:        { cls: 'v-no',        label: 'Hold' },
};

const fixture = () => (typeof window !== 'undefined' ? window : globalThis).WWData_poDecision;

/** Whether a decision memo has been written for this PO. */
export function hasPoMemo(poNumber) {
  const D = fixture();
  return !!(D && D.VERDICTS[String(poNumber)]);
}

/**
 * The AI's call on one PO: { verdict, cls, label, note, headline, confidence },
 * or null when the queue has no verdict for it (a PO raised during the demo).
 */
export function poAiCall(poNumber) {
  const D = fixture();
  if (!D) return null;
  const t = D.QUEUE.triage.find((x) => x.po === String(poNumber));
  if (!t) return null;
  const v = D.VERDICTS[t.po];
  return {
    verdict: t.verdict,
    ...AI_CALL[t.verdict],
    note: t.note,
    headline: v ? v.result.headline : null,
    confidence: v ? v.result.confidence : null,
  };
}

/** The approval note the memo writes for this PO — what the approver signs with. */
export function poApprovalNote(poNumber) {
  const D = fixture();
  const v = D && D.VERDICTS[String(poNumber)];
  return v ? v.result.approvalNote || '' : '';
}
