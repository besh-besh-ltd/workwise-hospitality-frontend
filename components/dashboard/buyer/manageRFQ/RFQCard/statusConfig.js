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
  }
};

/**
 * Get status configuration based on RFQ/Tender data
 * @param {Object} data - RFQ/Tender data
 * @param {Object} publishState - Output from getRFQPublishState()
 * @returns {Object} Status configuration
 */
export const getStatusConfig = (data, publishState) => {
  if (publishState?.isPendingApproval) return STATUS_CONFIG.PENDING_APPROVAL;
  if (publishState?.isReadyToPublish) return STATUS_CONFIG.READY_TO_PUBLISH;
  if (data?.is_finalized) return STATUS_CONFIG.FINALIZED;
  if (publishState?.isClosed) return STATUS_CONFIG.CLOSED;
  return STATUS_CONFIG.OPEN;
};
