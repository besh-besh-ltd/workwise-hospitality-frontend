import React, { useState } from "react";
import Select from "react-select";
import { BsPlus, BsInfoCircle, BsCheckCircleFill, BsLock } from "react-icons/bs";
import ProcessFormModal from "../modals/ProcessFormModal";
import { DS, PROCESS_TYPE_COLORS, FLOW_TYPE } from "../constants";
import { stageShortLabel } from "../stageLabels";
import s from "./StepSelectProcessOnly.module.scss";

const processTypeLabel = (t) => { const u = (t || "").toUpperCase(); if (u === "RFQ") return "RFQ"; if (u === "TENDER" || u === "ARC") return "Tender / ARC"; return u; };
const processTypeFlow = (t) => { const u = (t || "").toUpperCase(); return (u === "RFQ" ? ["RFQ", "TECHNICAL", "NEGOTIATION", "NEGOTIATION_QUOTE", "PO"] : ["TENDER", "TECHNICAL", "NEGOTIATION", "NEGOTIATION_QUOTE", "ARC"]).map(stageShortLabel).join(" > "); };

const StepSelectProcessOnly = ({ selectedProcessId, processes, onChange, onCreateProcess, isEditing = false, flowType = FLOW_TYPE.PROCESS, onFlowChange, groupWorkflowExists = false, companyWide = false, onCompanyWideChange, prScopeTaken = false }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupBlocked, setGroupBlocked] = useState(false);
  const isArc = flowType === FLOW_TYPE.ARC;
  const isArcGroup = flowType === FLOW_TYPE.ARC_GROUP;
  const isPr = flowType === FLOW_TYPE.PR;

  const flowCard = (value, title, subtitle, accent) => {
    const active = flowType === value;
    return (
      <div
        onClick={() => {
          if (isEditing || !onFlowChange) return;
          if (value === FLOW_TYPE.ARC_GROUP && groupWorkflowExists) { setGroupBlocked(true); return; }
          setGroupBlocked(false);
          onFlowChange(value);
        }}
        style={{
          flex: 1, minWidth: 240, cursor: isEditing ? "default" : "pointer",
          border: `1.5px solid ${active ? accent : DS.border}`,
          background: active ? accent + "12" : DS.card,
          borderRadius: 10, padding: "14px 16px", opacity: isEditing && !active ? 0.5 : 1,
          transition: "all 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${active ? accent : DS.border}`, background: active ? accent : "transparent", flexShrink: 0 }} />
          <strong style={{ fontSize: 14, color: DS.dark, fontFamily: "'Poppins', sans-serif" }}>{title}</strong>
        </div>
        <div style={{ fontSize: 12, color: DS.muted, marginTop: 6, marginLeft: 24, fontFamily: "'Poppins', sans-serif" }}>{subtitle}</div>
      </div>
    );
  };
  const handleCreate = async (data) => { const p = await onCreateProcess(data); if (p?.id) onChange(p.id); };
  const useCardGrid = (processes || []).length <= 8;
  const processOptions = (processes || []).map((p) => ({ value: p.id, label: p.name, description: p.description, process_type: p.process_type }));
  const selectedOption = selectedProcessId ? processOptions.find((o) => o.value === selectedProcessId) || null : null;

  const selectStyles = {
    control: (base, state) => ({ ...base, borderColor: state.isFocused ? DS.primary : DS.border, backgroundColor: DS.card, borderRadius: 8, minHeight: 42, fontSize: 14, boxShadow: state.isFocused ? `0 0 0 2px rgba(46,91,168,0.15)` : "none", "&:hover": { borderColor: DS.primary } }),
    placeholder: (base) => ({ ...base, color: DS.muted }),
    option: (base, state) => ({ ...base, fontSize: 13, backgroundColor: state.isSelected ? DS.blueTint : state.isFocused ? DS.pageBg : "white", color: DS.dark, fontFamily: "'Poppins', sans-serif" }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
  };

  return (
    <div>
      <h4 className={s.heading}>Select Workflow Type</h4>
      <p className={s.subtext}>
        Choose what this approval workflow governs. <strong>RFQ / Tender</strong> workflows are tied to a process;
        <strong> Unit ARC</strong> (Annual Rate Contracts for one hotel), <strong>Group ARC</strong> and <strong>Purchase Requisition</strong> run without a process.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        {flowCard(FLOW_TYPE.PROCESS, "RFQ / Tender (process-based)", "Configure a process and its RFQ→PO or Tender→ARC stages.", DS.primary)}
        {flowCard(FLOW_TYPE.ARC, "Unit ARC (no process)", "Publish, tech-eval, negotiation, committee & amendment approvals. No process required.", "#db2777")}
        {flowCard(FLOW_TYPE.PR, "Purchase Requisition (no process)", "Approval chain for purchase requisitions, with optional value thresholds per level.", "#0f766e")}
        {flowCard(FLOW_TYPE.ARC_GROUP, "Group ARC — covers several hotels (company-wide)", "One approval hierarchy for rate contracts that cover two or more hotels.", "#be185d")}
      </div>
      {isEditing && <small className="d-block mb-3" style={{ fontSize: 12, color: DS.muted }}>Workflow type cannot be changed when editing.</small>}
      {groupBlocked && (
        <div className={s.infoBox} role="alert">
          <BsInfoCircle size={18} style={{ color: DS.error, flexShrink: 0, marginTop: 2 }} />
          <p>
            This company already has a Group ARC workflow. It applies company-wide, so edit it from the
            <strong> Group ARC (company-wide)</strong> card instead of creating another.
          </p>
        </div>
      )}

      {isPr ? (
        <div className={s.infoBox}>
          <BsInfoCircle size={18} style={{ color: "#0f766e", flexShrink: 0, marginTop: 2 }} />
          <div>
            <p>
              <strong>Purchase requisition approvals are process-free.</strong> Add the approval levels in order. A level
              can be limited to larger requisitions with an &quot;Only when PR value ≥ ₹&quot; minimum.
            </p>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: "'Poppins', sans-serif", cursor: isEditing ? "default" : "pointer" }}>
              <input type="checkbox" checked={companyWide} disabled={isEditing} onChange={(e) => onCompanyWideChange?.(e.target.checked)} />
              Apply to all hotels in the company
            </label>
            <small className="d-block" style={{ fontSize: 12, color: DS.muted }}>
              {companyWide ? "One chain for every hotel." : "Applies to this business unit only."}
            </small>
            {companyWide && (
              <small className="d-block" style={{ fontSize: 12, color: "#0f766e" }}>
                Pick approvers with company-level access — an approver scoped to one hotel only counts for that hotel&apos;s requisitions.
              </small>
            )}
            {prScopeTaken && (
              <small role="alert" className="d-block" style={{ fontSize: 12, color: DS.error }}>
                {companyWide
                  ? "A company-wide Purchase Requisition chain already exists. Edit it from its card."
                  : "This hotel already has its own Purchase Requisition chain. Edit it from its card."}
              </small>
            )}
          </div>
        </div>
      ) : isArcGroup ? (
        <div className={s.infoBox}>
          <BsInfoCircle size={18} style={{ color: "#be185d", flexShrink: 0, marginTop: 2 }} />
          <p>
            <strong>Group ARC approvals are company-wide:</strong> one approval hierarchy for every group rate
            contract in the company, whichever hotel leads it. Group rate contracts never use a single hotel&apos;s
            ARC workflow. The <strong>Group ARC · Publish Approval</strong> stage is required and is the default
            for Technical, Negotiation, Committee and Amendment.
          </p>
        </div>
      ) : isArc ? (
        <div className={s.infoBox}>
          <BsInfoCircle size={18} style={{ color: "#db2777", flexShrink: 0, marginTop: 2 }} />
          <p>
            <strong>Unit ARC approvals are process-free.</strong> You'll configure approvers for
            <strong> Unit ARC · Publish Approval</strong>, Technical, Negotiation, Committee and Amendment.
            The <strong>Unit ARC · Publish Approval</strong> stage is required — it gates publishing a rate
            contract and is the default for every other stage. Continue to configure approvers.
          </p>
        </div>
      ) : (
      <>
      <div className={s.infoBox}>
        <BsInfoCircle size={18} style={{ color: DS.primary, flexShrink: 0, marginTop: 2 }} />
        <p><strong>RFQ</strong> processes use the RFQ to PO flow. <strong>Tender / ARC</strong> processes use the Tender to ARC flow.</p>
      </div>

      {useCardGrid ? (
        <>
          <div className={s.selectLabel}>Process <span style={{ color: DS.error }}>*</span></div>
          <div className={s.cardGrid}>
            {(processes || []).map((proc) => {
              const isSelected = selectedProcessId === proc.id;
              const typeColor = PROCESS_TYPE_COLORS[proc.process_type?.toUpperCase()] || DS.primary;
              return (
                <div key={proc.id} className={`${s.processCard} ${isSelected ? s.processCardSelected : ""} ${isEditing ? s.processCardDisabled : ""}`} onClick={() => { if (!isEditing) onChange(proc.id); }}>
                  {isSelected && <span className={s.checkIcon}>{isEditing ? <BsLock size={14} /> : <BsCheckCircleFill size={16} />}</span>}
                  <div className={s.cardName}>{proc.name}</div>
                  <span className={s.typePill} style={{ backgroundColor: typeColor + "15", color: typeColor }}>{processTypeLabel(proc.process_type)}</span>
                  <div className={s.flowLabel}>{processTypeFlow(proc.process_type)}</div>
                  {proc.description && <div className={s.cardDesc}>{proc.description}</div>}
                </div>
              );
            })}
          </div>
          {isEditing && <small className="d-block mt-2" style={{ fontSize: 12, color: DS.muted }}>Process cannot be changed when editing.</small>}
          {!isEditing && <button type="button" className={s.createLink} onClick={() => setShowCreateModal(true)}><BsPlus size={16} /> Create New Process</button>}
        </>
      ) : (
        <div className={s.selectArea}>
          <label className={s.selectLabel}>Process <span style={{ color: DS.error }}>*</span></label>
          <Select options={processOptions} value={selectedOption} onChange={(opt) => onChange(opt?.value || null)} placeholder="Choose a process..." isClearable={!isEditing} isDisabled={isEditing} formatOptionLabel={(opt) => (<div><div style={{ fontWeight: 500 }}>{opt.label}</div><div style={{ fontSize: 11, color: DS.muted }}>{processTypeFlow(opt.process_type)} {opt.description}</div></div>)} menuPlacement="auto" menuPortalTarget={typeof document !== "undefined" ? document.body : null} menuPosition="fixed" maxMenuHeight={280} styles={selectStyles} />
          {!isEditing && <button type="button" className={s.createLink} onClick={() => setShowCreateModal(true)}><BsPlus size={16} /> Create New Process</button>}
          {isEditing && <small className="d-block mt-2" style={{ fontSize: 12, color: DS.muted }}>Process cannot be changed when editing.</small>}
        </div>
      )}
      </>
      )}
      <ProcessFormModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} />
    </div>
  );
};

export default StepSelectProcessOnly;
