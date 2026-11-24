import { contract } from "./thread";

/**
 * Rate contracts (ARCs) — the register's contracts, split out of
 * register.js so the rate-contract module owns them. The golden-thread
 * contract is spliced in from thread.js. register.js re-exports everything here.
 */

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
