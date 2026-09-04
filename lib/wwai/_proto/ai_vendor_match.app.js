/* ═══════════════════════════════════════════════════════════════════
   Workwise · AI vendor matching — interaction layer
   Drives both screens: the Add-products step (index.html) and the
   Matched-vendors review (vendors.html).
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var D = window.WWData;
  var AI = window.WWAi;
  var esc = AI.esc;
  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── icons used outside the AI engine ──────────────────────────── */
  var I = {
    shield14: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>',
    lock18: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
    xClose: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    search12: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg>',
    pkg: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package" aria-hidden="true"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"></path><path d="M12 22V12"></path><polyline points="3.29 7 12 12 20.71 7"></polyline><path d="m7.5 4.27 9 5.15"></path></svg>',
    plus: '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus" aria-hidden="true"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>',
    alertSm: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>',
    check10: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
    x12: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x" aria-hidden="true"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>',
    chev: '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="vm-chev" aria-hidden="true"><path d="m9 18 6-6-6-6"></path></svg>',
    spark10: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>',
    check13: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
    users12: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>'
  };

  function mono(v) { return '<span class="mono">' + esc(v) + '</span>'; }
  function pct(n) { return n + '%'; }
  function one(n) { return (Math.round(n * 10) / 10).toFixed(1); }

  /* ── cross-screen state (prototype only — no server here) ──────── */
  var STORE = 'wwvm.state.v1';
  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORE);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* private mode — fall through to defaults */ }
    return null;
  }
  function saveState(s) {
    try { sessionStorage.setItem(STORE, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }
  function defaultState() {
    var sel = {};
    D.staged.forEach(function (pid) {
      sel[pid] = D.catalogueById[pid].matches.map(function (v) { return v.id; });
    });
    return { seed: D.seed, staged: D.staged.slice(), applied: false, selection: sel, bypass: {} };
  }
  /* State belongs to one basket, identified by its seed. A plain reload
     draws a new seed, so the demo starts clean every time — which is the
     point. Navigating to vendors.html carries the seed in the URL, so the
     selection survives that hop and only that hop. */
  function stateFitsSession(s) {
    return !!s && s.seed === D.seed &&
      Array.isArray(s.staged) &&
      s.staged.every(function (pid) { return !!D.catalogueById[pid]; });
  }

  var saved = loadState();
  var state = stateFitsSession(saved) ? saved : defaultState();
  state.seed = D.seed;

  // a product staged after the state was written still needs a default set
  state.staged = state.staged.filter(function (pid) { return !!D.catalogueById[pid]; });
  state.selection = state.selection || {};
  state.bypass = state.bypass || {};
  Object.keys(state.bypass).forEach(function (pid) {
    if (state.staged.indexOf(pid) === -1) delete state.bypass[pid];
  });
  state.staged.forEach(function (pid) {
    if (!state.selection[pid]) {
      state.selection[pid] = D.catalogueById[pid].matches.map(function (v) { return v.id; });
    }
  });

  function selectedFor(pid) {
    var ids = state.selection[pid] || [];
    return ids.map(function (id) { return D.vendorById[id]; }).filter(Boolean);
  }
  function expectedFor(list) {
    return list.reduce(function (s, v) { return s + v.pQuote; }, 0) / 100;
  }

  /* ═════════════════════════════════════════════════════════════════
     SCREEN 1 · index.html — Add products
     ═══════════════════════════════════════════════════════════════ */
  function initProducts() {
    var listEl = document.getElementById('result-list');
    var emptyEl = document.getElementById('result-empty');
    var chipsEl = document.getElementById('search-chips');
    var stagedEl = document.getElementById('staged-list');
    var countEl = document.getElementById('staged-count');
    var footEl = document.getElementById('staged-footer');
    var draftBtn = document.getElementById('create-draft');
    var panel = document.getElementById('ai-vendor-match');

    /* ── search results, exactly as the live list renders them ──── */
    function depthBadge(p) {
      if (p.noVendors) {
        return '<span class="ww-ai-badge v-no" title="No vendor is eligible for this product under the current subscription rules">' +
               I.spark10 + '0 matched · ' + mono('2') + ' one step away</span>';
      }
      var tone = p.matches.length >= 6 ? 'v-yes' : p.matches.length ? 'v-attention' : 'v-no';
      return '<span class="ww-ai-badge ' + tone + '" title="' +
             esc(p.matches.length + ' of ' + p.mappedByRules + ' category-eligible vendors clear the score bar of 60') +
             '">' + I.spark10 + mono(p.matches.length) + ' matched · top ' + mono(p.topScore) + '</span>';
    }

    function renderResults() {
      listEl.innerHTML = D.catalogue.map(function (p) {
        var meta = p.category + ' · ' + (p.sub || '');
        var hint = p.noVendors
          ? '<span class="StartRFQ_noVendorsHint__SVnGe" title="No vendors are currently mapped for this product. You can still add it — vendors can be assigned later.">' +
            I.alertSm + ' No vendors</span>'
          : '';
        if (p.arc) {
          hint = '<span class="vm-arc-tag" title="Covered by ' + esc(p.arc.contract) + '">' +
                 I.shield14 + ' Under ARC</span>';
        }
        return '<div class="StartRFQ_resultRow__kUtXR ' +
                 (p.noVendors ? 'StartRFQ_resultRowNoVendors__Jpxaq ' : ' ') + '" id="row-' + p.id + '">' +
                 '<span class="StartRFQ_resultIcon__ts_PX">' + I.pkg + '</span>' +
                 '<div class="StartRFQ_resultMain__QmF8Y">' +
                   '<div class="StartRFQ_resultName__i8NYN">' + esc(p.name) + '</div>' +
                   '<div class="StartRFQ_resultMeta___A_lZ">' + esc(meta) + '</div>' +
                 '</div>' +
                 '<div class="StartRFQ_resultActions__jIx2q">' + (p.arc ? '' : depthBadge(p)) + hint +
                   '<button type="button" class="StartRFQ_addBtn__BYmVa" data-add="' + p.id + '">' +
                   I.plus + ' Add</button>' +
                 '</div>' +
               '</div>';
      }).join('');
    }

    /* ── right rail ──────────────────────────────────────────────── */
    function renderStaged() {
      stagedEl.innerHTML = state.staged.map(function (pid) {
        var p = D.catalogueById[pid];
        var sel = selectedFor(pid);
        var avg = sel.length
          ? Math.round(sel.reduce(function (s, v) { return s + v.score; }, 0) / sel.length) : 0;
        var summary;
        if (p.noVendors) {
          summary = '<a class="vm-match" href="vendors.html?p=' + p.id + '&seed=' + D.seed + '">' +
              '<span class="vm-match-hd">No vendors matched</span>' +
              '<span class="ww-ai-badge v-no"><span class="bdot"></span>Blocked</span>' + I.chev +
              '<span class="vm-nb">' + mono('2') + ' vendors are one subscription away</span></a>';
        } else if (state.applied) {
          summary = '<a class="vm-match is-applied" href="vendors.html?p=' + p.id + '&seed=' + D.seed + '">' +
              '<span class="vm-match-hd">' + sel.length + ' vendors selected</span>' +
              '<span class="ww-ai-badge v-yes"><span class="bdot"></span>Applied</span>' + I.chev +
              '<span class="vm-nb">avg score ' + mono(avg) + ' · ' + mono(one(expectedFor(sel))) +
              ' quotes expected</span></a>';
        } else {
          summary = '<a class="vm-match" href="vendors.html?p=' + p.id + '&seed=' + D.seed + '">' +
              '<span class="vm-match-hd">' + p.matches.length + ' vendors matched</span>' +
              '<span class="ww-ai-badge v-pending"><span class="bdot"></span>Review</span>' + I.chev +
              '<span class="vm-nb">avg score ' + mono(p.avgScore) + ' · ' + mono(one(p.expectedQuotes)) +
              ' quotes expected</span></a>';
        }
        return '<div class="StartRFQ_stagedItem__8f2EV " id="staged-' + p.id + '">' +
                 '<span class="StartRFQ_stagedDot__x1M_W">' + I.check10 + '</span>' +
                 '<div class="StartRFQ_stagedItemInfo___79Yr">' +
                   '<div class="StartRFQ_stagedItemName__QT9TY">' + esc(p.name) + '</div>' +
                   '<div class="StartRFQ_stagedItemCat__KdnlA">' + esc(p.category) + '</div>' +
                   summary +
                 '</div>' +
                 '<button type="button" class="StartRFQ_removeBtn__etZIG" aria-label="Remove" title="Remove" data-remove="' + p.id + '">' +
                 I.x12 + '</button>' +
               '</div>';
      }).join('');

      countEl.textContent = state.staged.length;
      draftBtn.innerHTML = 'Create Draft (' + state.staged.length + ')' +
        '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right" aria-hidden="true"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>';
      draftBtn.disabled = state.staged.length === 0;

      var note = footEl.querySelector('.vm-staged-note');
      if (state.applied) {
        var all = {};
        state.staged.forEach(function (pid) {
          selectedFor(pid).forEach(function (v) { all[v.id] = v; });
        });
        var list = Object.keys(all).map(function (k) { return all[k]; });
        var html = I.check13 + '<span>' + mono(list.length) + ' vendors will be invited across ' +
          mono(state.staged.length) + ' lines · ' + mono(one(expectedFor(list))) +
          ' quotes expected</span>';
        if (!note) {
          note = document.createElement('div');
          note.className = 'vm-staged-note';
          footEl.insertBefore(note, footEl.firstChild);
        }
        note.innerHTML = html;
      } else if (note) {
        note.remove();
      }
    }

    /* ── the analysis plan ───────────────────────────────────────── */
    function buildPlan() {
      var b = D.basket(state.staged);
      var v = D.vendorById;
      var f = D.forecast;
      var rack = visible.filter(function (p) { return p.noVendors; })[0];
      var cite = function (label, target) { return { label: label, target: target }; };

      /* The basket is randomised per load, so a finding cannot name a
         product literally. stagedCite(n) cites the nth staged line. */
      function stagedCite(i) {
        var pid = state.staged[i] || state.staged[0];
        if (!pid) return null;
        var p = D.catalogueById[pid];
        return cite(p ? p.name : pid, '#staged-' + pid);
      }
      function cites() {
        return Array.prototype.slice.call(arguments).filter(Boolean);
      }

      var findings = [
        {
          tone: 'good',
          text: '<strong>Shree Textiles Pvt Ltd</strong> leads every line at ' + mono(v.shree.score) +
            '. Twelve awarded POs at this business unit, ' + mono(pct(v.shree.onTimePct)) +
            ' of receipts on or before the promised date, and the lowest observed rate in the pool at ' +
            mono(D.money(v.shree.lpr)) + '/pc — ' + mono('3.9%') + ' under the ' + mono(D.money(f.indexRate)) +
            ' category index, last seen on ' + mono(D.day(v.shree.lprOn)) + '. It is also the only vendor on ' +
            'your approved-vendor list for HOUSEKEEPING SUPPLY.',
          cites: cites(stagedCite(0), cite('Signal provenance', '#vm-prov'))
        },
        {
          tone: 'good',
          text: '<strong>Anand Linen Mills</strong> is the most likely to actually quote at ' +
            mono(pct(v.anand.pQuote)) + ' ± ' + mono(v.anand.band) + ': 23 of 28 invitations answered, ' +
            'median turnaround ' + mono(v.anand.turnaroundHrs + ' h') + ', last quote twelve days ago. ' +
            'It prices ' + mono(D.money(12)) + '/pc above Shree but still under the index.',
          cites: cites(stagedCite(1))
        },
        {
          tone: 'warn',
          text: '<strong>Rajhans Hometex LLP</strong> scores ' + mono(v.rajhans.score) +
            ' on performance and price, but its HOUSEKEEPING SUPPLY subscription lapses on ' +
            mono(D.day(v.rajhans.subscriptionTill)) + ' — ' + mono(v.rajhans.subDaysLeft + ' days') +
            ' from now, and twelve days before this RFQ is due to close on ' + mono(D.day(D.rfqClose)) +
            '. Invite it and you may collect a quote you are not able to award. Ask the vendor to renew, ' +
            'or drop it — this is the only reason its compliance component sits at ' +
            mono(Math.round(v.rajhans.components.compliance)) + '.',
          cites: [cite('Score weights', '#vm-prov')]
        },
        {
          tone: 'warn',
          text: '<strong>Nakshatra Weaves &amp; Co</strong> was onboarded on ' +
            mono(D.day(v.nakshatra.onboardedOn)) + ' and has no history at all — no prior RFQ, no last ' +
            'purchase rate, no GRN record. Its ' + mono(v.nakshatra.score) + ' is the HOUSEKEEPING SUPPLY ' +
            'prior, not a measurement, and with zero observations the interval on its response estimate is ' +
            mono('±' + v.nakshatra.band) + '. It is in as a price probe on one line, and it contributes ' +
            mono('0.7') + ' of the ' + mono(one(b.expectedQuotes)) + ' expected quotes on a prior alone — ' +
            'if you want a number you can defend in a review, plan for ' +
            mono(one(b.expectedQuotes - v.nakshatra.pQuote / 100)) + '.',
          cites: cites(stagedCite(2))
        },
        {
          tone: 'bad',
          text: '<strong>Suvarna Linens</strong> at ' + mono(v.suvarna.score) +
            ' is the clearest exclusion: two answers to seven invitations, never awarded, ' +
            mono(pct(v.suvarna.onTimePct)) + ' on-time on the two POs it did receive, and an expired Udyam ' +
            'certificate. <strong>Ashirwad Textile Traders</strong> (' + mono(v.ashirwad.score) +
            ', two open quality disputes) and <strong>Meridian Textile Co</strong> (' + mono(v.meridian.score) +
            ', no quote since Feb 2026) also fall below the bar of ' + mono(D.MODEL.bar) + '.',
          cites: [cite('Full ranked list', '#result-panel')]
        },
        {
          tone: 'warn',
          text: '<strong>Single-vendor concentration.</strong> Shree Textiles is the only recommended vendor ' +
            'on your approved-vendor list. Its probability of quoting is ' + mono(pct(v.shree.pQuote)) +
            ', so there is roughly a ' + mono('1 in 5') + ' chance this RFQ closes with no AVL-compliant quote ' +
            'on any line. Trident Terry Mills is the closest substitute on price at ' + mono(D.money(v.trident.lpr)) +
            ' — one percent above Shree — but it is not on the list.',
          cites: []
        },
        /* A line the buyer forced past the rate-contract gate. The model is
           not policing them — it is making sure the consequence is visible
           at the moment they still have the option to back out. */
        (function () {
          var ids = Object.keys(state.bypass).filter(function (id) { return state.staged.indexOf(id) !== -1; });
          if (!ids.length) return null;
          var p = D.catalogueById[ids[0]], a = p.arc, r = state.bypass[ids[0]];
          var delta = Math.round(((D.forecast.indexRate - a.rate) / a.rate) * 1000) / 10;
          return {
            tone: 'bad',
            text: '<strong>' + esc(p.name) + ' is already on ' + esc(a.contract) + '</strong> at ' +
              mono(D.money(a.rate)) + '/' + esc(a.uom) + ' with ' + esc(a.vendor) + ', live to ' +
              esc(a.validTill) + ' — ' + mono(D.num(a.committedQty - a.drawnQty)) + ' ' +
              esc(p.uom.toLowerCase()) + ' still undrawn. The category index is ' +
              mono(D.money(D.forecast.indexRate)) + ', so the contract is already ' + mono(delta + '%') +
              ' better than open market. Raising an RFQ here splits volume away from that commitment. ' +
              'This RFQ is now flagged as a rate-contract bypass and needs ' +
              '<strong>' + esc(r.approvers.join(' and ')) + '</strong> before it can be published.',
            cites: cites(cite(p.name, '#staged-' + p.id))
          };
        })(),

        /* only when the current search actually surfaced an unsourceable line */
        rack ? {
          tone: 'warn',
          text: '<strong>' + esc(rack.name) + ' returns zero vendors</strong>, and it is not a catalogue gap. ' +
            'No vendor holds both an ENGINEERING category subscription and a Workwise Grand hotel subscription — ' +
            mono('2') + ' candidates are one subscription away.',
          cites: cites(cite(rack.name, '#row-' + rack.id))
        } : null
      ].filter(Boolean);

      var provenance =
        '<div class="vm-prov" id="vm-prov">' + D.provenance.map(function (r) {
          return '<div class="vm-prov-row">' +
                   '<div class="vm-prov-sig">' + esc(r.signal) + '</div>' +
                   '<div><span class="vm-kind ' + r.kind + '">' + r.kind + '</span></div>' +
                   '<div class="vm-prov-src">' + esc(r.source) + '</div>' +
                 '</div>';
        }).join('') + '</div>';

      var nearMiss =
        '<div class="vm-nearmiss">' + D.engineeringNearMiss.map(function (n) {
          return '<div class="vm-nearmiss-row">' +
                   '<div class="vm-nearmiss-name">' + esc(n.name) + '<span>' + esc(n.city) + ' · ' + esc(n.history) + '</span></div>' +
                   '<div class="vm-nearmiss-txt">Holds ' + esc(n.holds) + '. <b>Missing:</b> ' + esc(n.missing) + '.</div>' +
                 '</div>';
        }).join('') + '</div>';

      var extra =
        AI.section('What is observed and what is derived', provenance) +
        (rack ? AI.section('Why ' + esc(rack.name) + ' has no vendors', nearMiss) : '') +
        '<div id="vm-delta-slot"></div>';

      return {
        steps: [
          { label: 'Reading ' + state.staged.length + ' staged products across 2 categories', note: 'HOUSEKEEPING SUPPLY, ENGINEERING', ms: 520 },
          { label: 'Scanning ' + D.audit.rfqs + ' prior RFQs at Workwise Grand', note: D.audit.window, ms: 640 },
          { label: 'Deriving on-time % from ' + D.audit.grns + ' GRN receipts', note: 'turnaround from ' + D.audit.quoteTimestamps + ' quote timestamps', ms: 700 },
          { label: 'Scoring ' + b.mappedByRules + ' category-eligible vendors', note: '4 weighted signals', ms: 620 },
          { label: 'Checking subscription validity to ' + D.day(D.subHorizon), note: '1 lapses before bid close', ms: 520 }
        ],
        result: {
          verdict: 'yes',
          headline: 'Invite ' + b.recommended.length + ' of ' + b.mappedByRules + ' — 2 need a decision from you',
          confidence: 84,
          summary: 'Category rules map ' + b.mappedByRules + ' vendors to this basket and rank none of them. ' +
            b.recommended.length + ' carry enough evidence to be worth inviting, and the model expects ' +
            one(b.expectedQuotes) + ' quotes against the 4 you typically get. Two of the ' +
            b.recommended.length + ' come with a condition you should read before you send.',
          findingsLabel: 'What the model found',
          findings: findings,
          compareLabel: 'Current mapping against the recommendation',
          compare: [
            { k: 'Vendors mapped today', v: String(b.mappedByRules), n: 'boolean category ∩ hotel match, unranked' },
            { k: 'AI-recommended', v: String(b.recommended.length), tone: 'down', n: (b.mappedByRules - b.recommended.length) + ' dropped below the score bar of ' + D.MODEL.bar },
            { k: 'Expected quotes', v: one(b.expectedQuotes), tone: 'down', n: 'against a median of ' + D.baseline.medianQuotes + ' on the last 6 towel RFQs here' },
            { k: 'Est. best rate', v: D.money(f.bestRate), tone: 'down', n: 'per pc at ' + D.num(b.qty) + ' pcs · 4.7% under the ' + D.money(f.indexRate) + ' index' }
          ],
          compareCols: 4,
          factorsLabel: 'Scoring breakdown, averaged over the ' + b.recommended.length + ' recommended',
          factors: b.factors,
          extra: extra,
          audit: D.audit.rfqs + ' RFQs · ' + D.audit.grns + ' GRN receipts · ' +
                 D.audit.quoteTimestamps + ' quote timestamps · ' + D.audit.subscriptions +
                 ' subscriptions · ' + D.audit.at,
          actions:
            '<button type="button" class="ww-ai-run" id="apply-vendors">' + I.check13 +
              '<span>Apply recommended vendors</span></button>' +
            '<a class="ww-ai-run ghost" href="vendors.html?p=' + state.staged[0] + '&seed=' + D.seed + '">' + I.users12 +
              '<span>Review all ' + b.mappedByRules + '</span></a>',
          disclaimerText:
            'A recommendation, not an approval. On-time delivery and quote turnaround are derived from GRN ' +
            'postings and quote timestamps rather than read from stored fields, so treat them as estimates ' +
            'carrying the bands shown. The vendor selection and its audit record remain yours.'
        },
        onDone: function (body) { wireResult(body, b); }
      };
    }

    /* ── after a run: bind Apply, re-render the delta if applied ─── */
    function wireResult(body, b) {
      var btn = body.querySelector('#apply-vendors');
      if (!btn) return;
      if (state.applied) { markApplied(btn); renderDelta(body, b, false); return; }
      btn.addEventListener('click', function () {
        state.applied = true;
        state.staged.forEach(function (pid) {
          state.selection[pid] = D.catalogueById[pid].matches.map(function (v) { return v.id; });
        });
        saveState(state);
        markApplied(btn);
        renderDelta(body, b, true);
        renderStaged();
        flash(document.getElementById('staged-rail'));
      });
    }

    function markApplied(btn) {
      btn.classList.add('vm-applied-btn');
      btn.setAttribute('aria-disabled', 'true');
      btn.innerHTML = I.check13 + '<span>Applied to ' + state.staged.length + ' products</span>';
    }

    function renderDelta(body, b, animate) {
      var slot = body.querySelector('#vm-delta-slot');
      if (!slot) return;
      var cells = [
        { k: 'Vendors mapped', from: b.mappedByRules, to: b.recommended.length, dp: 0,
          n: 'category rules kept ' + b.mappedByRules + ' names with no ordering; the model keeps the ' +
             b.recommended.length + ' with evidence behind them' },
        { k: 'Expected quotes', from: D.baseline.medianQuotes, to: b.expectedQuotes, dp: 1,
          n: 'sum of P(quote) over the selected vendors, against a median of ' + D.baseline.medianQuotes +
             ' on the last 6 comparable RFQs' },
        { k: 'Est. best rate', from: D.baseline.bestRate, to: D.forecast.bestRate, dp: 0, money: true,
          n: 'per pc — the ' + D.money(D.forecast.bestRate) + ' assumes the volume break above ' +
             D.num(D.forecast.volumeBreakAt) + ' pcs' }
      ];
      slot.innerHTML =
        '<div class="vm-delta">' +
          '<div class="vm-delta-head">' + I.check13 +
            '<span>Recommended vendors written to ' + state.staged.length + ' staged products</span></div>' +
          '<div class="vm-delta-grid">' + cells.map(function (c, i) {
            return '<div class="vm-delta-cell">' +
                     '<div class="vm-delta-k">' + esc(c.k) + '</div>' +
                     '<div class="vm-delta-v">' +
                       '<span class="vm-delta-from">' + (c.money ? D.money(c.from) : c.from.toFixed(c.dp)) + '</span>' +
                       '<span class="vm-delta-arrow">→</span>' +
                       '<span class="vm-delta-to" data-count="' + i + '">' +
                         (c.money ? D.money(c.to) : c.to.toFixed(c.dp)) + '</span>' +
                     '</div>' +
                     '<div class="vm-delta-n">' + esc(c.n) + '</div>' +
                   '</div>';
          }).join('') + '</div>' +
        '</div>';

      if (animate && !reduced) {
        cells.forEach(function (c, i) {
          countTo(slot.querySelector('[data-count="' + i + '"]'), c.from, c.to, c.dp, c.money);
        });
      }
    }

    function countTo(el, from, to, dp, isMoney) {
      if (!el) return;
      var t0 = performance.now(), dur = 780;
      function paint(val) {
        el.textContent = isMoney ? D.money(Math.round(val)) : val.toFixed(dp);
      }
      function frame(t) {
        // clamp both ends: a frame timestamped before t0 would otherwise
        // overshoot backwards and leave a value that was never in the range
        var k = Math.max(0, Math.min(1, (t - t0) / dur));
        if (k >= 1 || !el.isConnected) { paint(to); return; }
        paint(from + (to - from) * (1 - Math.pow(1 - k, 3)));
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      // the number that matters is the destination — never let a stalled
      // frame loop leave a half-counted value on screen
      setTimeout(function () { paint(to); }, dur + 80);
    }

    function flash(el) {
      if (!el || reduced) return;
      el.classList.remove('vm-flash');
      void el.offsetWidth;
      el.classList.add('vm-flash');
      setTimeout(function () { el.classList.remove('vm-flash'); }, 950);
    }

    /* ── interactions ────────────────────────────────────────────── */
    listEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-add]');
      if (!btn) return;
      var pid = btn.getAttribute('data-add');
      var prod = D.catalogueById[pid];

      // A line on a live rate contract stops here until the buyer decides.
      if (prod && prod.arc && state.staged.indexOf(pid) === -1 && !state.bypass[pid]) {
        openArcGate(prod);
        return;
      }
      stage(pid);
    });

    function stage(pid) {
      if (state.staged.indexOf(pid) === -1) {
        state.staged.push(pid);
        state.selection[pid] = D.catalogueById[pid].matches.map(function (v) { return v.id; });
        saveState(state);
        renderStaged();
        flash(document.getElementById('staged-' + pid));
        panel.dataset.stale = '1';
        rerunSoon();
      } else {
        flash(document.getElementById('staged-' + pid));
      }
    }

    /* ── rate-contract gate ──────────────────────────────────────────
       The real control this models: an item on a live ARC must be drawn
       against that contract. Overriding is allowed, but it is recorded,
       and it adds mandatory approvers. Nothing here is a dead end — the
       buyer always has a way forward, which is why people actually use it.
       ───────────────────────────────────────────────────────────────── */
    var gateHost = null;
    function closeArcGate() {
      if (!gateHost) return;
      gateHost.remove(); gateHost = null;
      document.body.style.overflow = '';
    }

    function openArcGate(p) {
      closeArcGate();
      var a = p.arc, pol = D.arcPolicy;
      var pctDrawn = Math.round((a.drawnQty / a.committedQty) * 100);
      var left = a.committedQty - a.drawnQty;

      gateHost = document.createElement('div');
      gateHost.innerHTML =
        '<div class="vm-gate-backdrop"></div>' +
        '<div class="vm-gate" role="dialog" aria-modal="true" aria-labelledby="vm-gate-t">' +
          '<button type="button" class="vm-gate-x" aria-label="Close">' + I.xClose + '</button>' +
          '<div class="vm-gate-ic">' + I.lock18 + '</div>' +
          '<h2 class="vm-gate-title" id="vm-gate-t">This item is already on a rate contract</h2>' +
          '<p class="vm-gate-sub">' + esc(p.name) + ' is covered by <strong>' + esc(a.contract) +
            '</strong> with ' + esc(a.vendor) + ', live to ' + esc(a.validTill) + '.</p>' +

          '<div class="vm-gate-facts">' +
            '<div><span class="k">Contracted rate</span><span class="v">' + D.money(a.rate) + ' / ' + esc(a.uom) + '</span></div>' +
            '<div><span class="k">Drawn so far</span><span class="v">' + D.num(a.drawnQty) + ' of ' + D.num(a.committedQty) + '</span>' +
              '<span class="n">' + pctDrawn + '% · ' + D.num(left) + ' ' + esc(p.uom.toLowerCase()) + ' still available</span></div>' +
            '<div><span class="k">Scope</span><span class="v sm">' + esc(a.scope) + '</span></div>' +
            '<div><span class="k">Signed off by</span><span class="v sm">' + esc(a.signedBy) + '</span></div>' +
          '</div>' +

          '<p class="vm-gate-body">' + esc(pol.line1) + '</p>' +
          '<p class="vm-gate-body warn">' + esc(pol.line2) + '</p>' +

          '<div class="vm-gate-actions">' +
            '<button type="button" class="vm-gate-primary" data-gate="calloff">Raise a call-off on ' + esc(a.contract) + '</button>' +
            '<button type="button" class="vm-gate-danger" data-gate="bypass">Proceed anyway — needs sign-off</button>' +
          '</div>' +
          '<div class="vm-gate-foot">' + I.shield14 + '<span>' + esc(pol.ref) + '</span></div>' +
        '</div>';
      document.body.appendChild(gateHost);
      document.body.style.overflow = 'hidden';

      gateHost.querySelector('.vm-gate-backdrop').addEventListener('click', closeArcGate);
      gateHost.querySelector('.vm-gate-x').addEventListener('click', closeArcGate);
      gateHost.querySelector('[data-gate="calloff"]').addEventListener('click', function () {
        closeArcGate();
        toast('Call-off drafted on ' + a.contract + ' — no RFQ needed');
      });
      gateHost.querySelector('[data-gate="bypass"]').addEventListener('click', function () {
        closeArcGate();
        state.bypass[p.id] = {
          at: D.audit.at,
          by: D.user,
          contract: a.contract,
          approvers: pol.approvers.slice()
        };
        saveState(state);
        stage(p.id);
        renderBypassBanner();
        toast('Recorded as a rate-contract bypass · ' + pol.approvers.join(' + ') + ' added as approvers');
      });
    }

    function toast(msg) {
      var t = document.createElement('div');
      t.className = 'vm-toast';
      t.innerHTML = I.check13 + '<span>' + esc(msg) + '</span>';
      document.body.appendChild(t);
      setTimeout(function () { t.remove(); }, 4200);
    }

    function renderBypassBanner() {
      var host = document.getElementById('bypass-banner');
      if (!host) return;
      var ids = Object.keys(state.bypass).filter(function (id) { return state.staged.indexOf(id) !== -1; });
      if (!ids.length) { host.innerHTML = ''; host.hidden = true; return; }
      var first = state.bypass[ids[0]];
      host.hidden = false;
      host.innerHTML =
        '<div class="vm-bypass">' +
          '<div class="vm-bypass-ic">' + I.shield14 + '</div>' +
          '<div>' +
            '<div class="vm-bypass-t">' + ids.length + ' line bypasses an active rate contract</div>' +
            '<div class="vm-bypass-b">' + esc(first.contract) + ' · recorded against <strong>' + esc(first.by) +
              '</strong> at ' + esc(first.at) + '. <strong>' + esc(first.approvers.join(' and ')) +
              '</strong> must approve before this RFQ can be published.</div>' +
          '</div>' +
        '</div>';
    }

    stagedEl.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-remove]');
      if (!btn) return;
      var pid = btn.getAttribute('data-remove');
      state.staged = state.staged.filter(function (x) { return x !== pid; });
      saveState(state);
      renderStaged();
      rerunSoon();
    });

    var rerunTimer = null;
    function rerunSoon() {
      clearTimeout(rerunTimer);
      rerunTimer = setTimeout(function () {
        if (!state.staged.length) {
          panel.querySelector('.ww-ai-body').hidden = true;
          panel.dataset.state = 'idle';
          return;
        }
        state.applied = false;
        saveState(state);
        renderStaged();
        AI.run(panel, buildPlan());
      }, 420);
    }

    var search = document.getElementById('product-search');
    var clear = document.getElementById('search-clear');
    var countLabel = document.getElementById('result-count');

    /* The rows the current search is showing. buildPlan() reads this so a
       finding can never cite a line the visitor cannot see. */
    var visible = [];

    function applyFilter() {
      var q = search.value.trim().toLowerCase();
      visible = q ? D.visibleFor(q) : [];
      var show = {};
      visible.forEach(function (p) { show[p.id] = 1; });

      D.catalogue.forEach(function (p) {
        var row = document.getElementById('row-' + p.id);
        if (row) row.style.display = show[p.id] ? '' : 'none';
      });

      var total = q ? D.matchesFor(q).length : 0;
      countLabel.textContent = q
        ? (total > visible.length
            ? visible.length + ' of ' + total + ' results for "' + q + '"'
            : total + ' results for "' + q + '"')
        : D.num(D.totalCatalogue) + ' products';

      emptyEl.hidden = !!q;
      listEl.hidden = !q;
    }
    /* Suggested searches. These exist so the presenter never has to think of
       a term mid-demo — and so a visitor sees the catalogue is real. */
    function renderChips() {
      if (!chipsEl) return;
      chipsEl.innerHTML = D.suggestions.map(function (s) {
        return '<button type="button" class="vm-chip" data-term="' + esc(s.term) + '">' +
                 I.search12 + esc(s.label) +
               '</button>';
      }).join('');
    }
    if (chipsEl) {
      chipsEl.addEventListener('click', function (ev) {
        var btn = ev.target.closest('[data-term]');
        if (!btn) return;
        search.value = btn.getAttribute('data-term');
        applyFilter();
        search.focus();
      });
    }

    search.addEventListener('input', applyFilter);
    clear.addEventListener('click', function () { search.value = ''; applyFilter(); search.focus(); });
    // the catalogue hit count is randomised per load; refresh the label once
    // the rows exist, so the static value in the markup never survives
    requestAnimationFrame(applyFilter);

    draftBtn.addEventListener('click', function () {
      draftBtn.disabled = true;
      draftBtn.innerHTML = 'Creating draft…';
      setTimeout(function () {
        draftBtn.disabled = false;
        renderStaged();
      }, 1100);
    });

    /* ── first paint, then run automatically ─────────────────────── */
    renderResults();
    renderChips();
    renderStaged();
    renderBypassBanner();
    AI.attach(panel, buildPlan);
    if (state.staged.length) {
      setTimeout(function () { AI.run(panel, buildPlan()); }, 260);
    }
  }

  /* ═════════════════════════════════════════════════════════════════
     SCREEN 2 · vendors.html — Matched vendors
     ═══════════════════════════════════════════════════════════════ */
  function initVendors() {
    var tabsEl = document.getElementById('product-tabs');
    var tableEl = document.getElementById('vendor-table');
    var headEl = document.getElementById('vendor-panel-head');
    var noteBody = document.getElementById('note-body');
    var noteSub = document.getElementById('note-sub');

    var params = new URLSearchParams(location.search);
    var current = params.get('p');
    if (state.staged.indexOf(current) === -1) current = state.staged[0];

    function tone(score) { return score >= 75 ? 'good' : score >= 50 ? 'mid' : 'bad'; }

    function renderTabs() {
      tabsEl.innerHTML = state.staged.map(function (pid) {
        var p = D.catalogueById[pid];
        var sel = selectedFor(pid);
        return '<button type="button" class="vm-tab" role="tab" data-tab="' + p.id + '" ' +
               'aria-selected="' + (p.id === current) + '">' +
                 '<span class="vm-tab-name">' + esc(p.name) + '</span>' +
                 '<span class="vm-tab-meta">' + mono(sel.length) + ' invited of ' +
                   mono(p.mappedByRules) + ' eligible · ' + mono(one(expectedFor(sel))) + ' quotes</span>' +
               '</button>';
      }).join('');
    }

    function flagsFor(v) {
      var out = [];
      if (v.approvedVendorList) out.push('<span class="vm-flag ok">Approved-vendor list</span>');
      if (v.subExpiresBeforeClose) {
        out.push('<span class="vm-flag warn">Subscription ends ' + D.day(v.subscriptionTill) + '</span>');
      }
      if (v.coldStart) out.push('<span class="vm-flag info">No history · prior only</span>');
      if (v.disputes) out.push('<span class="vm-flag bad">' + v.disputes + ' open dispute' + (v.disputes > 1 ? 's' : '') + '</span>');
      if (!v.docsComplete && v.docsNote) {
        out.push('<span class="vm-flag bad" title="' + esc(v.docsNote) + '">' +
                 esc(v.docsFlag || v.docsNote) + '</span>');
      }
      if (!out.length) out.push('<span class="vm-flag ok">Clear</span>');
      return '<div class="vm-flags">' + out.join('') + '</div>';
    }

    function renderRows() {
      var p = D.catalogueById[current];
      var sel = state.selection[current] || [];
      var ranked = p.matches.concat(p.rejected);

      headEl.textContent = ranked.length + ' vendors eligible for ' + p.name +
        ' · ' + p.mappedByRules + ' mapped by category rules, ' + p.dormant + ' never invited';

      var html = ranked.map(function (v, i) {
        var on = sel.indexOf(v.id) !== -1;
        return '<tbody class="' + (on ? '' : 'is-out') + '" data-vendor="' + v.id + '"><tr class="vm-row-a">' +
          '<td><span class="vm-rank">' + (i + 1) + '</span></td>' +
          '<td>' +
            '<div class="vm-v-name">' + esc(v.name) + '</div>' +
            '<div class="vm-v-sub">' + esc(v.city) + ' · GSTIN <span class="mono">' + esc(v.gstin) + '</span></div>' +
          '</td>' +
          '<td class="num"><div class="vm-score ' + tone(v.score) + '">' +
            '<div class="vm-score-bar"><span data-w="' + v.score + '"></span></div>' +
            '<div class="vm-score-n">' + v.score + '</div></div>' +
            '<span class="vm-sub">' + (v.recommended ? (v.probeOnly ? 'probe' : 'recommended') : 'below bar') + '</span>' +
          '</td>' +
          '<td class="num">' + v.pQuote + '%<span class="vm-band">± ' + v.band + '</span></td>' +
          '<td class="num">' + (v.lpr ? D.money(v.lpr) + '<span class="vm-sub">' + D.day(v.lprOn) + '</span>'
                                      : '<span class="vm-none">no award yet</span>') + '</td>' +
          '<td class="num">' + (v.onTimePct === null ? '<span class="vm-none">—</span>'
                                : v.onTimePct + '%<span class="vm-band">derived</span>') + '</td>' +
          '<td class="num">' + (v.rfqsInvited ? v.responseRate + '%<span class="vm-sub">' +
                                v.quotesReturned + '/' + v.rfqsInvited + '</span>'
                                : '<span class="vm-none">0/0</span>') + '</td>' +
          '<td class="num">' + v.awards + '</td>' +
          '<td>' + flagsFor(v) + '</td>' +
          '<td><div class="vm-toggle-cell">' +
            '<button type="button" class="vm-toggle" aria-pressed="' + on + '" ' +
            'aria-label="' + (on ? 'Exclude ' : 'Include ') + esc(v.name) + '" data-toggle="' + v.id + '"></button>' +
            '<span class="vm-toggle-lbl">' + (on ? 'In' : 'Out') + '</span>' +
          '</div></td>' +
        '</tr>' +
        '<tr class="vm-row-b"><td></td><td colspan="9">' +
          '<div class="vm-v-why">' + esc(v.rationale) + '</div>' +
        '</td></tr></tbody>';
      }).join('');

      Array.prototype.forEach.call(tableEl.querySelectorAll('tbody'), function (t) { t.remove(); });
      tableEl.insertAdjacentHTML('beforeend', html);

      requestAnimationFrame(function () {
        tableEl.querySelectorAll('.vm-score-bar span').forEach(function (b) {
          b.style.width = b.dataset.w + '%';
        });
      });
    }

    function renderStats() {
      var p = D.catalogueById[current];
      var sel = selectedFor(current);
      var exp = expectedFor(sel);
      var withLpr = sel.filter(function (v) { return v.lpr; })
        .sort(function (a, b) { return a.lpr - b.lpr; });

      var e = document.getElementById('stat-expected');
      e.textContent = one(exp);
      e.className = 'vm-side-v ' + (exp >= 4 ? 'good' : exp >= 2.5 ? 'warn' : '');
      document.getElementById('stat-expected-n').innerHTML =
        'sum of P(quote) over the ' + sel.length + ' invited · a median of ' +
        mono(D.baseline.medianQuotes) + ' arrived on the last 6 comparable RFQs at this business unit';

      document.getElementById('stat-invited').textContent =
        sel.length + '/' + (p.matches.length + p.rejected.length);
      document.getElementById('stat-invited-n').innerHTML =
        mono(p.mappedByRules) + ' vendors are category-eligible; ' + mono(p.dormant) +
        ' of them have never been invited to an RFQ here and carry no signal at all';

      var rate = document.getElementById('stat-rate');
      if (withLpr.length) {
        rate.textContent = D.money(withLpr[0].lpr);
        document.getElementById('stat-rate-n').innerHTML =
          'lowest observed rate among the invited · ' + esc(withLpr[0].name) + ', ' +
          mono(D.day(withLpr[0].lprOn)) + ' · index ' + mono(D.money(D.forecast.indexRate));
      } else {
        rate.textContent = '—';
        document.getElementById('stat-rate-n').textContent =
          'no invited vendor has ever been awarded this line, so there is no rate to anchor on';
      }
    }

    function renderNote() {
      var p = D.catalogueById[current];
      var sel = selectedFor(current);
      var pool = sel.length ? sel : p.matches;
      noteSub.textContent = p.name + ' · ' + p.category + (p.sub ? ' · ' + p.sub : '') +
        ' · ' + D.num(p.qty) + ' ' + p.uom;

      var factors = ['performance', 'response', 'price', 'compliance'].map(function (k, i) {
        var names = ['Past performance', 'Response likelihood', 'Price competitiveness', 'Compliance & approvals'];
        return {
          name: names[i],
          score: pool.length
            ? Math.round(pool.reduce(function (s, v) { return s + v.components[k]; }, 0) / pool.length) : 0
        };
      });

      var notes = [];
      var expiring = pool.filter(function (v) { return v.subExpiresBeforeClose; });
      var cold = pool.filter(function (v) { return v.coldStart; });
      var noLpr = pool.filter(function (v) { return !v.lpr; });

      notes.push({
        tone: 'good',
        text: 'The invited set averages ' + mono(pool.length ? Math.round(
            pool.reduce(function (s, v) { return s + v.score; }, 0) / pool.length) : 0) +
          ' on the composite score and ' + mono(one(expectedFor(pool))) +
          ' expected quotes. Ranking is by score, not by the order the category query returns rows in.'
      });
      if (expiring.length) {
        notes.push({
          tone: 'warn',
          text: expiring.map(function (v) { return '<strong>' + esc(v.name) + '</strong>'; }).join(', ') +
            ' will lose its ' + esc(p.category) + ' subscription on ' +
            mono(D.day(expiring[0].subscriptionTill)) + ', before this RFQ closes on ' +
            mono(D.day(D.rfqClose)) + '. A quote from it cannot be awarded unless the subscription is renewed first.'
        });
      }
      if (cold.length) {
        notes.push({
          tone: 'warn',
          text: cold.map(function (v) { return '<strong>' + esc(v.name) + '</strong>'; }).join(', ') +
            ' has no measured history. Its score is a category prior with a ' + mono('±' + cold[0].band) +
            ' band on the response estimate — the widest in the set. Useful as a price probe, unsafe as an anchor.'
        });
      }
      if (noLpr.length) {
        notes.push({
          tone: 'warn',
          text: mono(noLpr.length) + ' invited vendor' + (noLpr.length > 1 ? 's have' : ' has') +
            ' never been awarded this line, so ' + (noLpr.length > 1 ? 'they carry' : 'it carries') +
            ' no last purchase rate. The price component falls back to the category prior of ' +
            mono(D.MODEL.priors.price) + ' rather than pretending to a number.'
        });
      }

      noteBody.hidden = false;
      noteBody.innerHTML =
        AI.section('Scoring breakdown for this line', AI.renderFactors(factors)) +
        AI.section('What that leaves you with', AI.renderFindings(notes)) +
        '<div class="ww-ai-foot"><div class="ww-ai-meta">' + AI.icons.shield +
          '<span>Analysed <span class="mono">' + esc(D.audit.rfqs + ' RFQs · ' + D.audit.grns +
          ' GRN receipts · ' + D.audit.at) + '</span></span></div></div>';

      requestAnimationFrame(function () {
        noteBody.querySelectorAll('.ww-ai-factor .fbar span').forEach(function (b) {
          b.style.width = b.dataset.w + '%';
        });
      });
    }

    function renderSidebar() {
      var w = D.MODEL.weights;
      document.getElementById('weight-chips').innerHTML =
        [['Past performance', w.performance], ['Response likelihood', w.response],
         ['Price competitiveness', w.price], ['Compliance & approvals', w.compliance]]
        .map(function (r) {
          return '<span class="vm-weight">' + esc(r[0]) + ' <span class="mono">' +
                 Math.round(r[1] * 100) + '%</span></span>';
        }).join('');
      document.getElementById('model-legend').innerHTML =
        '<b>' + esc(D.MODEL.version) + '</b> · a vendor is recommended at a score of ' +
        mono(D.MODEL.bar) + ' or above. A newly onboarded vendor with clean compliance is admitted below ' +
        'the bar as a single-line price probe. Vendors that fail the bar stay listed — the category rules ' +
        'still make them eligible, and excluding them is your call, not the model’s.';
    }

    function renderAll() {
      renderTabs(); renderRows(); renderStats(); renderNote(); renderSidebar();
    }

    tabsEl.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-tab]');
      if (!t) return;
      current = t.getAttribute('data-tab');
      history.replaceState(null, '', 'vendors.html?p=' + current + '&seed=' + D.seed);
      renderAll();
    });

    tableEl.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-toggle]');
      if (!t) return;
      var id = t.getAttribute('data-toggle');
      var sel = state.selection[current] || (state.selection[current] = []);
      var at = sel.indexOf(id);
      if (at === -1) sel.push(id); else sel.splice(at, 1);
      state.applied = true;
      saveState(state);
      renderRows(); renderStats(); renderTabs(); renderNote();
    });

    renderAll();
  }

  /* ── assistant button (present in the live app; inert here) ────── */
  function initFab() {
    var fab = document.querySelector('.vm-fab');
    if (fab) fab.addEventListener('click', function () { fab.blur(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initFab();
    if (document.getElementById('result-list')) initProducts();
    if (document.getElementById('vendor-rows')) initVendors();
  });
})();
