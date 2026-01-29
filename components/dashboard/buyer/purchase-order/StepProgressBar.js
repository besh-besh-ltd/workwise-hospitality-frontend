import React from 'react';
import { BsCheckLg } from 'react-icons/bs';

const StepProgressBar = ({ currentStep, totalSteps, status }) => {
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';

  return (
    <div className="step-progress-container d-flex align-items-center justify-content-center my-3">
      {Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i + 1;
        const isCompleted = isApproved ? true : stepNum < currentStep;
        const isCurrent = !isApproved && !isRejected && stepNum === currentStep;
        const isPending = stepNum > currentStep && !isApproved;

        return (
          <React.Fragment key={stepNum}>
            {/* Step Circle */}
            <div
              className="step-circle-wrapper d-flex flex-column align-items-center"
              style={{ position: 'relative' }}
            >
              <div
                className={`step-circle d-flex align-items-center justify-content-center`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  transition: 'all 0.3s ease',
                  ...(isCompleted && {
                    backgroundColor: '#d1e7dd',
                    color: '#198754',
                    border: '2px solid #198754',
                  }),
                  ...(isCurrent && {
                    backgroundColor: '#fff3cd',
                    color: '#856404',
                    border: '2px solid #ffc107',
                    boxShadow: '0 0 0 4px rgba(255, 193, 7, 0.25)',
                    animation: 'pulse-step 2s infinite',
                  }),
                  ...(isPending && {
                    backgroundColor: '#f8f9fa',
                    color: '#6c757d',
                    border: '2px solid #dee2e6',
                  }),
                  ...(isRejected && stepNum === currentStep && {
                    backgroundColor: '#f8d7da',
                    color: '#dc3545',
                    border: '2px solid #dc3545',
                  }),
                }}
              >
                {isCompleted ? <BsCheckLg size={14} /> : stepNum}
              </div>
              <span
                className="step-label mt-1"
                style={{
                  fontSize: '0.7rem',
                  color: isCurrent ? '#856404' : isCompleted ? '#198754' : '#6c757d',
                  fontWeight: isCurrent ? 600 : 400,
                }}
              >
                Step {stepNum}
              </span>
            </div>

            {/* Connector (except last) */}
            {stepNum < totalSteps && (
              <div
                className="step-connector mx-1"
                style={{
                  flex: 1,
                  height: 3,
                  minWidth: 40,
                  maxWidth: 80,
                  marginBottom: 18,
                  borderRadius: 2,
                  background: isCompleted || (isCurrent && stepNum < currentStep)
                    ? 'linear-gradient(90deg, #198754 0%, #198754 100%)'
                    : isCurrent
                    ? 'linear-gradient(90deg, #ffc107 0%, #dee2e6 100%)'
                    : '#dee2e6',
                  transition: 'background 0.3s ease',
                }}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Keyframe animation */}
      <style jsx>{`
        @keyframes pulse-step {
          0% {
            box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.25);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(255, 193, 7, 0.15);
          }
          100% {
            box-shadow: 0 0 0 4px rgba(255, 193, 7, 0.25);
          }
        }
      `}</style>
    </div>
  );
};

export default StepProgressBar;
