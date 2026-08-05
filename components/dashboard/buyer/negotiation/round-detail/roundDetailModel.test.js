// Model-level tests for the Negotiation Command Center.
//
// These assert observable outputs a buyer reads off the page — the outcome a
// line is classified as, the sign and shape of a money string, which lines are
// allowed onto a % axis, and the denominators — not internal wiring.
//
// The backend contract for GET /negotiation/rounds/:id/detail landed after this
// UI, so several cases here deliberately feed a DIFFERENT field spelling than
// the primary one to prove the normalizer still produces the same view model.

import {
  normalizeRoundDetail,
  normalizeLine,
  normalizeTotals,
  deriveOutcome,
  defaultScope,
  isNonNumericTargetField,
  targetFieldLabel,
  baselineSourceCopy,
  roundDenominatorText,
  roundDenominatorExplanation,
  formatMoney,
  formatSignedMoney,
  formatSignedPct,
  movementSentence,
  formatApproverList,
  OUTCOME,
} from "./roundDetailModel";

const line = (over = {}) =>
  normalizeLine({
    rfq_product_id: 1,
    product_name: "Bath Towel 500 GSM",
    vendor_id: 9,
    vendor_name: "Goodluck Textiles",
    quantity: 100,
    uom: "PCS",
    baseline_unit_price: 250,
    baseline_line_total: 25000,
    baseline_source: "original_quote",
    target_unit_price: 225,
    achieved_line_total: 23000,
    responded: true,
    ...over,
  });

describe("normalizeLine — defensive field reading", () => {
  it("reconstructs the line total from unit × quantity when the total is absent", () => {
    const l = normalizeLine({
      product_name: "P",
      quantity: 40,
      baseline_unit_price: 12.5,
      achieved_unit_price: 10,
      responded: true,
    });
    expect(l.baselineTotal).toBe(500);
    expect(l.achievedTotal).toBe(400);
    expect(l.savedValue).toBe(100);
    expect(l.achievedPct).toBeCloseTo(20, 5);
  });

  it("accepts numeric strings from PG NUMERIC columns", () => {
    const l = normalizeLine({
      product_name: "P",
      baseline_line_total: "25,000.00",
      achieved_line_total: "23000.00",
      responded: "1",
    });
    expect(l.baselineTotal).toBe(25000);
    expect(l.achievedTotal).toBe(23000);
    expect(l.responded).toBe(true);
    expect(l.savedValue).toBe(2000);
  });

  it("reads alternative aliases for the same concept", () => {
    const l = normalizeLine({
      item_name: "Aliased product",
      organization_name: "Aliased vendor",
      baseline_total: 900,
      achieved_total: 800,
      quote_received: true,
    });
    expect(l.productName).toBe("Aliased product");
    expect(l.vendorName).toBe("Aliased vendor");
    expect(l.savedValue).toBe(100);
  });

  it("projects an absolute unit target from a percentage-mode target", () => {
    const l = line({ target_unit_price: 10, target_mode: "percentage" });
    expect(l.targetMode).toBe("percentage");
    expect(l.requestedPct).toBe(10);
    expect(l.targetUnit).toBeCloseTo(225, 5);
  });

  it("infers responded from the presence of an achieved figure when the flag is missing", () => {
    expect(normalizeLine({ product_name: "P", achieved_line_total: 10 }).responded).toBe(true);
    expect(normalizeLine({ product_name: "P" }).responded).toBe(false);
  });

  it("defaults gracefully on a completely empty row", () => {
    const l = normalizeLine({}, 3);
    expect(l.productName).toBe("Unnamed product");
    expect(l.vendorName).toBe("Vendor");
    expect(l.baselineTotal).toBeNull();
    expect(l.chartEligible).toBe(false);
  });
});

