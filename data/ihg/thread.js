/**
 * The golden thread — the single procurement story the demo walks through.
 *
 * One category, five properties, seven stages. Every screen in the demo reads
 * its identifiers from here, so the reference numbers, values and dates agree
 * with each other wherever they appear. Later phases extend these objects
 * rather than inventing parallel data.
 *
 *   MR-2627-0881  raised at InterContinental Marine Drive
 *     → RFQ #535944       consolidated across 5 properties   (AI Vendor Match)
 *     → Negotiation R1                                        (AI Negotiator)
 *     → ARC-2627-0014     rate contract, technical evaluation (AI Tech Eval)
 *     → PO #108215        call-off against the contract       (AI Triage + Memo)
 */

export const CATEGORY = "Housekeeping Linen & Amenities";
export const FY = "FY 2026-27";

/** The line items the whole story is about. Rates are per unit, in rupees. */
export const lineItems = [
  { id: "twl-bath-500", name: "Bath Towel 500 GSM", uom: "pc", spec: "70×140 cm · 100% cotton · ring-spun", annualQty: 11600, lastRate: 438 },
  { id: "twl-hand-500", name: "Hand Towel 500 GSM", uom: "pc", spec: "40×60 cm · 100% cotton", annualQty: 14200, lastRate: 168 },
  { id: "bed-sheet-300", name: "Bed Sheet 300 TC", uom: "pc", spec: "275×275 cm · sateen · white", annualQty: 9600, lastRate: 1120 },
  { id: "duvet-cover", name: "Duvet Cover 300 TC", uom: "pc", spec: "225×245 cm · percale", annualQty: 6200, lastRate: 1465 },
  { id: "pillow-cover", name: "Pillow Cover 300 TC", uom: "pc", spec: "50×75 cm · sateen", annualQty: 17900, lastRate: 236 },
  { id: "bath-mat", name: "Bath Mat 900 GSM", uom: "pc", spec: "50×80 cm · anti-skid backing", annualQty: 7100, lastRate: 392 },
  { id: "bathrobe", name: "Bathrobe Waffle", uom: "pc", spec: "Unisex · 400 GSM · embroidered", annualQty: 2600, lastRate: 1180 },
  { id: "amenity-kit", name: "Guest Amenity Kit", uom: "set", spec: "6-piece · paraben-free · FSC carton", annualQty: 60500, lastRate: 148 },
];

/** Per-property split of the consolidated demand. Sums to the annual quantities. */
export const demandSplit = {
  "ic-mumbai": 0.31,
  "cp-noida": 0.24,
  "hie-blr": 0.2,
  "voco-corb": 0.14,
  "ss-barwara": 0.11,
};

export const mr = {
  id: "MR-2627-0881",
  title: `${CATEGORY} — annual indent`,
  propertyId: "ic-mumbai",
  department: "Housekeeping",
  raisedBy: "housekeeping",
  raisedOn: "2026-05-18",
  lineCount: 8,
  urgency: "Planned",
  status: "Converted to RFQ",
  note: "Annual replenishment indent. Par stock at 3.2 turns; current linen at 14 months against a 12-month rotation.",
};

export const rfq = {
  id: "535944",
  ref: "RFQ #535944",
  title: `${CATEGORY} — ${FY}`,
  propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"],
  department: "Housekeeping",
  ownerId: "purchase",
  createdOn: "2026-05-28",
  publishedOn: "2026-06-01",
  // Deliberately in the FUTURE. An RFQ can be open and already have quotes in
  // — that is exactly the state you negotiate from. With a past deadline the
  // app marks it closed and the whole thread becomes read-only.
  closesOn: "2026-09-30",
  status: "Quotes received",
  invited: 9,
  quoted: 6,
  estimatedValue: 46331000,
};

export const negotiation = {
  id: "NEG-535944-R1",
  rfqId: "535944",
  round: 1,
  status: "Draft",
  priorRounds: 23,
  vendorsSelected: 5,
  openedOn: "2026-07-02",
};

export const contract = {
  id: "ARC-2627-0014",
  ref: "ARC-2627-0014",
  title: `${CATEGORY} — ${FY}`,
  propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"],
  category: "Housekeeping supply",
  ownerId: "purchase",
  approverId: "regional",
  termStart: "2026-07-01",
  termEnd: "2027-03-31",
  value: 46331000,
  stage: "tech-eval",
  stages: [
    { key: "window", label: "Window closed", state: "done" },
    { key: "tech-eval", label: "Technical evaluation", state: "current", hint: "Scoring in progress" },
    { key: "commercial", label: "Commercial", state: "locked" },
    { key: "award", label: "Awarding", state: "locked" },
    { key: "active", label: "Contract active", state: "locked" },
  ],
  evidenceDocs: 19,
  clauses: 5,
  vendorsUnderEvaluation: 5,
  vendorsOnHold: 3,
  minimumScore: 70,
};

export const po = {
  id: "108215",
  ref: "PO #108215",
  contractId: "ARC-2627-0014",
  propertyId: "ic-mumbai",
  status: "Pending approval",
  raisedBy: "purchase",
  raisedOn: "2026-08-19",
  approverId: "finance",
  value: 1843656,   // = sum of its lines in orders.js
  lineCount: 6,
  pendingDays: 7,
};

/** Headline numbers for the dashboard. Group-wide figures. */
export const groupStats = {
  activeContracts: 14,
  contractsExpiring90d: 3,
  openRfqs: 7,
  negotiationsLive: 2,
  posAwaitingApproval: 5,
  // posHeldValue is derived — import `heldValue` from orders.js instead of
  // typing it here, so the tile always matches the queue underneath it.
  mtdPoValue: 14200000,
  mtdDeltaPct: 18,
  savingsYtd: 8940000,
  savingsTargetPct: 6.5,
  savingsActualPct: 8.1,
};

export default { CATEGORY, FY, lineItems, mr, rfq, negotiation, contract, po, groupStats };
