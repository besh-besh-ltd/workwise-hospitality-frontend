import { contract, lineItems as threadLineItems } from "./thread";
import { purchaseOrders } from "./orders";
import { vendorsById } from "./vendors";
import { peopleById } from "./org";

/**
 * Rate contracts (ARCs) — the portfolio the rate-contract module serves.
 *
 * One record per contract, at a real ARC v2 lifecycle status. Every count on
 * the ARC dashboard and list tabs, every "pending for me" item and every
 * consumption bar is derived from these records and from the call-off POs in
 * orders.js (a PO whose `contractId` names the contract), never typed twice.
 *
 * Demo today is Fri 14 Aug 2026.
 *
 * The golden-thread contract (ARC-2627-0014) is ACTIVE. The technical
 * evaluation the two AI prototypes run on is ARC-2627-0013, a separate
 * towel contract whose submission window closed on 28 Jun 2026.
 */

/** The contract the AI Technical Evaluator / Approver prototypes run on. */
export const TECH_EVAL_ARC_ID = "ARC-2627-0013";

/** Categories of the tenant's catalogue (create form, filters, spend). */
export const arcCategories = [
  { id: 11, title: "Housekeeping supply", subs: [{ id: 111, title: "Bath linen" }, { id: 112, title: "Bed linen" }, { id: 113, title: "Guest amenities" }, { id: 114, title: "Spa linen" }] },
  { id: 12, title: "F&B linen", subs: [{ id: 121, title: "Table linen" }, { id: 122, title: "Kitchen linen" }] },
  { id: 13, title: "Uniforms", subs: [{ id: 131, title: "Front office" }, { id: 132, title: "F&B service" }, { id: 133, title: "Housekeeping" }] },
  { id: 14, title: "Guest room furnishing", subs: [{ id: 141, title: "Mattresses & toppers" }] },
  { id: 15, title: "Sustainable packaging", subs: [{ id: 151, title: "Laundry & slipper bags" }] },
];
export const arcCategoryByTitle = Object.fromEntries(arcCategories.map((c) => [c.title, c]));

const DEPT = { housekeeping: { id: 21, title: "Housekeeping" }, fnb: { id: 22, title: "Food & Beverage" }, "front-office": { id: 23, title: "Front Office" } };

/* Item helper: id, name, uom, qty (committed / indicative), rate (awarded), vendor (awarded slug). */
const it = (id, name, uom, qty, rate, vendor, spec) => ({ id, name, uom, qty, rate, vendor, spec });

const threadAward = {
  "twl-bath-500": ["sriram", 400], "twl-hand-500": ["sriram", 154], "bed-sheet-300": ["trident", 1059],
  "duvet-cover": ["trident", 1386], "pillow-cover": ["trident", 224], "bath-mat": ["sriram", 360],
  bathrobe: ["sriram", 1082], "amenity-kit": ["greenleaf", 141],
};

/**
 * The portfolio. `status` is the product's own ARC status enum. Approvals
 * carry the persona whose turn it is; `chain` lists every level in order.
 */