describe("non-numeric targets", () => {
  it.each(["payment_terms", "documents", "comment", "comments", "global_comment", "delivery_period", "vendor_tc"])(
    "treats %s as non-numeric",
    (f) => {
      expect(isNonNumericTargetField(f)).toBe(true);
      expect(isNonNumericTargetField(`target_${f}`)).toBe(true);
    }
  );

  it("treats base_price and dynamic charge slugs as numeric", () => {
    expect(isNonNumericTargetField("base_price")).toBe(false);
    expect(isNonNumericTargetField("freight")).toBe(false);
    expect(isNonNumericTargetField("packaging")).toBe(false);
  });

  it("collects flat target_* text columns into chips and keeps them off the chart", () => {
    const l = normalizeLine({
      product_name: "P",
      baseline_line_total: 1000,
      target_payment_terms: "Net 45",
      target_field: "payment_terms",
    });
    expect(l.nonNumericTargets).toEqual([
      { field: "payment_terms", label: "Payment terms", value: "Net 45" },
    ]);
    expect(l.hasNumericTarget).toBe(false);
    expect(l.chartEligible).toBe(false);
  });

  it("collects an explicit non_numeric_targets array", () => {
    const l = normalizeLine({
      product_name: "P",
      baseline_line_total: 1000,
      non_numeric_targets: [{ field: "documents", value: "ISO certificate" }],
    });
    expect(l.nonNumericTargets[0].label).toBe("Documents");
  });

  it("humanises an unknown field key rather than dropping it", () => {
    expect(targetFieldLabel("some_new_charge")).toBe("Some new charge");
  });
});

describe("deriveOutcome", () => {
  it("flags a line the vendor never answered", () => {
    expect(line({ responded: false, achieved_line_total: null }).outcome).toBe(OUTCOME.NO_RESPONSE);
  });

  it("flags a price that went UP as a regression, not a zero", () => {
    const l = line({ achieved_line_total: 25236 });
    expect(l.savedValue).toBe(-236);
    expect(l.outcome).toBe(OUTCOME.REGRESSED);
  });

  it("reports target met when the achieved total lands at or under the target", () => {
    const l = line({ achieved_line_total: 22500 });
    expect(l.outcome).toBe(OUTCOME.TARGET_MET);
  });

  it("reports improved when money moved but the target was not reached", () => {
    expect(line({ achieved_line_total: 24000 }).outcome).toBe(OUTCOME.IMPROVED);
  });

  it("reports no change on a flat re-quote", () => {
    expect(line({ achieved_line_total: 25000 }).outcome).toBe(OUTCOME.NO_CHANGE);
  });

  it("never claims a target result when no target was set", () => {
    const l = line({ target_unit_price: null, achieved_line_total: 24000 });
    expect(l.hasNumericTarget).toBe(false);
    expect(l.outcome).toBe(OUTCOME.IMPROVED); // achieved-only, no target language
    expect(l.outcome).not.toBe(OUTCOME.TARGET_MET);
  });

  it("honours a server-supplied outcome enum, including synonyms", () => {
    expect(line({ outcome: "price_increased" }).outcome).toBe(OUTCOME.REGRESSED);
    expect(line({ outcome: "below_target" }).outcome).toBe(OUTCOME.IMPROVED);
    expect(line({ outcome: "TARGET_MET" }).outcome).toBe(OUTCOME.TARGET_MET);
  });

  it("falls back to derivation on an unrecognised server enum", () => {
    expect(line({ outcome: "some_future_enum", achieved_line_total: 22500 }).outcome).toBe(
      OUTCOME.TARGET_MET
    );
  });

  it("derives directly from a partial line object", () => {
    expect(
      deriveOutcome({ responded: true, savedValue: -1, hasNumericTarget: false })
    ).toBe(OUTCOME.REGRESSED);
  });
});

