import React, { useState, useCallback } from "react";
import { toast } from "react-toastify";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { createApprovalPolicy, updateApprovalPolicy } from "@/services/approval";
import WizardStepper from "./WizardStepper";
import StepSelectEntityType from "./StepSelectEntityType";
import StepSelectDepartment from "./StepSelectDepartment";
import StepSelectProcess from "./StepSelectProcess";
import StepConfigureApprovals from "./StepConfigureApprovals";
import StepReviewSave from "./StepReviewSave";
import { BRAND_TEAL } from "../constants";

const TOTAL_STEPS = 5;

const WorkflowWizard = ({
  editingPolicy,
  processes,
  departments,
  hotel,
  companyId,
  hotelId,
  getApproverOptions,
  getApproverDisplayInfo,
  onCreateProcess,
  onSave,
  onCancel,
}) => {
  const isEditing = !!editingPolicy;

  const [currentStep, setCurrentStep] = useState(isEditing ? 4 : 1);
  const [saving, setSaving] = useState(false);

  const [wizardForm, setWizardForm] = useState(() => {
    if (editingPolicy) {
      return {
        id: editingPolicy.id,
        entity_type: editingPolicy.entity_type,
        process_id: editingPolicy.process_id || null,
        hospitality_company_id: parseInt(companyId),
        hotel_id: parseInt(hotelId),
        department_id: editingPolicy.department_id || null,
        is_active: editingPolicy.is_active !== false,
        steps: editingPolicy.steps || [],
      };
    }
    return {
      id: null,
      entity_type: null,
      process_id: null,
      hospitality_company_id: parseInt(companyId),
      hotel_id: parseInt(hotelId),
      department_id: null,
      is_active: true,
      steps: [],
    };
  });

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!wizardForm.entity_type) {
          toast.error("Please select a document type");
          return false;
        }
        return true;
      case 2:
        // Department is optional, always valid
        return true;
      case 3:
        // Process is optional, always valid
        return true;
      case 4:
        if (wizardForm.steps.length === 0) {
          toast.error("Please add at least one approval level");
          return false;
        }
        for (let i = 0; i < wizardForm.steps.length; i++) {
          const s = wizardForm.steps[i];
          if (!s.approver_source_type || !s.approver_source_id) {
            toast.error(`Level ${i + 1} is incomplete. Please select an approver.`);
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!validateStep(4)) return;

    setSaving(true);
    try {
      const payload = {
        ...(wizardForm.id ? { id: wizardForm.id } : {}),
        entity_type: wizardForm.entity_type,
        hospitality_company_id: wizardForm.hospitality_company_id,
        hotel_id: wizardForm.hotel_id,
        process_id: wizardForm.process_id || null,
        department_id: wizardForm.department_id,
        is_active: wizardForm.is_active,
        steps: wizardForm.steps.map((step, index) => ({
          ...step,
          step_order: index + 1,
        })),
      };

      if (wizardForm.id) {
        await updateApprovalPolicy(payload);
        toast.success("Workflow updated successfully");
      } else {
        await createApprovalPolicy(payload);
        toast.success("Workflow created successfully");
      }

      onSave();
    } catch (error) {
      console.error("Error saving policy:", error);
      toast.error(error?.message?.response?.data?.message || "Failed to save workflow");
    } finally {
      setSaving(false);
    }
  };

  // Step form handlers
  const handleAddStep = () => {
    setWizardForm({
      ...wizardForm,
      steps: [
        ...wizardForm.steps,
        {
          step_order: wizardForm.steps.length + 1,
          approval_type: "STANDARD",
          decision_rule: "ANY",
          approver_source_type: "ROLE",
          approver_source_id: null,
        },
      ],
    });
  };

  const handleRemoveStep = (index) => {
    const newSteps = wizardForm.steps.filter((_, i) => i !== index);
    newSteps.forEach((s, i) => { s.step_order = i + 1; });
    setWizardForm({ ...wizardForm, steps: newSteps });
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...wizardForm.steps];
    const updated = { ...newSteps[index], [field]: value };
    if (field === "approver_source_type") {
      updated.approver_source_id = null;
    }
    newSteps[index] = updated;
    setWizardForm({ ...wizardForm, steps: newSteps });
  };

  const handleDragStart = useCallback((e, index) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/html", index);
    e.currentTarget.style.opacity = "0.5";
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = "1";
  }, []);

  const handleDrop = useCallback(
    (e, dropIndex) => {
      e.preventDefault();
      const dragIndex = parseInt(e.dataTransfer.getData("text/html"), 10);
      if (dragIndex === dropIndex) return;

      const newSteps = [...wizardForm.steps];
      const dragged = newSteps[dragIndex];
      newSteps.splice(dragIndex, 1);
      newSteps.splice(dropIndex, 0, dragged);
      newSteps.forEach((s, i) => { s.step_order = i + 1; });
      setWizardForm({ ...wizardForm, steps: newSteps });
    },
    [wizardForm]
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepSelectEntityType
            selectedEntityType={wizardForm.entity_type}
            onChange={(val) => setWizardForm({ ...wizardForm, entity_type: val })}
            isEditing={isEditing}
          />
        );
      case 2:
        return (
          <StepSelectDepartment
            selectedDepartmentId={wizardForm.department_id}
            departments={departments}
            onChange={(val) => setWizardForm({ ...wizardForm, department_id: val })}
          />
        );
      case 3:
        return (
          <StepSelectProcess
            selectedProcessId={wizardForm.process_id}
            processes={processes}
            onChange={(val) => setWizardForm({ ...wizardForm, process_id: val })}
            onCreateProcess={onCreateProcess}
          />
        );
      case 4:
        return (
          <StepConfigureApprovals
            steps={wizardForm.steps}
            selectedDepartmentId={wizardForm.department_id}
            departments={departments}
            onAddStep={handleAddStep}
            onRemoveStep={handleRemoveStep}
            onStepChange={handleStepChange}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDrop={handleDrop}
            getApproverOptions={getApproverOptions}
            getApproverDisplayInfo={getApproverDisplayInfo}
          />
        );
      case 5:
        return (
          <StepReviewSave
            wizardForm={wizardForm}
            processes={processes}
            departments={departments}
            hotel={hotel}
            getApproverDisplayInfo={getApproverDisplayInfo}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <style jsx>{`
        .wizard-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 28px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>

      <WizardStepper currentStep={currentStep} />

      <div
        className="card border-0 shadow-sm"
        style={{ borderRadius: "12px" }}
      >
        <div className="card-body" style={{ padding: "28px" }}>
          {renderStep()}

          <div className="wizard-footer">
            <div>
              {currentStep > 1 && (!isEditing || currentStep > 4) && (
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center gap-1"
                  onClick={handleBack}
                  style={{ borderRadius: "8px", fontSize: "13px", padding: "8px 18px" }}
                >
                  <BsArrowLeft size={14} /> Back
                </button>
              )}
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                style={{ borderRadius: "8px", fontSize: "13px", padding: "8px 18px" }}
              >
                Cancel
              </button>
              {currentStep < TOTAL_STEPS ? (
                <button
                  type="button"
                  className="btn d-flex align-items-center gap-1"
                  onClick={handleNext}
                  style={{
                    backgroundColor: BRAND_TEAL,
                    borderColor: BRAND_TEAL,
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 500,
                    padding: "8px 18px",
                  }}
                >
                  Next <BsArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    backgroundColor: BRAND_TEAL,
                    borderColor: BRAND_TEAL,
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 500,
                    padding: "8px 24px",
                    opacity: saving ? 0.7 : 1,
                  }}
                >
                  {saving ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Saving...
                    </>
                  ) : (
                    "Save Workflow"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowWizard;
