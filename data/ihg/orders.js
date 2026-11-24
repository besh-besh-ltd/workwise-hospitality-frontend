import { contract, rfq as threadRfq, lineItems as threadLineItems } from "./thread";
import { bookPos } from "./poBook";

/**
 * Purchase orders awaiting approval — the approver's queue.
 *
 * Five orders: two the AI clears, two held on a single missing document, and
 * one it says should not be approved at all. #108215 is the stand demo's
 * order: Welspun's bath-linen replenishment, "approve with two conditions",
 * ₹850 a towel, ISO 9001 lapsed 47 days ago, ₹12,36,480.00 with GST.
 *
 * #108231 is the golden thread's call-off — the order ARC-2627-0014 finally
 * produces, priced line for line at the awarded rates.
 *
 * Every value here is computed from its lines rather than typed twice, so a
 * total can never disagree with the rows above it. Lines carry GST at 12%
 * (linen made-ups, as the prototype priced them); a PO's `value` is the
 * GST-inclusive total, which is the figure the register, the queue and the
 * printed order all show.
 *
 * The evidence each PO carries (RFQ context, quote comparison, technical
 * evaluation, documents, key dates) is what the AI decision memo cites. Its
 * evidence chips scroll to these sections, so a claim in the memo always has
 * something on the page to land on.
 */

export const GST_PCT = 12;
const r2 = (n) => Math.round(n * 100) / 100;

/** Base value, GST and the GST-inclusive amount for one line. */
const taxed = (l) => {
  const value = l.qty * l.rate;
  const gst = l.gst ?? GST_PCT;
  const tax = r2((value * gst) / 100);
  return { unit: "pcs", ...l, value, gst, tax, amount: r2(value + tax) };
};

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

const LINES_CALL_OFF = [
  { itemId: "twl-bath-500", name: "Bath Towel 500 GSM", qty: 900 },
  { itemId: "twl-hand-500", name: "Hand Towel 500 GSM", qty: 1100 },
  // Exactly at the 450 quarterly cap. The AI calls this order clean on every
  // check, so no line may sit over its cap — it used to order 500 here, which
  // the memo it was shown with never mentioned.
  { itemId: "bed-sheet-300", name: "Bed Sheet 300 TC", qty: 450 },
  { itemId: "duvet-cover", name: "Duvet Cover 300 TC", qty: 300 },
  { itemId: "bath-mat", name: "Bath Mat 900 GSM", qty: 550 },
  { itemId: "bathrobe", name: "Bathrobe Waffle", qty: 158 },
];

const specOf = (itemId) => threadLineItems.find((i) => i.id === itemId)?.spec || "";

const priceLines = (lines) =>
  lines.map((l) => {
    const a = awardedRates[l.itemId];
    return taxed({
      ...l,
      spec: specOf(l.itemId),
      rate: a.rate,
      vendorId: a.vendorId,
      lastPoRate: a.lastPoRate,
      lastAwardRate: a.lastAwardRate,
      vsLastAwardPct: Number((((a.rate - a.lastAwardRate) / a.lastAwardRate) * 100).toFixed(1)),
      cap: callOffCap[l.itemId],
      overCap: l.qty > callOffCap[l.itemId],
    });
  });

const sum = (lines) => r2(lines.reduce((s, l) => s + l.amount, 0));
const subtotalOf = (lines) => lines.reduce((s, l) => s + l.value, 0);

/** Housekeeping linen budget, Workwise Grand — ₹90.60L uncommitted. */
const BUDGET_HK_MUMBAI = { head: "Housekeeping — linen & amenities, FY 2026-27", code: "HK-LIN-2627", allocated: 14200000, consumed: 5140000 };
/** Housekeeping linen budget, Metro Greater Noida — ₹26.40L uncommitted. */
const BUDGET_HK_NOIDA = { head: "Housekeeping — linen & amenities, FY 2026-27", code: "HK-LIN-2627", allocated: 6200000, consumed: 3560000 };

/** The financial step every seeded PO waits on. Either approver can sign. */
const financialApproval = { personIds: ["finance", "regional"], role: "Financial approval", state: "pending", rule: "ANY" };

/**
 * The vendor card on the PO detail. On-time figures are the vendor master's
 * (vendors.js) so the PO screens and the quote comparison quote the same
 * number.
 */