describe("signed money and percentage formatting", () => {
  it("renders a saving with a plus and a regression with a real minus sign", () => {
    expect(formatSignedMoney(1200)).toBe("+₹1,200");
    expect(formatSignedMoney(-236)).toBe("−₹236");
    expect(formatSignedMoney(0)).toBe("₹0");
    expect(formatSignedMoney(null)).toBe("—");
  });

  it("never leaks a rupee figure when visibility is locked", () => {
    expect(formatMoney(25000, { locked: true })).toBe("—");
    expect(formatSignedMoney(-236, { locked: true })).toBe("—");
  });

  it("signs percentages the same way", () => {
    expect(formatSignedPct(8.25)).toBe("+8.3%");
    expect(formatSignedPct(-1.5)).toBe("−1.5%");
    expect(formatSignedPct(0)).toBe("0%");
  });

  it("states a regression in words rather than as a bare negative", () => {
    expect(movementSentence(-236)).toBe("Price increased ₹236");
    expect(movementSentence(2000)).toBe("Saved ₹2,000");
    expect(movementSentence(0)).toBe("No change in price.");
    expect(movementSentence(null)).toBe("No revised price received.");
    expect(movementSentence(-236, { locked: true })).toBe(
      "Prices are hidden while quotes are sealed."
    );
  });
});

describe("baseline provenance", () => {
  it("explains each known source in plain language", () => {
    expect(baselineSourceCopy("original_quote")).toMatch(/original RFQ quote/i);
    expect(baselineSourceCopy("previous_round")).toMatch(/previous negotiation round/i);
  });

  it("still says something useful for an unknown source", () => {
    expect(baselineSourceCopy("some_new_source")).toMatch(/some new source/);
    expect(baselineSourceCopy(null)).toMatch(/not recorded/i);
  });
});

describe("normalizeTotals", () => {
  const lines = [
    line({ baseline_line_total: 25000, achieved_line_total: 23000, target_unit_price: 225 }),
    line({
      rfq_product_id: 2,
      baseline_line_total: 10000,
      achieved_line_total: 10500,
      target_unit_price: 225,
    }),
  ];

  it("derives every aggregate from the lines when the server omits totals", () => {
    const t = normalizeTotals(undefined, lines);
    expect(t.baselineValue).toBe(35000);
    expect(t.achievedValue).toBe(33500);
    expect(t.savedValue).toBe(1500);
    expect(t.lineCount).toBe(2);
    expect(t.respondedCount).toBe(2);
  });

  it("prefers server totals over derivation", () => {
    const t = normalizeTotals({ saved_value: 1234, baseline_value: 40000 }, lines);
    expect(t.savedValue).toBe(1234);
    expect(t.baselineValue).toBe(40000);
  });

  it("never reports target_met when there is no target", () => {
    const noTarget = [line({ target_unit_price: null, achieved_line_total: 23000 })];
    const t = normalizeTotals(undefined, noTarget);
    expect(t.targetValue).toBeNull();
    expect(t.targetMet).toBeNull();
  });

  // Regression guard: a partially-answered round used to sum `achieved` over
  // responded lines only while `baseline` covered every line, which reported
  // each silent line as a full saving (a 29%-attained round rendered as 88%).
  it("keeps baseline − achieved === saved when some vendors have not replied", () => {
    const partial = [
      line({ baseline_line_total: 100000, achieved_line_total: 94000, target_unit_price: 225 }),
      line({ rfq_product_id: 2, baseline_line_total: 100000, achieved_line_total: 100236, target_unit_price: 225 }),
      line({
        rfq_product_id: 3,
        baseline_line_total: 100000,
        target_unit_price: null,
        achieved_line_total: null,
        responded: false,
      }),
    ];
    const t = normalizeTotals(undefined, partial);
    expect(t.baselineValue).toBe(300000);
    expect(t.savedValue).toBe(5764);
    expect(t.baselineValue - t.achievedValue).toBe(t.savedValue);
  });

  it("scores attainment only over the lines that actually carried a target", () => {
    const mixed = [
      // targeted: baseline 100000, target 90000 → asked 10000, saved 6000
      line({ baseline_line_total: 100000, achieved_line_total: 94000, target_unit_price: 225, quantity: 400 }),
      // untargeted: must not inflate attainment
      line({
        rfq_product_id: 2,
        baseline_line_total: 100000,
        target_unit_price: null,
        achieved_line_total: null,
        responded: false,
      }),
    ];
    const t = normalizeTotals(undefined, mixed);
    expect(t.targetedBaselineValue).toBe(100000);
    expect(t.requestedSaving).toBe(10000);
    expect(t.attainmentPct).toBeCloseTo(60, 5);
    expect(t.requestedPct).toBeCloseTo(10, 5);
    expect(t.targetMet).toBe(false);
  });

  it("keeps a net regression negative rather than clamping it to zero", () => {
    const t = normalizeTotals(undefined, [
      line({ baseline_line_total: 1000, achieved_line_total: 1236, target_unit_price: null }),
    ]);
    expect(t.savedValue).toBe(-236);
    expect(t.savedPct).toBeCloseTo(-23.6, 5);
  });
});

