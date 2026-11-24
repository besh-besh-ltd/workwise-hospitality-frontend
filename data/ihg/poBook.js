import { vendorsById } from "./vendors";
import { peopleById, propertiesById } from "./org";

/**
 * The purchase-order book beyond the approval queue.
 *
 * orders.js holds the five orders waiting on an approver (the stand demo's
 * queue). This file is everything else a working procurement desk has on its
 * books on Fri 14 Aug 2026: orders sent and awaiting the vendor, accepted, in
 * transit, delivered and waiting on a GRN, invoiced, paid and closed — plus the
 * two the vendor turned down and the one the approver rejected.
 *
 * The older orders (#107930 … #108102, #108177) are the ones the AI decision
 * memos cite as "last PO" / "still open", at the rates and dates they quote.
 *
 * Suppliers all come from the vendor master (vendors.js); GRN receivers are
 * the property staff named in requisitions.js.
 *
 * Every figure the PO screens show — KPI tiles, tab counts, tracking buckets,
 * analytics charts — is computed from these records by the helpers at the
 * bottom of this file. Nothing is typed twice.
 */

export const GST_PCT = 12;
const r2 = (n) => Math.round(n * 100) / 100;
export const DEMO_TODAY_ISO = "2026-08-14";

export const vendorOf = (id) => vendorsById[id] || null;

/** Who posts the GRN at each property — non-login store staff. */
export const storeKeepers = {
  "ic-mumbai": "Rohan Mehta",
  "cp-noida": "Pooja Sharma",
  "hie-blr": "Lakshmi Iyer",
  "voco-corb": "Harish Negi",
  "ss-barwara": "Kavita Rathore",
};

/** The PO desk executive who raises most orders (see the AI memo's "devika"). */
export const PO_DESK = "Devika Rao";

const taxed = (l) => {
  const value = l.qty * l.rate;
  const tax = r2((value * GST_PCT) / 100);
  return { unit: "pcs", ...l, value, gst: GST_PCT, tax, amount: r2(value + tax) };
};

/* Lifecycle statuses, in the backend's po_status vocabulary. `approved` on a
   book PO means what it means in the product: the VENDOR accepted it. */
const book = (po) => {
  const lines = po.lines.map(taxed);
  const value = r2(lines.reduce((s, l) => s + l.amount, 0));
  const subtotal = lines.reduce((s, l) => s + l.value, 0);
  return {
    raisedBy: "purchase",
    paymentDays: 30,
    savingsPct: 4,
    ...po,
    ref: `PO #${po.id}`,
    book: true,
    lines,
    value,
    subtotal,
    tax: r2(value - subtotal),
  };
};

