import React, { useMemo } from "react";
import { BsPlus } from "react-icons/bs";
import ProcessManageBar from "./ProcessManageBar";
import DepartmentSection from "./DepartmentSection";
import EmptyState from "./EmptyState";
import { BRAND_TEAL } from "../constants";

const DashboardView = ({
  policies,
  processes,
  departments,
  onCreateWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onCreateProcess,
  onUpdateProcess,
  onDeleteProcess,
  getApproverDisplayInfo,
}) => {
  const groupedByDepartment = useMemo(() => {
    const deptGroups = {};

    // Create department buckets
    (departments || []).forEach((dept) => {
      deptGroups[dept.id] = { department: dept, processGroups: {} };
    });
    deptGroups["no_dept"] = {
      department: { id: null, name: "No Department Selected" },
      processGroups: {},
    };

    // For each department bucket, initialize process sub-groups
    Object.keys(deptGroups).forEach((deptKey) => {
      processes.forEach((proc) => {
        deptGroups[deptKey].processGroups[proc.id] = { process: proc, policies: [] };
      });
      deptGroups[deptKey].processGroups["no_process"] = {
        process: { id: null, name: "No Process Selected" },
        policies: [],
      };
    });

    // Place each policy into its department → process bucket
    policies.forEach((policy) => {
      const deptKey = policy.department_id || "no_dept";
      const procKey = policy.process_id || "no_process";
      const dept = deptGroups[deptKey] || deptGroups["no_dept"];
      const procGroup = dept.processGroups[procKey] || dept.processGroups["no_process"];
      procGroup.policies.push(policy);
    });

    return deptGroups;
  }, [policies, processes, departments]);

  const hasAnyWorkflows = policies.length > 0;

  const namedDeptGroups = Object.entries(groupedByDepartment).filter(
    ([key]) => key !== "no_dept"
  );
  const generalDeptGroup = groupedByDepartment["no_dept"];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
        <div className="flex-grow-1">
          <ProcessManageBar
            processes={processes}
            onCreateProcess={onCreateProcess}
            onUpdateProcess={onUpdateProcess}
            onDeleteProcess={onDeleteProcess}
          />
        </div>
        <button
          className="btn d-flex align-items-center gap-1"
          onClick={onCreateWorkflow}
          style={{
            backgroundColor: BRAND_TEAL,
            borderColor: BRAND_TEAL,
            color: "#fff",
            borderRadius: "8px",
            padding: "8px 18px",
            fontSize: "13px",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          <BsPlus size={18} /> Create Workflow
        </button>
      </div>

      {!hasAnyWorkflows && processes.length === 0 ? (
        <div className="card border-0 shadow-sm" style={{ borderRadius: "12px" }}>
          <div className="card-body">
            <EmptyState onCreateWorkflow={onCreateWorkflow} />
          </div>
        </div>
      ) : (
        <>
          {namedDeptGroups.map(([key, group]) => (
            <DepartmentSection
              key={key}
              department={group.department}
              processGroups={group.processGroups}
              processes={processes}
              onEdit={onEditWorkflow}
              onDelete={onDeleteWorkflow}
              onCreateWorkflow={onCreateWorkflow}
              getApproverDisplayInfo={getApproverDisplayInfo}
            />
          ))}

          <DepartmentSection
            department={generalDeptGroup.department}
            processGroups={generalDeptGroup.processGroups}
            processes={processes}
            onEdit={onEditWorkflow}
            onDelete={onDeleteWorkflow}
            onCreateWorkflow={onCreateWorkflow}
            getApproverDisplayInfo={getApproverDisplayInfo}
            isGeneral
            defaultOpen={namedDeptGroups.length === 0}
          />
        </>
      )}
    </div>
  );
};

export default DashboardView;