export const vendorCards = {
  welspun: { tagline: "Bed & bath textiles · Anjar, Gujarat · vendor since 2021", phone: "+91-98001 00006", email: "hospitality@welspun.co.in", priorPos: 18 },
  sriram: { tagline: "Terry towelling & bath linen · Karur, Tamil Nadu · vendor since 2019", phone: "+91-99250 33481", email: "sales@sriramtextiles.co.in", priorPos: 23 },
  nandan: { tagline: "Terry towelling · Ahmedabad, Gujarat · vendor since 2023", phone: "+91-98123 55004", email: "orders@nandanterry.in", priorPos: 15 },
  trident: { tagline: "Bed linen & terry · Budhni, Madhya Pradesh · vendor since 2022", phone: "+91-99450 27718", email: "projects@tridenthometex.co.in", priorPos: 11 },
  aarvi: { tagline: "Linen & guest amenities · Mumbai, Maharashtra · vendor since 2020", phone: "+91-98220 41177", email: "contracts@aarvilinens.in", priorPos: 9 },
};

/* ── the five orders ─────────────────────────────────────── */

const lines108215 = [
  taxed({
    itemId: "twl-bath-500", name: "Bath Towel 500 GSM", qty: 1200, rate: 850, vsLastAwardPct: 6.3,
    size: "70 × 140 cm",
    spec: "100% combed ring-spun cotton, double-stitched hem, 500 GSM, dobby border, colour-fast to ISO 105-C06",
    comment: "Rooms refresh — 220 keys at a par of five towels per key, plus a 9% float",
  }),
  taxed({
    itemId: "bath-mat", name: "Bath Mat 900 GSM", qty: 400, rate: 210, vsLastAwardPct: 0,
    size: "50 × 80 cm",
    spec: "900 GSM terry pile, anti-skid latex backing, colour-matched to towel range",
    comment: "Spa and premium floors only",
  }),
];

const linesCallOff = priceLines(LINES_CALL_OFF);

const lines108244 = [
  taxed({
    itemId: "twl-bath-500", name: "Bath Towel 500 GSM", qty: 1554, rate: 384, vsLastAwardPct: -4.1,
    size: "70 × 140 cm",
    spec: "500 GSM minimum, 100% ring-spun cotton, double-stitched hem, colour-fast to ISO 105-C06",
    comment: "Second half of the replenishment — the first half went on PO #108058",
  }),
];

const lines108250 = [
  taxed({
    itemId: "bed-sheet-300", name: "Bed Sheet 300 TC", qty: 800, rate: 1059, vsLastAwardPct: 5.1,
    size: "275 × 275 cm",
    spec: "300 TC sateen weave, 100% cotton, mitred hem, white",
    comment: "Rooms refresh ahead of the 20 Sep handover",
  }),
  taxed({
    itemId: "duvet-cover", name: "Duvet Cover 300 TC", qty: 240, rate: 1386, vsLastAwardPct: 0,
    size: "225 × 245 cm",
    spec: "300 TC sateen weave, 100% long-staple cotton, mitred hem, colour-fast to ISO 105-C06",
    comment: "Unchanged from PO #107930, now with the sateen finish",
  }),
];

const lines108258 = [
  taxed({
    itemId: "spa-linen", name: "Spa therapy linen set", qty: 1250, rate: 428, vsLastAwardPct: 6.8, unit: "sets",
    size: "4-piece set",
    spec: "380 GSM terry, 4-piece set — bath sheet, hand towel, robe and wrap",
    comment: "Spa top-up, raised off-contract",
  }),
];

const order = (po) => ({ ...po, value: sum(po.lines), subtotal: subtotalOf(po.lines), tax: r2(sum(po.lines) - subtotalOf(po.lines)) });

