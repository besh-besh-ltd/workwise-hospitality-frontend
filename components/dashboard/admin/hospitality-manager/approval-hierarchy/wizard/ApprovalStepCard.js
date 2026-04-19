import React from "react";
import Select from "react-select";
import { BsGripVertical, BsTrash3, BsExclamationTriangleFill, BsPeopleFill, BsPersonFill } from "react-icons/bs";
import { approverSourceTypes, decisionRules, DS } from "../constants";
import st from "./ApprovalStepCard.module.scss";

const selectStyles = {
  control: (base, state) => ({
    ...base, borderColor: state.isFocused ? DS.primary : DS.border, backgroundColor: DS.card,
    borderRadius: 10, minHeight: 40, fontSize: 13, fontFamily: "'Poppins', sans-serif",
    boxShadow: state.isFocused ? `0 0 0 3px rgba(46,91,168,0.1)` : "none",
    "&:hover": { borderColor: DS.primary },
  }),
  placeholder: (base) => ({ ...base, color: DS.muted, fontSize: 13 }),
  option: (base, state) => ({ ...base, fontSize: 13, backgroundColor: state.isSelected ? DS.blueTint : state.isFocused ? DS.pageBg : "white", color: DS.dark, fontFamily: "'Poppins', sans-serif" }),
  singleValue: (base) => ({ ...base, fontFamily: "'Poppins', sans-serif" }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

const ApprovalStepCard = ({ step, index, totalSteps, selectedDepartmentId, getApproverOptions, getApproverDisplayInfo, onChange, onRemove, onDragStart, onDragOver, onDragEnd, onDrop }) => {
  const approverInfo = getApproverDisplayInfo(step, selectedDepartmentId);

  return (
    <div draggable onDragStart={(e) => onDragStart(e, index)} onDragOver={onDragOver} onDragEnd={onDragEnd} onDrop={(e) => onDrop(e, index)} className={st.card}>
      <div className={st.header}>
        <div className={st.headerLeft}>
          <span className={st.drag}><BsGripVertical size={16} /></span>
          <span className={st.badge}>L{index + 1}</span>
          <span className={st.title}>Level {index + 1}</span>
        </div>
        <button type="button" className={st.deleteBtn} onClick={() => onRemove(index)} disabled={totalSteps <= 1} title={totalSteps <= 1 ? "At least one level required" : "Remove level"}>
          <BsTrash3 size={13} />
        </button>
      </div>
      <div className={st.body}>
        <div className={st.field}>
          <div className={st.label}>Approver Type</div>
          <div className={st.pills}>
            {approverSourceTypes.map((t) => (
              <button key={t.value} type="button" className={`${st.pill} ${step.approver_source_type === t.value ? st.activePrimary : ""}`} onClick={() => onChange(index, "approver_source_type", t.value)}>
                {t.value === "ROLE" ? <BsPeopleFill size={12} /> : <BsPersonFill size={12} />}
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className={st.field}>
          <div className={st.label}>{step.approver_source_type === "USER" ? "Select User" : step.approver_source_type === "ROLE" ? "Select Role" : "Select Approver"}</div>
          <Select key={`approver-${index}-${step.approver_source_type}`} options={getApproverOptions(step.approver_source_type, selectedDepartmentId)} value={step.approver_source_id ? getApproverOptions(step.approver_source_type, selectedDepartmentId).find((o) => o.value === step.approver_source_id) || null : null} onChange={(option) => onChange(index, "approver_source_id", option?.value || null)} isDisabled={!step.approver_source_type} placeholder={!step.approver_source_type ? "Select type first..." : "Search..."} isClearable={false} menuPlacement="auto" menuPortalTarget={typeof document !== "undefined" ? document.body : null} menuPosition="fixed" maxMenuHeight={280} styles={selectStyles} />
          {step.approver_source_id && approverInfo.email && <small className="d-block mt-1" style={{ fontSize: 11, color: DS.muted, fontFamily: "'Poppins', sans-serif" }}>{approverInfo.email}</small>}
          {!selectedDepartmentId && step.approver_source_type && step.approver_source_id && <small className="d-block mt-1" style={{ fontSize: 11, fontStyle: "italic", color: DS.muted, fontFamily: "'Poppins', sans-serif" }}>Approvers filtered by department at runtime</small>}
          {step.approver_source_type === "ROLE" && step.approver_source_id && approverInfo.users.length === 0 && (
            <div className={st.error}><BsExclamationTriangleFill size={14} style={{ flexShrink: 0, marginTop: 1 }} /><span><strong>No users available</strong> for this role.</span></div>
          )}
        </div>
        <div className={st.field}>
          <div className={st.label}>Approval Requirement</div>
          <div className={st.pills}>
            {decisionRules.map((r) => (
              <button key={r.value} type="button" className={`${st.pill} ${step.decision_rule === r.value ? (r.value === "ANY" ? st.activeGreen : st.activeOrange) : ""}`} onClick={() => onChange(index, "decision_rule", r.value)}>
                {r.value === "ANY" ? "Any One" : "Everyone"}
              </button>
            ))}
          </div>
          {step.decision_rule && (
            <div className={st.hint} style={{ backgroundColor: step.decision_rule === "ALL" ? DS.orangeTint : DS.greenTint, color: step.decision_rule === "ALL" ? "#e65100" : "#2e7d32" }}>
              <span className={st.hintIcon} style={{ background: step.decision_rule === "ALL" ? "rgba(230,81,0,0.12)" : "rgba(46,125,50,0.12)", color: step.decision_rule === "ALL" ? "#e65100" : "#2e7d32" }}>
                {step.decision_rule === "ALL" ? "!" : "1"}
              </span>
              {step.decision_rule === "ALL" ? "All approvers must approve before proceeding." : "Only one approval needed to proceed."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApprovalStepCard;