describe("scope selection", () => {
  const build = (meta) => normalizeRoundDetail({ data: { round: { id: 1 }, items: [], meta } });

  it("defaults to cycle when sibling rounds exist", () => {
    expect(defaultScope(build({ has_siblings: true }))).toBe("cycle");
  });

  it("defaults to round when this is the only round in the cycle", () => {
    expect(defaultScope(build({ has_siblings: false }))).toBe("round");
  });

  it("honours an explicit scope echoed by the server", () => {
    expect(defaultScope(build({ scope: "round", has_siblings: true }))).toBe("round");
  });
});

// Product definition: a round's number is its position in the WHOLE RFQ, not
// within its product. One round = one position, however many products it
// covers. So the denominator is every round on the parent, and the per-product
// count is context that goes in a sentence rather than in the fraction.
describe("roundDenominatorText", () => {
  it("renders the position within the whole parent", () => {
    expect(
      roundDenominatorText({ roundNumber: 7, roundsOnParent: 138, roundsOnProducts: 4, isArc: false })
    ).toBe("Round 7 of 138");
  });

  it("does not divide by the per-product count", () => {
    // "Round 7 of 4" would be nonsense, and "Round 4 of 4" would hide 134 rounds.
    expect(
      roundDenominatorText({ roundNumber: 7, roundsOnParent: 138, roundsOnProducts: 4 })
    ).not.toMatch(/of 4$/);
  });

  it("degrades when the denominator is unknown", () => {
    expect(roundDenominatorText({ roundNumber: 3 })).toBe("Round 3");
  });

  it("says nothing extra when every round on the parent touched these items", () => {
    expect(
      roundDenominatorExplanation({ roundNumber: 2, roundsOnParent: 3, roundsOnProducts: 3 })
    ).toBeNull();
  });

  it("explains the gap when most rounds covered other items", () => {
    const sentence = roundDenominatorExplanation({
      roundNumber: 7,
      roundsOnParent: 138,
      roundsOnProducts: 4,
      isArc: false,
    });
    expect(sentence).toMatch(/numbered across the whole RFQ/);
    expect(sentence).toMatch(/4 of those 138/);
  });

  it("says the right parent word for ARC rounds", () => {
    expect(
      roundDenominatorExplanation({ roundNumber: 1, roundsOnParent: 4, roundsOnProducts: 1, isArc: true })
    ).toMatch(/rate contract/);
  });
});