export const purchaseOrders = [
  order({
    id: "108250",
    ref: "PO #108250",
    title: "Bed linen replenishment — Metro Greater Noida",
    contractId: "ARC-2627-0009",
    propertyId: "cp-noida",
    vendorId: "trident",
    raisedBy: "purchase",
    raisedOn: "2026-08-13",
    approverId: "finance",
    pendingDays: 1,
    status: "Pending approval",
    lines: lines108250,
    budget: BUDGET_HK_NOIDA,
    chain: [
      { personId: "purchase", role: "Raised", state: "done", on: "2026-08-13" },
      financialApproval,
    ],
    rfq: { number: "536438", title: "Bed linen replenishment — Metro Business Hotel Greater Noida", invited: 4, quoted: 3, rounds: 1, finalizedBy: "purchase", finalizedOn: "2026-08-12" },
    compare: [
      { vendorId: "trident", extra: 0, deliveryDays: 35 },
      { vendorId: "aarvi", extra: 33180, deliveryDays: 30 },
      { vendorId: "greenleaf", extra: 74640, deliveryDays: 28 },
    ],
    techEval: [
      {
        product: "Bed Sheet 300 TC", round: 1, mark: 60, approverId: "regional", on: "2026-08-12T05:35:00.000Z",
        clauses: [
          { text: "TC-01 — 300 TC, 100% cotton, 275 × 275 cm sateen weave with a mitred hem.", max: 40, got: 36 },
          { text: "TC-02 — Shrinkage not to exceed 3% after 5 industrial cycles, measured per IS 2977.", max: 30, got: 26 },
          { text: "TC-05 — Colour-fastness to ISO 105-C06 grade 4 or better, with a test report submitted before delivery.", max: 30, got: 16 },
        ],
      },
    ],
    docs: [
      { group: "po" },
      { group: "quote", name: "Trident_Quote_536438.pdf", label: "Quote · round 1" },
      { group: "tech", name: "Trident_TDS_BedLinen300TC.pdf", label: "Technical data sheet" },
      { group: "tech", name: "Trident_QAP_Linen_2026.pdf", label: "Quality assurance plan · no colour-fastness report" },
      { group: "tech", name: "ShrinkageTestReport_IS2977.pdf", label: "Test report · 2.1% shrinkage" },
      { group: "tech", name: "TechEval_536438_Scorecard.pdf", label: "Technical evaluation" },
      { group: "compliance", name: "Trident_ISO9001.pdf", label: "Certificate · valid to 30 Sep 2027" },
      { group: "compliance", name: "Trident_GST_Filing_Jul2026.pdf", label: "GST filing record" },
    ],
    dates: { delivery: "2026-09-20", paymentDays: 30, paymentNote: "30 days · standard" },
    vendorFlags: [{ label: "Colour-fastness report missing", type: "neutral" }],
  }),
  order({
    id: "108258",
    ref: "PO #108258",
    title: "Spa therapy linen — top-up",
    contractId: null,
    propertyId: "ic-mumbai",
    vendorId: "aarvi",
    raisedBy: "purchase",
    raisedOn: "2026-08-12",
    approverId: "finance",
    pendingDays: 2,
    status: "Pending approval",
    lines: lines108258,
    budget: BUDGET_HK_MUMBAI,
    riskNote:
      "Off-contract, and placed with the supplier whose OEKO-TEX certificate lapsed in March. Rate is 6.8% above the ARC-2026-0041 rate.",
    chain: [
      { personId: "purchase", role: "Raised", state: "done", on: "2026-08-12" },
      financialApproval,
    ],
    rfq: { number: "536431", title: "Spa therapy linen — top-up, FY 2026-27", invited: 1, quoted: 1, rounds: 3, finalizedBy: "purchase", finalizedOn: "2026-08-11" },
    compare: [{ vendorId: "aarvi", extra: 0, deliveryDays: 21 }],
    techEval: [
      {
        product: "Spa therapy linen set", round: 1, mark: 70, approverId: "regional", on: "2026-08-10T12:35:00.000Z",
        clauses: [
          { text: "TC-01 — Finished size and colour to the approved sample.", max: 30, got: 30 },
          { text: "TC-03 (mandatory) — 420 GSM minimum with an anti-pill finish, evidenced by an independent lab report.", max: 40, got: 12 },
          { text: "TC-04 — No pile loss after 50 industrial cycles at 70°C, with an independent wash-durability report.", max: 30, got: 16 },
        ],
      },
    ],
    docs: [
      { group: "po" },
      { group: "quote", name: "Aarvi_Quote_R3_536431.pdf", label: "Quote · round 3 · single source" },
      { group: "tech", name: "Aarvi_TDS_SpaLinen.pdf", label: "Technical data sheet" },
      { group: "tech", name: "Aarvi_QAP_SpaLinen.pdf", label: "Quality assurance plan" },
      { group: "tech", name: "Aarvi_WashDurability_Declaration.pdf", label: "Supplier's own declaration" },
      { group: "tech", name: "TechEval_536431_Scorecard.pdf", label: "Technical evaluation · 58%" },
      { group: "compliance", name: "Aarvi_OEKOTEX.pdf", label: "Certificate · expired 31 Mar 2026" },
      { group: "compliance", name: "Aarvi_ISO9001.pdf", label: "Certificate · valid to 20 May 2027" },
      { group: "compliance", name: "Aarvi_GST_Filing_Jul2026.pdf", label: "GST filing record" },
      { group: "contract", name: "ARC-2026-0041_SpaLinen_RateCard.pdf", label: "Rate contract · ₹401.00/set" },
      { group: "related", name: "PO 108177.pdf", label: "Same scope · still open" },
    ],
    dates: { delivery: "2026-09-15", paymentDays: 30, paymentNote: "30 days · standard" },
    vendorFlags: [{ label: "OEKO-TEX lapsed 31 Mar 2026", type: "neutral" }, { label: "Off-contract order", type: "neutral" }],
  }),
  order({
    id: "108244",
    ref: "PO #108244",
    title: "Bath towel top-up — second source",
    contractId: "ARC-2627-0011",
    propertyId: "ic-mumbai",
    // Nandan, not GreenLeaf: the AI approval queue calls this order clean on
    // every check and names the supplier, so the register has to name the same
    // one.
    vendorId: "nandan",
    raisedBy: "purchase",
    raisedOn: "2026-08-11",
    approverId: "finance",
    pendingDays: 3,
    status: "Pending approval",
    lines: lines108244,
    budget: BUDGET_HK_MUMBAI,
    chain: [
      { personId: "purchase", role: "Raised", state: "done", on: "2026-08-11" },
      financialApproval,
    ],
    rfq: { number: "536425", title: "Bath towel top-up — second source, FY 2026-27", invited: 3, quoted: 3, rounds: 2, finalizedBy: "purchase", finalizedOn: "2026-08-10" },
    compare: [
      { vendorId: "nandan", extra: 0, deliveryDays: 16 },
      { vendorId: "greenleaf", extra: 28896, deliveryDays: 18 },
      { vendorId: "welspun", extra: 48096, deliveryDays: 14 },
    ],
    techEval: [
      {
        product: "Bath Towel 500 GSM", round: 1, mark: 60, approverId: "finance", on: "2026-08-10T10:00:00.000Z",
        clauses: [
          { text: "TC-01 — 500 GSM minimum per IS 1964, 100% ring-spun cotton, double-stitched hem.", max: 50, got: 47 },
          { text: "TC-02 — Colour-fastness to ISO 105-C06 grade 4, and no pile loss after 50 industrial cycles at 70°C.", max: 50, got: 47 },
        ],
      },
    ],
    docs: [
      { group: "po" },
      { group: "quote", name: "NandanTerry_Quote_R2_536425.pdf", label: "Quote · round 2" },
      { group: "tech", name: "NandanTerry_TDS_BathTowel500.pdf", label: "Technical data sheet" },
      { group: "compliance", name: "NandanTerry_OEKOTEX_100.pdf", label: "Certificate · valid to 08 Oct 2027" },
      { group: "compliance", name: "NandanTerry_GST_Filing_Jul2026.pdf", label: "GST filing record" },
      { group: "contract", name: "ARC-2026-0118_TerryTowelling_RateCard.pdf", label: "Rate contract · ceiling ₹408.00/pc" },
    ],
    dates: { delivery: "2026-08-27", paymentDays: 30, paymentNote: "30 days · standard" },
    vendorFlags: [],
  }),
  order({
    id: "108215",
    ref: "PO #108215",
    title: "Bath linen replenishment — Rooms & Spa",
    contractId: "ARC-2627-0011",
    propertyId: "ic-mumbai",
    vendorId: "welspun",
    raisedBy: "purchase",
    raisedOn: "2026-08-11",
    approverId: "finance",
    pendingDays: 3,
    status: "Pending approval",
    lines: lines108215,
    budget: BUDGET_HK_MUMBAI,
    riskNote: "Rate is 6.3% above the last purchase and the supplier's ISO 9001 certificate lapsed on 28 Jun 2026.",
    chain: [
      { personId: "purchase", role: "Raised", state: "done", on: "2026-08-11" },
      { personId: "housekeeping", role: "Requirement confirmed", state: "done", on: "2026-08-11" },
      financialApproval,
    ],
    rfq: { number: "536417", title: "Linen replenishment — Rooms & Spa, H2 FY 2026-27", invited: 3, quoted: 3, rounds: 2, finalizedBy: "purchase", finalizedOn: "2026-08-10" },
    compare: [
      { vendorId: "welspun", extra: 0, deliveryDays: 10 },
      { vendorId: "nandan", extra: 34840, deliveryDays: 14 },
      { vendorId: "sriram", extra: 68480, deliveryDays: 12 },
    ],
    techEval: [
      {
        product: "Bath Towel 500 GSM", round: 1, mark: 60, approverId: "finance", on: "2026-08-10T10:42:00.000Z",
        clauses: [
          { text: "TC-01 — Towel must be 100% combed ring-spun cotton with double-stitched hem, colour-fast to ISO 105-C06 grade 4 or better.", max: 40, got: 40 },
          { text: "TC-02 — Minimum 500 GSM measured per IS 1964. Negative tolerance is not acceptable.", max: 60, got: 48 },
        ],
      },
      {
        product: "Bath Mat 900 GSM", round: 1, mark: 60, approverId: "finance", on: "2026-08-10T10:42:00.000Z",
        clauses: [
          { text: "TC-01 — 900 GSM minimum with anti-skid latex backing, finished size 50 × 80 cm ± 2 cm.", max: 50, got: 46 },
          { text: "TC-02 — No delamination or pile loss after 50 industrial wash cycles at 70°C.", max: 50, got: 46 },
        ],
      },
    ],
    docs: [
      { group: "po" },
      { group: "quote", name: "Welspun_Quote_R2_536417.pdf", label: "Quote · round 2" },
      { group: "tech", name: "Welspun_TDS_BathTowel500.pdf", label: "Technical data sheet · 500 GSM ±5%" },
      { group: "tech", name: "Welspun_QAP_Linen_2026.pdf", label: "Quality assurance plan" },
      { group: "compliance", name: "Welspun_ISO9001.pdf", label: "Certificate · expired 28 Jun 2026" },
      { group: "compliance", name: "Welspun_GST_Filing_Jul2026.pdf", label: "GST filing record" },
      { group: "contract", name: "ARC-2026-0117_Linen_RateCard.pdf", label: "Rate contract · ceiling ₹877.00/pc" },
    ],
    dates: { delivery: "2026-08-25", paymentDays: 30, paymentNote: "30 days · not MSME" },
    vendorFlags: [{ label: "ISO 9001 expired 28 Jun 2026", type: "neutral" }, { label: "Not MSME-registered", type: "neutral" }],
  }),
  order({
    id: "108231",
    ref: "PO #108231",
    title: "Housekeeping Linen — Q3 call-off",
    contractId: contract.id,
    propertyId: "ic-mumbai",
    vendorId: "sriram",
    raisedBy: "purchase",
    raisedOn: "2026-08-07",
    approverId: "finance",
    pendingDays: 7,
    status: "Pending approval",
    lines: linesCallOff,
    live: true,
    budget: BUDGET_HK_MUMBAI,
    chain: [
      { personId: "purchase", role: "Raised", state: "done", on: "2026-08-07" },
      { personId: "housekeeping", role: "Requirement confirmed", state: "done", on: "2026-08-08" },
      financialApproval,
    ],
    // The golden thread's own RFQ — the one record here with a page to open.
    rfq: { number: threadRfq.id, id: threadRfq.id, title: threadRfq.title, invited: threadRfq.invited, quoted: threadRfq.quoted, finalizedBy: "purchase", finalizedOn: "2026-07-13" },
    compare: [
      { vendorId: "sriram", extra: 0, deliveryDays: 9 },
      { vendorId: "nandan", extra: 72096, deliveryDays: 11 },
      { vendorId: "welspun", extra: 127216, deliveryDays: 8 },
    ],
    techEval: [],
    docs: [
      { group: "po" },
      { group: "contract", name: "ARC-2627-0014_RateSchedule.pdf", label: "Rate contract · awarded rates" },
      { group: "tech", name: "SriramTextiles_SITRA_LabReport_Terry.pdf", label: "Lab test report · terry SKUs" },
      { group: "compliance", name: "SriramTextiles_OEKOTEX_100.pdf", label: "Certificate · valid to 30 Apr 2027" },
      { group: "compliance", name: "SriramTextiles_Udyam_Certificate.pdf", label: "MSME registration" },
    ],
    dates: { delivery: "2026-08-22", paymentDays: 45, paymentNote: "45 days · MSME" },
    vendorFlags: [{ label: "MSME · Udyam registered", type: "success" }, { label: "OEKO-TEX valid to 30 Apr 2027", type: "success" }],
  }),
];

// The rest of the book (data/ihg/poBook.js) resolves by id too, so the printed
// order and every detail lookup find a sent, delivered or closed PO as well.
export const posById = Object.fromEntries([...purchaseOrders, ...bookPos].map((p) => [p.id, p]));
export const getPo = (id) => posById[id] || null;

/** Derived, never typed — the queue total always matches the rows in it. */
export const pendingPos = purchaseOrders.filter((p) => p.status === "Pending approval");
export const heldValue = r2(pendingPos.reduce((s, p) => s + p.value, 0));

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
