import React, { useState, useEffect } from "react";
import { Badge, Collapse, OverlayTrigger, Tooltip } from "react-bootstrap";
import {
  BsCheckCircleFill,
  BsXCircleFill,
  BsClockFill,
  BsPersonFill,
  BsDashCircleFill,
  BsChatLeftTextFill,
  BsCheckLg,
  BsCircle,
  BsSkipForwardFill,
  BsExclamationTriangleFill,
} from "react-icons/bs";
import moment from "moment";

const statusConfig = {
  APPROVED: {
    stepIcon: BsCheckLg,
    color: "#198754",
    bgColor: "#d1e7dd",
    borderColor: "#198754",
    label: "Approved",
    badgeVariant: "success",
    cardBg: "#f8fdf9",
    cardBorder: "#c3e6cb",
  },
  REJECTED: {
    stepIcon: BsXCircleFill,
    color: "#dc3545",
    bgColor: "#f8d7da",
    borderColor: "#dc3545",
    label: "Rejected",
    badgeVariant: "danger",
    cardBg: "#fef8f8",
    cardBorder: "#f5c2c7",
  },
  PENDING: {
    stepIcon: BsCircle,
    color: "#6c757d",
    bgColor: "#f8f9fa",
    borderColor: "#dee2e6",
    label: "Pending",
    badgeVariant: "secondary",
    cardBg: "#ffffff",
    cardBorder: "#e9ecef",
  },
  CANCELLED: {
    stepIcon: BsDashCircleFill,
    color: "#6c757d",
    bgColor: "#e2e3e5",
    borderColor: "#d3d6d8",
    label: "Cancelled",
    badgeVariant: "secondary",
    cardBg: "#fafafa",
    cardBorder: "#d3d6d8",
  },
  EXPIRED: {
    stepIcon: BsExclamationTriangleFill,
    color: "#dc3545",
    bgColor: "#f8d7da",
    borderColor: "#dc3545",
    label: "Expired",
    badgeVariant: "danger",
    cardBg: "#fef8f8",
    cardBorder: "#f5c2c7",
  },
};

