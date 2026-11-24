import { CATEGORY, FY, lineItems, rfq as threadRfq, negotiation as threadNeg, contract as threadContract } from "./thread";
import { quotesByVendor } from "./quotes";
import { vendorsById, vendorNumericIdOf } from "./vendors";
import { itRfq, itLineItems, itVendors } from "./itRfq";
import { awardedRates } from "./orders";
import { peopleById, propertiesById } from "./org";

/**
 * The RFQ book — every RFQ on the sourcing desk, at every stage, with the
 * negotiation rounds, approvals and vendor queries behind it.
 *
 * Demo today is Fri 14 Aug 2026. Every count here is derived from the rows:
 * invited/quoted are the lengths of the vendor lists, a round's saving is the
 * sum of its lines, and the approvals waiting on a persona are the RFQs whose
 * `approval.approverId` is that persona.
 *
 * APPROVAL RULES (what decides who an approval waits on):
 *   RFQ (publish)        raised by a property buyer → Ananya up to ₹25L, Sameer above.
 *                        Raised by Ananya → Sameer above ₹25L, otherwise auto-published.
 *   NEGOTIATION (round)  Sameer when the RFQ is above ₹25L; Ananya when a property
 *                        buyer drafted the round on a smaller RFQ.
 *   NEGOTIATION_QUOTE    award approval: Karan up to ₹25L on Workwise Grand RFQs,
 *   (award)              Sameer for everything else.
 *   TECHNICAL            the requesting department's head: Rohan for Workwise Grand
 *                        housekeeping, Sameer for group and IT RFQs.
 */

export const DEMO_TODAY = "2026-08-14";
const DAY = 86400000;
export const daysFrom = (d) => Math.round((new Date(`${d}T00:00:00Z`) - new Date(`${DEMO_TODAY}T00:00:00Z`)) / DAY);
const hoursSince = (d) => Math.max(1, -daysFrom(d) * 24 + 6);

/** RFQ status keys are the register's own vocabulary (RfqListPage STATUS_META). */
export const STAGE_LABEL = {
  DRAFT: "Draft",
  RFQ_APPROVAL: "Awaiting publish approval",
  AWAITING_QUOTES: "Open — responses arriving",
  COMMERCIAL_EVALUATION: "Quotes received",
  TECHNICAL_EVALUATING: "Technical evaluation",
  TECHNICAL_APPROVING: "Technical approval",
  NEGOTIATION_ONGOING: "Under negotiation",
  QUOTATION_APPROVAL: "Award approval",
  AWAITING_PO: "Awarded — awaiting PO",
  PO_APPROVAL: "Awarded — PO in approval",
  APPROVED_COMPLETED: "Awarded",
  RFQ_STUCK_COMMERCIAL: "Closed — no quotes",
  CLOSED: "Closed — not awarded",
};

/** Property buyers (non-login staff) who raise RFQs at a single hotel. */
export const BUYERS = {
  devika: { name: "Devika Iyer", title: "Purchase Executive, Workwise Grand" },
  arjun: { name: "Arjun Malhotra", title: "Purchase Executive, Metro Greater Noida" },
  meera: { name: "Meera Shekhawat", title: "Purchase Executive, Fort Barwara" },
};
export const actorName = (id) => peopleById[id]?.name || BUYERS[id]?.name || "Ananya Rao";

/* ── products for the RFQs beyond the thread and the IT RFQ ─────────────────
   [name, uom, qty, lastRate] */
