/* eslint-disable */
/**
 * AI vendor matching — the prototype's analysis plan, carried across intact.
 *
 * Every finding, number and citation is the signed-off copy. What changed:
 *   · the client naming is re-badged for IHG;
 *   · `state` is passed in by the host screen instead of read from the
 *     prototype's own page state;
 *   · the prototype's result-wiring (onDone) is dropped — the real RFQ wizard
 *     owns what happens when you apply the recommendation.
 *
 * Ported from workwise-ai-prototypes/ai_vendor_match/app.js
 */
import "../data/vendorMatch";

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

/**
 * @param {object} state  { staged: string[], bypass?: Record<string,any> }
 * @returns {object} a plan for WWAi.run()
 */
export function buildVendorMatchPlan(state) {
  const D = window.WWData_vendorMatch;
  const AI = window.WWAi;
  const esc = AI.esc;
  const visible = D.catalogue;

  function mono(v) { return '<span class="mono">' + esc(v) + '</span>'; }
  function pct(n) { return n + '%'; }
  function one(n) { return (Math.round(n * 10) / 10).toFixed(1); }

    /* ── the analysis plan ───────────────────────────────────────── */
  const _build = function () {
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
          text: '<strong>Sriram Textiles Pvt Ltd</strong> leads every line at ' + mono(v.shree.score) +
            '. Twelve awarded POs at this business unit, ' + mono(pct(v.shree.onTimePct)) +
            ' of receipts on or before the promised date, and the lowest observed rate in the pool at ' +
            mono(D.money(v.shree.lpr)) + '/pc — ' + mono('3.9%') + ' under the ' + mono(D.money(f.indexRate)) +
            ' category index, last seen on ' + mono(D.day(v.shree.lprOn)) + '. It is also the only vendor on ' +
            'your approved-vendor list for HOUSEKEEPING SUPPLY.',
          cites: cites(stagedCite(0), cite('Signal provenance', '#vm-prov'))
        },
        {
          tone: 'good',
          text: '<strong>Nandan Terry Ltd</strong> is the most likely to actually quote at ' +
            mono(pct(v.anand.pQuote)) + ' ± ' + mono(v.anand.band) + ': 23 of 28 invitations answered, ' +
            'median turnaround ' + mono(v.anand.turnaroundHrs + ' h') + ', last quote twelve days ago. ' +
            'It prices ' + mono(D.money(12)) + '/pc above Sriram but still under the index.',
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
          text: '<strong>Solapur Terry Mills</strong> at ' + mono(v.suvarna.score) +
            ' is the clearest exclusion: two answers to seven invitations, never awarded, ' +
            mono(pct(v.suvarna.onTimePct)) + ' on-time on the two POs it did receive, and an expired Udyam ' +
            'certificate. <strong>Ashirwad Textile Traders</strong> (' + mono(v.ashirwad.score) +
            ', two open quality disputes) and <strong>Kaveri Home Textiles</strong> (' + mono(v.meridian.score) +
            ', no quote since Feb 2026) also fall below the bar of ' + mono(D.MODEL.bar) + '.',
          cites: [cite('Full ranked list', '#result-panel')]
        },
        {
          tone: 'warn',
          text: '<strong>Single-vendor concentration.</strong> Sriram Textiles is the only recommended vendor ' +
            'on your approved-vendor list. Its probability of quoting is ' + mono(pct(v.shree.pQuote)) +
            ', so there is roughly a ' + mono('1 in 5') + ' chance this RFQ closes with no AVL-compliant quote ' +
            'on any line. Trident Terry Mills is the closest substitute on price at ' + mono(D.money(v.trident.lpr)) +
            ' — one percent above Sriram — but it is not on the list.',
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
            'No vendor holds both an ENGINEERING category subscription and a InterContinental Marine Drive hotel subscription — ' +
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
          { label: 'Scanning ' + D.audit.rfqs + ' prior RFQs at InterContinental Marine Drive', note: D.audit.window, ms: 640 },
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
              '<span>Apply recommended vendors</span></button>',
          disclaimerText:
            'A recommendation, not an approval. On-time delivery and quote turnaround are derived from GRN ' +
            'postings and quote timestamps rather than read from stored fields, so treat them as estimates ' +
            'carrying the bands shown. The vendor selection and its audit record remain yours.'
        }
      };
  };

  return _build();
}

/** The prototype's default basket, for a host screen with nothing staged yet. */
export const defaultStaged = () => {
  const D = window.WWData_vendorMatch;
  return (D.catalogue || []).slice(0, 3).map((p) => p.id);
};

/**
 * Bridge the host screen's selection onto the prototype catalogue.
 *
 * The wizard stages numeric variant ids; the analysis is written against the
 * prototype's own slugs, so the two are matched on name. Anything that does
 * not match is ignored rather than passed through — an unknown id would come
 * back undefined from `catalogueById` and take the whole panel down.
 */
export const stagedFromNames = (names = []) => {
  const D = window.WWData_vendorMatch;
  const cat = D?.catalogue || [];
  const norm = (t) => String(t || "").toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  const hits = [];
  names.forEach((n) => {
    const key = norm(n);
    if (!key) return;
    const hit = cat.find((p) => {
      const c = norm(p.name);
      return c === key || c.includes(key) || key.includes(c.split(" ").slice(0, 2).join(" "));
    });
    if (hit && hits.indexOf(hit.id) === -1) hits.push(hit.id);
  });
  return hits.length ? hits : defaultStaged();
};

export default buildVendorMatchPlan;
