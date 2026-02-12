import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { BsShieldExclamation, BsClockHistory, BsShieldCheck, BsShieldX, BsArrowDown } from "react-icons/bs";
import useApprovalWorkflow from "@/hooks/useApprovalWorkflow";
import ApprovalActionModal from "./ApprovalActionModal";

/**
 * Compact, modern banner placed at the TOP of the page
 * Shows when user has pending approval action required
 */
const ApprovalPendingBanner = ({ entityType, entityId, entityLabel = "Item", isPublished = false }) => {
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
    const section = document.querySelector(".approval-workflow-section") || document.querySelector(".approval-workflow-accordion");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading || !instance || status !== "PENDING") {
    return null;
  }

  // Action-required banner (current approver)
  if (canUserApprove) {
    return (
      <>
        <style jsx>{`
          .apb-action {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            padding: 12px 18px;
            margin-bottom: 16px;
            border-radius: 12px;
            background: linear-gradient(135deg, #fffdf5 0%, #fff8e1 100%);
            border: 1px solid #ffeeba;
            border-left: 4px solid #ffc107;
            box-shadow: 0 2px 12px rgba(255, 193, 7, 0.10);
            transition: box-shadow 0.25s ease;
            position: relative;
            overflow: hidden;
          }
          .apb-action::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #ffc107 0%, #ffdb4d 50%, #ffc107 100%);
            background-size: 200% 100%;
            animation: apb-shimmer 3s linear infinite;
          }
          @keyframes apb-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .apb-action:hover {
            box-shadow: 0 4px 18px rgba(255, 193, 7, 0.18);
          }
          .apb-action-left {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
          }
          .apb-action-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255,193,7,0.18);
            flex-shrink: 0;
          }
          .apb-action-text {
            font-size: 0.86rem;
            font-weight: 600;
            color: #664d03;
          }
          .apb-action-sub {
            font-size: 0.72rem;
            color: #856404;
            font-weight: 400;
            margin-top: 1px;
          }
          .apb-action-btns {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
          }
          .apb-btn {
            font-size: 0.76rem;
            font-weight: 600;
            padding: 5px 14px;
            border-radius: 7px;
            transition: all 0.15s ease;
          }
          .apb-btn:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 2px 6px rgba(0,0,0,0.08);
          }
        `}</style>

        <div className="apb-action">
          <div className="apb-action-left">
            <div className="apb-action-icon">
              <BsShieldExclamation size={17} style={{ color: "#d97706" }} />
            </div>
            <div>
              <div className="apb-action-text">Your approval is required</div>
              <div className="apb-action-sub">Step {currentStep} of {totalSteps}</div>
            </div>
          </div>
          <div className="apb-action-btns">
            <Button
              variant="success"
              size="sm"
              className="apb-btn p-2"
              onClick={() => openActionModal("APPROVE")}
              disabled={actionLoading}
            >
              <BsShieldCheck size={13} className="me-1" />
              Approve
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              className="apb-btn p-2"
              onClick={() => openActionModal("REJECT")}
              disabled={actionLoading}
            >
              <BsShieldX size={13} className="me-1" />
              Reject
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              className="apb-btn p-2"
              onClick={scrollToApprovalSection}
            >
              <BsArrowDown size={13} className="me-1" />
              Details
            </Button>
          </div>
        </div>

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

  // Published but approval still pending - show "Approval Skipped" warning
  if (isPublished) {
    const initiatedByName = instance?.initiated_by?.name || instance?.initiated_by_name || "Unknown";
    return (
      <>
        <style jsx>{`
          .apb-skipped {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            padding: 10px 16px;
            margin-bottom: 16px;
            border-radius: 10px;
            background: linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);
            border: 1px solid #f5c6cb;
            border-left: 4px solid #e74c3c;
            box-shadow: 0 2px 8px rgba(231, 76, 60, 0.08);
          }
          .apb-skipped-left {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
          }
          .apb-skipped-icon {
            width: 30px;
            height: 30px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(231, 76, 60, 0.12);
            flex-shrink: 0;
          }
          .apb-skipped-text {
            font-size: 0.82rem;
            color: #495057;
          }
          .apb-skipped-text strong {
            color: #c0392b;
            font-weight: 600;
          }
        `}</style>

        <div className="apb-skipped">
          <div className="apb-skipped-left">
            <div className="apb-skipped-icon">
              <BsShieldExclamation size={14} style={{ color: "#e74c3c" }} />
            </div>
            <div className="apb-skipped-text">
              <strong>Approval Pending</strong>
              <span className="ms-1" style={{ color: "#6c757d" }}>
                — Published without completed approval · Step {currentStep} of {totalSteps}
                {canUserApprove && " · Your approval is required"}
              </span>
              <div style={{ fontSize: "0.72rem", color: "#856404", marginTop: 2 }}>
                Submitted by: <strong>{initiatedByName}</strong>
              </div>
            </div>
          </div>
          <div className="d-flex gap-2">
            {canUserApprove && (
              <>
                <Button
                  variant="success"
                  size="sm"
                  style={{ fontSize: "0.73rem", fontWeight: 600, padding: "4px 10px", borderRadius: 6 }}
                  onClick={() => openActionModal("APPROVE")}
                  disabled={actionLoading}
                >
                  <BsShieldCheck size={12} className="me-1" />
                  Approve Now
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  style={{ fontSize: "0.73rem", fontWeight: 600, padding: "4px 10px", borderRadius: 6 }}
                  onClick={() => openActionModal("REJECT")}
                  disabled={actionLoading}
                >
                  <BsShieldX size={12} className="me-1" />
                  Reject
                </Button>
              </>
            )}
            <Button
              variant="outline-secondary"
              size="sm"
              style={{ fontSize: "0.73rem", fontWeight: 500, padding: "4px 10px", borderRadius: 6 }}
              onClick={scrollToApprovalSection}
            >
              <BsArrowDown size={12} className="me-1" />
              Details
            </Button>
          </div>
        </div>

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

  // Info banner (non-approver)
  return (
    <>
      <style jsx>{`
        .apb-info {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          padding: 10px 16px;
          margin-bottom: 16px;
          border-radius: 10px;
          background: #ffffff;
          border: 1px solid #cfe2ff;
          border-left: 4px solid #0d6efd;
          box-shadow: 0 2px 8px rgba(13, 110, 253, 0.06);
        }
        .apb-info-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .apb-info-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #e7f0ff;
          flex-shrink: 0;
        }
        .apb-info-text {
          font-size: 0.82rem;
          color: #495057;
        }
        .apb-info-text strong {
          color: #2d3436;
          font-weight: 600;
        }
        .apb-info-btn {
          font-size: 0.73rem;
          font-weight: 500;
          padding: 4px 10px;
          border-radius: 6px;
        }
      `}</style>

      <div className="apb-info">
        <div className="apb-info-left">
          <div className="apb-info-icon">
            <BsClockHistory size={14} style={{ color: "#0d6efd" }} />
          </div>
          <div className="apb-info-text">
            <strong>Pending approval</strong>
            <span className="ms-1" style={{ color: "#6c757d" }}>
              — Step {currentStep} of {totalSteps} · Waiting for designated approver
            </span>
          </div>
        </div>
        <Button
          variant="outline-primary"
          size="sm"
          className="apb-info-btn p-2"
          onClick={scrollToApprovalSection}
        >
          View
        </Button>
      </div>
    </>
  );
};

export default ApprovalPendingBanner;
