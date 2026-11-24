import { mr, lineItems as threadLineItems, rfq as threadRfq, po as threadPo } from "./thread";
import { awardedRates } from "./orders";

/**
 * Material requisitions (MRs) — the register's requisitions, split out of
 * register.js so the MR module owns them. The golden-thread MR is spliced in
 * from thread.js. register.js re-exports everything here.
 *
 * Every MR carries its own lines; its value is the sum of those lines and is
 * never typed. A line is "ARC matched" when it is priced from a rate contract
 * in contracts.js (ARC-2627-0014's awarded rates come from orders.js, so the
 * MR and the call-off PO quote the same rupee).
 *
 * Approval chain: L1 property HOD for the department (the initiator's own
 * level is auto-approved, as the product does), L2 procurement (Ananya),
 * L3 group head (Sameer) only above ₹25L.
 */

export const L3_THRESHOLD = 2500000;

/** Non-login staff who raise MRs and sign L1, per property and department. */
export const mrStaff = {
  rohan: { name: "Rohan Mehta", role: "Housekeeping HOD · Workwise Grand", personaId: "housekeeping" },
  meera: { name: "Meera Kulkarni", role: "Asst. Housekeeper · Workwise Grand" },
  sunil: { name: "Sunil Pawar", role: "Linen Room Supervisor · Workwise Grand" },
  nisha: { name: "Nisha D'Souza", role: "Front Office Manager · Workwise Grand" },
  vinod: { name: "Vinod Patil", role: "Chief Engineer · Workwise Grand" },
  pooja: { name: "Pooja Sharma", role: "Executive Housekeeper · Metro Greater Noida" },
  rahul: { name: "Rahul Verma", role: "F&B Manager · Metro Greater Noida" },
  lakshmi: { name: "Lakshmi Iyer", role: "Executive Housekeeper · City Express Whitefield" },
  kiran: { name: "Kiran Gowda", role: "Chief Engineer · City Express Whitefield" },
  deepak: { name: "Deepak Rawat", role: "Chief Engineer · Riverside Corbett" },
  harish: { name: "Harish Negi", role: "Maintenance Supervisor · Riverside Corbett" },
  kavita: { name: "Kavita Rathore", role: "Spa & Housekeeping Manager · Fort Barwara" },
  ananya: { name: "Ananya Rao", role: "Procurement Lead · India", personaId: "purchase" },
  sameer: { name: "Sameer Nair", role: "Head of IT · India", personaId: "regional" },
};

/** Department head (L1) per property × department. */
export const mrHods = {
  "ic-mumbai:Housekeeping": "rohan",
  "ic-mumbai:Front Office": "nisha",
  "ic-mumbai:Engineering": "vinod",
  "cp-noida:Housekeeping": "pooja",
  "cp-noida:Food & Beverage": "rahul",
  "hie-blr:Housekeeping": "lakshmi",
  "hie-blr:Engineering": "kiran",
  "voco-corb:Engineering": "deepak",
  "ss-barwara:Housekeeping": "kavita",
};

/* ── catalogue ───────────────────────────────────────────── */

const threadItem = (id) => threadLineItems.find((i) => i.id === id);

/** ARC-2627-0014 (housekeeping linen) — rates and vendor as awarded. */
const arc0014 = (id, qty, note) => {
  const i = threadItem(id);
  const a = awardedRates[id];
  return { itemId: id, name: i.name, spec: i.spec, uom: i.uom, qty, rate: a.rate, lastRate: i.lastRate, arcId: "ARC-2627-0014", vendorId: a.vendorId, note };
};