describe("normalizeRoundDetail — whole payload", () => {
  it("accepts the axios body and the bare data object identically", () => {
    const data = { round: { id: 7, round_number: 2, status: "ACTIVE" }, items: [] };
    expect(normalizeRoundDetail({ status: 1, data }).round.roundId).toBe(7);
    expect(normalizeRoundDetail(data).round.roundId).toBe(7);
  });

  it("maps the stored uppercase status enums the column actually holds", () => {
    const s = (status) => normalizeRoundDetail({ round: { id: 1, status }, items: [] }).round;
    expect(s("PENDING_APPROVAL").statusPresentation.label).toBe("Awaiting your approval");
    expect(s("ACTIVE").statusPresentation.label).toBe("Open with vendors");
    expect(s("CANCELLED").isTerminated).toBe(true);
    expect(s("EXPIRED").isTerminated).toBe(true);
    expect(s("COMPLETED").isSettled).toBe(true);
  });

  it("tells a lapsed round apart from a cancelled one", () => {
    const s = (status) => normalizeRoundDetail({ round: { id: 1, status }, items: [] }).round;
    // EXPIRED is written only by the approval-deadline cron; it means nobody
    // approved the round in time, so no vendor was ever asked anything.
    expect(s("EXPIRED").status).toBe("lapsed");
    expect(s("EXPIRED").statusPresentation.label).toBe("Lapsed — never approved");
    expect(s("EXPIRED").neverReachedVendors).toBe(true);

    expect(s("CANCELLED").status).toBe("cancelled");
    expect(s("CANCELLED").statusPresentation.label).toBe("Cancelled");
    expect(s("CANCELLED").neverReachedVendors).toBe(false);
  });

  it("splits ENDED on whether anyone responded and whether a quote was approved", () => {
    const s = (over) =>
      normalizeRoundDetail({ round: { id: 1, status: "ENDED", ...over }, items: [] }).round;

    expect(s({ response_count: 0 }).status).toBe("no_vendor_response");
    expect(s({ response_count: 2 }).status).toBe("ready_for_decision");
    expect(s({ response_count: 2, has_approved_quote: true }).status).toBe("concluded");
  });

  it("prefers the state the server derived over anything it could re-derive", () => {
    // Raw column says ENDED with no responses, which would derive to
    // "no vendor response" — but the server has more context and said
    // concluded. The server wins; the page must not second-guess it.
    const m = normalizeRoundDetail({
      round: { id: 1, status: "ENDED", state: "concluded", response_count: 0 },
      items: [],
    });
    expect(m.round.status).toBe("concluded");
    expect(m.round.statusPresentation.label).toBe("Concluded");
  });

  it("maps the derived neg_status enum the listing uses", () => {
    const s = (status) => normalizeRoundDetail({ round: { id: 1, status }, items: [] }).round;
    // Lower-case values are already-derived buckets and must not be run back
    // through the raw-column ladder.
    expect(s("awaiting_decision").statusPresentation.label).toBe("Ready for your decision");
    expect(s("ready_for_decision").statusPresentation.label).toBe("Ready for your decision");
    expect(s("cancelled").isTerminated).toBe(true);
  });

  it("folds a vendor roster out of the lines when none is supplied", () => {
    const m = normalizeRoundDetail({
      round: { id: 1 },
      items: [
        { product_name: "A", vendor_id: 9, vendor_name: "Alpha", responded: true },
        { product_name: "B", vendor_id: 9, vendor_name: "Alpha", responded: false },
        { product_name: "C", vendor_id: 4, vendor_name: "Beta", responded: false },
      ],
    });
    expect(m.vendors).toHaveLength(2);
    expect(m.vendors.find((v) => v.name === "Alpha")).toMatchObject({ responded: true, lineCount: 2 });
    expect(m.vendors.find((v) => v.name === "Beta")).toMatchObject({ responded: false });
  });

  it("reads the quoteVisibility helper's own `locked` flag", () => {
    expect(
      normalizeRoundDetail({ round: { id: 1 }, items: [], meta: { locked: true } }).meta
        .quoteVisibilityLocked
    ).toBe(true);
    expect(
      normalizeRoundDetail({
        round: { id: 1 },
        items: [],
        meta: { quoteVisibility: { locked: true, message: "Sealed until 5pm" } },
      }).meta.quoteVisibilityLocked
    ).toBe(true);
  });

  it("normalises string and object action shapes", () => {
    const m = normalizeRoundDetail({
      round: { id: 1 },
      items: [],
      available_actions: ["close_round", { key: "approve", label: "Approve round", href: "/x" }],
    });
    expect(m.actions).toEqual([
      { key: "close_round", label: "Close round", href: null, disabled: false },
      expect.objectContaining({ key: "approve", label: "Approve round", href: "/x" }),
    ]);
  });

  it("survives a completely empty payload", () => {
    const m = normalizeRoundDetail(null);
    expect(m.lines).toEqual([]);
    expect(m.totals.baselineValue).toBeNull();
    expect(m.round.statusPresentation.label).toBe("Unknown");
  });
});

