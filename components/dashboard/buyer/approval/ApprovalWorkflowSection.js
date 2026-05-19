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
  BsLightningChargeFill,
} from "react-icons/bs";
import useApprovalWorkflow from "@/hooks/useApprovalWorkflow";
import ApprovalTimeline from "./ApprovalTimeline";
import ApprovalActionModal from "./ApprovalActionModal";
import SelectedQuotesDisplay from "../negotiation/SelectedQuotesDisplay";
import TechEvalVendorStatusDisplay from "../technical-evaluation/TechEvalVendorStatusDisplay";
import ExistingPOModal from "../ExistingPOModal";
import { getExistingPOByVendor } from "@/services/rfq";
import useIsMobile from "@/hooks/useIsMobile";

// Surfaces the comment the finalizer typed in the Finalize Vendor modal so
// the approver sees the rationale alongside the request.
const FinalizerCommentPanel = ({ comment, entityType }) => {
  if (!comment || typeof comment !== "string" || !comment.trim()) return null;
  const isArc = entityType === "ARC";
  const heading = isArc ? "Finalizer's note" : "Reason for finalizing this vendor";
  return (
    <div
      style={{
        marginBottom: 12,
        padding: "10px 12px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderLeft: "3px solid #6366f1",
        borderRadius: 6,
      }}
    >
      <div
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          color: "#475569",
          marginBottom: 4,
        }}
      >
        {heading}
      </div>
      <div
        style={{
          fontSize: "0.82rem",
          color: "#1e293b",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          lineHeight: 1.45,
        }}
      >
        {comment.trim()}
      </div>
    </div>
  );
};

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
  BACKLOG: {
    variant: "danger",
    label: "Moved to Backlog",
    icon: BsXCircleFill,
    color: "#dc3545",
    accentColor: "#dc3545",
    accentGradient: "linear-gradient(90deg, #dc3545 0%, #e74c3c 100%)",
  },
  AUTO_PUBLISHED: {
    variant: "success",
    label: "Auto Published",
    icon: BsLightningChargeFill,
    color: "#22c55e",
    accentColor: "#22c55e",
    accentGradient: "linear-gradient(90deg, #22c55e 0%, #4ade80 100%)",
  },
};