export const bookPos = [
  /* ── last financial year, closed — the orders the AI memos cite ── */
  book({ id: "107930", title: "Bed linen replenishment — Metro Greater Noida", propertyId: "cp-noida", vendorId: "trident", dept: "Housekeeping",
    rfq: { number: "536118", title: "Bed linen replenishment — Greater Noida, H2 FY 2025-26" }, approverId: "regional",
    lines: [{ name: "Bed Sheet 300 TC", qty: 700, rate: 1007 }, { name: "Duvet Cover 300 TC", qty: 240, rate: 1386 }],
    status: "completed", raisedOn: "2025-12-12", approvedOn: "2025-12-15", sentOn: "2025-12-15", acceptedOn: "2025-12-16",
    expectedOn: "2026-01-14", dispatchedOn: "2026-01-19", deliveredOn: "2026-01-23", grnOn: "2026-01-24", invoiceOn: "2026-01-26", paidOn: "2026-02-25",
    note: "Landed 9 days late on a 30-day promise" }),
  book({ id: "107991", title: "Bath towel replenishment — Workwise Grand", propertyId: "ic-mumbai", vendorId: "sriram", dept: "Housekeeping",
    rfq: { number: "536151", title: "Bath towels — Workwise Grand, Q4 FY 2025-26" }, approverId: "finance", paymentDays: 45,
    lines: [{ name: "Bath Towel 500 GSM", qty: 1100, rate: 438 }],
    status: "completed", raisedOn: "2026-01-09", approvedOn: "2026-01-10", sentOn: "2026-01-10", acceptedOn: "2026-01-11",
    expectedOn: "2026-01-30", dispatchedOn: "2026-01-24", deliveredOn: "2026-01-28", grnOn: "2026-01-29", invoiceOn: "2026-01-30", paidOn: "2026-03-16" }),
  book({ id: "108041", title: "Spa therapy linen — Fort Barwara", propertyId: "ss-barwara", vendorId: "sriram", dept: "Housekeeping",
    rfq: { number: "536188", title: "Spa therapy linen — Fort Barwara, 3-bidder round" }, approverId: "regional", paymentDays: 45, savingsPct: 6, savingsVia: "comparison",
    lines: [{ name: "Spa therapy linen set", qty: 300, rate: 394, unit: "sets" }],
    status: "completed", raisedOn: "2026-02-19", approvedOn: "2026-02-20", sentOn: "2026-02-20", acceptedOn: "2026-02-21",
    expectedOn: "2026-03-12", dispatchedOn: "2026-03-06", deliveredOn: "2026-03-10", grnOn: "2026-03-11", invoiceOn: "2026-03-12", paidOn: "2026-04-26" }),
  book({ id: "108058", title: "Bath towel replenishment — first half", propertyId: "ic-mumbai", vendorId: "nandan", dept: "Housekeeping",
    rfq: { number: "536196", title: "Bath towel replenishment — Workwise Grand" }, approverId: "finance",
    lines: [{ name: "Bath Towel 500 GSM", qty: 1554, rate: 400 }],
    status: "completed", raisedOn: "2026-02-28", approvedOn: "2026-03-02", sentOn: "2026-03-02", acceptedOn: "2026-03-03",
    expectedOn: "2026-03-25", dispatchedOn: "2026-03-18", deliveredOn: "2026-03-22", grnOn: "2026-03-23", invoiceOn: "2026-03-24", paidOn: "2026-04-23",
    note: "Landed 3 days early, zero rejections at GRN" }),
  book({ id: "108102", title: "Bath linen — Rooms & Spa, H1", propertyId: "ic-mumbai", vendorId: "welspun", dept: "Housekeeping",
    rfq: { number: "536214", title: "Linen replenishment — Rooms & Spa, H1 FY 2026-27" }, approverId: "finance",
    lines: [{ name: "Bath Towel 500 GSM", qty: 900, rate: 800 }, { name: "Bath Mat 900 GSM", qty: 400, rate: 210 }],
    status: "completed", raisedOn: "2026-03-14", approvedOn: "2026-03-16", sentOn: "2026-03-16", acceptedOn: "2026-03-17",
    expectedOn: "2026-04-06", dispatchedOn: "2026-03-31", deliveredOn: "2026-04-04", grnOn: "2026-04-06", invoiceOn: "2026-04-07", paidOn: "2026-05-07" }),

  /* ── FY 2026-27, closed ── */
  book({ id: "108118", title: "Housekeeping chemicals — Q1", propertyId: "hie-blr", vendorId: "chemclean", dept: "Housekeeping",
    rfq: { number: "536044", title: "Housekeeping chemicals — group, FY 2026-27" }, approverId: "regional", savingsVia: "negotiation",
    lines: [{ name: "Floor cleaner concentrate, pH-neutral 5 L", qty: 240, rate: 1240, unit: "cans" }, { name: "Toilet bowl cleaner, acidic 5 L", qty: 180, rate: 980, unit: "cans" }, { name: "Glass & mirror cleaner 5 L", qty: 120, rate: 860, unit: "cans" }],
    status: "completed", raisedOn: "2026-04-08", approvedOn: "2026-04-09", sentOn: "2026-04-09", acceptedOn: "2026-04-10",
    expectedOn: "2026-04-20", dispatchedOn: "2026-04-15", deliveredOn: "2026-04-18", grnOn: "2026-04-19", invoiceOn: "2026-04-20", paidOn: "2026-05-20" }),
  book({ id: "108126", title: "Guest amenity kits — Riverside Corbett", propertyId: "voco-corb", vendorId: "greenleaf", dept: "Housekeeping",
    rfq: { number: "536242", title: "Guest amenities — Riverside Corbett, H1" }, approverId: "regional", savingsVia: "comparison",
    lines: [{ name: "Guest Amenity Kit", qty: 4000, rate: 148, unit: "sets" }],
    status: "completed", raisedOn: "2026-04-22", approvedOn: "2026-04-23", sentOn: "2026-04-23", acceptedOn: "2026-04-24",
    expectedOn: "2026-05-12", dispatchedOn: "2026-05-06", deliveredOn: "2026-05-11", grnOn: "2026-05-12", invoiceOn: "2026-05-13", paidOn: "2026-06-12" }),
  book({ id: "108139", title: "Kitchen exhaust deep clean — Metro Greater Noida", propertyId: "cp-noida", vendorId: "ductpro", dept: "Engineering",
    rfq: { number: "535887", id: "535887", title: "Kitchen Exhaust Deep Clean — annual" }, approverId: "regional", savingsVia: "negotiation",
    lines: [{ name: "Kitchen exhaust duct deep clean", qty: 4, rate: 62000, unit: "kitchens" }, { name: "Grease trap service", qty: 4, rate: 9500, unit: "units" }],
    status: "completed", raisedOn: "2026-05-11", approvedOn: "2026-05-12", sentOn: "2026-05-12", acceptedOn: "2026-05-13",
    expectedOn: "2026-05-30", dispatchedOn: "2026-05-27", deliveredOn: "2026-05-29", grnOn: "2026-05-30", invoiceOn: "2026-06-01", paidOn: "2026-07-01" }),
  book({ id: "108147", title: "Banquet crockery — Workwise Grand", propertyId: "ic-mumbai", vendorId: "hotelware", dept: "Food & Beverage",
    rfq: { number: "535912", id: "535912", title: "Banquet Crockery & Glassware — FY 2026-27" }, approverId: "finance", savingsVia: "negotiation",
    lines: [{ name: "Dinner plate 27 cm, bone china", qty: 1200, rate: 468 }, { name: "Quarter plate 19 cm, bone china", qty: 1200, rate: 279 }, { name: "Soup bowl 350 ml", qty: 1000, rate: 261 }],
    status: "completed", raisedOn: "2026-06-03", approvedOn: "2026-06-04", sentOn: "2026-06-04", acceptedOn: "2026-06-05",
    expectedOn: "2026-06-24", dispatchedOn: "2026-06-18", deliveredOn: "2026-06-22", grnOn: "2026-06-23", invoiceOn: "2026-06-24", paidOn: "2026-07-24" }),

  /* ── invoiced, payment due ── */
  book({ id: "108152", title: "Chiller AMC — Q1 service, Workwise Grand", propertyId: "ic-mumbai", vendorId: "aerotherm", dept: "Engineering",
    rfq: { number: "535874", id: "535874", title: "Chiller AMC — 3 year" }, approverId: "finance", savingsPct: 0,
    lines: [{ name: "Chiller AMC — quarterly service (May–Jul)", qty: 1, rate: 1600000, unit: "quarter" }],
    status: "invoice_raised", raisedOn: "2026-06-10", approvedOn: "2026-06-11", sentOn: "2026-06-11", acceptedOn: "2026-06-12",
    expectedOn: "2026-07-31", deliveredOn: "2026-07-31", grnOn: "2026-08-03", invoiceOn: "2026-08-04", invoiceNo: "CS/26-27/0418" }),
  book({ id: "108163", title: "Pillow covers & sheets — City Express Whitefield", propertyId: "hie-blr", vendorId: "kaveri", dept: "Housekeeping",
    rfq: { number: "536268", title: "Bed linen top-up — Whitefield" }, approverId: "regional", savingsVia: "comparison",
    lines: [{ name: "Pillow Cover 300 TC", qty: 2400, rate: 236 }, { name: "Bed Sheet 300 TC", qty: 300, rate: 1040 }],
    status: "invoice_raised", raisedOn: "2026-06-18", approvedOn: "2026-06-19", sentOn: "2026-06-19", acceptedOn: "2026-06-20",
    expectedOn: "2026-07-10", dispatchedOn: "2026-07-05", deliveredOn: "2026-07-09", grnOn: "2026-07-10", invoiceOn: "2026-07-11", invoiceNo: "KHT/1127" }),
  book({ id: "108166", title: "Pre-opening linen — river-view wing", propertyId: "voco-corb", vendorId: "trident", dept: "Housekeeping",
    rfq: { number: "536281", title: "Pre-opening linen — Riverside Corbett new wing" }, approverId: "regional", savingsPct: 7, savingsVia: "negotiation",
    lines: [{ name: "Bed Sheet 300 TC", qty: 1100, rate: 1059 }, { name: "Duvet Cover 300 TC", qty: 600, rate: 1386 }, { name: "Pillow Cover 300 TC", qty: 2200, rate: 236 }],
    status: "invoice_raised", raisedOn: "2026-07-02", approvedOn: "2026-07-05", sentOn: "2026-07-05", acceptedOn: "2026-07-07",
    expectedOn: "2026-07-25", dispatchedOn: "2026-07-22", deliveredOn: "2026-07-28", grnOn: "2026-07-29", invoiceOn: "2026-07-30", invoiceNo: "THL/INV/22871" }),

  /* ── goods received, invoice awaited ── */
  book({ id: "108184", title: "Kitchen exhaust deep clean — City Express Whitefield", propertyId: "hie-blr", vendorId: "ductpro", dept: "Engineering",
    rfq: { number: "535887", id: "535887", title: "Kitchen Exhaust Deep Clean — annual" }, approverId: "regional", savingsVia: "negotiation",
    lines: [{ name: "Kitchen exhaust duct deep clean", qty: 3, rate: 62000, unit: "kitchens" }, { name: "Grease trap service", qty: 3, rate: 9500, unit: "units" }],
    status: "GRN", raisedOn: "2026-07-14", approvedOn: "2026-07-15", sentOn: "2026-07-15", acceptedOn: "2026-07-16",
    expectedOn: "2026-08-10", dispatchedOn: "2026-08-06", deliveredOn: "2026-08-08", grnOn: "2026-08-10" }),
  book({ id: "108196", title: "Bathrobes & hand towels — Riverside Corbett", propertyId: "voco-corb", vendorId: "welspun", dept: "Housekeeping",
    rfq: { number: "536366", title: "Bathrobes — Riverside Corbett" }, approverId: "regional",
    lines: [{ name: "Bathrobe Waffle", qty: 180, rate: 1120 }, { name: "Hand Towel 500 GSM", qty: 600, rate: 175 }],
    status: "GRN", raisedOn: "2026-07-24", approvedOn: "2026-07-25", sentOn: "2026-07-25", acceptedOn: "2026-07-27",
    expectedOn: "2026-08-10", dispatchedOn: "2026-08-03", deliveredOn: "2026-08-07", grnOn: "2026-08-08" }),

  /* ── delivered, GRN not yet posted ── */
  book({ id: "108201", title: "Guest amenity kits — Workwise Grand", propertyId: "ic-mumbai", vendorId: "greenleaf", dept: "Housekeeping",
    rfq: { number: "536371", title: "Guest amenities — Workwise Grand, Q2" }, approverId: "finance", savingsVia: "comparison",
    lines: [{ name: "Guest Amenity Kit", qty: 6800, rate: 148, unit: "sets" }],
    status: "delivered", raisedOn: "2026-08-04", approvedOn: "2026-08-05", sentOn: "2026-08-05", acceptedOn: "2026-08-05",
    expectedOn: "2026-08-09", dispatchedOn: "2026-08-07", deliveredOn: "2026-08-10" }),
  book({ id: "108207", title: "Banquet crockery — Metro Greater Noida", propertyId: "cp-noida", vendorId: "hotelware", dept: "Food & Beverage",
    rfq: { number: "535912", id: "535912", title: "Banquet Crockery & Glassware — FY 2026-27" }, approverId: "regional", savingsVia: "negotiation", mr: "MR-2627-0904",
    lines: [{ name: "Dinner plate 27 cm, bone china", qty: 800, rate: 468 }, { name: "Soup bowl 350 ml", qty: 600, rate: 261 }, { name: "Quarter plate 19 cm, bone china", qty: 800, rate: 279 }],
    status: "delivered", raisedOn: "2026-08-06", approvedOn: "2026-08-07", sentOn: "2026-08-07", acceptedOn: "2026-08-08",
    expectedOn: "2026-08-18", dispatchedOn: "2026-08-11", deliveredOn: "2026-08-13" }),

  /* ── in transit ── */
  book({ id: "108188", title: "Service uniforms — Fort Barwara", propertyId: "ss-barwara", vendorId: "stitchline", dept: "Front Office",
    rfq: { number: "536360", title: "Monsoon service uniforms — Fort Barwara" }, approverId: "regional", savingsVia: "alt",
    lines: [{ name: "F&B service shirt", qty: 120, rate: 1450 }, { name: "Front office blazer", qty: 40, rate: 4800 }],
    status: "dispatched", raisedOn: "2026-07-20", approvedOn: "2026-07-21", sentOn: "2026-07-21", acceptedOn: "2026-07-23",
    expectedOn: "2026-08-10", dispatchedOn: "2026-08-06" }),
  book({ id: "108209", title: "Bed sheets — Riverside Corbett", propertyId: "voco-corb", vendorId: "trident", dept: "Housekeeping",
    rfq: { number: "536392", title: "Bed sheets — Riverside Corbett, Q2" }, approverId: "regional",
    lines: [{ name: "Bed Sheet 300 TC", qty: 400, rate: 1059 }],
    status: "dispatched", raisedOn: "2026-08-07", approvedOn: "2026-08-08", sentOn: "2026-08-08", acceptedOn: "2026-08-10",
    expectedOn: "2026-08-19", dispatchedOn: "2026-08-12" }),
  book({ id: "108213", title: "Pool towels — Workwise Grand", propertyId: "ic-mumbai", vendorId: "nandan", dept: "Housekeeping",
    rfq: { number: "536401", title: "Pool towels — Workwise Grand" }, approverId: "finance",
    lines: [{ name: "Pool Towel 400 GSM", qty: 500, rate: 290 }],
    status: "dispatched", raisedOn: "2026-08-10", approvedOn: "2026-08-11", sentOn: "2026-08-11", acceptedOn: "2026-08-11",
    expectedOn: "2026-08-17", dispatchedOn: "2026-08-13" }),

  /* ── accepted by the vendor, not yet dispatched ── */
  book({ id: "108177", title: "Spa therapy linen — Workwise Grand", propertyId: "ic-mumbai", vendorId: "aarvi", dept: "Housekeeping",
    rfq: { number: "536352", title: "Spa therapy linen — Workwise Grand, Q2" }, approverId: "finance",
    lines: [{ name: "Spa therapy linen set", qty: 600, rate: 412, unit: "sets" }],
    status: "approved", raisedOn: "2026-07-28", approvedOn: "2026-07-29", sentOn: "2026-07-29", acceptedOn: "2026-07-31",
    expectedOn: "2026-08-20" }),
  book({ id: "108211", title: "Bath mats — City Express Whitefield", propertyId: "hie-blr", vendorId: "nandan", dept: "Housekeeping",
    rfq: { number: "536399", title: "Bath mats — Whitefield" }, approverId: "regional",
    lines: [{ name: "Bath Mat 900 GSM", qty: 600, rate: 360 }],
    status: "approved", raisedOn: "2026-08-10", approvedOn: "2026-08-11", sentOn: "2026-08-11", acceptedOn: "2026-08-12",
    expectedOn: "2026-08-26" }),

  /* ── sent, awaiting the vendor's acceptance ── */
  book({ id: "108218", title: "Housekeeping chemicals — Q2", propertyId: "cp-noida", vendorId: "chemclean", dept: "Housekeeping",
    rfq: { number: "536044", title: "Housekeeping chemicals — group, FY 2026-27" }, approverId: "regional", savingsVia: "negotiation",
    lines: [{ name: "Floor cleaner concentrate, pH-neutral 5 L", qty: 200, rate: 1240, unit: "cans" }, { name: "Toilet bowl cleaner, acidic 5 L", qty: 150, rate: 980, unit: "cans" }],
    status: "acceptance_pending", raisedOn: "2026-08-12", approvedOn: "2026-08-13", sentOn: "2026-08-13", expectedOn: "2026-08-24" }),
  book({ id: "108226", title: "Bed linen — Fort Barwara", propertyId: "ss-barwara", vendorId: "kaveri", dept: "Housekeeping",
    rfq: { number: "536411", title: "Bed linen — Fort Barwara" }, approverId: "regional",
    lines: [{ name: "Bed Sheet 300 TC", qty: 240, rate: 1040 }, { name: "Pillow Cover 300 TC", qty: 480, rate: 236 }],
    status: "acceptance_pending", raisedOn: "2026-08-13", approvedOn: "2026-08-14", sentOn: "2026-08-14", expectedOn: "2026-09-02" }),

  /* ── rejected by the vendor — needs reassigning ── */
  book({ id: "108203", title: "Banquet crockery — festive banquets", propertyId: "ic-mumbai", vendorId: "clayfire", dept: "Food & Beverage",
    rfq: { number: "535912", id: "535912", title: "Banquet Crockery & Glassware — FY 2026-27" }, approverId: "finance",
    lines: [{ name: "Dinner plate 27 cm, bone china", qty: 1200, rate: 468 }, { name: "Quarter plate 19 cm, bone china", qty: 600, rate: 279 }],
    status: "rejected_by_vendor", raisedOn: "2026-08-05", approvedOn: "2026-08-06", sentOn: "2026-08-06", expectedOn: "2026-08-20",
    vendorRejectedOn: "2026-08-08T11:20:00.000Z",
    vendorRejectReason: "Kiln capacity is fully committed to festive-season orders until 30 Sep — cannot supply 1,200 dinner plates by the 20 Aug event date." }),
  book({ id: "108221", title: "Hand towels — Riverside Corbett", propertyId: "voco-corb", vendorId: "sriram", dept: "Housekeeping",
    rfq: { number: "536404", title: "Hand towels — Riverside Corbett" }, approverId: "regional", paymentDays: 45,
    lines: [{ name: "Hand Towel 500 GSM", qty: 900, rate: 158 }],
    status: "rejected_by_vendor", raisedOn: "2026-08-11", approvedOn: "2026-08-12", sentOn: "2026-08-12", expectedOn: "2026-08-28",
    vendorRejectedOn: "2026-08-13T15:05:00.000Z",
    vendorRejectReason: "Price no longer valid — the quote lapsed on 31 Jul and yarn is up 8.4% since. Can supply at ₹172.00/pc only." }),

  /* ── rejected by the approver ── */
  book({ id: "108199", title: "Bathrobes — spot buy, Workwise Grand", propertyId: "ic-mumbai", vendorId: "welspun", dept: "Housekeeping",
    rfq: { number: "536384", title: "Bathrobes — Workwise Grand, spot" }, approverId: "finance",
    lines: [{ name: "Bathrobe Waffle", qty: 220, rate: 1240 }],
    status: "rejected", raisedOn: "2026-08-03", rejectedOn: "2026-08-04T12:10:00.000Z",
    rejectReason: "Bathrobes are already in the annual linen RFQ #535944. Wait for that contract and call off against it instead of a spot buy at ₹1,240.00." }),
];

