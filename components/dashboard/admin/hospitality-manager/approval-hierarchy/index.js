"use client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/router";
import { BsArrowLeft } from "react-icons/bs";
import FullLoader from "@/components/shared/FullLoader";
import { deleteApprovalPolicy } from "@/services/approval";
import useApprovalData from "./hooks/useApprovalData";
import useProcessData from "./hooks/useProcessData";
import DashboardView from "./dashboard/DashboardView";
import WorkflowWizard from "./wizard/WorkflowWizard";
import { BRAND_TEAL, getStageEntityOrder } from "./constants";

const ApprovalHierarchyRedesigned = () => {
  const router = useRouter();
  const { companyId, hotelId } = router.query;

  const [viewMode, setViewMode] = useState("dashboard"); // 'dashboard' | 'wizard'
  const [editingProcess, setEditingProcess] = useState(null);
  const [editingPolicies, setEditingPolicies] = useState([]);

  const {
    hotel,
    policies,
    roles,
    users,
    userRoleScopes,
    departments,
    loading: dataLoading,
    refresh: refreshPolicies,
    getApproverOptions,
    getApproverDisplayInfo,
    handleDeletePolicy,
    getDeptSubGraphPreview,
    refreshDepartments,
  } = useApprovalData(companyId, hotelId);

  const {
    processes,
    loading: processLoading,
    handleCreateProcess,
    handleUpdateProcess,
    handleDeleteProcess,
    refresh: refreshProcesses,
  } = useProcessData(companyId);

  const loading = dataLoading || processLoading;

  const handleCreateWorkflow = useCallback(() => {
    setEditingProcess(null);
    setEditingPolicies([]);
    setViewMode("wizard");
  }, []);

  const handleEditWorkflow = useCallback((process) => {
    if (!process?.id) return;
    const entityOrder = getStageEntityOrder(process?.process_type);
    const forProcess = policies.filter(
      (p) => p.process_id === process.id && entityOrder.includes(p.entity_type)
    );
    setEditingProcess(process);
    setEditingPolicies(forProcess);
    setViewMode("wizard");
  }, [policies]);

  const handleDeleteWorkflow = useCallback(
    async (process) => {
      if (!process?.id) return;
      const toDelete = policies.filter((p) => p.process_id === process.id);
      for (const policy of toDelete) {
        try {
          await deleteApprovalPolicy(policy.id);
        } catch (e) {
          console.error("Error deleting policy:", e);
        }
      }
      await refreshPolicies();
    },
    [policies, refreshPolicies]
  );

  const handleWizardSave = useCallback(() => {
    refreshPolicies();
    refreshProcesses();
    setEditingProcess(null);
    setEditingPolicies([]);
    setViewMode("dashboard");
  }, [refreshPolicies, refreshProcesses]);

  const handleWizardCancel = useCallback(() => {
    setEditingProcess(null);
    setEditingPolicies([]);
    setViewMode("dashboard");
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <FullLoader />
      </div>
    );
  }

  return (
    <div className="container-fluid py-4 mt-5">
      {/* Page header */}
      <div className="mb-4">
        <button
          className="btn btn-link text-decoration-none p-0 mb-2 d-flex align-items-center gap-1"
          onClick={() => {
            if (viewMode === "wizard") {
              handleWizardCancel();
            } else {
              router.back();
            }
          }}
          style={{ color: "#6b7280", fontSize: "13px" }}
        >
          <BsArrowLeft size={14} />
          {viewMode === "wizard" ? "Back to Workflows" : "Back"}
        </button>
        <h4 className="mb-1 fw-bold" style={{ color: "#1a1a1a" }}>
          {viewMode === "wizard"
            ? editingProcess
              ? "Edit Approval Workflow"
              : "Create Approval Workflow"
            : "Approval Workflows"}
        </h4>
        {hotel && (
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
            {hotel.name}
            {(hotel.city || hotel.state) && (
              <span> — {[hotel.city, hotel.state].filter(Boolean).join(", ")}</span>
            )}
          </p>
        )}
      </div>

      {/* View content */}
      {viewMode === "dashboard" ? (
        <DashboardView
          policies={policies}
          processes={processes}
          departments={departments}
          onCreateWorkflow={handleCreateWorkflow}
          onEditWorkflow={handleEditWorkflow}
          onDeleteWorkflow={handleDeleteWorkflow}
          onDeletePolicy={handleDeletePolicy}
          onCreateProcess={handleCreateProcess}
          onUpdateProcess={handleUpdateProcess}
          onDeleteProcess={handleDeleteProcess}
          getApproverDisplayInfo={getApproverDisplayInfo}
          getDeptSubGraphPreview={getDeptSubGraphPreview}
          onRefreshDepartments={refreshDepartments}
        />
      ) : (
        <WorkflowWizard
          editingProcess={editingProcess}
          editingPolicies={editingPolicies}
          processes={processes}
          hotel={hotel}
          companyId={companyId}
          hotelId={hotelId}
          getApproverOptions={getApproverOptions}
          getApproverDisplayInfo={getApproverDisplayInfo}
          onCreateProcess={handleCreateProcess}
          onSave={handleWizardSave}
          onCancel={handleWizardCancel}
        />
      )}
    </div>
  );
};

export default ApprovalHierarchyRedesigned;
