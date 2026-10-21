// One vocabulary for approval stages. Every screen that names a stage reads
// from here so the same stage never carries two different names.

const UNIT_SUFFIX = {
  PUBLISH: "Publish Approval",
  TECH: "Technical Approval",
  NEGOTIATION: "Negotiation Round Approval",
  COMMITTEE: "Committee Approval",
  AMENDMENT: "Amendment Approval",
};

const arcLabels = (prefix, keyPrefix, publishKey) => ({
  [publishKey]: `${prefix} · ${UNIT_SUFFIX.PUBLISH}`,
  [`${keyPrefix}TECH`]: `${prefix} · ${UNIT_SUFFIX.TECH}`,
  [`${keyPrefix}NEGOTIATION`]: `${prefix} · ${UNIT_SUFFIX.NEGOTIATION}`,
  [`${keyPrefix}COMMITTEE`]: `${prefix} · ${UNIT_SUFFIX.COMMITTEE}`,
  [`${keyPrefix}AMENDMENT`]: `${prefix} · ${UNIT_SUFFIX.AMENDMENT}`,
});

export const STAGE_LABELS = {
  RFQ: "RFQ Approval",
  TENDER: "Tender Approval",
  TECHNICAL: "Technical Approval",
  NEGOTIATION: "Negotiation Round Approval",
  NEGOTIATION_QUOTE: "Final Vendor Approval",
  PO: "Purchase Order Approval",
  MR: "Material Requisition Approval",
  ARC_COMMERCIAL: "Unit ARC · Commercial Approval",
  ARC_GROUP_COMMERCIAL: "Group ARC · Commercial Approval",
  ...arcLabels("Unit ARC", "ARC_", "ARC"),
  ARC_PUBLISH: `Unit ARC · ${UNIT_SUFFIX.PUBLISH}`,
  ...arcLabels("Group ARC", "ARC_GROUP_", "ARC_GROUP"),
  ARC_GROUP_PUBLISH: `Group ARC · ${UNIT_SUFFIX.PUBLISH}`,
};

const SHORT_BASE = { PUBLISH: "Publish", TECH: "Tech", NEGOTIATION: "Round", COMMITTEE: "Committee", AMENDMENT: "Amend" };

export const STAGE_SHORT = {
  RFQ: "RFQ",
  TENDER: "Tender",
  TECHNICAL: "Tech",
  NEGOTIATION: "Round",
  NEGOTIATION_QUOTE: "Final",
  PO: "PO",
  MR: "MR",
  ARC_COMMERCIAL: "Commercial",
  ARC_GROUP_COMMERCIAL: "Commercial",
  ARC: SHORT_BASE.PUBLISH,
  ARC_PUBLISH: SHORT_BASE.PUBLISH,
  ARC_TECH: SHORT_BASE.TECH,
  ARC_NEGOTIATION: SHORT_BASE.NEGOTIATION,
  ARC_COMMITTEE: SHORT_BASE.COMMITTEE,
  ARC_AMENDMENT: SHORT_BASE.AMENDMENT,
  ARC_GROUP: SHORT_BASE.PUBLISH,
  ARC_GROUP_PUBLISH: SHORT_BASE.PUBLISH,
  ARC_GROUP_TECH: SHORT_BASE.TECH,
  ARC_GROUP_NEGOTIATION: SHORT_BASE.NEGOTIATION,
  ARC_GROUP_COMMITTEE: SHORT_BASE.COMMITTEE,
  ARC_GROUP_AMENDMENT: SHORT_BASE.AMENDMENT,
};

const ARC_DESC = {
  PUBLISH: "Approves the ARC before it is published",
  TECH: "Approves the ARC technical evaluation",
  NEGOTIATION: "Approves an ARC negotiation round before vendors see it",
  COMMITTEE: "Committee approves the ARC award",
  AMENDMENT: "Approves post-award ARC amendments",
};

export const STAGE_DESCRIPTIONS = {
  RFQ: "Approves the RFQ before it is published to vendors",
  TENDER: "Approves the tender before it is published",
  TECHNICAL: "Approves the technical evaluation",
  NEGOTIATION: "Approves a negotiation round before vendors see it",
  NEGOTIATION_QUOTE: "Approves the final vendor and price before the PO",
  PO: "Final sign-off before the purchase order is issued",
  ARC: ARC_DESC.PUBLISH,
  ARC_PUBLISH: ARC_DESC.PUBLISH,
  ARC_TECH: ARC_DESC.TECH,
  ARC_NEGOTIATION: ARC_DESC.NEGOTIATION,
  ARC_COMMITTEE: ARC_DESC.COMMITTEE,
  ARC_AMENDMENT: ARC_DESC.AMENDMENT,
  ARC_GROUP: ARC_DESC.PUBLISH,
  ARC_GROUP_PUBLISH: ARC_DESC.PUBLISH,
  ARC_GROUP_TECH: ARC_DESC.TECH,
  ARC_GROUP_NEGOTIATION: ARC_DESC.NEGOTIATION,
  ARC_GROUP_COMMITTEE: ARC_DESC.COMMITTEE,
  ARC_GROUP_AMENDMENT: ARC_DESC.AMENDMENT,
};

const titleCase = (type) =>
  String(type || "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Unit ARC type -> its Group twin (ARC -> ARC_GROUP, ARC_TECH -> ARC_GROUP_TECH). */
const toGroupType = (type) => {
  if (type === "ARC") return "ARC_GROUP";
  if (type && type.startsWith("ARC_") && !type.startsWith("ARC_GROUP")) return `ARC_GROUP_${type.slice(4)}`;
  return type;
};

export const stageLabel = (type, opts = {}) => {
  const key = opts && opts.isGroup ? toGroupType(type) : type;
  return STAGE_LABELS[key] || titleCase(type);
};

export const stageShortLabel = (type) => STAGE_SHORT[type] || titleCase(type);

export const stageDescription = (type) => STAGE_DESCRIPTIONS[type] || "";