// Compact display of previous rejected/cancelled approval attempts
const PreviousAttemptsSection = ({ instances, entityType, isMobile = false }) => {
  const [expandedAttempt, setExpandedAttempt] = useState(null);

  if (!instances || instances.length === 0) return null;

  const attemptStatusConfig = {
    REJECTED: { color: '#dc3545', bg: '#fce4ec', border: '#ef9a9a', icon: '✗', label: 'Rejected' },
    CANCELLED: { color: '#6c757d', bg: '#f0f0f0', border: '#d0d0d0', icon: '—', label: 'Cancelled' },
    APPROVED: { color: '#198754', bg: '#e8f5e9', border: '#a5d6a7', icon: '✓', label: 'Approved' },
    PENDING: { color: '#f59f00', bg: '#fff8e1', border: '#ffcc80', icon: '◷', label: 'In Progress' },
  };

  return (
    <div style={{ marginBottom: '0px' }}>
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

          // Find rejector name and step for outside display
          const rejectorInfo = instStatus === 'REJECTED'
            ? (() => {
                for (const s of (inst.steps || [])) {
                  const rejector = (s.approvers || []).find(a => a.status === 'REJECTED');
                  if (rejector) return { name: rejector.user_name, step: s.step_order };
                }
                return null;
              })()
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
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
                    {rejectorInfo && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#842029',
                        whiteSpace: isMobile ? 'normal' : 'nowrap',
                        width: isMobile ? '100%' : 'auto',
                      }}>
                        · {rejectorInfo.name} at Step {rejectorInfo.step}
                      </span>
                    )}
                    {rejectionComment && !isExpanded && !isMobile && (
                      <span style={{
                        fontSize: '0.7rem',
                        color: '#6c757d',
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}>
                        — &ldquo;{rejectionComment}&rdquo;
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: '#aaa', flexShrink: 0 }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>

                {/* Expanded: show vendor metadata + approval timeline */}
                {isExpanded && (
                  <div style={{ padding: isMobile ? '10px' : '12px' }}>
                    {/* Finalizer's comment for this attempt */}
                    <FinalizerCommentPanel
                      comment={inst?.metadata?.finalization_comment || inst?.metadata?.po_payload?.comment}
                      entityType={entityType}
                    />

                    {/* Vendor Evaluation Results for this attempt */}
                    {entityType === 'TECHNICAL' && (inst.metadata?.vendors?.length > 0 || inst.metadata?.not_evaluated_vendors?.length > 0) && (
                      <div style={{ marginBottom: '12px' }}>
                        <TechEvalVendorStatusDisplay
                          vendors={inst.metadata.vendors || []}
                          notEvaluatedVendors={inst.metadata.not_evaluated_vendors || []}
                          roundNumber={inst.metadata.evaluation_round || 1}
                          showSummary={true}
                        />
                      </div>
                    )}
                    {inst.steps && inst.steps.length > 0 ? (
                      <ApprovalTimeline
                        steps={inst.steps}
                        currentStep={inst.current_step}
                        initiatedBy={inst.initiated_by}
                        instanceStatus={instStatus}
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
              {idx < instances.length - 1 && (() => {
                const wasApproved = instStatus === 'APPROVED';
                const connLabel = wasApproved ? 'Next Round Submitted' : 'Resubmitted';
                const connColor = wasApproved ? '#166534' : '#856404';
                const connBg = wasApproved ? '#f0fdf4' : '#fff8e1';
                const connBorder = wasApproved ? '#bbf7d0' : '#ffeeba';
                const connGradTop = wasApproved ? '#bbf7d0' : '#f5c2c7';
                const connGradBot = wasApproved ? '#bbf7d0' : '#ffc107';
                return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1px 0',
                }}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}>
                    <div style={{ width: '2px', height: '8px', background: `linear-gradient(180deg, ${connGradTop}, ${connColor})` }} />
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.6rem',
                      color: connColor,
                      fontWeight: 600,
                      padding: '2px 10px',
                      backgroundColor: connBg,
                      borderRadius: '10px',
                      border: `1px solid ${connBorder}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      <BsArrowRepeat size={9} />
                      {connLabel}
                    </div>
                    <div style={{ width: '2px', height: '8px', background: `linear-gradient(180deg, ${connColor}, #dee2e6)` }} />
                  </div>
                </div>
                );
              })()}
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
  allEntityIds,
  entityLabel = "Item",
  hospitalityCompanyId,
  hotelId,
  departmentId,
  onCustomApprove,
  onCustomReject,
  onActionComplete,
  vendorCodeMap = {},
  vendorNameMap = {},
  refreshTrigger = 0,
  hideTopButtons = false,
  isBacklog = false,
  isPublished = false,
  showMobileStickyActions = false,
  preloadedInstances = null,
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
    isAutoApproved,
    autoApprovedReason,
    handleApprovalAction,
    applyOptimisticAction,
    rollbackOptimisticAction,
    refetch,
  } = useApprovalWorkflow({ entityType, entityId, allEntityIds, enabled: !!entityId, refreshTrigger, preloadedInstances });

  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [localActionLoading, setLocalActionLoading] = useState(false);
  const [currentAttemptExpanded, setCurrentAttemptExpanded] = useState(true);

  // Existing PO merge flow for final approver of NEGOTIATION_QUOTE
  const [showExistingPOModal, setShowExistingPOModal] = useState(false);
  const [existingPos, setExistingPos] = useState([]);
  const [selectedPo, setSelectedPo] = useState(null);
  const [pendingApproveComment, setPendingApproveComment] = useState(null);
  const isMobile = useIsMobile();

  const isFinalApprover = canUserApprove && currentStep === totalSteps && status === "PENDING";
  const isNegotiationQuote = entityType === "NEGOTIATION_QUOTE";

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

  const executeApproval = async (comment, existingPoId = null) => {
    let result;

    const handlerContext = {
      approval_instance_id: instance?.id,
      approval_instance_step_id: instance?.user_approval_step_id,
      existing_po_id: existingPoId,
    };

    // For custom handlers (NEGOTIATION_QUOTE), apply optimistic local update
    // here. handleApprovalAction does its own optimistic + rollback internally.
    const usingCustomHandler =
      (actionType === "APPROVE" && onCustomApprove) ||
      (actionType === "REJECT" && onCustomReject);
    const optimisticSnapshot = usingCustomHandler
      ? applyOptimisticAction(actionType)
      : null;

    if (actionType === "APPROVE" && onCustomApprove) {
      result = await onCustomApprove(comment, handlerContext);
    } else if (actionType === "REJECT" && onCustomReject) {
      result = await onCustomReject(comment, handlerContext);
    } else {
      result = await handleApprovalAction(actionType, comment);
    }

    if (!result.success && usingCustomHandler) {
      rollbackOptimisticAction(optimisticSnapshot);
    }

    if (result.success) {
      toast.success(
        `${entityLabel} ${actionType === "APPROVE" ? "approved" : "rejected"} successfully`
      );
      if (actionType === "APPROVE" && isNegotiationQuote) {
        toast.info("Purchase Order drafted successfully. Visit PO page to review and initiate.");
      }
      setShowActionModal(false);
      if (onActionComplete) {
        onActionComplete();
      }
      refetch();
    } else {
      toast.error(result.error || `Failed to ${actionType.toLowerCase()}`);
    }
  };

  const handleAction = async (comment) => {
    setLocalActionLoading(true);
    try {
      // If this is the final approver for a NEGOTIATION_QUOTE, check for existing POs first
      if (actionType === "APPROVE" && isNegotiationQuote && isFinalApprover) {
        const vendorId = instance?.metadata?.vendor_id || instance?.metadata?.po_payload?.product_info?.finalized_vendor_id;
        const rfqId = instance?.metadata?.rfq_id;

        if (vendorId && rfqId) {
          try {
            const response = await getExistingPOByVendor(vendorId, rfqId);
            const pos = response?.existingPOS ?? [];
            if (pos.length > 0) {
              // Store comment and show existing PO modal
              setPendingApproveComment(comment);
              setExistingPos(pos);
              setSelectedPo(null);
              setShowActionModal(false);
              setShowExistingPOModal(true);
              return;
            }
          } catch (e) {
            // If fetching fails, proceed without merge
            console.error("Failed to fetch existing POs:", e);
          }
        }
      }

      await executeApproval(comment);
    } finally {
      setLocalActionLoading(false);
    }
  };

  const handleExistingPOConfirm = async (selectedPOId) => {
    setShowExistingPOModal(false);
    await executeApproval(pendingApproveComment, selectedPOId || null);
    setPendingApproveComment(null);
    setSelectedPo(null);
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

  // Only treat as backlog if approval is still pending — approved items should show APPROVED even if published
  const effectiveBacklog = isBacklog && status === "PENDING";
  const statusInfo = isAutoApproved ? statusConfig.AUTO_PUBLISHED : effectiveBacklog ? statusConfig.BACKLOG : (statusConfig[status] || statusConfig.PENDING);
  const StatusIcon = statusInfo.icon;
  const isActionRequired = canUserApprove && status === "PENDING" && !effectiveBacklog && !isAutoApproved && !isPublished;
  const shouldUseMobileStickyActions = showMobileStickyActions && isMobile && isActionRequired && !effectiveBacklog;

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
          border-color: #fdba74;
          box-shadow: 0 2px 12px rgba(249,115,22,0.15);
        }
        .aws-card.aws-action-required:hover {
          box-shadow: 0 4px 24px rgba(249,115,22,0.22);
        }
        .aws-card.aws-backlog {
          border-color: #f5c6cb;
          box-shadow: 0 2px 12px rgba(220,53,69,0.12);
          background: linear-gradient(135deg, #fff 0%, #fff5f5 100%);
        }
        .aws-card.aws-backlog:hover {
          box-shadow: 0 4px 24px rgba(220,53,69,0.18);
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
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
        }
        .aws-card.aws-action-required .aws-header:hover {
          background: linear-gradient(135deg, #fff7ed 0%, #fde8d0 100%);
        }
        .aws-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
          flex: 1;
        }
        .aws-header-main {
          min-width: 0;
          flex: 1;
        }
        .aws-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .aws-step-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
          flex-wrap: wrap;
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
          background: rgba(249,115,22,0.12);
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
          border-top-color: rgba(249,115,22,0.15);
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
          font-size: 0.84rem;
          font-weight: 600;
          padding: 9px 22px;
          border-radius: 8px;
          transition: all 0.15s ease;
          letter-spacing: 0.01em;
          border: none;
          color: #fff;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .aws-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .aws-action-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .aws-btn-approve {
          background: linear-gradient(135deg, #198754 0%, #20c070 100%);
        }
        .aws-btn-reject {
          background: linear-gradient(135deg, #dc3545 0%, #e8606d 100%);
        }
        .aws-mobile-sticky {
          position: fixed;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1050;
          padding: 10px 12px calc(env(safe-area-inset-bottom, 0px) + 10px);
          background: linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(248,250,252,0.88) 16%, #f8fafc 100%);
          backdrop-filter: blur(8px);
        }
        .aws-mobile-sticky-inner {
          max-width: 100%;
          background: rgba(15, 23, 42, 0.96);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.28);
          padding: 10px;
        }
        .aws-mobile-sticky-copy {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }
        .aws-mobile-sticky-kicker {
          font-size: 0.64rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.62);
        }
        .aws-mobile-sticky-label {
          font-size: 0.76rem;
          font-weight: 600;
          color: #ffffff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .aws-mobile-sticky-actions {
          display: flex;
          gap: 8px;
        }
        .aws-mobile-sticky-actions .aws-action-btn {
          flex: 1;
          justify-content: center;
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.8rem;
          box-shadow: none;
        }
        @media (max-width: 768px) {
          .aws-card {
            border-radius: 10px;
          }
          .aws-header {
            padding: 12px 14px;
            align-items: flex-start;
          }
          .aws-header-left {
            width: 100%;
            align-items: flex-start;
            gap: 12px;
          }
          .aws-header-right {
            width: 100%;
            justify-content: space-between;
          }
          .aws-icon-wrap {
            width: 34px;
            height: 34px;
            border-radius: 9px;
          }
          .aws-title {
            font-size: 0.92rem;
            white-space: normal;
            line-height: 1.25;
          }
          .aws-step-info {
            font-size: 0.76rem;
          }
          .aws-step-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
          .aws-progress-track {
            width: 100%;
            overflow: hidden;
          }
          .aws-progress-pip {
            flex: 1 1 0;
            min-width: 10px;
          }
          .aws-body {
            padding: 0 14px 14px;
          }
          .aws-body-inner {
            padding-top: 14px;
          }
          .aws-status-line {
            flex-wrap: wrap;
            align-items: flex-start;
            font-size: 0.78rem;
            padding: 10px 12px;
          }
          .aws-action-btn {
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 0.82rem;
          }
          .aws-chevron {
            display: none;
          }
        }
      `}</style>

      <div className={`aws-card approval-workflow-section approval-workflow-accordion ${isActionRequired ? 'aws-action-required' : ''} ${effectiveBacklog ? 'aws-backlog' : ''}`}>
        {/* Top gradient accent bar */}
        <div className="aws-accent" style={{ background: isActionRequired ? 'linear-gradient(90deg, #f97316 0%, #ef4444 100%)' : statusInfo.accentGradient }} />

        {/* Header */}
        <div className="aws-header" onClick={() => setExpanded(!expanded)}>
          <div className="aws-header-left">
            <div
              className="aws-icon-wrap"
              style={{ background: isActionRequired ? 'rgba(249,115,22,0.08)' : `${statusInfo.color}12` }}
            >
              <StatusIcon size={19} style={{ color: isActionRequired ? '#f97316' : statusInfo.color }} />
            </div>
            <div className="aws-header-main">
              <div className="aws-title-row">
                <span className="aws-title">Approval Workflow</span>
                {isActionRequired ? (
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'linear-gradient(90deg, #f97316, #ef4444)',
                    color: '#fff',
                    display: 'inline-block',
                  }}>
                    Your Action is Required
                  </span>
                ) : (
                  <Badge
                    bg={statusInfo.variant}
                    style={{ fontSize: "0.68rem", fontWeight: 500, padding: "3px 8px" }}
                  >
                    {statusInfo.label}
                  </Badge>
                )}
              </div>
              {totalSteps > 0 && (
                <div className="aws-step-row">
                  <span className="aws-step-info" style={effectiveBacklog ? { color: '#dc3545' } : undefined}>
                    {effectiveBacklog ? `Expired at step ${currentStep} of ${totalSteps}` : `Step ${currentStep} of ${totalSteps}`}
                  </span>
                  <div className="aws-progress-track">
                    {steps.map((step) => {
                      const pipColor =
                        step.status === "APPROVED" ? "#198754" :
                        step.status === "REJECTED" ? "#dc3545" :
                        effectiveBacklog && step.status === "PENDING" ? "#dc3545" :
                        (status === "APPROVED" && step.status === "PENDING") ? "#198754" :
                        step.status === "PENDING" && step.step_order === currentStep ? (isActionRequired ? "#f97316" : "#ffc107") :
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
            {isActionRequired && !hideTopButtons && !effectiveBacklog && !shouldUseMobileStickyActions && (
              <>
                <button
                  className="aws-action-btn aws-btn-approve"
                  onClick={() => openActionModal("APPROVE")}
                  disabled={actionLoading}
                >
                  <BsShieldCheck size={14} />
                  Approve
                </button>
                <button
                  className="aws-action-btn aws-btn-reject"
                  onClick={() => openActionModal("REJECT")}
                  disabled={actionLoading}
                >
                  <BsShieldX size={14} />
                  Reject
                </button>
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
                {/* Finalizer's comment (NEGOTIATION_QUOTE / ARC) */}
                <FinalizerCommentPanel
                  comment={instance?.metadata?.finalization_comment || instance?.metadata?.po_payload?.comment}
                  entityType={entityType}
                />

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
                  <PreviousAttemptsSection instances={previousInstances} entityType={entityType} isMobile={isMobile} />
                )}

                {/* Current attempt - accordion card matching previous attempts when there's history */}
                {previousInstances.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    {/* Connector from last previous attempt to current */}
                    {(() => {
                      const lastPrev = previousInstances[previousInstances.length - 1];
                      const lastPrevApproved = lastPrev?.status === 'APPROVED';
                      const cLabel = lastPrevApproved ? 'Next Round Submitted' : 'Resubmitted';
                      const cColor = lastPrevApproved ? '#166534' : '#856404';
                      const cBg = lastPrevApproved ? '#f0fdf4' : '#fff8e1';
                      const cBorder = lastPrevApproved ? '#bbf7d0' : '#ffeeba';
                      const cGradTop = lastPrevApproved ? '#bbf7d0' : '#f5c2c7';
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1px 0' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ width: '2px', height: '8px', background: `linear-gradient(180deg, ${cGradTop}, ${cColor})` }} />
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '4px',
                              fontSize: '0.6rem', color: cColor, fontWeight: 600,
                              padding: '2px 10px', backgroundColor: cBg,
                              borderRadius: '10px', border: `1px solid ${cBorder}`,
                              textTransform: 'uppercase', letterSpacing: '0.04em',
                            }}>
                              <BsArrowRepeat size={9} />
                              {cLabel}
                            </div>
                            <div style={{ width: '2px', height: '8px', background: `linear-gradient(180deg, ${cColor}, #dee2e6)` }} />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Current attempt card - status-aware styling */}
                    <div style={{
                      border: `1px solid ${status === 'APPROVED' ? '#a5d6a7' : status === 'REJECTED' ? '#ef9a9a' : isActionRequired ? '#fdba74' : '#f59e0b'}`,
                      borderRadius: '8px',
                      backgroundColor: '#fff',
                      overflow: 'hidden',
                    }}>
                      <div
                        onClick={() => setCurrentAttemptExpanded(!currentAttemptExpanded)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          backgroundColor: status === 'APPROVED' ? '#e8f5e9' : status === 'REJECTED' ? '#fce4ec' : isActionRequired ? '#fff7ed' : '#fef3c7',
                          cursor: 'pointer',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            backgroundColor: '#fff',
                            border: `2px solid ${status === 'APPROVED' ? '#198754' : status === 'REJECTED' ? '#dc3545' : isActionRequired ? '#f97316' : '#f59e0b'}`,
                            flexShrink: 0,
                          }}>
                            {status === 'APPROVED' ? <BsCheckCircleFill size={10} style={{ color: '#198754' }} />
                              : status === 'REJECTED' ? <BsXCircleFill size={10} style={{ color: '#dc3545' }} />
                              : <BsClockFill size={10} style={{ color: isActionRequired ? '#f97316' : '#b45309' }} />}
                          </span>
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: status === 'APPROVED' ? '#166534' : status === 'REJECTED' ? '#991b1b' : '#78350f' }}>
                            Attempt {previousInstances.length + 1}
                          </span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: status === 'APPROVED' ? '#166534' : status === 'REJECTED' ? '#991b1b' : isActionRequired ? '#9a3412' : '#92400e',
                            backgroundColor: status === 'APPROVED' ? '#f0fdf4' : status === 'REJECTED' ? '#fef2f2' : isActionRequired ? '#fff' : '#fffbeb',
                            padding: '1px 8px',
                            borderRadius: '10px',
                            border: `1px solid ${status === 'APPROVED' ? '#bbf7d0' : status === 'REJECTED' ? '#fecaca' : isActionRequired ? '#fdba74' : '#fbbf24'}`,
                          }}>
                            {isActionRequired ? 'Action Required' : statusInfo.label}
                          </span>
                          <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            color: '#fff',
                            backgroundColor: status === 'APPROVED' ? '#198754' : status === 'REJECTED' ? '#dc3545' : isActionRequired ? '#f97316' : '#d97706',
                            padding: '1px 8px',
                            borderRadius: '10px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em',
                            width: isMobile ? '100%' : 'auto',
                            textAlign: isMobile ? 'center' : 'left',
                          }}>
                            {status === 'APPROVED' ? 'Completed' : status === 'REJECTED' ? 'Rejected' : 'Current'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: '#aaa', flexShrink: 0 }}>
                          {currentAttemptExpanded ? '▲' : '▼'}
                        </span>
                      </div>

                      {currentAttemptExpanded && (
                        <div style={{ padding: '12px' }}>
                          <ApprovalTimeline
                            steps={steps}
                            currentStep={currentStep}
                            initiatedBy={initiatedBy}
                            instanceStatus={effectiveBacklog ? 'BACKLOG' : status}
                            isActionRequired={isActionRequired}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline - shown directly when no previous attempts */}
                {previousInstances.length === 0 && (
                  <ApprovalTimeline
                    steps={steps}
                    currentStep={currentStep}
                    initiatedBy={initiatedBy}
                    instanceStatus={effectiveBacklog ? 'BACKLOG' : status}
                    isActionRequired={isActionRequired}
                  />
                )}

                {/* Action buttons when hidden from top */}
                {isActionRequired && hideTopButtons && !effectiveBacklog && !shouldUseMobileStickyActions && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #f0f0f0'
                  }}>
                    <button
                      className="aws-action-btn aws-btn-approve"
                      onClick={() => openActionModal("APPROVE")}
                      disabled={actionLoading}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <BsShieldCheck size={14} />
                      Approve
                    </button>
                    <button
                      className="aws-action-btn aws-btn-reject"
                      onClick={() => openActionModal("REJECT")}
                      disabled={actionLoading}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      <BsShieldX size={14} />
                      Reject
                    </button>
                  </div>
                )}

                {/* Status messages */}
                {status === "APPROVED" && isAutoApproved && (() => {
                  const isSchedulerAutoApproved = !!instance?.metadata?.auto_approved_reason;
                  const isCreatorAutoApproved = instance?.metadata?.auto_approved === true && !isSchedulerAutoApproved;
                  const pendingApprovers = [];
                  if (isSchedulerAutoApproved && steps?.length > 0) {
                    steps.forEach(step => {
                      (step.approvers || []).forEach(approver => {
                        if (!instance.action_history?.some(a => a.actor?.user_id === approver.user_id && a.action === 'APPROVE')) {
                          pendingApprovers.push(approver);
                        }
                      });
                    });
                  }
                  return (
                    <div style={{
                      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                      border: '1px solid #bbf7d0',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      marginTop: '14px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <BsLightningChargeFill size={15} style={{ color: '#22c55e' }} />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#166534' }}>
                          Auto Published
                        </span>
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 600, color: '#166534',
                          background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
                          padding: '1px 6px', borderRadius: '8px',
                        }}>
                          {isCreatorAutoApproved ? 'Creator is final approver' : 'Publish date arrived'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#4b5563' }}>
                        {isCreatorAutoApproved
                          ? 'This was auto-published because the creator is the final approver in the workflow.'
                          : 'This was auto-published by the system when the scheduled publish date arrived, as the approval was still pending.'
                        }
                      </div>
                      {pendingApprovers.length > 0 && (
                        <div style={{
                          fontSize: '0.72rem', color: '#92400e', fontWeight: 500,
                          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                          padding: '4px 8px', borderRadius: '6px', marginTop: '8px',
                        }}>
                          Approvers who did not act: {pendingApprovers.map(a => a.user_name || a.name).filter(Boolean).join(', ') || 'Unknown'}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {status === "APPROVED" && !isAutoApproved && (
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

      {shouldUseMobileStickyActions && (
        <div className="aws-mobile-sticky">
          <div className="aws-mobile-sticky-inner">
            <div className="aws-mobile-sticky-copy">
              <div style={{ minWidth: 0 }}>
                <div className="aws-mobile-sticky-kicker">Approval Workflow</div>
                <div className="aws-mobile-sticky-label">{entityLabel}</div>
              </div>
              <Badge bg="warning" style={{ fontSize: "0.68rem", fontWeight: 700, padding: "6px 8px", color: "#111827", border: "1px solid rgba(17,24,39,0.08)" }}>
                Step {currentStep}/{totalSteps || currentStep}
              </Badge>
            </div>
            <div className="aws-mobile-sticky-actions">
              <button
                className="aws-action-btn aws-btn-approve"
                onClick={() => openActionModal("APPROVE")}
                disabled={actionLoading || localActionLoading}
              >
                <BsShieldCheck size={14} />
                Approve
              </button>
              <button
                className="aws-action-btn aws-btn-reject"
                onClick={() => openActionModal("REJECT")}
                disabled={actionLoading || localActionLoading}
              >
                <BsShieldX size={14} />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      <ApprovalActionModal
        show={showActionModal}
        actionType={actionType}
        onClose={() => setShowActionModal(false)}
        onSubmit={handleAction}
        loading={actionLoading || localActionLoading}
        entityLabel={entityLabel}
      />

      {/* Existing PO Merge Modal - shown to final approver of NEGOTIATION_QUOTE */}
      <ExistingPOModal
        show={showExistingPOModal}
        onHide={setShowExistingPOModal}
        existingPos={existingPos}
        selectedPo={selectedPo}
        setSelectedPo={setSelectedPo}
        onConfirm={handleExistingPOConfirm}
      />
    </>
  );
};

export default ApprovalWorkflowSection;
