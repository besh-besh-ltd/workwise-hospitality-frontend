import React, { useState, useEffect } from "react";
import { Accordion, Badge, Button, Alert, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  BsCheckCircleFill,
  BsXCircleFill,
  BsClockFill,
  BsShieldCheck,
  BsArrowRepeat,
} from "react-icons/bs";
import { Button } from "react-bootstrap";
import useApprovalWorkflow from "@/hooks/useApprovalWorkflow";
import ApprovalTimeline from "./ApprovalTimeline";
import ApprovalActionModal from "./ApprovalActionModal";
import { findMatchingPolicy } from "@/services/approval";

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
  onActionComplete    // Optional: Callback after action completes
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
  const [policy, setPolicy] = useState(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState(null);

  const openActionModal = (type) => {
    setActionType(type);
    setShowActionModal(true);
  };

  const handleAction = async (comment) => {
    let result;

    // Use custom handlers if provided (for negotiation module)
    if (actionType === "APPROVE" && onCustomApprove) {
      result = await onCustomApprove(comment);
    } else if (actionType === "REJECT" && onCustomReject) {
      result = await onCustomReject(comment);
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

  // Fetch matching policy when there's no instance
  useEffect(() => {
    const fetchPolicy = async () => {
      if (instance || !entityType || !hospitalityCompanyId) {
        return;
      }

      setPolicyLoading(true);
      setPolicyError(null);
      try {
        const params = {
          entity_type: entityType,
          hospitality_company_id: hospitalityCompanyId,
        };
        if (hotelId) params.hotel_id = hotelId;
        if (departmentId) params.department_id = departmentId;

        const response = await findMatchingPolicy(params);
        const policyData = response?.data?.data || response?.data || null;
        setPolicy(policyData);
      } catch (err) {
        console.error("Failed to fetch approval policy:", err);
        setPolicyError(err?.message || "Failed to fetch approval policy");
        setPolicy(null);
      } finally {
        setPolicyLoading(false);
      }
    };

    fetchPolicy();
  }, [instance, entityType, hospitalityCompanyId, hotelId, departmentId]);

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

  // No approval instance - show policy if available
  if (!instance) {
    if (policyLoading) {
      return (
        <div className="border rounded-md p-4 text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted mb-0">Loading approval workflow...</p>
        </div>
      );
    }

    if (policy && policy.steps && policy.steps.length > 0) {
      // Show policy workflow even without active instance
      return (
        <Accordion className="approval-workflow-accordion">
          <Accordion.Item eventKey="0" className="border rounded-md overflow-hidden">
            <Accordion.Header>
              <div className="d-flex justify-content-between align-items-center w-100 me-3 py-1">
                <div className="d-flex align-items-center gap-3">
                  <div
                    className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: 45,
                      height: 45,
                      backgroundColor: "#6c757d",
                      color: "white",
                    }}
                  >
                    <BsShieldCheck size={22} />
                  </div>
                  <div>
                    <h6 className="mb-1 fw-bold text-dark" style={{ fontSize: "1rem" }}>Approval Workflow</h6>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <small className="text-secondary">
                        {policy.steps.length} step{policy.steps.length !== 1 ? 's' : ''} configured
                      </small>
                      <Badge bg="secondary" className="px-2 py-1" style={{ fontSize: "0.75rem" }}>
                        Not Started
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </Accordion.Header>
            <Accordion.Body className="py-4">
              <Alert variant="info" className="mb-3">
                <strong>Workflow Configured:</strong> This {entityLabel.toLowerCase()} will follow the approval workflow below when submitted for approval.
              </Alert>
              <ApprovalTimeline
                steps={policy.steps.map((step, index) => ({
                  ...step,
                  step_order: step.step_order || index + 1,
                  status: 'PENDING',
                  approvers: []
                }))}
                currentStep={0}
                initiatedBy={null}
              />
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      );
    }

    // No policy found
    return (
      <div className="border rounded-md p-4 text-center">
        <BsShieldCheck size={48} className="text-muted mb-3 opacity-50" />
        <h6 className="text-muted">No Approval Workflow</h6>
        <p className="text-muted small mb-0">
          {policyError 
            ? `Unable to load approval workflow: ${policyError}`
            : `No approval workflow is currently configured for this ${entityLabel.toLowerCase()}.`}
        </p>
      </div>
    );
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
                <div className="d-flex gap-2">
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
                    <div className="fw-bold mb-2">Your Tender / RFQ has been rejected</div>
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
