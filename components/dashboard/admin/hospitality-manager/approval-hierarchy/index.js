"use client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/router";
import { BsArrowLeft } from "react-icons/bs";
import SkeletonLoader from "./dashboard/SkeletonLoader";
import { deleteApprovalPolicy } from "@/services/approval";
import useApprovalData from "./hooks/useApprovalData";
import useProcessData from "./hooks/useProcessData";
import DashboardView from "./dashboard/DashboardView";
import WorkflowWizard from "./wizard/WorkflowWizard";
import { DS, getStageEntityOrder, ARC_ENTITY_ORDER, isArcEntityType } from "./constants";

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
    // ARC flow: process-free policies whose entity_type is an ARC stage.
    if (process.is_arc) {
      const arcPolicies = policies.filter((p) => !p.process_id && isArcEntityType(p.entity_type));
      setEditingProcess(process);
      setEditingPolicies(arcPolicies);
      setViewMode("wizard");
      return;
    }
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
      const toDelete = process.is_arc
        ? policies.filter((p) => !p.process_id && isArcEntityType(p.entity_type))
        : policies.filter((p) => p.process_id === process.id);
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
      <div className="container-fluid">
        <div className="mb-4">
          <div style={{ width: 60, height: 14, background: DS.pageBg, borderRadius: 4, marginBottom: 10 }} />
          <div style={{ width: 200, height: 24, background: DS.pageBg, borderRadius: 6, marginBottom: 6 }} />
          <div style={{ width: 160, height: 14, background: DS.pageBg, borderRadius: 4 }} />
        </div>
        <SkeletonLoader variant={viewMode === "wizard" ? "wizard" : "dashboard"} />
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Page header */}
      <div className="mb-4">
        <button
          className="d-inline-flex align-items-center gap-1"
          onClick={() => {
            if (viewMode === "wizard") {
              handleWizardCancel();
            } else {
              router.back();
            }
          }}
          style={{
            color: DS.primary,
            fontSize: "13px",
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 500,
            background: DS.blueTint,
            border: "none",
            borderRadius: 8,
            padding: "6px 14px",
            cursor: "pointer",
            transition: "all 0.15s",
            marginBottom: 10,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = DS.primary + "18"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = DS.blueTint; }}
        >
          <BsArrowLeft size={13} />
          {viewMode === "wizard" ? "Back to Workflows" : "Back"}
        </button>
        <h4 className="mb-1 fw-bold" style={{ color: DS.dark, fontFamily: "'Poppins', sans-serif" }}>
          {viewMode === "wizard"
            ? editingProcess
              ? "Edit Approval Workflow"
              : "Create Approval Workflow"
            : "Approval Workflows"}
        </h4>
        {hotel && (
          <p className="mb-0" style={{ fontSize: "13px", color: DS.muted, fontFamily: "'Poppins', sans-serif" }}>
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
