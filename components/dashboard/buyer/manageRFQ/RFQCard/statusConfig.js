import { BsClockFill, BsCheckCircleFill, BsXCircleFill, BsAwardFill, BsExclamationOctagonFill } from 'react-icons/bs';

export const STATUS_CONFIG = {
  PENDING_APPROVAL: {
    key: 'pending_approval',
    label: 'Pending Approval',
    icon: BsClockFill,
    borderColor: '#ffc107',
    backgroundColor: '#fffbeb',
    badgeBackground: '#ffc107',
    badgeText: '#664d03',
    pulse: true
  },
  PUBLISHED_WITHOUT_APPROVAL: {
    key: 'published_without_approval',
    label: 'Moved to Backlog',
    icon: BsExclamationOctagonFill,
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
    badgeBackground: '#dc3545',
    badgeText: '#ffffff',
    pulse: false
  },
  READY_TO_PUBLISH: {
    key: 'ready_to_publish',
    label: 'Ready to Publish',
    icon: BsCheckCircleFill,
    borderColor: '#0dcaf0',
    backgroundColor: '#e7f9fd',
    badgeBackground: '#cff4fc',
    badgeText: '#055160',
    pulse: false
  },
  OPEN: {
    key: 'open',
    label: 'Open',
    icon: BsCheckCircleFill,
    borderColor: '#198754',
    backgroundColor: '#d1e7dd',
    badgeBackground: '#d1e7dd',
    badgeText: '#0f5132',
    pulse: false
  },
  CLOSED: {
    key: 'closed',
    label: 'Closed',
    icon: BsXCircleFill,
    borderColor: '#6c757d',
    backgroundColor: '#f8f9fa',
    badgeBackground: '#e9ecef',
    badgeText: '#495057',
    pulse: false
  },
  FINALIZED: {
    key: 'finalized',
    label: 'Finalized',
    icon: BsAwardFill,
    borderColor: '#198754',
    backgroundColor: '#d1e7dd',
    badgeBackground: '#198754',
    badgeText: '#ffffff',
    pulse: false
  },
  COMPLETED: {
    key: 'completed',
    label: 'Completed',
    icon: BsCheckCircleFill,
    borderColor: '#198754',
    backgroundColor: '#d1e7dd',
    badgeBackground: '#198754',
    badgeText: '#ffffff',
    pulse: false
  },
  PARTIALLY_COMPLETED: {
    key: 'partially_completed',
    label: 'Partially Completed',
    icon: BsClockFill,
    borderColor: '#fd7e14',
    backgroundColor: '#fff3cd',
    badgeBackground: '#fd7e14',
    badgeText: '#ffffff',
    pulse: false
  }
};

/**
 * Lifecycle stage configuration for RFQ progress indicator.
 * Each key matches a lifecycle_stage value from the backend.
 * Ordered by step number (progression order).
 */
export const LIFECYCLE_STAGES_ORDERED = [
  'RFQ_APPROVAL',
  'AWAITING_QUOTES',
  'TECHNICAL_AWAITING_QUOTES',
  'TECHNICAL_EVALUATING',
  'TECHNICAL_APPROVING',
  'TECHNICAL_REJECTED',
  'COMMERCIAL_EVALUATION',
  'NEGOTIATION_ONGOING',
  'QUOTATION_APPROVAL',
  'AWAITING_PO',
  'PO_APPROVAL',
  'APPROVED_COMPLETED',
];

