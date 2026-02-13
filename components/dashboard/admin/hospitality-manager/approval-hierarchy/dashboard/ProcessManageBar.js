import React, { useState } from "react";
import { BsPlus, BsPencil, BsX } from "react-icons/bs";
import ConfirmationModal from "@/components/modal/ConfirmationModal";
import ProcessFormModal from "../modals/ProcessFormModal";
import { BRAND_TEAL } from "../constants";

const ProcessManageBar = ({
  processes,
  onCreateProcess,
  onUpdateProcess,
  onDeleteProcess,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingProcess, setEditingProcess] = useState(null);
  const [deletingProcess, setDeletingProcess] = useState(null);

  const handleCreate = async (data) => {
    await onCreateProcess(data);
  };

  const handleUpdate = async (data) => {
    if (editingProcess) {
      await onUpdateProcess(editingProcess.id, data);
    }
  };

  return (
    <>
      <style jsx>{`
        .process-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 0;
          flex-wrap: wrap;
        }
        .process-bar-label {
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          margin-right: 4px;
          white-space: nowrap;
        }
        .process-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 12px;
          border-radius: 20px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          font-size: 12px;
          font-weight: 500;
          color: #166534;
          transition: all 0.15s ease;
        }
        .process-pill:hover {
          background: #dcfce7;
        }
        .process-pill-action {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.15s ease;
        }
        .process-pill-action:hover {
          background: rgba(0,0,0,0.08);
          color: #1f2937;
        }
        .process-pill-action.delete:hover {
          background: #fee2e2;
          color: #dc2626;
        }
        .add-process-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 5px 14px;
          border-radius: 20px;
          border: 1px dashed #d1d5db;
          background: transparent;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .add-process-btn:hover {
          border-color: ${BRAND_TEAL};
          color: ${BRAND_TEAL};
          background: ${BRAND_TEAL}08;
        }
      `}</style>

      <div className="process-bar">
        <span className="process-bar-label">Processes:</span>
        {processes.map((proc) => (
          <span key={proc.id} className="process-pill">
            {proc.name}
            <button
              className="process-pill-action"
              onClick={(e) => {
                e.stopPropagation();
                setEditingProcess(proc);
              }}
              title="Edit process"
            >
              <BsPencil size={10} />
            </button>
            <button
              className="process-pill-action delete"
              onClick={(e) => {
                e.stopPropagation();
                setDeletingProcess(proc);
              }}
              title="Delete process"
            >
              <BsX size={14} />
            </button>
          </span>
        ))}
        <button
          className="add-process-btn"
          onClick={() => setShowCreateModal(true)}
        >
          <BsPlus size={16} /> Add Process
        </button>
      </div>

      <ProcessFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
      />

      <ProcessFormModal
        isOpen={!!editingProcess}
        onClose={() => setEditingProcess(null)}
        onSave={handleUpdate}
        editingProcess={editingProcess}
      />

      <ConfirmationModal
        isOpen={!!deletingProcess}
        onClose={() => setDeletingProcess(null)}
        onConfirm={async () => {
          if (deletingProcess) {
            await onDeleteProcess(deletingProcess.id);
            setDeletingProcess(null);
          }
        }}
        title="Delete Process"
        description={`Are you sure you want to delete the process <strong>"${deletingProcess?.name}"</strong>? This cannot be undone.\\n\\nNote: Processes with active workflows or pending approvals cannot be deleted.`}
        confirmButtonColor="danger"
        confirmButtonText="Delete"
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default ProcessManageBar;