const P = {
  "535912": [["Banquet crockery, 12-piece", "set", 1400, 4200], ["Wine glassware set", "set", 900, 2600], ["Buffet chafing dish", "pc", 160, 9800]],
  "535903": [["Minibar soft drinks (case of 24)", "case", 5200, 640], ["Premium snack assortment", "box", 8400, 310], ["Bottled water 500ml (case of 24)", "case", 6100, 210]],
  "535887": [["Kitchen exhaust duct cleaning", "visit", 48, 46000], ["Grease trap service", "visit", 96, 8200]],
  "535961": [["Spa therapy linen set", "set", 1800, 1450], ["Aroma oil assortment", "litre", 520, 2100], ["Disposable slippers", "pair", 26000, 38]],
  "535958": [["Front office blazer", "pc", 640, 5200], ["F&B service shirt", "pc", 2400, 980], ["Chef jacket", "pc", 1300, 1450]],
  "535874": [["Chiller annual maintenance", "year", 3, 5400000], ["Cooling tower service", "year", 3, 1650000]],
  "535893": [["Floor cleaner concentrate", "litre", 9600, 210], ["Toilet bowl cleaner", "litre", 7200, 165], ["Glass cleaner", "litre", 4800, 140], ["Dosing system rental", "unit-month", 432, 3200]],
  "535921": [["Guest linen laundering", "kg", 186000, 38], ["F&B linen laundering", "kg", 64000, 42], ["Uniform laundering", "pc", 52000, 28]],
  "535928": [["Pool towel 600 GSM", "pc", 2400, 520], ["Spa towel 550 GSM", "pc", 1600, 470], ["Spa robe 400 GSM", "pc", 300, 1450]],
  "535936": [["Banquet table cloth 90×90", "pc", 1800, 410], ["Banquet napkin 50×50", "pc", 6000, 92], ["Table skirting 6 m", "pc", 240, 1650]],
  "535949": [["Breakfast bread assortment", "kg", 9600, 145], ["Croissant & viennoiserie", "dozen", 4200, 360], ["Cake & dessert base", "kg", 1800, 520]],
  "535919": [["Commercial blender 2 L", "unit", 18, 38000], ["Induction cooktop 3.5 kW", "unit", 24, 26000], ["Food processor", "unit", 12, 42000]],
  "535966": [["Front office blazer (new intake)", "pc", 120, 5200], ["Front office trousers", "pc", 120, 1900], ["Name badge & lanyard", "set", 120, 350]],
  "535953": [["In-room electronic safe", "unit", 48, 12500], ["Installation & mounting", "unit", 48, 1600]],
  "535972": [["LED downlight 12 W retrofit", "unit", 6400, 640], ["LED tube 18 W", "unit", 3800, 310], ["Lighting controls & sensors", "lot", 2, 650000]],
  "535978": [["Housekeeping linen trolley", "unit", 60, 21000], ["Room attendant cart", "unit", 90, 9500]],
  "535983": [["Rice & grains", "kg", 8200, 92], ["Pulses", "kg", 4100, 118], ["Edible oil", "litre", 3600, 165]],
  "535989": [["In-room dining trolley", "unit", 24, 28000], ["Hot box insert", "unit", 24, 11500]],
  "535915": [["Landscaping & horticulture AMC", "year", 1, 1200000]],
  "535898": [["Mattress protector, king", "pc", 300, 1350], ["Mattress protector, twin", "pc", 160, 980]],
};

/**
 * One RFQ per row. `invited` / `quoted` are vendor slugs — the counts shown
 * anywhere are their lengths, so a register row can never claim a quote that
 * the comparison does not have.
 */
