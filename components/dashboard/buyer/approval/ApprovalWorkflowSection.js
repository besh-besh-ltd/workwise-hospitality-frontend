import React, { useState } from "react";
import { Accordion, Badge, Button, Alert, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  BsCheckCircleFill,
  BsXCircleFill,
  BsClockFill,
  BsArrowRepeat,
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
  },
  APPROVED: {
    variant: "success",
    label: "Approved",
    icon: BsCheckCircleFill,
    color: "#198754",
  },
  REJECTED: {
    variant: "danger",
    label: "Rejected",
    icon: BsXCircleFill,
    color: "#dc3545",
  },
  CANCELLED: {
    variant: "secondary",
    label: "Cancelled",
    icon: BsXCircleFill,
    color: "#6c757d",
  },
};

const ApprovalWorkflowSection = ({
  entityType,
  entityId,
  entityLabel = "Item",
  hospitalityCompanyId,
  hotelId,
  departmentId,
  onCustomApprove,    // Optional: Custom approve handler (for negotiation)
  onCustomReject,     // Optional: Custom reject handler (for negotiation)
  onActionComplete,   // Optional: Callback after action completes
  vendorCodeMap = {}  // Optional: For displaying vendor codes in selected quotes
}) => {
  const {
    instance,
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
  } = useApprovalWorkflow({ entityType, entityId, enabled: !!entityId });

  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState(null);

  const openActionModal = (type) => {
    setActionType(type);
    setShowActionModal(true);
  };

  const handleAction = async (comment) => {
    let result;

    // Build context object with instance data for custom handlers
    const handlerContext = {
      approval_instance_id: instance?.id,
      approval_instance_step_id: instance?.user_approval_step_id,
    };

    // Use custom handlers if provided (for ARC, negotiation modules)
    if (actionType === "APPROVE" && onCustomApprove) {
      result = await onCustomApprove(comment, handlerContext);
    } else if (actionType === "REJECT" && onCustomReject) {
      result = await onCustomReject(comment, handlerContext);
    } else {
      // Default behavior using hook's handleApprovalAction
      result = await handleApprovalAction(actionType, comment);
    }

    if (result.success) {
      toast.success(
        `${entityLabel} ${actionType === "APPROVE" ? "approved" : "rejected"} successfully`
      );
      setShowActionModal(false);
      // Call action complete callback if provided
      if (onActionComplete) {
        onActionComplete();
      }
      // Refresh workflow state
      refetch();
    } else {
      toast.error(result.error || `Failed to ${actionType.toLowerCase()}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="border rounded-md p-4 text-center">
        <Spinner animation="border" variant="primary" className="mb-3" />
        <p className="text-muted mb-0">Loading approval workflow...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="warning" className="mb-0">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <strong>Unable to load approval status</strong>
            <p className="mb-0 small">{error}</p>
          </div>
          <Button variant="outline-warning" size="sm" onClick={refetch}>
            <BsArrowRepeat className="me-1" /> Retry
          </Button>
        </div>
      </Alert>
    );
  }

  // No approval instance - don't render anything
  if (!instance) {
    return null;
  }

  const statusInfo = statusConfig[status] || statusConfig.PENDING;
  const StatusIcon = statusInfo.icon;

  // Determine accordion header background color
  // Warning (yellow) if pending and action required from current user
  // Success (green) if approved or no action required
  const isActionRequired = canUserApprove && status === "PENDING";
  const headerBgColor = isActionRequired
    ? "#fff3cd"  // Bootstrap warning light
    : (status === "APPROVED" ? "#d1e7dd" : "#f8f9fa");  // Bootstrap success light or default gray

  return (
    <>
      <style jsx global>{`
        .approval-workflow-accordion .accordion-button {
          background-color: ${headerBgColor} !important;
          width: 100% !important;
          margin: 0 !important;
        }
        .approval-workflow-accordion .accordion-button:not(.collapsed) {
          background-color: ${headerBgColor} !important;
          box-shadow: none;
        }
        .approval-workflow-accordion .accordion-button:focus {
          box-shadow: none;
        }
      `}</style>
      <Accordion className="approval-workflow-accordion">
        <Accordion.Item eventKey="0" className="border rounded-md overflow-hidden">
          {/* Accordion Header */}
          <Accordion.Header>
            <div className="d-flex justify-content-between align-items-center w-100 me-3 py-1">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: 45,
                    height: 45,
                    backgroundColor: statusInfo.color,
                    color: "white",
                  }}
                >
                  <StatusIcon size={22} />
                </div>
                <div>
                  <h6 className="mb-1 fw-bold text-dark" style={{ fontSize: "1rem" }}>Approval Workflow</h6>
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <small className="text-secondary">
                      {totalSteps > 0 ? `Step ${currentStep} of ${totalSteps}` : "No steps configured"}
                    </small>
                    <Badge bg={statusInfo.variant} className="px-2 py-1" style={{ fontSize: "0.75rem" }}>
                      {statusInfo.label}
                    </Badge>
                    {isActionRequired && (
                      <Badge bg="danger" className="px-2 py-1" style={{ fontSize: "0.75rem" }}>
                        Action Required
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                {/* Status Badge - Larger */}
                <Badge
                  bg={statusInfo.variant}
                  className="px-3 py-2"
                  style={{ fontSize: "0.9rem" }}
                >
                  {statusInfo.label}
                </Badge>
              </div>
            </div>
          </Accordion.Header>

          {/* Accordion Body */}
          <Accordion.Body className="py-4">
            {/* Action Required Notice */}
            {canUserApprove && status === "PENDING" && (
              <Alert variant="warning" className="mb-3 py-2 border-0">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Action Required:</strong> You are the current approver.
                    Please review and take action below.
                  </div>
                </div>
              </Alert>
            )}

            {/* Display selected quotes from metadata (for quote approvals) */}
            {instance?.metadata?.selected_quotes?.length > 0 && (
              <SelectedQuotesDisplay
                quotes={instance.metadata.selected_quotes}
                vendorCodeMap={vendorCodeMap}
                status={status}
              />
            )}

            {/* Display vendor evaluation results for TECHNICAL entity type */}
            {entityType === 'TECHNICAL' && (instance?.metadata?.vendors?.length > 0 || instance?.metadata?.not_evaluated_vendors?.length > 0) && (
              <TechEvalVendorStatusDisplay
                vendors={instance.metadata.vendors || []}
                notEvaluatedVendors={instance.metadata.not_evaluated_vendors || []}
                roundNumber={instance.metadata.evaluation_round || 1}
                showSummary={true}
              />
            )}

            {/* Timeline */}
            <ApprovalTimeline
              steps={steps}
              currentStep={currentStep}
              initiatedBy={initiatedBy}
            />

            {/* Action Buttons for Current Approver */}
            {canUserApprove && status === "PENDING" && (
              <div
                className="mt-4 pt-4 border-top"
                style={{ backgroundColor: "#fffbeb", margin: "-1rem", padding: "1.5rem", marginTop: "1.5rem" }}
              >
                <h6 className="fw-bold mb-1 fs-5">Take Action</h6>
                <p className="text-muted mb-3">
                  Review the {entityLabel.toLowerCase()} details above and choose to approve or reject.
                  {" "}A comment is optional for approval but required for rejection.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  <Button
                    variant="success"
                    className="p-2"
                    onClick={() => openActionModal("APPROVE")}
                    disabled={actionLoading}
                  >
                    Approve {entityLabel}
                  </Button>
                  <Button
                    variant="outline-danger"
                    className="p-2"
                    onClick={() => openActionModal("REJECT")}
                    disabled={actionLoading}
                  >
                    Reject {entityLabel}
                  </Button>
                </div>
              </div>
            )}

            {/* Status Messages */}
            {status === "APPROVED" && (
              <Alert variant="success" className="mt-4 mb-0 d-flex align-items-center gap-2">
                <BsCheckCircleFill size={20} />
                <div>
                  <strong>Approved!</strong> This {entityLabel.toLowerCase()} has been fully approved
                  and can proceed to the next stage.
                </div>
              </Alert>
            )}

            {status === "REJECTED" && (
              <Alert variant="danger" className="mt-4 mb-0">
                <div className="d-flex align-items-start gap-3">
                  <BsXCircleFill size={24} className="flex-shrink-0 mt-1" />
                  <div className="flex-grow-1">
                    <div className="fw-bold mb-2">Your {entityLabel} has been rejected</div>
                    <p className="mb-2">
                      This {entityLabel.toLowerCase()} was rejected during the approval process. 
                      Please review the rejection reason in the timeline above, make necessary changes, and resubmit for approval.
                    </p>
                    <div className="d-flex gap-2 mt-3">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          // Navigate to edit page - adjust route based on entity type
                          const editRoute = entityType === 'TENDER' || entityType === 'RFQ' 
                            ? `/dashboard/buyer/rfq-management-edit?id=${entityId}`
                            : `#`;
                          if (editRoute !== '#') {
                            window.location.href = editRoute;
                          }
                        }}
                      >
                        <BsArrowRepeat className="me-1" />
                        Edit & Resubmit
                      </Button>
                    </div>
                  </div>
                </div>
              </Alert>
            )}

            {status === "PENDING" && !canUserApprove && (
              <Alert variant="info" className="mt-4 mb-0 d-flex align-items-center gap-2">
                <BsClockFill size={20} />
                <div>
                  <strong>Pending Approval.</strong> This {entityLabel.toLowerCase()} is waiting
                  for approval from the designated approver(s). You will be notified when it's your turn.
                </div>
              </Alert>
            )}
          </Accordion.Body>
        </Accordion.Item>
      </Accordion>

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
