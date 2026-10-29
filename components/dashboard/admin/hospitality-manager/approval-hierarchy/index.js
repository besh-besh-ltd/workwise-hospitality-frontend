"use client";
import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { BsArrowLeft } from "react-icons/bs";
import SkeletonLoader from "./dashboard/SkeletonLoader";
import { deleteApprovalPolicy } from "@/services/approval";
import useApprovalData from "./hooks/useApprovalData";
import useProcessData from "./hooks/useProcessData";
import DashboardView from "./dashboard/DashboardView";
import WorkflowWizard from "./wizard/WorkflowWizard";
import { DS, getStageEntityOrder, ARC_ENTITY_ORDER, isArcEntityType, isArcGroupEntityType, isPrEntityType } from "./constants";

const ApprovalHierarchyRedesigned = () => {
  const router = useRouter();
  const { companyId, hotelId } = router.query;

  const [viewMode, setViewMode] = useState("dashboard"); // 'dashboard' | 'wizard'
  const [editingProcess, setEditingProcess] = useState(null);
  const [editingPolicies, setEditingPolicies] = useState([]);
  // Set once the open wizard has written or deleted any stage.
  const wizardWrote = useRef(false);

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
    getUsersByRole,
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

  const [initialFlow, setInitialFlow] = useState(null);

  // The PR policy row behind a PR card: this hotel's own, or the inherited
  // company-wide one. A card always maps to exactly ONE row.
  const prPolicyFor = useCallback(
    (process) => policies.filter(
      (p) => !p.process_id && isPrEntityType(p.entity_type)
        && (process.pr_scope === "company" ? p.hotel_id == null : p.hotel_id != null)
    ).slice(0, 1),
    [policies]
  );

  const handleCreateWorkflow = useCallback((flow) => {
    setInitialFlow(typeof flow === "string" ? flow : null);
    setEditingProcess(null);
    setEditingPolicies([]);
    setViewMode("wizard");
  }, []);

  const handleEditWorkflow = useCallback((process) => {
    if (!process?.id) return;
    // PR: the process-free PR chain (this hotel's, or the company-wide one).
    if (process.is_pr) {
      setInitialFlow(null);
      setEditingProcess(process);
      setEditingPolicies(prPolicyFor(process));
      setViewMode("wizard");
      return;
    }
    // A policy that belongs to no process and no known flow cannot be edited in
    // the wizard. Say so — Edit must never fall through to deleting it.
    if (process.is_orphan) {
      toast.info("This policy can't be edited here yet. Delete and recreate it, or contact support.");
      return;
    }
    // ARC / Group ARC flows: process-free policies of that flow's stage types.
    if (process.is_arc) {
      const isFlowType = process.is_arc_group ? isArcGroupEntityType : isArcEntityType;
      const arcPolicies = policies.filter((p) => !p.process_id && isFlowType(p.entity_type));
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
  }, [policies, prPolicyFor]);

  const handleDeleteWorkflow = useCallback(
    async (process) => {
      if (!process?.id) return;
      const toDelete = process.is_arc_group
        ? policies.filter((p) => !p.process_id && isArcGroupEntityType(p.entity_type))
        : process.is_arc
        ? policies.filter((p) => !p.process_id && isArcEntityType(p.entity_type))
        : process.is_pr
        ? prPolicyFor(process)
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
    [policies, refreshPolicies, prPolicyFor]
  );

  const handleWizardSave = useCallback(() => {
    wizardWrote.current = false;
    refreshPolicies();
    refreshProcesses();
    setEditingProcess(null);
    setEditingPolicies([]);
    setInitialFlow(null);
    setViewMode("dashboard");
  }, [refreshPolicies, refreshProcesses]);

  const handleWizardCancel = useCallback(() => {
    // A partial save leaves the dashboard showing the pre-save policies.
    if (wizardWrote.current) {
      wizardWrote.current = false;
      refreshPolicies();
      refreshProcesses();
    }
    setEditingProcess(null);
    setEditingPolicies([]);
    setInitialFlow(null);
    setViewMode("dashboard");
  }, [refreshPolicies, refreshProcesses]);

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
          onCreatePrChain={() => handleCreateWorkflow("PR")}
          onEditWorkflow={handleEditWorkflow}
          onDeleteWorkflow={handleDeleteWorkflow}
          onDeletePolicy={handleDeletePolicy}
          onCreateProcess={handleCreateProcess}
          onUpdateProcess={handleUpdateProcess}
          onDeleteProcess={handleDeleteProcess}
          getApproverDisplayInfo={getApproverDisplayInfo}
          getDeptSubGraphPreview={getDeptSubGraphPreview}
          roles={roles}
          getUsersByRole={getUsersByRole}

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
          initialFlow={initialFlow}
          prChainExists={{
            hotel: policies.some((p) => !p.process_id && isPrEntityType(p.entity_type) && p.hotel_id != null),
            company: policies.some((p) => !p.process_id && isPrEntityType(p.entity_type) && p.hotel_id == null),
          }}
          onWrite={() => { wizardWrote.current = true; }}
          groupWorkflowExists={policies.some((p) => !p.process_id && isArcGroupEntityType(p.entity_type))}
        />
      )}
    </div>
  );
};

export default ApprovalHierarchyRedesigned;
