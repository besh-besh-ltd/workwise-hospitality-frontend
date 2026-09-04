import { contract } from "./thread";

/**
 * Purchase orders awaiting approval.
 *
 * #108215 is the golden thread's call-off — the order that ARC-2627-0014
 * finally produces. The other four exist so the approver's queue is a real
 * queue: the AI has to rank and triage, not just describe one order.
 *
 * Every value here is computed from its lines rather than typed twice, so a
 * total can never disagree with the rows above it.
 */

/** Rates as awarded on the contract, after negotiation. */
export const awardedRates = {
  "twl-bath-500": { rate: 400, vendorId: "sriram", lastPoRate: 412, lastAwardRate: 438 },
  "twl-hand-500": { rate: 154, vendorId: "sriram", lastPoRate: 158, lastAwardRate: 168 },
  "bed-sheet-300": { rate: 1059, vendorId: "trident", lastPoRate: 1086, lastAwardRate: 1120 },
  "duvet-cover": { rate: 1386, vendorId: "trident", lastPoRate: 1421, lastAwardRate: 1465 },
  "bath-mat": { rate: 360, vendorId: "sriram", lastPoRate: 369, lastAwardRate: 392 },
  "bathrobe": { rate: 1082, vendorId: "sriram", lastPoRate: 1109, lastAwardRate: 1180 },
};

/** Quarterly call-off ceiling per line, written into the contract. */
export const callOffCap = {
  "twl-bath-500": 950,
  "twl-hand-500": 1200,
  "bed-sheet-300": 450,
  "duvet-cover": 350,
  "bath-mat": 600,
  "bathrobe": 200,
};

const LINES_108215 = [
  { itemId: "twl-bath-500", name: "Bath Towel 500 GSM", qty: 900 },
  { itemId: "twl-hand-500", name: "Hand Towel 500 GSM", qty: 1100 },
  // Over the 450 quarterly cap. This is the one thing on the order that a
  // human genuinely has to decide, and the memo has to find it.
  { itemId: "bed-sheet-300", name: "Bed Sheet 300 TC", qty: 500 },
  { itemId: "duvet-cover", name: "Duvet Cover 300 TC", qty: 300 },
  { itemId: "bath-mat", name: "Bath Mat 900 GSM", qty: 550 },
  { itemId: "bathrobe", name: "Bathrobe Waffle", qty: 158 },
];

const priceLines = (lines) =>
  lines.map((l) => {
    const a = awardedRates[l.itemId];
    return {
      ...l,
      rate: a.rate,
      value: a.rate * l.qty,
      vendorId: a.vendorId,
      lastPoRate: a.lastPoRate,
      lastAwardRate: a.lastAwardRate,
      vsLastAwardPct: Number((((a.rate - a.lastAwardRate) / a.lastAwardRate) * 100).toFixed(1)),
      cap: callOffCap[l.itemId],
      overCap: l.qty > callOffCap[l.itemId],
    };
  });

const sum = (lines) => lines.reduce((s, l) => s + l.value, 0);

const thread108215Lines = priceLines(LINES_108215);

