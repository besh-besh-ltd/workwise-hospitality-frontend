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
} from "@/services/approval";
import { getRoles, getUserRoleScopes } from "@/services/rbac";
import { getCompanyUserMappings } from "@/services/hospitality";
import { getHospitalityHotels } from "@/services/hospitality";

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
    { value: "NEGOTIATION_ROUND", label: "Negotiation Rounds Approval" },
    { value: "TECHNICAL", label: "Technical Approval" },
    { value: "ARC COMMITTEE", label: "ARC Committee Approval" },
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
      console.error("Error loading hotel:", error);
    }
  };

  const loadPolicies = async () => {
    try {
      const response = await getApprovalPolicies({
        hospitality_company_id: companyId,
        hotel_id: hotelId,
      });
      const policiesList = response?.data?.data || response?.data || [];
      
      // Fetch full details (with steps) for each policy
      const policiesWithSteps = await Promise.all(
        policiesList.map(async (policy) => {
          try {
            const policyResponse = await getApprovalPolicy(policy.id);
            const fullPolicy = policyResponse?.data?.data || policyResponse?.data || policy;
            return fullPolicy;
          } catch (error) {
            console.error(`Error loading steps for policy ${policy.id}:`, error);
            // Return policy without steps if fetch fails
            return { ...policy, steps: [] };
          }
        })
      );
      
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
      // Load both company-level (mapping_type = 0) and hotel-level (mapping_type = 1) users
      const [companyResponse, hotelResponse] = await Promise.all([
        getCompanyUserMappings(companyId, { mappingType: 0 }),
        getCompanyUserMappings(companyId, {
          mappingType: 1,
          hotelId: parseInt(hotelId),
        }),
      ]);
      
      const companyUsers = companyResponse?.data?.data || companyResponse?.data || [];
      const hotelUsers = hotelResponse?.data?.data || hotelResponse?.data || [];
      
      // Combine and deduplicate users
      const allUsers = [...companyUsers, ...hotelUsers];
      const uniqueUsers = Array.from(
        new Map(allUsers.map((user) => [user.user_id, user])).values()
      );
      setUsers(uniqueUsers);
      
      // Load role scopes for all users to enable role-based filtering
      await loadUserRoleScopes(uniqueUsers.map(u => u.user_id));
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const loadUserRoleScopes = async (userIds) => {
    try {
      const roleScopesPromises = userIds.map(async (userId) => {
        try {
          const response = await getUserRoleScopes(userId);
          const scopes = response?.data?.data || response?.data || [];
          return { userId, roleIds: scopes.map(s => s.role_id) };
        } catch (error) {
          console.error(`Error loading role scopes for user ${userId}:`, error);
          return { userId, roleIds: [] };
        }
      });
      
      const results = await Promise.all(roleScopesPromises);
      const roleScopesMap = {};
      results.forEach(({ userId, roleIds }) => {
        roleScopesMap[userId] = roleIds;
      });
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

  const handleSavePolicy = async () => {
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
        toast.success("Workflow updated successfully");
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
                            No users found with this role for this hotel
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
                <div className="mb-4">
                  <label className="form-label fw-semibold">Document Type *</label>
                  <Select
                    options={entityTypes}
                    value={entityTypes.find((e) => e.value === policyForm.entity_type)}
                    onChange={(option) =>
                      setPolicyForm({ ...policyForm, entity_type: option.value })
                    }
                    isDisabled={!!policyForm.id}
                    placeholder="Select document type..."
                  />
                  <small className="text-muted">Choose what type of documents this workflow applies to</small>
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <label className="form-label mb-0 fw-semibold">Approvers *</label>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={handleAddStep}
                      style={{ backgroundColor: "#158993", borderColor: "#158993" }}
                    >
                      <i className="bi bi-plus-lg me-1"></i>Add Approver
                    </button>
                  </div>

                  {policyForm.steps.length === 0 ? (
                    <div className="text-center py-5 border rounded" style={{ backgroundColor: "#f8f9fa" }}>
                      <i className="bi bi-people text-muted" style={{ fontSize: "32px" }}></i>
                      <p className="mb-1 mt-2 text-muted">No approvers added yet</p>
                      <small className="text-muted">Click "Add Approver" to start building your approval flow</small>
                    </div>
                  ) : (
                    <div className="border rounded p-3" style={{ backgroundColor: "#f8f9fa" }}>
                      {policyForm.steps.map((step, index) => {
                        const approverInfo = getApproverDisplayInfo(step);
                        return (
                          <div
                            key={index}
                            className="mb-3 p-3 border rounded"
                            style={{ backgroundColor: "#ffffff" }}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <div className="d-flex align-items-center gap-2">
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
                                <label className="form-label small fw-semibold">Who approves? *</label>
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
                              </div>

                              <div className="col-md-6">
                                <label className="form-label small fw-semibold">
                                  {step.approver_source_type === "USER" 
                                    ? "Select User *" 
                                    : step.approver_source_type === "ROLE"
                                    ? "Select Role *"
                                    : "Select *"}
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
                                    : "Select..."}
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
                                <label className="form-label small fw-semibold">Approval Requirement *</label>
                                <Select
                                  options={decisionRules}
                                  value={decisionRules.find((r) => r.value === step.decision_rule)}
                                  onChange={(option) =>
                                    handleStepChange(index, "decision_rule", option.value)
                                  }
                                  placeholder="Select requirement..."
                                />
                                <small className="text-muted d-block mt-1">
                                  {step.decision_rule === "ALL" 
                                    ? "All selected approvers must approve to proceed" 
                                    : "Any one of the selected approvers can approve to proceed"}
                                </small>
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
                  onClick={handleSavePolicy}
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
                  Create an approval workflow to define who needs to approve documents for this hotel
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

    </div>
  );
};

export default ApprovalHierarchyPage;

