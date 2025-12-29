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
import { getRoles } from "@/services/rbac";
import { getDepartments } from "@/services/rbac";
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
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
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
    { value: "RFQ", label: "RFQ" },
    { value: "TENDER", label: "TENDER" },
    { value: "PO", label: "Purchase Order" },
    { value: "INDENT", label: "Indent" },
  ];

  const approverSourceTypes = [
    { value: "USER", label: "User" },
    { value: "ROLE", label: "Role" },
    { value: "DEPARTMENT", label: "Department" },
  ];

  const decisionRules = [
    { value: "ANY", label: "Any (One approval sufficient)" },
    { value: "ALL", label: "All (All must approve)" },
  ];

  useEffect(() => {
    if (companyId && hotelId) {
      loadData();
    }
  }, [companyId, hotelId]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadHotel(),
        loadPolicies(),
        loadRoles(),
        loadDepartments(),
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

  const loadDepartments = async () => {
    try {
      const response = await getDepartments();
      const data = response?.data?.data || response?.data || [];
      setDepartments(data);
    } catch (error) {
      console.error("Error loading departments:", error);
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
    } catch (error) {
      console.error("Error loading users:", error);
    }
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
    newSteps[index] = { ...newSteps[index], [field]: value };
    setPolicyForm({ ...policyForm, steps: newSteps });
  };

  const getApproverOptions = (sourceType) => {
    if (sourceType === "USER") {
      return users.map((u) => ({ value: u.user_id, label: `${u.name} (${u.email})` }));
    } else if (sourceType === "ROLE") {
      return roles.map((r) => ({ value: r.id, label: r.title }));
    } else if (sourceType === "DEPARTMENT") {
      return departments.map((d) => ({ value: d.id, label: d.title }));
    }
    return [];
  };

  const handleSavePolicy = async () => {
    if (!policyForm.name || policyForm.name.trim() === "") {
      toast.error("Please enter a policy name");
      return;
    }

    if (!policyForm.entity_type) {
      toast.error("Please select an entity type");
      return;
    }

    if (policyForm.steps.length === 0) {
      toast.error("Please add at least one approval step");
      return;
    }

    for (let i = 0; i < policyForm.steps.length; i++) {
      const step = policyForm.steps[i];
      if (!step.approver_source_type || !step.approver_source_id) {
        toast.error(`Step ${i + 1} is incomplete. Please select an approver.`);
        return;
      }
    }

    setSaving(true);
    try {
      // Remove name from payload as backend doesn't support it
      const { name, ...payloadWithoutName } = policyForm;
      const payload = {
        ...payloadWithoutName,
        steps: policyForm.steps.map((step, index) => ({
          ...step,
          step_order: index + 1,
        })),
      };

      let response;
      if (policyForm.id) {
        response = await updateApprovalPolicy(payload);
        toast.success("Policy updated successfully");
      } else {
        response = await createApprovalPolicy(payload);
        toast.success("Policy created successfully");
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
      // Generate display name from entity type and department
      const displayName = policy.department_id
        ? `${policy.entity_type} Approval Policy - ${departments.find((d) => d.id === policy.department_id)?.title || 'Department'}`
        : `${policy.entity_type} Approval Policy`;
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
    if (!window.confirm("Are you sure you want to delete this policy?")) {
      return;
    }

    try {
      await deleteApprovalPolicy(policyId);
      toast.success("Policy deleted successfully");
      loadPolicies();
    } catch (error) {
      console.error("Error deleting policy:", error);
      toast.error(error?.message?.response?.data?.message || "Failed to delete policy");
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

  const renderHierarchyGraph = (policy) => {
    if (!policy || !policy.steps || policy.steps.length === 0) {
      return (
        <div className="text-center py-5 text-muted">
          <i className="bi bi-diagram-3" style={{ fontSize: "48px" }}></i>
          <p className="mt-3">No approval steps configured</p>
        </div>
      );
    }

    return (
      <div className="hierarchy-graph" style={{ padding: "20px 0", position: "relative" }}>
        {policy.steps.map((step, index) => {
          const approverName =
            step.approver_source_type === "USER"
              ? users.find((u) => u.user_id === step.approver_source_id)?.name || "Unknown User"
              : step.approver_source_type === "ROLE"
              ? roles.find((r) => r.id === step.approver_source_id)?.title || "Unknown Role"
              : departments.find((d) => d.id === step.approver_source_id)?.title || "Unknown Department";

          const isLast = index === policy.steps.length - 1;

          return (
            <div key={step.id || index} style={{ position: "relative", marginBottom: isLast ? "0" : "20px" }}>
              {/* Step Card */}
              <div className="d-flex align-items-center justify-content-center">
                <div
                  className="card shadow-sm"
                  style={{
                    width: "100%",
                    maxWidth: "400px",
                    borderLeft: "4px solid #158993",
                    borderRadius: "8px",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <div className="card-body">
                    <div className="text-center">
                      <div
                        className="rounded-circle d-inline-flex align-items-center justify-content-center mb-2"
                        style={{
                          width: "40px",
                          height: "40px",
                          backgroundColor: "#158993",
                          color: "white",
                          fontSize: "18px",
                          fontWeight: "bold",
                        }}
                      >
                        {step.step_order}
                      </div>
                      <h6 className="mb-2 fw-bold">{approverName}</h6>
                      <div className="d-flex justify-content-center gap-2 flex-wrap">
                        <span
                          className="badge"
                          style={{
                            backgroundColor:
                              step.decision_rule === "ALL" ? "#fef3c7" : "#dcfce7",
                            color: step.decision_rule === "ALL" ? "#92400e" : "#166534",
                            fontSize: "11px",
                          }}
                        >
                          {step.decision_rule === "ALL" ? "All Must Approve" : "Any Can Approve"}
                        </span>
                        <span
                          className="badge bg-secondary"
                          style={{ fontSize: "11px" }}
                        >
                          {step.approver_source_type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Arrow Connector */}
              {!isLast && (
                <div className="text-center my-3" style={{ position: "relative" }}>
                  <div
                    style={{
                      width: "2px",
                      height: "30px",
                      backgroundColor: "#158993",
                      margin: "0 auto",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        bottom: "-6px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "0",
                        height: "0",
                        borderLeft: "6px solid transparent",
                        borderRight: "6px solid transparent",
                        borderTop: "8px solid #158993",
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
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
          <h4 className="mb-0">Approval Hierarchy</h4>
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
            <i className="bi bi-plus-lg me-2"></i>Create Policy
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
                  {policyForm.id ? "Edit Approval Policy" : "Create Approval Policy"}
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
                <div className="mb-3">
                  <label className="form-label">Policy Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g., RFQ Approval Policy"
                    value={policyForm.name || ""}
                    onChange={(e) =>
                      setPolicyForm({ ...policyForm, name: e.target.value })
                    }
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Entity Type *</label>
                  <Select
                    options={entityTypes}
                    value={entityTypes.find((e) => e.value === policyForm.entity_type)}
                    onChange={(option) =>
                      setPolicyForm({ ...policyForm, entity_type: option.value })
                    }
                    isDisabled={!!policyForm.id}
                  />
                </div>

                {policyForm.department_id !== undefined && (
                  <div className="mb-3">
                    <label className="form-label">Department (Optional)</label>
                    <Select
                      options={[
                        { value: null, label: "All Departments" },
                        ...departments.map((d) => ({ value: d.id, label: d.title })),
                      ]}
                      value={
                        policyForm.department_id
                          ? {
                              value: policyForm.department_id,
                              label:
                                departments.find((d) => d.id === policyForm.department_id)?.title ||
                                "Unknown",
                            }
                          : { value: null, label: "All Departments" }
                      }
                      onChange={(option) =>
                        setPolicyForm({ ...policyForm, department_id: option.value })
                      }
                    />
                  </div>
                )}

                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <label className="form-label mb-0">Approval Steps *</label>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={handleAddStep}
                    >
                      <i className="bi bi-plus-lg me-1"></i>Add Step
                    </button>
                  </div>

                  {policyForm.steps.length === 0 ? (
                    <div className="text-center py-4 border rounded text-muted">
                      <p className="mb-0">No steps added yet</p>
                      <small>Click "Add Step" to create the approval workflow</small>
                    </div>
                  ) : (
                    <div className="border rounded p-3">
                      {policyForm.steps.map((step, index) => (
                        <div
                          key={index}
                          className="mb-3 p-3 border rounded"
                          style={{ backgroundColor: "#f9fafb" }}
                        >
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h6 className="mb-0">Step {index + 1}</h6>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleRemoveStep(index)}
                              disabled={policyForm.steps.length === 1}
                              title={policyForm.steps.length === 1 ? "At least one step is required" : "Remove this step"}
                              style={{
                                opacity: policyForm.steps.length === 1 ? 0.5 : 1,
                                cursor: policyForm.steps.length === 1 ? "not-allowed" : "pointer"
                              }}
                            >
                              <i className="bi bi-trash me-1"></i>
                              Remove
                            </button>
                          </div>

                          <div className="row">
                            <div className="col-md-6 mb-2">
                              <label className="form-label small">Approver Type *</label>
                              <Select
                                options={approverSourceTypes}
                                value={approverSourceTypes.find(
                                  (t) => t.value === step.approver_source_type
                                )}
                                onChange={(option) =>
                                  handleStepChange(index, "approver_source_type", option.value)
                                }
                              />
                            </div>

                            <div className="col-md-6 mb-2">
                              <label className="form-label small">Approver *</label>
                              <Select
                                options={getApproverOptions(step.approver_source_type)}
                                value={
                                  step.approver_source_id
                                    ? getApproverOptions(step.approver_source_type).find(
                                        (o) => o.value === step.approver_source_id
                                      )
                                    : null
                                }
                                onChange={(option) =>
                                  handleStepChange(index, "approver_source_id", option.value)
                                }
                                isDisabled={!step.approver_source_type}
                              />
                            </div>

                            <div className="col-md-12 mb-2">
                              <label className="form-label small">Decision Rule *</label>
                              <Select
                                options={decisionRules}
                                value={decisionRules.find((r) => r.value === step.decision_rule)}
                                onChange={(option) =>
                                  handleStepChange(index, "decision_rule", option.value)
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
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
                    "Save Policy"
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
                {policyForm.name && (
                  <div className="mb-3">
                    <h6 className="fw-bold">{policyForm.name}</h6>
                    {policyForm.department_id && (
                      <small className="text-muted">
                        Department: {departments.find((d) => d.id === policyForm.department_id)?.title}
                      </small>
                    )}
                  </div>
                )}
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
                <h5 className="mt-3 mb-2">No Approval Policies</h5>
                <p className="text-muted mb-4">
                  Create an approval policy to define the workflow for this business unit
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    resetForm();
                    setShowPolicyForm(true);
                  }}
                  style={{ backgroundColor: "#158993", borderColor: "#158993" }}
                >
                  <i className="bi bi-plus-lg me-2"></i>Create First Policy
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
                          {policy.department_id
                            ? `${policy.entity_type} Approval Policy - ${departments.find((d) => d.id === policy.department_id)?.title || 'Department'}`
                            : `${policy.entity_type} Approval Policy`}
                        </h6>
                        {policy.department_id && (
                          <small className="text-muted">
                            Department: {departments.find((d) => d.id === policy.department_id)?.title}
                          </small>
                        )}
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

