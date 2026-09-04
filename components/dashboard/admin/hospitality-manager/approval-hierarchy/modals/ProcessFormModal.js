import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { BsXLg } from "react-icons/bs";
import { DS, PROCESS_TYPES, PROCESS_TYPE_COLORS } from "../constants";
import s from "./ProcessFormModal.module.scss";

const PROCESS_TYPE_OPTIONS = [
  { value: PROCESS_TYPES.RFQ, label: "RFQ", desc: "RFQ > Tech > Negotiation > Neg. Quote > PO" },
  { value: PROCESS_TYPES.TENDER, label: "Tender", desc: "Tender > Tech > Negotiation > Neg. Quote > ARC" },
  { value: PROCESS_TYPES.ARC, label: "ARC", desc: "Tender > Tech > Negotiation > Neg. Quote > ARC" },
];

const ProcessFormModal = ({ isOpen, onClose, onSave, editingProcess = null }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [process_type, setProcess_type] = useState(PROCESS_TYPES.RFQ);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingProcess) { setName(editingProcess.name || ""); setDescription(editingProcess.description || ""); setProcess_type(editingProcess.process_type || PROCESS_TYPES.RFQ); }
      else { setName(""); setDescription(""); setProcess_type(PROCESS_TYPES.RFQ); }
      setSaving(false);
    }
  }, [isOpen, editingProcess]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave({ name: name.trim(), description: description.trim() || null, process_type: process_type || PROCESS_TYPES.RFQ }); onClose(); }
    catch (error) { /* handled by parent */ }
    finally { setSaving(false); }
  };

  const isEdit = !!editingProcess;

  return (
    <Modal isOpen={isOpen} onRequestClose={saving ? undefined : onClose} ariaHideApp={false} contentLabel={isEdit ? "Edit Process" : "Create Process"} shouldCloseOnOverlayClick={!saving} shouldCloseOnEsc={!saving}
      style={{
        overlay: { backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" },
        content: { position: "relative", inset: "auto", maxWidth: 480, width: "92%", border: `1px solid ${DS.border}`, background: DS.card, overflow: "hidden", padding: 0, borderRadius: 16, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
      }}
    >
      <div className={s.header}>
        <span className={s.title}>{isEdit ? "Edit Process" : "Create Process"}</span>
        <button className={s.closeBtn} onClick={onClose} disabled={saving}><BsXLg size={14} /></button>
      </div>
      <div className={s.body}>
        <div className={s.field}>
          <label className={s.label}>Process Name<span className={s.required}>*</span></label>
          <input type="text" className={s.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Renovation, Day to Day Procurement" maxLength={100} autoFocus />
        </div>
        <div className={s.field}>
          <label className={s.label}>Process Type{!isEdit && <span className={s.required}>*</span>}</label>
          {isEdit ? (() => {
            const currentOpt = PROCESS_TYPE_OPTIONS.find((o) => o.value === process_type) || PROCESS_TYPE_OPTIONS[0];
            const color = PROCESS_TYPE_COLORS[currentOpt.value.toUpperCase()] || DS.primary;
            return (
              <div className={s.typeCard} style={{ borderColor: color, background: color + "08", cursor: "default" }}>
                <div className={s.typeName} style={{ color }}>{currentOpt.label}</div>
                <div className={s.typeDesc}>{currentOpt.desc}</div>
              </div>
            );
          })() : (
            <div className={s.types}>
              {PROCESS_TYPE_OPTIONS.map((opt) => {
                const color = PROCESS_TYPE_COLORS[opt.value.toUpperCase()] || DS.primary;
                return (
                  <div key={opt.value} className={`${s.typeCard} ${process_type === opt.value ? s.typeCardSelected : ""}`} onClick={() => setProcess_type(opt.value)} style={process_type === opt.value ? { borderColor: color, background: color + "08" } : undefined}>
                    <div className={s.typeName} style={{ color: process_type === opt.value ? color : DS.dark }}>{opt.label}</div>
                    <div className={s.typeDesc}>{opt.desc}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className={s.field}>
          <label className={s.label}>Description <span className={s.optional}>(optional)</span></label>
          <textarea className={`${s.input} ${s.textarea}`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." maxLength={500} />
          <div className={s.charCount}>{description.length}/500</div>
        </div>
      </div>
      <div className={s.footer}>
        <button className={`${s.btn} ${s.btnCancel}`} onClick={onClose} disabled={saving}>Cancel</button>
        <button className={`${s.btn} ${s.btnSave}`} onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? (<><span className="spinner-border spinner-border-sm" role="status" /> Saving...</>) : isEdit ? "Update Process" : "Create Process"}
        </button>
      </div>
    </Modal>
  );
};

export default ProcessFormModal;
