import { raw } from "./index";
import { peopleById, propertiesById, company, departments } from "@/data/ihg/org";
import { getPo } from "@/data/ihg/orders";
import { demoSession, allSessionClauses } from "./writeRoutes";
import { vendorNumericId, lineCharges, CHARGE_PROFILE } from "./demoQuotes";
import { threadCompareView, sessionCompareView } from "./quoteCompareView";
import { vendorsById } from "@/data/ihg/vendors";
import { allMrs, allContracts } from "@/data/ihg/register";
import { CATEGORY, FY, contract, lineItems, mr, negotiation, rfq } from "@/data/ihg/thread";
import { quotesByVendor } from "@/data/ihg/quotes";
import { clauses, underEvaluation, proposed, docsById, MIN_SCORE } from "@/data/ihg/evaluation";

/**
 * Detail-screen endpoints — the records behind the golden thread.
 *
 * The PO shape here is copied field-for-field from the fixture the real
 * PODetail test suite uses, so the screen gets exactly what it was written
 * against: workflow steps with approver rosters, `pricing`, `docs`,
 * `decision_checks` and the rest.
 */

const iso = (d) => new Date(`${d}T10:00:00.000Z`).toISOString();
const person = (id) => peopleById[id];

/* ── purchase order ───────────────────────────────────────── */
const approver = (p, status) => ({
  user_id: p.numericId,
  name: p.name,
  email: p.email,
  status,
  effective_status: status,
  acted_at: status === "APPROVED" ? iso("2026-08-20") : null,
  removed: false,
});

const poDetail = (po) => {
  const vendor = vendorsById[po.vendorId];
  const raiser = person(po.raisedBy);
  const confirmer = person("housekeeping");
  const approverP = person(po.approverId);

  const workflow = [
    { step: 1, status: "done", title: "PO created", by: raiser.name, when: iso(po.raisedOn), policy: null },
    { step: 2, status: "done", title: "PO initiated", by: raiser.name, when: iso(po.raisedOn), policy: null },
    ...(po.chain.some((c) => c.role.includes("confirmed"))
      ? [{
          step: 3, status: "done", title: "Requirement confirmed", by: confirmer.name,
          when: iso("2026-08-20"), policy: null, level: 1, decision_rule: "ANY",
          approvers: [approver(confirmer, "APPROVED")],
          approver_summary: { total_active: 1, approved: 1, rejected: 0, pending: 0, removed: 0 },
          step_added_mid_flight: false, step_removed_mid_flight: false,
        }]
      : []),
    {
      step: 4, status: "current", title: "Financial approval", by: approverP.name, when: null,
      policy: `Limit ₹${(approverP.approvalLimit / 100000).toFixed(0)}L`,
      level: 2, decision_rule: "ANY",
      approvers: [approver(approverP, "PENDING")],
      approver_summary: { total_active: 1, approved: 0, rejected: 0, pending: 1, removed: 0 },
      step_added_mid_flight: false, step_removed_mid_flight: false,
    },
  ];

  // A decision taken this session has to be visible when the screen refetches,
  // otherwise approving appears to do nothing and the demo's last beat dies.
  const decided = demoSession.poDecisions[po.id];
  if (decided) {
    const ok = decided.decision !== "reject";
    workflow[workflow.length - 1] = {
      ...workflow[workflow.length - 1],
      status: ok ? "done" : "rejected",
      by: approverP.name,
      when: decided.at,
      approvers: [approver(approverP, ok ? "APPROVED" : "REJECTED")],
      approver_summary: {
        total_active: 1, approved: ok ? 1 : 0, rejected: ok ? 0 : 1, pending: 0, removed: 0,
      },
    };
  }

  return {
    id: Number(po.id),
    po_number: po.id,
    status: decided ? (decided.decision === "reject" ? "rejected" : "approved") : "pending",
    status_label: decided
      ? (decided.decision === "reject" ? "Rejected" : "Approved")
      : po.status,
    awaiting_me: !decided,
    current_step_label: decided ? "Completed" : "Financial approval",
    current_approvers: decided ? [] : [{ name: approverP.name }],
    total_value: po.value,
    pricing: { total: po.value },
    vendor: {
      name: vendor.name,
      city: vendor.city,
      gst: vendor.gst,
      on_time_pct: vendor.performance.onTimePct,
    },
    rfq: { number: rfq.id, id: Number(rfq.id) },
    hotel: { name: propertiesById[po.propertyId]?.name },
    hotel_name: propertiesById[po.propertyId]?.name,
    items: po.lines.map((l) => ({
      name: l.name,
      quantity: l.qty,
      unit_price: l.rate,
      gst: 0,
      unit: "nos",
      charges_meta: { other_charges: [] },
    })),
    workflow,
    docs: [],
    comparison: [],
    // Milestone rows read { num, name, due, pct, amount }.
    payment_terms: [
      { num: 1, name: "On delivery and GRN acceptance", due: "45 days from GRN", pct: 100, amount: po.value },
    ],
    tech_eval: [],
    // Key-date rows read { k, v, soon } — not { label, value }.
    key_dates: [
      { k: "Raised", v: iso(po.raisedOn) },
      { k: "Required by", v: iso("2026-10-01"), soon: true },
      { k: "Contract term ends", v: iso(contract.termEnd) },
    ],
    activity: [],
    decision_checks: [],
    global_charges: [],
    budget: po.budget || null,
    created_at: iso(po.raisedOn),
    initiator: { name: raiser.name, email: raiser.email },
  };
};