// A REMOVED status is a mid-flight reconciler's soft-tombstone (role/scope
// revoked while the approval was in flight). The backend endpoint behind this
// page already excludes those rows server-side, so these are belt-and-braces
// tests for the client-side guard, not proof of the only guard — they lock in
// that `formatApproverList`/`normalizeRoundDetail` degrade safely even if a
// REMOVED row ever does reach the client.
describe("formatApproverList — drops REMOVED rows", () => {
  it("never names a removed approver, alone or alongside a live one", () => {
    expect(formatApproverList([{ name: "A", status: "REMOVED" }])).toBeNull();
    expect(
      formatApproverList([
        { name: "A", status: "REMOVED" },
        { name: "B", status: "PENDING" },
      ])
    ).toBe("B");
  });

  it("still joins multiple live approvers once the removed one is dropped", () => {
    expect(
      formatApproverList([
        { name: "A", status: "REMOVED" },
        { name: "B", status: "PENDING" },
        { name: "C", status: "PENDING" },
      ])
    ).toBe("B and C");
  });

  it("passes through rows with no status field untouched (plain strings, legacy shapes)", () => {
    expect(formatApproverList(["Asha Menon"])).toBe("Asha Menon");
    expect(formatApproverList([{ name: "Asha Menon" }])).toBe("Asha Menon");
  });
});

describe("normalizeRoundDetail — approval.pendingWith drops a REMOVED approver", () => {
  it("excludes a REMOVED row from the current step's derived label", () => {
    const m = normalizeRoundDetail({
      round: { id: 1 },
      items: [],
      approval: {
        instances: [
          {
            status: "PENDING",
            current_step: 1,
            steps: [
              {
                step_order: 1,
                status: "PENDING",
                approvers: [
                  { user_id: 1, name: "Removed Person", status: "REMOVED" },
                  { user_id: 2, name: "Live Approver", status: "PENDING" },
                ],
              },
            ],
          },
        ],
      },
    });
    expect(m.round.approval.steps[0].label).toBe("Live Approver");
    expect(m.round.approval.steps[0].label).not.toContain("Removed Person");
  });

  it("excludes a REMOVED row from pendingWith, at both the instance and top level", () => {
    const removedRow = { user_id: 1, name: "Removed Person", status: "REMOVED" };
    const liveRow = { user_id: 2, name: "Live Approver", status: "PENDING" };

    const mInstanceLevel = normalizeRoundDetail({
      round: { id: 1 },
      items: [],
      approval: {
        instances: [{ status: "PENDING", pending_with: [removedRow, liveRow] }],
      },
    });
    expect(mInstanceLevel.round.approval.pendingWith).toBe("Live Approver");
    expect(mInstanceLevel.round.approval.pendingWith).not.toContain("Removed Person");

    const mTopLevel = normalizeRoundDetail({
      round: { id: 1 },
      items: [],
      approval: {
        instances: [{ status: "PENDING" }],
        pending_with: [removedRow, liveRow],
      },
    });
    expect(mTopLevel.round.approval.pendingWith).toBe("Live Approver");
    expect(mTopLevel.round.approval.pendingWith).not.toContain("Removed Person");
  });
});
