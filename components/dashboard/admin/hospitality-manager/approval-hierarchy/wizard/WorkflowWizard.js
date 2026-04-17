import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { createApprovalPolicy, updateApprovalPolicy } from "@/services/approval";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import WizardStepper from "./WizardStepper";
import StepSelectProcessOnly from "./StepSelectProcessOnly";
import StepConfigureStages from "./StepConfigureStages";
import StepReviewSave from "./StepReviewSave";
import { BRAND_TEAL, getStagesForProcessType, getStageEntityOrder } from "../constants";

const TOTAL_STEPS = 3;

const DEPT_SCOPED_ENTITY_TYPES = ['RFQ', 'TENDER', 'TECHNICAL'];

const buildStagesFromPolicies = (policies, processType) => {
  const order = getStageEntityOrder(processType);
  return order.map((entity_type) => {
    const policy = (policies || []).find((p) => p.entity_type === entity_type);
    return {
      entity_type,
      is_department_scoped: policy?.is_department_scoped ?? DEPT_SCOPED_ENTITY_TYPES.includes(entity_type),
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
    return getStagesForProcessType("RFQ").map((s) => ({
      entity_type: s.value,
      is_department_scoped: DEPT_SCOPED_ENTITY_TYPES.includes(s.value),
      steps: [],
    }));
  }, [isEditing, editingPolicies, editingProcess?.process_type]);

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Pre-flight impact warning state. When the backend returns
  // `APPROVAL_IMPACT_WARNING` for one or more stages during save, we collect
  // them here, show a single consolidated modal, and on confirm re-run those
  // stage saves with `confirmed_approval_impact: true`.
  const [impactWarning, setImpactWarning] = useState(null);
  // Shape: { pending: [{ payload, warning }, ...] }

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
          is_department_scoped: DEPT_SCOPED_ENTITY_TYPES.includes(s.value),
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
            is_department_scoped: DEPT_SCOPED_ENTITY_TYPES.includes(s.value),
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

  // Save a single stage payload. If the backend signals that pending
  // approvals would be affected (APPROVAL_IMPACT_WARNING), we surface that to
  // the caller instead of treating it as an error or a success.
  const saveStagePayload = async (payload) => {
    const fn = payload.id ? updateApprovalPolicy : createApprovalPolicy;
    const response = await fn(payload);
    // Axios interceptor unwraps response.data, so `response` is the JSON body.
    if (response?.status === 0 && response?.code === "APPROVAL_IMPACT_WARNING") {
      return { kind: "warning", warning: response.data };
    }
    return { kind: "success", response };
  };

  const buildStagePayloads = () => {
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

    return (wizardForm.stages || []).map((stage) => {
      const entity_type = stage.entity_type;
      const steps = (stage.steps || []).map((step, idx) => ({
        ...step,
        step_order: idx + 1,
      }));
      const payload = {
        ...base,
        entity_type,
        is_department_scoped: stage.is_department_scoped,
        steps,
      };
      if (policyIdByEntity[entity_type]) {
        payload.id = policyIdByEntity[entity_type];
      }
      return payload;
    });
  };

  const handleSave = async () => {
    if (!validateStep(2)) return;

    setSaving(true);
    try {
      const payloads = buildStagePayloads();
      const pendingConfirmations = [];

      // First pass: attempt to save every stage. Stages with no impact are
      // saved immediately. Stages that affect pending approvals come back as
      // warnings (the backend did NOT save them) and are collected.
      for (const payload of payloads) {
        const result = await saveStagePayload(payload);
        if (result.kind === "warning") {
          pendingConfirmations.push({ payload, warning: result.warning });
        }
      }

      if (pendingConfirmations.length === 0) {
        toast.success("Workflow saved successfully");
        onSave();
        return;
      }

      // Hand off to the confirmation modal. The wizard stays in the saving
      // state until the user confirms or cancels.
      setImpactWarning({ pending: pendingConfirmations });
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to save workflow"
      );
      setSaving(false);
    }
  };

  const handleConfirmImpact = async () => {
    if (!impactWarning?.pending?.length) {
      setImpactWarning(null);
      setSaving(false);
      return;
    }
    try {
      for (const { payload } of impactWarning.pending) {
        // Re-send with confirmation flag so the backend skips the warning gate
        // and proceeds to save + propagate.
        await saveStagePayload({ ...payload, confirmed_approval_impact: true });
      }
      toast.success("Workflow saved and pending approvals updated");
      setImpactWarning(null);
      onSave();
    } catch (error) {
      console.error("Error confirming impact:", error);
      toast.error(
        error?.response?.data?.message || error?.message || "Failed to apply changes"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCancelImpact = () => {
    const skipped = impactWarning?.pending?.map((p) => p.payload.entity_type).join(", ");
    setImpactWarning(null);
    setSaving(false);
    if (skipped) {
      toast.info(`Changes to ${skipped} were not applied. Other stages saved.`);
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

      <ConfirmationModal
        isOpen={!!impactWarning}
        onClose={handleCancelImpact}
        onConfirm={handleConfirmImpact}
        title="Pending approvals will be affected"
        description={
          impactWarning
            ? `${impactWarning.pending.length} stage${impactWarning.pending.length === 1 ? "" : "s"} you changed will modify in-flight approvals. Review the impact below before continuing.`
            : ""
        }
        confirmButtonColor="warning"
        confirmButtonText="Confirm and apply changes"
        cancelButtonText="Cancel"
        showCloseButton
        customFooter={
          impactWarning ? (
            <div style={{ maxHeight: 320, overflowY: "auto", textAlign: "left" }}>
              {impactWarning.pending.map(({ payload, warning }) => (
                <div
                  key={`${payload.entity_type}-${payload.id || "new"}`}
                  style={{
                    border: "1px solid #f3d28a",
                    background: "#fff8e6",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <strong style={{ fontSize: 13 }}>{warning.entity_type}</strong>
                    <span style={{ fontSize: 12, color: "#92400e" }}>
                      {warning.pending_count} pending instance
                      {warning.pending_count === 1 ? "" : "s"}
                    </span>
                  </div>
                  {warning.instances?.length > 0 && (
                    <div style={{ fontSize: 12, color: "#374151" }}>
                      {warning.instances.slice(0, 6).map((inst) => (
                        <div key={inst.id} style={{ marginBottom: 2 }}>
                          • {inst.entity_identifier}
                          <span style={{ color: "#6b7280" }}>
                            {" "}— step {inst.current_step}/{inst.total_steps}
                          </span>
                        </div>
                      ))}
                      {warning.instances.length > 6 && (
                        <div style={{ color: "#6b7280", fontStyle: "italic" }}>
                          and {warning.instances.length - 6} more…
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null
        }
      />
    </div>
  );
};

export default WorkflowWizard;
