// Reason and person vocabulary for PO send-backs. Labels are the client-facing
// copy and must match the backend codes exactly.

export const REASON_LABELS = {
  EVIDENCE_MISSING: "Photos or documents missing",
  INFO_MISSING: "Need more details or justification",
  TECH_QUERY: "Question on the technical evaluation",
  PRICE_TAX_QUERY: "Question on price, GST or calculation",
  QTY_SPEC_CHANGE: "Quantity or specification needs a change",
  RENEGOTIATE: "Re-negotiate or change the vendor",
  NOT_REQUIRED: "Not needed any more",
  OTHER: "Something else",
};

export const TARGET_LABELS = {
  RFQ_CREATOR: "RFQ creator",
  PO_INITIATOR: "PO creator",
  COMMERCIAL_EVALUATOR: "Commercial evaluator",
  TECHNICAL_EVALUATOR: "Technical evaluator",
};

// The six reasons that are questions. Asking for info is offered for these.
export const INFO_REASONS = [
  "EVIDENCE_MISSING",
  "INFO_MISSING",
  "TECH_QUERY",
  "PRICE_TAX_QUERY",
  "QTY_SPEC_CHANGE",
  "OTHER",
];

// All eight, for the reject dialog.
export const REJECT_REASONS = [
  "EVIDENCE_MISSING",
  "INFO_MISSING",
  "TECH_QUERY",
  "PRICE_TAX_QUERY",
  "QTY_SPEC_CHANGE",
  "RENEGOTIATE",
  "NOT_REQUIRED",
  "OTHER",
];

// The five reasons that sound like a question: rejecting on one of these gets a
// nudge towards asking instead.
export const QUESTION_REASONS = INFO_REASONS.filter((r) => r !== "OTHER");

export const DEFAULT_TARGET = {
  EVIDENCE_MISSING: "RFQ_CREATOR",
  INFO_MISSING: "RFQ_CREATOR",
  TECH_QUERY: "TECHNICAL_EVALUATOR",
  PRICE_TAX_QUERY: "COMMERCIAL_EVALUATOR",
  QTY_SPEC_CHANGE: "PO_INITIATOR",
};

export const targetList = (targets) =>
  Array.isArray(targets) ? targets : Array.isArray(targets?.targets) ? targets.targets : [];

export const findTarget = (targets, role) => targetList(targets).find((t) => t.target_role === role) || null;

// "L3" / "Level 3" → 3; anything else → null.
export const levelNumber = (label) => {
  const m = /(\d+)/.exec(String(label || ""));
  return m ? Number(m[1]) : null;
};

export const levelText = (label) => {
  const n = levelNumber(label);
  return n != null ? `Level ${n}` : "this level";
};

export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
