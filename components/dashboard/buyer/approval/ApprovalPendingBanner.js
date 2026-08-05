import React, { useState } from "react";
import { Button } from "react-bootstrap";
import { toast } from "react-toastify";
import { BsShieldExclamation, BsClockHistory, BsShieldCheck, BsShieldX, BsArrowDown, BsLightningChargeFill } from "react-icons/bs";
import useApprovalWorkflow from "@/hooks/useApprovalWorkflow";
import ApprovalActionModal from "./ApprovalActionModal";

/**
 * Compact, modern banner placed at the TOP of the page
 * Shows when user has pending approval action required
 */
const ApprovalPendingBanner = ({ entityType, entityId, entityLabel = "Item", isPublished = false, hideTopButtons = false, isBacklog = false }) => {
  const {
    instance,
    loading,
    canUserApprove,
    status,
    currentStep,
    totalSteps,
    steps,
    actionLoading,
    handleApprovalAction,
    isAutoApproved,
    autoApprovedReason,
  } = useApprovalWorkflow({ entityType, entityId, enabled: !!entityId });

  // Derive current step approver details for display
  const currentPendingStep = steps?.find(s => s.step_order === currentStep && s.status === "PENDING");
  const pendingApprovers = currentPendingStep?.approvers?.filter(a => a.status === "PENDING") || [];
  const decisionRule = currentPendingStep?.decision_rule;
  const decisionRuleText = decisionRule === "ANY" ? "Any one can approve" : decisionRule === "ALL" ? "All must approve" : null;
  const pendingApproverNames = pendingApprovers.map(a => a.user_name || a.name).filter(Boolean);

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

  if (loading || !instance) {
    return null;
  }

  // Auto-approved banner (creator was final approver OR scheduler auto-approved)
  if (isAutoApproved && status === "APPROVED") {
    const isSchedulerAutoApproved = !!instance?.metadata?.auto_approved_reason;
    const isCreatorAutoApproved = instance?.metadata?.auto_approved === true && !isSchedulerAutoApproved;

    // Find approvers who didn't manually approve (for scheduler auto-approval)
    const pendingApprovers = [];
    if (isSchedulerAutoApproved && steps?.length > 0) {
      steps.forEach(step => {
        (step.approvers || []).forEach(approver => {
          // REMOVED is a mid-flight reconciler's soft-tombstone (role revoked
          // while the approval was in progress) — they never had a chance to
          // act, so they must not be named among "did not approve".
          if (approver.status === "REMOVED") return;
          // In scheduler auto-approval, all approvers were force-set to APPROVED
          // They didn't actually act - check if there's no matching action_history entry
          if (!instance.action_history?.some(a => a.actor?.user_id === approver.user_id && a.action === 'APPROVE')) {
            pendingApprovers.push(approver);
          }
        });
      });
    }

    return (
      <>
        <style jsx>{`
          .apb-auto-approved {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            padding: 12px 18px;
            margin-bottom: 16px;
            border-radius: 12px;
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border: 1px solid #bbf7d0;
            border-left: 4px solid #22c55e;
            box-shadow: 0 2px 12px rgba(34, 197, 94, 0.10);
            position: relative;
            overflow: hidden;
          }
          .apb-auto-approved-left {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 0;
            flex: 1;
          }
          .apb-auto-approved-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(34, 197, 94, 0.18);
            flex-shrink: 0;
          }
          .apb-auto-approved-text {
            font-size: 0.86rem;
            font-weight: 600;
            color: #166534;
          }
          .apb-auto-approved-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.68rem;
            font-weight: 600;
            color: #166534;
            background: rgba(34, 197, 94, 0.15);
            border: 1px solid rgba(34, 197, 94, 0.3);
            padding: 2px 8px;
            border-radius: 10px;
            margin-left: 6px;
          }
          .apb-auto-approved-sub {
            font-size: 0.72rem;
            color: #4b5563;
            font-weight: 400;
            margin-top: 2px;
          }
          .apb-auto-approved-pending {
            font-size: 0.70rem;
            color: #92400e;
            font-weight: 500;
            margin-top: 3px;
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.2);
            padding: 3px 8px;
            border-radius: 6px;
            display: inline-block;
          }
        `}</style>

        <div className="apb-auto-approved">
          <div className="apb-auto-approved-left">
            <div className="apb-auto-approved-icon">
              <BsLightningChargeFill size={17} style={{ color: "#22c55e" }} />
            </div>
            <div>
              <div className="apb-auto-approved-text">
                Auto Published
                <span className="apb-auto-approved-tag">
                  <BsLightningChargeFill size={9} />
                  {isCreatorAutoApproved ? "Creator is final approver" : "Scheduled auto-publish"}
                </span>
              </div>
              <div className="apb-auto-approved-sub">
                {isCreatorAutoApproved
                  ? `This ${entityLabel.toLowerCase()} was auto-published because the creator is the final approver in the workflow. No additional approval was required.`
                  : `This ${entityLabel.toLowerCase()} was auto-published when the publish date arrived. The approval was pending and was automatically published by the system.`
                }
              </div>
              {pendingApprovers.length > 0 && (
                <div className="apb-auto-approved-pending">
                  Did not approve before auto-publish: {pendingApprovers.map(a => a.user_name || a.name).filter(Boolean).join(", ") || "Unknown approvers"}
                </div>
              )}
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              style={{ fontSize: "0.76rem", fontWeight: 600, padding: "5px 14px", borderRadius: 7 }}
              onClick={scrollToApprovalSection}
            >
              <BsArrowDown size={13} className="me-1" />
              Details
            </Button>
          </div>
        </div>
      </>
    );
  }

  // Don't show banner for non-auto-approved completed statuses
  if (status !== "PENDING") {
    return null;
  }

  // Action-required banner (current approver)
  if (canUserApprove) {
    // If already published (backlog), don't show approve/reject buttons
    if (isPublished || isBacklog) {
      return (
        <>
          <style jsx>{`
            .apb-skipped {
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex-wrap: wrap;
              gap: 10px;
              padding: 12px 18px;
              margin-bottom: 16px;
              border-radius: 12px;
              background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
              border: 1px solid #f5c6cb;
              border-left: 5px solid #dc3545;
              box-shadow: 0 2px 12px rgba(220, 53, 69, 0.12);
              position: relative;
              overflow: hidden;
            }
            .apb-skipped::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 3px;
              background: linear-gradient(90deg, #dc3545 0%, #e74c3c 50%, #dc3545 100%);
              background-size: 200% 100%;
              animation: apb-shimmer-red 3s linear infinite;
            }
            @keyframes apb-shimmer-red {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
            .apb-skipped-left {
              display: flex;
              align-items: center;
              gap: 10px;
              min-width: 0;
            }
            .apb-skipped-icon {
              width: 34px;
              height: 34px;
              border-radius: 10px;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(220, 53, 69, 0.15);
              flex-shrink: 0;
            }
            .apb-skipped-text {
              font-size: 0.86rem;
              color: #495057;
            }
            .apb-skipped-text strong {
              color: #842029;
              font-weight: 600;
            }
            .apb-skipped-sub {
              font-size: 0.72rem;
              color: #856404;
              font-weight: 400;
              margin-top: 2px;
            }
          `}</style>

          <div className="apb-skipped">
            <div className="apb-skipped-left">
              <div className="apb-skipped-icon">
                <BsShieldExclamation size={17} style={{ color: "#dc3545" }} />
              </div>
              <div>
                <div className="apb-skipped-text">
                  <strong>Published without approval.</strong>
                </div>
                <div className="apb-skipped-sub">
                  This {entityLabel.toLowerCase()} was auto-published as the approval was not completed in time. No action is required.
                </div>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                size="sm"
                style={{ fontSize: "0.76rem", fontWeight: 600, padding: "5px 14px", borderRadius: 7 }}
                onClick={scrollToApprovalSection}
              >
                <BsArrowDown size={13} className="me-1" />
                Details
              </Button>
            </div>
          </div>
        </>
      );
    }

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
          .apb-rule-tag {
            display: inline-flex;
            align-items: center;
            font-size: 0.62rem;
            font-weight: 500;
            padding: 1px 6px;
            border-radius: 4px;
            background: rgba(0, 0, 0, 0.06);
            color: #6c757d;
            margin-left: 6px;
            vertical-align: middle;
            white-space: nowrap;
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
              <div className="apb-action-sub">
                Step {currentStep} of {totalSteps}
                {decisionRuleText && <span className="apb-rule-tag">{decisionRuleText}</span>}
              </div>
            </div>
          </div>
          <div className="apb-action-btns">
            {!hideTopButtons && (
              <>
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
              </>
            )}
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

  // Published but approval still pending - show "Approval Skipped" warning (backlog)
  if (isPublished || isBacklog) {
    return (
      <>
        <style jsx>{`
          .apb-skipped {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 10px;
            padding: 12px 18px;
            margin-bottom: 16px;
            border-radius: 12px;
            background: linear-gradient(135deg, #fff5f5 0%, #ffe5e5 100%);
            border: 1px solid #f5c6cb;
            border-left: 5px solid #dc3545;
            box-shadow: 0 2px 12px rgba(220, 53, 69, 0.12);
            position: relative;
            overflow: hidden;
          }
          .apb-skipped::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #dc3545 0%, #e74c3c 50%, #dc3545 100%);
            background-size: 200% 100%;
            animation: apb-shimmer-red 3s linear infinite;
          }
          @keyframes apb-shimmer-red {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          .apb-skipped-left {
            display: flex;
            align-items: center;
            gap: 10px;
            min-width: 0;
          }
          .apb-skipped-icon {
            width: 34px;
            height: 34px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(220, 53, 69, 0.15);
            flex-shrink: 0;
          }
          .apb-skipped-text {
            font-size: 0.86rem;
            color: #495057;
          }
          .apb-skipped-text strong {
            color: #842029;
            font-weight: 600;
          }
          .apb-skipped-sub {
            font-size: 0.72rem;
            color: #856404;
            font-weight: 400;
            margin-top: 2px;
          }
        `}</style>

        <div className="apb-skipped">
          <div className="apb-skipped-left">
            <div className="apb-skipped-icon">
              <BsShieldExclamation size={17} style={{ color: "#dc3545" }} />
            </div>
            <div>
              <div className="apb-skipped-text">
                <strong>Published without approval.</strong>
              </div>
              <div className="apb-skipped-sub">
                This {entityLabel.toLowerCase()} was auto-published as the approval was not completed in time. No action is required.
              </div>
            </div>
          </div>
          <div className="d-flex gap-2">
            <Button
              variant="outline-secondary"
              size="sm"
              style={{ fontSize: "0.76rem", fontWeight: 600, padding: "5px 14px", borderRadius: 7 }}
              onClick={scrollToApprovalSection}
            >
              <BsArrowDown size={13} className="me-1" />
              Details
            </Button>
          </div>
        </div>
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
        .apb-rule-tag {
          display: inline-flex;
          align-items: center;
          font-size: 0.62rem;
          font-weight: 500;
          padding: 1px 6px;
          border-radius: 4px;
          background: rgba(0, 0, 0, 0.06);
          color: #6c757d;
          margin-left: 6px;
          vertical-align: middle;
          white-space: nowrap;
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
              — Step {currentStep} of {totalSteps}
              {decisionRuleText && <span className="apb-rule-tag">{decisionRuleText}</span>}
              {pendingApproverNames.length > 0
                ? ` · Waiting for ${pendingApproverNames.join(", ")}`
                : " · Waiting for designated approver"
              }
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