/** Housekeeping chemicals — last paid rates (no rate contract in force; PO #108218 paid the same). */
const CHEM = {
  "chem-floor": { name: "Floor cleaner concentrate, pH-neutral", spec: "5 L can", uom: "can", rate: 1240 },
  "chem-glass": { name: "Glass & mirror cleaner", spec: "5 L can", uom: "can", rate: 860 },
  "chem-toilet": { name: "Toilet bowl cleaner, acidic", spec: "5 L can", uom: "can", rate: 980 },
  "chem-sanitiser": { name: "Surface sanitiser, QAC-based", spec: "5 L can", uom: "can", rate: 1450 },
};
const chem = (id, qty) => ({ itemId: id, ...CHEM[id], qty });

/** A line with no rate contract behind it — priced at the last paid rate, sourced through an RFQ. */
const open = (itemId, name, spec, uom, qty, rate, note) => ({ itemId, name, spec, uom, qty, rate, note });
const fromThread = (id, qty) => { const i = threadItem(id); return open(id, i.name, i.spec, i.uom, qty, i.lastRate); };

/* ── the register ────────────────────────────────────────── */
// `approvals` records each decided step: { level, by, on, decision, comment }.
// The level after the last decided one is where the MR waits.

export const mrRecords = [
  {
    id: "MR-2627-0866", title: "Boiler descaling chemicals — pre-monsoon", propertyId: "ic-mumbai", department: "Engineering",
    raisedBy: "vinod", raisedOn: "2026-04-20", requiredBy: "2026-05-05", urgency: "low", outcome: "rejected",
    justification: "Annual descaling of both boilers ahead of the monsoon load.",
    approvals: [
      { level: 1, by: "vinod", on: "2026-04-20T10:05:00", decision: "APPROVED", auto: true },
      { level: 2, by: "ananya", on: "2026-04-22T15:40:00", decision: "REJECTED", comment: "Descaling is inside the annual water-treatment service contract. Raise a service call instead of buying chemicals." },
    ],
    lines: [
      open("eng-descale", "Boiler descaling compound", "25 kg drum", "drum", 12, 6800),
      open("eng-inhibitor", "Scale inhibitor dosing chemical", "25 L can", "can", 12, 5400),
      open("eng-o2", "Oxygen scavenger", "25 kg bag", "bag", 8, 4950),
    ],
  },
  {
    id: mr.id, title: mr.title, propertyId: mr.propertyId, department: mr.department,
    raisedBy: "rohan", raisedOn: mr.raisedOn, requiredBy: "2026-08-31", urgency: "low", outcome: "approved",
    justification: mr.note, live: true,
    rfq: { id: threadRfq.id, title: threadRfq.title, on: threadRfq.createdOn },
    po: { id: threadPo.id, status: threadPo.status, on: threadPo.raisedOn },
    approvals: [
      { level: 1, by: "rohan", on: "2026-05-18T09:30:00", decision: "APPROVED", auto: true },
      { level: 2, by: "ananya", on: "2026-05-20T12:10:00", decision: "APPROVED", comment: "Consolidating all five properties into one RFQ." },
      { level: 3, by: "sameer", on: "2026-05-22T17:45:00", decision: "APPROVED", comment: "Approved — group annual indent." },
    ],
    lines: threadLineItems.map((i) => open(i.id, i.name, i.spec, i.uom, i.annualQty, i.lastRate)),
  },
  {
    id: "MR-2627-0904", title: "Banquet crockery replacement", propertyId: "cp-noida", department: "Food & Beverage",
    raisedBy: "rahul", raisedOn: "2026-06-02", requiredBy: "2026-09-30", urgency: "low", outcome: "approved",
    justification: "Breakage audit after the wedding season: 31% of banquet crockery below par.",
    rfq: { id: "535912", title: "Banquet Crockery & Glassware — FY 2026-27", on: "2026-06-10" },
    callOffs: [{ poId: "108207", on: "2026-08-07T11:00:00" }],
    approvals: [
      { level: 1, by: "rahul", on: "2026-06-02T11:00:00", decision: "APPROVED", auto: true },
      { level: 2, by: "ananya", on: "2026-06-04T10:20:00", decision: "APPROVED", comment: "Folding into the Mumbai + Noida crockery RFQ." },
      { level: 3, by: "sameer", on: "2026-06-06T16:00:00", decision: "APPROVED" },
    ],
    lines: [
      open("fb-plate-27", "Dinner plate 27 cm, bone china", "Banquet white", "pc", 1800, 520),
      open("fb-plate-19", "Quarter plate 19 cm, bone china", "Banquet white", "pc", 1800, 310),
      open("fb-soup", "Soup bowl 350 ml", "Bone china", "pc", 1200, 290),
      open("fb-dessert", "Dessert bowl 200 ml", "Bone china", "pc", 1200, 240),
      open("fb-cup", "Tea cup & saucer", "Bone china, 200 ml", "set", 900, 380),
      open("fb-mug", "Coffee mug 300 ml", "Bone china", "pc", 600, 260),
      open("fb-platter", "Rice platter, oval 30 cm", "Bone china", "pc", 400, 690),
      open("fb-serve", "Serving bowl 1.5 L", "Bone china", "pc", 300, 760),
      open("fb-wine", "Wine glass 350 ml", "Lead-free crystal", "pc", 1200, 210),
      open("fb-goblet", "Water goblet 400 ml", "Lead-free crystal", "pc", 1500, 190),
      open("fb-highball", "Highball glass 300 ml", "Tempered", "pc", 1000, 150),
      open("fb-flute", "Champagne flute 200 ml", "Lead-free crystal", "pc", 600, 230),
      open("fb-chafing", "Chafing dish 9 L, rectangular", "Stainless steel, roll-top", "pc", 24, 8400),
      open("fb-juice", "Juice dispenser 8 L", "Glass jar, steel stand", "pc", 18, 2300),
    ],
  },
  {
    id: "MR-2627-0908", title: "Spa wraps & robes — summer season", propertyId: "ic-mumbai", department: "Housekeeping",
    raisedBy: "meera", raisedOn: "2026-06-24", requiredBy: "2026-07-10", urgency: "low", outcome: "cancelled",
    cancelledOn: "2026-06-26T12:15:00", cancelNote: "Spa closed for refurbishment until September — season float not needed.",
    justification: "Seasonal spa float for the summer occupancy.",
    approvals: [
      { level: 1, by: "rohan", on: "2026-06-24T16:30:00", decision: "APPROVED" },
    ],
    lines: [
      open("hk-spa-wrap", "Spa wrap towel", "80×160 cm · velcro close", "pc", 160, 520),
      fromThread("bathrobe", 80),
    ],
  },
  {
    id: "MR-2627-0910", title: "Pool towels — monsoon reopening", propertyId: "ic-mumbai", department: "Housekeeping",
    raisedBy: "meera", raisedOn: "2026-07-03", requiredBy: "2026-08-17", urgency: "low", outcome: "po_released",
    justification: "Pool reopens after monsoon maintenance; pool towel float rebuilt to 500.",
    callOffs: [{ poId: "108213", on: "2026-08-11T11:20:00" }],
    approvals: [
      { level: 1, by: "rohan", on: "2026-07-03T14:00:00", decision: "APPROVED" },
      { level: 2, by: "ananya", on: "2026-07-06T10:45:00", decision: "APPROVED", comment: "Not on a rate contract — sourcing with three quotes." },
    ],
    lines: [open("hk-pool-towel", "Pool Towel 400 GSM", "Striped · 90×180 cm", "pc", 500, 290)],
  },
  {
    id: "MR-2627-0912", title: "Pool deck furniture — monsoon damage", propertyId: "voco-corb", department: "Engineering",
    raisedBy: "harish", raisedOn: "2026-07-11", requiredBy: "2026-07-25", urgency: "low", outcome: "pending",
    justification: "Storm on 9 Jul damaged loungers and umbrellas. Insurance surveyor's report attached; claim lodged.",
    approvals: [
      { level: 1, by: "deepak", on: "2026-07-29T10:00:00", decision: "APPROVED", comment: "Approved after the surveyor's visit." },
    ],
    lines: [
      open("eng-lounger", "Sun lounger, aluminium & textilene", "Stackable · UV-stable", "pc", 24, 28500),
      open("eng-dtable", "Poolside dining table, 4-seater", "Teak", "pc", 6, 42000),
      open("eng-dchair", "Poolside chair with cushion", "Teak", "pc", 24, 11500),
      open("eng-umbrella", "Cantilever umbrella 3 m, with base", "Solution-dyed canopy", "pc", 8, 37000),
      open("eng-stable", "Side table", "Teak", "pc", 12, 9500),
      open("eng-cushion", "Outdoor cushion, replacement", "Solution-dyed acrylic", "pc", 48, 4750),
    ],
  },
  {
    id: "MR-2627-0914", title: "Bath mats — Whitefield", propertyId: "hie-blr", department: "Housekeeping",
    raisedBy: "lakshmi", raisedOn: "2026-07-14", requiredBy: "2026-08-26", urgency: "low", outcome: "po_released",
    justification: "Bath mats at four par after the Q1 audit; 150 keys.",
    callOffs: [{ poId: "108211", on: "2026-08-11T15:10:00" }],
    approvals: [
      { level: 1, by: "lakshmi", on: "2026-07-14T09:40:00", decision: "APPROVED", auto: true },
      { level: 2, by: "ananya", on: "2026-07-15T11:30:00", decision: "APPROVED" },
    ],
    lines: [open("bath-mat", "Bath Mat 900 GSM", "50×80 cm · anti-skid backing", "pc", 600, 360)],
  },
  {
    id: "MR-2627-0918", title: "Spa therapy linen top-up", propertyId: "ss-barwara", department: "Housekeeping",
    raisedBy: "kavita", raisedOn: "2026-07-19", requiredBy: "2026-09-15", urgency: "low", outcome: "approved",
    justification: "Spa reopening after monsoon refurbishment; therapy linen below par.",
    rfq: { id: "535961", title: "Spa Consumables & Therapy Linen", on: "2026-07-22" },
    approvals: [
      { level: 1, by: "kavita", on: "2026-07-19T10:15:00", decision: "APPROVED", auto: true },
      { level: 2, by: "ananya", on: "2026-07-21T13:05:00", decision: "APPROVED", comment: "Adding to the spa RFQ with Corbett." },
    ],
    lines: [
      open("spa-linen-set", "Spa therapy linen set, 4-piece", "380 GSM terry", "set", 480, 410),
      open("spa-sheet", "Massage table sheet, fitted", "Cotton percale", "pc", 240, 340),
      open("spa-cradle", "Face cradle cover", "Cotton", "pc", 400, 95),
      fromThread("bathrobe", 60),
      open("spa-slipper", "Disposable slippers, closed-toe", "Pair", "pair", 3000, 14),
    ],
  },
  {
    id: "MR-2627-0921", title: "Laundry washer-extractors — in-house laundry", propertyId: "hie-blr", department: "Engineering",
    raisedBy: "kiran", raisedOn: "2026-07-27", requiredBy: "2026-09-15", urgency: "low", outcome: "pending",
    justification: "Bring laundry in-house before the outsourced contract ARC-2526-0071 ends on 30 Nov 2026. Payback 26 months.",
    approvals: [
      { level: 1, by: "kiran", on: "2026-07-27T11:00:00", decision: "APPROVED", auto: true },
      { level: 2, by: "ananya", on: "2026-08-03T16:20:00", decision: "APPROVED", comment: "Business case checked against the laundry contract spend." },
    ],
    lines: [
      open("eng-washer", "Washer-extractor 60 kg, soft-mount", "Programmable · 400 G", "pc", 2, 1140000),
      open("eng-dryer", "Tumble dryer 50 kg, gas-fired", "Reversing drum", "pc", 2, 420000),
      open("eng-install", "Installation & commissioning", "Lot", "lot", 1, 120000),
      open("eng-dosing", "Chemical auto-dosing pump set", "5-pump", "set", 2, 45000),
    ],
  },
  {
    id: "MR-2627-0925", title: "Guest room kettles — replacement cycle", propertyId: "hie-blr", department: "Housekeeping",
    raisedBy: "lakshmi", raisedOn: "2026-08-04", requiredBy: "2026-09-30", urgency: "low", outcome: "draft",
    justification: "Kettles at end of the 4-year cycle; 20 spare for breakage.",
    approvals: [],
    lines: [
      open("hk-kettle", "Electric kettle 1 L, auto shut-off", "With tray", "pc", 170, 2400),
      open("hk-teatray", "Tea tray set", "Tray, caddy, cup pair", "set", 170, 1250),
    ],
  },
  {
    id: "MR-2627-0926", title: "Housekeeping chemicals — August replenishment", propertyId: "ic-mumbai", department: "Housekeeping",
    raisedBy: "sunil", raisedOn: "2026-08-05", requiredBy: "2026-08-12", urgency: "normal", outcome: "pending",
    justification: "Monthly chemical replenishment; no rate contract in force for chemicals.",
    approvals: [
      { level: 1, by: "rohan", on: "2026-08-05T15:30:00", decision: "APPROVED" },
    ],
    lines: [chem("chem-floor", 80), chem("chem-glass", 50), chem("chem-toilet", 80), chem("chem-sanitiser", 60)],
  },
  {
    id: "MR-2627-0928", title: "Housekeeping chemicals — Q2 replenishment", propertyId: "cp-noida", department: "Housekeeping",
    raisedBy: "pooja", raisedOn: "2026-08-07", requiredBy: "2026-08-24", urgency: "low", outcome: "po_released",
    justification: "Quarterly chemical stock for Metro Greater Noida.",
    callOffs: [{ poId: "108218", on: "2026-08-13T12:00:00" }],
    approvals: [
      { level: 1, by: "pooja", on: "2026-08-07T10:00:00", decision: "APPROVED", auto: true },
      { level: 2, by: "ananya", on: "2026-08-10T12:40:00", decision: "APPROVED", comment: "Ordering against the group chemicals RFQ." },
    ],
    lines: [chem("chem-floor", 200), chem("chem-toilet", 150)],
  },
  {
    id: "MR-2627-0929", title: "Suite floors — bathrobes & bath mats", propertyId: "ic-mumbai", department: "Housekeeping",
    raisedBy: "meera", raisedOn: "2026-08-10", requiredBy: "2026-08-28", urgency: "low", outcome: "pending",
    justification: "Suite floors 15–17: robes and mats below par after the July audit.",
    approvals: [],
    lines: [arc0014("bathrobe", 160), arc0014("bath-mat", 240)],
  },
  {
    id: "MR-2627-0931", title: "Front office uniforms — new intake", propertyId: "ic-mumbai", department: "Front Office",
    raisedBy: "nisha", raisedOn: "2026-08-12", requiredBy: "2026-09-30", urgency: "low", outcome: "approved",
    justification: "44 new front office and concierge staff joining for the festive season.",
    rfq: { id: "535966", title: "Front Office Uniforms — new intake, Workwise Grand", on: "2026-08-12" },
    approvals: [
      { level: 1, by: "nisha", on: "2026-08-12T09:20:00", decision: "APPROVED", auto: true },
      { level: 2, by: "ananya", on: "2026-08-12T12:05:00", decision: "APPROVED", comment: "No uniform contract in force — raising an RFQ." },
    ],
    lines: [
      open("fo-blazer-w", "Front office blazer, women", "House tailoring", "pc", 24, 6800),
      open("fo-blazer-m", "Front office blazer, men", "House tailoring", "pc", 20, 7200),
      open("fo-trouser-m", "Trousers, men", "Poly-wool", "pc", 40, 2400),
      open("fo-trouser-w", "Skirt / trousers, women", "Poly-wool", "pc", 48, 2200),
      open("fo-shirt", "Shirt, white, long-sleeve", "Cotton-rich", "pc", 132, 1350),
      open("fo-tie", "Tie / scarf, house pattern", "Silk blend", "pc", 88, 650),
      open("fo-badge", "Name badge, engraved brass", "Magnetic", "pc", 44, 480),
      open("fo-shoes", "Formal shoes", "Leather", "pair", 44, 3900),
      open("fo-coat", "Overcoat, doorman & concierge", "Wool blend", "pc", 8, 9500),
    ],
  },
  {
    id: "MR-2627-0933", title: "Linen par-stock rebuild — 180 keys", propertyId: "cp-noida", department: "Housekeeping",
    raisedBy: "pooja", raisedOn: "2026-08-12", requiredBy: "2026-09-10", urgency: "low", outcome: "pending",
    justification: "Rebuild to three par across 180 keys after the linen audit. Every line on ARC-2627-0014.",
    approvals: [
      { level: 1, by: "pooja", on: "2026-08-12T09:15:00", decision: "APPROVED", auto: true },
      { level: 2, by: "ananya", on: "2026-08-13T14:30:00", decision: "APPROVED", comment: "All on contract; above ₹25L so it goes to Sameer." },
    ],
    lines: [arc0014("bed-sheet-300", 1080), arc0014("duvet-cover", 540), arc0014("twl-bath-500", 1080), arc0014("twl-hand-500", 1080), arc0014("bath-mat", 540)],
  },
  {
    id: "MR-2627-0935", title: "Towel top-up — monsoon turnover", propertyId: "ic-mumbai", department: "Housekeeping",
    raisedBy: "sunil", raisedOn: "2026-08-13", requiredBy: "2026-08-17", urgency: "urgent", outcome: "pending",
    justification: "Drying time doubled in the monsoon; linen room short of towels for the weekend.",
    approvals: [],
    lines: [arc0014("twl-bath-500", 300), arc0014("twl-hand-500", 400)],
  },
  {
    id: "MR-2627-0936", title: "Guest amenity kits — Diwali occupancy", propertyId: "ic-mumbai", department: "Housekeeping",
    raisedBy: "rohan", raisedOn: "2026-08-13", requiredBy: "2026-10-05", urgency: "low", outcome: "draft",
    justification: "Forecast 94% occupancy across the Diwali fortnight.",
    approvals: [],
    lines: [
      fromThread("amenity-kit", 4000),
      open("hk-dental", "Dental kit", "Brush + 20 g paste", "set", 4000, 18),
      open("hk-shave", "Shaving kit", "Razor + 15 g foam", "set", 1500, 22),
    ],
  },
];

/** Value of a line, and of an MR — always from its lines. */
export const lineValue = (l) => l.qty * l.rate;
export const mrValue = (m) => m.lines.reduce((s, l) => s + lineValue(l), 0);

/* ── the register's summary rows (what register.js has always exported) ── */

const SUMMARY_STATUS = {
  draft: "Draft",
  pending: "Awaiting approval",
  approved: "Approved",
  po_released: "PO released",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const summaryRow = (m) => ({
  id: m.id,
  title: m.title,
  propertyId: m.propertyId,
  department: m.department,
  raisedOn: m.raisedOn,
  lineCount: m.lines.length,
  urgency: m.urgency === "urgent" ? "Urgent" : "Planned",
  status: m.rfq && m.outcome === "approved" ? "Converted to RFQ" : SUMMARY_STATUS[m.outcome],
  value: mrValue(m),
  ...(m.live ? { live: true } : {}),
});

export const threadMrRow = summaryRow(mrRecords.find((m) => m.id === mr.id));
export const otherMrs = mrRecords.filter((m) => m.id !== mr.id).map(summaryRow);
export const allMrs = [threadMrRow, ...otherMrs];