/* ── rate contract lifecycle ──────────────────────────────── */
const ARC_STAGE_STATE = {
  overview: "done",
  technical: "active",
  commercial: "locked",
  awarding: "locked",
  active: "locked",
};

const arcLifecycle = (id) => {
  const c = allContracts.find((x) => x.id === id) || allContracts[0];
  return {
    arc: {
      id: c.id,
      arc_number: c.id,
      title: c.title,
      status: c.stage === "tech-eval" ? "technical_evaluation" : c.stage,
      category_title: c.category,
      department_title: "Housekeeping",
      hotel_name: c.propertyIds.map((p) => propertiesById[p]?.shortName).join(", "),
      company_name: company.name,
      contract_start_at: iso(c.termStart),
      contract_end_at: iso(c.termEnd),
      committed_value: c.value,
      created_by_name: person(contract.ownerId).name,
      created_at: iso("2026-05-28"),
    },
    stages: [
      { key: "overview", label: "Window closed", state: ARC_STAGE_STATE.overview, reason: null, counts: {}, approval: null, clarifications_open: 0, negotiation_in_progress: false },
      { key: "technical", label: "Technical evaluation", state: ARC_STAGE_STATE.technical, reason: "scoring", counts: { vendors: underEvaluation.length, clauses: clauses.length }, approval: null, clarifications_open: 0, negotiation_in_progress: false },
      { key: "commercial", label: "Commercial", state: ARC_STAGE_STATE.commercial, reason: "locked", counts: {}, approval: null, clarifications_open: 0, negotiation_in_progress: false },
      { key: "awarding", label: "Awarding", state: ARC_STAGE_STATE.awarding, reason: "locked", counts: {}, approval: null, clarifications_open: 0, negotiation_in_progress: false },
      { key: "active", label: "Contract active", state: ARC_STAGE_STATE.active, reason: "locked", counts: {}, approval: null, clarifications_open: 0, negotiation_in_progress: false },
    ],
    // `has(resource, action)` does `(perms[resource] || []).includes(action)`
    // — so this is resource → array of actions, not a nested object.
    permissions: {
      arc: ["read", "create", "update", "admin"],
      technical: ["read", "update", "score", "submit"],
      te: ["read", "update", "score", "submit"],
      commercial: ["read"],
      awarding: ["read"],
      negotiation: ["read", "create", "update"],
    },
    invitations: [],
    items: lineItems.map((i) => ({ id: i.id, name: i.name, uom: i.uom, quantity: i.annualQty })),
  };
};

/* ── technical evaluation ─────────────────────────────────
   TechnicalStage matches responses to columns with
   `Number(r.vendor_alias_key) === Number(vendorKey)` and the same for
   `clause_id` — so both keys MUST be numeric. String ids ("V1", "c1")
   coerce to NaN, NaN never equals NaN, and every cell silently renders
   "No response submitted". Hence the numeric ids below.

   Vendors appear as blind aliases (Vendor A, B, …) in commercial-rank
   order; the buyer scores technical merit without seeing who is cheapest. ── */
const clauseNum = (clauseId) => clauses.findIndex((c) => c.id === clauseId) + 1;
const aliasNum = (vid) => underEvaluation.indexOf(vid) + 1;
const aliasLabel = (vid) => `Vendor ${String.fromCharCode(65 + underEvaluation.indexOf(vid))}`;

const techClauses = () =>
  clauses.map((c) => ({
    id: clauseNum(c.id),
    clause_no: c.num,
    text: c.text,
    clause_text: c.text,
    title: c.title,
    type: "SCORED",
    clause_type: "SCORED",
    weight: c.maxMark,
    weightage: c.maxMark,
    max_marks: c.maxMark,
    evidence_type: c.evidenceType,
  }));

const techResponses = () => {
  const out = [];
  underEvaluation.forEach((vid) => {
    clauses.forEach((c) => {
      const p = proposed[`${vid}:${c.id}`] || {};
      const doc = p.docId ? docsById[p.docId] : null;
      out.push({
        response_id: `${aliasNum(vid)}-${clauseNum(c.id)}`,
        vendor_alias_key: aliasNum(vid),
        vendor_alias: aliasLabel(vid),
        has_submitted_quote: true,
        clause_id: clauseNum(c.id),
        // The vendor's own words. Buyer marks stay null — entering them is
        // the human's job, and the AI panel's proposal.
        vendor_response: p.rationale || "",
        buyer_marks: null,
        buyer_remark: null,
        mandatory_passed: true,
        files: doc ? [{ id: doc.id, name: doc.name, pages: doc.pages, type: doc.type }] : [],
      });
    });
  });
  return out;
};

const techScores = () =>
  underEvaluation.map((vid) => ({
    vendor_alias_key: aliasNum(vid),
    vendor_alias: aliasLabel(vid),
    total_marks: null,
    max_marks: clauses.reduce((sum, c) => sum + c.maxMark, 0),
    qualified: null,
    mandatory_passed: true,
  }));

const techEvalBlock = () => ({
  tech_evaluation: {
    id: "TE-2627-0014",
    min_score_percent: MIN_SCORE,
    max_marks: clauses.reduce((sum, c) => sum + c.maxMark, 0),
    status: "IN_PROGRESS",
  },
  clauses: techClauses(),
  responses: techResponses(),
  scores: techScores(),
  shortlist: { count: underEvaluation.length, vendor_alias_keys: underEvaluation.map(aliasNum) },
});


