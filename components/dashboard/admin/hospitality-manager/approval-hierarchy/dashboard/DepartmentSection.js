import React, { useState } from "react";
import { Collapse } from "react-bootstrap";
import { BsChevronDown, BsChevronRight, BsBuilding } from "react-icons/bs";
import ProcessSection from "./ProcessSection";
import EmptyState from "./EmptyState";

const DepartmentSection = ({
  department,
  processGroups,
  processes,
  onEdit,
  onDelete,
  onCreateWorkflow,
  getApproverDisplayInfo,
  defaultOpen = true,
  isGeneral = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  // Filter out empty process groups
  const nonEmptyProcessGroups = Object.entries(processGroups).filter(
    ([, group]) => group.policies.length > 0
  );

  const totalWorkflows = nonEmptyProcessGroups.reduce(
    (sum, [, group]) => sum + group.policies.length,
    0
  );

  // Don't render if no workflows in this department
  if (totalWorkflows === 0 && !isGeneral) return null;

  const namedProcessGroups = nonEmptyProcessGroups.filter(([key]) => key !== "no_process");
  const generalProcessGroup = processGroups["no_process"];

  return (
    <div className="mb-4">
      <style jsx>{`
        .dept-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: ${isGeneral ? "#f9fafb" : "#fff"};
          border: 1px solid #e5e7eb;
          border-left: 4px solid ${isGeneral ? "#9ca3af" : "#6366f1"};
          border-radius: ${open ? "10px 10px 0 0" : "10px"};
          cursor: pointer;
          transition: all 0.2s ease;
          user-select: none;
        }
        .dept-section-header:hover {
          background: #f9fafb;
        }
        .dept-section-body {
          border: 1px solid #e5e7eb;
          border-top: none;
          border-radius: 0 0 10px 10px;
          background: #fafbfc;
          padding: 16px;
        }
        .dept-name {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a1a;
        }
        .dept-count {
          font-size: 12px;
          color: #6b7280;
          margin-left: 10px;
          font-weight: 400;
        }
        .dept-icon {
          color: ${isGeneral ? "#9ca3af" : "#6366f1"};
          margin-right: 10px;
          flex-shrink: 0;
        }
        .chevron-icon {
          transition: transform 0.2s ease;
          color: #9ca3af;
        }
      `}</style>

      <div className="dept-section-header" onClick={() => setOpen(!open)}>
        <div className="d-flex align-items-center">
          {open ? (
            <BsChevronDown size={14} className="chevron-icon me-2" />
          ) : (
            <BsChevronRight size={14} className="chevron-icon me-2" />
          )}
          <BsBuilding size={16} className="dept-icon" />
          <span className="dept-name">
            {isGeneral ? "No Department Selected" : (department.title || department.name)}
          </span>
          <span className="dept-count">
            ({totalWorkflows} {totalWorkflows === 1 ? "workflow" : "workflows"})
          </span>
        </div>
      </div>

      <Collapse in={open}>
        <div>
          <div className="dept-section-body">
            {totalWorkflows === 0 ? (
              <EmptyState
                compact
                title="No workflows in this department"
                subtitle="Create a workflow to define approval steps for this department."
                onCreateWorkflow={onCreateWorkflow}
              />
            ) : (
              <>
                {namedProcessGroups.map(([key, group]) => (
                  <ProcessSection
                    key={key}
                    process={group.process}
                    policies={group.policies}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onCreateWorkflow={onCreateWorkflow}
                    getApproverDisplayInfo={getApproverDisplayInfo}
                    isNested
                  />
                ))}

                {generalProcessGroup && generalProcessGroup.policies.length > 0 && (
                  <ProcessSection
                    process={generalProcessGroup.process}
                    policies={generalProcessGroup.policies}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onCreateWorkflow={onCreateWorkflow}
                    getApproverDisplayInfo={getApproverDisplayInfo}
                    isGeneral
                    isNested
                    defaultOpen={namedProcessGroups.length === 0}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </Collapse>
    </div>
  );
};

export default DepartmentSection;
