"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import Select from "react-select";
import {
  getApprovalPolicies,
  getApprovalPolicy,
  createApprovalPolicy,
  updateApprovalPolicy,
  deleteApprovalPolicy,
  getPendingImpact,
} from "@/services/approval";
import { getRoles, getBatchUserRoleScopes } from "@/services/rbac";
import { getCompanyUserMappings, getHospitalityHotels } from "@/services/hospitality";

const ApprovalHierarchyPage = () => {
  const router = useRouter();
  const { companyId, hotelId } = router.query;

  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState(null);
  const [company, setCompany] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [userRoleScopes, setUserRoleScopes] = useState({}); // Map of userId -> roleIds array
  const [departments] = useState([]);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [policyForm, setPolicyForm] = useState({
    id: null,
    name: "",
    entity_type: "RFQ",
    hospitality_company_id: companyId ? parseInt(companyId) : null,
    hotel_id: hotelId ? parseInt(hotelId) : null,
    department_id: null,
    is_active: true,
    steps: [],
  });

  const entityTypes = [
    { value: "RFQ", label: "RFQ Approval" },
    { value: "TENDER", label: "Tender Approval" },
    { value: "PO", label: "Purchase Order Approval" },
    { value: "NEGOTIATION", label: "Negotiation Approval" },
    { value: "NEGOTIATION_QUOTE", label: "Negotiation Quotes Approval" },
    { value: "TECHNICAL", label: "Technical Approval" },
    { value: "ARC", label: "ARC Committee Approval" },
  ];

  const approverSourceTypes = [
    { value: "USER", label: "Specific User" },
    { value: "ROLE", label: "User Role" },
  ];

  const decisionRules = [
    { value: "ANY", label: "Any one person can approve" },
    { value: "ALL", label: "Everyone must approve" },
  ];

  useEffect(() => {
    if (companyId && hotelId) {
      loadData();
    }
  }, [companyId, hotelId]);

  // Ensure role scopes are loaded when users change
  useEffect(() => {
    if (users.length > 0 && Object.keys(userRoleScopes).length === 0) {
      loadUserRoleScopes(users.map(u => u.user_id));
    }
  }, [users]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadHotel(),
        loadPolicies(),
        loadRoles(),
        loadUsers(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadHotel = async () => {
    try {
      const response = await getHospitalityHotels(companyId);
      const hotels = response?.data ?? response ?? [];
      const foundHotel = hotels.find((h) => h.id === parseInt(hotelId));
      if (foundHotel) {
        setHotel(foundHotel);
        setCompany({ id: parseInt(companyId) });
      }
    } catch (error) {
      console.error("Error loading business unit:", error);
    }
  };

  const loadPolicies = async () => {
    try {
      const response = await getApprovalPolicies({
        hospitality_company_id: companyId,
        hotel_id: hotelId,
        include: 'steps',
      });
      const policiesWithSteps = response?.data?.data || response?.data || [];
      setPolicies(policiesWithSteps);
    } catch (error) {
      console.error("Error loading policies:", error);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await getRoles();
      const data = response?.data?.data || response?.data || [];
      setRoles(data);
    } catch (error) {
      console.error("Error loading roles:", error);
    }
  };


  const loadUsers = async () => {
    try {
      // Load all user mappings in a single call
      const response = await getCompanyUserMappings(companyId, { includeAll: true });
      const allMappings = response?.data?.data || response?.data || [];

      // Filter company-level and hotel-level users
      const companyUsers = allMappings.filter(m => m.mapping_type === 0);
      const hotelUsers = allMappings.filter(
        m => m.mapping_type === 1 && m.hospitality_hotel_id === parseInt(hotelId)
      );

      // Combine and deduplicate users
      const combined = [...companyUsers, ...hotelUsers];
      const uniqueUsers = Array.from(
        new Map(combined.map((user) => [user.user_id, user])).values()
      );
      setUsers(uniqueUsers);

      // Load role scopes for all users to enable role-based filtering
      const userIds = uniqueUsers.map(u => u.user_id);
      if (userIds.length) {
        await loadUserRoleScopes(userIds);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadUserRoleScopes = async (userIds) => {
    try {
      const response = await getBatchUserRoleScopes(userIds);
      const grouped = response?.data?.data || response?.data || {};
      const roleScopesMap = {};
      for (const [userId, scopes] of Object.entries(grouped)) {
        roleScopesMap[userId] = (scopes || []).map(s => s.role_id);
      }
      setUserRoleScopes(roleScopesMap);
    } catch (error) {
      console.error("Error loading user role scopes:", error);
    }
  };

  const getUsersByRole = (roleId) => {
    if (!roleId) return [];
    return users.filter(user => {
      const userRoles = userRoleScopes[user.user_id] || [];
      return userRoles.includes(roleId);
    });
  };

  const handleAddStep = () => {
    setPolicyForm({
      ...policyForm,
      steps: [
        ...policyForm.steps,
        {
          step_order: policyForm.steps.length + 1,
          approval_type: "STANDARD",
          decision_rule: "ANY",
          approver_source_type: "ROLE",
          approver_source_id: null,
        },
      ],
    });
  };

  const handleRemoveStep = (index) => {
    const newSteps = policyForm.steps.filter((_, i) => i !== index);
    newSteps.forEach((step, i) => {
      step.step_order = i + 1;
    });
    setPolicyForm({ ...policyForm, steps: newSteps });
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/html'), 10);
    
    if (dragIndex === dropIndex) {
      return;
    }

    const newSteps = [...policyForm.steps];
    const draggedStep = newSteps[dragIndex];
    
    // Remove the dragged item
    newSteps.splice(dragIndex, 1);
    
    // Insert at new position
    newSteps.splice(dropIndex, 0, draggedStep);
    
    // Update step_order for all steps
    newSteps.forEach((step, i) => {
      step.step_order = i + 1;
    });
    
    setPolicyForm({ ...policyForm, steps: newSteps });
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...policyForm.steps];
    const updatedStep = { ...newSteps[index], [field]: value };
    // If changing approver_source_type, reset approver_source_id
    if (field === "approver_source_type") {
      updatedStep.approver_source_id = null;
    }
    newSteps[index] = updatedStep;
    setPolicyForm({ ...policyForm, steps: newSteps });
  };

  const getApproverOptions = (sourceType) => {
    if (sourceType === "USER") {
      return users.map((u) => ({ 
        value: u.user_id, 
        label: `${u.name}${u.email ? ` (${u.email})` : ''}` 
      }));
    } else if (sourceType === "ROLE") {
      return roles.map((r) => ({ value: r.id, label: r.title }));
    }
    return [];
  };

  const getApproverDisplayInfo = (step) => {
    if (step.approver_source_type === "USER") {
      const user = users.find((u) => u.user_id === step.approver_source_id);
      return {
        name: user?.name || "Unknown User",
        email: user?.email || "",
        type: "User",
        typeLabel: "Specific User",
        users: user ? [user] : []
      };
    } else if (step.approver_source_type === "ROLE") {
      const role = roles.find((r) => r.id === step.approver_source_id);
      const roleUsers = getUsersByRole(step.approver_source_id);
      return {
        name: role?.title || "Unknown Role",
        email: "",
        type: "Role",
        typeLabel: "User Role",
        users: roleUsers
      };
    }
    return { name: "Unknown", email: "", type: "", typeLabel: "", users: [] };
  };

  const [pendingImpactModal, setPendingImpactModal] = useState({ open: false, data: null });

  const handleSavePolicy = async (skipPendingCheck = false) => {
    if (!policyForm.entity_type) {
      toast.error("Please select a document type");
      return;
    }

    if (policyForm.steps.length === 0) {
      toast.error("Please add at least one approver");
      return;
    }

    for (let i = 0; i < policyForm.steps.length; i++) {
      const step = policyForm.steps[i];
      if (!step.approver_source_type || !step.approver_source_id) {
        toast.error(`Approval level ${i + 1} is incomplete. Please select an approver.`);
        return;
      }
    }

    // For existing policies, check if there are pending instances before saving
    if (policyForm.id && !skipPendingCheck) {
      try {
        console.log("[PendingImpact] Checking policy", policyForm.id);
        const impactResponse = await getPendingImpact(policyForm.id);
        console.log("[PendingImpact] Raw response:", JSON.stringify(impactResponse));
        const impactData = impactResponse?.data || impactResponse;
        console.log("[PendingImpact] Parsed data:", JSON.stringify(impactData));
        if (impactData?.pending_count > 0) {
          console.log("[PendingImpact] Found pending instances, showing modal");
          setPendingImpactModal({ open: true, data: impactData });
          return; // Wait for user confirmation
        }
        console.log("[PendingImpact] No pending instances, proceeding with save");
      } catch (err) {
        // If check fails, proceed with save (best effort)
        console.warn("[PendingImpact] Could not check pending impact:", err);
      }
    }

    setSaving(true);
    try {
      const payload = {
        id: policyForm.id,
        entity_type: policyForm.entity_type,
        hospitality_company_id: policyForm.hospitality_company_id,
        hotel_id: policyForm.hotel_id,
        department_id: policyForm.department_id,
        is_active: policyForm.is_active,
        steps: policyForm.steps.map((step, index) => ({
          ...step,
          step_order: index + 1,
        })),
      };

      let response;
      if (policyForm.id) {
        response = await updateApprovalPolicy(payload);
        const propagation = response?.propagation || response?.data?.propagation;
        if (propagation?.instances_affected > 0) {
          toast.success(`Workflow updated. ${propagation.instances_affected} pending instance(s) updated.`);
        } else {
          toast.success("Workflow updated successfully");
        }
      } else {
        response = await createApprovalPolicy(payload);
        toast.success("Workflow created successfully");
      }

      setShowPolicyForm(false);
      resetForm();
      // Reload policies to get fresh data with steps
      await loadPolicies();
    } catch (error) {
      console.error("Error saving policy:", error);
      toast.error(error?.message?.response?.data?.message || "Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const handlePendingImpactConfirm = () => {
    setPendingImpactModal({ open: false, data: null });
    handleSavePolicy(true); // Skip the check, proceed with save
  };

  const handleEditPolicy = async (policyId) => {
    try {
      const response = await getApprovalPolicy(policyId);
      const policy = response?.data?.data || response?.data;
      // Generate display name from entity type
      const displayName = `${policy.entity_type} Approval Workflow`;
      setPolicyForm({
        id: policy.id,
        name: displayName,
        entity_type: policy.entity_type,
        hospitality_company_id: policy.hospitality_company_id,
        hotel_id: policy.hotel_id,
        department_id: policy.department_id,
        is_active: policy.is_active,
        steps: policy.steps || [],
      });
      setSelectedPolicy(policy);
      setShowPolicyForm(true);
    } catch (error) {
      console.error("Error loading policy:", error);
      toast.error("Failed to load policy");
    }
  };

  const handleDeletePolicy = async (policyId) => {
    if (!window.confirm("Are you sure you want to delete this approval workflow?")) {
      return;
    }

    try {
      await deleteApprovalPolicy(policyId);
      toast.success("Workflow deleted successfully");
      loadPolicies();
    } catch (error) {
      console.error("Error deleting policy:", error);
      toast.error(error?.message?.response?.data?.message || "Failed to delete workflow");
    }
  };

  const resetForm = () => {
    setPolicyForm({
      id: null,
      name: "",
      entity_type: "RFQ",
      hospitality_company_id: companyId ? parseInt(companyId) : null,
      hotel_id: hotelId ? parseInt(hotelId) : null,
      department_id: null,
      is_active: true,
      steps: [],
    });
    setSelectedPolicy(null);
  };

  const getPolicyDisplayName = (policy) => {
    return `${policy.entity_type} Approval Workflow`;
  };

  const renderHierarchyGraph = (policy) => {
    if (!policy || !policy.steps || policy.steps.length === 0) {
      return (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-diagram-3" style={{ fontSize: "48px" }}></i>
          <p className="mt-3">No approvers configured yet</p>
          <small>Add approvers to see the approval flow</small>
        </div>
      );
    }

    return (
      <div className="hierarchy-graph" style={{ padding: "20px 0", position: "relative" }}>
        <div className="mb-3 text-center">
          <small className="text-muted">Approval Flow</small>
        </div>
        {policy.steps.map((step, index) => {
          const approverInfo = getApproverDisplayInfo(step);
          const isLast = index === policy.steps.length - 1;
          const hasMultipleUsers = approverInfo.users && approverInfo.users.length > 0;

          return (
            <div key={step.id || index} style={{ position: "relative", marginBottom: isLast ? "0" : "30px" }}>
              {/* Approver Card */}
              <div className="d-flex align-items-center justify-content-center">
                <div
                  className="card shadow-sm"
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    borderLeft: "5px solid #158993",
                    borderRadius: "10px",
                    transition: "all 0.2s",
                    backgroundColor: "#ffffff",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "";
                  }}
                >
                  <div className="card-body p-4">
                    <div className="text-center">
                      <div
                        className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
                        style={{
                          width: "50px",
                          height: "50px",
                          backgroundColor: "#158993",
                          color: "white",
                          fontSize: "20px",
                          fontWeight: "bold",
                          boxShadow: "0 2px 8px rgba(21, 137, 147, 0.3)",
                        }}
                      >
                        {step.step_order}
                      </div>
                      <h5 className="mb-2 fw-bold" style={{ color: "#1a1a1a" }}>
                        {approverInfo.name}
                      </h5>
                      {approverInfo.email && (
                        <p className="mb-2 text-muted small">{approverInfo.email}</p>
                      )}
                      
                      {/* Show users when role is selected */}
                      {hasMultipleUsers && (
                        <div className="mt-3 mb-3">
                          <div className="border rounded p-3" style={{ backgroundColor: "#f8f9fa" }}>
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <small className="fw-semibold text-muted">
                                <i className="bi bi-people me-1"></i>
                                {approverInfo.users.length} {approverInfo.users.length === 1 ? 'User' : 'Users'} with this role:
                              </small>
                            </div>
                            <div className="text-start">
                              {approverInfo.users.map((user, idx) => (
                                <div 
                                  key={user.user_id || idx} 
                                  className="d-flex align-items-center mb-2 pb-2 border-bottom"
                                  style={{ borderBottomColor: idx === approverInfo.users.length - 1 ? 'transparent' : '#dee2e6' }}
                                >
                                  <div className="flex-grow-1">
                                    <div className="fw-semibold small">{user.name}</div>
                                    {user.email && (
                                      <div className="text-muted" style={{ fontSize: "11px" }}>
                                        <i className="bi bi-envelope me-1"></i>
                                        {user.email}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!hasMultipleUsers && approverInfo.type === "ROLE" && (
                        <div className="mt-2 mb-2">
                          <small className="text-warning">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            No users found with this role for this business unit
                          </small>
                        </div>
                      )}
                      
                      <div className="d-flex justify-content-center gap-2 flex-wrap mt-3">
                        <span
                          className="badge px-3 py-2"
                          style={{
                            backgroundColor:
                              step.decision_rule === "ALL" ? "#fef3c7" : "#dcfce7",
                            color: step.decision_rule === "ALL" ? "#92400e" : "#166534",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          {step.decision_rule === "ALL" ? "✓ Everyone Must Approve" : "✓ Any One Can Approve"}
                        </span>
                        <span
                          className="badge px-3 py-2"
                          style={{ 
                            backgroundColor: "#e5e7eb",
                            color: "#374151",
                            fontSize: "12px",
                            fontWeight: "500",
                          }}
                        >
                          {approverInfo.typeLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow Connector */}
              {!isLast && (
                <div className="text-center my-4" style={{ position: "relative" }}>
                  <div
                    style={{
                      width: "3px",
                      height: "40px",
                      backgroundColor: "#158993",
                      margin: "0 auto",
                      position: "relative",
                      borderRadius: "2px",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-8px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "0",
                        height: "0",
                        borderLeft: "8px solid transparent",
                        borderRight: "8px solid transparent",
                        borderTop: "12px solid #158993",
                      }}
                    ></div>
                  </div>
                  <div className="mt-2">
                    <small className="text-muted">Then</small>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {policy.steps.length > 0 && (
          <div className="text-center mt-4 pt-3 border-top">
            <small className="text-muted">
              <i className="bi bi-check-circle-fill text-success me-1"></i>
              Approval workflow complete
            </small>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "60vh" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <button
            className="btn btn-link text-decoration-none p-0 mb-2"
            onClick={() => router.back()}
          >
            <i className="bi bi-arrow-left me-2"></i>Back
          </button>
          <h4 className="mb-0">Approval Workflow</h4>
          {hotel && (
            <p className="text-muted mb-0 mt-1">
              {hotel.name} - {[hotel.city, hotel.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        {!showPolicyForm && (
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setShowPolicyForm(true);
            }}
            style={{ backgroundColor: "#158993", borderColor: "#158993" }}
          >
            <i className="bi bi-plus-lg me-2"></i>Create Workflow
          </button>
        )}
      </div>

      {showPolicyForm ? (
        <div className="row">
          {/* Form Section - Left */}
          <div className="col-md-6">
            <div className="card buyer-card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent d-flex justify-content-between align-items-center py-3">
                <h5 className="mb-0 fw-bold">
                  {policyForm.id ? "Edit Approval Workflow" : "Create Approval Workflow"}
                </h5>
                <button
                  type="button"
                  className="btn btn-sm btn-link text-decoration-none p-0"
                  onClick={() => {
                    setShowPolicyForm(false);
                    resetForm();
                  }}
                  style={{ color: "#6c757d" }}
                >
                  <i className="bi bi-x-lg" style={{ fontSize: "20px" }}></i>
                </button>
              </div>
              <div className="card-body" style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
                {/* Info Banner */}
                <div className="alert alert-info d-flex align-items-start gap-2 mb-4" style={{ backgroundColor: "#e7f3ff", borderLeft: "4px solid #0d6efd" }}>
                  <i className="bi bi-info-circle fs-5 mt-1" style={{ color: "#0d6efd" }}></i>
                  <div className="flex-grow-1">
                    <strong>What is an Approval Workflow?</strong>
                    <p className="mb-0 small">
                      An approval workflow defines who needs to approve documents before they can proceed. 
                      You can create multiple approval levels, and each level can require one or all approvers to approve.
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <label className="form-label fw-semibold mb-0">Document Type *</label>
                    <button
                      type="button"
                      className="btn btn-sm btn-link p-0"
                      data-bs-toggle="tooltip"
                      data-bs-placement="right"
                      title="Select the type of document this approval workflow will apply to. For example, if you select 'Tender Approval', this workflow will be used when tenders are submitted for approval."
                      style={{ fontSize: "14px", color: "#0d6efd" }}
                    >
                      <i className="bi bi-question-circle"></i>
                    </button>
                  </div>
                  <Select
                    options={entityTypes}
                    value={entityTypes.find((e) => e.value === policyForm.entity_type)}
                    onChange={(option) =>
                      setPolicyForm({ ...policyForm, entity_type: option.value })
                    }
                    isDisabled={!!policyForm.id}
                    placeholder="Select document type..."
                  />
                  <div className="mt-2 p-2 rounded" style={{ backgroundColor: "#f8f9fa", fontSize: "12px" }}>
                    <strong>Example:</strong> If you select "Tender Approval", all tenders created for this business unit will follow this workflow.
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center gap-2">
                      <label className="form-label mb-0 fw-semibold">Approval Levels *</label>
                      <button
                        type="button"
                        className="btn btn-sm btn-link p-0"
                        data-bs-toggle="tooltip"
                        data-bs-placement="right"
                        title="Approval levels are sequential steps in your workflow. Each level must be completed before moving to the next. You can add multiple levels to create a multi-step approval process."
                        style={{ fontSize: "14px", color: "#0d6efd" }}
                      >
                        <i className="bi bi-question-circle"></i>
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={handleAddStep}
                      style={{ backgroundColor: "#158993", borderColor: "#158993" }}
                    >
                      <i className="bi bi-plus-lg me-1"></i>Add Approval Level
                    </button>
                  </div>
                  
                  {/* Example Box */}
                  <div className="alert alert-light border mb-3" style={{ backgroundColor: "#f8f9fa" }}>
                    <div className="d-flex align-items-start gap-2">
                      <i className="bi bi-lightbulb text-warning fs-5"></i>
                      <div className="flex-grow-1">
                        <strong className="d-block mb-1">How it works:</strong>
                        <ol className="mb-0 small" style={{ paddingLeft: "20px" }}>
                          <li>Level 1: First approver(s) review and approve</li>
                          <li>Level 2: After Level 1 is approved, Level 2 approver(s) review</li>
                          <li>And so on... Documents move forward only when each level is completed</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  {policyForm.steps.length === 0 ? (
                    <div className="text-center py-5 border rounded" style={{ backgroundColor: "#f8f9fa" }}>
                      <i className="bi bi-people text-muted" style={{ fontSize: "32px" }}></i>
                      <p className="mb-1 mt-2 text-muted fw-semibold">No approval levels added yet</p>
                      <small className="text-muted">Click "Add Approval Level" above to start building your approval workflow</small>
                    </div>
                  ) : (
                    <div className="border rounded p-3" style={{ backgroundColor: "#f8f9fa" }}>
                      {policyForm.steps.map((step, index) => {
                        const approverInfo = getApproverDisplayInfo(step);
                        return (
                          <div
                            key={index}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => handleDrop(e, index)}
                            className="mb-3 p-3 border rounded"
                            style={{ 
                              backgroundColor: "#ffffff",
                              cursor: "move",
                              transition: "all 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <div className="d-flex align-items-center gap-2">
                                <div className="d-flex align-items-center gap-2">
                                  <i className="bi bi-grip-vertical text-muted" style={{ fontSize: "18px", cursor: "grab" }}></i>
                                <span
                                  className="badge rounded-circle d-flex align-items-center justify-content-center"
                                  style={{
                                    width: "28px",
                                    height: "28px",
                                    backgroundColor: "#158993",
                                    color: "white",
                                    fontSize: "14px",
                                    fontWeight: "bold",
                                  }}
                                >
                                  {index + 1}
                                </span>
                                </div>
                                <h6 className="mb-0">Approval Level {index + 1}</h6>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleRemoveStep(index)}
                                disabled={policyForm.steps.length === 1}
                                title={policyForm.steps.length === 1 ? "At least one approver is required" : "Remove this approver"}
                                style={{
                                  opacity: policyForm.steps.length === 1 ? 0.5 : 1,
                                  cursor: policyForm.steps.length === 1 ? "not-allowed" : "pointer"
                                }}
                              >
                                <i className="bi bi-trash me-1"></i>
                                Remove
                              </button>
                            </div>

                            <div className="row g-3">
                              <div className="col-md-6">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <label className="form-label small fw-semibold mb-0">Approver Type *</label>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link p-0"
                                    data-bs-toggle="tooltip"
                                    data-bs-placement="right"
                                    title="Choose 'Specific User' to assign a particular person, or 'User Role' to assign anyone with that role (e.g., all Finance Managers)."
                                    style={{ fontSize: "12px", color: "#0d6efd" }}
                                  >
                                    <i className="bi bi-question-circle"></i>
                                  </button>
                                </div>
                                <Select
                                  key={`approver-type-${index}-${step.approver_source_type}`}
                                  options={approverSourceTypes}
                                  value={approverSourceTypes.find(
                                    (t) => t.value === step.approver_source_type
                                  ) || null}
                                  onChange={(option) => {
                                    if (option) {
                                      handleStepChange(index, "approver_source_type", option.value);
                                    }
                                  }}
                                  placeholder="Select approver type..."
                                  isClearable={false}
                                  isSearchable={false}
                                  menuPlacement="auto"
                                />
                                {!step.approver_source_type && (
                                  <small className="text-muted d-block mt-1">
                                    <strong>Example:</strong> Select "User Role" if you want any Finance Manager to approve, or "Specific User" for a particular person.
                                  </small>
                                )}
                              </div>

                              <div className="col-md-6">
                                <label className="form-label small fw-semibold">
                                  {step.approver_source_type === "USER" 
                                    ? "Select User *" 
                                    : step.approver_source_type === "ROLE"
                                    ? "Select Role *"
                                    : "Select Approver *"}
                                </label>
                                <Select
                                  key={`approver-${index}-${step.approver_source_type}-${step.approver_source_id || 'none'}`}
                                  options={getApproverOptions(step.approver_source_type)}
                                  value={
                                    step.approver_source_id
                                      ? getApproverOptions(step.approver_source_type).find(
                                          (o) => o.value === step.approver_source_id
                                        ) || null
                                      : null
                                  }
                                  onChange={(option) =>
                                    handleStepChange(index, "approver_source_id", option ? option.value : null)
                                  }
                                  isDisabled={!step.approver_source_type}
                                  placeholder={step.approver_source_type === "USER" 
                                    ? "Select user..." 
                                    : step.approver_source_type === "ROLE"
                                    ? "Select role..."
                                    : "Select approver type first..."}
                                  isClearable={false}
                                  menuPlacement="auto"
                                />
                                {step.approver_source_id && approverInfo.email && (
                                  <small className="text-muted d-block mt-1">
                                    <i className="bi bi-envelope me-1"></i>
                                    {approverInfo.email}
                                  </small>
                                )}
                              </div>

                              <div className="col-md-12">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <label className="form-label small fw-semibold mb-0">Approval Requirement *</label>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-link p-0"
                                    data-bs-toggle="tooltip"
                                    data-bs-placement="right"
                                    title="'Any one person' means only one approver needs to approve. 'Everyone must approve' means all selected approvers must approve before moving to the next level."
                                    style={{ fontSize: "12px", color: "#0d6efd" }}
                                  >
                                    <i className="bi bi-question-circle"></i>
                                  </button>
                                </div>
                                <Select
                                  options={decisionRules}
                                  value={decisionRules.find((r) => r.value === step.decision_rule)}
                                  onChange={(option) =>
                                    handleStepChange(index, "decision_rule", option.value)
                                  }
                                  placeholder="Select requirement..."
                                />
                                <div className="mt-2 p-2 rounded" style={{ backgroundColor: step.decision_rule === "ALL" ? "#fff3cd" : "#d1e7dd", fontSize: "12px" }}>
                                  {step.decision_rule === "ALL" ? (
                                    <>
                                      <strong>✓ All must approve:</strong> All selected approvers need to approve. 
                                      <br />
                                      <em>Example: If you select 3 Finance Managers, all 3 must approve.</em>
                                    </>
                                  ) : step.decision_rule === "ANY" ? (
                                    <>
                                      <strong>✓ Any one can approve:</strong> Only one of the selected approvers needs to approve.
                                      <br />
                                      <em>Example: If you select 3 Finance Managers, any one of them can approve.</em>
                                    </>
                                  ) : (
                                    <span className="text-muted">Select an approval requirement to see examples</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <div className="card-footer bg-transparent d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPolicyForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSavePolicy()}
                  disabled={saving}
                  style={{ backgroundColor: "#158993", borderColor: "#158993" }}
                >
                  {saving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      ></span>
                      Saving...
                    </>
                  ) : (
                    "Save Workflow"
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Preview Section - Right */}
          <div className="col-md-6">
            <div className="card buyer-card border-0 shadow-sm h-100">
              <div className="card-header bg-transparent py-3">
                <h5 className="mb-0 fw-bold">Preview</h5>
              </div>
              <div className="card-body" style={{ maxHeight: "calc(100vh - 300px)", overflowY: "auto" }}>
                <div className="mb-3 pb-3 border-bottom">
                  <h6 className="fw-bold mb-1">{policyForm.entity_type} Approval Workflow</h6>
                  <small className="text-muted">Live preview of your approval flow</small>
                </div>
                {renderHierarchyGraph({
                  ...policyForm,
                  steps: policyForm.steps || []
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {policies.length === 0 ? (
            <div className="card buyer-card border-0 shadow-sm">
              <div className="card-body text-center py-5">
                <i className="bi bi-diagram-3 text-muted" style={{ fontSize: "64px" }}></i>
                <h5 className="mt-3 mb-2">No Approval Workflows</h5>
                <p className="text-muted mb-4">
                  Create an approval workflow to define who needs to approve documents for this business unit
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    resetForm();
                    setShowPolicyForm(true);
                  }}
                  style={{ backgroundColor: "#158993", borderColor: "#158993" }}
                >
                  <i className="bi bi-plus-lg me-2"></i>Create First Workflow
                </button>
              </div>
            </div>
          ) : (
            <div className="row">
              {policies.map((policy) => (
                <div key={policy.id} className="col-md-6 mb-4">
                  <div className="card buyer-card border-0 shadow-sm h-100">
                    <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-0 fw-bold">
                          {getPolicyDisplayName(policy)}
                        </h6>
                        <small className="text-muted">
                          {policy.steps?.length || 0} approval level{policy.steps?.length !== 1 ? 's' : ''}
                        </small>
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => handleEditPolicy(policy.id)}
                        >
                          <i className="bi bi-pencil me-1"></i>
                          Edit
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleDeletePolicy(policy.id)}
                        >
                          <i className="bi bi-trash me-1"></i>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="card-body">
                      {renderHierarchyGraph(policy)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pending Impact Confirmation Modal */}
      {pendingImpactModal.open && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div className="modal-content" style={{ borderRadius: 12 }}>
              <div className="modal-header" style={{ borderBottom: "1px solid #e9ecef", backgroundColor: "#FEF3C7" }}>
                <h6 className="modal-title fw-bold" style={{ color: "#92400E" }}>
                  Warning — Pending Approvals Will Be Affected
                </h6>
                <button type="button" className="btn-close" onClick={() => setPendingImpactModal({ open: false, data: null })}></button>
              </div>
              <div className="modal-body" style={{ fontSize: 14 }}>
                <p className="mb-2">
                  This policy has <strong>{pendingImpactModal.data?.pending_count || 0}</strong> pending approval instance(s).
                  Saving these changes will propagate to all pending instances. Affected approvers will be notified by email.
                </p>
                {pendingImpactModal.data?.instances?.length > 0 && (
                  <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #e9ecef", borderRadius: 8, padding: 8, marginTop: 8 }}>
                    {pendingImpactModal.data.instances.map((inst, idx) => (
                      <div key={idx} style={{ padding: "6px 8px", borderBottom: idx < pendingImpactModal.data.instances.length - 1 ? "1px solid #f1f5f9" : "none", fontSize: 13 }}>
                        <strong>{inst.entity_type}</strong> — {inst.entity_identifier || `ID-${inst.entity_id}`}
                        <span style={{ color: "#6c757d", marginLeft: 8 }}>Step {inst.current_step}/{inst.total_steps}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ borderTop: "1px solid #e9ecef" }}>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => setPendingImpactModal({ open: false, data: null })}>
                  Cancel
                </button>
                <button className="btn btn-warning btn-sm" onClick={handlePendingImpactConfirm} disabled={saving}>
                  {saving ? "Saving..." : "Save & Propagate"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ApprovalHierarchyPage;

