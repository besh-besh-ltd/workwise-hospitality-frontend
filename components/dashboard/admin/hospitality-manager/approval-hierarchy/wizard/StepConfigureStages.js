import React, { useState } from "react";
import { BsPlus, BsChevronDown, BsChevronRight, BsDiagram3, BsArrowDown } from "react-icons/bs";
import ApprovalStepCard from "./ApprovalStepCard";
import ApprovalFlowGraph from "../preview/ApprovalFlowGraph";
import { RFQ_PROCESS_STAGES, DS, getEntityTypeConfig } from "../constants";
import s from "./StepConfigureStages.module.scss";

const StepConfigureStages = ({ stages, onStagesChange, getApproverOptions, getApproverDisplayInfo }) => {
  const [expandedStage, setExpandedStage] = useState(0);

  const handleAddStep = (si) => {
    const ns = stages.map((st, i) => {
      if (i !== si) return st;
      return { ...st, steps: [...(st.steps || []), { step_order: (st.steps?.length || 0) + 1, approval_type: "STANDARD", decision_rule: "ANY", approver_source_type: "ROLE", approver_source_id: null }] };
    });
    onStagesChange(ns);
  };
  const handleRemoveStep = (si, stepIdx) => {
    const ns = stages.map((st, i) => {
      if (i !== si) return st;
      const newSteps = (st.steps || []).filter((_, idx) => idx !== stepIdx);
      newSteps.forEach((s, idx) => { s.step_order = idx + 1; });
      return { ...st, steps: newSteps };
    });
    onStagesChange(ns);
  };
  const handleStepChange = (si, stepIdx, field, value) => {
    const ns = stages.map((st, i) => {
      if (i !== si) return st;
      const newSteps = [...(st.steps || [])];
      const updated = { ...newSteps[stepIdx], [field]: value };
      if (field === "approver_source_type") updated.approver_source_id = null;
      newSteps[stepIdx] = updated;
      return { ...st, steps: newSteps };
    });
    onStagesChange(ns);
  };
  const handleDragStart = (e, si, stepIdx) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("application/json", JSON.stringify({ si, stepIdx })); e.currentTarget.style.opacity = "0.5"; };
  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; };
  const handleDragEnd = (e) => { e.currentTarget.style.opacity = "1"; };
  const handleDrop = (e, si, dropIdx) => {
    e.preventDefault();
    try {
      const { si: dragSi, stepIdx: dragIdx } = JSON.parse(e.dataTransfer.getData("application/json"));
      if (dragSi !== si || dragIdx === dropIdx) return;
      const ns = stages.map((st, i) => {
        if (i !== si) return st;
        const steps = [...(st.steps || [])]; const [d] = steps.splice(dragIdx, 1); steps.splice(dropIdx, 0, d);
        steps.forEach((s, idx) => { s.step_order = idx + 1; }); return { ...st, steps };
      });
      onStagesChange(ns);
    } catch (_) {}
  };

  const stagesList = stages || RFQ_PROCESS_STAGES.map((st) => ({ entity_type: st.value, steps: [] }));

  return (
    <div>
      <h4 className={s.heading}>Configure approval stages</h4>
      <p className={s.subtext}>Set approvers for each stage. Click a stage to expand and add approval levels.</p>
      <div className="row">
        <div className="col-12 col-lg-7">
          <div className={s.flow}>
            {stagesList.map((stage, si) => {
              const config = getEntityTypeConfig(stage.entity_type);
              const Icon = config.icon;
              const steps = stage.steps || [];
              const isExpanded = expandedStage === si;
              const isLast = si === stagesList.length - 1;
              return (
                <React.Fragment key={stage.entity_type}>
                  <div className={s.stage}>
                    <div className={s.stageHeader} onClick={() => setExpandedStage(isExpanded ? -1 : si)}>
                      <div className={`${s.flowDot} ${steps.length > 0 ? s.flowDotFilled : s.flowDotEmpty}`} style={steps.length > 0 ? { background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)`, color: "#fff" } : { color: DS.muted }}>
                        <Icon size={16} />
                      </div>
                      <div className={`${s.stageCard} ${isExpanded ? s.stageCardExpanded : ""}`}>
                        <div className={s.stageInfo}>
                          <span className={s.stageName} style={{ color: config.color }}>{config.label}</span>
                          <span className={`${s.levelPill} ${steps.length > 0 ? s.levelPillActive : ""}`}>
                            {steps.length > 0 ? `${steps.length} level${steps.length !== 1 ? "s" : ""}` : "Not configured"}
                          </span>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {isExpanded && <button type="button" className={s.addBtn} onClick={(e) => { e.stopPropagation(); handleAddStep(si); }}><BsPlus size={14} /> Add</button>}
                          {isExpanded ? <BsChevronDown size={14} className={s.chevron} /> : <BsChevronRight size={14} className={s.chevron} />}
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className={s.stageBody}>
                        {steps.length === 0 ? (
                          <div className={s.emptyBody}><p>No approval levels configured</p><button type="button" className={s.addBtn} onClick={() => handleAddStep(si)}><BsPlus size={14} /> Add First Level</button></div>
                        ) : (
                          <>
                            {steps.map((step, stepIdx) => (
                              <ApprovalStepCard key={stepIdx} step={step} index={stepIdx} totalSteps={steps.length} selectedDepartmentId={null} getApproverOptions={getApproverOptions} getApproverDisplayInfo={getApproverDisplayInfo} onChange={(idx, field, value) => handleStepChange(si, idx, field, value)} onRemove={() => handleRemoveStep(si, stepIdx)} onDragStart={(e) => handleDragStart(e, si, stepIdx)} onDragOver={handleDragOver} onDragEnd={handleDragEnd} onDrop={(e) => handleDrop(e, si, stepIdx)} />
                            ))}
                            <button type="button" className={s.addFull} onClick={() => handleAddStep(si)}><BsPlus size={16} /> Add Next Approval Level</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {!isLast && <div className={s.connector}><BsArrowDown size={12} style={{ color: DS.border }} /></div>}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        <div className="col-12 col-lg-5 mt-4 mt-lg-0 d-none d-lg-block">
          <div className={s.preview}>
            <div className={s.previewCard}>
              <div className={s.previewHeader}><BsDiagram3 size={14} style={{ color: DS.primary }} /> Live Flow Preview</div>
              <div className={s.previewBody}><ApprovalFlowGraph stages={stages} getApproverDisplayInfo={getApproverDisplayInfo} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepConfigureStages;
