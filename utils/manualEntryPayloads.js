// Manual ARC Entry — PURE payload builders (the FE↔BE wire contract).
//
// These functions are the SINGLE source of truth for the shapes the
// arcManualController (backend/app/controllers/arc_v2/arcManualController.js)
// reads. They are deliberately pure (state in → plain payload out) and exported
// so a jest test can assert the canonical controller-expected shapes without a
// browser — closing the gap that previously hid the broken wire contract
// (awards sent as an object, quote lines keyed by product_variant_id, finalize
// sending only {confirm:true}).
//
// Controller contracts (confirmed against arcManualController.js):
//  - quotes section : body.quotes = [{ vendor_id, submitted_at?, payment_terms?,
//      gstin_used?, lines:[{ arc_item_id, rate, gst_pct?, lead_time_days?, moq? }] }]
//      → quote lines MUST carry the server arc_item_id (addQuoteLine inserts by it).
//  - awards section : body.awards = FLAT ARRAY
//      [{ arc_item_id, awarded_vendor_id, allocated_qty, l_rank?, is_l1_default? }]
//      (controller does `Array.isArray(body.awards)` — an object silently wipes).
//  - finalize       : TOP-LEVEL body carries the whole backdated date chain plus
//      ended_sub_status / closed_reason / was_awarded / committee_* (NOT nested).

// Coerce a form value to a number (blank/null → 0), mirroring the page's `num`.
export function num(v) {
  return v === "" || v == null ? 0 : Number(v) || 0;
}

// Resolve the server arc_item_id for a local item uid. Items hydrated from the
// server carry `_id`; items added in-session get their id after the items
// section saves (the page re-hydrates and fills `_id`). `itemIdByUid` is an
// optional explicit override map (uid → arc_item_id) used right after a save.
function arcItemIdFor(item, itemIdByUid) {
  if (itemIdByUid && itemIdByUid[item.uid] != null) return Number(itemIdByUid[item.uid]);
  if (item._id != null) return Number(item._id);
  return null;
}

// ── header / scope / provenance / terms / vendors ────────────────────────────
export function buildHeaderPayload(s) {
  return {
    header: {
      arc_number: s.arcNumber || undefined,
      title: s.title,
      description: s.description,
      type: s.type,
      eligibility_type: s.eligibilityType,
      technical_response_required: s.technicalRequired,
      sample_required: s.sampleRequired,
    },
  };
}

export function buildScopePayload(s) {
  return {
    scope: {
      hotel_id: s.hotelId,
      category_id: s.categoryId,
      sub_category_ids: s.selectedSubCats,
      department_id: s.departmentId,
    },
  };
}

// The full backdated date chain (+ S5 ended controls) the controller persists on
// the draft (SC-5), so Save-draft → resume restores them. Single-valued: the
// per-vendor generated/signed dates collapse to the first contracted vendor's
// values (one contract date chain per ARC in V1), mirroring buildFinalizePayload.
export function buildBackdatedDates(s) {
  const isEnded = s.stage === "ended";
  return {
    created_at: s.createdAt || undefined,
    floated_at: s.floatedAt || undefined,
    submission_start_at: s.submissionStart || undefined,
    submission_end_at: s.submissionEnd || undefined,
    contract_start_at: s.contractStart || undefined,
    contract_end_at: s.contractEnd || undefined,
    comm_finalized_at: s.finalizedAt || undefined,
    generated_at: firstVendorDate(s, "generated_at"),
    signed_by_vendor_at: firstVendorDate(s, "signed_by_vendor_at"),
    ended_sub_status: isEnded ? s.endedStatus : undefined,
    closed_reason: isEnded ? (s.closedReason || undefined) : undefined,
    was_awarded: isEnded ? (s.endedStatus !== "closed_no_award" && s.awarded) : undefined,
  };
}

export function buildProvenancePayload(s) {
  return {
    provenance: {
      target_stage: s.stage,
      eligibility_overridden: s.overrideEligibility,
      created_at: s.createdAt || undefined,
      // SC-5 — persisted on the draft so resume restores the whole date chain.
      backdated_dates: buildBackdatedDates(s),
    },
  };
}

export function buildTermsPayload(s) {
  return {
    terms: {
      payment_terms_expected: s.paymentTermsExpected,
      delivery_expected: s.deliveryExpected,
      penalty_clause: s.penaltyClause,
    },
  };
}

