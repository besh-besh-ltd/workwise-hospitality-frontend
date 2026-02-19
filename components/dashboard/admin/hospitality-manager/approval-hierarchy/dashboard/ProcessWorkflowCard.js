import React, { useState } from "react";
import { BsPencil, BsTrash } from "react-icons/bs";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import ApprovalFlowGraph from "../preview/ApprovalFlowGraph";
import { BRAND_TEAL, getStageEntityOrder } from "../constants";

const ProcessWorkflowCard = ({
  process,
  policies,
  onEdit,
  onDelete,
  getApproverDisplayInfo,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const processType = (process?.process_type || "RFQ").toUpperCase();
  const stageOrder = getStageEntityOrder(processType === "RFQ" ? "RFQ" : "TENDER");

  const stages = stageOrder.map((entity_type) => {
    const policy = (policies || []).find((p) => p.entity_type === entity_type);
    return {
      entity_type,
      steps: policy?.steps || [],
    };
  });

  const processName = process?.name || "Process";
  const isRfqRoute = processType === "RFQ";
  const flowLabel = isRfqRoute
    ? "RFQ → Tech → Quote → PO"
    : "Tender → Tech → Quote → ARC";

  return (
    <>
      <style jsx>{`
        .workflow-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-left: 4px solid ${BRAND_TEAL};
          border-radius: 10px;
          padding: 0;
          transition: all 0.2s ease;
          overflow: hidden;
        }
        .workflow-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        .workflow-card-header {
          padding: 16px 18px;
          border-bottom: 1px solid #f3f4f6;
        }
        .workflow-card-body {
          padding: 18px;
        }
        .workflow-card-footer {
          padding: 12px 18px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
      `}</style>

      <div className="workflow-card">
        <div className="workflow-card-header">
          <div className="d-flex align-items-center justify-content-between">
            <h6 className="mb-0 fw-bold" style={{ color: "#1a1a1a", fontSize: "15px" }}>
              {processName}
            </h6>
            <span className="text-muted" style={{ fontSize: "12px" }}>
              {flowLabel}
            </span>
          </div>
          {process?.description && (
            <p className="mb-0 mt-1 text-muted" style={{ fontSize: "12px" }}>
              {process.description}
            </p>
          )}
        </div>

        <div className="workflow-card-body">
          <ApprovalFlowGraph
            stages={stages}
            getApproverDisplayInfo={getApproverDisplayInfo}
          />
        </div>

        <div className="workflow-card-footer">
          <button
            type="button"
            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
            onClick={() => onEdit(process)}
            style={{ borderRadius: "6px", fontSize: "12px", padding: "4px 12px" }}
          >
            <BsPencil size={11} /> Edit
          </button>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
            onClick={() => setShowDeleteModal(true)}
            style={{ borderRadius: "6px", fontSize: "12px", padding: "4px 12px" }}
          >
            <BsTrash size={11} /> Delete
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          await onDelete(process);
          setShowDeleteModal(false);
        }}
        title="Delete workflow"
        description={`Delete the entire approval workflow for <strong>${processName}</strong>? This will remove all approval stages (${flowLabel}) for this process.`}
        confirmButtonColor="danger"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default ProcessWorkflowCard;
