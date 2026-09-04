/* ═══════════════════════════════════════════════════════════════════
   Workwise AI — prototype inference engine
   ───────────────────────────────────────────────────────────────────
   Deterministic replay of a pre-authored analysis, paced to look like
   real inference. Same input → same output, every run, offline.

   To swap in a live model later, replace resolve() below with a fetch;
   nothing else in the UI layer needs to change.
   ═══════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  var MODE = 'scripted'; // 'scripted' | 'live'

  var reduced = typeof global.matchMedia === 'function' &&
    global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, reduced ? Math.min(ms, 60) : ms); });
  }

  /* ── icons (Lucide geometry, matching the product) ──────────────── */
  var ICON = {
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    sparkles: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>',
    thumbUp: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88"/></svg>',
    alert: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    ban: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/></svg>',
    dotGood: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    dotWarn: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>',
    dotBad: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    link: '<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>',
    shield: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>'
  };

  var VERDICT_META = {
    yes:       { cls: 'v-yes',       icon: ICON.thumbUp, label: 'Approve' },
    attention: { cls: 'v-attention', icon: ICON.alert,   label: 'Needs attention' },
    no:        { cls: 'v-no',        icon: ICON.ban,     label: 'Hard no' }
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ── typewriter ─────────────────────────────────────────────────── */
  function typeInto(el, html, speed) {
    // Types plain text; any markup is injected whole at the end of its run.
    return new Promise(function (resolve) {
      if (reduced) { el.innerHTML = html; el.classList.add('done'); return resolve(); }
      var tmp = document.createElement('div');
      tmp.innerHTML = html;
      var text = tmp.textContent;
      var i = 0;
      el.textContent = '';
      var step = Math.max(1, Math.round(text.length / 90));
      var t = setInterval(function () {
        i += step;
        el.textContent = text.slice(0, i);
        if (i >= text.length) {
          clearInterval(t);
          el.innerHTML = html;
          el.classList.add('done');
          resolve();
        }
      }, speed || 16);
    });
  }

  /* ── renderers ──────────────────────────────────────────────────── */
  function renderVerdict(v) {
    var m = VERDICT_META[v.verdict] || VERDICT_META.attention;
    return '' +
      '<div class="ww-ai-verdict ' + m.cls + '">' +
        '<div class="vic">' + m.icon + '</div>' +
        '<div class="vmain">' +
          '<div class="vlabel">' + esc(v.headline || m.label) +
            '<span class="vconf">' + esc(v.confidence) + '% confidence</span>' +
          '</div>' +
          '<div class="vline ww-ai-type" data-type="' + esc(v.summary) + '"></div>' +
        '</div>' +
      '</div>';
  }

  function renderCites(cites) {
    if (!cites || !cites.length) return '';
    return '<div class="ww-ai-cites">' + cites.map(function (c) {
      return '<button type="button" class="ww-ai-cite" data-target="' + esc(c.target || '') + '">' +
             ICON.link + esc(c.label) + '</button>';
    }).join('') + '</div>';
  }

  function renderFindings(list) {
    var iconFor = { good: ICON.dotGood, warn: ICON.dotWarn, bad: ICON.dotBad };
    return list.map(function (f) {
      return '<div class="ww-ai-finding ' + f.tone + '">' +
               '<div class="fic">' + (iconFor[f.tone] || ICON.dotWarn) + '</div>' +
               '<div class="fbody">' + f.text + renderCites(f.cites) + '</div>' +
             '</div>';
    }).join('');
  }

  function renderFactors(list) {
    return '<div class="ww-ai-factors">' + list.map(function (f) {
      var tone = f.score >= 75 ? 'good' : f.score >= 45 ? 'mid' : 'bad';
      return '<div class="ww-ai-factor ' + tone + '">' +
               '<div class="fname">' + esc(f.name) + '</div>' +
               '<div class="fbar"><span data-w="' + f.score + '"></span></div>' +
               '<div class="fval">' + f.score + '<span style="color:var(--fg-4);font-weight:500">/100</span></div>' +
             '</div>';
    }).join('') + '</div>';
  }

  function renderCompare(cells, cols) {
    return '<div class="ww-ai-compare" style="grid-template-columns:repeat(' + (cols || cells.length) + ',1fr)">' +
      cells.map(function (c) {
        return '<div class="ccell"><div class="ck">' + esc(c.k) + '</div>' +
               '<div class="cv ' + (c.tone || '') + '">' + esc(c.v) + '</div>' +
               (c.n ? '<div class="cn">' + c.n + '</div>' : '') + '</div>';
      }).join('') + '</div>';
  }

  function section(label, inner) {
    return '<div class="ww-ai-sec"><div class="ww-ai-sec-label">' + esc(label) + '</div>' + inner + '</div>';
  }

  /* ── the run loop ───────────────────────────────────────────────── */
  async function run(root, plan) {
    var body = root.querySelector('.ww-ai-body');
    var btn = root.querySelector('.ww-ai-run');
    if (btn) { btn.disabled = true; btn.dataset.busy = '1'; }
    root.dataset.state = 'thinking';

    // 1 · thinking steps
    body.hidden = false;
    body.innerHTML = '<div class="ww-ai-steps"></div>';
    var steps = body.querySelector('.ww-ai-steps');

    for (var i = 0; i < plan.steps.length; i++) {
      var s = plan.steps[i];
      var row = document.createElement('div');
      row.className = 'ww-ai-step';
      row.style.animationDelay = '0ms';
      row.innerHTML = '<span class="sic"><span class="spin"></span></span>' +
                      '<span class="slabel">' + s.label + '</span>' +
                      (s.note ? '<span class="snote">· ' + s.note + '</span>' : '');
      steps.appendChild(row);
      await wait(s.ms || 420);
      row.classList.add('done');
      row.querySelector('.sic').innerHTML = ICON.check;
    }

    await wait(260);

    // 2 · result
    var v = plan.result;
    var html = renderVerdict(v);

    if (v.findings && v.findings.length) {
      html += section(v.findingsLabel || 'What the model found', renderFindings(v.findings));
    }
    if (v.compare && v.compare.length) {
      html += section(v.compareLabel || 'Against the benchmark', renderCompare(v.compare, v.compareCols));
    }
    if (v.factors && v.factors.length) {
      html += section(v.factorsLabel || 'Scoring breakdown', renderFactors(v.factors));
    }
    if (v.extra) html += v.extra;

    html += '<div class="ww-ai-foot">' +
              '<div class="ww-ai-meta">' + ICON.shield +
                '<span>Analysed <span class="mono">' + esc(v.audit) + '</span></span>' +
              '</div>' +
              (v.actions ? '<div class="ww-ai-foot-actions">' + v.actions + '</div>' : '') +
            '</div>';

    if (v.disclaimer !== false) {
      html += '<div class="ww-ai-disclaimer">' + ICON.dotWarn +
              '<span>' + (v.disclaimerText ||
                'A recommendation, not an approval. The decision and its audit record remain yours.') +
              '</span></div>';
    }

    body.innerHTML = html;
    root.dataset.state = 'done';

    // typewriter the one-line summary
    var typeEl = body.querySelector('[data-type]');
    if (typeEl) await typeInto(typeEl, typeEl.getAttribute('data-type'));

    // animate factor bars
    requestAnimationFrame(function () {
      body.querySelectorAll('.ww-ai-factor .fbar span').forEach(function (b) {
        b.style.width = b.dataset.w + '%';
      });
    });

    // citation clicks scroll to the cited section and flash it
    body.querySelectorAll('.ww-ai-cite').forEach(function (c) {
      c.addEventListener('click', function () {
        var sel = c.dataset.target;
        if (!sel) return;
        var el = document.querySelector(sel);
        if (!el) return;
        el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        el.style.transition = 'box-shadow .3s ease';
        el.style.boxShadow = '0 0 0 3px rgba(79,70,229,.30)';
        setTimeout(function () { el.style.boxShadow = ''; }, 1400);
      });
    });

    if (btn) {
      btn.disabled = false;
      delete btn.dataset.busy;
      btn.innerHTML = ICON.sparkles + '<span>Re-run analysis</span>';
    }
    if (typeof plan.onDone === 'function') plan.onDone(body);
    return body;
  }

  /* ── wiring helper ──────────────────────────────────────────────── */
  function attach(root, planFactory) {
    var btn = root.querySelector('.ww-ai-run');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (btn.dataset.busy) return;
      run(root, planFactory());
    });
  }

  /* Live-model seam. Swap MODE to 'live' and implement this to go real. */
  async function resolve(ctx) {
    if (MODE === 'live') throw new Error('live mode not configured');
    return ctx.scripted;
  }

  global.WWAi = {
    run: run,
    attach: attach,
    resolve: resolve,
    icons: ICON,
    esc: esc,
    section: section,
    renderCites: renderCites,
    renderFindings: renderFindings,
    renderFactors: renderFactors,
    renderCompare: renderCompare,
    typeInto: typeInto
  };
})(typeof window !== "undefined" ? window : globalThis);
