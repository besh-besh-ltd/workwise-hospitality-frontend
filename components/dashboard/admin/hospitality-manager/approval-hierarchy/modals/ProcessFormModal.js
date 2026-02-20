import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import { BRAND_TEAL, PROCESS_TYPES } from "../constants";

const PROCESS_TYPE_OPTIONS = [
  { value: PROCESS_TYPES.RFQ, label: "RFQ (RFQ → Tech → Negotiation → Neg. Quote → PO)" },
  { value: PROCESS_TYPES.TENDER, label: "Tender (Tender → Tech → Negotiation → Neg. Quote → ARC)" },
  { value: PROCESS_TYPES.ARC, label: "ARC (Tender → Tech → Negotiation → Neg. Quote → ARC)" },
];

const ProcessFormModal = ({ isOpen, onClose, onSave, editingProcess = null }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [process_type, setProcess_type] = useState(PROCESS_TYPES.RFQ);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editingProcess) {
        setName(editingProcess.name || "");
        setDescription(editingProcess.description || "");
        setProcess_type(editingProcess.process_type || PROCESS_TYPES.RFQ);
      } else {
        setName("");
        setDescription("");
        setProcess_type(PROCESS_TYPES.RFQ);
      }
      setSaving(false);
    }
  }, [isOpen, editingProcess]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || null,
        process_type: process_type || PROCESS_TYPES.RFQ,
      });
      onClose();
    } catch (error) {
      // Error toast handled by parent hook
    } finally {
      setSaving(false);
    }
  };

  const isEdit = !!editingProcess;

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={saving ? undefined : onClose}
      ariaHideApp={false}
      contentLabel={isEdit ? "Edit Process" : "Create Process"}
      shouldCloseOnOverlayClick={!saving}
      shouldCloseOnEsc={!saving}
      style={{
        overlay: {
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          zIndex: 9999,
        },
        content: {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: "480px",
          width: "90%",
          border: "none",
          background: "#fff",
          overflow: "hidden",
          padding: "0",
          borderRadius: "12px",
          maxHeight: "95vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header - Fixed */}
      <div style={{ borderBottom: "1px solid #e5e7eb", padding: "16px 20px", flexShrink: 0 }}>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0 fw-bold" style={{ fontSize: "18px" }}>
            {isEdit ? "Edit Process" : "Create Process"}
          </h5>
          <button
            type="button"
            className="btn-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          />
        </div>
      </div>

      {/* Content - Dynamic shrinking */}
      <div style={{ padding: "20px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div className="mb-3" style={{ flexShrink: 0 }}>
          <label className="form-label fw-semibold" style={{ fontSize: "13px", marginBottom: "6px" }}>
            Process Name <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Renovation, Day to Day Procurement"
            maxLength={100}
            autoFocus
            style={{ borderRadius: "6px" }}
          />
        </div>
        {!isEdit && (
          <div className="mb-3" style={{ flexShrink: 0 }}>
            <label className="form-label fw-semibold" style={{ fontSize: "13px", marginBottom: "6px" }}>
              Process type
            </label>
            <select
              className="form-select"
              value={process_type}
              onChange={(e) => setProcess_type(e.target.value)}
              style={{ borderRadius: "6px" }}
            >
              {PROCESS_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <label className="form-label fw-semibold" style={{ fontSize: "13px", marginBottom: "6px", flexShrink: 0 }}>
            Description <span className="text-muted fw-normal">(optional)</span>
          </label>
          <textarea
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this process..."
            maxLength={500}
            style={{ borderRadius: "6px", resize: "none", flex: 1, minHeight: "60px" }}
          />
          <small className="text-muted d-block text-end mt-1" style={{ flexShrink: 0 }}>{description.length}/500</small>
        </div>
      </div>

      {/* Footer - Fixed */}
      <div
        className="d-flex justify-content-end gap-2"
        style={{ borderTop: "1px solid #e5e7eb", padding: "14px 20px", flexShrink: 0 }}
      >
        <button
          className="btn btn-outline-secondary"
          onClick={onClose}
          disabled={saving}
          style={{ borderRadius: "6px", padding: "8px 20px", fontSize: "13px" }}
        >
          Cancel
        </button>
        <button
          className="btn"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          style={{
            backgroundColor: BRAND_TEAL,
            borderColor: BRAND_TEAL,
            color: "#fff",
            borderRadius: "6px",
            padding: "8px 20px",
            fontSize: "13px",
            opacity: saving || !name.trim() ? 0.65 : 1,
          }}
        >
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Saving...
            </>
          ) : isEdit ? (
            "Update Process"
          ) : (
            "Create Process"
          )}
        </button>
      </div>
    </Modal>
  );
};

export default ProcessFormModal;
