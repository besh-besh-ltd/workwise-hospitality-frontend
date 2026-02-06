import React from 'react';
import moment from 'moment';
import {
  BsCheckCircleFill,
  BsCircleFill,
  BsXCircleFill,
  BsCircle,
  BsArrowCounterclockwise
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
  },
  reverted: {
    icon: BsArrowCounterclockwise,
    color: '#fd7e14',
    bgColor: '#fff3cd',
    borderColor: '#fd7e14'
  }
};

const TenderJourneyStepper = ({ stages = [], currentStage, onStageClick, revertHistory = [], refreshing = false }) => {
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
    <div className={`tender-journey-stepper mb-4 ${refreshing ? 'refreshing' : ''}`}>
      <style jsx>{`
        .tender-journey-stepper {
          background: #fff;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          overflow-x: auto;
          position: relative;
          transition: opacity 0.3s ease;
        }
        .tender-journey-stepper.refreshing {
          pointer-events: none;
        }
        .tender-journey-stepper.refreshing::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #0d6efd, #198754, #0d6efd);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .refreshing-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
          border-radius: 8px;
        }
        .refreshing-text {
          background: #0d6efd;
          color: white;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .refreshing-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
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
        .step-redo-badge {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          background: #fd7e14;
          color: white;
          font-size: 0.6rem;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
          white-space: nowrap;
        }
        .step-connector.needs-redo {
          background: linear-gradient(90deg, #fd7e14 0%, #ffc107 100%);
        }
        .step-icon-wrapper.needs-redo {
          animation: pulse-orange 2s infinite;
        }
        @keyframes pulse-orange {
          0% {
            box-shadow: 0 0 0 0 rgba(253, 126, 20, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(253, 126, 20, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(253, 126, 20, 0);
          }
        }
      `}</style>

      {refreshing && (
        <div className="refreshing-overlay">
          <span className="refreshing-text">
            <span className="refreshing-spinner"></span>
            Updating Progress...
          </span>
        </div>
      )}

      <div className="stepper-container">
        {visibleStages.map((stage, index) => {
          // Check if this stage needs redo
          const needsRedo = stage.needsRedo;
          const isRevertTarget = revertHistory.length > 0 &&
            revertHistory[revertHistory.length - 1]?.targetStageKey === stage.key;

          // Use revert config if needs redo
          const effectiveStatus = needsRedo ? 'reverted' : stage.status;
          const config = statusConfig[effectiveStatus] || statusConfig.pending;
          const StatusIcon = needsRedo ? BsArrowCounterclockwise : config.icon;
          const isLast = index === visibleStages.length - 1;
          const isCurrent = stage.key === currentStage;

          // Determine connector status
          let connectorClass = '';
          if (needsRedo) {
            connectorClass = 'needs-redo';
          } else if (stage.status === 'completed') {
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

              {/* Redo badge for revert target with iteration count */}
              {isRevertTarget && (
                <span className="step-redo-badge">REDO #{revertHistory.length}</span>
              )}

              {/* Current badge (only if not redo target, and not completed) */}
              {isCurrent && !isRevertTarget && stage.key !== 'COMPLETED' && (
                <span className="step-current-badge">CURRENT</span>
              )}
              {/* Done badge for completed terminal stage */}
              {stage.key === 'COMPLETED' && stage.status === 'completed' && (
                <span className="step-current-badge" style={{ background: '#198754' }}>DONE</span>
              )}

              {/* Icon wrapper */}
              <div
                className={`step-icon-wrapper ${config.pulse ? 'pulse' : ''} ${needsRedo ? 'needs-redo' : ''}`}
                style={{
                  backgroundColor: needsRedo ? '#fff3cd' : config.bgColor,
                  border: `2px solid ${needsRedo ? '#fd7e14' : config.borderColor}`
                }}
              >
                <StatusIcon size={16} style={{ color: needsRedo ? '#fd7e14' : config.color }} />
              </div>

              {/* Label */}
              <span className={`step-label ${needsRedo ? '' : stage.status}`} style={needsRedo ? { color: '#fd7e14' } : {}}>
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
