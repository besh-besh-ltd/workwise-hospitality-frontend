import React, { useState } from "react";
import { BsPlus, BsChevronDown, BsChevronRight, BsLightbulb } from "react-icons/bs";
import ApprovalStepCard from "./ApprovalStepCard";
import ApprovalFlowGraph from "../preview/ApprovalFlowGraph";
import { RFQ_PROCESS_STAGES, BRAND_TEAL, getEntityTypeConfig } from "../constants";

const StepConfigureStages = ({
  stages,
  onStagesChange,
  getApproverOptions,
  getApproverDisplayInfo,
}) => {
  const [expandedStage, setExpandedStage] = useState(0);

  const handleAddStep = (stageIndex) => {
    const newStages = stages.map((s, i) => {
      if (i !== stageIndex) return s;
      const newStep = {
        step_order: (s.steps?.length || 0) + 1,
        approval_type: "STANDARD",
        decision_rule: "ANY",
        approver_source_type: "ROLE",
        approver_source_id: null,
      };
      return { ...s, steps: [...(s.steps || []), newStep] };
    });
    onStagesChange(newStages);
  };

  const handleRemoveStep = (stageIndex, stepIndex) => {
    const newStages = stages.map((s, i) => {
      if (i !== stageIndex) return s;
      const newSteps = (s.steps || []).filter((_, idx) => idx !== stepIndex);
      newSteps.forEach((st, idx) => { st.step_order = idx + 1; });
      return { ...s, steps: newSteps };
    });
    onStagesChange(newStages);
  };

  const handleStepChange = (stageIndex, stepIndex, field, value) => {
    const newStages = stages.map((s, i) => {
      if (i !== stageIndex) return s;
      const newSteps = [...(s.steps || [])];
      const updated = { ...newSteps[stepIndex], [field]: value };
      if (field === "approver_source_type") updated.approver_source_id = null;
      newSteps[stepIndex] = updated;
      return { ...s, steps: newSteps };
    });
    onStagesChange(newStages);
  };

  const handleDragStart = (e, stageIndex, stepIndex) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ stageIndex, stepIndex }));
    e.currentTarget.style.opacity = "0.5";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = "1";
  };

  const handleDrop = (e, stageIndex, dropStepIndex) => {
    e.preventDefault();
    try {
      const { stageIndex: dragStage, stepIndex: dragStep } = JSON.parse(
        e.dataTransfer.getData("application/json")
      );
      if (dragStage !== stageIndex || dragStep === dropStepIndex) return;

      const newStages = stages.map((s, i) => {
        if (i !== stageIndex) return s;
        const steps = [...(s.steps || [])];
        const [dragged] = steps.splice(dragStep, 1);
        steps.splice(dropStepIndex, 0, dragged);
        steps.forEach((st, idx) => { st.step_order = idx + 1; });
        return { ...s, steps };
      });
      onStagesChange(newStages);
    } catch (_) {}
  };

  return (
    <div>
      <style jsx>{`
        .step-heading {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 6px;
        }
        .step-subtext {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }
        .how-it-works {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 20px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .stage-section {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          margin-bottom: 12px;
          overflow: hidden;
        }
        .stage-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          cursor: pointer;
          transition: background 0.2s;
          user-select: none;
        }
        .stage-header:hover {
          background: #f9fafb;
        }
        .stage-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .stage-body {
          padding: 0 18px 18px;
          border-top: 1px solid #f3f4f6;
        }
        .preview-panel {
          position: sticky;
          top: 20px;
        }
        .preview-panel-inner {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
        }
        .preview-header {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          padding-bottom: 10px;
          border-bottom: 1px solid #f3f4f6;
          margin-bottom: 10px;
        }
      `}</style>

      <h4 className="step-heading">Configure approval stages</h4>
      <p className="step-subtext">
        Set approvers for each stage in order: RFQ → Technical → Quote → PO.
      </p>

      <div className="how-it-works">
        <BsLightbulb size={18} style={{ color: "#f59e0b", flexShrink: 0, marginTop: "2px" }} />
        <div>
          <strong style={{ fontSize: "12px" }}>Order:</strong>
          <p className="mb-0 mt-1" style={{ fontSize: "12px", color: "#4b5563" }}>
            Documents flow through these stages in sequence. Configure who approves at each stage.
          </p>
        </div>
      </div>

      <div className="row">
        <div className="col-12 col-lg-7">
          {(stages || RFQ_PROCESS_STAGES.map((s) => ({ entity_type: s.value, steps: [] }))).map(
            (stage, stageIndex) => {
              const config = getEntityTypeConfig(stage.entity_type);
              const Icon = config.icon;
              const steps = stage.steps || [];
              const isExpanded = expandedStage === stageIndex;

              return (
                <div key={stage.entity_type} className="stage-section">
                  <div
                    className="stage-header"
                    onClick={() => setExpandedStage(isExpanded ? -1 : stageIndex)}
                  >
                    <div className="stage-header-left">
                      {isExpanded ? (
                        <BsChevronDown size={16} style={{ color: "#9ca3af" }} />
                      ) : (
                        <BsChevronRight size={16} style={{ color: "#9ca3af" }} />
                      )}
                      <span
                        className="d-flex align-items-center gap-2"
                        style={{
                          fontSize: "14px",
                          fontWeight: 600,
                          color: config.color,
                        }}
                      >
                        <Icon size={18} />
                        {config.label}
                      </span>
                      <span className="text-muted" style={{ fontSize: "12px" }}>
                        {steps.length} level{steps.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {isExpanded && (
                      <button
                        type="button"
                        className="btn btn-sm d-flex align-items-center gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddStep(stageIndex);
                        }}
                        style={{
                          backgroundColor: BRAND_TEAL,
                          borderColor: BRAND_TEAL,
                          color: "#fff",
                          borderRadius: "6px",
                          fontSize: "12px",
                          padding: "4px 12px",
                        }}
                      >
                        <BsPlus size={14} /> Add level
                      </button>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="stage-body">
                      {steps.length === 0 ? (
                        <div
                          className="text-center py-4"
                          style={{
                            background: "#f9fafb",
                            borderRadius: "8px",
                            border: "2px dashed #e5e7eb",
                          }}
                        >
                          <p className="mb-2 text-muted" style={{ fontSize: "13px" }}>
                            No approval levels yet
                          </p>
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => handleAddStep(stageIndex)}
                            style={{
                              backgroundColor: BRAND_TEAL,
                              color: "#fff",
                              borderRadius: "6px",
                              fontSize: "12px",
                            }}
                          >
                            <BsPlus size={14} className="me-1" /> Add level
                          </button>
                        </div>
                      ) : (
                        steps.map((step, stepIndex) => (
                          <ApprovalStepCard
                            key={stepIndex}
                            step={step}
                            index={stepIndex}
                            totalSteps={steps.length}
                            selectedDepartmentId={null}
                            getApproverOptions={getApproverOptions}
                            getApproverDisplayInfo={getApproverDisplayInfo}
                            onChange={(idx, field, value) =>
                              handleStepChange(stageIndex, idx, field, value)
                            }
                            onRemove={() => handleRemoveStep(stageIndex, stepIndex)}
                            onDragStart={(e) => handleDragStart(e, stageIndex, stepIndex)}
                            onDragOver={handleDragOver}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => handleDrop(e, stageIndex, stepIndex)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>

        <div className="col-12 col-lg-5 mt-4 mt-lg-0">
          <div className="preview-panel">
            <div className="preview-panel-inner">
              <div className="preview-header">Flow preview</div>
              <ApprovalFlowGraph
                stages={stages}
                getApproverDisplayInfo={getApproverDisplayInfo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepConfigureStages;
