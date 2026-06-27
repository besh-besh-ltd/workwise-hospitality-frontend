// Regression guard for the Manual ARC Entry FE↔BE wire contract.
//
// This is the test that was missing — the gap that let the broken wire contract
// (awards as an object, quote lines keyed by product_variant_id, finalize
// sending only {confirm:true}) ship undetected. It asserts the PURE payload
// builders produce exactly the shapes arcManualController.js reads for S3/S4/S5.

jest.mock("@/lib/axios", () => ({ __esModule: true, default: {} }), { virtual: true });
jest.mock("@/lib/axiosFormData", () => ({ __esModule: true, default: {} }), { virtual: true });

import {
  buildSectionPayload,
  buildFinalizePayload,
  buildQuotesPayload,
  buildAwardsPayload,
  buildItemsPayload,
} from "./manualEntryPayloads";

// A representative awarded ARC: 2 items (server ids 101, 202), 1 vendor (id 9),
// with quote lines + a split-clean award (full allocation to the one vendor).
function awardedState(overrides = {}) {
  return {
    arcNumber: "ARC-2024-014",
    title: "Veg supplies",
    description: "",
    type: "product",
    eligibilityType: "open",
    technicalRequired: false,
    sampleRequired: false,
    hotelId: 1,
    categoryId: 5,
    selectedSubCats: [],
    departmentId: 3,
    stage: "sig_pending",
    endedStatus: "expired",
    closedReason: "",
    awarded: true,
    overrideEligibility: false,
    createdAt: "2024-04-01T09:00",
    floatedAt: "2024-04-03T09:00",
    submissionStart: "2024-04-03T09:00",
    submissionEnd: "2024-04-10T17:00",
    contractStart: "2024-04-15",
    contractEnd: "2025-04-14",
    finalizedAt: "2024-04-12T11:00",
    selectedVendorIds: [9],
    selectedVendors: [{ id: 9, name: "FreshFarms" }],
    items: [
      { uid: "i0", _id: 101, product_variant_id: 7001, indicative_qty: "500", uom: "kg", target_price: "28", spec_text: "Grade A", hsn: "0702" },
      { uid: "i1", _id: 202, product_variant_id: 7002, indicative_qty: "800", uom: "kg", target_price: "22", spec_text: "", hsn: "0703" },
    ],
    quoteLines: {
      9: {
        i0: { rate: "27.5", gst_pct: "5", lead_time_days: "2", moq: "10" },
        i1: { rate: "21.0", gst_pct: "5", lead_time_days: "", moq: "" },
      },
    },
    quoteMeta: { 9: { submitted_at: "2024-04-09T10:00", payment_terms: "Net 30", gstin_used: "22AAAAA0000A1Z5" } },
    awards: {
      i0: [{ vendor_id: 9, allocated_qty: "500" }],
      i1: [{ vendor_id: 9, allocated_qty: "800" }],
    },
    contractDocs: {
      9: { generated_at: "2024-04-13T10:00", signed_by_vendor_at: "2024-04-18T10:00", document_s3_url: "s3://x.pdf" },
    },
    paymentTermsExpected: "Net 30",
    deliveryExpected: "21 days",
    penaltyClause: "",
    committeeDecision: "approved",
    committeeDecidedAt: "2024-04-12T12:00",
    committeeDecidedBy: "42",
    committeeComment: "ok",
    ...overrides,
  };
}

