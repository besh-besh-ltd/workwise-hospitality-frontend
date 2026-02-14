import React from "react";
import { BsCheckCircle } from "react-icons/bs";
import ApprovalFlowPreview from "../preview/ApprovalFlowPreview";
import { getEntityTypeConfig, BRAND_TEAL } from "../constants";

const StepReviewSave = ({
  wizardForm,
  processes,
  departments,
  hotel,
  getApproverDisplayInfo,
}) => {
  const entityConfig = getEntityTypeConfig(wizardForm.entity_type);
  const EntityIcon = entityConfig.icon;
  const departmentName = wizardForm.department_id
    ? (departments || []).find((d) => d.id === wizardForm.department_id)?.title || "Unknown"
    : "No Department Selected";
  const processName = wizardForm.process_id
    ? processes.find((p) => p.id === wizardForm.process_id)?.name || "Unknown"
    : "No Process Selected";

  return (
    <div>
      <style jsx>{`
        .step-heading {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 6px;
        }
        .step-subtext {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 24px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .summary-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
        }
        .summary-label {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .summary-value {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .flow-review-container {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 20px;
          max-width: 600px;
          margin: 0 auto;
        }
        .flow-review-header {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          padding-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 8px;
          text-align: center;
        }
        .info-banner {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 24px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        .info-banner p {
          margin: 0;
          font-size: 13px;
          color: #166534;
          line-height: 1.4;
        }
      `}</style>

      <h4 className="step-heading">Review Your Workflow</h4>
      <p className="step-subtext">
        Verify the details below before saving.
      </p>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">Document Type</div>
          <div className="summary-value">
            <EntityIcon size={18} style={{ color: entityConfig.color }} />
            {entityConfig.label}
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Department</div>
          <div className="summary-value">{departmentName}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Process</div>
          <div className="summary-value">{processName}</div>
        </div>
        {hotel && (
          <div className="summary-card">
            <div className="summary-label">Business Unit</div>
            <div className="summary-value" style={{ fontSize: "14px" }}>{hotel.name}</div>
          </div>
        )}
      </div>

      <div className="flow-review-container">
        <div className="flow-review-header">Approval Flow</div>
        <ApprovalFlowPreview
          steps={wizardForm.steps || []}
          getApproverDisplayInfo={getApproverDisplayInfo}
          selectedDepartmentId={wizardForm.department_id}
        />
      </div>

      <div className="info-banner">
        <BsCheckCircle size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
        <p>
          Once saved, this workflow will apply to all new <strong>{entityConfig.label.replace(" Approval", "")}</strong> documents
          for this business unit{wizardForm.process_id ? ` under the "${processName}" process` : ""}.
        </p>
      </div>
    </div>
  );
};

export default StepReviewSave;
