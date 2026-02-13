"use client";
import React, { useState, useCallback } from "react";
import { useRouter } from "next/router";
import { BsArrowLeft } from "react-icons/bs";
import FullLoader from "@/components/shared/FullLoader";
import { getApprovalPolicy } from "@/services/approval";
import useApprovalData from "./hooks/useApprovalData";
import useProcessData from "./hooks/useProcessData";
import DashboardView from "./dashboard/DashboardView";
import WorkflowWizard from "./wizard/WorkflowWizard";
import { BRAND_TEAL } from "./constants";

const ApprovalHierarchyRedesigned = () => {
  const router = useRouter();
  const { companyId, hotelId } = router.query;

  const [viewMode, setViewMode] = useState("dashboard"); // 'dashboard' | 'wizard'
  const [editingPolicy, setEditingPolicy] = useState(null);

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
    setEditingPolicy(null);
    setViewMode("wizard");
  }, []);

  const handleEditWorkflow = useCallback(async (policyId) => {
    try {
      const response = await getApprovalPolicy(policyId);
      const policy = response?.data?.data || response?.data;
      setEditingPolicy(policy);
      setViewMode("wizard");
    } catch (error) {
      console.error("Error loading policy:", error);
    }
  }, []);

  const handleWizardSave = useCallback(async () => {
    await refreshPolicies();
    await refreshProcesses();
    setEditingPolicy(null);
    setViewMode("dashboard");
  }, [refreshPolicies, refreshProcesses]);

  const handleWizardCancel = useCallback(() => {
    setEditingPolicy(null);
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
            ? editingPolicy
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
          onDeleteWorkflow={handleDeletePolicy}
          onCreateProcess={handleCreateProcess}
          onUpdateProcess={handleUpdateProcess}
          onDeleteProcess={handleDeleteProcess}
          getApproverDisplayInfo={getApproverDisplayInfo}
        />
      ) : (
        <WorkflowWizard
          editingPolicy={editingPolicy}
          processes={processes}
          departments={departments}
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
