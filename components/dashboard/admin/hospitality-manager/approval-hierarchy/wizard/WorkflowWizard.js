import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { createApprovalPolicy, updateApprovalPolicy } from "@/services/approval";
import WizardStepper from "./WizardStepper";
import StepSelectProcessOnly from "./StepSelectProcessOnly";
import StepConfigureStages from "./StepConfigureStages";
import StepReviewSave from "./StepReviewSave";
import { BRAND_TEAL, getStagesForProcessType, getStageEntityOrder } from "../constants";

const TOTAL_STEPS = 3;

const buildStagesFromPolicies = (policies, processType) => {
  const order = getStageEntityOrder(processType);
  return order.map((entity_type) => {
    const policy = (policies || []).find((p) => p.entity_type === entity_type);
    return {
      entity_type,
      steps: (policy?.steps || []).map((s, i) => ({
        ...s,
        step_order: i + 1,
      })),
    };
  });
};

const WorkflowWizard = ({
  editingProcess,
  editingPolicies,
  processes,
  hotel,
  companyId,
  hotelId,
  getApproverOptions,
  getApproverDisplayInfo,
  onCreateProcess,
  onSave,
  onCancel,
}) => {
  const isEditing = !!editingProcess;

  const initialStages = useMemo(() => {
    if (isEditing && editingPolicies?.length && editingProcess?.process_type != null) {
      return buildStagesFromPolicies(editingPolicies, editingProcess.process_type);
    }
    return getStagesForProcessType("RFQ").map((s) => ({ entity_type: s.value, steps: [] }));
  }, [isEditing, editingPolicies, editingProcess?.process_type]);

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [wizardForm, setWizardForm] = useState(() => ({
    process_id: isEditing ? editingProcess?.id : null,
    stages: initialStages,
  }));

  const selectedProcess = processes?.find((p) => p.id === wizardForm.process_id);
  const stageConfig = getStagesForProcessType(selectedProcess?.process_type);

  // Sync form when editing data loads
  React.useEffect(() => {
    if (isEditing && editingProcess && editingPolicies?.length) {
      setWizardForm({
        process_id: editingProcess.id,
        stages: buildStagesFromPolicies(editingPolicies, editingProcess.process_type),
      });
    }
  }, [isEditing, editingProcess?.id, editingPolicies?.length]);

  // When process selection changes (create flow), reset stages to the correct 5 for that process type
  React.useEffect(() => {
    if (isEditing || !wizardForm.process_id) return;
    const process = processes?.find((p) => p.id === wizardForm.process_id);
    const order = getStageEntityOrder(process?.process_type);
    const currentOrder = (wizardForm.stages || []).map((s) => s.entity_type).join(",");
    const expectedOrder = order.join(",");
    if (currentOrder !== expectedOrder) {
      setWizardForm((prev) => ({
        ...prev,
        stages: getStagesForProcessType(process?.process_type).map((s) => ({
          entity_type: s.value,
          steps: [],
        })),
      }));
    }
  }, [wizardForm.process_id, isEditing, processes]);

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!wizardForm.process_id) {
          toast.error("Please select a process");
          return false;
        }
        return true;
      case 2: {
        const hasAnyStep = wizardForm.stages?.some((s) => (s.steps?.length || 0) > 0);
        if (!hasAnyStep) {
          toast.error("Add at least one approval level in any stage");
          return false;
        }
        for (let si = 0; si < (wizardForm.stages || []).length; si++) {
          const stage = wizardForm.stages[si];
          for (let i = 0; i < (stage.steps || []).length; i++) {
            const s = stage.steps[i];
            if (!s.approver_source_type || !s.approver_source_id) {
              const stageLabel = stageConfig[si]?.label || `Stage ${si + 1}`;
              toast.error(
                `${stageLabel}: Level ${i + 1} is incomplete. Select an approver.`
              );
              return false;
            }
          }
        }
        return true;
      }
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === 1 && wizardForm.process_id && !isEditing) {
      const process = processes?.find((p) => p.id === wizardForm.process_id);
      const order = getStageEntityOrder(process?.process_type);
      const currentOrder = (wizardForm.stages || []).map((s) => s.entity_type).join(",");
      if (currentOrder !== order.join(",")) {
        setWizardForm((prev) => ({
          ...prev,
          stages: getStagesForProcessType(process?.process_type).map((s) => ({
            entity_type: s.value,
            steps: [],
          })),
        }));
      }
    }
    if (currentStep < TOTAL_STEPS) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSave = async () => {
    if (!validateStep(2)) return;

    setSaving(true);
    try {
      const base = {
        hospitality_company_id: parseInt(companyId),
        hotel_id: parseInt(hotelId),
        process_id: wizardForm.process_id,
        department_id: null,
        is_master: true,
        is_active: true,
      };

      const policyIdByEntity = {};
      if (editingPolicies?.length) {
        editingPolicies.forEach((p) => {
          policyIdByEntity[p.entity_type] = p.id;
        });
      }

      for (let i = 0; i < (wizardForm.stages || []).length; i++) {
        const stage = wizardForm.stages[i];
        const entity_type = stage.entity_type;
        const steps = (stage.steps || []).map((step, idx) => ({
          ...step,
          step_order: idx + 1,
        }));

        const payload = {
          ...base,
          entity_type,
          steps,
        };

        if (policyIdByEntity[entity_type]) {
          payload.id = policyIdByEntity[entity_type];
          await updateApprovalPolicy(payload);
        } else {
          await createApprovalPolicy(payload);
        }
      }

      toast.success("Workflow saved successfully");
      onSave();
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to save workflow"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleStagesChange = (stages) => {
    setWizardForm((prev) => ({ ...prev, stages }));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepSelectProcessOnly
            selectedProcessId={wizardForm.process_id}
            processes={processes}
            onChange={(val) => setWizardForm((prev) => ({ ...prev, process_id: val }))}
            onCreateProcess={onCreateProcess}
            isEditing={isEditing}
          />
        );
      case 2:
        return (
          <StepConfigureStages
            stages={wizardForm.stages}
            onStagesChange={handleStagesChange}
            getApproverOptions={getApproverOptions}
            getApproverDisplayInfo={getApproverDisplayInfo}
          />
        );
      case 3:
        return (
          <StepReviewSave
            process={processes?.find((p) => p.id === wizardForm.process_id)}
            stages={wizardForm.stages}
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
              {currentStep > 1 && (
                <button
                  type="button"
                  className="btn btn-outline-secondary d-flex align-items-center gap-1"
                  onClick={handleBack}
                  style={{
                    borderRadius: "8px",
                    fontSize: "13px",
                    padding: "8px 18px",
                  }}
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
                style={{
                  borderRadius: "8px",
                  fontSize: "13px",
                  padding: "8px 18px",
                }}
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
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                      />
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
