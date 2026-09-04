/* ═══════════════════════════════════════════════════════════════════
   Workwise · Purchase Orders — page wiring
   Renders the PO table + detail record from data.js and drives the
   AI surfaces through window.WWAi (../_shared/ai-engine.js).
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var D = window.WWData;
  var AI = window.WWAi;
  var inr = D.inr;

  /* ── lucide icons lifted from the product ───────────────────────── */
  var IC = {
    eye: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"></path><circle cx="12" cy="12" r="3"></circle></svg>',
    more: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ellipsis" aria-hidden="true"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>',
    clock: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock" aria-hidden="true"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>',
    clock13: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock" aria-hidden="true"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="10"></circle></svg>',
    boxes: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-boxes" aria-hidden="true"><path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"></path><path d="m7 16.5-4.74-2.85"></path><path d="m7 16.5 5-3"></path><path d="M7 16.5v5.17"></path><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"></path><path d="m17 16.5-5-3"></path><path d="m17 16.5 4.74-2.85"></path><path d="M17 16.5v5.17"></path><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"></path><path d="M12 8 7.26 5.15"></path><path d="m12 8 4.74-2.85"></path><path d="M12 13.5V8"></path></svg>',
    building: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building2 lucide-building-2" aria-hidden="true"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path><path d="M10 6h4"></path><path d="M10 10h4"></path><path d="M10 14h4"></path><path d="M10 18h4"></path></svg>',
    file13: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>',
    file16: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>',
    file14: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M10 9H8"></path><path d="M16 13H8"></path><path d="M16 17H8"></path></svg>',
    clipCheck: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-check" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="m9 14 2 2 4-4"></path></svg>',
    chart: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-no-axes-column" aria-hidden="true"><path d="M5 21v-6"></path><path d="M12 21V3"></path><path d="M19 21V9"></path></svg>',
    phone: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-phone" aria-hidden="true"><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"></path></svg>',
    mail: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mail" aria-hidden="true"><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"></path><rect x="2" y="4" width="20" height="16" rx="2"></rect></svg>',
    hash: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hash" aria-hidden="true"><line x1="4" x2="20" y1="9" y2="9"></line><line x1="4" x2="20" y1="15" y2="15"></line><line x1="10" x2="8" y1="3" y2="21"></line><line x1="16" x2="14" y1="3" y2="21"></line></svg>',
    truck: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck" aria-hidden="true"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path><path d="M15 18H9"></path><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path><circle cx="17" cy="18" r="2"></circle><circle cx="7" cy="18" r="2"></circle></svg>',
    extLink: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-external-link" aria-hidden="true"><path d="M15 3h6v6"></path><path d="M10 14 21 3"></path><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path></svg>',
    download13: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download" aria-hidden="true"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg>',
    dlSmall: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download PurchaseOrders_dl__81rYE" aria-hidden="true"><path d="M12 15V3"></path><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path></svg>'
  };

  var esc = AI.esc;

  /* ── shell links ────────────────────────────────────────────────────
     ../_shared/nav.js owns the sidebar when it is loaded: it rewrites the
     four routes that have a prototype behind them and swallows the rest.
     This is only the fallback for a page served without it — it keeps the
     product's own hrefs from 404-ing. */
  function wireShell() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) !== '/') return;          // already resolved, or external
      e.preventDefault();
      if (href === '/dashboard/buyer/purchase-orders') window.location.href = 'index.html';
    });
  }

  /* ── badge markup ───────────────────────────────────────────────── */
  var BADGE = {
    yes:       { cls: 'v-yes',       label: 'Approve' },
    attention: { cls: 'v-attention', label: 'Review' },
    no:        { cls: 'v-no',        label: 'Hold' },
    pending:   { cls: 'v-pending',   label: '—' }
  };

  function badge(kind, title) {
    var b = BADGE[kind] || BADGE.pending;
    return '<span class="ww-ai-badge ' + b.cls + '"' +
           (title ? ' title="' + esc(title) + '"' : '') +
           '><span class="bdot"></span>' + b.label + '</span>';
  }

  /* ═══════════════════════════════════════════════════════════════
     INDEX — dashboard
     ═══════════════════════════════════════════════════════════════ */
  function renderAwaiting() {
    var host = document.getElementById('awaitingGrid');
    if (!host) return;
    host.innerHTML = D.AWAITING.map(function (a) {
      var po = a.po;
      var r = D.ROWS.filter(function (x) { return x.po === po; })[0];
      if (!r) return '';
      var v = D.VENDORS[r.vendor];
      var since = a.since;
      return '<div class="PurchaseOrders_awaitingCard__PjFdY" role="button" tabindex="0" data-po="' + po + '">' +
        '<div class="PurchaseOrders_aHead__wKK_z"><div>' +
          '<div class="PurchaseOrders_aNum__rqfqu">PO #' + po + '</div>' +
          '<div class="PurchaseOrders_aRfq__CNhG9">RFQ #' + r.rfq + '</div>' +
        '</div><span class="PurchaseOrders_aSince__L1UPL">' + since + '</span></div>' +
        '<div class="PurchaseOrders_aVendor__xdd_A">' + esc(v.name) + '</div>' +
        '<div class="PurchaseOrders_aItems__pR1U9">' + esc(r.itemsMeta) + ' · ' + esc(r.items) + '</div>' +
        '<div class="PurchaseOrders_aFlags__s6A8c">' + badge(r.ai, r.aiNote || '') +
          (r.aiNote ? '<span class="PurchaseOrders_pill__5tdRX ww-ai-rowhint">' + esc(r.aiNote) + '</span>' : '') +
        '</div>' +
        '<div class="PurchaseOrders_aFoot__gjNbV">' +
          '<div class="PurchaseOrders_aAmount__UGjuL">' + inr(r.value) + '</div>' +
          '<div class="PurchaseOrders_aCta__z2HMt"><button class="PurchaseOrders_btn__nFx_d PurchaseOrders_btnPrimary__vGdLH PurchaseOrders_btnSm__5kTuw" type="button">' +
            IC.check + 'Review</button></div>' +
        '</div>' +
      '</div>';
    }).join('');

    host.addEventListener('click', function (e) {
      var card = e.target.closest('[data-po]');
      if (card) go(card.getAttribute('data-po'));
    });
  }

  function renderTable() {
    var tb = document.getElementById('poRows');
    if (!tb) return;
    tb.innerHTML = D.ROWS.map(function (r) {
      var v = D.VENDORS[r.vendor];
      var p = D.PEOPLE[r.initiator];
      return '<tr data-po="' + r.po + '">' +
        '<td><span class="PurchaseOrders_statusPill__l4B2O PurchaseOrders_' + r.pill + '">' +
          '<span class="PurchaseOrders_dot__0nC_d"></span>' + esc(r.statusLabel) + '</span></td>' +
        '<td><div class="PurchaseOrders_poNum__lMpCo">#' + r.po + '</div>' +
          (r.pendingLine ? '<div class="PurchaseOrders_pendingLine__Gt7eL">' + esc(r.pendingLine) + '</div>' : '') + '</td>' +
        '<td><span class="PurchaseOrders_rfqLink__xMZZL">#' + r.rfq + '</span></td>' +
        '<td><div class="PurchaseOrders_vendorCell__kWhNK">' +
          '<div class="PurchaseOrders_vAvatar__EnUye PurchaseOrders_' + v.av + '">' + v.ini + '</div>' +
          '<div><div class="PurchaseOrders_vName__Yppqb">' + esc(v.name) + '</div></div></div></td>' +
        '<td><div style="font-size: 12.5px; color: var(--fg);">' + esc(r.items) + '</div>' +
          '<div class="PurchaseOrders_ago__EmxB6">' + esc(r.itemsMeta) + '</div></td>' +
        '<td class="PurchaseOrders_tdRight__rpCVo"><div class="PurchaseOrders_amount___sBJd">' + inr(r.value) + '</div></td>' +
        '<td class="ww-ai-col">' + badge(r.ai, r.aiNote || '') +
          (r.aiNote ? '<div class="ww-ai-colnote">' + esc(r.aiNote) + '</div>' : '') + '</td>' +
        '<td><div class="PurchaseOrders_initiator__xlUSF">' +
          '<div class="PurchaseOrders_iniAvatar__G_ndW PurchaseOrders_' + p.av + '">' + p.ini + '</div>' +
          '<span>' + esc(p.name) + '</span></div></td>' +
        '<td><div class="PurchaseOrders_mono__uY0_4" style="font-size: 12.5px; color: var(--fg-2);">' + esc(r.created) + '</div>' +
          '<div class="PurchaseOrders_ago__EmxB6">' + esc(r.ago) + '</div></td>' +
        '<td class="PurchaseOrders_tdRight__rpCVo"><div class="PurchaseOrders_rowActions__UXk8O">' +
          '<button class="PurchaseOrders_iconBtn__5jTvi" title="View" type="button">' + IC.eye + '</button>' +
          '<button class="PurchaseOrders_iconBtn__5jTvi" title="More" type="button">' + IC.more + '</button>' +
        '</div></td>' +
      '</tr>';
    }).join('');

    tb.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-po]');
      if (tr) go(tr.getAttribute('data-po'));
    });
  }

  function go(po) {
    if (D.DETAIL[po]) window.location.href = 'detail.html?po=' + po;
    else window.location.href = 'detail.html?po=' + D.DEFAULT_PO;
  }

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

  function initIndex() {
    renderAwaiting();
    renderTable();
    var panel = document.getElementById('aiQueue');
    if (panel) AI.attach(panel, queuePlan);
  }

  /* ═══════════════════════════════════════════════════════════════
     DETAIL
     ═══════════════════════════════════════════════════════════════ */
  function card(id, icon, title, pill, right, inner) {
    return '<section class="PurchaseOrders_sectionCard__YAcQG" id="' + id + '">' +
      '<div class="PurchaseOrders_sectionHead__Gb6cD"><div class="PurchaseOrders_hLeft__hnnJ6">' +
        '<div class="PurchaseOrders_ic__wh21b">' + icon + '</div><h2>' + title + '</h2>' +
        (pill ? '<span class="PurchaseOrders_pill__5tdRX">' + esc(pill) + '</span>' : '') +
      '</div>' + (right ? '<div class="PurchaseOrders_hRight__qlCmI">' + right + '</div>' : '') + '</div>' +
      inner + '</section>';
  }

  function renderHero(d) {
    return '<div class="PurchaseOrders_detailHeroInner__jEgaW">' +
      '<div class="PurchaseOrders_heroIdBlock__KM6A1">' +
        '<div class="PurchaseOrders_hEye__JEPqm">Purchase order</div>' +
        '<h1><span class="PurchaseOrders_poMono__E3K90">#' + d.po + '</span>' +
          '<span class="PurchaseOrders_statusPill__l4B2O PurchaseOrders_' + d.statusPill + '">' +
          '<span class="PurchaseOrders_dot__0nC_d"></span>' + esc(d.status) + '</span></h1>' +
        '<div class="PurchaseOrders_hSub__xGbDN">' +
          '<span class="PurchaseOrders_vendor__W2Ams">' + esc(d.vendor.name) + '</span>' +
          '<span class="PurchaseOrders_sep__gp1sZ">·</span>' +
          '<span class="PurchaseOrders_amount___sBJd">' + inr(d.total) + '</span>' +
          '<span class="PurchaseOrders_sep__gp1sZ">·</span>' +
          '<span class="PurchaseOrders_rfqLink__xMZZL PurchaseOrders_mono__uY0_4">RFQ #' + d.rfq + '</span>' +
          '<span class="PurchaseOrders_sep__gp1sZ">·</span>' +
          '<span>' + esc(d.bu) + '</span>' +
        '</div>' +
        '<div class="PurchaseOrders_heroPendingNote__hzOV1"><span class="PurchaseOrders_clockIc__wxeIx">' + IC.clock + '</span>' +
          '<span>' + esc(d.pendingNote) + '</span></div>' +
      '</div>' +
      '<div class="PurchaseOrders_heroActions___FEos">' +
        '<button class="PurchaseOrders_btn__nFx_d PurchaseOrders_btnSecondary__Z8sCQ" type="button">' +
        IC.download13 + 'Download PO</button>' +
      '</div>' +
    '</div>';
  }

  function renderItems(d) {
    var taxable = 0, tax = 0, units = 0, gsts = {};
    d.items.forEach(function (it) {
      var base = it.qty * it.rate;
      taxable += base; tax += base * it.gst / 100; units += it.qty; gsts[it.gst] = 1;
    });
    var gstKeys = Object.keys(gsts);
    var avgGst = gstKeys.length === 1 ? Number(gstKeys[0]).toFixed(2) + '%' : 'mixed';

    var rows = d.items.map(function (it, i) {
      var base = it.qty * it.rate;
      var t = base * it.gst / 100;
      return '<tr><td class="PurchaseOrders_itIdx__v_YPQ">' + (i < 9 ? '0' : '') + (i + 1) + '</td>' +
        '<td><div class="PurchaseOrders_itName__e6jQ5">' + esc(it.name) + '</div>' +
          '<div class="PurchaseOrders_itSpec__wBuCP"><span class="PurchaseOrders_itLabel__u92ns">Product size: </span>' + esc(it.size) + '</div>' +
          '<div class="PurchaseOrders_itSpec__wBuCP"><span class="PurchaseOrders_itLabel__u92ns">Product specification: </span>' + esc(it.spec) + '</div>' +
          '<div class="PurchaseOrders_itSpec__wBuCP"><span class="PurchaseOrders_itLabel__u92ns">Comment: </span>' + esc(it.comment) + '</div></td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + D.qty(it.qty) + '<span class="PurchaseOrders_itUnit___fv5s">' + esc(it.unit) + '</span></td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + inr(it.rate) + '</td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + it.gst + '% (' + inr(t) + ')</td>' +
        '<td class="num PurchaseOrders_num__XS__5" style="font-weight: 600;">' + inr(base + t) + '</td></tr>';
    }).join('');

    var table = '<table class="PurchaseOrders_itemsTable__ZmGSe"><thead><tr>' +
      '<th style="width: 36px;">#</th><th>Item</th>' +
      '<th class="num PurchaseOrders_num__XS__5">Qty</th>' +
      '<th class="num PurchaseOrders_num__XS__5">Unit price</th>' +
      '<th class="num PurchaseOrders_num__XS__5">GST %</th>' +
      '<th class="num PurchaseOrders_num__XS__5">Amount</th></tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
      '<tfoot><tr class="subtotal PurchaseOrders_subtotal__ekgq1"><td colspan="2">Subtotal</td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + D.qty(units) + '<span class="PurchaseOrders_itUnit___fv5s">units</span></td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + inr(taxable / units) + '<span class="PurchaseOrders_aggNote__fQwOk"> avg</span></td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + avgGst + '<span class="PurchaseOrders_aggNote__fQwOk"> avg</span>' +
          '<span class="PurchaseOrders_taxNote__R3OO0"> (' + inr(tax) + ')</span></td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + inr(taxable + tax) + '</td></tr>' +
      '<tr class="total PurchaseOrders_total__zwKN7"><td colspan="5">Grand total</td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + inr(taxable + tax) + '</td></tr></tfoot></table>';

    return card('itemsCard', IC.boxes, 'Items &amp; pricing',
      d.items.length + ' line item' + (d.items.length > 1 ? 's' : ''), '', table);
  }

  function renderVendor(d) {
    var v = d.vendor;
    var inner = '<div class="PurchaseOrders_vendorProfile__spbsu">' +
      '<div class="PurchaseOrders_vLogo__wS_0w PurchaseOrders_' + v.av + '">' + v.ini + '</div>' +
      '<div class="PurchaseOrders_vMain__DybRV">' +
        '<div class="PurchaseOrders_vName__Yppqb">' + esc(v.name) + '</div>' +
        '<div class="PurchaseOrders_vTagline__nOEEG">' + esc(v.tagline) + '</div>' +
        '<div class="PurchaseOrders_vMeta__xvSYX">' +
          '<div class="PurchaseOrders_row__LCOJj">' + IC.phone + '<span>Contact</span><span class="PurchaseOrders_v__pHfO_">' + esc(v.phone) + '</span></div>' +
          '<div class="PurchaseOrders_row__LCOJj">' + IC.mail + '<span>Email</span><span class="PurchaseOrders_v__pHfO_">' + esc(v.email) + '</span></div>' +
          '<div class="PurchaseOrders_row__LCOJj">' + IC.hash + '<span>GSTIN</span><span class="PurchaseOrders_v__pHfO_">' + esc(v.gstin) + '</span></div>' +
          '<div class="PurchaseOrders_row__LCOJj">' + IC.truck + '<span>On-time</span><span class="PurchaseOrders_v__pHfO_">' + esc(v.otd) + '</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="PurchaseOrders_vStats__CNpGP">' +
        '<div class="PurchaseOrders_stat__mT0SV">POs · 12 mo</div>' +
        '<div class="PurchaseOrders_statV__sk6z2">' + esc(v.pos) + '</div>' +
        '<div class="PurchaseOrders_stat__mT0SV PurchaseOrders_mt__TUds2">On-time</div>' +
        '<div class="PurchaseOrders_statV__sk6z2">' + esc(v.otd) + '</div>' +
      '</div>' +
    '</div>';
    return card('vendorCard', IC.building, 'Vendor profile', '', '', inner);
  }

  function renderRfq(d) {
    var inner = '<div class="PurchaseOrders_rfqContext__9fatE">' +
      '<div class="PurchaseOrders_rfqIc__T4DF_">' + IC.file16 + '</div>' +
      '<div class="PurchaseOrders_meta__797mf">' +
        '<div class="PurchaseOrders_title__96GYW"><span>' + esc(d.rfqTitle) + '</span>' +
          '<span class="PurchaseOrders_pill__5tdRX PurchaseOrders_pillOutline__w_iZY PurchaseOrders_mono__uY0_4">#' + d.rfq + '</span></div>' +
        '<div class="PurchaseOrders_sub__Dc4XL"><span>Workwise Hotels</span>' +
          '<span class="PurchaseOrders_sep__gp1sZ">·</span><span>' + esc(d.bu) + '</span>' +
          '<span class="PurchaseOrders_sep__gp1sZ">·</span><span>' + esc(d.dept) + '</span>' +
          '<span class="PurchaseOrders_sep__gp1sZ">·</span><span><span class="PurchaseOrders_em__xSopl">' + d.bidders + '</span> vendors quoted</span></div>' +
      '</div></div>' +
      '<div class="PurchaseOrders_rfqFinalized__Y5OZ8">Vendor selection finalized by <strong>' + esc(d.finalizedBy) +
      '</strong> based on commercial evaluation.</div>';
    var right = '<button class="PurchaseOrders_btn__nFx_d PurchaseOrders_btnSecondary__Z8sCQ PurchaseOrders_btnSm__5kTuw" type="button">' +
      IC.extLink + 'Open RFQ</button>';
    return card('rfqCard', IC.file13, 'RFQ context', '', right, inner);
  }

  function renderTech(d) {
    var list = d.techEval.map(function (t) {
      var stateCls = t.passed ? 'PurchaseOrders_tePassed__GrmHf' : 'PurchaseOrders_teFailed__Qj2vX';
      var clauses = t.clauses.map(function (c) {
        var pct = Math.round(c.got / c.max * 100);
        var bad = pct < 60;
        return '<tr><td><div class="PurchaseOrders_teClauseText___qPuP">' + esc(c.text) + '</div>' +
          '<div class="PurchaseOrders_teClauseBar__GdAdq' + (bad ? ' ww-bar-bad' : '') + '"><span style="width: ' + pct + '%;"></span></div></td>' +
          '<td class="num PurchaseOrders_num__XS__5 PurchaseOrders_mono__uY0_4">' + c.max + '</td>' +
          '<td class="num PurchaseOrders_num__XS__5 PurchaseOrders_mono__uY0_4">' + c.got + '</td></tr>';
      }).join('');
      return '<div class="PurchaseOrders_teProduct__7TzBp">' +
        '<div class="PurchaseOrders_teProductHead__MTKLt">' +
          '<div class="PurchaseOrders_teProductName__bkAKh">' + esc(t.product) + '</div>' +
          '<div class="PurchaseOrders_teProductMeta__ucCc8">' +
            '<span class="PurchaseOrders_pill__5tdRX PurchaseOrders_pillOutline__w_iZY PurchaseOrders_mono__uY0_4">Round ' + t.round + '</span>' +
            '<span class="PurchaseOrders_teScore__BKuOv ' + stateCls + '">' + t.score + '</span>' +
            '<span class="PurchaseOrders_teStatusPill__STdoG ' + stateCls + '">' + (t.passed ? 'Passed' : 'Failed') + '</span>' +
          '</div></div>' +
        '<div class="PurchaseOrders_teSubMeta__6R6se"><span>Passing mark <span class="PurchaseOrders_mono__uY0_4">' + t.mark + '</span></span>' +
          '<span class="PurchaseOrders_teApprover__c0XGB">Evaluated by <strong>' + esc(t.approver) + '</strong>' +
          '<span class="PurchaseOrders_when__VX18Q"> · ' + esc(t.when) + '</span></span></div>' +
        '<table class="PurchaseOrders_teClauseTable__Had3W"><thead><tr><th>Clause</th>' +
          '<th class="num PurchaseOrders_num__XS__5">Max</th><th class="num PurchaseOrders_num__XS__5">Obtained</th></tr></thead>' +
          '<tbody>' + clauses + '</tbody></table></div>';
    }).join('');
    return card('techCard', IC.clipCheck, 'Technical evaluation',
      d.techEval.length + ' product' + (d.techEval.length > 1 ? 's' : ''), '',
      '<div class="PurchaseOrders_teList__cJRe0">' + list + '</div>');
  }

  function renderCompare(d) {
    var rows = d.compare.map(function (c) {
      return '<tr' + (c.winner ? ' class="PurchaseOrders_isWinner__eBuhL"' : '') + '>' +
        '<td><div class="PurchaseOrders_vCell___yVNi">' +
          '<div class="PurchaseOrders_vAvatar__EnUye PurchaseOrders_' + c.vendor.av + '">' + c.vendor.ini + '</div>' +
          '<div class="PurchaseOrders_vn__jMtDw">' + esc(c.vendor.name) + '</div>' +
          (c.winner ? '<span class="PurchaseOrders_winnerMarker__utS75">' +
            '<svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check" aria-hidden="true"><path d="M20 6 9 17l-5-5"></path></svg>Awarded</span>' : '') +
        '</div></td>' +
        '<td class="PurchaseOrders_gstinCell__u_6Vs">' + esc(c.gstin) + '</td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + (c.winner ?
          '<span class="PurchaseOrders_winnerAmt__SGWDv">' + inr(c.amount) + '</span>' :
          '<span>' + inr(c.amount) + '</span>') + '</td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + esc(c.delivery) + '</td>' +
        '<td class="num PurchaseOrders_num__XS__5">' + (c.delta === 'baseline' ?
          '<span class="PurchaseOrders_saving___NQZ2">— Baseline</span>' :
          '<span class="PurchaseOrders_over__QMF9m">' + esc(c.delta) + '</span>') + '</td></tr>';
    }).join('');
    var table = '<table class="PurchaseOrders_compareTable__juW0y"><thead><tr>' +
      '<th>Vendor</th><th>GSTIN</th>' +
      '<th class="num PurchaseOrders_num__XS__5">Quoted</th>' +
      '<th class="num PurchaseOrders_num__XS__5">Delivery</th>' +
      '<th class="num PurchaseOrders_num__XS__5">Δ vs L1</th></tr></thead><tbody>' + rows + '</tbody></table>';
    return card('compareCard', IC.chart, 'Quote comparison', d.bidders + ' bidders', '', table);
  }

  function renderDocs(d) {
    var list = d.docs.map(function (f) {
      return '<span class="PurchaseOrders_docItem__3l8_M PurchaseOrders_pdf__v33OX">' +
        '<div class="PurchaseOrders_fileIc__cEXy_">' + IC.file14 + '</div>' +
        '<div class="PurchaseOrders_meta__797mf"><div class="PurchaseOrders_name__x8NHV">' + esc(f.name) + '</div>' +
        '<div class="PurchaseOrders_sub__Dc4XL">' + esc(f.sub) + '</div></div>' + IC.dlSmall + '</span>';
    }).join('');
    return card('docsCard', IC.file13, 'Documents &amp; attachments', d.docs.length + ' files', '',
      '<div class="PurchaseOrders_docsList__YEeWq">' + list + '</div>');
  }

  function renderWorkflow(d) {
    var steps = d.workflow.steps.map(function (s) {
      var cls = s.state === 'done' ? 'PurchaseOrders_wfDone__EYkSi'
              : s.state === 'current' ? 'PurchaseOrders_wfCurrent__6qn5Z'
              : 'PurchaseOrders_wfPending__NQ3Aw';
      var who = '';
      if (s.by) {
        var p = D.PEOPLE[s.by];
        who = '<div class="PurchaseOrders_stepMeta__XqJpT">' +
          '<span class="PurchaseOrders_miniAv__ExCB3 PurchaseOrders_' + p.av + '">' + p.ini + '</span>' +
          '<span class="PurchaseOrders_byName__VxXFG">' + esc(p.name) + '</span></div>';
      } else if (s.vendorStep) {
        who = '<div class="PurchaseOrders_stepMeta__XqJpT">' +
          '<span class="PurchaseOrders_miniAv__ExCB3 PurchaseOrders_' + d.vendor.av + '">' + d.vendor.ini + '</span>' +
          '<span class="PurchaseOrders_byName__VxXFG">' + esc(d.vendor.name) + '</span></div>';
      }
      var stat = s.state === 'done' ? 'Done' : s.state === 'current' ? 'Awaiting' : '';
      return '<div class="PurchaseOrders_wfStep__aKDd9 ' + cls + '"><div class="PurchaseOrders_wfNode__MNO_w"></div>' +
        '<div class="PurchaseOrders_body__CSZIB"><div class="PurchaseOrders_stepName__U7HBQ">' + esc(s.name) + '</div>' +
        who +
        (s.policy ? '<div class="PurchaseOrders_stepMeta__XqJpT" style="margin-top: 4px;"><span class="PurchaseOrders_policy__kdZ4G">' + esc(s.policy) + '</span></div>' : '') +
        (s.when ? '<div class="PurchaseOrders_stepWhen__vB54V">' + esc(s.when) + '</div>' : '') +
        '</div><div class="PurchaseOrders_rightStat__MB7r2">' + stat + '</div></div>';
    }).join('');
    return '<div class="PurchaseOrders_workflowCard__HyuF9" id="auditCard">' +
      '<div class="PurchaseOrders_wfHead__MomB6"><span>Audit trail</span>' +
      '<span class="PurchaseOrders_wfProgress__6ercQ">' + esc(d.workflow.progress) + '</span></div>' + steps + '</div>';
  }

  function renderDates(d) {
    return '<div class="PurchaseOrders_datesCard__IMzJq" id="datesCard">' +
      '<div class="PurchaseOrders_dHead__4OUGF">Key dates</div>' +
      d.dates.map(function (x) {
        return '<div class="PurchaseOrders_dRow__OlAPr "><span class="PurchaseOrders_k__B38u3">' + esc(x.k) + '</span>' +
          '<span class="PurchaseOrders_v__pHfO_">' + esc(x.v) + '</span></div>';
      }).join('') + '</div>';
  }

  function renderActivity(d) {
    var items = d.activity.map(function (a) {
      var p = D.PEOPLE[a.by];
      return '<div class="PurchaseOrders_activityItem__8fx3m PurchaseOrders_aiComment___m2VV">' +
        '<div class="PurchaseOrders_aDot__g2T_Y PurchaseOrders_' + p.av + '">' + p.ini + '</div>' +
        '<div class="PurchaseOrders_aBody__0zHYh"><div class="PurchaseOrders_aMsg__k4Ua5">' +
          '<span class="PurchaseOrders_who__2Qa14">' + esc(p.name) + '</span> ' + esc(a.msg) + '</div>' +
        '<div class="PurchaseOrders_aWhen__P6K_G">' + esc(a.when) + '</div></div></div>';
    }).join('');
    return '<div class="PurchaseOrders_workflowCard__HyuF9" id="activityCard">' +
      '<div class="PurchaseOrders_wfHead__MomB6"><span>Activity</span>' +
      '<span class="PurchaseOrders_wfProgress__6ercQ">' + d.activity.length + ' events</span></div>' +
      '<div class="PurchaseOrders_activityList__Z8fFa">' + items + '</div></div>';
  }

  function renderPendingNote(d) {
    return '<div class="PurchaseOrders_pendingNoteCard__23Wtf" id="pendingNoteCard">' +
      '<div class="PurchaseOrders_pnHead__F3DEM">' + IC.clock13 + '<span>Pending approval</span></div>' +
      '<div class="PurchaseOrders_pnBody__ZsGqD">' + esc(d.asideNote) + '</div></div>';
  }

  /* ── the memo plan ──────────────────────────────────────────────── */
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
        fillAside(d, r);
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

  var VMETA = {
    yes:       { cls: 'v-yes',       label: 'Clear to approve' },
    attention: { cls: 'v-attention', label: 'Needs attention' },
    no:        { cls: 'v-no',        label: 'Do not approve' }
  };

  function fillAside(d, r) {
    var host = document.querySelector('#aiAside .ww-ai-body');
    if (!host) return;
    var meta = VMETA[r.verdict] || VMETA.attention;
    var bars = r.factors.map(function (f) {
      var tone = f.score >= 75 ? 'good' : f.score >= 45 ? 'mid' : 'bad';
      return '<div class="ww-ai-mini-factor ' + tone + '"><span class="mf-name">' + esc(f.name) + '</span>' +
        '<span class="mf-bar"><i style="--w:' + f.score + '%"></i></span>' +
        '<span class="mf-val">' + f.score + '</span></div>';
    }).join('');
    host.innerHTML =
      '<div class="ww-ai-mini ' + meta.cls + '">' +
        '<div class="mini-top"><span class="mini-label">' + esc(meta.label) + '</span>' +
        '<span class="mini-conf mono">' + r.confidence + '%</span></div>' +
        '<div class="mini-line">' + esc(r.asideLine) + '</div>' +
      '</div>' +
      '<div class="ww-ai-mini-factors">' + bars + '</div>' +
      '<button type="button" class="ww-ai-cite ww-ai-mini-jump" data-target="#aiMemo">Read the full memo</button>';
    var jump = host.querySelector('.ww-ai-mini-jump');
    jump.addEventListener('click', function () {
      var el = document.getElementById('aiMemo');
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    requestAnimationFrame(function () {
      host.querySelectorAll('.mf-bar i').forEach(function (i) { i.classList.add('on'); });
    });
  }

  function initDetail() {
    var params = new URLSearchParams(window.location.search);
    var po = params.get('po');
    if (!po || !D.DETAIL[po]) po = D.DEFAULT_PO;
    var d = D.DETAIL[po];
    var v = D.VERDICTS[po];

    document.title = 'Workwise | Purchase Order #' + po;

    var crumb = document.getElementById('crumbPo');
    if (crumb) crumb.textContent = '#' + po;

    document.getElementById('poHero').innerHTML = renderHero(d);

    var stack = document.getElementById('sectionStack');
    stack.insertAdjacentHTML('beforeend',
      renderItems(d) + renderVendor(d) + renderRfq(d) + renderTech(d) + renderCompare(d) + renderDocs(d));

    var aside = document.getElementById('asideStack');
    aside.insertAdjacentHTML('beforeend',
      renderPendingNote(d) + renderWorkflow(d) + renderDates(d) + renderActivity(d));

    var memo = document.getElementById('aiMemo');
    var sub = memo.querySelector('.ww-ai-sub');
    if (sub) sub.textContent = 'PO #' + po + ' · ' + d.vendor.name + ' · ' + inr(d.total);
    AI.attach(memo, function () { return memoPlan(d, v); });

    var asidePanel = document.getElementById('aiAside');
    var asideRun = asidePanel.querySelector('.ww-ai-run');
    if (asideRun) asideRun.addEventListener('click', function () {
      memo.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var btn = memo.querySelector('.ww-ai-run');
      if (btn && !btn.dataset.busy) btn.click();
    });

    var back = document.getElementById('crumbBack');
    if (back) back.addEventListener('click', function () { window.location.href = 'index.html'; });
    var crumbList = document.getElementById('crumbList');
    if (crumbList) crumbList.addEventListener('click', function () { window.location.href = 'index.html'; });
  }

  /* ── boot ───────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', function () {
    wireShell();
    if (document.getElementById('poRows')) initIndex();
    if (document.getElementById('poHero')) initDetail();

    var fab = document.getElementById('aiFab');
    if (fab) fab.addEventListener('click', function () {
      var panel = document.getElementById('aiMemo') || document.getElementById('aiQueue');
      if (!panel) return;
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var btn = panel.querySelector('.ww-ai-run');
      if (btn && !btn.dataset.busy && panel.dataset.state !== 'done') btn.click();
    });
  });
})();