export const portfolio = [
  {
    id: contract.id, title: contract.title, status: "contract_active", category: "Housekeeping supply", sub: "Bath linen",
    dept: "housekeeping", propertyIds: contract.propertyIds, ownerId: "purchase",
    createdOn: "2026-05-28", window: ["2026-06-01T10:00", "2026-06-15T18:00"], termStart: contract.termStart, termEnd: contract.termEnd,
    items: threadLineItems.map((l, i) => it(101 + i, l.name, l.uom, l.annualQty, threadAward[l.id][1], threadAward[l.id][0], l.spec)),
    itemKeys: threadLineItems.map((l) => l.id),
    invited: ["sriram", "welspun", "trident", "nandan", "greenleaf", "aarvi", "kaveri", "solapur", "orientcraft"], declined: ["kaveri", "solapur", "orientcraft"],
    committeeOn: "2026-06-26", signedOn: "2026-06-30", live: true,
  },
  {
    id: "ARC-2627-0011", title: "Bath Linen — Workwise Grand, FY 2026-27", status: "contract_active", category: "Housekeeping supply", sub: "Bath linen",
    dept: "housekeeping", propertyIds: ["ic-mumbai"], ownerId: "purchase",
    createdOn: "2026-04-20", window: ["2026-04-24T10:00", "2026-05-08T18:00"], termStart: "2026-06-01", termEnd: "2027-05-31",
    items: [
      it(201, "Bath Towel 500 GSM — dobby border", "pcs", 4800, 850, "welspun", "70×140 cm · dobby border · Rooms & Spa"),
      it(202, "Bath Towel 500 GSM — standard", "pcs", 6000, 384, "nandan", "70×140 cm · second source"),
      it(203, "Bath Mat 900 GSM", "pcs", 1600, 210, "welspun", "50×80 cm · anti-skid backing"),
    ],
    itemKeys: ["twl-bath-500", "twl-bath-500", "bath-mat"],
    invited: ["welspun", "nandan", "sriram", "trident"], declined: [],
    committeeOn: "2026-05-22", signedOn: "2026-05-28",
    amendment: {
      id: 3107, type: "price", itemId: 201, vendor: "welspun", newRate: 884, from: "2026-09-01", to: "2027-05-31",
      reason: "Cotton yarn index up 4.1% since award — vendor requests ₹884 on the dobby towel from 01 Sep.",
      requestedOn: "2026-08-06", chain: [{ personId: "purchase", state: "approved", on: "2026-08-08" }, { personId: "finance", state: "pending" }],
    },
  },
  {
    id: "ARC-2627-0004", title: "Spa Therapy Linen — Workwise Grand, FY 2026-27", status: "contract_active", category: "Housekeeping supply", sub: "Spa linen",
    dept: "housekeeping", propertyIds: ["ic-mumbai"], ownerId: "purchase",
    createdOn: "2026-02-16", window: ["2026-02-20T10:00", "2026-03-06T18:00"], termStart: "2026-04-01", termEnd: "2027-03-31",
    items: [it(301, "Spa therapy linen set", "set", 3000, 401, "nandan", "380 GSM terry · 4-piece set")],
    itemKeys: ["spa-linen"],
    invited: ["nandan", "aarvi", "sriram"], declined: [],
    committeeOn: "2026-03-20", signedOn: "2026-03-26",
  },
  {
    id: "ARC-2627-0009", title: "Bed Linen — Metro Greater Noida, H1 FY 2026-27", status: "expiring_soon", category: "Housekeeping supply", sub: "Bed linen",
    dept: "housekeeping", propertyIds: ["cp-noida"], ownerId: "purchase",
    createdOn: "2026-02-10", window: ["2026-02-12T10:00", "2026-02-26T18:00"], termStart: "2026-04-01", termEnd: "2026-09-30",
    items: [it(401, "Bed Sheet 300 TC", "pcs", 1400, 1059, "trident", "275×275 cm · sateen · white"), it(402, "Duvet Cover 300 TC", "pcs", 500, 1386, "trident", "225×245 cm · percale")],
    itemKeys: ["bed-sheet-300", "duvet-cover"],
    invited: ["trident", "kaveri", "welspun"], declined: [],
    committeeOn: "2026-03-12", signedOn: "2026-03-18",
  },
  {
    id: "ARC-2627-0008", title: "Eco Laundry & Slipper Bags — group, FY 2026-27", status: "awaiting_vendor_acceptance", category: "Sustainable packaging", sub: "Laundry & slipper bags",
    dept: "housekeeping", propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"], ownerId: "purchase",
    createdOn: "2026-06-08", window: ["2026-06-10T10:00", "2026-06-30T18:00"], termStart: "2026-09-01", termEnd: "2027-08-31",
    items: [it(501, "Laundry bag — recycled kraft", "pcs", 42000, 18, "greenleaf", "FSC kraft · printed"), it(502, "Slipper bag — cotton drawstring", "pcs", 38000, 22, "greenleaf", "unbleached cotton")],
    invited: ["greenleaf", "aarvi"], declined: [],
    committeeOn: "2026-08-05", sentOn: "2026-08-10",
  },
  {
    id: "ARC-2627-0010", title: "Kitchen & Chef Linen — Workwise Grand, FY 2026-27 H2", status: "committee_review", category: "F&B linen", sub: "Kitchen linen",
    dept: "fnb", propertyIds: ["ic-mumbai"], ownerId: "purchase",
    createdOn: "2026-06-15", window: ["2026-06-18T10:00", "2026-07-10T18:00"], termStart: "2026-10-01", termEnd: "2027-09-30",
    items: [it(601, "Chef jacket — poly-cotton", "pcs", 900, 685, "orientcraft", "double-breasted · 210 GSM"), it(602, "Kitchen glass cloth", "pcs", 6000, 46, "kaveri", "50×70 cm · cotton waffle"), it(603, "Apron — bib, twill", "pcs", 1200, 238, "orientcraft", "cotton twill · adjustable")],
    invited: ["orientcraft", "kaveri", "welspun"], declined: [],
    finalizedOn: "2026-08-07",
    committee: { submittedOn: "2026-08-07", chain: [{ personId: "finance", state: "approved", on: "2026-08-10" }, { personId: "regional", state: "pending" }] },
  },
  {
    id: "ARC-2627-0012", title: "Banquet Table Linen — Workwise Grand & Metro Greater Noida", status: "comm_eval_in_progress", category: "F&B linen", sub: "Table linen",
    dept: "fnb", propertyIds: ["ic-mumbai", "cp-noida"], ownerId: "purchase",
    createdOn: "2026-06-22", window: ["2026-06-24T10:00", "2026-07-20T18:00"], termStart: "2026-10-01", termEnd: "2027-09-30",
    items: [it(701, "Banquet table cloth — 90×90 in", "pcs", 2400, 742, "kaveri", "poly-cotton satin band · white"), it(702, "Napkin — 20×20 in", "pcs", 18000, 64, "kaveri", "cotton damask"), it(703, "Table skirting — 21 ft", "pcs", 300, 1940, "orientcraft", "box pleat · velcro clip")],
    invited: ["kaveri", "orientcraft", "welspun", "trident"], declined: ["trident"],
  },
  {
    id: TECH_EVAL_ARC_ID, title: "Bath & Pool Towels — Workwise Grand, FY 2026-27 H2", status: "tech_eval_in_progress", category: "Housekeeping supply", sub: "Bath linen",
    dept: "housekeeping", propertyIds: ["ic-mumbai"], ownerId: "purchase",
    createdOn: "2026-06-03", window: ["2026-06-08T10:00", "2026-06-28T18:00"], termStart: "2026-10-01", termEnd: "2027-03-31",
    // Item ids 1–4: the AI prototypes' matrix is keyed on item 1 (see arcTechEval.js).
    items: [it(1, "BATH TOWEL 500 GSM", "pcs", 5200, null, null, "70×140 cm · 100% cotton · ring-spun"), it(2, "HAND TOWEL 400 GSM", "pcs", 6400, null, null, "40×60 cm · 100% cotton"), it(3, "BATH MAT", "pcs", 1800, null, null, "50×80 cm · cotton"), it(4, "POOL TOWEL", "pcs", 2400, null, null, "450 GSM · striped")],
    invited: ["sriram", "nandan", "solapur", "welspun", "trident", "aarvi", "greenleaf", "kaveri", "orientcraft"], declined: ["orientcraft"],
    // Scored by Ananya, submitted 14 Jul 2026, waiting on Sameer (lib/wwai/data/techApprove.js).
    techApproval: { submittedOn: "2026-07-14", personId: "regional" },
    estimate: 6340000,
  },
  {
    id: "ARC-2627-0015", title: "Bathrobes — Riverside Corbett & Fort Barwara, FY 2026-27 H2", status: "submission_closed", category: "Housekeeping supply", sub: "Bath linen",
    dept: "housekeeping", propertyIds: ["voco-corb", "ss-barwara"], ownerId: "purchase",
    createdOn: "2026-07-22", window: ["2026-07-24T10:00", "2026-08-10T18:00"], termStart: "2026-10-01", termEnd: "2027-09-30",
    items: [it(801, "Bathrobe Waffle", "pcs", 560, null, null, "Unisex · 400 GSM · embroidered"), it(802, "Kimono robe — cotton", "pcs", 240, null, null, "Unisex · lightweight")],
    invited: ["welspun", "aarvi", "orientcraft"], declined: [],
    estimate: 920000,
  },
  {
    id: "ARC-2627-0017", title: "Bed Linen — Riverside Corbett & Fort Barwara, FY 2026-27 H2", status: "floated", category: "Housekeeping supply", sub: "Bed linen",
    dept: "housekeeping", propertyIds: ["voco-corb", "ss-barwara"], ownerId: "purchase",
    createdOn: "2026-08-03", window: ["2026-08-05T10:00", "2026-08-28T18:00"], termStart: "2026-10-01", termEnd: "2027-09-30",
    items: [it(901, "Bed Sheet 300 TC", "pcs", 1500, null, null, "275×275 cm · sateen · white"), it(902, "Pillow Cover 300 TC", "pcs", 2800, null, null, "50×75 cm · sateen"), it(903, "Duvet Cover 300 TC", "pcs", 900, null, null, "225×245 cm · percale")],
    invited: ["kaveri", "trident", "welspun", "orientcraft"], declined: ["trident"], submitted: ["kaveri", "welspun"],
    estimate: 4230000,
  },
  {
    id: "ARC-2627-0018", title: "Guest Amenities — City Express Whitefield, FY 2026-27 H2", status: "pending_publish_approval", category: "Housekeeping supply", sub: "Guest amenities",
    dept: "housekeeping", propertyIds: ["hie-blr"], ownerId: "purchase",
    createdOn: "2026-08-11", window: ["2026-08-20T10:00", "2026-09-10T18:00"], termStart: "2026-10-01", termEnd: "2027-03-31",
    items: [it(1001, "Guest Amenity Kit", "set", 21000, null, null, "6-piece · paraben-free · FSC carton"), it(1002, "Dental kit", "set", 9000, null, null, "bamboo brush · 10 g paste")],
    invited: ["greenleaf", "aarvi"], declined: [],
    publish: { submittedOn: "2026-08-12", personId: "regional" },
    estimate: 3420000,
  },
  {
    id: "ARC-2627-0016", title: "Uniform Supply — group", status: "draft", category: "Uniforms", sub: "Front office",
    dept: "front-office", propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"], ownerId: "purchase",
    createdOn: "2026-08-12", window: ["2026-09-01T10:00", "2026-09-21T18:00"], termStart: "2026-11-01", termEnd: "2027-10-31",
    items: [it(1101, "Front office blazer", "pcs", 420, null, null, "poly-wool · navy"), it(1102, "F&B service shirt", "pcs", 1600, null, null, "poly-cotton · white"), it(1103, "Housekeeping tunic", "pcs", 1100, null, null, "poly-cotton · grey")],
    invited: [], declined: [],
    estimate: 9800000,
  },
  {
    id: "ARC-2526-0071", title: "Mattresses & Toppers — Fort Barwara", status: "closed_no_award", category: "Guest room furnishing", sub: "Mattresses & toppers",
    dept: "housekeeping", propertyIds: ["ss-barwara"], ownerId: "purchase",
    createdOn: "2026-03-24", window: ["2026-03-26T10:00", "2026-04-20T18:00"], termStart: "2026-05-01", termEnd: "2027-04-30",
    items: [it(1201, "Mattress — pocket spring, king", "pcs", 48, null, null, "200×200×25 cm"), it(1202, "Mattress topper — microfibre", "pcs", 96, null, null, "5 cm")],
    invited: ["welspun", "orientcraft", "kaveri"], declined: ["kaveri", "orientcraft"],
    closedOn: "2026-04-28", closedReason: "One quote against three invitations, 22% over the estimate. Closed without award; to re-tender with a wider panel.",
    estimate: 2860000,
  },
];

