import React, { useState } from "react";
import { Collapse } from "react-bootstrap";
import { BsChevronDown, BsChevronRight } from "react-icons/bs";
import WorkflowCard from "./WorkflowCard";
import ProcessWorkflowCard from "./ProcessWorkflowCard";
import EmptyState from "./EmptyState";

const ProcessSection = ({
  process,
  policies,
  onEdit,
  onDeleteWorkflow,
  onDeletePolicy,
  onCreateWorkflow,
  getApproverDisplayInfo,
  onViewDeptMapping,
  defaultOpen = true,
  isGeneral = false,
  isNested = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={isNested ? "mb-2" : "mb-3"}>
      <style jsx>{`
        .process-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: ${isNested ? "10px 14px" : "14px 18px"};
          background: ${isGeneral ? "#f9fafb" : isNested ? "#f3f4f6" : "#fff"};
          border: ${isNested ? "1px solid #e5e7eb" : "1px solid #e5e7eb"};
          border-radius: ${open ? "8px 8px 0 0" : "8px"};
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }
        .process-section-header:hover {
          background: ${isNested ? "#eef0f2" : "#f9fafb"};
        }
        .process-section-body {
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 8px 8px;
          background: ${isNested ? "#fafbfc" : "#fafbfc"};
          padding: ${isNested ? "12px" : "16px"};
        }
        .process-name {
          font-size: ${isNested ? "13px" : "15px"};
          font-weight: 600;
          color: #1a1a1a;
        }
        .process-count {
          font-size: ${isNested ? "11px" : "12px"};
          color: #6b7280;
          margin-left: 8px;
        }
        .chevron-icon {
          transition: transform 0.2s ease;
          color: #9ca3af;
        }
      `}</style>

      <div className="process-section-header" onClick={() => setOpen(!open)}>
        <div className="d-flex align-items-center">
          {open ? <BsChevronDown size={14} className="chevron-icon me-2" /> : <BsChevronRight size={14} className="chevron-icon me-2" />}
          <span className="process-name">
            {isGeneral ? "No Process Selected" : process.name}
          </span>
          <span className="process-count">
            ({process.id ? "1 workflow" : `${policies.length} workflow${policies.length !== 1 ? "s" : ""}`})
          </span>
        </div>
        {process.description && !isGeneral && (
          <small className="text-muted d-none d-md-block" style={{ fontSize: "12px", maxWidth: "300px" }}>
            {process.description}
          </small>
        )}
      </div>

      <Collapse in={open}>
        <div>
          <div className="process-section-body">
            {policies.length === 0 ? (
              <EmptyState
                compact
                title="No workflows in this process"
                subtitle="Create a workflow to define approval steps for this process."
                onCreateWorkflow={onCreateWorkflow}
              />
            ) : process.id ? (
              <div className="col-12">
                <ProcessWorkflowCard
                  process={process}
                  policies={policies}
                  onEdit={onEdit}
                  onDelete={onDeleteWorkflow}
                  getApproverDisplayInfo={getApproverDisplayInfo}
                />
              </div>
            ) : (
              <div className="row g-3">
                {policies.map((policy) => (
                  <div key={policy.id} className="col-12 col-md-6 col-lg-4">
                    <WorkflowCard
                      policy={policy}
                      onEdit={onEdit}
                      onDelete={onDeletePolicy}
                      getApproverDisplayInfo={getApproverDisplayInfo}
                      onViewDeptMapping={onViewDeptMapping}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Collapse>
    </div>
  );
};

export default ProcessSection;
