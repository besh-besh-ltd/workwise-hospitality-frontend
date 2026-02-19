import React, { useMemo, useState } from "react";
import { BsPlus, BsDiagram3 } from "react-icons/bs";
import ProcessManageBar from "./ProcessManageBar";
import ProcessSection from "./ProcessSection";
import EmptyState from "./EmptyState";
import DepartmentAccessMatrix from "./DepartmentAccessMatrix";
import { BRAND_TEAL } from "../constants";
import DepartmentSubGraphPreview from "../preview/DepartmentSubGraphPreview";

const DashboardView = ({
  policies,
  processes,
  departments,
  onCreateWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onDeletePolicy,
  onCreateProcess,
  onUpdateProcess,
  onDeleteProcess,
  getApproverDisplayInfo,
  getDeptSubGraphPreview,
  onRefreshDepartments,
}) => {
  const [previewPolicy, setPreviewPolicy] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Group policies by process only (no department dimension)
  const groupedByProcess = useMemo(() => {
    const processGroups = {};

    // Initialize process buckets
    (processes || []).forEach((proc) => {
      processGroups[proc.id] = { process: proc, policies: [] };
    });
    processGroups["no_process"] = {
      process: { id: null, name: "No Process Selected" },
      policies: [],
    };

    // Place each policy (master policies only) into its process bucket
    policies.forEach((policy) => {
      const procKey = policy.process_id || "no_process";
      const group = processGroups[procKey] || processGroups["no_process"];
      group.policies.push(policy);
    });

    return processGroups;
  }, [policies, processes]);

  const hasAnyWorkflows = policies.length > 0;

  const handleViewDeptMapping = async (policy) => {
    setPreviewPolicy(policy);
    setPreviewLoading(true);
    try {
      const data = await getDeptSubGraphPreview(policy.id);
      setPreviewData(data);
    } catch (err) {
      console.error("Error loading preview:", err);
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewPolicy(null);
    setPreviewData(null);
  };

  return (
    <div>
      {/* Department Access Matrix - collapsible section at top */}
      <DepartmentAccessMatrix onRefresh={onRefreshDepartments} />

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
          {Object.entries(groupedByProcess).map(([key, group]) => {
            if (group.policies.length === 0 && key !== "no_process") return null;
            return (
              <ProcessSection
                key={key}
                process={group.process}
                policies={group.policies}
                onEdit={onEditWorkflow}
                onDeleteWorkflow={onDeleteWorkflow}
                onDeletePolicy={onDeletePolicy}
                getApproverDisplayInfo={getApproverDisplayInfo}
                onViewDeptMapping={handleViewDeptMapping}
              />
            );
          })}
        </>
      )}

      {previewPolicy && (
        <DepartmentSubGraphPreview
          policy={previewPolicy}
          previewData={previewData}
          loading={previewLoading}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
};

export default DashboardView;