describe("Manual ARC Entry — payload builders (FE↔BE wire contract)", () => {
  describe("SC-2 · items section carries server id + replace flag", () => {
    it("sends id (arc_item_id) for existing rows and replace:true", () => {
      const p = buildSectionPayload("items", awardedState());
      expect(Array.isArray(p.items)).toBe(true);
      expect(p.replace).toBe(true);
      expect(p.items[0]).toMatchObject({ id: 101, product_variant_id: 7001, indicative_qty: 500, uom: "kg", hsn: "0702" });
    });
  });

  describe("SC-2 · QUOTE LINES are keyed by arc_item_id (NOT product_variant_id)", () => {
    it("each line carries arc_item_id from the uid→id mapping, never product_variant_id", () => {
      const p = buildSectionPayload("quotes", awardedState());
      expect(Array.isArray(p.quotes)).toBe(true);
      const v = p.quotes.find((q) => q.vendor_id === 9);
      expect(v).toBeTruthy();
      expect(v.lines).toHaveLength(2);
      for (const line of v.lines) {
        expect(line).toHaveProperty("arc_item_id");
        expect([101, 202]).toContain(line.arc_item_id);
        expect(line).not.toHaveProperty("product_variant_id");
      }
      // numeric coercion + meta
      const l0 = v.lines.find((l) => l.arc_item_id === 101);
      expect(l0).toMatchObject({ arc_item_id: 101, rate: 27.5, gst_pct: 5, lead_time_days: 2, moq: 10 });
      expect(v.submitted_at).toBe("2024-04-09T10:00");
    });

    it("uses the explicit itemIdByUid override map when items were just saved", () => {
      // Items added in-session have _id null until saved; the override map fills ids.
      const st = awardedState();
      st.items = st.items.map((it) => ({ ...it, _id: null }));
      const p = buildQuotesPayload(st, { i0: 101, i1: 202 });
      const lines = p.quotes[0].lines;
      expect(lines.map((l) => l.arc_item_id).sort()).toEqual([101, 202]);
    });

    it("skips lines whose item has no resolvable arc_item_id (no null keys sent)", () => {
      const st = awardedState();
      st.items = st.items.map((it) => ({ ...it, _id: null }));
      const p = buildQuotesPayload(st); // no override map, no _id → unresolved
      expect(p.quotes[0].lines).toHaveLength(0);
    });
  });

  describe("SC-2 · AWARDS are a FLAT ARRAY of {arc_item_id, awarded_vendor_id, allocated_qty}", () => {
    it("Array.isArray(body.awards) is TRUE (controller guard) — not an object", () => {
      const p = buildSectionPayload("awards", awardedState());
      expect(Array.isArray(p.awards)).toBe(true);
      expect(p.awards).not.toHaveProperty("allocations"); // the old wrong shape
    });

    it("each award row has arc_item_id + awarded_vendor_id + allocated_qty", () => {
      const p = buildAwardsPayload(awardedState());
      expect(p.awards).toHaveLength(2);
      expect(p.awards).toEqual(
        expect.arrayContaining([
          { arc_item_id: 101, awarded_vendor_id: 9, allocated_qty: 500 },
          { arc_item_id: 202, awarded_vendor_id: 9, allocated_qty: 800 },
        ])
      );
    });

    it("omits empty/blank allocations and items with no arc_item_id", () => {
      const st = awardedState();
      st.awards = { i0: [{ vendor_id: 9, allocated_qty: "" }], i1: [{ vendor_id: 9, allocated_qty: "800" }] };
      const p = buildAwardsPayload(st);
      expect(p.awards).toEqual([{ arc_item_id: 202, awarded_vendor_id: 9, allocated_qty: 800 }]);
    });
  });

  describe("SC-1 · finalize payload carries the FULL top-level date chain + extras", () => {
    it("S3 (sig_pending) sends confirm + all dates + committee_* at top level", () => {
      const p = buildFinalizePayload(awardedState({ stage: "sig_pending" }));
      expect(p).toMatchObject({
        confirm: true,
        created_at: "2024-04-01T09:00",
        floated_at: "2024-04-03T09:00",
        submission_start_at: "2024-04-03T09:00",
        submission_end_at: "2024-04-10T17:00",
        contract_start_at: "2024-04-15",
        contract_end_at: "2025-04-14",
        comm_finalized_at: "2024-04-12T11:00",
        generated_at: "2024-04-13T10:00",
        committee_decision: "approved",
        committee_decided_at: "2024-04-12T12:00",
        committee_decided_by: 42,
      });
    });

    it("S4 (active) additionally carries signed_by_vendor_at from the vendor's contract doc", () => {
      const p = buildFinalizePayload(awardedState({ stage: "active" }));
      expect(p.signed_by_vendor_at).toBe("2024-04-18T10:00");
      expect(p.generated_at).toBe("2024-04-13T10:00");
    });

    it("S5 ended-awarded sends ended_sub_status + was_awarded:true + closed_reason", () => {
      const p = buildFinalizePayload(awardedState({ stage: "ended", endedStatus: "terminated", closedReason: "breach", awarded: true }));
      expect(p.ended_sub_status).toBe("terminated");
      expect(p.was_awarded).toBe(true);
      expect(p.closed_reason).toBe("breach");
    });

    it("FE-03 · S5 closed_no_award derives was_awarded:false regardless of the awarded toggle", () => {
      const p = buildFinalizePayload(awardedState({ stage: "ended", endedStatus: "closed_no_award", awarded: true, closedReason: "no bids" }));
      expect(p.ended_sub_status).toBe("closed_no_award");
      expect(p.was_awarded).toBe(false);
    });

    it("does NOT collapse to {confirm:true} only (the original SC-1 bug)", () => {
      const p = buildFinalizePayload(awardedState());
      expect(Object.keys(p).length).toBeGreaterThan(1);
      expect(p.created_at).toBeDefined();
    });
  });

  describe("buildSectionPayload dispatch covers every section the autosave uses", () => {
    it("returns a section-shaped body for each known section", () => {
      const st = awardedState();
      expect(buildSectionPayload("header", st)).toHaveProperty("title");
      expect(buildSectionPayload("scope", st)).toHaveProperty("hotel_id");
      expect(buildSectionPayload("provenance", st)).toHaveProperty("target_stage");
      expect(Array.isArray(buildSectionPayload("vendors", st).vendors)).toBe(true);
      expect(Array.isArray(buildSectionPayload("items", st).items)).toBe(true);
      expect(Array.isArray(buildSectionPayload("quotes", st).quotes)).toBe(true);
      expect(Array.isArray(buildSectionPayload("awards", st).awards)).toBe(true);
      expect(buildSectionPayload("terms", st)).toHaveProperty("payment_terms_expected");
      expect(buildSectionPayload("approvals", st)).toHaveProperty("committee_decision");
    });
  });
});
