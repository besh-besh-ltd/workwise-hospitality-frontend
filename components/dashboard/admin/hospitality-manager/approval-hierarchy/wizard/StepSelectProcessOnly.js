import React, { useState } from "react";
import Select from "react-select";
import { BsPlus, BsInfoCircle, BsCheckCircleFill, BsLock } from "react-icons/bs";
import ProcessFormModal from "../modals/ProcessFormModal";
import { DS, PROCESS_TYPE_COLORS } from "../constants";
import s from "./StepSelectProcessOnly.module.scss";

const processTypeLabel = (t) => { const u = (t || "").toUpperCase(); if (u === "RFQ") return "RFQ"; if (u === "TENDER" || u === "ARC") return "Tender / ARC"; return u; };
const processTypeFlow = (t) => { const u = (t || "").toUpperCase(); return u === "RFQ" ? "RFQ > Tech > Negotiation > Neg. Quote > PO" : "Tender > Tech > Negotiation > Neg. Quote > ARC"; };

const StepSelectProcessOnly = ({ selectedProcessId, processes, onChange, onCreateProcess, isEditing = false }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
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
      <h4 className={s.heading}>Select Process</h4>
      <p className={s.subtext}>
        Choose the process. Stages will follow <strong>RFQ {">"} Tech {">"} Negotiation {">"} Neg. Quote {">"} PO</strong> for RFQ
        processes, or <strong>Tender {">"} Tech {">"} Negotiation {">"} Neg. Quote {">"} ARC</strong> for Tender/ARC processes.
      </p>
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
      <ProcessFormModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={handleCreate} />
    </div>
  );
};

export default StepSelectProcessOnly;
