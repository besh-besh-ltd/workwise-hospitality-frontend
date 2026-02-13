import React from "react";
import { entityTypes, BRAND_TEAL, BRAND_TEAL_LIGHT } from "../constants";

const StepSelectEntityType = ({ selectedEntityType, onChange, isEditing = false }) => {
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
        .entity-card {
          border: 2px solid #e5e7eb;
          border-radius: 10px;
          padding: 20px 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #fff;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .entity-card:hover {
          border-color: ${BRAND_TEAL};
          box-shadow: 0 2px 8px rgba(21, 137, 147, 0.12);
        }
        .entity-card.selected {
          border-color: ${BRAND_TEAL};
          background: ${BRAND_TEAL_LIGHT};
          box-shadow: 0 0 0 3px ${BRAND_TEAL}20;
        }
        .entity-card.disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .entity-card-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .entity-card-label {
          font-size: 14px;
          font-weight: 600;
          color: #1a1a1a;
          line-height: 1.2;
        }
        .entity-card-desc {
          font-size: 12px;
          color: #6b7280;
        }
      `}</style>

      <h4 className="step-heading">What type of document needs approval?</h4>
      <p className="step-subtext">
        Select the document type this approval workflow will apply to.
      </p>

      <div className="row g-3">
        {entityTypes.map((entity) => {
          const Icon = entity.icon;
          const isSelected = selectedEntityType === entity.value;

          return (
            <div key={entity.value} className="col-6 col-md-4">
              <div
                className={`entity-card ${isSelected ? "selected" : ""} ${isEditing ? "disabled" : ""}`}
                onClick={() => {
                  if (!isEditing) onChange(entity.value);
                }}
              >
                <div
                  className="entity-card-icon"
                  style={{
                    backgroundColor: `${entity.color}15`,
                    color: entity.color,
                  }}
                >
                  <Icon size={22} />
                </div>
                <div>
                  <div className="entity-card-label">{entity.label}</div>
                  <div className="entity-card-desc">{entity.description}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isEditing && (
        <div className="alert alert-info mt-3 mb-0 d-flex align-items-center gap-2" style={{ fontSize: "13px", borderRadius: "8px" }}>
          <i className="bi bi-info-circle"></i>
          Document type cannot be changed when editing an existing workflow.
        </div>
      )}
    </div>
  );
};

export default StepSelectEntityType;