export const bookPosById = Object.fromEntries(bookPos.map((p) => [p.id, p]));

/* ── reading the book ───────────────────────────────────────────── */

const DAY = 86400000;
const day = (d) => new Date(`${String(d).slice(0, 10)}T00:00:00.000Z`).getTime();
export const iso = (d) => (!d ? null : String(d).includes("T") ? d : `${d}T10:00:00.000Z`);
const isRejection = (decision) => String(decision || "").startsWith("reject");
export const SIGN_LIMIT = 2500000;

/** The properties a persona's PO screens cover. A requisitioner sees their own; desk and approvers see the group. */
export const scopeFor = (personaId) => {
  const p = peopleById[personaId];
  if (!p) return Object.keys(propertiesById);
  return p.can.approvePO || p.can.runSourcing ? Object.keys(propertiesById) : p.propertyIds;
};

/**
 * The five queue orders (from orders.js) as book-shaped records, with the
 * session's decision applied: an approval in the demo moves the order on.
 */
const queueRecord = (po, decision) => {
  const rejected = decision && isRejection(decision.decision);
  const at = decision?.at || null;
  return {
    ...po,
    dept: "Housekeeping",
    status: !decision ? "pending_approval" : rejected ? "rejected" : "approved_internal",
    approvedOn: decision && !rejected ? at : null,
    rejectedOn: rejected ? at : null,
    rejectReason: rejected ? decision.remarks || null : null,
    expectedOn: po.dates?.delivery || null,
    paymentDays: po.dates?.paymentDays || 30,
    savingsPct: 0,
  };
};

