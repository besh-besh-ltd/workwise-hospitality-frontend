import React, { useState } from "react";
import { Card, Badge, Button, Alert, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  BsCheckCircleFill,
  BsXCircleFill,
  BsClockFill,
  BsShieldCheck,
  BsArrowRepeat,
} from "react-icons/bs";
import useApprovalWorkflow from "@/hooks/useApprovalWorkflow";
import ApprovalTimeline from "./ApprovalTimeline";
import ApprovalActionModal from "./ApprovalActionModal";

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

const ApprovalWorkflowSection = ({ entityType, entityId, entityLabel = "Item" }) => {
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
    const result = await handleApprovalAction(actionType, comment);
    if (result.success) {
      toast.success(
        `${entityLabel} ${actionType === "APPROVE" ? "approved" : "rejected"} successfully`
      );
      setShowActionModal(false);
    } else {
      toast.error(result.error || `Failed to ${actionType.toLowerCase()}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted mb-0">Loading approval workflow...</p>
        </Card.Body>
      </Card>
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

  // No approval instance
  if (!instance) {
    return (
      <Card className="border-0 shadow-sm">
        <Card.Body className="text-center py-5">
          <BsShieldCheck size={48} className="text-muted mb-3 opacity-50" />
          <h6 className="text-muted">No Approval Workflow</h6>
          <p className="text-muted small mb-0">
            No approval workflow is currently active for this {entityLabel.toLowerCase()}.
          </p>
        </Card.Body>
      </Card>
    );
  }

  const statusInfo = statusConfig[status] || statusConfig.PENDING;
  const StatusIcon = statusInfo.icon;

  return (
    <>
      <Card className="border-0 shadow-sm">
        {/* Header */}
        <Card.Header
          className="py-3"
          style={{
            backgroundColor: status === "PENDING" && canUserApprove ? "#fff3cd" : "#fff",
            borderBottom: "1px solid #dee2e6",
          }}
        >
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: statusInfo.color,
                  color: "white",
                }}
              >
                <StatusIcon size={20} />
              </div>
              <div>
                <h6 className="mb-0 fw-bold">Approval Workflow</h6>
                <small className="text-muted">
                  {totalSteps > 0 ? `Step ${currentStep} of ${totalSteps}` : "No steps configured"}
                </small>
              </div>
            </div>

            <Badge
              bg={statusInfo.variant}
              className="px-3 py-2"
              style={{ fontSize: "0.85rem" }}
            >
              {statusInfo.label}
            </Badge>
          </div>

          {/* Action Required Notice */}
          {canUserApprove && status === "PENDING" && (
            <Alert variant="warning" className="mt-3 mb-0 py-2 border-0">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Action Required:</strong> You are the current approver.
                  Please review and take action below.
                </div>
              </div>
            </Alert>
          )}
        </Card.Header>

        {/* Body */}
        <Card.Body className="py-4">
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
              <h6 className="fw-bold mb-0 fs-5">Take Action</h6>
              <p className="text-muted small mb-3">
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
            <Alert variant="danger" className="mt-4 mb-0 d-flex align-items-center gap-2">
              <BsXCircleFill size={20} />
              <div>
                <strong>Rejected.</strong> This {entityLabel.toLowerCase()} has been rejected.
                Please review the rejection reason in the timeline above.
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
        </Card.Body>
      </Card>

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