/**
 * Technical-evaluation clauses, grouped per product with the vendors who
 * actually quoted it and their written responses.
 *
 * Vendors come from the quotes that were collected, not from the whole supplier
 * base — evaluating a vendor who never bid the line is not a thing the screen
 * should offer.
 */
const techEvalVendorsFor = (rfqId, productId) => {
  const collected = demoSession.rfqQuotes?.[rfqId];
  const item = lineItems[Number(productId) - 1];

  const slugs = collected
    ? Object.values(collected.products)
        .filter((b) => b.itemId === item?.id)
        .flatMap((b) => b.quotes.filter((q) => !q.regret).map((q) => q.vendorSlug))
    : Object.keys(quotesByVendor).filter((v) =>
        quotesByVendor[v].lines.some((l) => l.itemId === item?.id)
      );

  return Array.from(new Set(slugs)).map((slug, idx) => ({
    vendor_id: vendorNumericId(slug),
    rfq_product_vendor_id: 900 + idx,
    vendor_name: vendorsById[slug]?.name || slug,
    label: vendorsById[slug]?.name || slug,
    value: vendorNumericId(slug),
    has_quoted: true,
    has_marks: false,
    is_passed: false,
    is_cleared: false,
    is_verified: false,
    is_replaced_out: false,
    calculated_score: 0,
    evaluation_round: 1,
    evaluated_by: null,
    approved_by: null,
    rank: idx + 1,
  }));
};

/** What a supplier wrote against one clause. */
const vendorResponseText = (slug, clause, item) => {
  const text = String(clause.clause_text || "").toLowerCase();
  const name = vendorsById[slug]?.short || slug;
  if (text.includes("oeko-tex") || text.includes("certif")) {
    return `OEKO-TEX Standard 100 certificate held at Product Class II, scope covering ${item?.name || "the item"}. Certificate and scope annexure attached.`;
  }
  if (text.includes("gsm") || text.includes("weight") || text.includes("tc")) {
    return `Offered construction meets the stated specification. Third-party lab report attached, tested on 5 coupons.`;
  }
  if (text.includes("shrink")) {
    return `Dimensional change measured within the stated ceiling after 5 wash cycles. Test report attached.`;
  }
  return `${name} confirms compliance with this clause. Supporting document attached with the quote.`;
};

const techEvalGroups = (rfqId) => {
  const isSession = !!demoSession.publishedRfqs?.[rfqId];

  // Session RFQs answer with the clauses actually written in the wizard.
  const written = allSessionClauses().filter((c) => String(c.rfq_id) === rfqId);
  const source = isSession
    ? written
    : lineItems.slice(0, 3).flatMap((item, idx) =>
        clauses.map((c) => ({
          clause_id: c.id,
          rfq_product_id: lineItems.indexOf(item) + 1,
          clause_text: c.text,
          clause_type: "clause",
          weightage: c.maxMark,
          files: [],
        }))
      );

  const byProduct = {};
  source.forEach((c) => {
    const pid = String(c.rfq_product_id);
    (byProduct[pid] = byProduct[pid] || []).push(c);
  });

  return Object.entries(byProduct).map(([pid, rows]) => {
    const item = lineItems[Number(pid) - 1];
    const vendors = techEvalVendorsFor(rfqId, pid);
    return {
      rfq_product_id: Number(pid),
      product_name: item?.name,
      minimum_passing_score: demoSession.clauses?.[pid]?.minimum_passing_score ?? MIN_SCORE,
      vendors,
      clauses: rows.map((c) => ({
        clause_id: c.clause_id,
        rfq_product_id: Number(pid),
        clause_text: c.clause_text,
        clause_type: c.clause_type || "clause",
        weightage: c.weightage,
        max_marks: c.weightage,
        files: c.files || [],
        vendor_responses: vendors.map((v) => {
          const slug = Object.keys(vendorsById).find((k) => vendorNumericId(k) === v.vendor_id);
          const at = "2026-06-20T10:00:00+05:30";
          return {
            vendor_id: v.vendor_id,
            rfq_product_vendor_id: v.rfq_product_vendor_id,
            vendor_response: vendorResponseText(slug, c, item),
            response_timestamp: at,
            // Unscored: score_timestamp equal to response_timestamp is how the
            // screen recognises "the buyer has not marked this yet".
            score_timestamp: at,
            buyer_marks: null,
            buyer_remark: null,
            scorer_name: null,
            files: [],
          };
        }),
      })),
    };
  });
};

/* ── rfq ──────────────────────────────────────────────────── */
const rfqById = () => ({
  id: Number(rfq.id),
  rfq_no: rfq.id,
  title: `${CATEGORY} — ${FY}`,
  rfq_type: "rfq",
  is_tender: false,
  is_published: true,
  // 1 = live/open. `rfqStatus === 2` is what renders "RFQ is closed. Vendors
  // can no longer submit quotes." and makes every action read-only.
  status: 1,
  lifecycle_stage: "quotes_received",
  company_name: company.name,
  // The details page derives its permission scope from these two — without
  // them `hotelIds` is empty and useModulePermissions never grants read.
  hotel_id: propertiesById["ic-mumbai"].numericId,
  hotel_ids: rfq.propertyIds.map((p) => propertiesById[p]?.numericId),
  department_id: 1,
  hotel_name: rfq.propertyIds.map((p) => propertiesById[p]?.shortName).join(", "),
  department_name: rfq.department,
  location: propertiesById["ic-mumbai"].address,
  contact_name: person(rfq.ownerId).name,
  contact_number: person(rfq.ownerId).phone,
  response_email: company.procurementEmail,
  bid_end_date: iso(rfq.closesOn),
  tender_publish_date: iso(rfq.publishedOn),
  reverse_auction: false,
  is_quotes_present: true,
  po_completed: false,
  unseen_query_count: 0,
  comment: "",
  close_comment: null,
  copies: 0,
  copied_from: null,
  terms: [],
  products: lineItems.map((i, idx) => threadProduct(i, idx)),
});

