/* ═══════════════════════════════════════════════════════════════════
   Workwise · ARC Technical Evaluation + AI Technical Evaluator
   Renders the blind evaluation matrix from data.js, keeps the scoring
   math authoritative, and wires the AI layer on top of it.

   Scoring rules (identical to TechnicalStage.js):
     score      = round(Σ marks / Σ weights × 100)
     qualified  = score ≥ minimum_passing_score
                  AND every mandatory clause judged Pass
     fully eval = every clause marked AND every mandatory clause judged
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var D = window.ARC_DATA;
  var AI = D.ai;
  var CL = D.clauses;
  var VN = D.vendors;
  var MIN_PASS = D.minPass;

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── state ──────────────────────────────────────────────────────── */
  var marks   = {};   // `${vk}|${cid}` -> number
  var verdicts = {};  // `${vk}|${cid}` -> true | false
  var applied = false;

  var K = function (vk, cid) { return vk + '|' + cid; };

  /* ── helpers mirrored from the product ──────────────────────────── */
  var AV_CLASSES = ['av-1', 'av-2', 'av-3', 'av-4', 'av-5', 'av-6'];
  function vendorAvClass(k) { return AV_CLASSES[Math.abs(Number(k) || 0) % AV_CLASSES.length]; }
  function vendorInitials(name) {
    var p = String(name || '').trim().split(/\s+/);
    return ((p[0] || '').charAt(0) + (p[1] || '').charAt(0)).toUpperCase() || 'VN';
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function clauseById(cid) {
    for (var i = 0; i < CL.length; i++) if (CL[i].id === cid) return CL[i];
    return null;
  }
  function responseFor(vk, cid) {
    for (var i = 0; i < D.responses.length; i++) {
      var r = D.responses[i];
      if (Number(r.vendor_alias_key) === Number(vk) && r.clause_id === cid) return r;
    }
    return null;
  }

  /* ── scoring math ───────────────────────────────────────────────── */
  var MAX_MARKS = CL.reduce(function (s, c) { return s + c.weight; }, 0) || 100;

  function markOf(vk, cid) {
    var k = K(vk, cid);
    return k in marks ? marks[k] : null;
  }
  function verdictOf(vk, cid) {
    var k = K(vk, cid);
    return k in verdicts ? verdicts[k] : null;
  }
  function vendorTotal(vk) {
    return CL.reduce(function (s, c) {
      var m = markOf(vk, c.id);
      return s + (m == null ? 0 : Number(m));
    }, 0);
  }
  function vendorScore(vk) {
    return MAX_MARKS ? Math.round((vendorTotal(vk) / MAX_MARKS) * 100) : 0;
  }
  function evaluatedCount(vk) {
    return CL.filter(function (c) { return markOf(vk, c.id) != null; }).length;
  }
  function mandatoryUnjudged(vk) {
    return CL.some(function (c) { return c.is_mandatory && verdictOf(vk, c.id) == null; });
  }
  function mandatoryBlocked(vk) {
    return CL.some(function (c) { return c.is_mandatory && verdictOf(vk, c.id) !== true; });
  }
  function mandatoryFailed(vk) {
    return CL.some(function (c) { return c.is_mandatory && verdictOf(vk, c.id) === false; });
  }
  function fullyEvaluated(vk) {
    return evaluatedCount(vk) === CL.length && !mandatoryUnjudged(vk);
  }
  function qualified(vk) {
    if (mandatoryBlocked(vk)) return false;
    return vendorScore(vk) >= Number(MIN_PASS);
  }
  function verdictClass(vk) {
    if (!fullyEvaluated(vk)) return 'pending';
    return qualified(vk) ? 'pass' : 'fail';
  }

  /* ── icons ──────────────────────────────────────────────────────── */
  var ICON_SPARK = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>';

  /* ═══════════════════════════════════════════════════════════════
     RENDER · item tabs
     ═══════════════════════════════════════════════════════════════ */
  function renderItemTabs() {
    var host = document.getElementById('itemTabs');
    var html = '<span class="lbl">Item</span>';
    D.items.forEach(function (it) {
      var active = it.id === D.activeItemId;
      html += '<button type="button" class="item-tab' + (active ? ' is-active' : '') + '">' +
                '<span>' + esc(it.name) + '</span>' +
                '<span class="it-code">' + esc(it.slug) + '</span>' +
                '<span class="it-state ' + (active ? (allDone() ? 'done' : 'pending') : it.state) + '"></span>' +
              '</button>';
    });
    host.innerHTML = html;
  }

  function allDone() {
    return VN.every(function (v) { return fullyEvaluated(v.vendor_alias_key); });
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER · min-score banner
     ═══════════════════════════════════════════════════════════════ */
  function renderBanner() {
    var item = D.items.filter(function (i) { return i.id === D.activeItemId; })[0];
    document.getElementById('msBanner').innerHTML =
      'Item: <strong>' + esc(item.name) + '</strong> · Minimum passing score: <strong>' +
      MIN_PASS + '%</strong> · Max marks: <strong><span class="mono">' + MAX_MARKS +
      '</span></strong> · ' + CL.length + ' clauses';
  }

  /* ═══════════════════════════════════════════════════════════════
     RENDER · evaluation matrix
     ═══════════════════════════════════════════════════════════════ */
  function vendorHeadHtml(v) {
    var vk = v.vendor_alias_key;
    var vc = verdictClass(vk);
    var fully = fullyEvaluated(vk);
    var disqBadge = (fully && !qualified(vk) && mandatoryFailed(vk))
      ? '<div class="disq-badge" style="margin-top: 4px; font-size: 10px; font-weight: 700; color: #b91c1c; background: #fee2e2; border: 1px solid #fecaca; border-radius: 999px; padding: 1px 8px; display: inline-block;">Disqualified · failed mandatory clause</div>'
      : '';
    return '<div class="vh-top">' +
             '<div class="v-av ' + vendorAvClass(vk) + '">' + vendorInitials(v.vendor_alias) + '</div>' +
             '<div class="v-code">' + esc(v.vendor_alias) + '</div>' +
           '</div>' +
           '<div class="v-score-row">' +
             '<span class="v-score ' + vc + '">' + (fully ? vendorScore(vk) : '—') + '</span>' +
             '<span class="v-score-max">/100</span>' +
             '<span class="v-verdict ' + vc + '">' +
               (fully ? (qualified(vk) ? 'Qualified' : 'Not qualified') : 'In progress') +
             '</span>' +
           '</div>' +
           disqBadge +
           '<div class="v-pass-line">Min <span class="mono">' + MIN_PASS +
             '%</span> · evaluated <span class="mono">' + evaluatedCount(vk) + '/' + CL.length + '</span></div>';
  }

  function verdictBtnStyle(kind, selected) {
    var on = kind === 'pass'
      ? { b: '#047857', bg: '#ecfdf5', c: '#047857' }
      : { b: '#b91c1c', bg: '#fef2f2', c: '#b91c1c' };
    return 'font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 6px; cursor: pointer;' +
           ' border: 1px solid ' + (selected ? on.b : 'var(--border-input, #d1d5db)') + ';' +
           ' background: ' + (selected ? on.bg : 'white') + ';' +
           ' color: ' + (selected ? on.c : 'var(--fg-3, #6b7280)') + ';';
  }

  function assistHtml(vk, cid) {
    var s = AI.suggestions[K(vk, cid)];
    if (!s) return '';
    var cl = clauseById(cid);
    var label = 'AI · ' + s.mark + ' / ' + cl.weight;
    if (cl.is_mandatory) label += ' · gate ' + (s.verdict ? 'pass' : 'fail');
    return '<div class="ai-assist" data-vk="' + vk + '" data-cid="' + cid + '">' +
             '<span class="ww-ai-badge ' + s.tone + '"><span class="bdot"></span>' + label + '</span>' +
             '<span class="ai-why">' + esc(s.why) + '</span>' +
             '<button type="button" class="ai-use" data-vk="' + vk + '" data-cid="' + cid + '">Use</button>' +
           '</div>';
  }

  function cellHtml(v, cl) {
    var vk = v.vendor_alias_key;
    var resp = responseFor(vk, cl.id);
    var m = markOf(vk, cl.id);
    var vd = verdictOf(vk, cl.id);
    var fully = fullyEvaluated(vk);
    var disq = fully && !qualified(vk);

    var files = '';
    if (resp && resp.files && resp.files.length) {
      files = '<div style="display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0px 2px;">' +
        resp.files.map(function (f) {
          return '<a href="#" title="' + esc(f.name) + ' · ' + f.pages + ' pages" ' +
                 'style="font-size: 11px; color: var(--accent, #1d4ed8); background: var(--accent-soft, #eff6ff); border: 1px solid #bfdbfe; border-radius: 6px; padding: 2px 7px; text-decoration: none;">' +
                 'Evidence #' + f.file_id + '</a>';
        }).join('') + '</div>';
    }

    var verdictBlock = '';
    if (cl.is_mandatory) {
      verdictBlock =
        '<div style="margin-bottom: 6px;">' +
          '<div class="mark-label">Pass / Fail (mandatory)</div>' +
          '<div style="display: inline-flex; gap: 6px; margin-top: 3px;">' +
            '<button type="button" class="vbtn vbtn-pass" data-vk="' + vk + '" data-cid="' + cl.id + '" style="' + verdictBtnStyle('pass', vd === true) + '">Pass</button>' +
            '<button type="button" class="vbtn vbtn-fail" data-vk="' + vk + '" data-cid="' + cl.id + '" style="' + verdictBtnStyle('fail', vd === false) + '">Fail</button>' +
          '</div>' +
        '</div>';
    }

    return '<td class="score-cell' + (disq ? ' is-disq' : '') + '" id="cell-' + vk + '-' + cl.id + '">' +
      '<div class="resp">' +
        '<div class="response-text"><span>' + esc(resp ? resp.text : 'No response submitted') + '</span></div>' +
        files +
        '<div class="mark-block">' +
          assistHtml(vk, cl.id) +
          verdictBlock +
          '<div class="mark-label">Your marks</div>' +
          '<div class="mark-entry">' +
            '<input type="number" max="' + cl.weight + '" min="0" placeholder="' + cl.weight + '"' +
              ' class="mark-input' + (m != null ? ' filled' : '') + '"' +
              ' data-vk="' + vk + '" data-cid="' + cl.id + '"' +
              ' value="' + (m == null ? '' : m) + '">' +
            '<span class="of-max">/ <span>' + cl.weight + '</span></span>' +
            '<span class="mark-hint' + (m != null ? ' done' : '') + '">' + (m != null ? '✓ scored' : 'pending') + '</span>' +
          '</div>' +
          '<textarea class="remark-input" placeholder="Optional remark"></textarea>' +
        '</div>' +
      '</div>' +
    '</td>';
  }

  function renderMatrix() {
    var html = '<table class="eval-table"><thead><tr>' +
      '<th class="col-clause"><div class="clause-head">Clause &amp; weight</div></th>';
    VN.forEach(function (v) {
      html += '<th class="ven-head" id="vhead-' + v.vendor_alias_key + '">' + vendorHeadHtml(v) + '</th>';
    });
    html += '</tr></thead><tbody>';

    CL.forEach(function (cl, idx) {
      html += '<tr>' +
        '<td class="col-clause">' +
          '<div class="clause-cell" id="clause-' + cl.id + '">' +
            '<span class="c-num">' + (idx + 1) + '</span>' +
            '<span class="c-text">' + esc(cl.text) + '</span>' +
            '<div class="c-meta">' +
              '<span class="c-weight">weight <span class="mono">' + cl.weight + '</span> marks</span>' +
              '<span class="c-type">' + esc(cl.type) + '</span>' +
              (cl.is_mandatory
                ? '<span class="c-type" style="background: var(--danger-soft, #fee2e2); color: var(--danger, #b91c1c); font-weight: 700;">Mandatory · gate</span>'
                : '') +
            '</div>' +
          '</div>' +
        '</td>';
      VN.forEach(function (v) { html += cellHtml(v, cl); });
      html += '</tr>';
    });

    html += '</tbody></table>';
    document.getElementById('matrixScroll').innerHTML = html;
    bindMatrix();
  }

  /* ═══════════════════════════════════════════════════════════════
     LIVE UPDATES
     ═══════════════════════════════════════════════════════════════ */
  function refreshVendorHeader(vk) {
    var th = document.getElementById('vhead-' + vk);
    if (th) th.innerHTML = vendorHeadHtml(VN.filter(function (v) { return v.vendor_alias_key === vk; })[0]);
  }

  function refreshDisqHatch(vk) {
    var fully = fullyEvaluated(vk);
    var disq = fully && !qualified(vk);
    CL.forEach(function (cl) {
      var td = document.getElementById('cell-' + vk + '-' + cl.id);
      if (!td) return;
      td.classList.toggle('is-disq', disq);
    });
  }

  function refreshCellChrome(vk, cid) {
    var td = document.getElementById('cell-' + vk + '-' + cid);
    if (!td) return;
    var m = markOf(vk, cid);
    var input = td.querySelector('.mark-input');
    var hint = td.querySelector('.mark-hint');
    if (input) input.classList.toggle('filled', m != null);
    if (hint) {
      hint.className = 'mark-hint' + (m != null ? ' done' : '');
      hint.textContent = m != null ? '✓ scored' : 'pending';
    }
    var vd = verdictOf(vk, cid);
    var pass = td.querySelector('.vbtn-pass');
    var fail = td.querySelector('.vbtn-fail');
    if (pass) pass.setAttribute('style', verdictBtnStyle('pass', vd === true));
    if (fail) fail.setAttribute('style', verdictBtnStyle('fail', vd === false));
  }

  function refreshDock() {
    var total = VN.length * CL.length;
    var done = VN.reduce(function (s, v) { return s + evaluatedCount(v.vendor_alias_key); }, 0);
    var pct = total ? Math.round((done / total) * 100) : 0;
    var q = 0, dq = 0, pending = 0;
    VN.forEach(function (v) {
      var c = verdictClass(v.vendor_alias_key);
      if (c === 'pass') q++; else if (c === 'fail') dq++; else pending++;
    });
    document.getElementById('dockLeft').innerHTML =
      '<span class="fs-13 text-fg-2">Scored: <span class="fw-600 text-fg mono">' + done + ' / ' + total + '</span> cells (' + pct + '%)</span>' +
      '<span class="text-fg-4">·</span>' +
      '<span class="fs-13"><span class="mono fw-600 text-success">' + q + '</span> qualified</span>' +
      '<span class="fs-13"><span class="mono fw-600 text-danger">' + dq + '</span> not qualified</span>' +
      '<span class="fs-13 text-fg-3"><span class="mono fw-600">' + pending + '</span> pending</span>';

    var btn = document.getElementById('submitEval');
    btn.disabled = !(total > 0 && done === total);

    var dot = document.querySelector('#itemTabs .item-tab.is-active .it-state');
    if (dot) dot.className = 'it-state ' + (allDone() ? 'done' : 'pending');
  }

  function refreshAll() {
    VN.forEach(function (v) {
      refreshVendorHeader(v.vendor_alias_key);
      refreshDisqHatch(v.vendor_alias_key);
    });
    refreshDock();
  }

  /* ═══════════════════════════════════════════════════════════════
     CELL EDITING
     ═══════════════════════════════════════════════════════════════ */
  function setMark(vk, cid, raw, inputEl) {
    var cl = clauseById(cid);
    var k = K(vk, cid);
    if (raw === '' || raw == null) {
      delete marks[k];
    } else {
      var n = Math.max(0, Math.min(cl.weight, Math.round(Number(raw) || 0)));
      marks[k] = n;
      // the product clamps in state and re-renders the input from it, so an
      // over-weight entry snaps back in place rather than lingering on screen
      if (inputEl && String(n) !== String(raw)) inputEl.value = n;
    }
    refreshCellChrome(vk, cid);
    refreshAll();
  }

  function setVerdict(vk, cid, val) {
    verdicts[K(vk, cid)] = val;
    refreshCellChrome(vk, cid);
    refreshAll();
  }

  function bindMatrix() {
    var root = document.getElementById('matrixScroll');

    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.classList && t.classList.contains('mark-input')) {
        setMark(Number(t.dataset.vk), t.dataset.cid, t.value, t);
      }
    });

    root.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('button') : null;
      if (!t) return;
      if (t.classList.contains('vbtn-pass')) setVerdict(Number(t.dataset.vk), t.dataset.cid, true);
      else if (t.classList.contains('vbtn-fail')) setVerdict(Number(t.dataset.vk), t.dataset.cid, false);
      else if (t.classList.contains('ai-use')) useSuggestion(Number(t.dataset.vk), t.dataset.cid, true);
    });

    // evidence chips are demo placeholders — never navigate away
    root.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href="#"]') : null;
      if (a) e.preventDefault();
    });
  }

  /* ── apply one AI suggestion ────────────────────────────────────── */
  function useSuggestion(vk, cid, flash) {
    var s = AI.suggestions[K(vk, cid)];
    if (!s) return;
    marks[K(vk, cid)] = s.mark;
    if (clauseById(cid).is_mandatory) verdicts[K(vk, cid)] = !!s.verdict;

    var td = document.getElementById('cell-' + vk + '-' + cid);
    if (td) {
      var input = td.querySelector('.mark-input');
      if (input) input.value = s.mark;
      var row = td.querySelector('.ai-assist');
      if (row) row.classList.add('is-applied');
      var useBtn = td.querySelector('.ai-use');
      if (useBtn) { useBtn.textContent = 'Applied'; useBtn.disabled = true; }
      if (flash && !reduced) {
        var block = td.querySelector('.mark-block');
        if (block) {
          block.classList.remove('ai-fill-flash');
          void block.offsetWidth;
          block.classList.add('ai-fill-flash');
        }
      }
    }
    refreshCellChrome(vk, cid);
    refreshAll();
  }

  /* ── apply every AI suggestion, staggered ───────────────────────── */
  function applyAll(btn) {
    if (applied) return;
    applied = true;
    if (btn) { btn.disabled = true; btn.innerHTML = ICON_SPARK + '<span>Applying…</span>'; }

    var queue = [];
    CL.forEach(function (cl) {
      VN.forEach(function (v) { queue.push([v.vendor_alias_key, cl.id]); });
    });

    var i = 0;
    var step = reduced ? 0 : 55;
    (function next() {
      if (i >= queue.length) {
        if (btn) btn.innerHTML = ICON_SPARK + '<span>Applied to ' + queue.length + ' cells</span>';
        var first = document.getElementById('cell-2-c4');
        if (first) first.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        return;
      }
      useSuggestion(queue[i][0], queue[i][1], true);
      i++;
      if (step) setTimeout(next, step); else next();
    })();
  }

  /* ═══════════════════════════════════════════════════════════════
     AI PANEL
     ═══════════════════════════════════════════════════════════════ */
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

  function buildPlan() {
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
          '<button type="button" class="ww-ai-run" id="aiApplyAll">' + ICON_SPARK + '<span>Apply all suggested marks</span></button>'
      },
      onDone: function (body) {
        // The engine appends `extra` after the factor bars; the per-vendor
        // recommendation reads first, so lift it above the findings list.
        var vsec = body.querySelector('.ai-vsec');
        var firstSec = body.querySelector('.ww-ai-sec');
        if (vsec && firstSec && vsec !== firstSec) body.insertBefore(vsec, firstSec);

        var apply = body.querySelector('#aiApplyAll');
        if (apply) apply.addEventListener('click', function () { applyAll(apply); });
        if (applied && apply) {
          apply.disabled = true;
          apply.innerHTML = ICON_SPARK + '<span>Applied to ' + (VN.length * CL.length) + ' cells</span>';
        }
        var keep = body.querySelector('#aiApplyClean');
        if (keep) keep.addEventListener('click', function () {
          keep.disabled = true;
          keep.textContent = 'Marks left untouched';
        });
      }
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     BOOT
     ═══════════════════════════════════════════════════════════════ */
  renderItemTabs();
  renderBanner();
  renderMatrix();
  refreshDock();

  window.WWAi.attach(document.getElementById('aiPanel'), buildPlan);

  // item tabs are single-item in this prototype — keep the click honest
  document.getElementById('itemTabs').addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.item-tab') : null;
    if (!b || b.classList.contains('is-active')) return;
    b.blur();
  });

  document.getElementById('submitEval').addEventListener('click', function () {
    var t = document.createElement('div');
    t.className = 'arc-toast';
    t.innerHTML = '<span class="t-ic">✓</span><span>Evaluation submitted for technical approval</span>';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  });

  document.querySelector('.ww-fab').addEventListener('click', function () {
    document.getElementById('aiPanel').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  });
})();