export const LIFECYCLE_CONFIG = {
  RFQ_APPROVAL: {
    step: 1,
    label: 'RFQ Approval',
    shortLabel: 'Approval',
    description: 'Pending authority approval before publication',
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
    background: '#fffbeb',
    textColor: '#92400e',
    dotColor: '#f59e0b',
  },
  AWAITING_QUOTES: {
    step: 2,
    label: 'Awaiting Quotes',
    shortLabel: 'Awaiting Quotes',
    description: 'Waiting for vendors to submit their quotations',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    background: '#eef2ff',
    textColor: '#3730a3',
    dotColor: '#6366f1',
  },
  TECHNICAL_AWAITING_QUOTES: {
    step: 2,
    label: 'Tech Eval — Awaiting Quotes',
    shortLabel: 'Tech Eval',
    description: 'Technical evaluation configured, waiting for vendor quotes',
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
    background: '#f0f9ff',
    textColor: '#0c4a6e',
    dotColor: '#0ea5e9',
  },
  TECHNICAL_EVALUATING: {
    step: 2,
    label: 'Technical Evaluating',
    shortLabel: 'Tech Eval',
    description: 'Vendor responses are being technically scored',
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)',
    background: '#f0f9ff',
    textColor: '#0c4a6e',
    dotColor: '#0ea5e9',
  },
  TECHNICAL_APPROVING: {
    step: 3,
    label: 'Technical Approving',
    shortLabel: 'Tech Approval',
    description: 'Technical evaluation submitted for approval',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
    background: '#f5f3ff',
    textColor: '#5b21b6',
    dotColor: '#8b5cf6',
  },
  TECHNICAL_REJECTED: {
    step: 3,
    label: 'Re-evaluation Required',
    shortLabel: 'Rejected',
    description: 'Technical evaluation was rejected and needs re-scoring',
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #fef2f2 0%, #fecaca 100%)',
    background: '#fef2f2',
    textColor: '#991b1b',
    dotColor: '#ef4444',
  },
  COMMERCIAL_EVALUATION: {
    step: 4,
    label: 'Commercial Evaluation',
    shortLabel: 'Commercial',
    description: 'All products have technically cleared vendors, ready for commercial review',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
    background: '#eef2ff',
    textColor: '#3730a3',
    dotColor: '#6366f1',
  },
  NEGOTIATION_ONGOING: {
    step: 5,
    label: 'Negotiation Ongoing',
    shortLabel: 'Negotiation',
    description: 'Active negotiation rounds in progress with vendors',
    color: '#f97316',
    gradient: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
    background: '#fff7ed',
    textColor: '#9a3412',
    dotColor: '#f97316',
  },
  QUOTATION_APPROVAL: {
    step: 6,
    label: 'Quotation Approval',
    shortLabel: 'Quote Approval',
    description: 'Selected vendor quotes are pending approval',
    color: '#d946ef',
    gradient: 'linear-gradient(135deg, #fdf4ff 0%, #f5d0fe 100%)',
    background: '#fdf4ff',
    textColor: '#86198f',
    dotColor: '#d946ef',
  },
  AWAITING_PO: {
    step: 7,
    label: 'Awaiting PO Initiation',
    shortLabel: 'Awaiting PO',
    description: 'All quotations approved, purchase order creation pending',
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
    background: '#f0fdfa',
    textColor: '#134e4a',
    dotColor: '#14b8a6',
  },
  PO_APPROVAL: {
    step: 8,
    label: 'PO Approval',
    shortLabel: 'PO Approval',
    description: 'Purchase orders submitted and awaiting approval',
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #f5f3ff 0%, #ddd6fe 100%)',
    background: '#f5f3ff',
    textColor: '#5b21b6',
    dotColor: '#8b5cf6',
  },
  APPROVED_COMPLETED: {
    step: 9,
    label: 'Approved & Completed',
    shortLabel: 'Completed',
    description: 'All purchase orders approved — procurement cycle complete',
    color: '#22c55e',
    gradient: 'linear-gradient(135deg, #f0fdf4 0%, #bbf7d0 100%)',
    background: '#f0fdf4',
    textColor: '#166534',
    dotColor: '#22c55e',
  },
};

/**
 * Get lifecycle configuration by stage key
 * @param {string} stage - Lifecycle stage key from backend
 * @returns {Object|null} Lifecycle configuration or null
 */
export const getLifecycleConfig = (stage) => {
  return LIFECYCLE_CONFIG[stage] || null;
};

/**
 * Get status configuration based on RFQ/Tender data
 * @param {Object} data - RFQ/Tender data
 * @param {Object} publishState - Output from getRFQPublishState()
 * @returns {Object} Status configuration
 */
export const getStatusConfig = (data, publishState) => {
  if (data?.po_completed) return STATUS_CONFIG.COMPLETED;
  if (data?.po_partially_completed) return STATUS_CONFIG.PARTIALLY_COMPLETED;
  if (publishState?.isPendingApproval) return STATUS_CONFIG.PENDING_APPROVAL;
  if (publishState?.isReadyToPublish) return STATUS_CONFIG.READY_TO_PUBLISH;
  if (data?.is_finalized) return STATUS_CONFIG.FINALIZED;
  if (publishState?.isClosed) return STATUS_CONFIG.CLOSED;
  return STATUS_CONFIG.OPEN;
};
