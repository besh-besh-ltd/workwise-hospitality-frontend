import { CATEGORY, FY, rfq, lineItems } from "./thread";
import { quotesByVendor } from "./quotes";
import { vendorsById } from "./vendors";
import { itRfq, itLineItems, itVendors } from "./itRfq";

/**
 * The surrounding book of work.
 *
 * The golden thread is one line in a real procurement desk's week. These are
 * the others — enough for the registers to look like a working system, and
 * chosen so that filtering by property visibly changes what is on screen.
 *
 * The live thread record is spliced in at the top of each register from
 * thread.js rather than duplicated, so its numbers can never drift.
 */

/* Rebalanced deliberately: the register used to be 3-of-7 Awarded with every
   open RFQ past its deadline, which read as a closed book and left nothing to
   act on. Now most are live with deadlines ahead of today. */
/**
 * Every RFQ carries its own category, products and invited vendors — the
 * register's filter rail counts those, and without them it renders nothing
 * but the financial-year control.
 */
export const otherRfqs = [
  { id: "535912", title: "Banquet Crockery & Glassware — FY 2026-27", propertyIds: ["ic-mumbai", "cp-noida"], department: "Food & Beverage", status: "Under negotiation", invited: 7, quoted: 5, closesOn: "2026-09-22", value: 12400000 , category: "F&B operating equipment", products: ["Banquet crockery, 12-piece", "Wine glassware set", "Buffet chafing dish"], vendors: ["Welspun Hospitality Solutions", "Orient Craft Hospitality", "GreenLeaf Amenities Pvt Ltd"] },
  { id: "535903", title: "Guest Room Minibar Replenishment — H1", propertyIds: ["ic-mumbai", "voco-corb", "ss-barwara"], department: "Food & Beverage", status: "Under negotiation", invited: 6, quoted: 6, closesOn: "2026-09-26", value: 8600000 , category: "F&B supply", products: ["Minibar soft drinks", "Premium snack assortment", "Bottled water 500ml"], vendors: ["GreenLeaf Amenities Pvt Ltd", "Kaveri Home Textiles"] },
  { id: "535887", title: "Kitchen Exhaust Deep Clean — annual", propertyIds: ["cp-noida", "hie-blr"], department: "Engineering", status: "Awarded", invited: 5, quoted: 3, closesOn: "2026-05-22", value: 3100000 , category: "Engineering services", products: ["Kitchen exhaust duct cleaning", "Grease trap service"], vendors: ["Trident Hometex Ltd", "Solapur Terry Mills"] },
  { id: "535961", title: "Spa Consumables & Therapy Linen", propertyIds: ["ss-barwara", "voco-corb"], department: "Housekeeping", status: "Open", invited: 6, quoted: 2, closesOn: "2026-10-18", value: 5400000 , category: "Housekeeping supply", products: ["Spa therapy linen set", "Aroma oil assortment", "Disposable slippers"], vendors: ["Aarvi Linens & Amenities", "Sriram Textiles Pvt Ltd"] },
  { id: "535958", title: "Uniform Refresh — Front Office & F&B", propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"], department: "Front Office", status: "Open", invited: 8, quoted: 4, closesOn: "2026-10-25", value: 9800000 , category: "Uniforms", products: ["Front office blazer", "F&B service shirt", "Chef jacket"], vendors: ["Orient Craft Hospitality", "Nandan Terry Ltd", "Kaveri Home Textiles"] },
  { id: "535874", title: "Chiller AMC — 3 year", propertyIds: ["ic-mumbai"], department: "Engineering", status: "Quotes received", invited: 4, quoted: 4, closesOn: "2026-10-10", value: 21500000 , category: "Engineering services", products: ["Chiller annual maintenance", "Cooling tower service"], vendors: ["Trident Hometex Ltd", "Welspun Hospitality Solutions"] },
];

/** The live thread, shaped like a register row. */
export const threadRfqRow = {
  id: rfq.id,
  category: CATEGORY,
  title: `${CATEGORY} — ${FY}`,
  propertyIds: rfq.propertyIds,
  department: rfq.department,
  status: rfq.status,
  invited: rfq.invited,
  quoted: rfq.quoted,
  closesOn: rfq.closesOn,
  value: rfq.estimatedValue,
  products: lineItems.map((i) => i.name),
  vendors: Object.keys(quotesByVendor).map((k) => vendorsById[k]?.name).filter(Boolean),
  live: true,
};

/**
 * The IT RFQ, shaped like a register row.
 *
 * Sits beside the thread because it demonstrates the rule the thread cannot:
 * it carries technical clauses, so its quotes stay masked until they are
 * scored. See data/ihg/itRfq.js.
 */
export const itRfqRow = {
  id: itRfq.id,
  category: "IT infrastructure",
  title: itRfq.title,
  propertyIds: itRfq.propertyIds,
  department: itRfq.department,
  status: itRfq.status,
  invited: itRfq.invited,
  quoted: itRfq.quoted,
  closesOn: itRfq.closesOn,
  value: itRfq.estimatedValue,
  products: itLineItems.map((i) => i.name),
  vendors: itVendors.map((v) => v.name),
  live: true,
};

export const allRfqs = [threadRfqRow, itRfqRow, ...otherRfqs];

export * from "./requisitions";
export * from "./contracts";

/** Status → the ported library's status-pill modifier. */
export const statusTone = (status) =>
  ({
    Open: "floated",
    "Quotes received": "eval",
    "Under negotiation": "committee",
    Awarded: "active",
    Draft: "draft",
    "Awaiting approval": "awaiting",
    "In sourcing": "floated",
    "Converted to RFQ": "active",
    active: "active",
    expiring: "expiring",
    draft: "draft",
    "tech-eval": "eval",
  }[status] || "draft");