/** Every PO on the books, newest first, in a persona's scope. */
export const allPoRecords = (pendingPos = [], decisions = {}, personaId = null) => {
  const scope = personaId ? scopeFor(personaId) : Object.keys(propertiesById);
  return [...pendingPos.map((p) => queueRecord(p, decisions[p.id])), ...bookPos]
    .filter((p) => scope.includes(p.propertyId))
    .sort((a, b) => String(b.raisedOn).localeCompare(String(a.raisedOn)) || Number(b.id) - Number(a.id));
};

export const STATUS_TEXT = {
  pending_approval: "Pending approval",
  approved_internal: "Approved",
  acceptance_pending: "Awaiting vendor",
  approved: "Accepted by vendor",
  dispatched: "Dispatched",
  delivered: "Delivered",
  GRN: "Goods received",
  invoice_raised: "Invoice raised",
  completed: "Completed",
  rejected: "Rejected",
  rejected_by_vendor: "Rejected by vendor",
};

/** The register's tab buckets. "Approved" is everything past internal approval. */
export const APPROVED_STATUSES = new Set(["approved_internal", "acceptance_pending", "approved", "dispatched", "delivered", "GRN", "invoice_raised", "completed"]);
export const REJECTED_STATUSES = new Set(["rejected", "rejected_by_vendor"]);
/** Counts as spend: raised and not turned down (pending approval included, as the product counts it). */
export const isSpend = (p) => !REJECTED_STATUSES.has(p.status);
/** Committed: approved and still going ahead. */
export const isCommitted = (p) => APPROVED_STATUSES.has(p.status);