const RAW = [
  // ── drafts ──
  { id: "535989", title: "In-room Dining Trolleys — Workwise Grand", department: "Food & Beverage", category: "F&B operating equipment", propertyIds: ["ic-mumbai"], raisedBy: "purchase", createdOn: "2026-08-13", statusKey: "DRAFT", invited: [], quoted: [] },
  { id: "535983", title: "Dry Store Provisions — Corbett & Barwara (Q3)", department: "Food & Beverage", category: "F&B supply", propertyIds: ["voco-corb", "ss-barwara"], raisedBy: "purchase", createdOn: "2026-08-12", statusKey: "DRAFT", invited: [], quoted: [] },
  { id: "535978", title: "Linen Trolleys & Room Attendant Carts", department: "Housekeeping", category: "Housekeeping equipment", propertyIds: ["ic-mumbai", "cp-noida", "hie-blr"], raisedBy: "purchase", createdOn: "2026-08-10", statusKey: "DRAFT", invited: [], quoted: [] },

  // ── awaiting publish approval ──
  { id: "535966", title: "Front Office Uniforms — new intake, Workwise Grand", department: "Front Office", category: "Uniforms", propertyIds: ["ic-mumbai"], raisedBy: "devika", createdOn: "2026-08-12", statusKey: "RFQ_APPROVAL", mrId: "MR-2627-0931", invited: ["stitchline", "orientcraft", "kaveri"], quoted: [], closesOn: "2026-09-04", approval: { type: "RFQ", approverId: "purchase", since: "2026-08-12" } },
  { id: "535953", title: "Guest Room Safes — Fort Barwara", department: "Front Office", category: "Guest room equipment", propertyIds: ["ss-barwara"], raisedBy: "meera", createdOn: "2026-08-11", statusKey: "RFQ_APPROVAL", invited: ["hotelware", "clayfire"], quoted: [], closesOn: "2026-09-01", approval: { type: "RFQ", approverId: "purchase", since: "2026-08-11" } },
  { id: "535972", title: "LED Retrofit — Workwise Grand & Metro Greater Noida", department: "Engineering", category: "Engineering services", propertyIds: ["ic-mumbai", "cp-noida"], raisedBy: "purchase", createdOn: "2026-08-10", statusKey: "RFQ_APPROVAL", invited: ["aerotherm", "ductpro", "trident"], quoted: [], closesOn: "2026-09-10", approval: { type: "RFQ", approverId: "regional", since: "2026-08-10" } },

  // ── open, responses arriving ──
  { id: "535961", title: "Spa Consumables & Therapy Linen", department: "Housekeeping", category: "Housekeeping supply", propertyIds: ["ss-barwara", "voco-corb"], raisedBy: "purchase", createdOn: "2026-07-22", publishedOn: "2026-07-24", closesOn: "2026-08-16", statusKey: "AWAITING_QUOTES", mrId: "MR-2627-0918", invited: ["aarvi", "sriram", "greenleaf", "nandan", "welspun", "kaveri"], quoted: ["aarvi", "sriram"] },
  { id: "535958", title: "Uniform Refresh — Front Office & F&B", department: "Front Office", category: "Uniforms", propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"], raisedBy: "purchase", createdOn: "2026-07-27", publishedOn: "2026-07-30", closesOn: "2026-08-21", statusKey: "AWAITING_QUOTES", invited: ["stitchline", "orientcraft", "nandan", "kaveri", "welspun"], quoted: ["stitchline", "orientcraft", "welspun"], arcId: "ARC-2627-0016" },

  // ── quotes received ──
  { id: "535893", title: "Housekeeping Chemicals & Dosing — FY 2026-27 renewal", department: "Housekeeping", category: "Housekeeping supply", propertyIds: ["ic-mumbai", "cp-noida", "hie-blr"], raisedBy: "purchase", createdOn: "2026-07-10", publishedOn: "2026-07-13", closesOn: "2026-08-07", statusKey: "NEGOTIATION_ONGOING", invited: ["chemclean", "greenleaf", "aarvi", "kaveri"], quoted: ["chemclean", "greenleaf", "aarvi"], renews: "ARC-2526-0088" },

  // ── technical evaluation ──
  { id: "535970", it: true },
  { id: "535921", title: "Laundry Outsourcing — Bengaluru cluster renewal", department: "Housekeeping", category: "Housekeeping services", propertyIds: ["hie-blr"], raisedBy: "purchase", createdOn: "2026-07-03", publishedOn: "2026-07-06", closesOn: "2026-08-03", statusKey: "TECHNICAL_APPROVING", invited: ["washwell", "chemclean", "greenleaf"], quoted: ["washwell", "chemclean"], renews: "ARC-2526-0071", approval: { type: "TECHNICAL", approverId: "regional", since: "2026-08-12" } },
  { id: "535928", title: "Pool & Spa Towels — Workwise Grand", department: "Housekeeping", category: "Housekeeping supply", propertyIds: ["ic-mumbai"], raisedBy: "devika", createdOn: "2026-07-15", publishedOn: "2026-07-17", closesOn: "2026-08-05", statusKey: "TECHNICAL_APPROVING", invited: ["sriram", "nandan", "welspun", "aarvi"], quoted: ["sriram", "nandan", "welspun"], approval: { type: "TECHNICAL", approverId: "housekeeping", since: "2026-08-13" } },

  // ── under negotiation ──
  { id: "535903", title: "Guest Room Minibar Replenishment — H2", department: "Food & Beverage", category: "F&B supply", propertyIds: ["ic-mumbai", "voco-corb", "ss-barwara"], raisedBy: "purchase", createdOn: "2026-07-06", publishedOn: "2026-07-08", closesOn: "2026-07-24", statusKey: "NEGOTIATION_ONGOING", invited: ["coolcellar", "snackcraft", "greenleaf", "hotelware"], quoted: ["coolcellar", "snackcraft", "greenleaf"] },
  { id: "535919", title: "Kitchen Small Equipment — Metro Greater Noida", department: "Food & Beverage", category: "F&B operating equipment", propertyIds: ["cp-noida"], raisedBy: "arjun", createdOn: "2026-07-08", publishedOn: "2026-07-10", closesOn: "2026-07-31", statusKey: "NEGOTIATION_ONGOING", invited: ["hotelware", "clayfire", "aerotherm"], quoted: ["hotelware", "clayfire"] },

  // ── finalised, award approval ──
  { id: "535936", title: "Banquet Table Linen — Workwise Grand", department: "Food & Beverage", category: "F&B linen", propertyIds: ["ic-mumbai"], raisedBy: "purchase", createdOn: "2026-06-22", publishedOn: "2026-06-24", closesOn: "2026-07-15", statusKey: "QUOTATION_APPROVAL", invited: ["welspun", "trident", "kaveri", "orientcraft"], quoted: ["welspun", "trident", "kaveri"], finalisedOn: "2026-08-12", approval: { type: "NEGOTIATION_QUOTE", approverId: "finance", since: "2026-08-12" } },
  { id: "535949", title: "Fresh Bakery Supplies — Noida & Whitefield (H2)", department: "Food & Beverage", category: "F&B supply", propertyIds: ["cp-noida", "hie-blr"], raisedBy: "purchase", createdOn: "2026-06-29", publishedOn: "2026-07-01", closesOn: "2026-07-20", statusKey: "QUOTATION_APPROVAL", invited: ["bakersguild", "snackcraft", "coolcellar"], quoted: ["bakersguild", "snackcraft"], finalisedOn: "2026-08-11", approval: { type: "NEGOTIATION_QUOTE", approverId: "regional", since: "2026-08-11" } },

  // ── awarded ──
  { id: "535944", thread: true },
  { id: "535912", title: "Banquet Crockery & Glassware — FY 2026-27", department: "Food & Beverage", category: "F&B operating equipment", propertyIds: ["ic-mumbai", "cp-noida"], raisedBy: "purchase", createdOn: "2026-04-20", publishedOn: "2026-04-24", closesOn: "2026-05-12", statusKey: "APPROVED_COMPLETED", invited: ["hotelware", "clayfire", "welspun", "orientcraft", "greenleaf", "kaveri", "aarvi"], quoted: ["hotelware", "clayfire", "welspun", "orientcraft", "greenleaf"], arcId: "ARC-2627-0011", poIds: ["108147", "108203"], awardedTo: ["hotelware"], awardedValue: 12100000, finalisedOn: "2026-05-22" },
  { id: "535874", title: "Chiller AMC — 3 year", department: "Engineering", category: "Engineering services", propertyIds: ["ic-mumbai"], raisedBy: "purchase", createdOn: "2026-04-06", publishedOn: "2026-04-08", closesOn: "2026-04-22", statusKey: "APPROVED_COMPLETED", invited: ["aerotherm", "ductpro", "trident", "welspun"], quoted: ["aerotherm", "ductpro", "trident", "welspun"], arcId: "ARC-2627-0009", poIds: ["108152"], awardedTo: ["aerotherm"], awardedValue: 21500000, finalisedOn: "2026-04-28" },
  { id: "535887", title: "Kitchen Exhaust Deep Clean — annual", department: "Engineering", category: "Engineering services", propertyIds: ["cp-noida", "hie-blr"], raisedBy: "purchase", createdOn: "2026-04-14", publishedOn: "2026-04-16", closesOn: "2026-05-05", statusKey: "APPROVED_COMPLETED", poIds: ["108139", "108184"], invited: ["ductpro", "aerotherm", "trident", "solapur", "chemclean"], quoted: ["ductpro", "aerotherm", "chemclean"], awardedTo: ["ductpro"], awardedValue: 2994000, finalisedOn: "2026-05-15" },

  // ── closed ──
  { id: "535898", title: "Mattress Protectors — City Express Whitefield", department: "Housekeeping", category: "Housekeeping supply", propertyIds: ["hie-blr"], raisedBy: "purchase", createdOn: "2026-07-01", publishedOn: "2026-07-03", closesOn: "2026-07-31", statusKey: "RFQ_STUCK_COMMERCIAL", invited: ["kaveri", "orientcraft", "solapur", "aarvi"], quoted: [], closeNote: "No supplier quoted by the deadline — two declined on the 30-day lead time. Re-floating with a 45-day window." },
  { id: "535915", title: "Landscaping & Horticulture AMC — Fort Barwara", department: "Engineering", category: "Engineering services", propertyIds: ["ss-barwara"], raisedBy: "meera", createdOn: "2026-05-04", publishedOn: "2026-05-06", closesOn: "2026-05-27", statusKey: "CLOSED", invited: ["ductpro", "aerotherm", "greenleaf"], quoted: ["ductpro", "greenleaf"], closeNote: "Both quotes came in 31% over budget. Closed without award; scope reduced and re-tendered next quarter." },
];

const THREAD_CLOSED_ON = "2026-06-30";

/** Thread and IT RFQ projected into the book from their own fixtures. */
const threadRow = () => ({
  id: threadRfq.id,
  title: threadRfq.title,
  department: threadRfq.department,
  category: CATEGORY,
  propertyIds: threadRfq.propertyIds,
  raisedBy: threadRfq.ownerId,
  createdOn: threadRfq.createdOn,
  publishedOn: threadRfq.publishedOn,
  // The bid window closed once the six responses were in; the thread's own
  // `closesOn` is kept future only for the stand screens that read it.
  closesOn: THREAD_CLOSED_ON,
  statusKey: "PO_APPROVAL",
  mrId: "MR-2627-0881",
  // Nine invited (thread.rfq.invited), six quoted (quotes.js).
  invited: ["sriram", "welspun", "trident", "aarvi", "nandan", "greenleaf", "kaveri", "orientcraft", "solapur"],
  quoted: Object.keys(quotesByVendor),
  arcId: threadContract.id,
  poIds: ["108231"],
  finalisedOn: "2026-07-13",
  live: true,
  thread: true,
});

const itRow = () => ({
  id: itRfq.id,
  title: itRfq.title,
  department: itRfq.department,
  category: "IT infrastructure",
  propertyIds: itRfq.propertyIds,
  raisedBy: itRfq.ownerId,
  createdOn: "2026-07-14",
  publishedOn: "2026-07-20",
  closesOn: itRfq.closesOn,
  statusKey: "TECHNICAL_EVALUATING",
  invited: itVendors.map((v) => v.id),
  quoted: itVendors.map((v) => v.id),
  live: true,
  it: true,
});

const valueOf = (r) => (P[r.id] || []).reduce((s, [, , qty, rate]) => s + qty * rate, 0);

export const rfqBook = RAW.map((r) => {
  if (r.thread) return { ...threadRow(), value: threadRfq.estimatedValue, products: lineItems.map((i) => i.name) };
  if (r.it) return { ...itRow(), value: itRfq.estimatedValue, products: itLineItems.map((i) => i.name) };
  return { publishedOn: null, closesOn: null, ...r, value: valueOf(r), products: (P[r.id] || []).map((p) => p[0]) };
});

export const rfqBookById = Object.fromEntries(rfqBook.map((r) => [r.id, r]));
export const bookProducts = (id) =>
  (P[id] || []).map(([name, uom, qty, lastRate], i) => ({ id: Number(String(id).slice(-3)) * 100 + i + 1, name, uom, qty, lastRate }));

export const vendorName = (slug) =>
  vendorsById[slug]?.name || itVendors.find((v) => v.id === slug)?.name || slug;
export const vendorIdOf = (slug) => {
  const it = itVendors.findIndex((v) => v.id === slug);
  return it >= 0 ? 7301 + it : vendorNumericIdOf(slug);
};

/* ── negotiation rounds ─────────────────────────────────────────────────── */

// The thread's round: NEG-535944-R1. Five suppliers taken into it (Aarvi was
// left out on its compliance flag); every one answered. Revised rates are the
// ones awarded into ARC-2627-0014 (orders.js awardedRates) where they won.
const THREAD_REVISED = {
  sriram: { "twl-bath-500": 400, "twl-hand-500": 154, "bath-mat": 360, bathrobe: 1082 },
  nandan: { "twl-bath-500": 413, "twl-hand-500": 158, "bath-mat": 368 },
  trident: { "twl-bath-500": 418, "twl-hand-500": 158, "bed-sheet-300": 1059, "duvet-cover": 1386, "pillow-cover": 224, "bath-mat": 371 },
  welspun: { "twl-bath-500": 432, "twl-hand-500": 166, "bed-sheet-300": 1102, "duvet-cover": 1441, "pillow-cover": 233, "bath-mat": 386, bathrobe: 1162 },
  greenleaf: { "amenity-kit": 141 },
};

/** The award on #535944, line by line — the rates ARC-2627-0014 carries. */
export const threadAward = lineItems.map((item, idx) => {
  const fromPo = awardedRates[item.id];
  const vendor = fromPo?.vendorId || (item.id === "pillow-cover" ? "trident" : "greenleaf");
  return { productId: idx + 1, itemId: item.id, name: item.name, qty: item.annualQty, vendor, rate: THREAD_REVISED[vendor][item.id], quoted: quotesByVendor[vendor].lines.find((l) => l.itemId === item.id).rate, lastRate: item.lastRate };
});
export const threadAwardValue = threadAward.reduce((s, l) => s + l.rate * l.qty, 0);

const threadRoundLines = () =>
  Object.entries(THREAD_REVISED).flatMap(([slug, rates]) =>
    quotesByVendor[slug].lines.map((l) => {
      const item = lineItems.find((i) => i.id === l.itemId);
      return {
        productId: lineItems.indexOf(item) + 1, product: item.name, uom: item.uom, qty: item.annualQty,
        vendor: slug, baseline: l.rate, target: Math.round(l.rate * 0.96), achieved: rates[l.itemId] ?? l.rate,
      };
    })
  );

/** Generic lines for the other RFQs: each quoted vendor, each product, a revision factor. */
const linesFor = (rfqId, vendorsFactors, targetPct = 5) =>
  bookProducts(rfqId).flatMap((p, pi) =>
    Object.entries(vendorsFactors).map(([slug, [quoteF, reviseF]], vi) => {
      const baseline = Math.round(p.lastRate * quoteF * (1 + ((pi + vi) % 3) * 0.01));
      return { productId: p.id, product: p.name, uom: p.uom, qty: p.qty, vendor: slug, baseline, target: Math.round(baseline * (1 - targetPct / 100)), achieved: reviseF == null ? null : Math.round(baseline * reviseF) };
    })
  );

/**
 * Every round on every RFQ. `status` is the raw column, `state` the derived
 * seven-state key the negotiation screens read.
 */
export const negotiationRounds = [
  { id: 94401, ref: threadNeg.id, rfqId: "535944", n: 1, status: "COMPLETED", state: "concluded", createdBy: "purchase", createdOn: threadNeg.openedOn, approvedOn: "2026-07-03", approverId: "regional", endOn: "2026-07-09", closedOn: "2026-07-10", lines: threadRoundLines() },
  { id: 91201, ref: "NEG-535912-R1", rfqId: "535912", n: 1, status: "COMPLETED", state: "concluded", createdBy: "purchase", createdOn: "2026-05-14", approvedOn: "2026-05-14", approverId: "regional", endOn: "2026-05-19", closedOn: "2026-05-20", lines: linesFor("535912", { hotelware: [0.97, 0.94], clayfire: [0.99, 0.96], welspun: [1.04, 1.0] }) },
  { id: 87401, ref: "NEG-535874-R1", rfqId: "535874", n: 1, status: "COMPLETED", state: "concluded", createdBy: "purchase", createdOn: "2026-04-23", approvedOn: "2026-04-23", approverId: "regional", endOn: "2026-04-26", closedOn: "2026-04-27", lines: linesFor("535874", { aerotherm: [1.02, 1.0], ductpro: [1.06, 1.03] }) },
  { id: 88701, ref: "NEG-535887-R1", rfqId: "535887", n: 1, status: "COMPLETED", state: "concluded", createdBy: "purchase", createdOn: "2026-05-07", approvedOn: "2026-05-07", approverId: "purchase", endOn: "2026-05-12", closedOn: "2026-05-13", lines: linesFor("535887", { ductpro: [0.99, 0.96], aerotherm: [1.05, 1.02] }) },
  { id: 90301, ref: "NEG-535903-R1", rfqId: "535903", n: 1, status: "COMPLETED", state: "concluded", createdBy: "purchase", createdOn: "2026-07-27", approvedOn: "2026-07-27", approverId: "regional", endOn: "2026-08-01", closedOn: "2026-08-03", lines: linesFor("535903", { coolcellar: [1.03, 0.99], snackcraft: [1.05, 1.02], greenleaf: [1.01, 1.0] }) },
  // Open with vendors right now — closes Tue 18 Aug.
  { id: 90302, ref: "NEG-535903-R2", rfqId: "535903", n: 2, status: "ACTIVE", state: "open_with_vendors", createdBy: "purchase", createdOn: "2026-08-10", approvedOn: "2026-08-11", approverId: "regional", endOn: "2026-08-18", lines: linesFor("535903", { coolcellar: [0.99, 0.97], snackcraft: [1.02, null] }, 4) },
  { id: 93601, ref: "NEG-535936-R1", rfqId: "535936", n: 1, status: "COMPLETED", state: "concluded", createdBy: "purchase", createdOn: "2026-07-20", approvedOn: "2026-07-20", approverId: "purchase", endOn: "2026-07-27", closedOn: "2026-07-28", lines: linesFor("535936", { welspun: [1.0, 0.95], trident: [0.98, 0.95], kaveri: [1.03, 1.01] }) },
  { id: 94901, ref: "NEG-535949-R1", rfqId: "535949", n: 1, status: "COMPLETED", state: "concluded", createdBy: "purchase", createdOn: "2026-07-24", approvedOn: "2026-07-24", approverId: "regional", endOn: "2026-07-31", closedOn: "2026-08-03", lines: linesFor("535949", { bakersguild: [1.0, 0.96], snackcraft: [1.04, 1.01] }) },
  // Waiting on approval before vendors see them.
  { id: 89301, ref: "NEG-535893-R1", rfqId: "535893", n: 1, status: "PENDING_APPROVAL", state: "awaiting_approval", createdBy: "purchase", createdOn: "2026-08-12", approverId: "regional", endOn: "2026-08-20", lines: linesFor("535893", { chemclean: [1.02, null], greenleaf: [0.99, null], aarvi: [1.06, null] }, 6) },
  { id: 91901, ref: "NEG-535919-R1", rfqId: "535919", n: 1, status: "PENDING_APPROVAL", state: "awaiting_approval", createdBy: "arjun", createdOn: "2026-08-13", approverId: "purchase", endOn: "2026-08-21", lines: linesFor("535919", { hotelware: [1.01, null], clayfire: [1.04, null] }, 5) },
];

/**
 * Rate-contract negotiation rounds — the commercial stage of an ARC. Keyed to
 * contracts in data/ihg/contracts.js (read, never edited).
 */
export const arcNegotiationRounds = [
  { id: 81101, ref: "NEG-ARC-2627-0011-R1", arcId: "ARC-2627-0011", n: 1, status: "COMPLETED", state: "concluded", createdBy: "purchase", createdOn: "2026-05-21", approverId: "regional", approvedOn: "2026-05-21", endOn: "2026-05-26", closedOn: "2026-05-27", title: "Banquet Crockery & Glassware — FY 2026-27", propertyIds: ["ic-mumbai", "cp-noida"], department: "Food & Beverage", lines: linesFor("535912", { hotelware: [0.95, 0.93] }, 3) },
  { id: 80901, ref: "NEG-ARC-2627-0009-R1", arcId: "ARC-2627-0009", n: 1, status: "COMPLETED", state: "concluded", createdBy: "purchase", createdOn: "2026-04-27", approverId: "regional", approvedOn: "2026-04-27", endOn: "2026-04-29", closedOn: "2026-04-30", title: "Chiller Maintenance — 3 year AMC", propertyIds: ["ic-mumbai"], department: "Engineering", lines: linesFor("535874", { aerotherm: [1.0, 0.99] }, 2) },
];

export const roundById = (id) =>
  [...negotiationRounds, ...arcNegotiationRounds].find((r) => String(r.id) === String(id)) || null;

/** Saving of one line: only a line the vendor answered can have moved. */
const lineSaved = (l) => (l.achieved == null ? 0 : (l.baseline - l.achieved) * l.qty);
export const roundTotals = (round) => {
  const baseline = round.lines.reduce((s, l) => s + l.baseline * l.qty, 0);
  const saved = round.lines.reduce((s, l) => s + lineSaved(l), 0);
  return { baseline, saved, achieved: baseline - saved, pct: baseline ? (saved / baseline) * 100 : 0 };
};

/** Awarded vendors per RFQ — whose saving counts as "on awarded vendors". */
export const awardedVendorsOf = (rfqId) => {
  if (rfqId === threadRfq.id) return Array.from(new Set(threadAward.map((l) => l.vendor)));
  const r = rfqBookById[rfqId];
  if (r?.awardedTo) return r.awardedTo;
  // Finalised, awaiting approval: the lowest revised vendor of the last concluded round.
  const last = negotiationRounds.filter((x) => x.rfqId === rfqId && x.state === "concluded").pop();
  if (!last || !["QUOTATION_APPROVAL"].includes(r?.statusKey)) return [];
  const byV = {};
  last.lines.forEach((l) => { byV[l.vendor] = (byV[l.vendor] || 0) + (l.achieved ?? l.baseline) * l.qty; });
  return [Object.entries(byV).sort((a, b) => a[1] - b[1])[0][0]];
};

/**
 * Negotiation savings, from the round results — for the dashboard's
 * "Negotiation savings" widget. RFQ rounds only (rate contracts track theirs on
 * the contract), concluded and open rounds both count what vendors revised.
 */
export const negotiationSavings = () => {
  const byRfq = {};
  negotiationRounds.forEach((round) => {
    const t = roundTotals(round);
    const awarded = awardedVendorsOf(round.rfqId);
    const awardedSaved = round.lines.filter((l) => awarded.includes(l.vendor)).reduce((s, l) => s + lineSaved(l), 0);
    const cur = byRfq[round.rfqId] || { rfqId: round.rfqId, title: rfqBookById[round.rfqId]?.title, rounds: 0, baseline: 0, saved: 0, awardedSaved: 0 };
    cur.rounds += 1;
    cur.baseline += t.baseline;
    cur.saved += t.saved;
    cur.awardedSaved += awardedSaved;
    byRfq[round.rfqId] = cur;
  });
  const rows = Object.values(byRfq).map((r) => ({ ...r, pct: r.baseline ? Number(((r.saved / r.baseline) * 100).toFixed(1)) : 0 }));
  const total = rows.reduce((s, r) => s + r.saved, 0);
  const baseline = rows.reduce((s, r) => s + r.baseline, 0);
  return {
    total,
    awarded: rows.reduce((s, r) => s + r.awardedSaved, 0),
    baseline,
    pct: baseline ? Number(((total / baseline) * 100).toFixed(1)) : 0,
    rounds: negotiationRounds.length,
    byRfq: rows.sort((a, b) => b.saved - a.saved),
  };
};

/* ── approvals ──────────────────────────────────────────────────────────── */

const hotelNameOf = (r) => (r.propertyIds || []).map((p) => propertiesById[p]?.shortName).join(", ");

/**
 * Everything in the RFQ / negotiation module waiting on this persona, in the
 * PendingApprovalsModal item shape. The RFQ register's "Pending for me" tab
 * shows the RFQ / TECHNICAL / NEGOTIATION_QUOTE ones; the negotiation list's
 * "Needs my approval" shows NEGOTIATION / NEGOTIATION_QUOTE.
 */
export const pendingApprovalsFor = (personaId) => {
  const fromRfqs = rfqBook
    .filter((r) => r.approval?.approverId === personaId)
    .map((r) => ({
      entity_type: r.approval.type,
      entity_id: r.approval.type === "NEGOTIATION_QUOTE" ? Number(r.id) : Number(r.id),
      entity_title: r.title,
      entity_rfq_no: r.id,
      metadata: { rfq_id: Number(r.id), rfq_number: r.id, rfq_title: r.title, mr_number: r.mrId },
      waiting_hours: hoursSince(r.approval.since),
      hotel_name: hotelNameOf(r),
    }));
  const fromRounds = negotiationRounds
    .filter((x) => x.state === "awaiting_approval" && x.approverId === personaId)
    .map((x) => {
      const r = rfqBookById[x.rfqId];
      return {
        entity_type: "NEGOTIATION",
        entity_id: x.id,
        entity_title: `${x.ref} · ${r.title}`,
        entity_rfq_no: r.id,
        metadata: { rfq_id: Number(r.id), rfq_number: r.id, rfq_title: r.title },
        waiting_hours: hoursSince(x.createdOn),
        hotel_name: hotelNameOf(r),
      };
    });
  return [...fromRfqs, ...fromRounds].sort((a, b) => b.waiting_hours - a.waiting_hours);
};

/* ── activity ───────────────────────────────────────────────────────────── */

const at = (d, h = 10) => `${d}T${String(h).padStart(2, "0")}:00:00.000Z`;
const rfqLink = (id) => `/dashboard/buyer/rfq-management-details?type=buyer-view&id=${id}`;

/** Notification-worthy events from RFQs and negotiations, newest first. */
export const activityFor = (personaId) => {
  const seesRfq = (r) => {
    const scope = peopleById[personaId]?.propertyIds || [];
    return (r.propertyIds || []).some((p) => scope.includes(p));
  };
  const ev = [];
  rfqBook.forEach((r) => {
    if (!seesRfq(r)) return;
    if (r.approval?.approverId === personaId) {
      const what = { RFQ: "publish approval", TECHNICAL: "technical sign-off", NEGOTIATION_QUOTE: "award approval" }[r.approval.type];
      ev.push({ at: at(r.approval.since, 9), title: `RFQ #${r.id} needs your ${what}`, message: `${r.title} · ${hotelNameOf(r)}`, link: rfqLink(r.id), kind: "approval" });
    }
    if (r.statusKey === "AWAITING_QUOTES" && r.quoted.length && personaId !== "finance") {
      ev.push({ at: at(DEMO_TODAY, 8), title: `${r.quoted.length} of ${r.invited.length} quotes in on RFQ #${r.id}`, message: `${r.title} · closes ${r.closesOn}${daysFrom(r.closesOn) <= 3 ? " — ending soon" : ""}`, link: rfqLink(r.id), kind: "rfq" });
    }
    if (r.thread && personaId !== "finance") {
      ev.push({ at: at(r.finalisedOn, 12), title: `RFQ #${r.id} awarded into ${r.arcId}`, message: `8 lines across ${awardedVendorsOf(r.id).length} suppliers after ${threadNeg.id}.`, link: rfqLink(r.id), kind: "award" });
    }
  });
  negotiationRounds.forEach((x) => {
    const r = rfqBookById[x.rfqId];
    if (!seesRfq(r) || personaId === "finance") return;
    if (x.state === "awaiting_approval" && x.approverId === personaId) {
      ev.push({ at: at(x.createdOn, 11), title: `${x.ref} needs your approval`, message: `Targets for ${r.title} are waiting before vendors see them.`, link: `/dashboard/buyer/negotiation/${r.id}/approve`, kind: "approval" });
    } else if (x.state === "open_with_vendors") {
      ev.push({ at: at(x.approvedOn, 14), title: `${x.ref} is open with vendors`, message: `Closes ${x.endOn}. ${new Set(x.lines.filter((l) => l.achieved != null).map((l) => l.vendor)).size} of ${new Set(x.lines.map((l) => l.vendor)).size} vendors have revised.`, link: `/dashboard/buyer/negotiation/round/${x.id}`, kind: "negotiation" });
    } else if (x.state === "concluded" && daysFrom(x.closedOn) >= -30) {
      ev.push({ at: at(x.closedOn, 16), title: `${x.ref} concluded`, message: `${r.title} — saved ₹${Math.round(roundTotals(x).saved).toLocaleString("en-IN")}.`, link: `/dashboard/buyer/negotiation/round/${x.id}`, kind: "negotiation" });
    }
  });
  return ev.sort((a, b) => b.at.localeCompare(a.at));
};

/* ── vendor queries (clarifications) ───────────────────────────────────── */

export const rfqQueries = {
  "535944": {
    welspun: [
      ["received", "2026-06-05T11:20:00+05:30", "Can bath towels be supplied in 550 GSM at the same rate? Our 500 GSM loom is booked for Q2."],
      ["sent", "2026-06-05T16:05:00+05:30", "The specification stays at 500 GSM ±3%. A 550 GSM alternative can be quoted as a separate line — it will be evaluated against the 500 GSM rate."],
    ],
    trident: [
      ["received", "2026-06-08T10:12:00+05:30", "Is freight to Fort Barwara (Sawai Madhopur) included in the delivered rate, or may we quote it separately?"],
      ["sent", "2026-06-08T13:40:00+05:30", "Delivered rates are preferred. If you quote Sawai Madhopur freight separately, show it as its own charge line so it is compared like-for-like."],
    ],
    greenleaf: [
      ["received", "2026-06-10T09:30:00+05:30", "For the amenity kit, is an FSC-certified carton mandatory or is recycled board acceptable?"],
      ["sent", "2026-06-10T12:15:00+05:30", "FSC-certified carton is mandatory — it is part of the group's sustainability commitment. Please attach the chain-of-custody certificate."],
    ],
  },
  "535970": {
    "it-netcore": [
      ["received", "2026-07-24T10:00:00+05:30", "Does the 3-year on-site SLA at Ramnagar and Sawai Madhopur need a resident engineer, or is next-business-day dispatch from Jaipur/Delhi acceptable?"],
      ["sent", "2026-07-24T15:30:00+05:30", "Next-business-day on-site replacement is the requirement; a resident engineer is not. State your dispatch location for each property in the SLA response."],
    ],
    "it-orbit": [
      ["received", "2026-07-27T11:45:00+05:30", "Our switches are certified for 720 W PoE+ budget. Is 740 W a hard minimum?"],
      ["sent", "2026-07-27T17:10:00+05:30", "Yes, 740 W across 48 ports is a mandatory clause. A lower budget will score zero on clause 2."],
    ],
    "it-vertex": [
      ["received", "2026-08-02T09:05:00+05:30", "Can we propose a model with end-of-sale in 20 months if we commit to a like-for-like swap?"],
    ],
  },
};

export default rfqBook;
