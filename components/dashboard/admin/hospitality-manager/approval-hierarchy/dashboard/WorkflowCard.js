import React, { useState } from "react";
import { BsPencil, BsTrash } from "react-icons/bs";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import ApprovalFlowPreview from "../preview/ApprovalFlowPreview";
import { getEntityTypeConfig, BRAND_TEAL } from "../constants";

const WorkflowCard = ({ policy, onEdit, onDelete, getApproverDisplayInfo }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const entityConfig = getEntityTypeConfig(policy.entity_type);
  const EntityIcon = entityConfig.icon;
  const stepCount = policy.steps?.length || 0;

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
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .workflow-card:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          transform: translateY(-2px);
        }
        .workflow-card-header {
          padding: 16px 16px 12px;
          border-bottom: 1px solid #f3f4f6;
        }
        .workflow-card-body {
          padding: 8px 16px;
          flex: 1;
        }
        .workflow-card-footer {
          padding: 12px 16px;
          border-top: 1px solid #f3f4f6;
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        .entity-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }
      `}</style>

      <div className="workflow-card">
        <div className="workflow-card-header">
          <div className="d-flex align-items-center justify-content-between">
            <span
              className="entity-badge"
              style={{
                backgroundColor: `${entityConfig.color}15`,
                color: entityConfig.color,
              }}
            >
              <EntityIcon size={13} />
              {entityConfig.label}
            </span>
            <small className="text-muted">
              {stepCount} {stepCount === 1 ? "step" : "steps"}
            </small>
          </div>
        </div>

        <div className="workflow-card-body">
          <ApprovalFlowPreview
            steps={policy.steps || []}
            getApproverDisplayInfo={getApproverDisplayInfo}
            compact
          />
        </div>

        <div className="workflow-card-footer">
          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={() => onEdit(policy.id)}
            style={{ borderRadius: "6px", fontSize: "12px", padding: "4px 12px" }}
          >
            <BsPencil size={11} /> Edit
          </button>
          <button
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
          await onDelete(policy.id);
          setShowDeleteModal(false);
        }}
        title="Delete Workflow"
        description={`Are you sure you want to delete the <strong>${entityConfig.label}</strong> workflow? This action cannot be undone.`}
        confirmButtonColor="danger"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default WorkflowCard;
