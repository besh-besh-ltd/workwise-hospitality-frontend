import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { BsClockFill, BsCheckCircleFill, BsXCircleFill, BsPersonFill } from 'react-icons/bs';
import StepProgressBar from './StepProgressBar';

const formatIST = (dateStr) =>
  dateStr ? new Date(dateStr).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'N/A';

const ApprovalProgressCard = ({ approvalStatus }) => {
  if (!approvalStatus || approvalStatus.type !== 'new') {
    return null;
  }

  const {
    status,
    current_step,
    total_steps,
    pending_approvers = [],
    created_at,
  } = approvalStatus;

  const isPending = status === 'PENDING';
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';

  // Header configuration based on status
  const headerConfig = {
    PENDING: {
      icon: BsClockFill,
      iconColor: '#ffc107',
      title: 'Approval in Progress',
      bgColor: '#fff8e6',
      borderColor: '#ffe69c',
    },
    APPROVED: {
      icon: BsCheckCircleFill,
      iconColor: '#198754',
      title: 'Approved',
      bgColor: '#d1e7dd',
      borderColor: '#badbcc',
    },
    REJECTED: {
      icon: BsXCircleFill,
      iconColor: '#dc3545',
      title: 'Rejected',
      bgColor: '#f8d7da',
      borderColor: '#f5c2c7',
    },
  };

  const config = headerConfig[status] || headerConfig.PENDING;
  const HeaderIcon = config.icon;

  return (
    <Card
      className="mb-4 shadow-sm"
      style={{
        border: `1px solid ${config.borderColor}`,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Card.Header
        className="d-flex justify-content-between align-items-center py-2 px-3"
        style={{
          backgroundColor: config.bgColor,
          borderBottom: `1px solid ${config.borderColor}`,
        }}
      >
        <div className="d-flex align-items-center gap-2">
          <HeaderIcon size={18} style={{ color: config.iconColor }} />
          <span className="fw-semibold" style={{ fontSize: '0.95rem' }}>
            {config.title}
          </span>
        </div>
        <Badge
          bg="light"
          className="text-dark"
          style={{
            fontSize: '0.75rem',
            fontWeight: 500,
            border: '1px solid #dee2e6',
          }}
        >
          Step {current_step} of {total_steps}
        </Badge>
      </Card.Header>

      {/* Body */}
      <Card.Body className="py-3 px-3">
        {/* Step Progress Bar */}
        <StepProgressBar
          currentStep={current_step}
          totalSteps={total_steps}
          status={status}
        />

        {/* Pending Approvers Section */}
        {isPending && pending_approvers && pending_approvers.length > 0 && (
          <div
            className="pending-approvers-box mt-3 p-3 rounded"
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #ffeeba',
            }}
          >
            <div className="d-flex align-items-center gap-2 mb-2">
              <BsPersonFill size={16} className="text-warning" />
              <span className="fw-medium" style={{ fontSize: '0.875rem', color: '#856404' }}>
                {pending_approvers.length === 1
                  ? 'Waiting for approval from:'
                  : 'Waiting for approval from:'}
              </span>
            </div>
            {pending_approvers.length === 1 ? (
              <span className="fw-semibold" style={{ fontSize: '0.9rem', color: '#664d03' }}>
                {pending_approvers[0].name}
              </span>
            ) : (
              <ul className="mb-0 ps-3" style={{ fontSize: '0.875rem', color: '#664d03' }}>
                {pending_approvers.map((approver, idx) => (
                  <li key={approver.user_id || idx} className="fw-medium">
                    {approver.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Approved Message */}
        {isApproved && (
          <div
            className="approved-message mt-3 p-3 rounded text-center"
            style={{
              backgroundColor: '#d1e7dd',
              border: '1px solid #badbcc',
            }}
          >
            <BsCheckCircleFill size={20} className="text-success me-2" />
            <span className="fw-medium" style={{ color: '#0f5132' }}>
              All approval steps completed
            </span>
          </div>
        )}

        {/* Rejected Message */}
        {isRejected && (
          <div
            className="rejected-message mt-3 p-3 rounded text-center"
            style={{
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c2c7',
            }}
          >
            <BsXCircleFill size={20} className="text-danger me-2" />
            <span className="fw-medium" style={{ color: '#842029' }}>
              Approval was rejected at Step {current_step}
            </span>
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-3 text-muted" style={{ fontSize: '0.8rem' }}>
          {isPending && <>Started: {formatIST(created_at)}</>}
          {isApproved && <>Completed: {formatIST(created_at)}</>}
          {isRejected && <>Rejected on: {formatIST(created_at)}</>}
        </div>
      </Card.Body>
    </Card>
  );
};

export default ApprovalProgressCard;
