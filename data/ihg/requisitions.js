import { mr } from "./thread";

/**
 * Material requisitions (MRs) — the register's requisitions, split out of
 * register.js so the MR module owns them. The golden-thread MR is spliced in
 * from thread.js. register.js re-exports everything here.
 */

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
