import React, { useState } from "react";
import Select from "react-select";
import { BsPlus, BsInfoCircle } from "react-icons/bs";
import ProcessFormModal from "../modals/ProcessFormModal";
import { BRAND_TEAL } from "../constants";

const StepSelectProcess = ({ selectedProcessId, processes, onChange, onCreateProcess }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const processOptions = processes.map((p) => ({
    value: p.id,
    label: p.name,
    description: p.description,
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
      {option.description && (
        <div style={{ fontSize: "11px", color: "#6b7280" }}>{option.description}</div>
      )}
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
          background: #eff6ff;
          border: 1px solid #bfdbfe;
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
          color: #1e40af;
          line-height: 1.5;
        }
        .process-select-area {
          max-width: 500px;
        }
        .skip-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #6b7280;
          cursor: pointer;
          border: none;
          background: none;
          padding: 0;
          margin-top: 12px;
          text-decoration: underline;
          text-decoration-style: dashed;
          text-underline-offset: 3px;
        }
        .skip-link:hover {
          color: #374151;
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

      <h4 className="step-heading">Assign to a Process (Optional)</h4>
      <p className="step-subtext">
        Group this workflow under a process, or skip to add it to the "No Process Selected" category.
      </p>

      <div className="info-box">
        <BsInfoCircle size={18} style={{ color: "#3b82f6", flexShrink: 0, marginTop: "2px" }} />
        <p>
          Processes let you have different approval workflows for the same document type.
          For example, Tender approvals for <strong>"Renovation"</strong> projects can follow
          a different hierarchy than <strong>"Day to Day"</strong> procurement.
        </p>
      </div>

      <div className="process-select-area">
        <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
          Select Process
        </label>
        <Select
          options={processOptions}
          value={selectedOption}
          onChange={(option) => onChange(option?.value || null)}
          placeholder="Choose a process..."
          isClearable
          formatOptionLabel={formatOptionLabel}
          menuPlacement="auto"
        />

        <div className="d-flex justify-content-between align-items-center flex-wrap">
          <button className="create-link" onClick={() => setShowCreateModal(true)}>
            <BsPlus size={16} /> Create New Process
          </button>
          {selectedProcessId && (
            <button className="skip-link" onClick={() => onChange(null)}>
              Clear selection (use No Process)
            </button>
          )}
          {!selectedProcessId && (
            <button className="skip-link" onClick={() => onChange(null)}>
              Skip — add to No Process
            </button>
          )}
        </div>
      </div>

      <ProcessFormModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreate}
      />
    </div>
  );
};

export default StepSelectProcess;
