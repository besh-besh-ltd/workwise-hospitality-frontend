import React from "react";
import Select from "react-select";
import { BsGripVertical, BsTrash, BsExclamationTriangleFill } from "react-icons/bs";
import { approverSourceTypes, decisionRules, BRAND_TEAL } from "../constants";

const ApprovalStepCard = ({
  step,
  index,
  totalSteps,
  selectedDepartmentId,
  getApproverOptions,
  getApproverDisplayInfo,
  onChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}) => {
  const approverInfo = getApproverDisplayInfo(step, selectedDepartmentId);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
      className="approval-step-card"
    >
      <style jsx>{`
        .approval-step-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 12px;
          cursor: move;
          transition: all 0.2s ease;
        }
        .approval-step-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .step-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .step-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .drag-handle {
          color: #d1d5db;
          cursor: grab;
          padding: 2px;
        }
        .drag-handle:active {
          cursor: grabbing;
        }
        .step-badge {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: ${BRAND_TEAL};
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
        }
        .step-title {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }
        .field-label {
          font-size: 12px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 4px;
        }
        .decision-hint {
          font-size: 11px;
          padding: 6px 10px;
          border-radius: 4px;
          margin-top: 6px;
          line-height: 1.4;
        }
      `}</style>

      <div className="step-header">
        <div className="step-header-left">
          <span className="drag-handle">
            <BsGripVertical size={18} />
          </span>
          <span className="step-badge">{index + 1}</span>
          <span className="step-title">Level {index + 1}</span>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
          onClick={() => onRemove(index)}
          disabled={totalSteps <= 1}
          style={{
            borderRadius: "6px",
            fontSize: "11px",
            padding: "3px 10px",
            opacity: totalSteps <= 1 ? 0.4 : 1,
          }}
          title={totalSteps <= 1 ? "At least one level is required" : "Remove level"}
        >
          <BsTrash size={11} /> Remove
        </button>
      </div>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="field-label">Approver Type *</div>
          <Select
            options={approverSourceTypes}
            value={approverSourceTypes.find((t) => t.value === step.approver_source_type) || null}
            onChange={(option) => onChange(index, "approver_source_type", option?.value)}
            placeholder="Select type..."
            isClearable={false}
            isSearchable={false}
            menuPlacement="auto"
          />
        </div>

        <div className="col-md-6">
          <div className="field-label">
            {step.approver_source_type === "USER"
              ? "Select User *"
              : step.approver_source_type === "ROLE"
              ? "Select Role *"
              : "Select Approver *"}
          </div>
          <Select
            key={`approver-${index}-${step.approver_source_type}`}
            options={getApproverOptions(step.approver_source_type, selectedDepartmentId)}
            value={
              step.approver_source_id
                ? getApproverOptions(step.approver_source_type, selectedDepartmentId).find(
                    (o) => o.value === step.approver_source_id
                  ) || null
                : null
            }
            onChange={(option) => onChange(index, "approver_source_id", option?.value || null)}
            isDisabled={!step.approver_source_type}
            placeholder={
              !step.approver_source_type ? "Select type first..." : "Search..."
            }
            isClearable={false}
            menuPlacement="auto"
          />
          {step.approver_source_id && approverInfo.email && (
            <small className="text-muted d-block mt-1" style={{ fontSize: "11px" }}>
              {approverInfo.email}
            </small>
          )}
          {step.approver_source_type === "ROLE" && step.approver_source_id && approverInfo.users.length === 0 && (
            <div
              className="d-flex align-items-start gap-2 mt-2"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                padding: "8px 12px",
                fontSize: "12px",
                color: "#dc2626",
                lineHeight: 1.4,
              }}
            >
              <BsExclamationTriangleFill size={14} style={{ flexShrink: 0, marginTop: "1px" }} />
              <span>
                <strong>No users available</strong> for this role{selectedDepartmentId ? " in the selected department" : ""}. Please change the scope or role.
              </span>
            </div>
          )}
        </div>

        <div className="col-12">
          <div className="field-label">Approval Requirement *</div>
          <Select
            options={decisionRules}
            value={decisionRules.find((r) => r.value === step.decision_rule)}
            onChange={(option) => onChange(index, "decision_rule", option?.value)}
            placeholder="Select requirement..."
          />
          {step.decision_rule && (
            <div
              className="decision-hint"
              style={{
                backgroundColor: step.decision_rule === "ALL" ? "#fef3c7" : "#dcfce7",
                color: step.decision_rule === "ALL" ? "#92400e" : "#166534",
              }}
            >
              {step.decision_rule === "ALL"
                ? "All users with this role/position must approve before moving forward."
                : "Only one approval is needed from the assigned role/user to proceed."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalStepCard;
