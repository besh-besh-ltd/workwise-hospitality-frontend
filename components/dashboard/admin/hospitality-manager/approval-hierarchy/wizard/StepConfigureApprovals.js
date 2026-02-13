import React from "react";
import { BsPlus, BsLightbulb, BsPeopleFill, BsInfoCircleFill } from "react-icons/bs";
import ApprovalStepCard from "./ApprovalStepCard";
import ApprovalFlowPreview from "../preview/ApprovalFlowPreview";
import { BRAND_TEAL } from "../constants";

const StepConfigureApprovals = ({
  steps,
  selectedDepartmentId,
  departments,
  onAddStep,
  onRemoveStep,
  onStepChange,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  getApproverOptions,
  getApproverDisplayInfo,
}) => {
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
          margin-bottom: 20px;
        }
        .how-it-works {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 20px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .how-it-works ol {
          margin: 0;
          padding-left: 18px;
          font-size: 12px;
          color: #4b5563;
          line-height: 1.8;
        }
        .empty-steps {
          text-align: center;
          padding: 40px 20px;
          background: #f9fafb;
          border: 2px dashed #d1d5db;
          border-radius: 10px;
        }
        .preview-panel {
          position: sticky;
          top: 20px;
        }
        .preview-panel-inner {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
        }
        .preview-header {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          padding-bottom: 10px;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 10px;
        }
      `}</style>

      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div>
          <h4 className="step-heading">Configure Approval Levels</h4>
          <p className="step-subtext mb-0">
            Define who needs to approve and in what order.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm d-flex align-items-center gap-1"
          onClick={onAddStep}
          style={{
            backgroundColor: BRAND_TEAL,
            borderColor: BRAND_TEAL,
            color: "#fff",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 500,
            padding: "6px 14px",
          }}
        >
          <BsPlus size={16} /> Add Level
        </button>
      </div>

      <div className="row">
        {/* Form section */}
        <div className="col-12 col-lg-7">
          <div className="how-it-works">
            <BsLightbulb size={18} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "2px" }} />
            <div>
              <strong style={{ fontSize: "12px" }}>How it works:</strong>
              <ol>
                <li>Level 1 approver(s) review and approve first</li>
                <li>Then Level 2 approver(s) review, and so on</li>
                <li>Drag to reorder levels as needed</li>
              </ol>
            </div>
          </div>

          {selectedDepartmentId && (
            <div
              className="d-flex align-items-start gap-2"
              style={{
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "20px",
                fontSize: "13px",
                color: "#1e40af",
                lineHeight: 1.5,
              }}
            >
              <BsInfoCircleFill size={16} style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong>Department scope active.</strong> Only users mapped to the{" "}
                <strong>
                  {(departments || []).find((d) => d.id === selectedDepartmentId)?.title || "selected"}
                </strong>{" "}
                department (or those with company-wide access) will appear as approver options below.
              </div>
            </div>
          )}

          {steps.length === 0 ? (
            <div className="empty-steps">
              <BsPeopleFill size={32} style={{ color: "#d1d5db" }} />
              <p className="mb-1 mt-3 fw-semibold" style={{ color: "#6b7280", fontSize: "14px" }}>
                No approval levels added
              </p>
              <small style={{ color: "#9ca3af" }}>
                Click "Add Level" to start building your approval workflow
              </small>
            </div>
          ) : (
            steps.map((step, index) => (
              <ApprovalStepCard
                key={index}
                step={step}
                index={index}
                totalSteps={steps.length}
                selectedDepartmentId={selectedDepartmentId}
                getApproverOptions={getApproverOptions}
                getApproverDisplayInfo={getApproverDisplayInfo}
                onChange={onStepChange}
                onRemove={onRemoveStep}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
                onDrop={onDrop}
              />
            ))
          )}
        </div>

        {/* Preview section */}
        <div className="col-12 col-lg-5 mt-4 mt-lg-0">
          <div className="preview-panel">
            <div className="preview-panel-inner">
              <div className="preview-header">Live Preview</div>
              <ApprovalFlowPreview
                steps={steps}
                getApproverDisplayInfo={getApproverDisplayInfo}
                selectedDepartmentId={selectedDepartmentId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepConfigureApprovals;