export const contractsById = Object.fromEntries(portfolio.map((c) => [c.id, c]));

/* ── derived facts ─────────────────────────────────────────────────────── */

export const LIVE_STATUSES = ["contract_active", "expiring_soon"];
const AWARDED_STATUSES = ["committee_approved", "contract_generated", "awaiting_vendor_acceptance", ...LIVE_STATUSES];

/** Committed value: awarded qty × awarded rate; the estimate before award. */
export const committedValue = (c) =>
  c.items.every((i) => i.rate != null) ? c.items.reduce((s, i) => s + i.qty * i.rate, 0) : 0;

export const estimatedValue = (c) => committedValue(c) || c.estimate || 0;

/** Awarded vendors, in order of awarded value. */
export const awardedVendors = (c) => {
  if (!AWARDED_STATUSES.includes(c.status) && c.status !== "committee_review" && c.status !== "comm_eval_in_progress") return [];
  const by = {};
  c.items.forEach((i) => { if (i.vendor) by[i.vendor] = (by[i.vendor] || 0) + i.qty * i.rate; });
  return Object.entries(by).sort((a, b) => b[1] - a[1]).map(([v]) => v);
};
export const isAwarded = (c) => AWARDED_STATUSES.includes(c.status);

/**
 * Call-off POs against a contract: every PO in orders.js whose `contractId`
 * names it. Each line maps to the contract line of the same product (and the
 * PO's vendor where the item is split between vendors).
 */
