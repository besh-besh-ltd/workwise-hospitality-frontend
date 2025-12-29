import React, { useState } from "react";
import { Alert, Button, Spinner } from "react-bootstrap";
import { toast } from "react-toastify";
import { BsExclamationCircleFill, BsCheckCircleFill, BsXCircleFill } from "react-icons/bs";
import useApprovalWorkflow from "@/hooks/useApprovalWorkflow";
import ApprovalActionModal from "./ApprovalActionModal";

/**
 * A prominent banner to be placed at the TOP of the page
 * Shows when user has pending approval action required
 */
const ApprovalPendingBanner = ({ entityType, entityId, entityLabel = "Item" }) => {
  const {
    instance,
    loading,
    canUserApprove,
    status,
    currentStep,
    totalSteps,
    actionLoading,
    handleApprovalAction,
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

  const scrollToApprovalSection = () => {
    const section = document.querySelector(".buyer-rfq-approval-sec");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Don't show anything while loading
  if (loading) {
    return null;
  }

  // Don't show if no instance or not pending
  if (!instance || status !== "PENDING") {
    return null;
  }

  // Show banner when user CAN approve (they are in line for approval)
  if (canUserApprove) {
    return (
      <>
        <Alert
          variant="warning"
          className="border-0 shadow-sm"
          style={{
            background: "linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%)",
            borderLeft: "4px solid #ffc107 !important",
          }}
        >
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: "#ffc107",
                  flexShrink: 0,
                }}
              >
                <BsExclamationCircleFill size={24} className="text-dark" />
              </div>
              <div>
                <div className="fw-bold text-dark">
                  Your Approval is Required
                </div>
                <div className="text-dark opacity-75 text-sm">
                  This {entityLabel.toLowerCase()} is waiting for your approval (Step {currentStep} of {totalSteps}).
                  Please review and take action.
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 flex-shrink-0">
              <Button
                variant="success"
                size="sm"
                className="p-2"
                onClick={() => openActionModal("APPROVE")}
                disabled={actionLoading}
              >
                Approve
              </Button>
              <Button
                variant="outline-danger"
                size="sm"
                className="p-2"
                onClick={() => openActionModal("REJECT")}
                disabled={actionLoading}
              >
                Reject
              </Button>
              <Button
                variant="outline-dark"
                size="sm"
                className="p-2"
                onClick={scrollToApprovalSection}
              >
                View Details
              </Button>
            </div>
          </div>
        </Alert>

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
  }

  // Show info banner when approval is pending but user is NOT the current approver
  return (
    <Alert
      variant="info"
      className="border-0"
      style={{
        background: "linear-gradient(135deg, #cce5ff 0%, #b8daff 100%)",
        borderLeft: "4px solid #0d6efd !important",
      }}
    >
      <div className="d-flex align-items-center gap-3">
        <div
          className="d-flex align-items-center justify-content-center rounded-circle"
          style={{
            width: 40,
            height: 40,
            backgroundColor: "#0d6efd",
            flexShrink: 0,
          }}
        >
          <Spinner animation="border" size="sm" variant="light" />
        </div>
        <div>
          <div className="fw-semibold text-dark">
            Approval In Progress
          </div>
          <div className="text-dark opacity-75 small">
            This {entityLabel.toLowerCase()} is pending approval (Step {currentStep} of {totalSteps}).
            You are not the current approver.
          </div>
        </div>
        <Button
          variant="outline-primary"
          size="sm"
          className="ms-auto p-2"
          onClick={scrollToApprovalSection}
        >
          View Status
        </Button>
      </div>
    </Alert>
  );
};

export default ApprovalPendingBanner;
