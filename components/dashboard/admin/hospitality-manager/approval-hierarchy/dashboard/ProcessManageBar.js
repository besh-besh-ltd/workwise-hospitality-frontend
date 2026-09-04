import React, { useState } from "react";
import { BsPlus, BsPencil, BsX } from "react-icons/bs";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import ProcessFormModal from "../modals/ProcessFormModal";
import { DS, PROCESS_TYPE_COLORS } from "../constants";
import s from "./ProcessManageBar.module.scss";

const ProcessManageBar = ({ processes, onCreateProcess, onUpdateProcess, onDeleteProcess }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [deletingProcess, setDeletingProcess] = useState(null);

  return (
    <>
      <div className={s.bar}>
        <span className={s.label}>Processes:</span>
        {processes.map((proc) => {
          const color = PROCESS_TYPE_COLORS[(proc.process_type || "").toUpperCase()] || DS.primary;
          return (
            <span key={proc.id} className={s.pill} style={{ backgroundColor: color + "12", color, border: `1px solid ${color}30` }}>
              {proc.name}
              <button className={s.pillAction} onClick={(e) => { e.stopPropagation(); setEditingProcess(proc); }} title="Edit" style={{ color }}><BsPencil size={10} /></button>
              <button className={`${s.pillAction} ${s.pillActionDelete}`} onClick={(e) => { e.stopPropagation(); setDeletingProcess(proc); }} title="Delete" style={{ color: DS.muted }}><BsX size={14} /></button>
            </span>
          );
        })}
        <button className={s.addBtn} onClick={() => setShowCreateModal(true)}><BsPlus size={16} /> Add Process</button>
      </div>
      <ProcessFormModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onSave={async (data) => { await onCreateProcess(data); }} />
      <ProcessFormModal isOpen={!!editingProcess} onClose={() => setEditingProcess(null)} onSave={async (data) => { if (editingProcess) await onUpdateProcess(editingProcess.id, data); }} editingProcess={editingProcess} />
      <ConfirmationModal isOpen={!!deletingProcess} onClose={() => setDeletingProcess(null)} onConfirm={async () => { if (deletingProcess) { await onDeleteProcess(deletingProcess.id); setDeletingProcess(null); } }} title="Delete Process" description={`Are you sure you want to delete <strong>"${deletingProcess?.name}"</strong>?`} confirmButtonColor="danger" confirmButtonText="Delete" cancelButtonText="Cancel" />
    </>
  );
};

export default ProcessManageBar;