export function buildVendorsPayload(s) {
  return {
    vendors: (s.selectedVendorIds || []).map((id) => ({
      vendor_id: id,
      eligibility_overridden: s.overrideEligibility || undefined,
    })),
  };
}

// ── items ────────────────────────────────────────────────────────────────────
// Controller items branch: [{ id?, product_variant_id, indicative_qty, uom,
// spec_text?, target_price?, hsn?, history?[] }]. `id` (server arc_item_id) is
// sent for existing rows so the controller updates in place (and scopes by
// arc_id). `replace:true` lets the controller drop dropped rows.
export function buildItemsPayload(s) {
  return {
    items: (s.items || []).map((it) => ({
      id: it._id,
      product_variant_id: it.product_variant_id,
      spec_text: it.spec_text,
      target_price: it.target_price === "" || it.target_price == null ? null : num(it.target_price),
      indicative_qty: num(it.indicative_qty),
      uom: it.uom || null,
      hsn: it.hsn || null,
    })),
    replace: true,
  };
}

// ── quotes (keyed by arc_item_id) ────────────────────────────────────────────
export function buildQuotesPayload(s, itemIdByUid) {
  const items = s.items || [];
  const quoteLines = s.quoteLines || {};
  const quoteMeta = s.quoteMeta || {};
  return {
    quotes: (s.selectedVendorIds || []).map((vid) => ({
      vendor_id: vid,
      submitted_at: quoteMeta[vid]?.submitted_at || undefined,
      payment_terms: quoteMeta[vid]?.payment_terms || undefined,
      gstin_used: quoteMeta[vid]?.gstin_used || undefined,
      lines: items
        .filter((it) => quoteLines[vid]?.[it.uid] && arcItemIdFor(it, itemIdByUid) != null)
        .map((it) => {
          const ql = quoteLines[vid][it.uid];
          return {
            arc_item_id: arcItemIdFor(it, itemIdByUid),
            rate: num(ql.rate),
            gst_pct: num(ql.gst_pct),
            lead_time_days: ql.lead_time_days === "" || ql.lead_time_days == null ? null : num(ql.lead_time_days),
            moq: ql.moq === "" || ql.moq == null ? null : num(ql.moq),
          };
        }),
    })),
  };
}

// ── awards (FLAT ARRAY keyed by arc_item_id) ─────────────────────────────────
// finalizedAt is NOT part of the awards section body the controller reads (it
// only consumes the flat award array; finalized_at is set at finalize from
// comm_finalized_at). We therefore emit a bare flat array.
export function buildAwardsPayload(s, itemIdByUid) {
  const items = s.items || [];
  const awards = s.awards || {};
  const flat = [];
  for (const it of items) {
    const arcItemId = arcItemIdFor(it, itemIdByUid);
    if (arcItemId == null) continue;
    for (const a of awards[it.uid] || []) {
      if (a.allocated_qty === "" || a.allocated_qty == null) continue;
      flat.push({
        arc_item_id: arcItemId,
        awarded_vendor_id: a.vendor_id,
        allocated_qty: num(a.allocated_qty),
      });
    }
  }
  return { awards: flat };
}

// ── contract / signatures / approvals ────────────────────────────────────────
export function buildContractPayload(s) {
  const contractDocs = s.contractDocs || {};
  return {
    contract: {
      vendors: (s.selectedVendors || []).map((v) => ({
        vendor_id: v.id,
        generated_at: contractDocs[v.id]?.generated_at || undefined,
        document_s3_url: contractDocs[v.id]?.document_s3_url || undefined,
      })),
    },
  };
}

export function buildSignaturesPayload(s) {
  const contractDocs = s.contractDocs || {};
  return {
    signatures: {
      vendors: (s.selectedVendors || []).map((v) => ({
        vendor_id: v.id,
        signed_by_vendor_at: contractDocs[v.id]?.signed_by_vendor_at || undefined,
      })),
    },
  };
}

export function buildApprovalsPayload(s) {
  return {
    approvals: {
      committee_decision: s.committeeDecision,
      committee_decided_at: s.committeeDecidedAt || undefined,
      committee_decided_by: s.committeeDecidedBy === "" || s.committeeDecidedBy == null ? undefined : num(s.committeeDecidedBy),
      committee_comment: s.committeeComment,
    },
  };
}

