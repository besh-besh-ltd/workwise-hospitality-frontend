import React, { useState } from "react";
import Select from "react-select";
import { BsPlus, BsInfoCircle } from "react-icons/bs";
import ProcessFormModal from "../modals/ProcessFormModal";
import { BRAND_TEAL } from "../constants";

const processTypeLabel = (t) => {
  if (!t) return "";
  const u = (t || "").toUpperCase();
  if (u === "RFQ") return "RFQ (RFQ → Tech → Quote → PO)";
  if (u === "TENDER" || u === "ARC") return "Tender / ARC (Tender → Tech → Quote → ARC)";
  return u;
};

const StepSelectProcessOnly = ({
  selectedProcessId,
  processes,
  onChange,
  onCreateProcess,
  isEditing = false,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const processOptions = (processes || []).map((p) => ({
    value: p.id,
    label: p.name,
    description: p.description,
    process_type: p.process_type,
  }));

  const selectedOption = selectedProcessId
    ? processOptions.find((o) => o.value === selectedProcessId) || null
    : null;

  const handleCreate = async (data) => {
    const newProcess = await onCreateProcess(data);
    if (newProcess?.id) {
      onChange(newProcess.id);
    }
  };

  const formatOptionLabel = (option) => (
    <div>
      <div style={{ fontWeight: 500 }}>{option.label}</div>
      <div style={{ fontSize: "11px", color: "#6b7280" }}>
        {option.process_type && (
          <span style={{ marginRight: 6 }}>{processTypeLabel(option.process_type)}</span>
        )}
        {option.description}
      </div>
    </div>
  );

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
          margin-bottom: 24px;
        }
        .info-box {
          background: #e8f5f6;
          border: 1px solid rgba(21, 137, 147, 0.3);
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 24px;
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }
        .info-box p {
          margin: 0;
          font-size: 13px;
          color: #0f766e;
          line-height: 1.5;
        }
        .process-select-area {
          max-width: 520px;
        }
        .create-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          font-weight: 500;
          color: ${BRAND_TEAL};
          cursor: pointer;
          border: none;
          background: none;
          padding: 0;
          margin-top: 12px;
        }
        .create-link:hover {
          text-decoration: underline;
        }
      `}</style>

      <h4 className="step-heading">Select Process</h4>
      <p className="step-subtext">
        Choose the process. Stages will follow <strong>RFQ → Tech → Quote → PO</strong> for RFQ
        processes, or <strong>Tender → Tech → Quote → ARC</strong> for Tender/ARC processes.
      </p>

      <div className="info-box">
        <BsInfoCircle size={18} style={{ color: BRAND_TEAL, flexShrink: 0, marginTop: "2px" }} />
        <p>
          All process types are listed. <strong>RFQ</strong> processes use the RFQ → PO flow;
          <strong> Tender / ARC</strong> processes use the Tender → ARC flow (same middle steps).
        </p>
      </div>

      <div className="process-select-area">
        <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
          Process <span className="text-danger">*</span>
        </label>
        <Select
          options={processOptions}
          value={selectedOption}
          onChange={(option) => onChange(option?.value || null)}
          placeholder="Choose a process..."
          isClearable={!isEditing}
          isDisabled={isEditing}
          formatOptionLabel={formatOptionLabel}
          menuPlacement="auto"
          menuPortalTarget={typeof document !== "undefined" ? document.body : null}
          menuPosition="fixed"
          maxMenuHeight={280}
          styles={{
            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
          }}
        />

        {!isEditing && (
          <button
            type="button"
            className="create-link"
            onClick={() => setShowCreateModal(true)}
          >
            <BsPlus size={16} /> Create New Process
          </button>
        )}
        {isEditing && (
          <small className="text-muted d-block mt-2" style={{ fontSize: "12px" }}>
            Process cannot be changed when editing. Create a new workflow to use a different process.
          </small>
        )}
      </div>

      <ProcessFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
      />
    </div>
  );
};

export default StepSelectProcessOnly;
