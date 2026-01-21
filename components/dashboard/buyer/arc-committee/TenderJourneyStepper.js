import React from 'react';
import moment from 'moment';
import {
  BsCheckCircleFill,
  BsCircleFill,
  BsXCircleFill,
  BsCircle
} from 'react-icons/bs';

const statusConfig = {
  completed: {
    icon: BsCheckCircleFill,
    color: '#198754',
    bgColor: '#d1e7dd',
    borderColor: '#198754'
  },
  active: {
    icon: BsCircleFill,
    color: '#0d6efd',
    bgColor: '#cfe2ff',
    borderColor: '#0d6efd',
    pulse: true
  },
  pending: {
    icon: BsCircle,
    color: '#6c757d',
    bgColor: '#f8f9fa',
    borderColor: '#dee2e6'
  },
  rejected: {
    icon: BsXCircleFill,
    color: '#dc3545',
    bgColor: '#f8d7da',
    borderColor: '#dc3545'
  }
};

const TenderJourneyStepper = ({ stages = [], currentStage, onStageClick }) => {
  // Filter to show only relevant stages (skip COMPLETED if not reached)
  const visibleStages = stages.filter(stage => {
    if (stage.key === 'COMPLETED' && stage.status === 'pending') {
      return false;
    }
    return true;
  });

  const handleStageClick = (stageKey) => {
    if (onStageClick) {
      onStageClick(stageKey);
    }
  };

  return (
    <div className="tender-journey-stepper mb-4">
      <style jsx>{`
        .tender-journey-stepper {
          background: #fff;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          overflow-x: auto;
        }
        .stepper-container {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          min-width: fit-content;
          position: relative;
        }
        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 100px;
          max-width: 150px;
          position: relative;
          cursor: pointer;
          transition: transform 0.2s ease;
        }
        .step-item:hover {
          transform: translateY(-2px);
        }
        .step-connector {
          position: absolute;
          top: 18px;
          left: calc(50% + 18px);
          right: calc(-50% + 18px);
          height: 3px;
          background: #dee2e6;
          z-index: 0;
        }
        .step-connector.completed {
          background: #198754;
        }
        .step-connector.active {
          background: linear-gradient(90deg, #198754 0%, #0d6efd 100%);
        }
        .step-icon-wrapper {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          transition: all 0.3s ease;
        }
        .step-icon-wrapper.pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(13, 110, 253, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(13, 110, 253, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(13, 110, 253, 0);
          }
        }
        .step-label {
          margin-top: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          text-align: center;
          color: #495057;
          line-height: 1.2;
        }
        .step-label.active {
          color: #0d6efd;
        }
        .step-label.completed {
          color: #198754;
        }
        .step-date {
          margin-top: 4px;
          font-size: 0.65rem;
          color: #6c757d;
          text-align: center;
        }
        .step-current-badge {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: #0d6efd;
          color: white;
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
          white-space: nowrap;
        }
      `}</style>

      <div className="stepper-container">
        {visibleStages.map((stage, index) => {
          const config = statusConfig[stage.status] || statusConfig.pending;
          const StatusIcon = config.icon;
          const isLast = index === visibleStages.length - 1;
          const isCurrent = stage.key === currentStage;

          // Determine connector status
          let connectorClass = '';
          if (stage.status === 'completed') {
            connectorClass = 'completed';
          } else if (stage.status === 'active') {
            connectorClass = 'active';
          }

          return (
            <div
              key={stage.key}
              className="step-item"
              onClick={() => handleStageClick(stage.key)}
            >
              {/* Connector line to next step */}
              {!isLast && (
                <div className={`step-connector ${connectorClass}`} />
              )}

              {/* Current badge */}
              {isCurrent && (
                <span className="step-current-badge">CURRENT</span>
              )}

              {/* Icon wrapper */}
              <div
                className={`step-icon-wrapper ${config.pulse ? 'pulse' : ''}`}
                style={{
                  backgroundColor: config.bgColor,
                  border: `2px solid ${config.borderColor}`
                }}
              >
                <StatusIcon size={16} style={{ color: config.color }} />
              </div>

              {/* Label */}
              <span className={`step-label ${stage.status}`}>
                {stage.shortLabel}
              </span>

              {/* Date */}
              {stage.timestamp && (
                <span className="step-date">
                  {moment(stage.timestamp).format('DD MMM')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TenderJourneyStepper;
