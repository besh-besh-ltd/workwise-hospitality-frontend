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
import useIsMobile from "@/hooks/useIsMobile";

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
    stepIcon: BsXCircleFill,
    color: "#dc3545",
    bgColor: "#f8d7da",
    borderColor: "#dc3545",
    label: "Cancelled",
    badgeVariant: "danger",
    cardBg: "#fef8f8",
    cardBorder: "#f5c2c7",
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
  REMOVED: {
    stepIcon: BsDashCircleFill,
    color: "#6c757d",
    bgColor: "#f0f0f0",
    borderColor: "#adb5bd",
    label: "Removed",
    badgeVariant: "secondary",
    cardBg: "#f8f9fa",
    cardBorder: "#dee2e6",
  },
  SKIPPED: {
    stepIcon: BsSkipForwardFill,
    color: "#adb5bd",
    bgColor: "#f8f9fa",
    borderColor: "#dee2e6",
    label: "Skipped",
    badgeVariant: "light",
    cardBg: "#ffffff",
    cardBorder: "#e9ecef",
  },
};

const ApprovalTimeline = ({ steps = [], currentStep, initiatedBy, instanceStatus, isActionRequired = false }) => {
  const [expandedSteps, setExpandedSteps] = useState({});
  const isMobile = useIsMobile();

  const isExpired = instanceStatus === 'BACKLOG' || instanceStatus === 'CANCELLED';
  const isInstanceApproved = instanceStatus === 'APPROVED';
  const isInstanceRejected = instanceStatus === 'REJECTED';

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
      case "REMOVED":
        return { icon: BsDashCircleFill, color: "#dc3545", text: "Removed", dotColor: "#dc3545" };
      default:
        // PENDING approver — context matters
        if (isInstanceApproved) {
          return { icon: BsCheckCircleFill, color: "#198754", text: "Approved", dotColor: "#198754" };
        }
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
        .at-initiator-content {
          min-width: 0;
          flex: 1;
          line-height: 1.45;
          overflow-wrap: anywhere;
          word-break: break-word;
        }
        .at-initiator strong {
          color: #495057;
        }
        .at-initiator-meta {
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        /* Timeline */
        .at-timeline {
          position: relative;
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
          background: linear-gradient(135deg, #fffdf5 0%, #fff8e1 50%, #fffdf5 100%);
          background-size: 200% 200%;
          box-shadow: 0 0 0 1px rgba(255,193,7,0.2), 0 4px 20px rgba(255,193,7,0.12);
          animation: at-pending-bg 4s ease-in-out infinite, at-glow 2.5s ease-in-out infinite;
        }
        .at-step-card.is-action-required {
          border-color: #f97316;
          background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 50%, #fef3c7 100%);
          background-size: 200% 200%;
          box-shadow: 0 0 0 2px rgba(249,115,22,0.25), 0 6px 24px rgba(249,115,22,0.18);
          animation: at-action-bg 3s ease-in-out infinite, at-action-glow 2s ease-in-out infinite;
        }
        @keyframes at-pending-bg {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes at-glow {
          0%, 100% { box-shadow: 0 0 0 1px rgba(255,193,7,0.2), 0 4px 20px rgba(255,193,7,0.12); }
          50% { box-shadow: 0 0 0 3px rgba(255,193,7,0.35), 0 8px 28px rgba(255,193,7,0.22); }
        }
        @keyframes at-action-bg {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes at-action-glow {
          0%, 100% {
            box-shadow: 0 0 0 2px rgba(249,115,22,0.25), 0 6px 24px rgba(249,115,22,0.18);
            border-color: #f97316;
          }
          50% {
            box-shadow: 0 0 0 4px rgba(249,115,22,0.4), 0 10px 36px rgba(249,115,22,0.3);
            border-color: #ea580c;
          }
        }
        .at-step-card.is-approved {
          border-color: #c3e6cb;
          background: #f8fdf9;
        }
        .at-step-card.is-rejected {
          border-color: #f5c2c7;
          background: #fef8f8;
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
          flex-wrap: wrap;
        }
        .at-step-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex-wrap: wrap;
        }
        .at-step-badges {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          flex-wrap: wrap;
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
        .at-step-card.is-action-required .at-rule-tag {
          background: rgba(249,115,22,0.15);
          color: #9a3412;
        }

        /* Custom minimal "Added mid-approval" badge — replaces the default
           Bootstrap blue Badge. Subtle blue pill with a small live-dot prefix
           that signals "this got added later" without competing with the
           step's own status badge. */
        .at-midflight-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 9.5px;
          font-weight: 600;
          letter-spacing: 0.03em;
          color: #1d4ed8;
          background: rgba(59, 130, 246, 0.07);
          border: 1px solid rgba(59, 130, 246, 0.22);
          padding: 1px 8px 1px 6px;
          border-radius: 10px;
          line-height: 1.55;
          white-space: nowrap;
          vertical-align: middle;
        }
        .at-midflight-badge::before {
          content: '';
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #3b82f6;
          flex-shrink: 0;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.18);
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
        .at-step-card.is-action-required .at-step-body {
          border-top-color: rgba(249,115,22,0.15);
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
        .at-step-card.is-action-required .at-approver {
          background: rgba(249,115,22,0.06);
        }
        .at-step-card.is-action-required .at-approver:hover {
          background: rgba(249,115,22,0.12);
        }
        .at-approver-content {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
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
        .at-approver-icon-wrap.removed {
          border-color: #fecaca;
          border-style: solid;
          background: #fef2f2;
        }

        /* Separator between active approvers and the removed group.
           A thin pink/red rule with an inline label so the section is
           obvious without taking much vertical space. */
        .at-removed-separator {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 12px 2px 12px;
        }
        .at-removed-separator::before,
        .at-removed-separator::after {
          content: '';
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, #fecaca, transparent);
        }
        .at-removed-separator-label {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fecaca;
          padding: 2px 8px;
          border-radius: 10px;
          white-space: nowrap;
        }

        /* Removed approver row — fully visible, red-tinted so the user
           sees them at a glance. Reason + timestamp on hover of the name. */
        .at-approver.is-removed {
          background: rgba(220, 38, 38, 0.05);
          border: 1px solid rgba(220, 38, 38, 0.12);
        }
        .at-approver.is-removed:hover {
          background: rgba(220, 38, 38, 0.08);
        }
        .at-step-card.is-current-pending .at-approver.is-removed,
        .at-step-card.is-action-required .at-approver.is-removed {
          background: rgba(220, 38, 38, 0.05);
        }
        .at-step-card.is-current-pending .at-approver.is-removed:hover,
        .at-step-card.is-action-required .at-approver.is-removed:hover {
          background: rgba(220, 38, 38, 0.09);
        }
        .at-removed-name {
          color: #b91c1c !important;
          font-weight: 600;
        }
        .at-removed-meta {
          color: #b91c1c !important;
          opacity: 0.75;
        }

        /* Prominent red badge — renders on the right side of the removed
           approver row, replacing the on-hover-only tooltip. */
        .at-removed-badge {
          display: inline-flex;
          align-items: center;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.02em;
          padding: 4px 10px;
          border-radius: 12px;
          background: #dc3545;
          color: #ffffff;
          white-space: nowrap;
          box-shadow: 0 1px 2px rgba(220, 38, 38, 0.25);
        }
        .at-approver-info {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .at-approver-primary {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          flex-wrap: wrap;
        }
        .at-approver-meta-row {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          flex-wrap: wrap;
        }
        .at-approver-side {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        .at-approver-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #2d3436;
          word-break: break-word;
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
          .at-initiator {
            align-items: flex-start;
          }
          .at-step-header {
            align-items: stretch;
            flex-direction: column;
            padding: 12px;
          }
          .at-step-header-left {
            align-items: flex-start;
            gap: 8px;
          }
          .at-step-title-row {
            width: 100%;
          }
          .at-step-badges {
            width: 100%;
            gap: 5px;
          }
          .at-step-header-right {
            width: 100%;
            justify-content: space-between;
            padding-top: 8px;
            margin-top: 2px;
            border-top: 1px solid rgba(0,0,0,0.06);
          }
          .at-approver-dots {
            flex-wrap: wrap;
            gap: 4px;
          }
          .at-step-body {
            padding: 0 12px 12px;
          }
          .at-approver {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
            padding: 10px;
          }
          .at-approver-content {
            width: 100%;
          }
          .at-approver-side {
            width: 100%;
            justify-content: space-between;
          }
          .at-approver-name {
            font-size: 0.88rem;
          }
          .at-approver-meta {
            font-size: 0.76rem;
          }
          .at-step-title {
            font-size: 0.88rem;
            white-space: normal;
            line-height: 1.3;
          }
          .at-rule-tag {
            font-size: 0.65rem;
            white-space: normal;
            line-height: 1.2;
          }
          .at-current-tag,
          .at-action-tag {
            max-width: 100%;
            white-space: normal;
            line-height: 1.2;
          }
          .at-approver-status-tag {
            font-size: 0.7rem;
            padding: 4px 9px;
          }
          .at-timeline {
            padding-left: 0;
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
        .at-comment-inline {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          background: rgba(15,23,42,0.04);
          color: #475569;
          font-size: 0.76rem;
          line-height: 1.45;
        }
        .at-comment-inline strong {
          color: #1e293b;
          font-weight: 700;
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
        .at-action-tag {
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 3px 8px;
          border-radius: 4px;
          background: linear-gradient(90deg, #f97316, #ef4444);
          color: #ffffff;
          text-transform: uppercase;
          animation: at-action-tag-pulse 1.5s ease-in-out infinite;
        }
        @keyframes at-tag-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes at-action-tag-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.05); }
        }
      `}</style>

      {/* Initiator */}
      {initiatedBy && (
        <div className="at-initiator">
          <BsPersonFill size={13} style={{ color: "#0d6efd", flexShrink: 0 }} />
          <span className="at-initiator-content">
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
          // Derive effective step status based on instance-level outcome
          const effectiveStepStatus = (isExpired && step.status === "PENDING") ? "EXPIRED"
            : (isInstanceApproved && step.status === "PENDING") ? "APPROVED"
            : step.status;
          const config = statusConfig[effectiveStepStatus] || statusConfig.PENDING;
          const StepIcon = config.stepIcon;
          const isCurrentPending = !isExpired && !isInstanceApproved && !isInstanceRejected
            && step.step_order === currentStep && step.status === "PENDING";
          const isStepExpired = isExpired && step.status === "PENDING";
          const isExpandedStep = !!expandedSteps[step.id];
          // For ANY-rule steps that are APPROVED, remaining PENDING approvers are skipped
          const isStepApprovedAny = step.status === "APPROVED" && step.decision_rule === "ANY";

          const isStepActionRequired = isCurrentPending && isActionRequired;

          const cardClass = isStepActionRequired ? "is-current-pending is-action-required"
            : isCurrentPending ? "is-current-pending"
            : step.status === "APPROVED" ? "is-approved"
            : step.status === "REJECTED" ? "is-rejected"
            : isStepExpired ? "is-rejected" : "";

          return (
            <div className={`at-step-card ${cardClass}`} key={step.id}>
              {/* Header row - always visible */}
              <div className="at-step-header" onClick={() => toggleStep(step.id)}>
                <div className="at-step-header-left">
                  <div className="at-step-title-row">
                    <span className="at-step-title">Step {step.step_order}</span>
                    {isCurrentPending && !isStepActionRequired && <span className="at-current-tag">Current</span>}
                    {isStepActionRequired && <span className="at-action-tag">Action Required</span>}
                    {step.added_mid_flight && (
                      <span className="at-midflight-badge" title="This step was added mid-approval">
                        Added mid-approval
                      </span>
                    )}
                    {step.removed_mid_flight && <Badge bg="secondary" style={{ fontSize: "0.58rem", marginLeft: 4 }}>Removed</Badge>}
                  </div>
                  <div className="at-step-badges">
                    <Badge
                      bg={config.badgeVariant}
                      style={{ fontSize: "0.62rem", fontWeight: 600, padding: "3px 8px" }}
                    >
                      {config.label}
                    </Badge>
                    <span className="at-rule-tag">
                      {step.decision_rule === "ANY" ? "Any one can approve" : "All must approve"}
                    </span>
                  </div>
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

              {/* Approver details — flat list (department shown inline as meta).
                  Department grouping was removed because users in multiple
                  departments can't be cleanly bucketed and the visual fragmented
                  badly when several approvers spanned different depts.

                  Removed approvers are partitioned to the bottom of the list,
                  visually separated, and rendered in red so they're obvious at
                  a glance. The full removal reason + timestamp is on hover of
                  the name (and inline on mobile). */}
              <Collapse in={isExpandedStep}>
                <div>
                  <div className="at-step-body">
                    {(() => {
                      const allApprovers = step.approvers || [];
                      const activeApprovers = allApprovers.filter(a => a.status !== "REMOVED");
                      const removedApprovers = allApprovers.filter(a => a.status === "REMOVED");

                      const renderActive = (approver) => {
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
                          <div
                            className="at-approver"
                            key={approver.user_id}
                            style={isSkipped ? { opacity: 0.55 } : undefined}
                          >
                            <div className="at-approver-content">
                              <div className={`at-approver-icon-wrap ${iconClass}`}>
                                <AIcon size={12} style={{ color: aStatus.color }} />
                              </div>
                              <div className="at-approver-info">
                                <div className="at-approver-primary">
                                  <span className="at-approver-name">{approver.user_name}</span>
                                  {approver.added_mid_flight && (
                                    <span className="at-midflight-badge" title="This approver was added mid-approval">
                                      Added mid-approval
                                    </span>
                                  )}
                                </div>
                                <div className="at-approver-meta-row">
                                  {approver.employee_code && (
                                    <span className="at-approver-meta">{approver.employee_code}</span>
                                  )}
                                  {approver.user_designation && (
                                    <span className="at-approver-meta">{approver.user_designation}</span>
                                  )}
                                  {approver.user_department && (
                                    <span className="at-approver-meta">· {approver.user_department}</span>
                                  )}
                                  {approver.acted_at && (
                                    <span className="at-approver-meta">· {formatDate(approver.acted_at)}</span>
                                  )}
                                </div>
                                {isMobile && approver.comment && (
                                  <div className="at-comment-inline">
                                    <strong>Comment:</strong> {approver.comment}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="at-approver-side">
                              <span className={`at-approver-status-tag ${tagClass}`}>
                                {aStatus.text}
                              </span>
                              {approver.comment && !isMobile && (
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
                          </div>
                        );
                      };

                      const renderRemoved = (approver) => {
                        const removalReasonLabel = approver.removal_reason === "policy_change" ? "Policy Change"
                          : approver.removal_reason === "role_removed" ? "Role Change"
                          : approver.removal_reason === "user_deactivated" ? "Account Deactivation"
                          : approver.removal_reason === "dept_removed" ? "Department Change"
                          : approver.removal_reason === "scope_removed" ? "Scope Change"
                          : approver.removal_reason || "Administrative Change";
                        const whenLabel = approver.removed_at ? formatDate(approver.removed_at) : null;

                        return (
                          <div className="at-approver is-removed" key={approver.user_id}>
                            <div className="at-approver-content">
                              <div className="at-approver-icon-wrap removed">
                                <BsXCircleFill size={12} style={{ color: "#dc3545" }} />
                              </div>
                              <div className="at-approver-info">
                                <div className="at-approver-primary">
                                  <span className="at-approver-name at-removed-name">
                                    {approver.user_name}
                                  </span>
                                </div>
                                <div className="at-approver-meta-row">
                                  {approver.employee_code && (
                                    <span className="at-approver-meta at-removed-meta">{approver.employee_code}</span>
                                  )}
                                  {approver.user_designation && (
                                    <span className="at-approver-meta at-removed-meta">{approver.user_designation}</span>
                                  )}
                                  {approver.user_department && (
                                    <span className="at-approver-meta at-removed-meta">· {approver.user_department}</span>
                                  )}
                                  {whenLabel && (
                                    <span className="at-approver-meta at-removed-meta">· <strong>Removed on</strong> {whenLabel}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="at-approver-side">
                              <span className="at-removed-badge">
                                <BsXCircleFill size={10} style={{ marginRight: 4, verticalAlign: "-1px" }} />
                                {removalReasonLabel}
                              </span>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <>
                          {activeApprovers.map(renderActive)}
                          {removedApprovers.length > 0 && (
                            <div className="at-removed-separator" aria-label="Removed approvers">
                              <span className="at-removed-separator-label">
                                Removed ({removedApprovers.length})
                              </span>
                            </div>
                          )}
                          {removedApprovers.map(renderRemoved)}
                        </>
                      );
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