/* ── tracking ───────────────────────────────────────────────────── */

export const TRACKING_STAGES = [
  { key: "approved", label: "Approved" },
  { key: "sent", label: "PO sent" },
  { key: "ack", label: "Vendor acknowledged" },
  { key: "dispatched", label: "Dispatched" },
  { key: "delivered", label: "Delivered" },
  { key: "grn", label: "GRN received" },
  { key: "invoiced", label: "Invoiced" },
  { key: "paid", label: "Paid" },
];

const STAGE_INDEX = { approved_internal: 0, acceptance_pending: 1, approved: 2, dispatched: 3, delivered: 4, GRN: 5, invoice_raised: 6, completed: 7 };
export const isTrackable = (p) => p.status in STAGE_INDEX;

export const paymentDueOn = (p) => (p.invoiceOn ? new Date(day(p.invoiceOn) + p.paymentDays * DAY).toISOString().slice(0, 10) : null);

/** Delivery is late once the expected date has passed with no GRN. */
export const isGrnOverdue = (p, today = DEMO_TODAY_ISO) =>
  isTrackable(p) && STAGE_INDEX[p.status] < 5 && STAGE_INDEX[p.status] >= 2 && !!p.expectedOn && day(p.expectedOn) < day(today);

export const trackingOf = (p, today = DEMO_TODAY_ISO) => {
  if (!isTrackable(p)) return null;
  const idx = STAGE_INDEX[p.status];
  const when = [p.approvedOn, p.sentOn, p.acceptedOn, p.dispatchedOn, p.deliveredOn, p.grnOn, p.invoiceOn, p.paidOn];
  const completed = p.status === "completed";
  const due = paymentDueOn(p);
  const payOverdue = !completed && !!due && day(due) < day(today);
  const grnOverdue = isGrnOverdue(p, today);
  const eta = idx < 5 ? p.expectedOn : completed ? p.paidOn : due;
  let etaLabel = idx < 4 ? `expected ${p.expectedOn ? "" : "—"}` : "";
  if (grnOverdue) etaLabel = `${Math.round((day(today) - day(p.expectedOn)) / DAY)}d past expected delivery`;
  else if (idx === 4) etaLabel = "delivered · GRN pending";
  else if (idx < 4) etaLabel = "expected delivery";
  else if (completed) etaLabel = "paid";
  else if (payOverdue) etaLabel = `payment ${Math.round((day(today) - day(due)) / DAY)}d overdue`;
  else if (idx === 6) etaLabel = "payment due";
  else etaLabel = "awaiting invoice";
  return {
    current_stage: TRACKING_STAGES[idx].key,
    progress: Math.round((idx / (TRACKING_STAGES.length - 1)) * 100),
    stages: TRACKING_STAGES.map((s, i) => ({
      key: s.key,
      label: s.label,
      when: i <= idx ? iso(when[i]) : null,
      status: i < idx || completed ? "done" : i === idx ? "current" : "pending",
    })),
    grn_status: idx >= 5 ? "done" : grnOverdue ? "overdue" : "pending",
    invoice_status: idx >= 6 ? "done" : "pending",
    payment_status: completed ? "done" : payOverdue ? "overdue" : "pending",
    eta_delivery: eta ? iso(eta) : null,
    eta_label: etaLabel,
    overdue: grnOverdue || payOverdue,
    completed,
  };
};