export const callOffsFor = (c) =>
  purchaseOrders
    .filter((p) => p.contractId === c.id)
    .map((p) => ({
      po: p,
      lines: p.lines.map((l) => {
        const idxs = (c.itemKeys || []).map((k, i) => (k === l.itemId ? i : -1)).filter((i) => i >= 0);
        const pick = idxs.find((i) => c.items[i].vendor === p.vendorId) ?? idxs.find((i) => c.items[i].rate === l.rate) ?? idxs[0];
        return { line: l, item: pick != null ? c.items[pick] : null };
      }),
    }));

/** Consumed value (excl. taxes) = the call-off lines' base value. */
export const consumedValue = (c) =>
  callOffsFor(c).reduce((s, co) => s + co.lines.reduce((t, x) => t + x.line.value, 0), 0);

/** Days from demo today to a date. */
export const DEMO_TODAY = "2026-08-14";
export const daysFromToday = (d) => Math.round((new Date(`${d}T00:00:00Z`) - new Date(`${DEMO_TODAY}T00:00:00Z`)) / 86400000);

/** Can this persona see this contract? Mumbai-only personas see Mumbai contracts. */
export const visibleTo = (c, personaId) => {
  const p = peopleById[personaId];
  if (!p) return true;
  return c.propertyIds.some((id) => p.propertyIds.includes(id));
};