const ApprovalTimeline = ({ steps = [], currentStep, initiatedBy, instanceStatus }) => {
  const [expandedSteps, setExpandedSteps] = useState({});

  const isExpired = instanceStatus === 'BACKLOG' || instanceStatus === 'CANCELLED';

  // Auto-expand the current pending step (or first expired step)
  useEffect(() => {
    if (steps.length > 0) {
      const targetStep = isExpired
        ? steps.find((s) => s.status === "PENDING")
        : steps.find((s) => s.step_order === currentStep && s.status === "PENDING");
      if (targetStep) {
        setExpandedSteps((prev) => ({ ...prev, [targetStep.id]: true }));
      }
    }
  }, [steps, currentStep, isExpired]);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return moment.utc(dateStr).utcOffset('+05:30').format("DD-MM-YYYY hh:mm a");
  };

  // Determine effective approver display status
  // - isStepApproved: when a step with ANY rule is approved, remaining PENDING approvers are "Skipped"
  // - isExpired: when instance is backlog/cancelled, remaining PENDING approvers show "Expired"
  const getApproverStatus = (status, { isStepApproved = false } = {}) => {
    switch (status) {
      case "APPROVED":
        return { icon: BsCheckCircleFill, color: "#198754", text: "Approved", dotColor: "#198754" };
      case "REJECTED":
        return { icon: BsXCircleFill, color: "#dc3545", text: "Rejected", dotColor: "#dc3545" };
      default:
        // PENDING approver — context matters
        if (isExpired) {
          return { icon: BsExclamationTriangleFill, color: "#dc3545", text: "Expired", dotColor: "#dc3545" };
        }
        if (isStepApproved) {
          return { icon: BsSkipForwardFill, color: "#adb5bd", text: "Skipped", dotColor: "#cbd5e1" };
        }
        return { icon: BsClockFill, color: "#adb5bd", text: "Waiting", dotColor: "#dee2e6" };
    }
  };

  const toggleStep = (stepId) => {
    setExpandedSteps((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  // Empty state
  if (steps.length === 0) {
    return (
      <div className="text-center py-4" style={{ color: "#adb5bd" }}>
        <BsCircle size={28} className="mb-2" />
        <p className="mb-0 small">No approval steps configured</p>
      </div>
    );
  }

  return (
    <div className="at-root">
      <style jsx>{`
        .at-root {
          position: relative;
        }
        .at-initiator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          margin-bottom: 12px;
          font-size: 0.8rem;
          color: #6c757d;
          background: linear-gradient(135deg, #f8f9fa 0%, #f0f2f5 100%);
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }
        .at-initiator strong {
          color: #495057;
        }

        /* Timeline spine */
        .at-timeline {
          position: relative;
          padding-left: 28px;
        }
        .at-timeline::before {
          content: '';
          position: absolute;
          left: 13px;
          top: 20px;
          bottom: 20px;
          width: 2px;
          background: linear-gradient(180deg, #198754 0%, #dee2e6 50%, #dee2e6 100%);
          border-radius: 1px;
        }

        /* Step card */
        .at-step-card {
          position: relative;
          margin-bottom: 8px;
          border-radius: 10px;
          border: 1px solid #e9ecef;
          background: #ffffff;
          transition: all 0.25s ease;
          overflow: hidden;
        }
        .at-step-card:last-child {
          margin-bottom: 0;
        }
        .at-step-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .at-step-card.is-current-pending {
          border-color: #ffc107;
          background: linear-gradient(135deg, #fffdf5 0%, #fff8e1 100%);
          box-shadow: 0 0 0 1px rgba(255,193,7,0.15), 0 4px 16px rgba(255,193,7,0.10);
          animation: at-glow 3s ease-in-out infinite;
        }
        @keyframes at-glow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(255,193,7,0.15), 0 4px 16px rgba(255,193,7,0.10); }
          50% { box-shadow: 0 0 0 2px rgba(255,193,7,0.25), 0 6px 24px rgba(255,193,7,0.18); }
        }
        .at-step-card.is-approved {
          border-color: #c3e6cb;
          background: #f8fdf9;
        }
        .at-step-card.is-rejected {
          border-color: #f5c2c7;
          background: #fef8f8;
        }

        /* Step marker on timeline */
        .at-marker {
          position: absolute;
          left: -22px;
          top: 14px;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2.5px solid #dee2e6;
          background: #ffffff;
          z-index: 2;
          transition: all 0.3s ease;
        }
        .at-marker.approved {
          background: #d1e7dd;
          border-color: #198754;
        }
        .at-marker.rejected {
          background: #f8d7da;
          border-color: #dc3545;
        }
        .at-marker.current {
          background: #fff3cd;
          border-color: #ffc107;
          animation: at-pulse 2s infinite;
        }
        @keyframes at-pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.4); }
          70% { box-shadow: 0 0 0 6px rgba(255, 193, 7, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 193, 7, 0); }
        }

        /* Step header row */
        .at-step-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          cursor: pointer;
          user-select: none;
          gap: 8px;
          transition: background 0.15s ease;
          min-height: 44px;
        }
        .at-step-header:hover {
          background: rgba(0,0,0,0.015);
        }
        .at-step-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }
        .at-step-title {
          font-size: 0.84rem;
          font-weight: 600;
          color: #2d3436;
          white-space: nowrap;
        }
        .at-rule-tag {
          font-size: 0.62rem;
          font-weight: 500;
          padding: 2px 7px;
          border-radius: 4px;
          background: #f0f0f0;
          color: #6c757d;
          white-space: nowrap;
        }
        .at-step-card.is-current-pending .at-rule-tag {
          background: rgba(255,193,7,0.15);
          color: #856404;
        }
        .at-step-header-right {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .at-approver-dots {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .at-approver-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          transition: all 0.2s ease;
        }
        .at-expand-hint {
          font-size: 0.68rem;
          color: #adb5bd;
          transition: color 0.15s ease;
        }
        .at-step-header:hover .at-expand-hint {
          color: #6c757d;
        }

        /* Step body / approver details */
        .at-step-body {
          padding: 0 14px 12px;
          border-top: 1px solid rgba(0,0,0,0.04);
        }
        .at-step-card.is-current-pending .at-step-body {
          border-top-color: rgba(255,193,7,0.15);
        }

        /* Department group */
        .at-dept-group {
          margin-top: 8px;
        }
        .at-dept-group + .at-dept-group {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed #e9ecef;
        }
        .at-dept-label {
          font-size: 0.68rem;
          font-weight: 600;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 0 10px;
          margin-bottom: 2px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .at-dept-label::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 2px;
          background: #adb5bd;
          flex-shrink: 0;
        }
        .at-step-card.is-current-pending .at-dept-group + .at-dept-group {
          border-top-color: rgba(255,193,7,0.2);
        }

        /* Approver row */
        .at-approver {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          margin-top: 6px;
          border-radius: 8px;
          background: rgba(0,0,0,0.02);
          transition: all 0.15s ease;
        }
        .at-approver:hover {
          background: rgba(0,0,0,0.04);
        }
        .at-step-card.is-current-pending .at-approver {
          background: rgba(255,193,7,0.06);
        }
        .at-step-card.is-current-pending .at-approver:hover {
          background: rgba(255,193,7,0.10);
        }
        .at-approver-icon-wrap {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          border: 1.5px solid #e9ecef;
          background: #fff;
        }
        .at-approver-icon-wrap.done {
          border-color: #198754;
          background: #d1e7dd;
        }
        .at-approver-icon-wrap.failed {
          border-color: #dc3545;
          background: #f8d7da;
        }
        .at-approver-icon-wrap.waiting {
          border-color: #dee2e6;
          background: #f8f9fa;
        }
        .at-approver-icon-wrap.skipped {
          border-color: #e2e8f0;
          background: #f1f5f9;
          opacity: 0.6;
        }
        .at-approver-info {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .at-approver-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #2d3436;
        }
        .at-approver-meta {
          font-size: 0.75rem;
          color: #adb5bd;
        }
        .at-approver-status-tag {
          font-size: 0.72rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 10px;
          white-space: nowrap;
        }

        @media (max-width: 768px) {
          .at-approver {
            flex-wrap: wrap;
            gap: 6px;
          }
          .at-approver-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 2px;
          }
          .at-approver-name {
            font-size: 0.88rem;
          }
          .at-approver-meta {
            font-size: 0.76rem;
          }
          .at-step-title {
            font-size: 0.88rem;
          }
          .at-rule-tag {
            font-size: 0.65rem;
          }
          .at-timeline {
            padding-left: 22px;
          }
          .at-marker {
            left: -18px;
            width: 18px;
            height: 18px;
          }
        }
        .at-approver-status-tag.approved {
          color: #0f5132;
          background: #d1e7dd;
        }
        .at-approver-status-tag.rejected {
          color: #842029;
          background: #f8d7da;
        }
        .at-approver-status-tag.waiting {
          color: #6c757d;
          background: #f0f0f0;
        }
        .at-approver-status-tag.skipped {
          color: #94a3b8;
          background: #f1f5f9;
          text-decoration: line-through;
          opacity: 0.7;
        }
        .at-comment-btn {
          cursor: pointer;
          opacity: 0.5;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .at-comment-btn:hover {
          opacity: 1;
          transform: scale(1.1);
        }

        /* Current step label */
        .at-current-tag {
          font-size: 0.58rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 2px 6px;
          border-radius: 4px;
          background: #ffc107;
          color: #664d03;
          text-transform: uppercase;
          animation: at-tag-pulse 2s ease-in-out infinite;
        }
        @keyframes at-tag-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      {/* Initiator */}
      {initiatedBy && (
        <div className="at-initiator">
          <BsPersonFill size={13} style={{ color: "#0d6efd", flexShrink: 0 }} />
          <span>
            Initiated by <strong>{initiatedBy.name}</strong>
            {initiatedBy.email && (
              <span className="ms-1 at-initiator-meta">({initiatedBy.email})</span>
            )}
            {(initiatedBy.designation || initiatedBy.department) && (
              <span className="ms-1 at-initiator-meta">
                {initiatedBy.designation}
                {initiatedBy.designation && initiatedBy.department && " · "}
                {initiatedBy.department}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Timeline */}
      <div className="at-timeline">
        {steps.map((step, index) => {
          // For expired instances, show PENDING steps as EXPIRED
          const effectiveStepStatus = (isExpired && step.status === "PENDING") ? "EXPIRED" : step.status;
          const config = statusConfig[effectiveStepStatus] || statusConfig.PENDING;
          const StepIcon = config.stepIcon;
          const isCurrentPending = !isExpired && step.step_order === currentStep && step.status === "PENDING";
          const isStepExpired = isExpired && step.status === "PENDING";
          const isExpandedStep = !!expandedSteps[step.id];
          // For ANY-rule steps that are APPROVED, remaining PENDING approvers are skipped
          const isStepApprovedAny = step.status === "APPROVED" && step.decision_rule === "ANY";

          const markerClass = step.status === "APPROVED" ? "approved"
            : step.status === "REJECTED" ? "rejected"
            : isStepExpired ? "rejected"
            : isCurrentPending ? "current" : "";

          const cardClass = isCurrentPending ? "is-current-pending"
            : step.status === "APPROVED" ? "is-approved"
            : step.status === "REJECTED" ? "is-rejected"
            : isStepExpired ? "is-rejected" : "";

          return (
            <div className={`at-step-card ${cardClass}`} key={step.id}>
              {/* Timeline marker */}
              <div className={`at-marker ${markerClass}`}>
                <StepIcon size={10} style={{ color: config.color }} />
              </div>

              {/* Header row - always visible */}
              <div className="at-step-header" onClick={() => toggleStep(step.id)}>
                <div className="at-step-header-left">
                  <span className="at-step-title">Step {step.step_order}</span>
                  {isCurrentPending && <span className="at-current-tag">Current</span>}
                  <Badge
                    bg={config.badgeVariant}
                    style={{ fontSize: "0.62rem", fontWeight: 500, padding: "2px 7px" }}
                  >
                    {config.label}
                  </Badge>
                  <span className="at-rule-tag">
                    {step.decision_rule === "ANY" ? "Any one can approve" : "All must approve"}
                  </span>
                </div>
                <div className="at-step-header-right">
                  {/* Approver dots - quick visual summary */}
                  <div className="at-approver-dots">
                    {step.approvers?.map((a) => {
                      const aStatus = getApproverStatus(a.status, { isStepApproved: isStepApprovedAny });
                      return (
                        <OverlayTrigger
                          key={a.user_id}
                          placement="top"
                          overlay={<Tooltip>{a.user_name} — {aStatus.text}</Tooltip>}
                        >
                          <div
                            className="at-approver-dot"
                            style={{ backgroundColor: aStatus.dotColor }}
                          />
                        </OverlayTrigger>
                      );
                    })}
                  </div>
                  <span className="at-expand-hint">{isExpandedStep ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Approver details - grouped by department */}
              <Collapse in={isExpandedStep}>
                <div>
                  <div className="at-step-body">
                    {(() => {
                      // Group approvers by department
                      const deptGroups = {};
                      (step.approvers || []).forEach((approver) => {
                        const dept = approver.user_department || "Other";
                        if (!deptGroups[dept]) deptGroups[dept] = [];
                        deptGroups[dept].push(approver);
                      });
                      const deptKeys = Object.keys(deptGroups);
                      const showDeptHeaders = deptKeys.length > 1;

                      return deptKeys.map((dept) => (
                        <div className="at-dept-group" key={dept}>
                          {showDeptHeaders && (
                            <div className="at-dept-label">{dept}</div>
                          )}
                          {deptGroups[dept].map((approver) => {
                            const aStatus = getApproverStatus(approver.status, { isStepApproved: isStepApprovedAny });
                            const AIcon = aStatus.icon;
                            const isSkipped = approver.status === "PENDING" && isStepApprovedAny;
                            const isApproverExpired = approver.status === "PENDING" && isExpired;
                            const iconClass = approver.status === "APPROVED" ? "done"
                              : approver.status === "REJECTED" ? "failed"
                              : isApproverExpired ? "failed"
                              : isSkipped ? "skipped" : "waiting";
                            const tagClass = approver.status === "APPROVED" ? "approved"
                              : approver.status === "REJECTED" ? "rejected"
                              : isApproverExpired ? "rejected"
                              : isSkipped ? "skipped" : "waiting";

                            return (
                              <div className="at-approver" key={approver.user_id} style={isSkipped ? { opacity: 0.55 } : undefined}>
                                <div className={`at-approver-icon-wrap ${iconClass}`}>
                                  <AIcon size={12} style={{ color: aStatus.color }} />
                                </div>
                                <div className="at-approver-info">
                                  <span className="at-approver-name">{approver.user_name}</span>
                                  {approver.employee_code && (
                                    <span className="at-approver-meta">{approver.employee_code}</span>
                                  )}
                                  {approver.user_designation && (
                                    <span className="at-approver-meta">{approver.user_designation}</span>
                                  )}
                                  {approver.acted_at && (
                                    <span className="at-approver-meta">· {formatDate(approver.acted_at)}</span>
                                  )}
                                </div>
                                <span className={`at-approver-status-tag ${tagClass}`}>
                                  {aStatus.text}
                                </span>
                                {approver.comment && (
                                  <OverlayTrigger
                                    placement="top"
                                    overlay={
                                      <Tooltip>
                                        <div style={{ textAlign: "left", maxWidth: 280 }}>
                                          <strong>{approver.user_name}:</strong><br />
                                          &ldquo;{approver.comment}&rdquo;
                                        </div>
                                      </Tooltip>
                                    }
                                  >
                                    <span className="at-comment-btn">
                                      <BsChatLeftTextFill size={13} style={{ color: aStatus.color }} />
                                    </span>
                                  </OverlayTrigger>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </Collapse>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalTimeline;