/* ── what other areas read (dashboard contract) ─────────────────── */

const waitingHours = (p, today = DEMO_TODAY_ISO) =>
  p.pendingDays != null ? p.pendingDays * 24 : Math.max(0, Math.round((day(today) - day(p.raisedOn)) / 3600000));

/**
 * POs waiting on this persona's approval, in the PendingApprovalsModal shape.
 * Pass the session's decisions (demoSession.poDecisions) so a PO approved in
 * the demo leaves the list.
 */
export const pendingApprovalsFor = (personaId, pendingPos = [], decisions = {}) => {
  const p = peopleById[personaId];
  if (!p || !p.can.approvePO) return [];
  return pendingPos
    .filter((po) => !decisions[po.id])
    .filter((po) => (po.chain || []).some((c) => (c.personIds || [c.personId]).includes(personaId) && c.state === "pending"))
    .map((po) => ({
      entity_type: "PO",
      entity_id: Number(po.id),
      entity_title: `${po.ref} · ${po.title}`,
      metadata: { rfq_number: po.rfq?.number, rfq_id: po.rfq?.id, rfq_title: po.rfq?.title },
      waiting_hours: waitingHours(po),
      hotel_name: propertiesById[po.propertyId]?.name,
    }));
};

const rejectedRow = (p) => ({
  po_id: Number(p.id),
  po_number: p.id,
  rfq_id: Number(p.rfq?.id || p.rfq?.number),
  rfq_no: p.rfq?.number,
  rfq_title: p.rfq?.title,
  vendor_company: vendorOf(p.vendorId)?.name,
  vendor_name: vendorOf(p.vendorId)?.name,
  hotel_name: propertiesById[p.propertyId]?.name,
  po_value: p.value,
  rejected_at: p.vendorRejectedOn,
  reason: p.vendorRejectReason,
});