/**
 * One product row for the RFQ detail screen.
 *
 * ViewRFQ reads quantity and unit out of the `spec` array by title — not off
 * the product — so a bare `quantity` field renders as "—". Participation comes
 * from participated_vendors_count / vendors_count.
 */
/** "70×140 cm · 100% cotton · ring-spun" → a Size row and a Spec row. */
const specRows = (item) => {
  const [size, ...rest] = String(item.spec || "").split(" · ");
  return [
    { title: "Quantity", value: String(item.annualQty) },
    { title: "Unit", value: item.uom },
    { title: "Size", value: size || item.spec },
    { title: "Spec", value: rest.length ? rest.join(" · ") : item.spec },
    { title: "Specification", value: item.spec },
  ];
};

const threadProduct = (item, idx, participation) => {
  // The id has to be the CATALOGUE index, not the position in this RFQ's own
  // product list. The wizard's draft loader keys products that way, so clauses
  // are written against it — score a clause on Bed Sheet (catalogue #3) and a
  // positional id of 1 here means the evaluation screen looks up product 1,
  // finds nothing, and reports "No Clauses Available".
  const pid = lineItems.indexOf(item) + 1 || idx + 1;
  return {
    id: pid,
    product_id: pid,
    name: item.name,
    // The technical-evaluation workspace reads the name off product_details, not
    // off the product — without it every line renders as "Unnamed Product".
    product_details: [{ name: item.name, product_name: item.name }],
    variant: item.spec,
    quantity: item.annualQty,
    unit: item.uom,
    // ViewRFQ reads these off `product_specs` by title; `spec` is what the
    // wizard and the draft loader read. Both are populated so neither renders
    // a dash where a quantity should be.
    spec: specRows(item),
    product_specs: specRows(item),
    vendors_count: participation?.invited ?? countBidders(item.id),
    participated_vendors_count: participation?.submitted ?? countBidders(item.id),
  };
};

const countBidders = (itemId) =>
  Object.values(quotesByVendor).filter((q) => q.lines.some((l) => l.itemId === itemId)).length;

/**
 * The detail payload for an RFQ raised during this session.
 *
 * Returned instead of the golden thread's record so a created RFQ shows the
 * products the buyer actually picked and its own deadline — and so the header
 * reads "Quotes received: No" until Publish now has been pressed.
 */
const sessionRfqById = (id) => {
  const rec = demoSession.publishedRfqs[id];
  const collected = demoSession.rfqQuotes?.[id] || null;
  const owner = person(rfq.ownerId);

  const items = (rec.variant_ids || []).map((v) => lineItems[Number(v) - 1]).filter(Boolean);
  const chosen = items.length ? items : lineItems.slice(0, 3);

  return {
    ...rfqById(),
    id: Number(id),
    rfq_no: String(id),
    title: rec.title,
    bid_end_date: rec.bid_end_date || iso("2026-10-15"),
    tender_publish_date: rec.published_at || rec.created_at,
    lifecycle_stage: collected ? "quotes_received" : "published",
    is_quotes_present: !!collected,
    // Drive the two demo controls in the detail header. Close bidding only
    // becomes offerable once there is something sealed to unseal.
    demo_awaiting_publish: !collected,
    demo_awaiting_close: !!collected && !rec.bidding_closed,
    quotes_locked: !!collected && !rec.bidding_closed,
    contact_name: owner.name,
    products: chosen.map((item, idx) => {
      const bucket = collected?.products?.[idx + 1];
      const submitted = bucket ? bucket.quotes.filter((q) => !q.regret).length : 0;
      return threadProduct(item, idx, {
        invited: bucket ? bucket.quotes.length : 0,
        submitted,
      });
    }),
  };
};

/**
 * Quote comparison, in the shape the negotiation wizard actually reads.
 *
 * The wizard does not consume a flat products × vendors grid. `getVendorPriceData`
 * walks `product.quotations[].quote_details[0]`, and it drops any quotation that
 * has no id, no numeric vendor id, or a zero line total — which is why a
 * plausible-looking grid still left step 1 reporting "0 available". Every field
 * below is one that helper reads.
 *
 * Coverage is deliberately partial, straight from the quote fixture: a terry mill
 * does not bid bed linen. Products nobody quoted come back with an empty
 * `quotations` array and correctly show as "No Quotes" rather than vanishing.
 */
const QC_GST = 12;

/** The wizard needs `Number(vendor.id)`, and the fixture keys vendors by slug. */
const qcVendorIds = Object.keys(quotesByVendor);
const qcVendorNumericId = (vendorId) => 7101 + qcVendorIds.indexOf(vendorId);

/**
 * The same wizard-shaped grid, built from quotes collected this session rather
 * than from the fixture — so an RFQ you raised and published can be taken all
 * the way through negotiation.
 */
