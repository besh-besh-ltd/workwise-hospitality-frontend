import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { createApprovalPolicy, updateApprovalPolicy, deleteApprovalPolicy } from "@/services/approval";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import WizardStepper from "./WizardStepper";
import StepSelectProcessOnly from "./StepSelectProcessOnly";
import StepConfigureStages from "./StepConfigureStages";
import StepReviewSave from "./StepReviewSave";
import { DS, getStagesForProcessType, getStageEntityOrder, ARC_PROCESS_STAGES, ARC_ENTITY_ORDER, FLOW_TYPE } from "../constants";
import s from "./WorkflowWizard.module.scss";

const TOTAL_STEPS = 3;

const buildStagesFromOrder = (policies, order) => {
  return order.map((entity_type) => {
    const policy = (policies || []).find((p) => p.entity_type === entity_type);
    return {
      entity_type,
      steps: (policy?.steps || []).map((st, i) => ({ ...st, step_order: i + 1 })),
    };
  });
};

const buildStagesFromPolicies = (policies, processType) =>
  buildStagesFromOrder(policies, getStageEntityOrder(processType));

const buildArcStagesFromPolicies = (policies) =>
  buildStagesFromOrder(policies, ARC_ENTITY_ORDER);

const WorkflowWizard = ({
  editingProcess, editingPolicies, processes, hotel,
  companyId, hotelId, getApproverOptions, getApproverDisplayInfo,
  onCreateProcess, onSave, onCancel,
}) => {
  const isEditing = !!editingProcess;
  const isArcEditing = isEditing && !!editingProcess?.is_arc;

  const initialStages = useMemo(() => {
    if (isEditing && editingPolicies?.length) {
      if (isArcEditing) return buildArcStagesFromPolicies(editingPolicies);
      if (editingProcess?.process_type != null) return buildStagesFromPolicies(editingPolicies, editingProcess.process_type);
    }
    return getStagesForProcessType("RFQ").map((st) => ({ entity_type: st.value, steps: [] }));
  }, [isEditing, isArcEditing, editingPolicies, editingProcess?.process_type]);

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [impactWarning, setImpactWarning] = useState(null);
  const [wizardForm, setWizardForm] = useState(() => ({
    flow_type: isArcEditing ? FLOW_TYPE.ARC : FLOW_TYPE.PROCESS,
    process_id: isEditing && !isArcEditing ? editingProcess?.id : null,
    stages: initialStages,
  }));

  const isArc = wizardForm.flow_type === FLOW_TYPE.ARC;
  const selectedProcess = processes?.find((p) => p.id === wizardForm.process_id);
  // ARC is process-free; its stage set is fixed. Otherwise derive from the process type.
  const stageConfig = isArc ? ARC_PROCESS_STAGES : getStagesForProcessType(selectedProcess?.process_type);

  React.useEffect(() => {
    if (isEditing && editingProcess && editingPolicies?.length) {
      setWizardForm({
        flow_type: isArcEditing ? FLOW_TYPE.ARC : FLOW_TYPE.PROCESS,
        process_id: isArcEditing ? null : editingProcess.id,
        stages: isArcEditing ? buildArcStagesFromPolicies(editingPolicies) : buildStagesFromPolicies(editingPolicies, editingProcess.process_type),
      });
    }
  }, [isEditing, isArcEditing, editingProcess?.id, editingPolicies?.length]);

  React.useEffect(() => {
    if (isEditing) return;
    // ARC flow: fixed ARC stage set (no process).
    if (isArc) {
      if ((wizardForm.stages || []).map((st) => st.entity_type).join(",") !== ARC_ENTITY_ORDER.join(",")) {
        setWizardForm((prev) => ({ ...prev, stages: ARC_PROCESS_STAGES.map((st) => ({ entity_type: st.value, steps: [] })) }));
      }
      return;
    }
    if (!wizardForm.process_id) return;
    const proc = processes?.find((p) => p.id === wizardForm.process_id);
    const order = getStageEntityOrder(proc?.process_type);
    if ((wizardForm.stages || []).map((st) => st.entity_type).join(",") !== order.join(",")) {
      setWizardForm((prev) => ({ ...prev, stages: getStagesForProcessType(proc?.process_type).map((st) => ({ entity_type: st.value, steps: [] })) }));
    }
  }, [wizardForm.process_id, wizardForm.flow_type, isArc, isEditing, processes]);

  const validateStep = (step) => {
    if (step === 1) {
      if (isArc) return true; // ARC flow has no process to pick
      if (!wizardForm.process_id) { toast.error("Please select a process"); return false; }
      return true;
    }
    if (step === 2) {
      if (!wizardForm.stages?.some((st) => (st.steps?.length || 0) > 0)) { toast.error("Add at least one approval level in any stage"); return false; }
      // ARC: the base "ARC" stage is required — publishing a rate contract
      // resolves entity_type 'ARC' and hard-400s without it.
      if (isArc) {
        const arcBase = (wizardForm.stages || []).find((st) => st.entity_type === "ARC");
        if (!arcBase || (arcBase.steps?.length || 0) === 0) {
          toast.error("The ARC (Publish & Base) stage needs at least one approval level — it gates publishing.");
          return false;
        }
      }
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
    if (currentStep === 1 && !isEditing) {
      if (isArc) {
        if ((wizardForm.stages || []).map((st) => st.entity_type).join(",") !== ARC_ENTITY_ORDER.join(",")) {
          setWizardForm((prev) => ({ ...prev, stages: ARC_PROCESS_STAGES.map((st) => ({ entity_type: st.value, steps: [] })) }));
        }
      } else if (wizardForm.process_id) {
        const proc = processes?.find((p) => p.id === wizardForm.process_id);
        const order = getStageEntityOrder(proc?.process_type);
        if ((wizardForm.stages || []).map((st) => st.entity_type).join(",") !== order.join(",")) {
          setWizardForm((prev) => ({ ...prev, stages: getStagesForProcessType(proc?.process_type).map((st) => ({ entity_type: st.value, steps: [] })) }));
        }
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
    // ARC is process-free — always persist process_id = NULL so the policy
    // matches ARC entities (which carry process_id = NULL by design).
    const base = { hospitality_company_id: parseInt(companyId), hotel_id: parseInt(hotelId), process_id: isArc ? null : wizardForm.process_id, department_id: null, is_master: true, is_active: true };
    const policyIdByEntity = {};
    if (editingPolicies?.length) editingPolicies.forEach((p) => { policyIdByEntity[p.entity_type] = p.id; });
    const payloads = [];
    const toDelete = [];
    (wizardForm.stages || []).forEach((stage) => {
      const hasSteps = (stage.steps?.length || 0) > 0;
      const existingId = policyIdByEntity[stage.entity_type];
      // ARC optional stages with no approvers: skip so the stage falls back to
      // the base 'ARC' policy. If one previously existed, delete it.
      if (isArc && !hasSteps && stage.entity_type !== "ARC") {
        if (existingId) toDelete.push(existingId);
        return;
      }
      const payload = { ...base, entity_type: stage.entity_type, steps: (stage.steps || []).map((st, idx) => ({ ...st, step_order: idx + 1 })) };
      if (existingId) payload.id = existingId;
      payloads.push(payload);
    });
    return { payloads, toDelete };
  };

  const handleSave = async () => {
    if (!validateStep(2)) return;
    setSaving(true);
    try {
      const { payloads, toDelete } = buildStagePayloads();
      for (const id of toDelete) { try { await deleteApprovalPolicy(id); } catch (e) { /* non-fatal */ } }
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

  // Bind the policy's selected process into approver resolution so the wizard
  // only surfaces users who fall in that process (wildcard-scoped users still
  // appear). ARC is process-free → processId = null = every eligible user
  // (already the wildcard-permissive path).
  const wizardProcessId = isArc ? null : (wizardForm.process_id || null);
  const getApproverOptionsForProcess = (type, dept) => getApproverOptions(type, dept, wizardProcessId);
  const getApproverDisplayInfoForProcess = (step, dept) => getApproverDisplayInfo(step, dept, wizardProcessId);

  // For Step 3 review header: real process for process flows, a synthetic
  // label for the ARC flow.
  const reviewProcess = isArc
    ? { name: "ARC (Rate Contracts)", process_type: "ARC" }
    : processes?.find((p) => p.id === wizardForm.process_id);

  const renderStep = () => {
    switch (currentStep) {
      case 1: return (
        <StepSelectProcessOnly
          selectedProcessId={wizardForm.process_id}
          processes={processes}
          onChange={(val) => setWizardForm((prev) => ({ ...prev, process_id: val }))}
          onCreateProcess={onCreateProcess}
          isEditing={isEditing}
          flowType={wizardForm.flow_type}
          onFlowChange={(flow) => setWizardForm((prev) => ({
            ...prev,
            flow_type: flow,
            process_id: flow === FLOW_TYPE.ARC ? null : prev.process_id,
            stages: flow === FLOW_TYPE.ARC
              ? ARC_PROCESS_STAGES.map((st) => ({ entity_type: st.value, steps: [] }))
              : prev.stages,
          }))}
        />
      );
      case 2: return <StepConfigureStages stages={wizardForm.stages} onStagesChange={(stages) => setWizardForm((prev) => ({ ...prev, stages }))} getApproverOptions={getApproverOptionsForProcess} getApproverDisplayInfo={getApproverDisplayInfoForProcess} selectedProcess={reviewProcess} isArc={isArc} />;
      case 3: return <StepReviewSave process={reviewProcess} stages={wizardForm.stages} hotel={hotel} getApproverDisplayInfo={getApproverDisplayInfoForProcess} />;
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