/* ── approvals waiting on a persona ────────────────────────────────────── */

const hoursSince = (on) => Math.max(1, Math.round((new Date(`${DEMO_TODAY}T15:00:00+05:30`) - new Date(on.length > 10 ? on : `${on}T11:00:00+05:30`)) / 3600000));
const hotelLabel = (c) => (c.propertyIds.length > 1 ? `${c.propertyIds.length} properties` : null);

/**
 * The ARC approvals waiting on a persona, in the PendingApprovalsModal item
 * shape. The "Pending for me" tab of the rate-contract register shows exactly
 * these contracts.
 */
export const pendingApprovalsFor = (personaId) => {
  const out = [];
  portfolio.forEach((c) => {
    const base = { entity_id: c.id, entity_title: c.title, arc_id: c.id, arc_number: c.id, arc_title: c.title, metadata: {}, hotel_name: hotelLabel(c) };
    if (c.publish && c.status === "pending_publish_approval" && c.publish.personId === personaId) {
      out.push({ ...base, entity_type: "ARC_PUBLISH", waiting_hours: hoursSince(c.publish.submittedOn) });
    }
    if (c.techApproval && c.techApproval.personId === personaId) {
      out.push({ ...base, entity_type: "ARC_TECH", waiting_hours: hoursSince("2026-07-14T11:20:00+05:30") });
    }
    if (c.committee && c.status === "committee_review") {
      const cur = c.committee.chain.find((s) => s.state === "pending");
      if (cur?.personId === personaId) out.push({ ...base, entity_type: "ARC_COMMITTEE", waiting_hours: hoursSince(c.committee.chain.filter((s) => s.on).slice(-1)[0]?.on || c.committee.submittedOn) });
    }
    if (c.amendment) {
      const cur = c.amendment.chain.find((s) => s.state === "pending");
      if (cur?.personId === personaId) {
        out.push({ ...base, entity_type: "ARC_AMENDMENT", entity_id: c.amendment.id, entity_title: `AMD-${c.amendment.id} · price amendment · ${c.title}`, waiting_hours: hoursSince(c.amendment.chain.filter((s) => s.on).slice(-1)[0]?.on || c.amendment.requestedOn) });
      }
    }
  });
  return out;
};

/** Ids of the contracts with an approval waiting on the persona. */
export const pendingArcIdsFor = (personaId) => new Set(pendingApprovalsFor(personaId).map((p) => p.arc_id));

/* ── activity ──────────────────────────────────────────────────────────── */

const vName = (slug) => vendorsById[slug]?.name || slug;
const link = (c, stage) => `/dashboard/buyer/rate-contracts/${c.id}${stage ? `?stage=${stage}` : ""}`;

