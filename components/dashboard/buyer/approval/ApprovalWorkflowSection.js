import React, { useState, useEffect } from "react";
import { Badge, Button, Alert, Spinner, Collapse } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  BsCheckCircleFill,
  BsXCircleFill,
  BsClockFill,
  BsArrowRepeat,
  BsChevronDown,
  BsShieldCheck,
  BsShieldX,
} from "react-icons/bs";
import useApprovalWorkflow from "@/hooks/useApprovalWorkflow";
import ApprovalTimeline from "./ApprovalTimeline";
import ApprovalActionModal from "./ApprovalActionModal";
import SelectedQuotesDisplay from "../negotiation/SelectedQuotesDisplay";
import TechEvalVendorStatusDisplay from "../technical-evaluation/TechEvalVendorStatusDisplay";

const statusConfig = {
  PENDING: {
    variant: "warning",
    label: "Pending Approval",
    icon: BsClockFill,
    color: "#ffc107",
    accentColor: "#ffc107",
    accentGradient: "linear-gradient(90deg, #ffc107 0%, #ffdb4d 100%)",
  },
  APPROVED: {
    variant: "success",
    label: "Approved",
    icon: BsCheckCircleFill,
    color: "#198754",
    accentColor: "#198754",
    accentGradient: "linear-gradient(90deg, #198754 0%, #20c070 100%)",
  },
  REJECTED: {
    variant: "danger",
    label: "Rejected",
    icon: BsXCircleFill,
    color: "#dc3545",
    accentColor: "#dc3545",
    accentGradient: "linear-gradient(90deg, #dc3545 0%, #e8606d 100%)",
  },
  CANCELLED: {
    variant: "secondary",
    label: "Cancelled",
    icon: BsXCircleFill,
    color: "#6c757d",
    accentColor: "#6c757d",
    accentGradient: "linear-gradient(90deg, #6c757d 0%, #8c939a 100%)",
  },
};