// =============================================================================
// buildSectionPayload(section, state[, itemIdByUid]) → the exact body the
// section PUT endpoint expects for that section. This is the ONE code path the
// autosave-on-blur uses (FE-01) AND the test asserts, so freshness and shape
// are guaranteed by the same code.
// =============================================================================
export function buildSectionPayload(section, s, itemIdByUid) {
  switch (section) {
    case "header": return buildHeaderPayload(s).header;
    case "scope": return buildScopePayload(s).scope;
    case "provenance": return buildProvenancePayload(s).provenance;
    case "vendors": return buildVendorsPayload(s);
    case "items": return buildItemsPayload(s);
    case "quotes": return buildQuotesPayload(s, itemIdByUid);
    case "awards": return buildAwardsPayload(s, itemIdByUid);
    case "terms": return buildTermsPayload(s).terms;
    case "contract": return buildContractPayload(s).contract;
    case "signatures": return buildSignaturesPayload(s).signatures;
    case "approvals": return buildApprovalsPayload(s).approvals;
    default: return {};
  }
}

// The combined draft PATCH body (whole-graph bulk save). Keeps the nested
// section keys the patch endpoint accepts; sends the canonical section shapes.
export function buildDraftPayload(s, itemIdByUid) {
  return {
    ...buildHeaderPayload(s),
    ...buildScopePayload(s),
    provenance: {
      target_stage: s.stage,
      ended_status: s.stage === "ended" ? s.endedStatus : undefined,
      closed_reason: s.stage === "ended" ? s.closedReason : undefined,
      eligibility_overridden: s.overrideEligibility,
      created_at: s.createdAt || undefined,
      // SC-5 — persisted on the draft so Save-draft → resume restores them.
      backdated_dates: buildBackdatedDates(s),
    },
    ...buildVendorsPayload(s),
    ...buildItemsPayload(s),
    ...buildQuotesPayload(s, itemIdByUid),
    ...buildAwardsPayload(s, itemIdByUid),
    ...buildTermsPayload(s),
    ...buildContractPayload(s),
    ...buildSignaturesPayload(s),
    ...buildApprovalsPayload(s),
  };
}

// =============================================================================
// buildFinalizePayload(state) → the FULL top-level finalize body the controller
// reads (SC-1). Every backdated date is a top-level key (NOT nested under
// provenance), plus ended_sub_status / closed_reason / was_awarded /
// committee_decision / committee_decided_at / committee_decided_by. Today the
// page sent only {confirm:true}, so only S0 could finalize.
// =============================================================================
export function buildFinalizePayload(s) {
  const isEnded = s.stage === "ended";
  const isAwarded = isEnded ? s.endedStatus !== "closed_no_award" && s.awarded : true;
  return {
    confirm: true,
    // Backdated date chain (top-level — validateDateChain reads these).
    created_at: s.createdAt || undefined,
    floated_at: s.floatedAt || undefined,
    submission_start_at: s.submissionStart || undefined,
    submission_end_at: s.submissionEnd || undefined,
    contract_start_at: s.contractStart || undefined,
    contract_end_at: s.contractEnd || undefined,
    comm_finalized_at: s.finalizedAt || undefined,
    // generated_at / signed_by_vendor_at: per-vendor on the page; the controller
    // reads single top-level values. Use the first contracted vendor's values
    // (one contract date chain per ARC in V1) falling back across vendors.
    generated_at: firstVendorDate(s, "generated_at"),
    signed_by_vendor_at: firstVendorDate(s, "signed_by_vendor_at"),
    // S5 ended controls.
    ended_sub_status: isEnded ? s.endedStatus : undefined,
    closed_reason: isEnded ? s.closedReason || undefined : undefined,
    was_awarded: isEnded ? isAwarded : undefined,
    // Committee outcome snapshot (group L).
    committee_decision: s.committeeDecision || undefined,
    committee_decided_at: s.committeeDecidedAt || undefined,
    committee_decided_by: s.committeeDecidedBy === "" || s.committeeDecidedBy == null ? undefined : num(s.committeeDecidedBy),
    committee_comment: s.committeeComment || undefined,
  };
}

function firstVendorDate(s, key) {
  const docs = s.contractDocs || {};
  for (const v of s.selectedVendors || []) {
    const val = docs[v.id]?.[key];
    if (val) return val;
  }
  // Fall back to any vendor with the value (selectedVendors may be empty in tests).
  for (const k of Object.keys(docs)) {
    if (docs[k]?.[key]) return docs[k][key];
  }
  return undefined;
}
