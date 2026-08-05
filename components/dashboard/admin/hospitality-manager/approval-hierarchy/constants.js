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

// Design system tokens
export const BRAND_PRIMARY = "#2E5BA8";
export const BRAND_SECONDARY = "#428B41";
export const BRAND_ACCENT = "#FFA500";
export const BRAND_DARK = "#1A2730";
export const DS = {
  primary: "#2E5BA8",
  secondary: "#428B41",
  accent: "#FFA500",
  dark: "#1A2730",
  body: "#5B5B5B",
  muted: "#6C757D",
  error: "#DB0A0A",
  inputBg: "#FFFFFF",
  pageBg: "#F8F9FA",
  border: "#D3D3D3",
  card: "#FFFFFF",
  blueTint: "#E3F2FD",
  blueLight: "#F0F4FF",
  greenTint: "#E8F5E8",
  orangeTint: "#FFF3E0",
};

export const PROCESS_TYPE_COLORS = {
  RFQ: "#2E5BA8",
  TENDER: "#428B41",
  ARC: "#FFA500",
};

/** Append hex-alpha to a hex color. Usage: alpha(DS.primary, '40') → '#2E5BA840' */
export const alpha = (hex, a) => `${hex}${a}`;

export const entityTypes = [
  { value: "RFQ", label: "RFQ Approval", description: "Request for Quotation", icon: BsFileEarmarkText, color: "#2E5BA8" },
  { value: "TENDER", label: "Tender Approval", description: "Tender submissions", icon: BsClipboard2Check, color: "#428B41" },
  { value: "PO", label: "Purchase Order Approval", description: "Purchase orders", icon: BsCart4, color: "#7c3aed" },
  { value: "NEGOTIATION", label: "Negotiation Approval", description: "Negotiation rounds", icon: BsChatDots, color: "#ea580c" },
  { value: "NEGOTIATION_QUOTE", label: "Negotiation Quotes Approval", description: "Vendor quote updates", icon: BsChatQuote, color: "#0891b2" },
  { value: "TECHNICAL", label: "Technical Approval", description: "Technical evaluations", icon: BsGear, color: "#64748b" },
  { value: "ARC", label: "ARC Approval", description: "Rate contract publish & base approval", icon: BsShieldCheck, color: "#db2777" },
  // ARC (Rate Contract) v2 per-stage entity types — process-free flow.
  { value: "ARC_TECH", label: "ARC Technical Evaluation", description: "Rate contract technical evaluation approval", icon: BsGear, color: "#0e7490" },
  { value: "ARC_NEGOTIATION", label: "ARC Negotiation", description: "Rate contract negotiation approval", icon: BsChatDots, color: "#ea580c" },
  { value: "ARC_COMMITTEE", label: "ARC Committee Award", description: "Rate contract committee award approval", icon: BsShieldCheck, color: "#db2777" },
  { value: "ARC_AMENDMENT", label: "ARC Amendment", description: "Rate contract post-award amendment approval", icon: BsFileEarmarkText, color: "#7c3aed" },
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

// RFQ route: RFQ → Technical → Negotiation → Negotiation Quote → PO
export const RFQ_PROCESS_STAGES = [
  { value: "RFQ", label: "RFQ", description: "Request for Quotation", shortLabel: "RFQ" },
  { value: "TECHNICAL", label: "Technical", description: "Technical evaluation", shortLabel: "Tech" },
  { value: "NEGOTIATION", label: "Negotiation", description: "Negotiation rounds", shortLabel: "Negotiation" },
  { value: "NEGOTIATION_QUOTE", label: "Negotiation Quote", description: "Vendor quote finalization", shortLabel: "Neg. Quote" },
  { value: "PO", label: "PO", description: "Purchase Order", shortLabel: "PO" },
];

// Tender/ARC route: Tender → Technical → Negotiation → Negotiation Quote → ARC
export const TENDER_PROCESS_STAGES = [
  { value: "TENDER", label: "Tender", description: "Tender submissions", shortLabel: "Tender" },
  { value: "TECHNICAL", label: "Technical", description: "Technical evaluation", shortLabel: "Tech" },
  { value: "NEGOTIATION", label: "Negotiation", description: "Negotiation rounds", shortLabel: "Negotiation" },
  { value: "NEGOTIATION_QUOTE", label: "Negotiation Quote", description: "Vendor quote finalization", shortLabel: "Neg. Quote" },
  { value: "ARC", label: "ARC", description: "ARC Committee Approval", shortLabel: "ARC" },
];

// ARC (Rate Contract) route — a PROCESS-FREE flow. Unlike RFQ/Tender, ARC
// approvals never carry a process_id (ARC entities are created with
// process_id = NULL by design), so this flow saves policies with
// process_id = NULL. `ARC` is the base/publish policy: arcController.publish
// resolves entity_type 'ARC' (hard 400 if absent) and every other ARC stage
// falls back to it when its own policy is missing — so ARC is REQUIRED, the
// rest are optional overrides for granular approver chains.
export const ARC_PROCESS_STAGES = [
  { value: "ARC", label: "ARC (Publish & Base)", description: "Required — gates publishing the rate contract and is the default for every stage below.", shortLabel: "ARC", required: true },
  { value: "ARC_TECH", label: "Technical Evaluation", description: "Approval of technical evaluation results.", shortLabel: "Tech" },
  { value: "ARC_NEGOTIATION", label: "Negotiation", description: "Approval of negotiation rounds.", shortLabel: "Negotiation" },
  { value: "ARC_COMMITTEE", label: "Committee Award", description: "ARC committee approval of finalised awards.", shortLabel: "Committee" },
  { value: "ARC_AMENDMENT", label: "Amendment", description: "Approval of post-award amendments.", shortLabel: "Amendment" },
];

/** Entity types owned by the process-free ARC flow. */
export const ARC_ENTITY_ORDER = ARC_PROCESS_STAGES.map((s) => s.value);
/** True when an entity_type belongs to the ARC (process-free) flow. */
export const isArcEntityType = (entityType) => ARC_ENTITY_ORDER.includes(entityType);

export const PROCESS_TYPES = {
  RFQ: "RFQ",
  TENDER: "TENDER",
  ARC: "ARC",
};

// Flow type — the wizard supports process-based flows (RFQ/Tender) and the
// process-free ARC flow.
export const FLOW_TYPE = { PROCESS: "PROCESS", ARC: "ARC" };

/** Returns the 5-stage config for the given process type. RFQ → RFQ route; TENDER/ARC → Tender route. */
export const getStagesForProcessType = (processType) => {
  const t = (processType || "").toUpperCase();
  return t === "RFQ" ? RFQ_PROCESS_STAGES : TENDER_PROCESS_STAGES;
};

/** Entity type order for the given process type (for building stages from policies). */
export const getStageEntityOrder = (processType) => {
  return getStagesForProcessType(processType).map((s) => s.value);
};

/**
 * Every entity type the wizard can configure, in a stable display order: the RFQ
 * route, then the Tender-route stages it does not share, then the ARC flow.
 */
export const ALL_STAGE_ENTITY_ORDER = [...new Set([
  ...RFQ_PROCESS_STAGES.map((s) => s.value),
  ...TENDER_PROCESS_STAGES.map((s) => s.value),
  ...ARC_PROCESS_STAGES.map((s) => s.value),
])];

/**
 * Stage order for a workflow CARD: the process type's canonical route, followed
 * by any other stage the process actually has a policy for.
 *
 * A process's policies are not guaranteed to stay inside its own route. In
 * production the RFQ-typed process 2 also carries TENDER and ARC policies, and
 * intersecting against the canonical order alone dropped them — the card read
 * "5/5 stages" while the KPI row above it counted 7. Appending keeps the
 * familiar route order intact and guarantees the card can never silently hide a
 * configured policy.
 */
export const getCardStageOrder = (processType, policies = [], isArc = false) => {
  const canonical = isArc ? ARC_ENTITY_ORDER : getStageEntityOrder(processType);
  const present = new Set((policies || []).map((p) => p.entity_type));
  const extra = ALL_STAGE_ENTITY_ORDER.filter((et) => present.has(et) && !canonical.includes(et));
  return [...canonical, ...extra];
};