/** POs the vendor turned down that the desk has to reassign (GET /dashboard-v2/rejected-pos rows). */
export const vendorRejectedPos = (personaId = null) =>
  bookPos.filter((p) => p.status === "rejected_by_vendor" && (!personaId || scopeFor(personaId).includes(p.propertyId))).map(rejectedRow);

/** POs sent to vendors and awaiting their acceptance ("PO pending" on the action centre). */
export const posAwaitingAcceptance = (personaId = null) =>
  bookPos.filter((p) => p.status === "acceptance_pending" && (!personaId || scopeFor(personaId).includes(p.propertyId)));

const inMonth = (d, ym) => !!d && String(d).slice(0, 7) === ym;

/** POs whose internal approval landed this month (Aug 2026), session approvals included. */
export const approvedThisMonth = (pendingPos = [], decisions = {}, personaId = null, ym = DEMO_TODAY_ISO.slice(0, 7)) =>
  allPoRecords(pendingPos, decisions, personaId).filter((p) => p.status !== "rejected" && inMonth(p.approvedOn, ym));

/**
 * Notification-worthy PO events for a persona, newest first:
 * [{ at, title, message, link, kind }].
 */
export const activityFor = (personaId, pendingPos = [], decisions = {}) => {
  const p = peopleById[personaId];
  if (!p) return [];
  const recs = allPoRecords(pendingPos, decisions, personaId);
  const link = (po) => `/dashboard/buyer/purchase-orders/${po.id}`;
  const vname = (po) => vendorOf(po.vendorId)?.name || "Vendor";
  const out = [];
  recs.forEach((po) => {
    const prop = propertiesById[po.propertyId]?.shortName;
    if (po.status === "pending_approval" && p.can.approvePO)
      out.push({ at: iso(po.raisedOn), title: `${po.ref} needs your approval`, message: `${po.title} · ${vname(po)} · ${prop}`, link: link(po), kind: "po_approval" });
    if (po.status === "rejected_by_vendor" && (p.can.runSourcing || p.can.approvePO))
      out.push({ at: po.vendorRejectedOn, title: `${vname(po)} rejected ${po.ref}`, message: `${po.vendorRejectReason} Reassign to another vendor.`, link: `/dashboard/buyer/purchase-order?rfq=${po.rfq?.id || po.rfq?.number}&po=${po.id}`, kind: "po_vendor_rejected" });
    if (po.status === "rejected" && po.rejectedOn && !po.pendingDays)
      out.push({ at: po.rejectedOn, title: `${po.ref} was rejected`, message: po.rejectReason || po.title, link: link(po), kind: "po_rejected" });
    if (po.acceptedOn && day(po.acceptedOn) >= day(DEMO_TODAY_ISO) - 7 * DAY && p.can.runSourcing)
      out.push({ at: iso(po.acceptedOn), title: `${vname(po)} accepted ${po.ref}`, message: `${po.title} · expected ${po.expectedOn}`, link: link(po), kind: "po_accepted" });
    if (isGrnOverdue(po))
      out.push({ at: iso(po.deliveredOn || po.expectedOn), title: `GRN overdue on ${po.ref}`, message: `${po.title} was due ${po.expectedOn} and has no goods receipt yet.`, link: "/dashboard/buyer/purchase-orders/tracking", kind: "po_grn_overdue" });
    if (po.status === "delivered" && !isGrnOverdue(po))
      out.push({ at: iso(po.deliveredOn), title: `${po.ref} delivered — post the GRN`, message: `${po.title} reached ${prop}.`, link: link(po), kind: "po_delivered" });
  });
  return out.filter((e) => e.at).sort((a, b) => String(b.at).localeCompare(String(a.at)));
};

export default bookPos;
