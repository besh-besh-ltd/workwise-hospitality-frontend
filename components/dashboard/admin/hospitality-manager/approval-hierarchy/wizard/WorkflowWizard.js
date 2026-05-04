import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { createApprovalPolicy, updateApprovalPolicy } from "@/services/approval";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import WizardStepper from "./WizardStepper";
import StepSelectProcessOnly from "./StepSelectProcessOnly";
import StepConfigureStages from "./StepConfigureStages";
import StepReviewSave from "./StepReviewSave";
import { DS, getStagesForProcessType, getStageEntityOrder } from "../constants";
import s from "./WorkflowWizard.module.scss";

const TOTAL_STEPS = 3;

const buildStagesFromPolicies = (policies, processType) => {
  const order = getStageEntityOrder(processType);
  return order.map((entity_type) => {
    const policy = (policies || []).find((p) => p.entity_type === entity_type);
    return {
      entity_type,
      steps: (policy?.steps || []).map((st, i) => ({ ...st, step_order: i + 1 })),
    };
  });
};

const WorkflowWizard = ({
  editingProcess, editingPolicies, processes, hotel,
  companyId, hotelId, getApproverOptions, getApproverDisplayInfo,
  onCreateProcess, onSave, onCancel,
}) => {
  const isEditing = !!editingProcess;

  const initialStages = useMemo(() => {
    if (isEditing && editingPolicies?.length && editingProcess?.process_type != null) {
      return buildStagesFromPolicies(editingPolicies, editingProcess.process_type);
    }
    return getStagesForProcessType("RFQ").map((st) => ({ entity_type: st.value, steps: [] }));
  }, [isEditing, editingPolicies, editingProcess?.process_type]);

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [impactWarning, setImpactWarning] = useState(null);
  const [wizardForm, setWizardForm] = useState(() => ({
    process_id: isEditing ? editingProcess?.id : null,
    stages: initialStages,
  }));

  const selectedProcess = processes?.find((p) => p.id === wizardForm.process_id);
  const stageConfig = getStagesForProcessType(selectedProcess?.process_type);

  React.useEffect(() => {
    if (isEditing && editingProcess && editingPolicies?.length) {
      setWizardForm({ process_id: editingProcess.id, stages: buildStagesFromPolicies(editingPolicies, editingProcess.process_type) });
    }
  }, [isEditing, editingProcess?.id, editingPolicies?.length]);

  React.useEffect(() => {
    if (isEditing || !wizardForm.process_id) return;
    const proc = processes?.find((p) => p.id === wizardForm.process_id);
    const order = getStageEntityOrder(proc?.process_type);
    if ((wizardForm.stages || []).map((st) => st.entity_type).join(",") !== order.join(",")) {
      setWizardForm((prev) => ({ ...prev, stages: getStagesForProcessType(proc?.process_type).map((st) => ({ entity_type: st.value, steps: [] })) }));
    }
  }, [wizardForm.process_id, isEditing, processes]);

  const validateStep = (step) => {
    if (step === 1) { if (!wizardForm.process_id) { toast.error("Please select a process"); return false; } return true; }
    if (step === 2) {
      if (!wizardForm.stages?.some((st) => (st.steps?.length || 0) > 0)) { toast.error("Add at least one approval level in any stage"); return false; }
      for (let si = 0; si < (wizardForm.stages || []).length; si++) {
        for (let i = 0; i < (wizardForm.stages[si].steps || []).length; i++) {
          const st = wizardForm.stages[si].steps[i];
          if (!st.approver_source_type || !st.approver_source_id) {
            toast.error(`${stageConfig[si]?.label || `Stage ${si + 1}`}: Level ${i + 1} is incomplete.`);
            return false;
          }
        }
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) return;
    if (currentStep === 1 && wizardForm.process_id && !isEditing) {
      const proc = processes?.find((p) => p.id === wizardForm.process_id);
      const order = getStageEntityOrder(proc?.process_type);
      if ((wizardForm.stages || []).map((st) => st.entity_type).join(",") !== order.join(",")) {
        setWizardForm((prev) => ({ ...prev, stages: getStagesForProcessType(proc?.process_type).map((st) => ({ entity_type: st.value, steps: [] })) }));
      }
    }
    if (currentStep < TOTAL_STEPS) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  const saveStagePayload = async (payload) => {
    const fn = payload.id ? updateApprovalPolicy : createApprovalPolicy;
    const response = await fn(payload);
    if (response?.status === 0 && response?.code === "APPROVAL_IMPACT_WARNING") return { kind: "warning", warning: response.data };
    return { kind: "success", response };
  };

  const buildStagePayloads = () => {
    const base = { hospitality_company_id: parseInt(companyId), hotel_id: parseInt(hotelId), process_id: wizardForm.process_id, department_id: null, is_master: true, is_active: true };
    const policyIdByEntity = {};
    if (editingPolicies?.length) editingPolicies.forEach((p) => { policyIdByEntity[p.entity_type] = p.id; });
    return (wizardForm.stages || []).map((stage) => {
      const payload = { ...base, entity_type: stage.entity_type, steps: (stage.steps || []).map((st, idx) => ({ ...st, step_order: idx + 1 })) };
      if (policyIdByEntity[stage.entity_type]) payload.id = policyIdByEntity[stage.entity_type];
      return payload;
    });
  };

  const handleSave = async () => {
    if (!validateStep(2)) return;
    setSaving(true);
    try {
      const payloads = buildStagePayloads();
      const pending = [];
      for (const payload of payloads) { const r = await saveStagePayload(payload); if (r.kind === "warning") pending.push({ payload, warning: r.warning }); }
      if (pending.length === 0) { toast.success("Workflow saved successfully"); onSave(); return; }
      setImpactWarning({ pending });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to save workflow");
      setSaving(false);
    }
  };

  const handleConfirmImpact = async () => {
    if (!impactWarning?.pending?.length) { setImpactWarning(null); setSaving(false); return; }
    try {
      for (const { payload } of impactWarning.pending) await saveStagePayload({ ...payload, confirmed_approval_impact: true });
      toast.success("Workflow saved and pending approvals updated"); setImpactWarning(null); onSave();
    } catch (error) { toast.error(error?.response?.data?.message || error?.message || "Failed to apply changes"); }
    finally { setSaving(false); }
  };

  const handleCancelImpact = () => {
    const skipped = impactWarning?.pending?.map((p) => p.payload.entity_type).join(", ");
    setImpactWarning(null); setSaving(false);
    if (skipped) toast.info(`Changes to ${skipped} were not applied. Other stages saved.`);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1: return <StepSelectProcessOnly selectedProcessId={wizardForm.process_id} processes={processes} onChange={(val) => setWizardForm((prev) => ({ ...prev, process_id: val }))} onCreateProcess={onCreateProcess} isEditing={isEditing} />;
      case 2: return <StepConfigureStages stages={wizardForm.stages} onStagesChange={(stages) => setWizardForm((prev) => ({ ...prev, stages }))} getApproverOptions={getApproverOptions} getApproverDisplayInfo={getApproverDisplayInfo} />;
      case 3: return <StepReviewSave process={processes?.find((p) => p.id === wizardForm.process_id)} stages={wizardForm.stages} hotel={hotel} getApproverDisplayInfo={getApproverDisplayInfo} />;
      default: return null;
    }
  };

  return (
    <div>
      <div className={s.card}>
        <div className={s.body}>
          <WizardStepper currentStep={currentStep} />
          {renderStep()}
        </div>
        <div className={s.footer}>
          <div>
            {currentStep > 1 && (
              <button type="button" className={s.btnOutline} onClick={handleBack}>
                <BsArrowLeft size={14} /> Back
              </button>
            )}
          </div>
          <div className="d-flex gap-2">
            <button type="button" className={s.btnOutline} onClick={onCancel}>Cancel</button>
            {currentStep < TOTAL_STEPS ? (
              <button type="button" className={s.btnPrimary} onClick={handleNext}>Next <BsArrowRight size={14} /></button>
            ) : (
              <button type="button" className={s.btnSave} onClick={handleSave} disabled={saving}>
                {saving ? (<><span className="spinner-border spinner-border-sm" role="status" /> Saving...</>) : "Save Workflow"}
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!impactWarning} onClose={handleCancelImpact} onConfirm={handleConfirmImpact}
        title="Pending approvals will be affected"
        description={impactWarning ? `${impactWarning.pending.length} stage${impactWarning.pending.length === 1 ? "" : "s"} you changed will modify in-flight approvals.` : ""}
        confirmButtonColor="warning" confirmButtonText="Confirm and apply changes" cancelButtonText="Cancel" showCloseButton
        customFooter={impactWarning ? (
          <div style={{ maxHeight: 320, overflowY: "auto", textAlign: "left" }}>
            {impactWarning.pending.map(({ payload, warning }) => (
              <div key={`${payload.entity_type}-${payload.id || "new"}`} style={{ border: "1px solid #f3d28a", background: DS.orangeTint, borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>{warning.entity_type}</strong>
                  <span style={{ fontSize: 12, color: "#92400e" }}>{warning.pending_count} pending</span>
                </div>
                {warning.instances?.length > 0 && (
                  <div style={{ fontSize: 12, color: "#374151" }}>
                    {warning.instances.slice(0, 6).map((inst) => (<div key={inst.id} style={{ marginBottom: 2 }}>{inst.entity_identifier} <span style={{ color: DS.muted }}>step {inst.current_step}/{inst.total_steps}</span></div>))}
                    {warning.instances.length > 6 && <div style={{ color: DS.muted, fontStyle: "italic" }}>and {warning.instances.length - 6} more...</div>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}
      />
    </div>
  );
};

export default WorkflowWizard;
