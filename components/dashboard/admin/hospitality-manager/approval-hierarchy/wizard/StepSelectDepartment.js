import React from "react";
import Select from "react-select";
import { BsInfoCircle } from "react-icons/bs";
import { BRAND_TEAL } from "../constants";

const StepSelectDepartment = ({ selectedDepartmentId, departments, onChange }) => {
  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: d.title || d.name,
  }));

  const selectedOption = selectedDepartmentId
    ? departmentOptions.find((o) => o.value === selectedDepartmentId) || null
    : null;

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
        .dept-select-area {
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
      `}</style>

      <h4 className="step-heading">Assign to a Department (Optional)</h4>
      <p className="step-subtext">
        Select a department for this workflow, or skip to add it to the "No Department Selected" category.
      </p>

      <div className="info-box">
        <BsInfoCircle size={18} style={{ color: "#3b82f6", flexShrink: 0, marginTop: "2px" }} />
        <p>
          Departments let you have different approval workflows for the same document type
          within different organizational units. For example, the <strong>"Finance"</strong> department
          can have a different Tender approval hierarchy than <strong>"Operations"</strong>.
        </p>
      </div>

      <div className="dept-select-area">
        <label className="form-label fw-semibold" style={{ fontSize: "13px" }}>
          Select Department
        </label>
        <Select
          options={departmentOptions}
          value={selectedOption}
          onChange={(option) => onChange(option?.value || null)}
          placeholder="Choose a department..."
          isClearable
          menuPlacement="auto"
        />

        <div className="d-flex justify-content-between align-items-center flex-wrap">
          {selectedDepartmentId && (
            <button className="skip-link" onClick={() => onChange(null)}>
              Clear selection (use No Department)
            </button>
          )}
          {!selectedDepartmentId && (
            <button className="skip-link" onClick={() => onChange(null)}>
              Skip — add to No Department
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepSelectDepartment;
