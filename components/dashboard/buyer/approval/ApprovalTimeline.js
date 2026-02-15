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
};

const ApprovalTimeline = ({ steps = [], currentStep, initiatedBy }) => {
  const [expandedSteps, setExpandedSteps] = useState({});

  // Auto-expand the current pending step
  useEffect(() => {
    if (steps.length > 0) {
      const pendingStep = steps.find(
        (s) => s.step_order === currentStep && s.status === "PENDING"
      );
      if (pendingStep) {
        setExpandedSteps((prev) => ({ ...prev, [pendingStep.id]: true }));
      }
    }
  }, [steps, currentStep]);

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return moment.utc(dateStr).local().format("DD-MM-YYYY hh:mm a");
  };

  const getApproverStatus = (status) => {
    switch (status) {
      case "APPROVED":
        return { icon: BsCheckCircleFill, color: "#198754", text: "Approved", dotColor: "#198754" };
      case "REJECTED":
        return { icon: BsXCircleFill, color: "#dc3545", text: "Rejected", dotColor: "#dc3545" };
      default:
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
        .at-approver-info {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .at-approver-name {
          font-size: 0.82rem;
          font-weight: 500;
          color: #2d3436;
          white-space: nowrap;
        }
        .at-approver-meta {
          font-size: 0.72rem;
          color: #adb5bd;
          white-space: nowrap;
        }
        .at-approver-status-tag {
          font-size: 0.68rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
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
          const config = statusConfig[step.status] || statusConfig.PENDING;
          const StepIcon = config.stepIcon;
          const isCurrentPending = step.step_order === currentStep && step.status === "PENDING";
          const isExpanded = !!expandedSteps[step.id];

          const markerClass = step.status === "APPROVED" ? "approved"
            : step.status === "REJECTED" ? "rejected"
            : isCurrentPending ? "current" : "";

          const cardClass = isCurrentPending ? "is-current-pending"
            : step.status === "APPROVED" ? "is-approved"
            : step.status === "REJECTED" ? "is-rejected" : "";

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
                      const aStatus = getApproverStatus(a.status);
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
                  <span className="at-expand-hint">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Approver details */}
              <Collapse in={isExpanded}>
                <div>
                  <div className="at-step-body">
                    {step.approvers?.map((approver) => {
                      const aStatus = getApproverStatus(approver.status);
                      const AIcon = aStatus.icon;
                      const iconClass = approver.status === "APPROVED" ? "done"
                        : approver.status === "REJECTED" ? "failed" : "waiting";
                      const tagClass = approver.status === "APPROVED" ? "approved"
                        : approver.status === "REJECTED" ? "rejected" : "waiting";

                      return (
                        <div className="at-approver" key={approver.user_id}>
                          <div className={`at-approver-icon-wrap ${iconClass}`}>
                            <AIcon size={12} style={{ color: aStatus.color }} />
                          </div>
                          <div className="at-approver-info">
                            <span className="at-approver-name">{approver.user_name}</span>
                            {approver.employee_code && (
                              <span className="at-approver-meta">{approver.employee_code}</span>
                            )}
                            {approver.designation && (
                              <span className="at-approver-meta">· {approver.designation}</span>
                            )}
                            {(approver.user_designation || approver.user_department) && (
                              <span className="at-approver-meta">
                                {approver.user_designation}
                                {approver.user_designation && approver.user_department && " · "}
                                {approver.user_department}
                              </span>
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