// Compact display of previous rejected/cancelled approval attempts
const PreviousAttemptsSection = ({ instances }) => {
  const [expandedAttempt, setExpandedAttempt] = useState(null);

  if (!instances || instances.length === 0) return null;

  const attemptStatusConfig = {
    REJECTED: { color: '#dc3545', bg: '#fce4ec', border: '#ef9a9a', icon: '✗', label: 'Rejected' },
    CANCELLED: { color: '#6c757d', bg: '#f0f0f0', border: '#d0d0d0', icon: '—', label: 'Cancelled' },
    APPROVED: { color: '#198754', bg: '#e8f5e9', border: '#a5d6a7', icon: '✓', label: 'Approved' },
    PENDING: { color: '#f59f00', bg: '#fff8e1', border: '#ffcc80', icon: '◷', label: 'In Progress' },
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{
        fontSize: '0.72rem',
        fontWeight: 600,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        marginBottom: '8px',
      }}>
        Previous Attempts
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
        {instances.map((inst, idx) => {
          const instStatus = (inst.status || 'PENDING').toUpperCase();
          const cfg = attemptStatusConfig[instStatus] || attemptStatusConfig.CANCELLED;
          const isExpanded = expandedAttempt === inst.id;
          const attemptNum = idx + 1;

          // Find rejection comment from approvers
          const rejectionComment = instStatus === 'REJECTED'
            ? inst.steps?.flatMap(s => s.approvers || []).find(a => a.status === 'REJECTED')?.comment
            : null;

          return (
            <div key={inst.id || idx}>
              <div
                style={{
                  border: `1px solid ${cfg.border}`,
                  borderRadius: '8px',
                  backgroundColor: '#fff',
                  overflow: 'hidden',
                }}
              >
                {/* Attempt header - clickable */}
                <div
                  onClick={() => setExpandedAttempt(isExpanded ? null : inst.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: cfg.bg,
                    cursor: 'pointer',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#fff',
                      border: `2px solid ${cfg.color}`,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: cfg.color,
                      flexShrink: 0,
                    }}>
                      {cfg.icon}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#333' }}>
                      Attempt {attemptNum}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: cfg.color,
                      backgroundColor: '#fff',
                      padding: '1px 8px',
                      borderRadius: '10px',
                      border: `1px solid ${cfg.border}`,
                    }}>
                      {cfg.label}
                    </span>
                    {rejectionComment && !isExpanded && (
                      <span style={{
                        fontSize: '0.7rem',
                        color: '#999',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}>
                        — "{rejectionComment}"
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#aaa', flexShrink: 0 }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>

                {/* Expanded: show full ApprovalTimeline */}
                {isExpanded && (
                  <div style={{ padding: '12px' }}>
                    {inst.steps && inst.steps.length > 0 ? (
                      <ApprovalTimeline
                        steps={inst.steps}
                        currentStep={inst.current_step}
                        initiatedBy={inst.initiated_by}
                      />
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#999', textAlign: 'center', padding: '8px 0' }}>
                        No step details available
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Connector to next attempt */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 0',
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}>
                  <div style={{ width: '2px', height: '6px', backgroundColor: '#dee2e6' }} />
                  <div style={{
                    fontSize: '0.58rem',
                    color: '#aaa',
                    fontWeight: 500,
                    padding: '1px 8px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}>
                    resubmitted
                  </div>
                  <div style={{ width: '2px', height: '6px', backgroundColor: '#dee2e6' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ApprovalWorkflowSection = ({
  entityType,
  entityId,
  entityLabel = "Item",
  hospitalityCompanyId,
  hotelId,
  departmentId,
  onCustomApprove,
  onCustomReject,
  onActionComplete,
  vendorCodeMap = {},
  vendorNameMap = {},
  refreshTrigger = 0
}) => {
  const {
    instance,
    previousInstances,
    loading,
    error,
    actionLoading,
    canUserApprove,
    status,
    currentStep,
    totalSteps,
    steps,
    initiatedBy,
    handleApprovalAction,
    refetch,
  } = useApprovalWorkflow({ entityType, entityId, enabled: !!entityId, refreshTrigger });

  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when action is required
  useEffect(() => {
    if (canUserApprove && status === "PENDING") {
      setExpanded(true);
    }
  }, [canUserApprove, status]);

  const openActionModal = (type) => {
    setActionType(type);
    setShowActionModal(true);
  };

  const handleAction = async (comment) => {
    let result;

    const handlerContext = {
      approval_instance_id: instance?.id,
      approval_instance_step_id: instance?.user_approval_step_id,
    };

    if (actionType === "APPROVE" && onCustomApprove) {
      result = await onCustomApprove(comment, handlerContext);
    } else if (actionType === "REJECT" && onCustomReject) {
      result = await onCustomReject(comment, handlerContext);
    } else {
      result = await handleApprovalAction(actionType, comment);
    }

    if (result.success) {
      toast.success(
        `${entityLabel} ${actionType === "APPROVE" ? "approved" : "rejected"} successfully`
      );
      setShowActionModal(false);
      if (onActionComplete) {
        onActionComplete();
      }
      refetch();
    } else {
      toast.error(result.error || `Failed to ${actionType.toLowerCase()}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-4" style={{ color: "#adb5bd" }}>
        <Spinner animation="border" size="sm" className="me-2" style={{ color: "#adb5bd" }} />
        <span className="small">Loading approval workflow...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="warning" className="mb-0 py-2">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <strong className="small">Unable to load approval status</strong>
            <p className="mb-0 small text-muted">{error}</p>
          </div>
          <Button variant="outline-warning" size="sm" onClick={refetch}>
            <BsArrowRepeat className="me-1" size={12} /> Retry
          </Button>
        </div>
      </Alert>
    );
  }

  if (!instance) {
    return null;
  }

  const statusInfo = statusConfig[status] || statusConfig.PENDING;
  const StatusIcon = statusInfo.icon;
  const isActionRequired = canUserApprove && status === "PENDING";

  return (
    <>
      <style jsx>{`
        .aws-card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          overflow: hidden;
          border: 1px solid #e9ecef;
          transition: box-shadow 0.3s ease;
          position: relative;
        }
        .aws-card:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .aws-card.aws-action-required {
          border-color: #ffeeba;
          box-shadow: 0 2px 12px rgba(255,193,7,0.12);
        }
        .aws-card.aws-action-required:hover {
          box-shadow: 0 4px 24px rgba(255,193,7,0.18);
        }
        .aws-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
        }
        .aws-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          cursor: pointer;
          user-select: none;
          transition: background 0.15s ease;
          gap: 12px;
          flex-wrap: wrap;
        }
        .aws-header:hover {
          background: rgba(0,0,0,0.012);
        }
        .aws-card.aws-action-required .aws-header {
          background: linear-gradient(135deg, #fffdf5 0%, #fff8e1 100%);
        }
        .aws-card.aws-action-required .aws-header:hover {
          background: linear-gradient(135deg, #fffcf0 0%, #fff5d6 100%);
        }
        .aws-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }
        .aws-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .aws-icon-wrap {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .aws-header:hover .aws-icon-wrap {
          transform: scale(1.06);
        }
        .aws-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: #2d3436;
          white-space: nowrap;
        }
        .aws-step-info {
          font-size: 0.75rem;
          color: #6c757d;
          font-weight: 500;
        }
        .aws-progress-track {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 3px;
          background: #f0f0f0;
          border-radius: 10px;
        }
        .aws-card.aws-action-required .aws-progress-track {
          background: rgba(255,193,7,0.12);
        }
        .aws-progress-pip {
          width: 18px;
          height: 5px;
          border-radius: 3px;
          transition: all 0.3s ease;
        }
        .aws-chevron {
          transition: transform 0.3s ease;
          color: #adb5bd;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .aws-chevron:hover {
          background: rgba(0,0,0,0.05);
          color: #6c757d;
        }
        .aws-chevron.open {
          transform: rotate(180deg);
        }
        .aws-body {
          padding: 0 20px 20px;
          border-top: 1px solid #f0f0f0;
        }
        .aws-card.aws-action-required .aws-body {
          border-top-color: rgba(255,193,7,0.15);
        }
        .aws-body-inner {
          padding-top: 16px;
        }
        .aws-status-line {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: 8px;
          margin-top: 14px;
          font-size: 0.82rem;
          font-weight: 500;
        }
        .aws-status-approved {
          background: linear-gradient(135deg, #d1e7dd 0%, #e8f5e9 100%);
          color: #0f5132;
        }
        .aws-status-rejected {
          background: linear-gradient(135deg, #f8d7da 0%, #fce4ec 100%);
          color: #842029;
        }
        .aws-status-pending {
          background: linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%);
          color: #6c757d;
        }
        .aws-action-btn {
          font-size: 0.78rem;
          font-weight: 600;
          padding: 6px 16px;
          border-radius: 7px;
          transition: all 0.15s ease;
          letter-spacing: 0.01em;
        }
        .aws-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
      `}</style>

      <div className={`aws-card approval-workflow-section approval-workflow-accordion ${isActionRequired ? 'aws-action-required' : ''}`}>
        {/* Top gradient accent bar */}
        <div className="aws-accent" style={{ background: statusInfo.accentGradient }} />

        {/* Header */}
        <div className="aws-header" onClick={() => setExpanded(!expanded)}>
          <div className="aws-header-left">
            <div
              className="aws-icon-wrap"
              style={{ background: `${statusInfo.color}12` }}
            >
              <StatusIcon size={19} style={{ color: statusInfo.color }} />
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="aws-title">Approval Workflow</span>
                <Badge
                  bg={statusInfo.variant}
                  style={{ fontSize: "0.68rem", fontWeight: 500, padding: "3px 8px" }}
                >
                  {statusInfo.label}
                </Badge>
              </div>
              {totalSteps > 0 && (
                <div className="d-flex align-items-center gap-2 mt-1">
                  <span className="aws-step-info">Step {currentStep} of {totalSteps}</span>
                  <div className="aws-progress-track">
                    {steps.map((step) => {
                      const pipColor =
                        step.status === "APPROVED" ? "#198754" :
                        step.status === "REJECTED" ? "#dc3545" :
                        step.status === "PENDING" && step.step_order === currentStep ? "#ffc107" :
                        "#dee2e6";
                      return (
                        <div key={step.id} className="aws-progress-pip" style={{ backgroundColor: pipColor }} />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="aws-header-right" onClick={(e) => e.stopPropagation()}>
            {isActionRequired && (
              <>
                <Button
                  variant="success"
                  size="sm"
                  className="aws-action-btn p-2 px-4 m-0"
                  onClick={() => openActionModal("APPROVE")}
                  disabled={actionLoading}
                >
                  <BsShieldCheck size={13} className="me-2" />
                  Approve
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  className="aws-action-btn p-2 px-4 m-0"
                  onClick={() => openActionModal("REJECT")}
                  disabled={actionLoading}
                >
                  <BsShieldX size={13} className="me-2" />
                  Reject
                </Button>
              </>
            )}
            <span
              className={`aws-chevron ${expanded ? "open" : ""}`}
              style={{ cursor: "pointer" }}
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            >
              <BsChevronDown size={14} />
            </span>
          </div>
        </div>

        {/* Collapsible Body */}
        <Collapse in={expanded}>
          <div>
            <div className="aws-body">
              <div className="aws-body-inner">
                {/* Metadata displays */}
                {instance?.metadata?.selected_quotes?.length > 0 && (
                  <SelectedQuotesDisplay
                    quotes={instance.metadata.selected_quotes}
                    vendorCodeMap={vendorCodeMap}
                    vendorNameMap={vendorNameMap}
                    status={status}
                  />
                )}

                {entityType === 'TECHNICAL' && (instance?.metadata?.vendors?.length > 0 || instance?.metadata?.not_evaluated_vendors?.length > 0) && (
                  <TechEvalVendorStatusDisplay
                    vendors={instance.metadata.vendors || []}
                    notEvaluatedVendors={instance.metadata.not_evaluated_vendors || []}
                    roundNumber={instance.metadata.evaluation_round || 1}
                    showSummary={true}
                  />
                )}

                {/* Previous approval attempts (rejected/cancelled history) */}
                {previousInstances.length > 0 && (
                  <PreviousAttemptsSection instances={previousInstances} />
                )}

                {/* Current attempt label when there's history */}
                {previousInstances.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px',
                  }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      color: statusInfo.color,
                      backgroundColor: `${statusInfo.color}10`,
                      border: `1px solid ${statusInfo.color}30`,
                      padding: '4px 12px',
                      borderRadius: '6px',
                    }}>
                      <span>Attempt {previousInstances.length + 1}</span>
                      <Badge bg={statusInfo.variant} style={{ fontSize: '0.62rem', fontWeight: 500 }}>
                        Current
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <ApprovalTimeline
                  steps={steps}
                  currentStep={currentStep}
                  initiatedBy={initiatedBy}
                />

                {/* Status messages */}
                {status === "APPROVED" && (
                  <div className="aws-status-line aws-status-approved">
                    <BsCheckCircleFill size={15} />
                    <span>Fully approved — ready to proceed.</span>
                  </div>
                )}

                {status === "REJECTED" && (
                  <div className="aws-status-line aws-status-rejected">
                    <BsXCircleFill size={15} />
                    <span>Rejected — review comments above.</span>
                    {(entityType === 'TENDER' || entityType === 'RFQ') && (
                      <a
                        href={`/dashboard/buyer/rfq-management-edit?id=${entityId}`}
                        className="ms-auto small"
                        style={{ color: "#842029", textDecoration: "underline", fontWeight: 600, whiteSpace: "nowrap" }}
                      >
                        Edit & Resubmit
                      </a>
                    )}
                  </div>
                )}

                {status === "PENDING" && !canUserApprove && (
                  <div className="aws-status-line aws-status-pending">
                    <BsClockFill size={15} />
                    <span>Waiting for approver action.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Collapse>
      </div>

      {/* Action Modal */}
      <ApprovalActionModal
        show={showActionModal}
        actionType={actionType}
        onClose={() => setShowActionModal(false)}
        onSubmit={handleAction}
        loading={actionLoading}
        entityLabel={entityLabel}
      />
    </>
  );
};

export default ApprovalWorkflowSection;
