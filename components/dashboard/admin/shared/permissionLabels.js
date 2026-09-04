/**
 * The vocabulary the permission catalogue is presented in.
 *
 * `tbl_permissions` stores raw enums — resource "ARC-COMM", action "evaluate" —
 * which mean nothing to a client admin deciding who may do what. These maps are
 * the human reading of them, and they live here rather than inside one screen
 * because the role editor and the Access catalogue must not drift into
 * describing the same permission two different ways.
 *
 * Unknown resources and actions fall back to a title-cased rendering of the raw
 * value rather than being hidden, so a permission added to the backend
 * catalogue still shows up here — legibly, if not eloquently — before anyone
 * gets round to naming it.
 */
export const RESOURCE_LABELS = {
  RFQ: "RFQ Creation",
  BOQ: "BOQ (Tender Creation)",
  TE: "Technical Evaluation",
  ARC: "ARC (Rate Contracts)",
  "ARC-TECH": "ARC Technical Evaluation",
  "ARC-COMM": "ARC Commercial Evaluation",
  "ARC-COMMITTEE": "ARC Committee",
  AWARDING: "PO Awarding",
};

export const RESOURCE_DESCRIPTIONS = {
  RFQ: "Create and manage request for quotation workflows.",
  BOQ: "Prepare and manage BOQ entries for tender creation.",
  TE: "Review technical compliance and evaluation decisions.",
  ARC: "Create, float and administer Annual Rate Contracts.",
  "ARC-TECH": "Run technical evaluation on rate contracts.",
  "ARC-COMM": "Run commercial evaluation and reconcile awards on rate contracts.",
  "ARC-COMMITTEE": "Sit on the ARC committee that approves finalised awards and amendments.",
  AWARDING: "Manage purchase-order awarding on finalised RFQs.",
};

export const ACTION_LABELS = {
  create: "Create",
  read: "View",
  view: "View",
  update: "Update",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  reject: "Reject",
  export: "Export",
  submit: "Submit",
  evaluate: "Evaluate",
  admin: "Administer",
};

export const ACTION_HELP = {
  create: "Allow users to create new records",
  read: "Allow users to view records",
  view: "Allow users to view records",
  update: "Allow users to modify existing records",
  edit: "Allow users to modify existing records",
  delete: "Allow users to remove records",
  approve: "Allow users to approve workflow steps",
  reject: "Allow users to reject workflow steps",
  export: "Allow users to export data",
  submit: "Allow users to submit records for processing",
  evaluate: "Allow users to run evaluations (score / assess responses)",
  admin: "Allow users full administrative control of this module",
};

export const toReadableLabel = (value = "") =>
  value
    .toString()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const getResourceLabel = (resource = "") => {
  const key = resource.toString().trim().toUpperCase();
  return RESOURCE_LABELS[key] || toReadableLabel(resource);
};

export const getResourceDescription = (resource = "") => {
  const key = resource.toString().trim().toUpperCase();
  return RESOURCE_DESCRIPTIONS[key] || "Manage permissions for this resource.";
};

export const getActionLabel = (action = "") => {
  const key = action.toString().trim().toLowerCase();
  return ACTION_LABELS[key] || toReadableLabel(action);
};

export const getActionHelp = (action = "") => {
  const key = action.toString().trim().toLowerCase();
  return ACTION_HELP[key] || "Grant access for this action.";
};