export const purchaseOrders = [
  {
    id: "108215",
    ref: "PO #108215",
    title: "Housekeeping Linen — Q3 call-off",
    contractId: contract.id,
    propertyId: "ic-mumbai",
    vendorId: "sriram",
    raisedBy: "purchase",
    raisedOn: "2026-08-19",
    approverId: "finance",
    pendingDays: 7,
    status: "Pending approval",
    lines: thread108215Lines,
    value: sum(thread108215Lines),
    live: true,
    budget: { head: "Housekeeping — linen & amenities, FY 2026-27", allocated: 14200000, consumed: 5140000 },
    chain: [
      { personId: "purchase", role: "Raised", state: "done", on: "2026-08-19" },
      { personId: "housekeeping", role: "Requirement confirmed", state: "done", on: "2026-08-20" },
      { personId: "finance", role: "Financial approval", state: "pending", limit: 2500000 },
    ],
  },

  // ── the rest of the approver's queue ──
  {
    id: "108231",
    ref: "PO #108231",
    title: "Banquet crockery — replacement set",
    contractId: "ARC-2627-0011",
    propertyId: "ic-mumbai",
    vendorId: "welspun",
    raisedBy: "purchase",
    raisedOn: "2026-08-22",
    approverId: "finance",
    pendingDays: 4,
    status: "Pending approval",
    lines: [{ itemId: "crockery", name: "Banquet crockery, 12-piece", qty: 420, rate: 3058, value: 1284360, vsLastAwardPct: 2.1 }],
    value: 1284360,
    budget: { head: "F&B — operating equipment, FY 2026-27", allocated: 8600000, consumed: 6900000 },
    riskNote: "Rate is 2.1% above the last award and the budget head is 80% consumed.",
    chain: [
      { personId: "purchase", role: "Raised", state: "done", on: "2026-08-22" },
      { personId: "finance", role: "Financial approval", state: "pending", limit: 2500000 },
    ],
  },
  {
    id: "108244",
    ref: "PO #108244",
    title: "Bath towel top-up — second source",
    contractId: "ARC-2627-0011",
    propertyId: "ic-mumbai",
    // Nandan, not GreenLeaf: the AI approval queue calls this order clean on
    // every check and names the supplier, so the register has to name the same
    // one. Quantity × rate is set to the figure the triage row quotes.
    vendorId: "nandan",
    raisedBy: "purchase",
    raisedOn: "2026-08-26",
    approverId: "finance",
    pendingDays: 2,
    status: "Pending approval",
    lines: [{ itemId: "twl-bath-500", name: "Bath Towel 500 GSM", qty: 1554, rate: 384, value: 596736, vsLastAwardPct: -4.1 }],
    value: 596736,
    budget: { head: "Housekeeping — linen & amenities, FY 2026-27", allocated: 14200000, consumed: 5140000 },
    chain: [
      { personId: "purchase", role: "Raised", state: "done", on: "2026-08-26" },
      { personId: "finance", role: "Financial approval", state: "pending", limit: 2500000 },
    ],
  },
  {
    id: "108250",
    ref: "PO #108250",
    title: "Chiller AMC — quarterly instalment",
    contractId: "ARC-2627-0009",
    propertyId: "ic-mumbai",
    vendorId: "trident",
    raisedBy: "purchase",
    raisedOn: "2026-08-28",
    approverId: "finance",
    pendingDays: 1,
    status: "Pending approval",
    lines: [{ itemId: "amc", name: "Chiller AMC, Q3 instalment", qty: 1, rate: 1178972, value: 1178972, vsLastAwardPct: 0 }],
    value: 1178972,
    budget: { head: "Engineering — maintenance contracts, FY 2026-27", allocated: 21500000, consumed: 9800000 },
    chain: [
      { personId: "purchase", role: "Raised", state: "done", on: "2026-08-28" },
      { personId: "finance", role: "Financial approval", state: "pending", limit: 2500000 },
    ],
  },
  {
    id: "108258",
    ref: "PO #108258",
    title: "Spa therapy linen — top-up",
    contractId: null,
    propertyId: "ic-mumbai",
    vendorId: "aarvi",
    raisedBy: "purchase",
    raisedOn: "2026-08-30",
    approverId: "finance",
    pendingDays: 1,
    status: "Pending approval",
    lines: [{ itemId: "spa-linen", name: "Spa therapy linen set", qty: 1250, rate: 428, value: 535000, vsLastAwardPct: 6.8 }],
    value: 535000,
    budget: { head: "Housekeeping — linen & amenities, FY 2026-27", allocated: 14200000, consumed: 5140000 },
    riskNote:
      "Off-contract, and placed with the supplier whose OEKO-TEX certificate lapsed in March. Rate is 6.8% above the last award.",
    chain: [
      { personId: "purchase", role: "Raised", state: "done", on: "2026-08-30" },
      { personId: "finance", role: "Financial approval", state: "pending", limit: 2500000 },
    ],
  },
];

export const posById = Object.fromEntries(purchaseOrders.map((p) => [p.id, p]));
export const getPo = (id) => posById[id] || null;

/** Derived, never typed — the queue total always matches the rows in it. */
export const pendingPos = purchaseOrders.filter((p) => p.status === "Pending approval");
export const heldValue = pendingPos.reduce((s, p) => s + p.value, 0);

/**
 * Monthly PO value for the current financial year to date.
 * One measure, one series — the analytics screen plots it as a single hue.
 */
export const monthlySpend = [
  { month: "Apr", value: 8420000 },
  { month: "May", value: 9160000 },
  { month: "Jun", value: 7340000 },
  { month: "Jul", value: 11280000 },
  { month: "Aug", value: 14200000 },
  { month: "Sep", value: 5806588 },
];

/** Budget heads and how far through them the year is. */
export const budgetHeads = [
  { head: "Housekeeping — linen & amenities", allocated: 14200000, consumed: 5140000 },
  { head: "F&B — operating equipment", allocated: 8600000, consumed: 6900000 },
  { head: "Engineering — maintenance contracts", allocated: 21500000, consumed: 9800000 },
  { head: "Front Office — uniforms & supplies", allocated: 4300000, consumed: 1180000 },
];
