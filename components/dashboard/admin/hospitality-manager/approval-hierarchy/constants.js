import {
  BsFileEarmarkText,
  BsClipboard2Check,
  BsCart4,
  BsChatDots,
  BsChatQuote,
  BsGear,
  BsShieldCheck,
} from "react-icons/bs";

export const BRAND_TEAL = "#158993";
export const BRAND_TEAL_LIGHT = "#e8f5f6";

export const entityTypes = [
  { value: "RFQ", label: "RFQ Approval", description: "Request for Quotation", icon: BsFileEarmarkText, color: "#2E5BA8" },
  { value: "TENDER", label: "Tender Approval", description: "Tender submissions", icon: BsClipboard2Check, color: "#428B41" },
  { value: "PO", label: "Purchase Order Approval", description: "Purchase orders", icon: BsCart4, color: "#7c3aed" },
  { value: "NEGOTIATION", label: "Negotiation Approval", description: "Negotiation rounds", icon: BsChatDots, color: "#ea580c" },
  { value: "NEGOTIATION_QUOTE", label: "Negotiation Quotes Approval", description: "Vendor quote updates", icon: BsChatQuote, color: "#0891b2" },
  { value: "TECHNICAL", label: "Technical Approval", description: "Technical evaluations", icon: BsGear, color: "#64748b" },
  { value: "ARC", label: "ARC Committee Approval", description: "ARC review & approval", icon: BsShieldCheck, color: "#db2777" },
];

export const approverSourceTypes = [
  { value: "USER", label: "Specific User" },
  { value: "ROLE", label: "User Role" },
];

export const decisionRules = [
  { value: "ANY", label: "Any one person can approve" },
  { value: "ALL", label: "Everyone must approve" },
];

export const getEntityTypeConfig = (value) => {
  return entityTypes.find((e) => e.value === value) || entityTypes[0];
};

// RFQ route: RFQ → Technical → Quote → PO
export const RFQ_PROCESS_STAGES = [
  { value: "RFQ", label: "RFQ", description: "Request for Quotation", shortLabel: "RFQ" },
  { value: "TECHNICAL", label: "Technical", description: "Technical evaluation", shortLabel: "Tech" },
  { value: "NEGOTIATION_QUOTE", label: "Quote", description: "Negotiation quotes", shortLabel: "Quote" },
  { value: "PO", label: "PO", description: "Purchase Order", shortLabel: "PO" },
];

// Tender/ARC route: Tender → Technical → Quote → ARC (replace RFQ with Tender, PO with ARC)
export const TENDER_PROCESS_STAGES = [
  { value: "TENDER", label: "Tender", description: "Tender submissions", shortLabel: "Tender" },
  { value: "TECHNICAL", label: "Technical", description: "Technical evaluation", shortLabel: "Tech" },
  { value: "NEGOTIATION_QUOTE", label: "Quote", description: "Negotiation quotes", shortLabel: "Quote" },
  { value: "ARC", label: "ARC", description: "ARC Committee Approval", shortLabel: "ARC" },
];

export const PROCESS_TYPES = {
  RFQ: "RFQ",
  TENDER: "TENDER",
  ARC: "ARC",
};

/** Returns the 4-stage config for the given process type. RFQ → RFQ route; TENDER/ARC → Tender route. */
export const getStagesForProcessType = (processType) => {
  const t = (processType || "").toUpperCase();
  return t === "RFQ" ? RFQ_PROCESS_STAGES : TENDER_PROCESS_STAGES;
};

/** Entity type order for the given process type (for building stages from policies). */
export const getStageEntityOrder = (processType) => {
  return getStagesForProcessType(processType).map((s) => s.value);
};
