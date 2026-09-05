/* eslint-disable */
/**
 * AI Negotiator — the prototype's round-drafting analysis, carried across
 * intact: the ranked vendor list, headroom x likelihood, what-to-concede,
 * round strategy and projected outcome are all the signed-off copy.
 *
 * Ported from workwise-ai-prototypes/ai_negotiator/app.js
 */
import "../data/negotiator";


export function buildNegotiatorPlan(...args) {
  const D = window.WWData_negotiator;
  const AI = window.WWAi;
  // Read after D is bound — these are module-level in the prototype, where the
  // data script has already run by the time the plan is built.
  var GST = D.rfq.gstPct / 100;
  const QTY = D.product.qty;
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
  
    function quoted(v) { return landed(v.unit, v.freightPct, v.packagingPct); }
    // Cheapest landed quote — the baseline every target is measured against.
    // Restored from the prototype; the port had dropped it along with the
    // page-level render helpers it sat beside.
    function l1Vendor() {
      return D.vendors.slice().sort(function (a, b) { return quoted(a).total - quoted(b).total; })[0];
    }
    function r2(n) { return Math.round(n * 100) / 100; }
    function inr(n) { return '₹' + r2(n).toLocaleString('en-IN'); }
    function inr0(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
    function aiTargeted(v) {
      var t = v.ai.target;
      if (!t) return null;
      return landed(t.unit, t.freightPct, t.packagingPct);
    }
  
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
  
    function byId(id) {
      for (var i = 0; i < D.vendors.length; i++) if (D.vendors[i].id === id) return D.vendors[i];
      return null;
    }
  
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
        '<div class="ai-skiplist"><strong>Dropped as invalid:</strong> freight for Kaveri Home Textiles (quotes delivered-to-site — a freight line would double-count), and any target that was not strictly better than the quoted value. Solapur Terry Mills is left out of the round entirely.</div>';
  
      /* 3 · round strategy */
      var strategyHTML = '<div class="ai-strategy">' +
        '<div class="ai-anchor">' +
          '<div><div class="k">Opening target</div><div class="v">₹' + S.anchor.target + '</div><div class="n">what the round asks for</div></div>' +
          '<div><div class="k">Expected landing</div><div class="v">₹' + S.anchor.expectedLanding + '</div><div class="n">where Nandan has settled before</div></div>' +
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
          '<div class="n">Solapur excluded · Trident held to a light touch</div></div>' +
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
        onDone: function (body) {
          // The prototype bound these on the page root; that delegation was
          // never ported, so both buttons did nothing at all.
          //
          // Apply selects the fields the draft argues for rather than typing
          // every per-vendor number: the wizard only renders a target input
          // after its field is picked, so choosing the fields is the step that
          // actually unblocks the buyer. The numbers stay theirs to set.
          var applyFields = function () {
            // The field chips are click-handled divs (negFieldCard), not
            // labels or checkboxes — there is no input to tick. Find the chip
            // by its label text, then click the card itself. Cards already
            // selected are left alone: clicking one would toggle it OFF.
            var want = ["Base Price", "Freight", "Packaging"];
            var picked = 0;
            want.forEach(function (label) {
              var labelNode = Array.from(document.querySelectorAll('[class*="negFieldCardLabel"]'))
                .find(function (n) { return (n.textContent || "").trim() === label; });
              if (!labelNode) return;
              var card = labelNode;
              while (card && !(/negFieldCard(_|\s|$)/.test(card.className || "")
                     && !/Label|Header/.test(card.className || ""))) {
                card = card.parentElement;
              }
              if (!card) return;
              if (/Selected/.test(card.className || "")) return; // already on
              card.click();
              picked += 1;
            });
            return picked;
                    };

          body.addEventListener("click", function (e) {
            if (e.target.closest("#aiDismiss")) { body.hidden = true; return; }
            var apply = e.target.closest("#aiApply");
            if (!apply || apply.dataset.done) return;
            apply.disabled = true;
            apply.innerHTML = "<span>Applying\u2026</span>";
            setTimeout(function () {
              var n = applyFields();
              apply.dataset.done = "1";
              apply.innerHTML = "<span>" + (n
                ? "Applied \u2014 " + n + " field" + (n === 1 ? "" : "s") + " selected below"
                : "Applied") + "</span>";
            }, 650);
          });
        }
      };
    }
  return buildPlan(...args);
}