const sessionCompareProducts = (collected) =>
  Object.entries(collected.products).map(([key, bucket], itemIdx) => {
    const productId = 4201 + itemIdx;
    const quotations = bucket.quotes
      .filter((q) => !q.regret)
      .map((q, vendorIdx) => {
        const base = q.rate * q.qty;
        const charges = lineCharges(q.vendorSlug, base);
        const chargeSum = charges.reduce((a, c) => a + c.amount, 0);
        const short = vendorsById[q.vendorSlug]?.short || q.vendorSlug;

        return {
          id: productId * 100 + vendorIdx,
          vendor_id: vendorNumericId(q.vendorSlug),
          vendor_details: {
            id: vendorNumericId(q.vendorSlug),
            organization_name: vendorsById[q.vendorSlug]?.name || q.vendorSlug,
          },
          global_charges: [],
          quote_details: [
            {
              unit_price: q.rate,
              quantity: q.qty,
              tax: QC_GST,
              tax_mode: "percentage",
              total_price: Math.round((base + chargeSum) * (1 + QC_GST / 100)),
              other_charges: charges,
              delivery_period: `${q.leadDays} days`,
              payment_terms: "30 days from GRN",
              global_payment_term: [{ details: "30 days from GRN" }],
              comment: CHARGE_PROFILE[q.vendorSlug]?.freight
                ? `Ex-works ${vendorsById[q.vendorSlug]?.city || "works"}. ${bucket.name} quoted against the attached TDS.`
                : `Delivered to all properties. ${bucket.name} quoted against the attached TDS.`,
              global_comment: `Rates hold for 60 days. Lead time ${q.leadDays} days.`,
              document_files: [{ name: `${short.replace(/\s+/g, "")}_${bucket.itemId}_TDS.pdf`, url: "#" }],
              global_document_files: [
                { name: `${short.replace(/\s+/g, "")}_Quote.pdf`, url: "#" },
                { name: `${short.replace(/\s+/g, "")}_GST_Certificate.pdf`, url: "#" },
              ],
            },
          ],
        };
      });

    return {
      id: productId,
      quantity: bucket.qty,
      unit: bucket.uom,
      active_round: null,
      product_details: [{ name: bucket.name, product_name: bucket.name }],
      product_specs: [{ title: "Spec", value: bucket.name }],
      product_vendors: quotations.map((q) => q.vendor_details),
      quotations,
    };
  });

const lineComment = (vendorId, item) =>
  CHARGE_PROFILE[vendorId]?.freight
    ? `Ex-works ${vendorsById[vendorId].city}. ${item.name} quoted against the attached TDS.`
    : `Delivered to all five properties. ${item.name} quoted against the attached TDS.`;

const quoteComment = (vendorId, quote) =>
  `Rates hold for ${quote.validityDays} days. MOQ ${quote.moq}. ${quote.freight}.`;

const quoteCompareProducts = () =>
  lineItems.map((item, itemIdx) => {
    const productId = 4201 + itemIdx;

    const quotations = qcVendorIds
      .map((vendorId, vendorIdx) => {
        const line = quotesByVendor[vendorId].lines.find((l) => l.itemId === item.id);
        if (!line) return null; // this supplier did not bid this SKU
        const quote = quotesByVendor[vendorId];
        const base = line.rate * line.qty;

        const charges = lineCharges(vendorId, base);
        const chargeSum = charges.reduce((a, c) => a + c.amount, 0);

        return {
          id: productId * 100 + vendorIdx,
          vendor_id: qcVendorNumericId(vendorId),
          vendor_details: {
            id: qcVendorNumericId(vendorId),
            organization_name: vendorsById[vendorId].name,
          },
          global_charges: [],
          quote_details: [
            {
              unit_price: line.rate,
              quantity: line.qty,
              tax: QC_GST,
              tax_mode: "percentage",
              // `lineEngineTotal` reads this; a zero here filters the vendor out.
              total_price: Math.round((base + chargeSum) * (1 + QC_GST / 100)),
              // Each of these is a negotiable field. An empty array or a
              // missing comment is not "nothing to negotiate" to the wizard —
              // it renders the field with no current value to push against.
              other_charges: charges,
              delivery_period: `${quote.leadTimeDays} days`,
              payment_terms: quote.paymentTerms,
              global_payment_term: [{ details: quote.paymentTerms }],
              comment: lineComment(vendorId, item),
              global_comment: quoteComment(vendorId, quote),
              document_files: [
                { name: `${vendorsById[vendorId].short.replace(/\s+/g, "")}_${item.id}_TDS.pdf`, url: "#" },
              ],
              global_document_files: [
                { name: `${vendorsById[vendorId].short.replace(/\s+/g, "")}_Quote_${rfq.id}.pdf`, url: "#" },
                { name: `${vendorsById[vendorId].short.replace(/\s+/g, "")}_GST_Certificate.pdf`, url: "#" },
              ],
            },
          ],
        };
      })
      .filter(Boolean);

    return {
      id: productId,
      quantity: item.annualQty,
      unit: item.uom,
      active_round: null,
      product_details: [{ name: item.name, product_name: item.name }],
      product_specs: [
        { title: "Spec", value: item.spec },
        { title: "Size", value: item.spec.split(" · ")[0] },
      ],
      product_vendors: quotations.map((q) => q.vendor_details),
      quotations,
    };
  });