/** Everything that happened in the portfolio, newest first. */
export const arcEvents = () => {
  const ev = [];
  const push = (on, title, message, c, stage, kind, who) => ev.push({ at: on.length > 10 ? new Date(on).toISOString() : new Date(`${on}T11:00:00+05:30`).toISOString(), title, message, link: link(c, stage), kind, who, arcId: c.id });
  portfolio.forEach((c) => {
    push(c.createdOn, "Rate contract drafted", `${c.id} · ${c.title}`, c, null, "arc_created", "purchase");
    if (!["draft", "pending_publish_approval"].includes(c.status)) push(c.window[0], "Rate contract floated", `${c.id} · ${c.invited.length} vendors invited`, c, "overview", "arc_floated", "purchase");
    if (c.publish) push(c.publish.submittedOn, "Publish approval requested", `${c.id} · waiting on ${peopleById[c.publish.personId].name}`, c, "overview", "arc_publish", "purchase");
    if (c.techApproval) push("2026-07-14T11:20:00+05:30", "Technical evaluation submitted", `${c.id} · 5 vendors scored · waiting on ${peopleById[c.techApproval.personId].name}`, c, "technical", "arc_tech", "purchase");
    if (c.committee) {
      push(c.committee.submittedOn, "Award sent to committee", `${c.id} · ${committeeAwardsLabel(c)}`, c, "awarding", "arc_committee", "purchase");
      c.committee.chain.filter((s) => s.on).forEach((s) => push(s.on, "Committee level approved", `${c.id} · ${peopleById[s.personId].name} approved`, c, "awarding", "arc_committee", s.personId));
    }
    if (c.committeeOn) push(c.committeeOn, "Award approved by committee", `${c.id} · ${awardedVendors(c).map(vName).join(", ")}`, c, "awarding", "arc_awarded", "regional");
    if (c.sentOn) push(c.sentOn, "Contracts sent for signature", `${c.id} · waiting on ${awardedVendors(c).map(vName).join(", ")}`, c, "active", "arc_sent", "purchase");
    if (c.signedOn) push(c.signedOn, "Contract signed — live", `${c.id} · term ${c.termStart} → ${c.termEnd}`, c, "active", "arc_live", "purchase");
    if (c.closedOn) push(c.closedOn, "Closed without award", `${c.id} · ${c.closedReason}`, c, "overview", "arc_closed", "purchase");
    if (c.amendment) {
      push(c.amendment.requestedOn, "Amendment requested", `AMD-${c.amendment.id} · ${vName(c.amendment.vendor)} · ${c.id}`, c, "active", "arc_amendment", "purchase");
      c.amendment.chain.filter((s) => s.on).forEach((s) => push(s.on, "Amendment level approved", `AMD-${c.amendment.id} · ${peopleById[s.personId].name} approved`, c, "active", "arc_amendment", s.personId));
    }
    callOffsFor(c).forEach(({ po }) => push(po.raisedOn, "Call-off PO raised", `PO #${po.id} · ${c.id} · ${vName(po.vendorId)}`, c, "active", "arc_calloff", po.raisedBy));
    if (c.status === "expiring_soon") push("2026-08-01", "Contract expiring soon", `${c.id} ends ${c.termEnd} · ${daysFromToday(c.termEnd)} days left`, c, "active", "arc_expiring", null);
  });
  return ev.filter((e) => e.at <= new Date(`${DEMO_TODAY}T23:59:00+05:30`).toISOString()).sort((a, b) => (a.at < b.at ? 1 : -1));
};

const committeeAwardsLabel = (c) => `${awardedVendors(c).length} vendor${awardedVendors(c).length === 1 ? "" : "s"} · ₹${(committedValue(c) / 100000).toFixed(2)}L`;

/** Notification-worthy ARC events for a persona (contracts they can see), newest first. */
export const activityFor = (personaId) =>
  arcEvents()
    .filter((e) => visibleTo(contractsById[e.arcId], personaId))
    .map(({ at, title, message, link: l, kind }) => ({ at, title, message, link: l, kind }));

/* ── the register row other modules read ───────────────────────────────── */

const STAGE_OF = {
  contract_active: "active", expiring_soon: "expiring", draft: "draft", pending_publish_approval: "draft",
  tech_eval_in_progress: "tech-eval", comm_eval_in_progress: "comm-eval", committee_review: "committee",
  awaiting_vendor_acceptance: "awaiting", floated: "floated", submission_closed: "floated", closed_no_award: "ended",
};

export const otherContracts = portfolio.filter((c) => c.id !== contract.id).map((c) => ({
  id: c.id, title: c.title, category: c.category, propertyIds: c.propertyIds, stage: STAGE_OF[c.status] || c.status,
  status: c.status, termStart: c.termStart, termEnd: c.termEnd, value: estimatedValue(c),
}));

export const threadContractRow = {
  id: contract.id,
  title: contract.title,
  category: "Housekeeping supply",
  propertyIds: contract.propertyIds,
  stage: "active",
  status: "contract_active",
  termStart: contract.termStart,
  termEnd: contract.termEnd,
  value: committedValue(contractsById[contract.id]),
  live: true,
};

export const allContracts = [threadContractRow, ...otherContracts];
