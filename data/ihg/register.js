import { CATEGORY, FY, rfq, mr, contract } from "./thread";

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
export const otherRfqs = [
  { id: "535912", title: "Banquet Crockery & Glassware — FY 2026-27", propertyIds: ["ic-mumbai", "cp-noida"], department: "Food & Beverage", status: "Under negotiation", invited: 7, quoted: 5, closesOn: "2026-09-22", value: 12400000 },
  { id: "535903", title: "Guest Room Minibar Replenishment — H1", propertyIds: ["ic-mumbai", "voco-corb", "ss-barwara"], department: "Food & Beverage", status: "Under negotiation", invited: 6, quoted: 6, closesOn: "2026-09-26", value: 8600000 },
  { id: "535887", title: "Kitchen Exhaust Deep Clean — annual", propertyIds: ["cp-noida", "hie-blr"], department: "Engineering", status: "Awarded", invited: 5, quoted: 3, closesOn: "2026-05-22", value: 3100000 },
  { id: "535961", title: "Spa Consumables & Therapy Linen", propertyIds: ["ss-barwara", "voco-corb"], department: "Housekeeping", status: "Open", invited: 6, quoted: 2, closesOn: "2026-10-18", value: 5400000 },
  { id: "535958", title: "Uniform Refresh — Front Office & F&B", propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"], department: "Front Office", status: "Open", invited: 8, quoted: 4, closesOn: "2026-10-25", value: 9800000 },
  { id: "535874", title: "Chiller AMC — 3 year", propertyIds: ["ic-mumbai"], department: "Engineering", status: "Quotes received", invited: 4, quoted: 4, closesOn: "2026-10-10", value: 21500000 },
];

/** The live thread, shaped like a register row. */
export const threadRfqRow = {
  id: rfq.id,
  title: `${CATEGORY} — ${FY}`,
  propertyIds: rfq.propertyIds,
  department: rfq.department,
  status: rfq.status,
  invited: rfq.invited,
  quoted: rfq.quoted,
  closesOn: rfq.closesOn,
  value: rfq.estimatedValue,
  live: true,
};

export const allRfqs = [threadRfqRow, ...otherRfqs];

export const otherMrs = [
  { id: "MR-2627-0904", title: "Banquet crockery replacement", propertyId: "cp-noida", department: "Food & Beverage", raisedOn: "2026-06-02", lineCount: 14, urgency: "Planned", status: "Converted to RFQ", value: 4200000 },
  { id: "MR-2627-0912", title: "Pool deck furniture — monsoon damage", propertyId: "voco-corb", department: "Engineering", raisedOn: "2026-07-11", lineCount: 6, urgency: "Urgent", status: "Awaiting approval", value: 1850000 },
  { id: "MR-2627-0918", title: "Spa therapy linen top-up", propertyId: "ss-barwara", department: "Housekeeping", raisedOn: "2026-07-19", lineCount: 5, urgency: "Planned", status: "In sourcing", value: 940000 },
  { id: "MR-2627-0925", title: "Guest room kettles — replacement cycle", propertyId: "hie-blr", department: "Housekeeping", raisedOn: "2026-08-04", lineCount: 2, urgency: "Planned", status: "Draft", value: 620000 },
  { id: "MR-2627-0931", title: "Front office uniforms — new intake", propertyId: "ic-mumbai", department: "Front Office", raisedOn: "2026-08-12", lineCount: 9, urgency: "Planned", status: "In sourcing", value: 1340000 },
];

export const threadMrRow = {
  id: mr.id,
  title: mr.title,
  propertyId: mr.propertyId,
  department: mr.department,
  raisedOn: mr.raisedOn,
  lineCount: mr.lineCount,
  urgency: mr.urgency,
  status: mr.status,
  value: 46331000,
  live: true,
};

export const allMrs = [threadMrRow, ...otherMrs];

export const otherContracts = [
  { id: "ARC-2627-0011", title: "Banquet Crockery & Glassware — FY 2026-27", category: "F&B supply", propertyIds: ["ic-mumbai", "cp-noida"], stage: "active", termStart: "2026-06-01", termEnd: "2027-05-31", value: 12100000 },
  { id: "ARC-2627-0009", title: "Chiller Maintenance — 3 year AMC", category: "Engineering services", propertyIds: ["ic-mumbai"], stage: "active", termStart: "2026-05-01", termEnd: "2029-04-30", value: 21500000 },
  { id: "ARC-2526-0088", title: "Housekeeping Chemicals — FY 2025-26", category: "Housekeeping supply", propertyIds: ["ic-mumbai", "cp-noida", "hie-blr"], stage: "expiring", termStart: "2025-04-01", termEnd: "2026-10-31", value: 6800000 },
  { id: "ARC-2526-0071", title: "Laundry Outsourcing — Bengaluru cluster", category: "Housekeeping services", propertyIds: ["hie-blr"], stage: "expiring", termStart: "2025-07-01", termEnd: "2026-11-30", value: 9400000 },
  { id: "ARC-2627-0016", title: "Uniform Supply — group", category: "Uniforms", propertyIds: ["ic-mumbai", "cp-noida", "hie-blr", "voco-corb", "ss-barwara"], stage: "draft", termStart: "2026-11-01", termEnd: "2027-10-31", value: 9800000 },
];

export const threadContractRow = {
  id: contract.id,
  title: contract.title,
  category: contract.category,
  propertyIds: contract.propertyIds,
  stage: contract.stage,
  termStart: contract.termStart,
  termEnd: contract.termEnd,
  value: contract.value,
  live: true,
};

export const allContracts = [threadContractRow, ...otherContracts];

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