const detailRoutes = [
  /* purchase order */
  {
    method: "get",
    path: "/po/detail/:id",
    handler: ({ params }) => {
      const po = getPo(params.id);
      return po ? poDetail(po) : undefined;
    },
  },
  {
    method: "post",
    path: "/pricing/preview",
    handler: ({ body }) => {
      // previewTotals → { lines[], global_charges[], global_charges_total }
      const items = body?.items || body?.lines || [];
      return {
        lines: items.map((l) => ({
          base: (Number(l.unit_price) || 0) * (Number(l.quantity) || 0),
          base_tax: 0,
          charges_total: 0,
          charges: [],
        })),
        global_charges: [],
        global_charges_total: 0,
      };
    },
  },
  { method: "get", path: "/po/:id/initiators", handler: () => undefined },

  /* material requisition */
  {
    method: "get",
    path: "/mr/:id",
    handler: ({ params }) => {
      const m = allMrs.find((x) => x.id === params.id);
      if (!m) return undefined;
      const p = propertiesById[m.propertyId];
      const raiser = person(m.raisedBy) || person("housekeeping");
      // The page reads `payload.mr`, so the record is nested rather than bare.
      return { mr: {
        id: m.id,
        mr_number: m.id,
        title: m.title,
        status: m.status,
        urgency: m.urgency,
        hotel_name: p?.name,
        hotel_code: p?.id?.toUpperCase(),
        department_name: m.department,
        cost_centre: `${m.department} · ${p?.shortName}`,
        raised_by_name: raiser.name,
        raised_by_role: raiser.title,
        created_at: iso(m.raisedOn),
        submitted_at: iso(m.raisedOn),
        required_by_date: iso("2026-10-01"),
        justification: m.id === mr.id ? mr.note : "Routine replenishment against par stock.",
        approval: { status: m.status, steps: [] },
        items: (m.id === mr.id ? lineItems : lineItems.slice(0, m.lineCount)).map((i, idx) => ({
          id: idx + 1,
          name: i.name,
          specification: i.spec,
          quantity: i.annualQty,
          unit: i.uom,
          last_rate: i.lastRate,
          estimated_value: i.annualQty * i.lastRate,
        })),
      } };
    },
  },

  /* rate contract */
  { method: "get", path: "/arc-v2/:id/lifecycle", handler: ({ params }) => arcLifecycle(params.id) },
  {
    method: "get",
    path: "/arc-v2/:id",
    handler: ({ params }) => ({
      ...arcLifecycle(params.id).arc,
      // TechnicalStage reads `d.items` off the contract detail — without them
      // the matrix has no rows and renders "No items to evaluate".
      items: lineItems.map((i, idx) => ({
        id: idx + 1,
        product_variant_id: idx + 1,
        name: i.name,
        variant_name: i.name,
        variant_slug: i.spec.split(" · ")[0],
        uom: i.uom,
        quantity: i.annualQty,
        specification: i.spec,
      })),
    }),
  },
  { method: "get", path: "/arc-v2/:id/active-summary", handler: () => ({ items: [], total: 0 }) },
  { method: "get", path: "/arc-v2/evaluation/:id/universal-tech-eval", handler: () => techEvalBlock() },
  {
    method: "get",
    path: "/arc-v2/evaluation/:id/tech-eval/approval",
    handler: () => ({ status: "NOT_SUBMITTED", approvers: [], can_submit: true }),
  },
  { method: "get", path: "/arc-v2/evaluation/items/:id/tech-eval", handler: () => techEvalBlock() },

  /* rfq */
  /* Product search on Create RFQ.
     `searchProductsV2` sorts `response.data` with Array.sort, so this MUST be
     a bare array — hence raw(). Rows read
     { variant_id, variant_name, product_name, category_name, vendor_count }. */
  {
    method: "post",
    path: "/rfq/search-product",
    handler: ({ body }) => {
      const q = String(body?.search_key || "").trim().toLowerCase();
      const rows = lineItems
        .map((i, idx) => ({
          variant_id: idx + 1,
          product_id: idx + 1,
          variant_name: i.name,
          product_name: i.name,
          category_name: CATEGORY,
          sub_category_name: "Housekeeping supply",
          uom: i.uom,
          unit: i.uom,
          specification: i.spec,
          // How many approved suppliers can quote this line. A zero here is
          // what the screen warns about, so it has to be truthful.
          vendor_count: Object.values(quotesByVendor).filter((qq) =>
            qq.lines.some((l) => l.itemId === i.id)
          ).length,
        }))
        .filter((r) =>
          !q ||
          r.variant_name.toLowerCase().includes(q) ||
          r.category_name.toLowerCase().includes(q) ||
          r.specification.toLowerCase().includes(q)
        );
      return raw({ data: rows, total: rows.length });
    },
  },
  /* Draft editing.
     CreateRFQ's loadDraft dispatches `intializeRfq(draftRes.data)` and then
     does `draftRes.data.rfq_products.map(...)` unguarded, so all three keys
     — rfq_form_data, rfq_products, mappedHotels — must be present. It also
     reads mappedHotels[].hotel_id, so that array cannot be empty either. */
  {
    method: "get",
    path: "/rfq/get-draft-by-id/:id",
    handler: ({ params }) => {
      const saved = demoSession.drafts[params.id];
      // Variant ids are 1-based indexes into the catalogue (see the product
      // search fixture), so the draft reopens with exactly what was chosen.
      const chosen = (saved?.variant_ids || [])
        .map((vid) => lineItems[vid - 1])
        .filter(Boolean);
      const items = chosen.length ? chosen : lineItems.slice(0, 2);
      const owner = person(rfq.ownerId);

      return {
        rfq_id: params.id,
        rfq_form_data: {
          // Saved values win over the defaults below, so a timeline or a
          // department set in the wizard survives the reload on Review.
          ...({
          is_published: 0,
          comment: "",
          response_email: company.procurementEmail,
          contact_name: owner.name,
          // Stored as "<code>-<digits>". Two separate requirements:
          //   the hyphen — loadDraft splits on it to fill the country-code
          //     dropdown; without one the dropdown renders "()";
          //   digits only — CreateRFQSchema validates the number against
          //     /^\+?[0-9]{1,3}[0-9]{7,14}$/, so a space keeps Formik invalid
          //     and the Submit button disabled with no visible reason.
          contact_number: `+91-${owner.phone.replace(/\D/g, "").replace(/^91/, "")}`,
          company_name: company.name,
          terms: [],
          term_and_condition_files: [],
          bid_end_date: "",
          rfq_type: "rfq",
          reverse_auction: 0,
          ra_start_date: null,
          ra_end_date: null,
          project_id: -1,
          location: propertiesById["ic-mumbai"].address,
          is_tender: 0,
          tender_fees: 0,
          tender_publish_date: "",
          vendor_clarification_date: "",
          spoc_name: owner.name,
          spoc_email: owner.email,
          spoc_mobile: owner.phone,
          hospitality_company_id: 1,
          hotel_id: propertiesById["ic-mumbai"].numericId,
          department_id: 1,
          process_id: 1,
          title: `${CATEGORY} — ${FY}`,
          }),
          ...(saved?.form || {}),
        },
        rfq_products: items.map((i) => {
          const vid = lineItems.indexOf(i) + 1;
          return {
          id: vid,
          product_id: vid,
          product_variant_id: vid,
          name: i.name,
          variant: i.spec,
          unit: i.uom,
          quantity: i.annualQty,
          comment: "",
          // Item.js reads quantity/unit/spec out of this array by TITLE
          // ("Quantity", "Unit", "Spec", "Size") — a single "Specification"
          // entry leaves the row showing "Quantity required".
          spec: [
            { title: "Spec", value: i.spec },
            { title: "Quantity", value: i.annualQty },
            { title: "Unit", value: i.uom },
          ],
          specs: [
            { title: "Spec", value: i.spec },
            { title: "Quantity", value: i.annualQty },
            { title: "Unit", value: i.uom },
          ],
          vendors: [],
          datasheet_file: [],
          spec_file: [],
          qap_file: [],
          };
        }),
        mappedHotels: (saved?.hotel_ids?.length
          ? saved.hotel_ids
          : [propertiesById["ic-mumbai"].numericId]
        ).map((hid) => {
          const prop = Object.values(propertiesById).find((x) => x.numericId === Number(hid));
          return {
            hotel_id: Number(hid),
            hotel_name: prop?.name || propertiesById["ic-mumbai"].name,
            hospitality_company_id: 1,
            company_name: company.name,
          };
        }),
      };
    },
  },
  { method: "get", path: "/rfq/draft", handler: () => ({ rfq_id: null, rfq_form_data: null, rfq_products: [], mappedHotels: [] }) },
  /* Option lists for the Details step. Read as
     `response.data.data || response.data`, mapped to { value: id, label: title|name }. */
  {
    method: "get",
    path: "/rbac/departments",
    handler: () =>
      departments.map((d, i) => ({
        id: i + 1,
        title: d.name,
        name: d.name,
        code: d.id.toUpperCase(),
      })),
  },
  {
    method: "get",
    path: "/general/hospitality/approval/processes",
    handler: () => [
      { id: 1, name: "Standard procurement", code: "STD" },
      { id: 2, name: "Capex approval", code: "CAPEX" },
      { id: 3, name: "Emergency purchase", code: "EMG" },
    ],
  },
  {
    method: "get",
    path: "/rfq/getRfqById/:id",
    handler: ({ params }) =>
      demoSession.publishedRfqs?.[String(params.id)]
        ? sessionRfqById(String(params.id))
        : rfqById(),
  },
  { method: "get", path: "/rfq/:id/lineage", handler: () => ({ copied_from: null, copies: [] }) },
  {
    method: "get",
    path: "/rfq/get-clauses/:id",
    handler: ({ params }) => {
      // useHasTechClauses reads `res.data.length` off the peeled response, so
      // this shape IS the envelope — wrapping it made "Technical configured"
      // read No even when clauses existed.
      //
      // The evaluation screen needs the rows GROUPED per product, each with its
      // own clauses and vendors: it does
      // `clauseInfo.find(ci => ci.rfq_product_id == product.id).clauses`.
      // A flat list of clause rows satisfies the has-clauses check and still
      // renders "No Clauses Available", which is what it did.
      return raw({ data: techEvalGroups(String(params.id)) });
    },
  },
  {
    method: "get",
    path: "/negotiation/rounds/:id",
    handler: () => ({ rounds: [], total: 0, prior_rounds: negotiation.priorRounds }),
  },
  {
    method: "get",
    path: "/rfq/:id/lifecycle",
    handler: ({ params }) => {
      const id = String(params.id);
      const rec = demoSession.publishedRfqs?.[id];
      const collected = demoSession.rfqQuotes?.[id];
      // Session RFQs progress; anything else is the golden thread, already
      // sitting on quotes with a negotiation to run.
      const isSession = !!rec;
      const published = !isSession || !!collected;
      const closed = !isSession || !!rec?.bidding_closed;

      // These four keys are not decorative — ViewRFQ switches its body on them
      // and renders nothing for a key it doesn't know. An invented journey
      // ("Created / Published / Quotes received") looks right in the rail and
      // then opens onto a blank page, which is exactly what it did.
      const written = allSessionClauses().filter((c) => String(c.rfq_id) === id);
      const clauseCount = isSession ? written.length : clauses.length;
      const hasClauses = clauseCount > 0;

      const overviewSummary = !published
        ? undefined
        : collected
          ? `Published · ${collected.submitted} of ${collected.invited} responded${closed ? " · bidding closed" : ""}`
          : `Published · ${rfq.quoted} of ${rfq.invited} responded`;

      return {
        default_stage: published ? "negotiation-award" : "overview",
        stage: published ? "quotes_received" : "published",
        stages: [
          {
            key: "overview",
            label: "Overview",
            // RfqStageTimeline only settles a stage on "complete" — "done"
            // falls through to its default and reads "In progress".
            state: published ? "complete" : "active",
            summary: overviewSummary,
          },
          {
            key: "technical",
            label: "Technical evaluation",
            // Skipped is the truthful answer only while no clauses exist. Once
            // the wizard has written some, the stage applies and opens the
            // evaluation workspace.
            state: hasClauses ? (published ? "active" : "locked") : "skipped",
            summary: hasClauses ? `${clauseCount} clause${clauseCount === 1 ? "" : "s"} configured` : undefined,
          },
          {
            key: "negotiation-award",
            label: "Negotiation & award",
            state: published ? "active" : "locked",
            summary: published ? "Quotes in — ready to negotiate or award" : undefined,
          },
          { key: "purchase-order", label: "Purchase order", state: "locked" },
        ],
        permissions: { read: true, update: true },
      };
    },
  },
  {
    method: "get",
    path: "/rfq/technical/dashboard/:id",
    handler: () => ({
      // Nothing evaluated yet — the buyer has just opened the workspace.
      completed_product_ids: [],
      products_completed: 0,
      products_in_progress: 0,
      vendors_passed: 0,
      vendors_failed: 0,
    }),
  },
  {
    method: "get",
    path: "/rfq/tech-eval/status/:id",
    handler: () => ({ status: "NOT_STARTED", approval_instance: null, can_submit: true }),
  },
  {
    method: "get",
    path: "/rfq/charge-names",
    // The negotiation field picker builds one negotiable field per charge, so
    // this list IS the set of charges a buyer can push on. It has to be an
    // array of objects with a slug — `{ names: [...] }` is not an array, so
    // CreateRoundPage discarded it and step 2 offered payment terms alone.
    //
    // `created_by: null` marks a platform-default charge. StepVendorsAndTargets
    // filters the global picker on exactly that, so an undefined one is dropped
    // and Freight / Packaging never reach the field list.
    handler: () => [
      { id: 1, name: "Freight", slug: "freight", is_global: false, created_by: null },
      { id: 2, name: "Packaging", slug: "packaging", is_global: false, created_by: null },
      { id: 3, name: "Handling", slug: "handling", is_global: false, created_by: null },
    ],
  },
  {
    method: "get",
    path: "/rfq/quote-compare/:id",
    handler: ({ params }) => {
      const collected = demoSession.rfqQuotes?.[String(params.id)];
      return { products: collected ? sessionCompareProducts(collected) : quoteCompareProducts() };
    },
  },
  {
    method: "get",
    path: "/rfq/quote-comparison-view/:id",
    handler: ({ params, config }) => {
      const id = String(params.id);
      const rec = demoSession.publishedRfqs?.[id];
      const collected = demoSession.rfqQuotes?.[id];
      // The screen's delivery-charge toggle is applied entirely server-side:
      // with freight=0 the cells come back without their delivery lines and
      // with a reduced total, so computeHelpers never learns the toggle exists.
      const withFreight = !/[?&]freight=0/.test(String(config?.url || ""));
      // An RFQ raised this session compares the responses Publish now collected;
      // anything else compares the signed-off fixture.
      const view = rec && collected
        ? sessionCompareView(id, rec, collected, withFreight)
        : threadCompareView(id, withFreight);

      // Reflect anything already awarded this session, or the sheet reopens
      // with FINALIZED TOTAL ₹0 and every product still "open" — the award
      // appears to have done nothing.
      view.products.forEach((prod) => {
        const award = demoSession.awards?.[`${id}:${prod.id}`];
        if (!award) return;
        prod.state = "pending";
        prod.finalized_vendor = award.vendor_id;
        prod.finalized_by = peopleById.purchase?.name || null;
      });
      // This endpoint's documented shape IS the envelope — the service resolves
      // the peeled response directly, so a `{ data }` wrapper would hide every
      // product behind view.data and render an empty grid.
      return raw(view);
    },
  },

  /* negotiation */
  {
    method: "get",
    path: "/negotiation/quotes/:id/approval-status",
    handler: () => ({ status: "NOT_REQUIRED", approvers: [], can_approve: false }),
  },
  {
    method: "get",
    path: "/negotiation/rounds/:id/active-all",
    handler: () => ({
      rounds: [],
      active: null,
      total_rounds: 0,
      prior_rounds: negotiation.priorRounds,
    }),
  },
];

export default detailRoutes;
