// GlobalArcWizard.js
// Two-step wizard for the network-wide Group ARC hierarchy.
// Slimmer than WorkflowWizard because:
//   - No process selection (global policies have no process_id).
//   - Stages are fixed to the tender chain (TENDER → TECHNICAL →
//     NEGOTIATION → NEGOTIATION_QUOTE → ARC).
//   - Saves with is_global=1 + company_id; all narrower scope columns
//     null. The single global per (entity_type, company_id) constraint
//     is enforced server-side by uq_global_policy_per_entity_company.
//
// Reuses existing primitives (StepConfigureStages, StepReviewSave,
// ConfirmationModal) so the configuration UX matches the rest of the
// approval-hierarchy admin.

import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";
import { BsArrowLeft, BsArrowRight } from "react-icons/bs";
import { createApprovalPolicy, updateApprovalPolicy } from "@/services/approval";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import WizardStepper from "./WizardStepper";
import StepConfigureStages from "./StepConfigureStages";
import StepReviewSave from "./StepReviewSave";
import { DS, TENDER_PROCESS_STAGES } from "../constants";
import s from "./WorkflowWizard.module.scss";

const TOTAL_STEPS = 2;

// Group ARC tender chain stages — fixed for every Group ARC, not
// admin-configurable.
const GLOBAL_STAGE_ORDER = TENDER_PROCESS_STAGES.map((st) => st.value);

const buildStagesFromPolicies = (policies) => {
  return GLOBAL_STAGE_ORDER.map((entity_type) => {
    const policy = (policies || []).find((p) => p.entity_type === entity_type && (p.is_global === 1 || p.is_global === true));
    return {
      entity_type,
      steps: (policy?.steps || []).map((st, i) => ({ ...st, step_order: i + 1 })),
    };
  });
};

