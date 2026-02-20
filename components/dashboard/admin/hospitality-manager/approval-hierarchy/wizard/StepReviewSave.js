import React from "react";
import { BsCheckCircle } from "react-icons/bs";
import ApprovalFlowGraph from "../preview/ApprovalFlowGraph";
import { BRAND_TEAL, getStagesForProcessType } from "../constants";

const StepReviewSave = ({
  process,
  stages,
  hotel,
  getApproverDisplayInfo,
}) => {
  const processName = process?.name || "Unknown Process";
  const isRfqRoute = (process?.process_type || "").toUpperCase() === "RFQ";
  const flowLabel = isRfqRoute
    ? "RFQ → Technical → Negotiation → Neg. Quote → PO"
    : "Tender → Technical → Negotiation → Neg. Quote → ARC";

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
        }
        .flow-review-container {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 20px;
          margin: 0 auto;
        }
        .flow-review-header {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          padding-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 16px;
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

      <h4 className="step-heading">Review your workflow</h4>
      <p className="step-subtext">
        Verify the process and approval stages before saving.
      </p>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">Process</div>
          <div className="summary-value">{processName}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Flow</div>
          <div className="summary-value">{flowLabel}</div>
        </div>
        {hotel && (
          <div className="summary-card">
            <div className="summary-label">Business Unit</div>
            <div className="summary-value" style={{ fontSize: "14px" }}>
              {hotel.name}
            </div>
          </div>
        )}
      </div>

      <div className="flow-review-container">
        <div className="flow-review-header">Approval flow</div>
        <ApprovalFlowGraph
          stages={stages}
          getApproverDisplayInfo={getApproverDisplayInfo}
        />
      </div>

      <div className="info-banner">
        <BsCheckCircle size={18} style={{ color: "#16a34a", flexShrink: 0 }} />
        <p>
          Once saved, this workflow will apply to the <strong>{processName}</strong> process
          for this business unit. Approvals will follow <strong>{flowLabel}</strong> in order.
        </p>
      </div>
    </div>
  );
};

export default StepReviewSave;
