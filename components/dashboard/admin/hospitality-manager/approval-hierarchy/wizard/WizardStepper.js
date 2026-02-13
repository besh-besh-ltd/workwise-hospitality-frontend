import React from "react";
import { BsCheckCircleFill, BsCircleFill, BsCircle } from "react-icons/bs";
import { BRAND_TEAL } from "../constants";

const steps = [
  { key: 1, label: "Document Type" },
  { key: 2, label: "Department" },
  { key: 3, label: "Process" },
  { key: 4, label: "Configure" },
  { key: 5, label: "Review" },
];

const WizardStepper = ({ currentStep }) => {
  return (
    <div className="wizard-stepper">
      <style jsx>{`
        .wizard-stepper {
          background: #fff;
          border-radius: 10px;
          padding: 24px 20px;
          margin-bottom: 24px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
          border: 1px solid #e5e7eb;
        }
        .stepper-container {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          max-width: 720px;
          margin: 0 auto;
        }
        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          position: relative;
          min-width: 80px;
        }
        .step-connector {
          position: absolute;
          top: 16px;
          left: calc(50% + 16px);
          right: calc(-50% + 16px);
          height: 3px;
          background: #e5e7eb;
          z-index: 0;
          border-radius: 2px;
        }
        .step-connector.completed {
          background: ${BRAND_TEAL};
        }
        .step-connector.active {
          background: linear-gradient(90deg, ${BRAND_TEAL} 0%, #e5e7eb 100%);
        }
        .step-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          transition: all 0.3s ease;
          font-size: 13px;
          font-weight: 700;
        }
        .step-icon-wrapper.completed {
          background: ${BRAND_TEAL}1A;
          border: 2px solid ${BRAND_TEAL};
          color: ${BRAND_TEAL};
        }
        .step-icon-wrapper.active {
          background: ${BRAND_TEAL};
          border: 2px solid ${BRAND_TEAL};
          color: #fff;
          box-shadow: 0 0 0 4px ${BRAND_TEAL}20;
        }
        .step-icon-wrapper.pending {
          background: #f9fafb;
          border: 2px solid #d1d5db;
          color: #9ca3af;
        }
        .step-label {
          margin-top: 8px;
          font-size: 11px;
          font-weight: 600;
          text-align: center;
          color: #9ca3af;
          line-height: 1.2;
        }
        .step-label.completed {
          color: ${BRAND_TEAL};
        }
        .step-label.active {
          color: ${BRAND_TEAL};
        }
      `}</style>

      <div className="stepper-container">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.key;
          const isActive = currentStep === step.key;
          const isLast = index === steps.length - 1;

          let connectorClass = "";
          if (isCompleted) connectorClass = "completed";
          else if (isActive) connectorClass = "active";

          let iconClass = "pending";
          if (isCompleted) iconClass = "completed";
          else if (isActive) iconClass = "active";

          return (
            <div key={step.key} className="step-item">
              {!isLast && <div className={`step-connector ${connectorClass}`} />}

              <div className={`step-icon-wrapper ${iconClass}`}>
                {isCompleted ? (
                  <BsCheckCircleFill size={18} />
                ) : (
                  step.key
                )}
              </div>

              <span className={`step-label ${iconClass}`}>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WizardStepper;