// SECURITY NOTE: This component intentionally does NOT take a `companyId`
// prop. Global policy reads and writes are scoped server-side to the
// authenticated user's parent company (req.user.company_id). Sending a
// company_id from the client would be ignored and is omitted to avoid
// implying the API would honour it.
const GlobalArcWizard = ({
  companyName,
  existingPolicies,
  getApproverOptions,
  getApproverDisplayInfo,
  onSave,
  onCancel,
}) => {
  const isEditing = (existingPolicies || []).some((p) => p.is_global === 1 || p.is_global === true);

  const initialStages = useMemo(() => buildStagesFromPolicies(existingPolicies), [existingPolicies]);

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [impactWarning, setImpactWarning] = useState(null);
  const [stages, setStages] = useState(initialStages);

  React.useEffect(() => {
    if (existingPolicies) setStages(buildStagesFromPolicies(existingPolicies));
  }, [existingPolicies]);

  const validateConfigure = () => {
    if (!stages?.some((st) => (st.steps?.length || 0) > 0)) {
      toast.error("Add at least one approval level in any stage");
      return false;
    }
    for (let si = 0; si < stages.length; si++) {
      for (let i = 0; i < (stages[si].steps || []).length; i++) {
        const st = stages[si].steps[i];
        if (!st.approver_source_type || !st.approver_source_id) {
          const stageLabel = TENDER_PROCESS_STAGES[si]?.label || `Stage ${si + 1}`;
          toast.error(`${stageLabel}: Level ${i + 1} is incomplete.`);
          return false;
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateConfigure()) return;
    if (currentStep < TOTAL_STEPS) setCurrentStep(currentStep + 1);
  };
  const handleBack = () => { if (currentStep > 1) setCurrentStep(currentStep - 1); };

  // Build the per-stage payload. The only new wrinkle vs WorkflowWizard:
  // is_global=1 + company_id, and every narrower scope column omitted.
  const buildStagePayloads = () => {
    const policyIdByEntity = {};
    (existingPolicies || []).forEach((p) => {
      if ((p.is_global === 1 || p.is_global === true) && p.entity_type) {
        policyIdByEntity[p.entity_type] = p.id;
      }
    });
    const base = {
      is_global: 1,
      // company_id is intentionally NOT sent. The server pins it to
      // req.user.company_id for security (multi-tenant isolation).
      is_master: true,
      is_active: true,
    };
    return stages.map((stage) => {
      const payload = {
        ...base,
        entity_type: stage.entity_type,
        steps: (stage.steps || []).map((st, idx) => ({ ...st, step_order: idx + 1 })),
      };
      if (policyIdByEntity[stage.entity_type]) payload.id = policyIdByEntity[stage.entity_type];
      return payload;
    });
  };

  const saveStagePayload = async (payload) => {
    const fn = payload.id ? updateApprovalPolicy : createApprovalPolicy;
    const response = await fn(payload);
    if (response?.status === 0 && response?.code === "APPROVAL_IMPACT_WARNING") return { kind: "warning", warning: response.data };
    return { kind: "success", response };
  };

  const handleSave = async () => {
    if (!validateConfigure()) return;
    setSaving(true);
    try {
      const payloads = buildStagePayloads();
      const pending = [];
      for (const payload of payloads) {
        const r = await saveStagePayload(payload);
        if (r.kind === "warning") pending.push({ payload, warning: r.warning });
      }
      if (pending.length === 0) { toast.success("Group ARC hierarchy saved"); onSave(); return; }
      setImpactWarning({ pending });
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message?.response?.data?.message || error?.message || "Failed to save Group ARC hierarchy");
      setSaving(false);
    }
  };

  const handleConfirmImpact = async () => {
    if (!impactWarning?.pending?.length) { setImpactWarning(null); setSaving(false); return; }
    try {
      for (const { payload } of impactWarning.pending) {
        await saveStagePayload({ ...payload, confirmed_approval_impact: true });
      }
      toast.success("Group ARC hierarchy saved and pending approvals updated");
      setImpactWarning(null);
      onSave();
    } catch (error) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to apply changes");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelImpact = () => {
    const skipped = impactWarning?.pending?.map((p) => p.payload.entity_type).join(", ");
    setImpactWarning(null);
    setSaving(false);
    if (skipped) toast.info(`Changes to ${skipped} were not applied. Other stages saved.`);
  };

  // Synthetic process to feed StepReviewSave (it expects a process pill).
  const syntheticProcess = useMemo(() => ({
    id: null,
    name: "Group ARC Global Hierarchy",
    process_type: "TENDER",
    description: companyName ? `Network-wide hierarchy for ${companyName}` : "Network-wide hierarchy",
  }), [companyName]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepConfigureStages
            stages={stages}
            onStagesChange={setStages}
            getApproverOptions={getApproverOptions}
            getApproverDisplayInfo={getApproverDisplayInfo}
          />
        );
      case 2:
        return (
          <StepReviewSave
            process={syntheticProcess}
            stages={stages}
            hotel={null}
            getApproverDisplayInfo={getApproverDisplayInfo}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className={s.card}>
        <div className={s.body}>
          <div style={{ marginBottom: 16 }}>
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 999,
              background: "linear-gradient(90deg, #2E5BA8 0%, #3b82f6 100%)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}>
              Group ARC · Global
            </div>
            <h3 style={{ marginTop: 12, marginBottom: 4, fontSize: 20, fontWeight: 600 }}>
              {isEditing ? "Edit" : "Configure"} the network-wide ARC hierarchy
            </h3>
            <p style={{ color: DS.muted, fontSize: 13, margin: 0 }}>
              One hierarchy governs every Group ARC tender across all hotels and companies under
              <strong> {companyName || "this account"}</strong>. Single ARC tenders continue to use the per-hotel matrix.
            </p>
          </div>
          <WizardStepper
            currentStep={currentStep}
            steps={[{ label: "Configure" }, { label: "Review & Save" }]}
            totalSteps={TOTAL_STEPS}
          />
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
              <button type="button" className={s.btnPrimary} onClick={handleNext}>
                Next <BsArrowRight size={14} />
              </button>
            ) : (
              <button type="button" className={s.btnSave} onClick={handleSave} disabled={saving}>
                {saving ? (<><span className="spinner-border spinner-border-sm" role="status" /> Saving...</>) : "Save Hierarchy"}
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={!!impactWarning}
        onClose={handleCancelImpact}
        onConfirm={handleConfirmImpact}
        title="Pending Group ARC approvals will be affected"
        description={impactWarning ? `${impactWarning.pending.length} stage${impactWarning.pending.length === 1 ? "" : "s"} you changed will modify in-flight Group ARC approvals.` : ""}
        confirmButtonColor="warning"
        confirmButtonText="Confirm and apply changes"
        cancelButtonText="Cancel"
        showCloseButton
        customFooter={impactWarning ? (
          <div style={{ maxHeight: 320, overflowY: "auto", textAlign: "left" }}>
            {impactWarning.pending.map(({ payload, warning }) => (
              <div key={`${payload.entity_type}-${payload.id || "new"}`} style={{ border: "1px solid #c7d2fe", background: "#eef2ff", borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <strong style={{ fontSize: 13 }}>{warning.entity_type}</strong>
                  <span style={{ fontSize: 12, color: "#1e3a8a" }}>{warning.pending_count} pending</span>
                </div>
                {warning.instances?.length > 0 && (
                  <div style={{ fontSize: 12, color: "#374151" }}>
                    {warning.instances.slice(0, 6).map((inst) => (
                      <div key={inst.id} style={{ marginBottom: 2 }}>
                        {inst.entity_identifier} <span style={{ color: DS.muted }}>step {inst.current_step}/{inst.total_steps}</span>
                      </div>
                    ))}
                    {warning.instances.length > 6 && (
                      <div style={{ color: DS.muted, fontStyle: "italic" }}>and {warning.instances.length - 6} more...</div>
                    )}
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

export default GlobalArcWizard;
