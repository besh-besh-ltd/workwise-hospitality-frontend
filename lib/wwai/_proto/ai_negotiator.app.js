/* ═══════════════════════════════════════════════════════════════════
   Workwise · AI Negotiator prototype — wiring
   ───────────────────────────────────────────────────────────────────
   Renders the real Step-2 surfaces from data.js, runs the scripted
   analysis through window.WWAi, and applies the drafted targets into
   the actual form inputs. Every rupee shown is recomputed here:
       landed = (base + freight + packaging) × (1 + GST)
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var D = window.WWData;
  var AI = window.WWAi;
  var QTY = D.product.qty;
  var GST = D.rfq.gstPct / 100;
  var STORE_KEY = 'ww_ai_negotiator_round';

  /* ── money ────────────────────────────────────────────────────────── */
  function r2(n) { return Math.round(n * 100) / 100; }
  function inr(n) { return '₹' + r2(n).toLocaleString('en-IN'); }
  function inr0(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
  function pct(n) { return (Math.round(n * 10) / 10) + '%'; }
  function esc(s) { return AI ? AI.esc(s) : String(s); }

  /* ── quote / target arithmetic ────────────────────────────────────── */
  function landed(unit, freightPct, packagingPct) {
    var base = unit * QTY;
    var fr = freightPct ? base * freightPct / 100 : 0;
    var pk = packagingPct ? base * packagingPct / 100 : 0;
    var sub = base + fr + pk;
    return { base: base, freight: fr, packaging: pk, sub: sub, gst: sub * GST, total: sub * (1 + GST) };
  }
  function quoted(v) { return landed(v.unit, v.freightPct, v.packagingPct); }
  function aiTargeted(v) {
    var t = v.ai.target;
    if (!t) return null;
    return landed(t.unit, t.freightPct, t.packagingPct);
  }
  function byId(id) {
    for (var i = 0; i < D.vendors.length; i++) if (D.vendors[i].id === id) return D.vendors[i];
    return null;
  }

  /* strictly-better guard — the live product drops any target that is
     not an improvement on the quoted value. A gap (vendor never quoted
     the charge) may always be filled. */
  function better(field, target, v) {
    if (target == null || target === '' || isNaN(target)) return false;
    target = Number(target);
    if (field === 'base') return target < v.unit && target > 0;
    if (field === 'freight') return v.freightPct == null ? target >= 0 : target < v.freightPct;
    if (field === 'packaging') return v.packagingPct == null ? target >= 0 : target < v.packagingPct;
    if (field === 'delivery') return target < v.deliveryDays && target > 0;
    return false;
  }

  /* the L1 (lowest landed) vendor across all quotes */
  function l1Vendor() {
    return D.vendors.slice().sort(function (a, b) { return quoted(a).total - quoted(b).total; })[0];
  }

  /* probability-weighted outcome: each included vendor either meets its
     target (p) or holds at its quote (1-p); we take E[min landed]. */
  function outcome() {
    var inc = D.strategy.include.map(byId);
    var base = l1Vendor();
    var L1 = quoted(base).total;

    var pairs = inc.map(function (v) {
      return { t: aiTargeted(v).total, q: quoted(v).total, p: v.ai.probability / 100, v: v };
    });

    var n = pairs.length, expected = 0;
    for (var mask = 0; mask < (1 << n); mask++) {
      var P = 1, mn = Infinity;
      for (var i = 0; i < n; i++) {
        var hit = (mask >> i) & 1;
        P *= hit ? pairs[i].p : (1 - pairs[i].p);
        mn = Math.min(mn, hit ? pairs[i].t : pairs[i].q);
      }
      expected += P * mn;
    }

    var bestTotal = Math.min.apply(null, pairs.map(function (x) { return x.t; }));
    var bestVendor = pairs.filter(function (x) { return x.t === bestTotal; })[0].v;

    /* downside: L1 concedes only its charges, not its rate */
    var dTarget = base.ai.target;
    var down = landed(base.unit, dTarget.freightPct, dTarget.packagingPct).total;

    return {
      l1Vendor: base,
      l1Total: L1,
      bestTotal: bestTotal,
      bestVendor: bestVendor,
      bestSaving: L1 - bestTotal,
      expectedTotal: expected,
      expectedSaving: L1 - expected,
      downTotal: down,
      downSaving: L1 - down,
      regretCount: D.vendors.filter(function (v) { return v.ai.regretRisk; }).length
    };
  }

  /* ── L1 badges for the Negotiation Fields grid ────────────────────── */
  function fieldL1(field) {
    var best = null;
    D.vendors.forEach(function (v) {
      var q = quoted(v), val, amt;
      if (field === 'base') { val = v.unit; amt = q.base * GST; }
      else if (field === 'freight') { if (v.freightPct == null) return; val = v.freightPct; amt = q.freight; }
      else if (field === 'packaging') { if (v.packagingPct == null) return; val = v.packagingPct; amt = q.packaging; }
      else return;
      if (!best || val < best.val) best = { val: val, amt: amt, vendor: v };
    });
    return best;
  }

  /* ═══════════════════════════════════════════════════════════════════
     STEP 2 — render
     ═══════════════════════════════════════════════════════════════════ */
  var BADGE_STYLE = 'font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: rgb(21, 128, 61); background: rgb(220, 252, 231); border: 1px solid rgb(187, 247, 208); padding: 2px 8px; border-radius: 4px; white-space: nowrap;';
  var BADGE_STYLE_SM = 'font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: rgb(21, 128, 61); background: rgb(220, 252, 231); border: 1px solid rgb(187, 247, 208); padding: 1px 6px; border-radius: 4px; white-space: nowrap;';
  var CHECK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>';
  var CHEV_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down VendorListPanel_chevron__APBzd {OPEN}" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>';

  var FIELDS = [
    { key: 'base', label: 'Base Price', selected: true, mode: null, placeholder: 'Enter target base price' },
    { key: 'freight', label: 'Freight', selected: true, mode: '%', placeholder: 'Enter target freight' },
    { key: 'packaging', label: 'Packaging', selected: false, mode: '%', placeholder: 'Enter target packaging' },
    { key: 'insurance', label: 'Insurance', selected: false, mode: '%', placeholder: 'Enter target insurance' },
    { key: 'loading', label: 'Loading/Unloading', selected: false, mode: '%', placeholder: 'Enter target loading/unloading' },
    { key: 'testing', label: 'Testing/Inspection', selected: false, mode: '%', placeholder: 'Enter target testing/inspection' }
  ];

  function renderFieldGrid() {
    var grid = document.getElementById('negFieldGrid');
    if (!grid) return;
    grid.innerHTML = FIELDS.map(function (f) {
      var l1 = fieldL1(f.key);
      var badge = '';
      if (l1) {
        var txt = f.key === 'base'
          ? 'L1: ₹' + l1.val.toLocaleString('en-IN')
          : 'L1: ' + l1.val + '% (' + inr(l1.amt) + ')';
        badge = '<span title="Lowest from ' + esc(l1.vendor.name) + '" style="' + BADGE_STYLE + '">' + txt + '</span>';
      }
      var inputArea = '';
      if (f.selected) inputArea = fieldInputArea(f);
      return '<div class="NegotiationUI_negFieldCard__5axvM ' +
        (f.selected ? 'NegotiationUI_negFieldCardSelected__Sf2MV ' : ' ') + ' " data-field="' + f.key + '" id="field-' + f.key + '">' +
        '<div class="NegotiationUI_negFieldCardHeader__3t43B">' +
          '<p class="NegotiationUI_negFieldCardLabel__jj11j">' + esc(f.label) + '</p>' +
          '<div style="display: inline-flex; align-items: center; gap: 8px;">' + badge +
            '<span class="NegotiationUI_negFieldCardCheck__VFPxD ' + (f.selected ? 'NegotiationUI_negFieldCardCheckActive___GnLl' : '') + '">' + (f.selected ? '✓' : '') + '</span>' +
          '</div>' +
        '</div>' + inputArea +
      '</div>';
    }).join('');
  }

  function fieldInputArea(f) {
    var html = '<div class="NegotiationUI_negFieldCardInputArea__N_QTX">' +
      '<label class="NegotiationUI_negFieldInputLabel__6cgKg">Global Target' +
      (f.mode ? '<span class="NegotiationUI_modeLabelHint__uvztk">(%)</span>' : '') + '</label>' +
      '<div class="NegotiationUI_negFieldInputRow__FnXEv">' +
        '<input step="0.01" min="0" placeholder="' + esc(f.placeholder) + '" class="NegotiationUI_negFieldInput__cbgcn" type="number" value="" data-global="' + f.key + '">' +
        (f.mode ? '<div class="NegotiationUI_modeToggle__uvl6a">' +
          '<button type="button" class="NegotiationUI_modeToggleBtn__7BCB4 NegotiationUI_modeToggleBtnActive__z5kqg">%</button>' +
          '<button type="button" class="NegotiationUI_modeToggleBtn__7BCB4 ">₹</button></div>' : '') +
      '</div>';
    if (f.key === 'base') {
      var l1 = fieldL1('base');
      html += '<label class="NegotiationUI_negFieldInputLabel__6cgKg" style="margin-top: 10px; display: inline-flex; align-items: center; gap: 8px;">' +
        '<span>Tax (GST)</span>' +
        '<span title="Lowest tax from ' + esc(l1.vendor.name) + '" style="' + BADGE_STYLE_SM + '">L1: ' + D.rfq.gstPct + '% (' + inr(l1.amt) + ')</span></label>';
    }
    return html + '</div>';
  }

  /* ── vendor charge cards ──────────────────────────────────────────── */
  function chargeCard(v, key) {
    var q = quoted(v);
    var globalSelected = FIELDS.filter(function (f) { return f.key === key; })[0];
    var active, valueRow, taxRow = '', tags = '', inputRow = '', hint = '';

    if (key === 'base') {
      active = true;
      valueRow = '<span class="VendorChargeCard_quoted__1ZWpX">₹' + v.unit.toLocaleString('en-IN') + '</span><span class="VendorChargeCard_unitHint__80Edv">per unit</span>';
      taxRow = '<div class="VendorChargeCard_taxRow__zd0l3"><span class="VendorChargeCard_quotedTax__5CDyU">Tax ' + v.gstPct + '% (' + inr(q.base * GST) + ')</span>' +
               '<button type="button" class="VendorChargeCard_taxActionBtn__PF5tp">Negotiate</button></div>';
    } else if (key === 'freight' || key === 'packaging') {
      active = globalSelected ? globalSelected.selected : false;
      var p = key === 'freight' ? v.freightPct : v.packagingPct;
      var amt = key === 'freight' ? q.freight : q.packaging;
      if (p == null) {
        tags = '<span class="VendorChargeCard_demandTag__rX6yv" title="Vendor didn\'t quote this — buyer demand">Demand</span>';
        valueRow = '<span class="VendorChargeCard_quoted__1ZWpX">Not quoted</span><span class="VendorChargeCard_unitHint__80Edv">% of base</span>';
      } else {
        valueRow = '<span class="VendorChargeCard_quoted__1ZWpX">' + p + '% (' + inr(amt) + ')</span><span class="VendorChargeCard_unitHint__80Edv">% of base</span>';
      }
      taxRow = '<div class="VendorChargeCard_taxRow__zd0l3"><span class="VendorChargeCard_quotedTax__5CDyU">No tax was given</span>' +
               '<button type="button" class="VendorChargeCard_taxActionBtn__PF5tp">Demand</button></div>';
      if (active) inputRow = overrideRow(key, true);
    } else { /* delivery */
      active = false;
      valueRow = '<span class="VendorChargeCard_quoted__1ZWpX">' + v.deliveryDays + ' day(s)</span>';
    }

    var label = key === 'base' ? 'Base Price' : key === 'delivery' ? 'Delivery Period' : key.charAt(0).toUpperCase() + key.slice(1);
    var title = active ? 'Click to skip this field for this vendor' : 'Set per-vendor target';
    var aria = active ? 'Exclude ' + label + ' for this vendor' : 'Set per-vendor target for ' + label;

    return '<div class="VendorChargeCard_card__ty1uE" id="v-' + v.id + '-' + key + '" data-vendor="' + v.id + '" data-field="' + key + '">' +
      '<div class="VendorChargeCard_head__uvACz">' +
        '<span class="VendorChargeCard_label___W5No">' + esc(label) + '</span>' +
        '<div class="VendorChargeCard_headRight__9Mtd8">' + tags +
          '<button type="button" class="VendorChargeCard_check__IYpO4 ' + (active ? 'VendorChargeCard_checkActive__ieab0' : '') + '" aria-pressed="' + active + '" aria-label="' + esc(aria) + '" title="' + esc(title) + '">' + (active ? CHECK_SVG : '') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="VendorChargeCard_valueRow__7DYLd">' + valueRow + hint + '</div>' +
      taxRow + inputRow +
    '</div>';
  }

  function overrideRow(key, withMode) {
    var ph = key === 'delivery' ? 'Target days for this vendor (optional)'
           : key === 'base' ? 'Target rate for this vendor (optional)'
           : 'Override for this vendor (optional)';
    return '<div class="VendorChargeCard_inputRow__uDJ6_">' +
      '<input step="0.01" min="0" placeholder="' + ph + '" class="VendorChargeCard_input__57Bo1" type="number" value="" data-override="' + key + '">' +
      (withMode ? '<div class="VendorChargeCard_modeToggle__Knyqh">' +
        '<button type="button" class="VendorChargeCard_modeBtn__tlUA2 VendorChargeCard_modeBtnActive__QRL5Z">%</button>' +
        '<button type="button" class="VendorChargeCard_modeBtn__tlUA2 ">₹</button></div>' : '') +
    '</div>';
  }

  var OPEN_BY_DEFAULT = ['shree', 'anand'];
  var SELECTED_BY_DEFAULT = ['shree', 'anand'];

  function renderVendors() {
    var list = document.getElementById('vendorList');
    if (!list) return;
    list.innerHTML = D.vendors.map(function (v) {
      var sel = SELECTED_BY_DEFAULT.indexOf(v.id) > -1;
      var open = OPEN_BY_DEFAULT.indexOf(v.id) > -1;
      var q = quoted(v);
      return '<li class="VendorListPanel_item__kXl6Z ' + (sel ? 'VendorListPanel_itemSelected__Wf0tb ' : '') + (open ? 'VendorListPanel_itemOpen__zR4QB' : '') + '" id="v-' + v.id + '" data-vendor="' + v.id + '">' +
        '<div class="VendorListPanel_row__fIZ8u">' +
          '<input class="VendorListPanel_checkbox__djCwx" aria-label="Select ' + esc(v.name) + '" type="checkbox"' + (sel ? ' checked=""' : '') + '>' +
          '<button type="button" class="VendorListPanel_rowBody__YhVeS" aria-expanded="' + open + '">' +
            '<span class="VendorListPanel_avatar__1spWZ" aria-hidden="true" style="background: ' + v.avatarBg + '; color: ' + v.avatarFg + ';">' + esc(v.initials) + '</span>' +
            '<span class="VendorListPanel_name__LYGzu" title="' + esc(v.name) + '">' + esc(v.name) + '</span>' +
            '<span class="VendorListPanel_total__FWe03" data-total>' + inr(q.total) + '</span>' +
            CHEV_SVG.replace('{OPEN}', open ? 'VendorListPanel_chevronOpen__Kcx2J' : '') +
          '</button>' +
        '</div>' +
        '<div class="VendorListPanel_body__tzYgv"' + (open ? '' : ' style="display:none"') + '>' +
          '<div class="VendorListPanel_cardGrid__TpUkC">' +
            chargeCard(v, 'base') + chargeCard(v, 'freight') + chargeCard(v, 'packaging') + chargeCard(v, 'delivery') +
          '</div>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  /* ── read the live form back out ──────────────────────────────────── */
  function readState() {
    var st = { vendors: [], globals: {}, applied: !!document.querySelector('.ai-applied-chip') };
    document.querySelectorAll('[data-global]').forEach(function (inp) {
      if (inp.value !== '') st.globals[inp.dataset.global] = Number(inp.value);
    });
    document.querySelectorAll('#vendorList > li').forEach(function (li) {
      var v = byId(li.dataset.vendor);
      if (!li.querySelector('.VendorListPanel_checkbox__djCwx').checked) return;
      var entry = { id: v.id, overrides: {}, active: {} };
      li.querySelectorAll('.VendorChargeCard_card__ty1uE').forEach(function (card) {
        var f = card.dataset.field;
        entry.active[f] = card.querySelector('.VendorChargeCard_check__IYpO4').getAttribute('aria-pressed') === 'true';
        var inp = card.querySelector('[data-override]');
        if (inp && inp.value !== '') entry.overrides[f] = Number(inp.value);
      });
      st.vendors.push(entry);
    });
    return st;
  }

  /* effective, rule-checked target per field for one vendor */
  function effective(st, v) {
    var entry = null;
    st.vendors.forEach(function (e) { if (e.id === v.id) entry = e; });
    if (!entry) return null;
    var out = {};
    ['base', 'freight', 'packaging', 'delivery'].forEach(function (f) {
      if (!entry.active[f]) { out[f] = null; return; }
      var val = entry.overrides[f];
      if (val == null && f !== 'delivery') val = st.globals[f];
      out[f] = better(f, val, v) ? Number(val) : null;
    });
    return out;
  }

  function projected(v, eff) {
    if (!eff) return quoted(v);
    var unit = eff.base != null ? eff.base : v.unit;
    var fr = eff.freight != null ? eff.freight : v.freightPct;
    var pk = eff.packaging != null ? eff.packaging : v.packagingPct;
    return landed(unit, fr, pk);
  }
  function countTargets(eff) {
    if (!eff) return 0;
    return ['base', 'freight', 'packaging', 'delivery'].filter(function (f) { return eff[f] != null; }).length;
  }

  /* ═══════════════════════════════════════════════════════════════════
     The AI plan
     ═══════════════════════════════════════════════════════════════════ */
  function buildPlan() {
    var S = D.strategy, M = D.market, O = outcome();
    var l1 = O.l1Vendor;

    /* 1 · ranked vendor list */
    var ranked = D.vendors.slice().sort(function (a, b) { return b.ai.probability - a.ai.probability; });
    var rankHTML = '<div class="ai-rank">' + ranked.map(function (v, i) {
      var q = quoted(v), t = aiTargeted(v);
      var head = t ? (v.unit - t.base / QTY) : 0;
      var meta = [
        '<span>Quoted <span class="mono">₹' + v.unit + '</span></span>',
        t ? '<span>Target <span class="mono">₹' + (t.base / QTY) + '</span></span>' : '<span>No target drafted</span>',
        '<span>Headroom <span class="mono">' + (t ? pct(head / v.unit * 100) : '—') + '</span></span>',
        '<span>' + v.history.rounds + ' prior rounds · avg concession <span class="mono">' + v.history.avgConcession + '%</span></span>',
        '<span>Replies in <span class="mono">' + v.history.medianResponseHrs + 'h</span></span>'
      ].join('');
      return '<div class="ai-rank-row' + (v.ai.include ? '' : ' is-out') + '">' +
        '<div class="ai-rank-n">' + (i + 1) + '</div>' +
        '<div class="ai-rank-av" style="background:' + v.avatarBg + ';color:' + v.avatarFg + '">' + esc(v.initials) + '</div>' +
        '<div class="ai-rank-main">' +
          '<div class="ai-rank-name">' + esc(v.name) + (v.id === l1.id ? ' <span class="ai-l1-tag">L1</span>' : '') + '</div>' +
          '<div class="ai-rank-meta">' + meta + '</div>' +
          '<div class="ai-rank-why">' + esc(v.ai.why) + '</div>' +
        '</div>' +
        '<div class="ai-rank-right">' +
          '<div class="ai-prob t-' + v.ai.tone + '">' + v.ai.probability + '%</div>' +
          '<div class="ai-prob-k">meets target</div>' +
          '<span class="ww-ai-badge v-' + v.ai.tone + '"><span class="bdot"></span>' + esc(v.ai.badge) + '</span>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>' +
    '<div class="ww-ai-cites" style="margin-top:9px">' +
      D.vendors.map(function (v) {
        return '<button type="button" class="ww-ai-cite" data-target="#v-' + v.id + '">' + AI.icons.link + esc(v.name) + '</button>';
      }).join('') +
    '</div>';

    /* 2 · field-by-field */
    var fieldHTML = '<table class="ai-tbl"><thead><tr><th>Field</th><th>Recommended target</th><th>Evidence</th></tr></thead><tbody>' +
      S.fieldPlan.map(function (f) {
        return '<tr><td class="f">' + esc(f.field) + '</td><td class="t">' + esc(f.target) + '</td><td class="e">' + esc(f.evidence) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="ai-skiplist"><strong>Dropped as invalid:</strong> freight for Meridian Textile Co (quotes delivered-to-site — a freight line would double-count), and any target that was not strictly better than the quoted value. Suvarna Linens is left out of the round entirely.</div>';

    /* 3 · round strategy */
    var strategyHTML = '<div class="ai-strategy">' +
      '<div class="ai-anchor">' +
        '<div><div class="k">Opening target</div><div class="v">₹' + S.anchor.target + '</div><div class="n">what the round asks for</div></div>' +
        '<div><div class="k">Expected landing</div><div class="v">₹' + S.anchor.expectedLanding + '</div><div class="n">where Anand has settled before</div></div>' +
        '<div><div class="k">Walk-away floor</div><div class="v">₹' + S.anchor.walkAway + '</div><div class="n">above this, re-tender in Sep</div></div>' +
      '</div>' +
      '<div class="ww-ai-sec-label" style="margin-bottom:7px">Vendors in this round</div>' +
      '<div class="ai-rank-meta" style="margin-bottom:12px;font-size:12px">' +
        '<span><strong style="color:var(--fg)">Include (4):</strong> ' + esc(S.include.map(function (id) { return byId(id).name; }).join(', ')) + '</span>' +
        '<span><strong style="color:var(--fg)">Leave out (1):</strong> ' + esc(S.exclude.map(function (id) { return byId(id).name; }).join(', ')) + '</span>' +
      '</div>' +
      '<div class="ww-ai-sec-label" style="margin-bottom:7px">What to concede in return</div>' +
      '<ul class="ai-give">' + S.giveToGet.map(function (g) { return '<li><span>' + g + '</span></li>'; }).join('') + '</ul>' +
    '</div>';

    /* 4 · projected outcome */
    var outcomeHTML = '<div class="ai-outcome">' +
      '<div><div class="k">Expected landed saving</div><div class="v">' + inr0(O.expectedSaving) + '</div>' +
        '<div class="n">' + pct(O.expectedSaving / O.l1Total * 100) + ' against today\'s L1 landed ' + inr0(O.l1Total) + '</div></div>' +
      '<div><div class="k">Best case · all targets met</div><div class="v">' + inr0(O.bestSaving) + '</div>' +
        '<div class="n">' + pct(O.bestSaving / O.l1Total * 100) + ' · new L1 ' + esc(O.bestVendor.name.split(' ')[0]) + ' at ' + inr0(O.bestTotal) + '</div></div>' +
      '<div><div class="k">Downside · charges only</div><div class="v muted">' + inr0(O.downSaving) + '</div>' +
        '<div class="n">' + pct(O.downSaving / O.l1Total * 100) + ' · ' + l1.ai.secondaryProbability + '% likely from ' + esc(l1.name.split(' ')[0]) + ' alone</div></div>' +
      '<div><div class="k">Regret risk</div><div class="v muted">' + O.regretCount + ' of ' + D.vendors.length + '</div>' +
        '<div class="n">Suvarna excluded · Meridian held to a light touch</div></div>' +
    '</div>';

    return {
      steps: S.steps,
      result: {
        verdict: S.verdict,
        headline: S.headline,
        confidence: S.confidence,
        summary: S.summary,
        findings: S.findings,
        findingsLabel: 'What the model found',
        compare: [
          { k: 'Current L1', v: '₹' + l1.unit, n: esc(l1.name) + ' · landed ' + inr0(O.l1Total) },
          { k: '12-month best', v: '₹' + M.bestTwelveMonth.unit, n: M.bestTwelveMonth.ref + ' · ' + M.bestTwelveMonth.when + ' · ' + M.bestTwelveMonth.qty.toLocaleString('en-IN') + ' pcs' },
          { k: 'Market index', v: '₹' + M.indexUnit, n: 'West India, ' + M.asOf + ' · yarn ' + M.yarnMove + '% since Feb' },
          { k: 'AI target', v: '₹' + S.anchor.target, tone: 'down', n: esc(S.anchor.rationale) }
        ],
        compareLabel: 'What ₹' + l1.unit + ' should really be',
        factors: S.factors,
        factorsLabel: 'Negotiation conditions',
        extra:
          AI.section('Whom to negotiate with — ranked by headroom × likelihood to concede', rankHTML) +
          AI.section('What to negotiate — field by field', fieldHTML) +
          AI.section('Round strategy', strategyHTML) +
          AI.section('Projected outcome', outcomeHTML) +
          '<div class="ai-factor-note">' + esc(S.factorNote) + '</div>',
        audit: S.audit,
        disclaimerText: S.disclaimerText,
        actions:
          '<button type="button" class="ww-ai-run ghost" id="aiDismiss">Keep my own targets</button>' +
          '<button type="button" class="ww-ai-run" id="aiApply">' + AI.icons.check + '<span>Apply suggested targets</span></button>'
      },
      onDone: function () { /* actions are bound by delegation on the panel root */ }
    };
  }

  /* ═══════════════════════════════════════════════════════════════════
     Apply — writes the drafted targets into the real inputs
     ═══════════════════════════════════════════════════════════════════ */
  var queue = [];
  function step(fn) { queue.push(fn); }
  function flush(gap) {
    var i = 0;
    (function tick() {
      if (i >= queue.length) { queue = []; return; }
      queue[i++]();
      setTimeout(tick, gap);
    })();
  }
  function flash(el) {
    if (!el) return;
    el.classList.remove('ai-applied');
    void el.offsetWidth;
    el.classList.add('ai-applied');
  }
  function writeInput(inp, value) {
    if (!inp) return;
    inp.value = value;
    inp.classList.add('ai-written');
    flash(inp);
  }

  function setFieldSelected(key, on) {
    var card = document.getElementById('field-' + key);
    if (!card) return;
    var f = FIELDS.filter(function (x) { return x.key === key; })[0];
    f.selected = on;
    card.classList.toggle('NegotiationUI_negFieldCardSelected__Sf2MV', on);
    var chk = card.querySelector('.NegotiationUI_negFieldCardCheck__VFPxD');
    chk.classList.toggle('NegotiationUI_negFieldCardCheckActive___GnLl', on);
    chk.textContent = on ? '✓' : '';
    var area = card.querySelector('.NegotiationUI_negFieldCardInputArea__N_QTX');
    if (on && !area) {
      card.insertAdjacentHTML('beforeend', fieldInputArea(f));
      card.querySelector('.NegotiationUI_negFieldCardInputArea__N_QTX').classList.add('ai-row-in');
    } else if (!on && area) {
      area.remove();
    }
  }

  function setCardActive(card, on) {
    var btn = card.querySelector('.VendorChargeCard_check__IYpO4');
    var key = card.dataset.field;
    btn.setAttribute('aria-pressed', String(on));
    btn.classList.toggle('VendorChargeCard_checkActive__ieab0', on);
    btn.innerHTML = on ? CHECK_SVG : '';
    var label = card.querySelector('.VendorChargeCard_label___W5No').textContent;
    btn.setAttribute('title', on ? 'Click to skip this field for this vendor' : 'Set per-vendor target');
    btn.setAttribute('aria-label', (on ? 'Exclude ' : 'Set per-vendor target for ') + label + (on ? ' for this vendor' : ''));
    card.classList.toggle('ai-skipped', !on && (key === 'freight' || key === 'packaging'));
    var row = card.querySelector('.VendorChargeCard_inputRow__uDJ6_');
    if (on && !row) {
      card.insertAdjacentHTML('beforeend', overrideRow(key, key === 'freight' || key === 'packaging'));
      card.querySelector('.VendorChargeCard_inputRow__uDJ6_').classList.add('ai-row-in');
    } else if (!on && row) {
      row.remove();
    }
    return card.querySelector('[data-override]');
  }

  function setVendorSelected(li, on) {
    li.querySelector('.VendorListPanel_checkbox__djCwx').checked = on;
    li.classList.toggle('VendorListPanel_itemSelected__Wf0tb', on);
  }
  function setVendorOpen(li, on) {
    li.classList.toggle('VendorListPanel_itemOpen__zR4QB', on);
    li.querySelector('.VendorListPanel_body__tzYgv').style.display = on ? '' : 'none';
    li.querySelector('.VendorListPanel_rowBody__YhVeS').setAttribute('aria-expanded', String(on));
    li.querySelector('.VendorListPanel_chevron__APBzd').classList.toggle('VendorListPanel_chevronOpen__Kcx2J', on);
  }

  function animateTotal(li, v) {
    var span = li.querySelector('[data-total]');
    var q = quoted(v).total;
    var p = projected(v, effective(readState(), v)).total;
    if (Math.abs(p - q) < 0.5) { span.textContent = inr(q); return; }
    span.classList.add('ai-total-applied');
    span.innerHTML = '<s class="ai-total-quoted">' + inr(q) + '</s>' +
                     '<span class="ai-total-proj" data-live>' + inr(q) + '</span>' +
                     '<span class="ai-delta-pill' + (p > q ? ' up' : '') + '">' + (p > q ? '+' : '−') + inr0(Math.abs(q - p)) + '</span>';
    var live = span.querySelector('[data-live]');
    var t0 = performance.now(), dur = 900;
    (function frame(now) {
      var k = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - k, 3);
      live.textContent = inr(q + (p - q) * e);
      if (k < 1) requestAnimationFrame(frame); else live.textContent = inr(p);
    })(t0);
  }

  function applyTargets(btn) {
    var S = D.strategy;
    btn.disabled = true;
    btn.innerHTML = AI.icons.check + '<span>Applying…</span>';
    queue = [];

    /* a · global targets */
    step(function () { setFieldSelected('packaging', true); });
    step(function () { writeInput(document.querySelector('[data-global="base"]'), S.anchor.target); });
    step(function () { writeInput(document.querySelector('[data-global="freight"]'), 1.5); });
    step(function () { writeInput(document.querySelector('[data-global="packaging"]'), 1.0); });

    /* b · vendor selection */
    D.vendors.forEach(function (v) {
      step(function () {
        var li = document.getElementById('v-' + v.id);
        setVendorSelected(li, v.ai.include);
        if (v.ai.include) setVendorOpen(li, true);
        flash(li);
      });
    });

    /* c · per-vendor targets */
    S.include.forEach(function (id) {
      var v = byId(id), t = v.ai.target;
      ['base', 'freight', 'packaging', 'delivery'].forEach(function (key) {
        step(function () {
          var card = document.getElementById('v-' + v.id + '-' + key);
          if (!card) return;
          var skip = v.ai.skip.indexOf(key) > -1;
          if (skip) {
            setCardActive(card, false);
            var head = card.querySelector('.VendorChargeCard_headRight__9Mtd8');
            if (!card.querySelector('.ai-skip-tag')) head.insertAdjacentHTML('afterbegin', '<span class="ai-skip-tag" title="Skipped by AI Negotiator — vendor quotes delivered-to-site">Skipped</span>');
            flash(card);
            return;
          }
          var val = key === 'base' ? t.unit : key === 'freight' ? t.freightPct : key === 'packaging' ? t.packagingPct : t.deliveryDays;
          if (val == null || !better(key, val, v)) return;
          /* base + packaging + delivery need their override row opening first */
          var inp = card.querySelector('[data-override]');
          if (!inp) inp = setCardActive(card, true);
          else setCardActive(card, true);
          /* the global already carries this value — only write a genuine override */
          var globalVal = key === 'base' ? S.anchor.target : key === 'freight' ? 1.5 : key === 'packaging' ? 1.0 : null;
          if (globalVal != null && Number(val) === Number(globalVal) && key !== 'delivery') {
            inp.value = '';
            inp.placeholder = 'Using global target';
            flash(inp);
          } else {
            writeInput(inp, val);
          }
        });
      });
    });

    /* d · recompute totals */
    step(function () {
      D.vendors.forEach(function (v) {
        var li = document.getElementById('v-' + v.id);
        if (v.ai.include) animateTotal(li, v);
      });
      markApplied();
      refresh();
      btn.disabled = false;
      btn.innerHTML = AI.icons.check + '<span>Targets applied</span>';
    });

    flush(150);
  }

  function markApplied() {
    var host = document.getElementById('negFieldsHeadRight');
    if (host && !host.querySelector('.ai-applied-chip')) {
      var st = readState();
      var n = 0;
      D.strategy.include.forEach(function (id) { n += countTargets(effective(st, byId(id))); });
      host.innerHTML = '<span class="ai-applied-chip">' + AI.icons.check + 'AI targets applied · ' + n + ' fields</span>';
    }
  }

  /* ── validation + footer ──────────────────────────────────────────── */
  function refresh() {
    var st = readState();
    var errs = [];
    if (!st.vendors.length) errs.push('Select at least one vendor.');
    else {
      var missing = st.vendors.filter(function (e) { return countTargets(effective(st, byId(e.id))) === 0; });
      if (missing.length) errs.push('Every selected vendor needs at least one target (global or per-vendor).');
    }
    var list = document.getElementById('errorList');
    if (list) {
      list.innerHTML = errs.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('');
      list.style.display = errs.length ? '' : 'none';
    }
    var next = document.getElementById('nextBtn');
    if (next) next.disabled = errs.length > 0;

    var foot = document.getElementById('vendorFootnote');
    if (foot) foot.textContent = st.vendors.length + ' vendor(s) selected · ' + D.product.name;

    var info = document.getElementById('footerTargetInfo');
    if (info) {
      var n = 0;
      st.vendors.forEach(function (e) { n += countTargets(effective(st, byId(e.id))); });
      info.innerHTML = n ? ' · <span class="mono">' + st.vendors.length + '</span> vendors · <span class="mono">' + n + '</span> targets' : '';
    }

    /* keep every open vendor row's total honest, applied or not */
    document.querySelectorAll('#vendorList > li').forEach(function (li) {
      var v = byId(li.dataset.vendor);
      var span = li.querySelector('[data-total]');
      if (span.querySelector('[data-live]')) return; /* animated rows own their own text */
      var eff = effective(st, v);
      var p = projected(v, eff).total, q = quoted(v).total;
      if (Math.abs(p - q) < 0.5) { span.classList.remove('ai-total-applied'); span.textContent = inr(q); }
    });
  }

  /* ── interactions ─────────────────────────────────────────────────── */
  function wire() {
    var list = document.getElementById('vendorList');
    if (!list) return;

    list.addEventListener('click', function (e) {
      var rowBody = e.target.closest('.VendorListPanel_rowBody__YhVeS');
      if (rowBody) {
        var li = rowBody.closest('li');
        setVendorOpen(li, !li.classList.contains('VendorListPanel_itemOpen__zR4QB'));
        return;
      }
      var chk = e.target.closest('.VendorChargeCard_check__IYpO4');
      if (chk) {
        var card = chk.closest('.VendorChargeCard_card__ty1uE');
        setCardActive(card, chk.getAttribute('aria-pressed') !== 'true');
        refresh();
        return;
      }
      var mode = e.target.closest('.VendorChargeCard_modeBtn__tlUA2');
      if (mode) {
        mode.parentNode.querySelectorAll('.VendorChargeCard_modeBtn__tlUA2').forEach(function (b) {
          b.classList.toggle('VendorChargeCard_modeBtnActive__QRL5Z', b === mode);
        });
      }
    });

    list.addEventListener('change', function (e) {
      if (e.target.classList.contains('VendorListPanel_checkbox__djCwx')) {
        var li = e.target.closest('li');
        li.classList.toggle('VendorListPanel_itemSelected__Wf0tb', e.target.checked);
        refresh();
      }
    });
    list.addEventListener('input', function (e) {
      if (e.target.matches('[data-override]')) refresh();
    });

    var grid = document.getElementById('negFieldGrid');
    grid.addEventListener('click', function (e) {
      if (e.target.closest('.NegotiationUI_negFieldCardInputArea__N_QTX')) {
        var mb = e.target.closest('.NegotiationUI_modeToggleBtn__7BCB4');
        if (mb) mb.parentNode.querySelectorAll('.NegotiationUI_modeToggleBtn__7BCB4').forEach(function (b) {
          b.classList.toggle('NegotiationUI_modeToggleBtnActive__z5kqg', b === mb);
        });
        return;
      }
      var card = e.target.closest('.NegotiationUI_negFieldCard__5axvM');
      if (!card) return;
      var key = card.dataset.field;
      var f = FIELDS.filter(function (x) { return x.key === key; })[0];
      setFieldSelected(key, !f.selected);
      /* mirror on the per-vendor cards, as the live wizard does */
      document.querySelectorAll('.VendorChargeCard_card__ty1uE[data-field="' + key + '"]').forEach(function (c) {
        if (c.querySelector('.ai-skip-tag')) return;
        setCardActive(c, f.selected);
      });
      refresh();
    });
    grid.addEventListener('input', function (e) { if (e.target.matches('[data-global]')) refresh(); });

    document.getElementById('selectAllBtn').addEventListener('click', function () {
      var items = Array.prototype.slice.call(document.querySelectorAll('#vendorList > li'));
      var allOn = items.every(function (li) { return li.querySelector('.VendorListPanel_checkbox__djCwx').checked; });
      items.forEach(function (li) { setVendorSelected(li, !allOn); });
      this.textContent = allOn ? 'Select all' : 'Deselect all';
      refresh();
    });

    document.getElementById('nextBtn').addEventListener('click', function () {
      if (this.disabled) return;
      try { sessionStorage.setItem(STORE_KEY, JSON.stringify(readState())); } catch (err) { /* private mode */ }
      window.location.href = './review.html';
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     STEP 3 — review
     ═══════════════════════════════════════════════════════════════════ */
  function defaultState() {
    var st = { vendors: [], globals: { base: D.strategy.anchor.target, freight: 1.5, packaging: 1.0 }, applied: true };
    D.strategy.include.forEach(function (id) {
      var v = byId(id), t = v.ai.target;
      var e = { id: id, overrides: {}, active: { base: true, freight: true, packaging: true, delivery: true } };
      if (v.ai.skip.indexOf('freight') > -1) e.active.freight = false;
      if (t.unit !== st.globals.base) e.overrides.base = t.unit;
      if (t.freightPct != null && t.freightPct !== st.globals.freight) e.overrides.freight = t.freightPct;
      if (t.packagingPct != null && t.packagingPct !== st.globals.packaging) e.overrides.packaging = t.packagingPct;
      e.overrides.delivery = t.deliveryDays;
      st.vendors.push(e);
    });
    return st;
  }

  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      if (raw) {
        var st = JSON.parse(raw);
        if (st && st.vendors && st.vendors.length) return st;
      }
    } catch (err) { /* ignore */ }
    return defaultState();
  }

  function fieldRow(labelText, quotedText, targetText, deltaText, skipped) {
    return '<tr>' +
      '<td class="field">' + labelText + '</td>' +
      '<td class="mono num">' + quotedText + '</td>' +
      '<td class="' + (skipped ? 'skip num' : 'target num') + '">' + targetText + '</td>' +
      '<td class="' + (skipped ? 'skip num' : 'delta num') + '">' + deltaText + '</td>' +
    '</tr>';
  }

  function renderReview() {
    var root = document.getElementById('reviewRoot');
    if (!root) return;
    var st = loadState();
    var O = outcome();
    var included = st.vendors.map(function (e) { return byId(e.id); }).filter(Boolean);
    var excluded = D.vendors.filter(function (v) { return included.indexOf(v) === -1; });

    var totalTargets = 0;
    included.forEach(function (v) { totalTargets += countTargets(effective(st, v)); });

    /* projected L1 across the round, from the live form state */
    var projTotals = included.map(function (v) { return projected(v, effective(st, v)).total; });
    var projL1 = Math.min.apply(null, projTotals);
    var projL1Vendor = included[projTotals.indexOf(projL1)];
    var quotedL1 = Math.min.apply(null, D.vendors.map(function (v) { return quoted(v).total; }));
    var delta = quotedL1 - projL1;

    var html = '';

    html += '<div class="CreateRound_infoBanner__68qyK" role="note"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info CreateRound_infoBannerIcon__cfSkQ" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg><span>Check the round before it goes out. Each vendor is emailed <strong>only its own targets</strong> — no vendor sees another vendor\'s rate, and nothing is sent until you press Send.</span></div>';

    /* round card */
    html += '<section class="CreateRound_reviewCard__t4Kd9">' +
      '<div class="CreateRound_reviewCardHead__Jm2xP">' +
        '<div><p class="CreateRound_reviewCardTitle__Pq7wR">Round ' + D.rfq.roundNo + ' · ' + esc(D.product.name) + '</p>' +
        '<p class="CreateRound_reviewCardSub__Lz3vB">' + included.length + ' vendors · ' + totalTargets + ' targets · ' + esc(D.product.spec) + '</p></div>' +
        '<span class="CreateRound_reviewAiTag__Nw8kD">' + AI.icons.sparkles + 'Drafted by AI Negotiator</span>' +
      '</div>' +
      '<div class="CreateRound_reviewMetaGrid__Hs2mQ">' +
        cell('Quantity', D.product.qty.toLocaleString('en-IN') + ' ' + D.product.uom, true) +
        cell('Round closes', D.rfq.roundCloses, true) +
        cell('Payment terms offered', '30 days from GRN', false) +
        cell('Documents demanded', 'GSM / shrinkage certificate', false) +
        cell('Global base target', '₹' + st.globals.base + ' / unit', true) +
        cell('Global freight target', (st.globals.freight != null ? st.globals.freight + '%' : '—'), true) +
        cell('Global packaging target', (st.globals.packaging != null ? st.globals.packaging + '%' : '—'), true) +
        cell('Walk-away floor', '₹' + D.strategy.anchor.walkAway + ' / unit', true) +
      '</div></section>';

    /* grand total strip */
    html += '<div class="CreateRound_reviewGrand__Xm2Ld">' +
      '<div class="CreateRound_reviewGrandCell__Vb7kT"><div class="CreateRound_reviewGrandK__Hn3sQ">Quoted L1 landed</div>' +
        '<div class="CreateRound_reviewGrandV__Lp2dF strike">' + inr0(quotedL1) + '</div>' +
        '<div class="CreateRound_reviewGrandN__Wq6bC">' + esc(O.l1Vendor.name) + ' at ₹' + O.l1Vendor.unit + '/unit</div></div>' +
      '<div class="CreateRound_reviewGrandCell__Vb7kT"><div class="CreateRound_reviewGrandK__Hn3sQ">Projected L1 landed</div>' +
        '<div class="CreateRound_reviewGrandV__Lp2dF good">' + inr0(projL1) + '</div>' +
        '<div class="CreateRound_reviewGrandN__Wq6bC">' + esc(projL1Vendor.name) + ' if it meets target<span class="ai-delta-pill">−' + inr0(delta) + '</span></div></div>' +
      '<div class="CreateRound_reviewGrandCell__Vb7kT"><div class="CreateRound_reviewGrandK__Hn3sQ">Expected saving</div>' +
        '<div class="CreateRound_reviewGrandV__Lp2dF">' + inr0(O.expectedSaving) + '</div>' +
        '<div class="CreateRound_reviewGrandN__Wq6bC">' + pct(O.expectedSaving / O.l1Total * 100) + ' probability-weighted across ' + included.length + ' vendors</div></div>' +
      '<div class="CreateRound_reviewGrandCell__Vb7kT"><div class="CreateRound_reviewGrandK__Hn3sQ">Round success odds</div>' +
        '<div class="CreateRound_reviewGrandV__Lp2dF">' + roundOdds(included) + '%</div>' +
        '<div class="CreateRound_reviewGrandN__Wq6bC">chance at least one vendor meets its target</div></div>' +
    '</div>';

    /* per-vendor cards */
    included.forEach(function (v) {
      var eff = effective(st, v), q = quoted(v), p = projected(v, eff);
      var rows = '';
      rows += fieldRow('Base price', '₹' + v.unit.toLocaleString('en-IN') + '/unit',
        eff.base != null ? '₹' + eff.base.toLocaleString('en-IN') + '/unit' : '—',
        eff.base != null ? '−' + inr0((v.unit - eff.base) * QTY) : '—', eff.base == null);
      rows += fieldRow('Freight', v.freightPct == null ? 'Not quoted' : v.freightPct + '% (' + inr(q.freight) + ')',
        eff.freight != null ? eff.freight + '% (' + inr(p.freight) + ')' : 'Skipped',
        eff.freight != null ? '−' + inr0(q.freight - p.freight) : '—', eff.freight == null);
      rows += fieldRow('Packaging', v.packagingPct == null ? 'Not quoted' : v.packagingPct + '% (' + inr(q.packaging) + ')',
        eff.packaging != null ? eff.packaging + '% (' + inr(p.packaging) + ')' : 'Skipped',
        eff.packaging != null ? '−' + inr0(q.packaging - p.packaging) : '—', eff.packaging == null);
      rows += fieldRow('Delivery period', v.deliveryDays + ' day(s)',
        eff.delivery != null ? eff.delivery + ' day(s)' : 'Skipped',
        eff.delivery != null ? '−' + (v.deliveryDays - eff.delivery) + ' day(s)' : '—', eff.delivery == null);
      rows += fieldRow('GST @ ' + v.gstPct + '%', inr(q.gst), inr(p.gst), '−' + inr0(q.gst - p.gst), false);

      html += '<section class="CreateRound_reviewProductCard__Kd9Ap" id="rv-' + v.id + '">' +
        '<div class="CreateRound_reviewVendorHead__Gy5tR">' +
          '<span class="CreateRound_reviewVendorAv__Zk8mN" style="background:' + v.avatarBg + ';color:' + v.avatarFg + '">' + esc(v.initials) + '</span>' +
          '<div><div class="CreateRound_reviewVendorName__Tf3xL">' + esc(v.name) + '</div>' +
            '<div class="CreateRound_reviewVendorSub__Bn7cQ"><span>' + esc(v.city) + '</span><span>Payment <span class="mono">' + esc(v.paymentTerms) + '</span></span><span>' + countTargets(eff) + ' targets</span></div></div>' +
          '<div class="CreateRound_reviewVendorRight__Qm4vD">' +
            '<span class="ai-prob t-' + v.ai.tone + '" style="font-size:14px">' + v.ai.probability + '%</span>' +
            '<span class="ww-ai-badge v-' + v.ai.tone + '"><span class="bdot"></span>' + esc(v.ai.badge) + '</span>' +
          '</div>' +
        '</div>' +
        '<table class="CreateRound_reviewTable__Qw81z">' +
          '<thead><tr><th>Field</th><th class="num">Quoted</th><th class="num">Target</th><th class="num">Δ</th></tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
          '<tfoot><tr><td colspan="2">Landed total for ' + D.product.qty.toLocaleString('en-IN') + ' ' + D.product.uom + '</td>' +
            '<td class="mono num" colspan="2"><span class="q">' + inr(q.total) + '</span><span class="p">' + inr(p.total) + '</span></td></tr></tfoot>' +
        '</table>' +
        '<div class="CreateRound_reviewNote__Rt9pK"><strong>Why this ask:</strong> ' + esc(v.ai.ask) + '<br>' +
          '<strong>Vendor T&amp;C:</strong> ' + esc(v.terms) + ' &nbsp;·&nbsp; ' +
          '<strong>Documents on file:</strong> ' + esc(v.documents.join(', ')) + '</div>' +
      '</section>';
    });

    /* excluded */
    excluded.forEach(function (v) {
      html += '<section class="CreateRound_reviewProductCard__Kd9Ap is-out" id="rv-' + v.id + '">' +
        '<div class="CreateRound_reviewVendorHead__Gy5tR">' +
          '<span class="CreateRound_reviewVendorAv__Zk8mN" style="background:' + v.avatarBg + ';color:' + v.avatarFg + '">' + esc(v.initials) + '</span>' +
          '<div><div class="CreateRound_reviewVendorName__Tf3xL">' + esc(v.name) + '</div>' +
            '<div class="CreateRound_reviewVendorSub__Bn7cQ"><span>Quoted <span class="mono">₹' + v.unit + '/unit</span> · landed <span class="mono">' + inr(quoted(v).total) + '</span></span><span>' + esc(v.ai.why) + '</span></div></div>' +
          '<div class="CreateRound_reviewVendorRight__Qm4vD"><span class="ww-ai-badge v-' + v.ai.tone + '"><span class="bdot"></span>Not in this round</span></div>' +
        '</div>' +
      '</section>';
    });

    /* compact AI panel */
    html += '<section class="ww-ai" data-state="done">' +
      '<div class="ww-ai-head">' +
        '<div class="ww-ai-mark">' + AI.icons.sparkles + '</div>' +
        '<div style="min-width:0"><div class="ww-ai-title">AI Negotiator · round forecast</div>' +
        '<div class="ww-ai-sub">Replayed against ' + D.market.priorRoundsReplayed + ' prior rounds with these vendors.</div></div>' +
        '<div class="ww-ai-head-right"><span class="ww-ai-chip beta">Beta</span></div>' +
      '</div>' +
      '<div class="ww-ai-body">' +
        '<div class="ww-ai-verdict v-yes" style="opacity:1">' +
          '<div class="vic">' + AI.icons.thumbUp + '</div>' +
          '<div class="vmain"><div class="vlabel">' + esc(D.strategy.headline) +
            '<span class="vconf">' + D.strategy.confidence + '% confidence</span></div>' +
            '<div class="vline">Expected landed saving <strong>' + inr0(O.expectedSaving) + '</strong> (' + pct(O.expectedSaving / O.l1Total * 100) + ') against today\'s L1, ' +
            inr0(O.bestSaving) + ' if every target lands and ' + inr0(O.downSaving) + ' even if only ' + esc(O.l1Vendor.name.split(' ')[0]) + ' waives its charges.</div></div>' +
        '</div>' +
        AI.section('Success odds by vendor', '<div class="ai-rank">' + included.map(function (v) {
          return '<div class="ai-rank-row"><div class="ai-rank-n">' + v.ai.probability + '%</div>' +
            '<div class="ai-rank-av" style="background:' + v.avatarBg + ';color:' + v.avatarFg + '">' + esc(v.initials) + '</div>' +
            '<div class="ai-rank-main"><div class="ai-rank-name">' + esc(v.name) + '</div>' +
              '<div class="ai-rank-meta"><span>Target <span class="mono">₹' + (effective(st, v).base != null ? effective(st, v).base : v.unit) + '</span></span>' +
              '<span>Landed <span class="mono">' + inr0(projected(v, effective(st, v)).total) + '</span></span>' +
              '<span>Median reply <span class="mono">' + v.history.medianResponseHrs + 'h</span></span></div></div>' +
            '<div class="ai-rank-right"><span class="ww-ai-badge v-' + v.ai.tone + '"><span class="bdot"></span>' + esc(v.ai.badge) + '</span>' +
            '<button type="button" class="ww-ai-cite" data-target="#rv-' + v.id + '">' + AI.icons.link + 'See targets</button></div></div>';
        }).join('') + '</div>') +
        AI.section('Against the benchmark', AI.renderCompare([
          { k: 'Current L1', v: '₹' + O.l1Vendor.unit, n: esc(O.l1Vendor.name) },
          { k: '12-month best', v: '₹' + D.market.bestTwelveMonth.unit, n: D.market.bestTwelveMonth.ref + ' · ' + D.market.bestTwelveMonth.when },
          { k: 'Market index', v: '₹' + D.market.indexUnit, n: 'West India · ' + D.market.asOf },
          { k: 'Round target', v: '₹' + st.globals.base, tone: 'down', n: 'Walk-away ₹' + D.strategy.anchor.walkAway }
        ], 4)) +
        '<div class="ww-ai-foot"><div class="ww-ai-meta">' + AI.icons.shield +
          '<span>Analysed <span class="mono">' + esc(D.strategy.audit) + '</span></span></div></div>' +
        '<div class="ww-ai-disclaimer">' + AI.icons.dotWarn + '<span>' + esc(D.strategy.disclaimerText) + '</span></div>' +
      '</div></section>';

    root.innerHTML = html;

    /* footer + cite scrolling */
    var info = document.getElementById('footerTargetInfo');
    if (info) info.innerHTML = ' · <span class="mono">' + included.length + '</span> vendors · <span class="mono">' + totalTargets + '</span> targets';

    root.querySelectorAll('.ww-ai-cite').forEach(function (c) {
      c.addEventListener('click', function () {
        var el = document.querySelector(c.dataset.target);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.transition = 'box-shadow .3s ease';
        el.style.boxShadow = '0 0 0 3px rgba(79,70,229,.30)';
        setTimeout(function () { el.style.boxShadow = ''; }, 1400);
      });
    });
  }

  function cell(k, v, mono) {
    return '<div><div class="CreateRound_reviewMetaK__Rd4nV">' + esc(k) + '</div>' +
           '<div class="CreateRound_reviewMetaV__Jp9wA' + (mono ? ' mono' : '') + '">' + esc(v) + '</div></div>';
  }
  function roundOdds(included) {
    var miss = 1;
    included.forEach(function (v) { miss *= (1 - v.ai.probability / 100); });
    return Math.round((1 - miss) * 100);
  }

  /* ═══════════════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('reviewRoot')) {
      renderReview();
      var back = document.getElementById('backBtn');
      if (back) back.addEventListener('click', function () { window.location.href = './index.html'; });
      return;
    }
    renderFieldGrid();
    renderVendors();
    wire();
    refresh();
    var panel = document.getElementById('aiNegotiator');
    /* delegated so the actions work the instant they are painted, even
       while the summary is still typing itself out */
    panel.addEventListener('click', function (e) {
      var apply = e.target.closest('#aiApply');
      if (apply) { if (!apply.dataset.done) applyTargets(apply); return; }
      if (e.target.closest('#aiDismiss')) panel.querySelector('.ww-ai-body').hidden = true;
    });
    AI.attach(panel, buildPlan);
  });
})();
