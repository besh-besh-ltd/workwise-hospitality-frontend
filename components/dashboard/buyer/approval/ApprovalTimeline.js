import React from "react";
import { Badge, Card } from "react-bootstrap";
import {
  BsCheckCircleFill,
  BsXCircleFill,
  BsClockFill,
  BsPersonFill,
  BsDashCircleFill,
  BsArrowRight,
} from "react-icons/bs";

const statusConfig = {
  APPROVED: {
    icon: BsCheckCircleFill,
    color: "#198754",
    bgColor: "#d1e7dd",
    borderColor: "#badbcc",
    label: "Approved",
    badgeVariant: "success",
  },
  REJECTED: {
    icon: BsXCircleFill,
    color: "#dc3545",
    bgColor: "#f8d7da",
    borderColor: "#f5c2c7",
    label: "Rejected",
    badgeVariant: "danger",
  },
  PENDING: {
    icon: BsClockFill,
    color: "#ffc107",
    bgColor: "#fff3cd",
    borderColor: "#ffecb5",
    label: "Pending",
    badgeVariant: "warning",
  },
  CANCELLED: {
    icon: BsDashCircleFill,
    color: "#6c757d",
    bgColor: "#e2e3e5",
    borderColor: "#d3d6d8",
    label: "Cancelled",
    badgeVariant: "secondary",
  },
};

const ApprovalTimeline = ({ steps = [], currentStep, initiatedBy }) => {
  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getApproverStatus = (status) => {
    switch (status) {
      case "APPROVED":
        return { icon: BsCheckCircleFill, color: "#198754", text: "Approved" };
      case "REJECTED":
        return { icon: BsXCircleFill, color: "#dc3545", text: "Rejected" };
      default:
        return { icon: BsClockFill, color: "#6c757d", text: "Waiting" };
    }
  };

  return (
    <div className="approval-timeline">
      {/* Initiator Card */}
      {initiatedBy && (
        <div className="d-flex align-items-start mb-4">
          <div className="timeline-line-container me-3" style={{ width: 50 }}>
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: 50,
                height: 50,
                backgroundColor: "#0d6efd",
                color: "white",
                boxShadow: "0 4px 12px rgba(13, 110, 253, 0.3)",
              }}
            >
              <BsPersonFill size={24} />
            </div>
            {steps.length > 0 && (
              <div
                style={{
                  width: 3,
                  height: 30,
                  backgroundColor: "#dee2e6",
                  margin: "8px auto 0",
                  borderRadius: 2,
                }}
              />
            )}
          </div>
          <div className="flex-grow-1 pt-2">
            <div className="text-muted small mb-1">Initiated by</div>
            <div className="fw-semibold">{initiatedBy.name}</div>
            {initiatedBy.email && (
              <div className="text-muted small">{initiatedBy.email}</div>
            )}
          </div>
        </div>
      )}

      {/* Approval Steps */}
      {steps.map((step, index) => {
        const config = statusConfig[step.status] || statusConfig.PENDING;
        const StepIcon = config.icon;
        const isCurrentStep = step.step_order === currentStep;
        const isLastStep = index === steps.length - 1;

        return (
          <div key={step.id} className="d-flex align-items-start mb-4">
            {/* Timeline Marker */}
            <div className="timeline-line-container me-3" style={{ width: 50 }}>
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: 50,
                  height: 50,
                  backgroundColor: config.color,
                  color: "white",
                  boxShadow: isCurrentStep
                    ? `0 0 0 4px ${config.color}40, 0 4px 12px ${config.color}50`
                    : `0 4px 12px ${config.color}30`,
                  transition: "all 0.3s ease",
                }}
              >
                <StepIcon size={22} />
              </div>
              {!isLastStep && (
                <div
                  style={{
                    width: 3,
                    minHeight: 80,
                    backgroundColor: "#dee2e6",
                    margin: "8px auto 0",
                    borderRadius: 2,
                  }}
                />
              )}
            </div>

            {/* Step Content */}
            <div className="flex-grow-1 pt-1">
              <Card
                className="border-0 shadow-sm"
                style={{
                  backgroundColor: isCurrentStep ? config.bgColor : "#fff",
                  border: isCurrentStep ? `1px solid ${config.borderColor}` : "none",
                }}
              >
                <Card.Body className="py-3">
                  {/* Step Header */}
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <span className="fw-bold" style={{ fontSize: "1rem" }}>
                        Step {step.step_order}
                      </span>
                      {isCurrentStep && (
                        <Badge bg="dark" className="ms-2" style={{ fontSize: "0.65rem" }}>
                          CURRENT
                        </Badge>
                      )}
                    </div>
                    <Badge bg={config.badgeVariant} className="px-2 py-1">
                      {config.label}
                    </Badge>
                  </div>

                  {/* Decision Rule Info */}
                  <div className="text-muted mb-3">
                    <BsArrowRight className="me-1" />
                    {step.decision_rule === "ANY"
                      ? "Requires approval from any one approver"
                      : "Requires approval from all approvers"}
                  </div>

                  {/* Approvers List */}
                  {step.approvers?.length > 0 && (
                    <div className="approvers-list">
                      <div className="text-muted small fw-semibold mb-2">
                        Approvers ({step.approvers.length}):
                      </div>
                      {step.approvers.map((approver) => {
                        const approverStatus = getApproverStatus(approver.status);
                        const ApproverIcon = approverStatus.icon;

                        return (
                          <div
                            key={approver.user_id}
                            className="d-flex align-items-start gap-2 py-2 px-2 rounded mb-1"
                            style={{ backgroundColor: "rgba(0,0,0,0.03)" }}
                          >
                            <ApproverIcon
                              size={16}
                              style={{ color: approverStatus.color, marginTop: 3.5 }}
                            />
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-medium">{approver.user_name}</span>
                                <span
                                  className="small"
                                  style={{ color: approverStatus.color }}
                                >
                                  {approverStatus.text}
                                </span>
                              </div>
                              {approver.user_email && (
                                <div className="text-muted small">{approver.user_email}</div>
                              )}
                              {approver.acted_at && (
                                <div className="text-muted small">
                                  {formatDate(approver.acted_at)}
                                </div>
                              )}
                              {approver.comment && (
                                <div
                                  className="mt-2 p-2 rounded small fst-italic"
                                  style={{
                                    backgroundColor: "rgba(0,0,0,0.05)",
                                    borderLeft: `3px solid ${approverStatus.color}`,
                                  }}
                                >
                                  "{approver.comment}"
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {steps.length === 0 && (
        <div className="text-center text-muted py-4">
          <BsClockFill size={32} className="mb-2 opacity-50" />
          <p className="mb-0">No approval steps configured</p>
        </div>
      )}
    </div>
  );
};

export default ApprovalTimeline;
