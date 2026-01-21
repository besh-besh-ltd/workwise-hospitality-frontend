import React from 'react';
import { Accordion, Badge } from 'react-bootstrap';
import moment from 'moment';
import {
  BsCheckCircleFill,
  BsCircleFill,
  BsXCircleFill,
  BsClockFill
} from 'react-icons/bs';
import StageAuthorityApproval from './stages/StageAuthorityApproval';
import StagePublication from './stages/StagePublication';
import StageQuotesReceived from './stages/StageQuotesReceived';
import StageTechnicalEval from './stages/StageTechnicalEval';
import StageNegotiation from './stages/StageNegotiation';
import StageQuoteFinalization from './stages/StageQuoteFinalization';
import StageArcReview from './stages/StageArcReview';

const statusConfig = {
  completed: {
    icon: BsCheckCircleFill,
    color: '#198754',
    bgColor: '#d1e7dd',
    badgeVariant: 'success',
    label: 'Completed'
  },
  active: {
    icon: BsCircleFill,
    color: '#0d6efd',
    bgColor: '#cfe2ff',
    badgeVariant: 'primary',
    label: 'In Progress'
  },
  pending: {
    icon: BsClockFill,
    color: '#6c757d',
    bgColor: '#f8f9fa',
    badgeVariant: 'secondary',
    label: 'Pending'
  },
  rejected: {
    icon: BsXCircleFill,
    color: '#dc3545',
    bgColor: '#f8d7da',
    badgeVariant: 'danger',
    label: 'Rejected'
  }
};

const stageComponents = {
  AUTHORITY_APPROVAL: StageAuthorityApproval,
  PUBLISHED: StagePublication,
  QUOTES_RECEIVED: StageQuotesReceived,
  TECH_EVAL: StageTechnicalEval,
  NEGOTIATION: StageNegotiation,
  QUOTE_FINALIZED: StageQuoteFinalization,
  ARC_REVIEW: StageArcReview
};

const StageTimeline = ({
  stages = [],
  currentStage,
  rfq,
  lifecycleData,
  activeStageKey,
  onStageToggle,
  onRefresh,
  arcHandlers
}) => {
  // Filter out COMPLETED if pending
  const visibleStages = stages.filter(stage => {
    if (stage.key === 'COMPLETED' && stage.status === 'pending') {
      return false;
    }
    return true;
  });

  const handleAccordionSelect = (eventKey) => {
    if (onStageToggle) {
      onStageToggle(eventKey);
    }
  };

  // Determine default active keys (current stage + recent completed stages)
  const defaultActiveKey = currentStage || null;

  return (
    <div className="stage-timeline">
      <style jsx global>{`
        .stage-timeline .accordion-item {
          border: none;
          margin-bottom: 0;
          border-left: 3px solid #dee2e6;
          margin-left: 17px;
          padding-left: 20px;
          position: relative;
        }
        .stage-timeline .accordion-item:last-child {
          border-left-color: transparent;
        }
        .stage-timeline .accordion-item.stage-completed {
          border-left-color: #198754;
        }
        .stage-timeline .accordion-item.stage-active {
          border-left-color: #0d6efd;
        }
        .stage-timeline .stage-marker {
          position: absolute;
          left: -27px;
          top: 14px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2;
          background: white;
        }
        .stage-timeline .accordion-button {
          padding: 1rem;
          background: transparent;
          border-radius: 8px !important;
          margin-bottom: 0.5rem;
        }
        .stage-timeline .accordion-button:not(.collapsed) {
          background: #f8f9fa;
          box-shadow: none;
        }
        .stage-timeline .accordion-button:focus {
          box-shadow: none;
        }
        .stage-timeline .accordion-body {
          padding: 0 1rem 1.5rem 1rem;
        }
        .stage-timeline .stage-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding-right: 1rem;
        }
        .stage-timeline .stage-title {
          font-weight: 600;
          font-size: 0.95rem;
          color: #212529;
          margin-bottom: 2px;
        }
        .stage-timeline .stage-meta {
          font-size: 0.8rem;
          color: #6c757d;
        }
        .stage-timeline .accordion-item.stage-active .accordion-button {
          background: #e8f4fd;
          border: 1px solid #b6d4fe;
        }
        /* Fix nested approval workflow accordion styles */
        .stage-timeline .accordion-body .accordion {
          margin-top: 0.5rem;
        }
        .stage-timeline .accordion-body .accordion-item {
          border: 1px solid #dee2e6;
          border-left: 3px solid #dee2e6;
          margin-left: 0;
          padding-left: 0;
          margin-bottom: 0.5rem;
          border-radius: 8px !important;
        }
        .stage-timeline .accordion-body .accordion-item:last-child {
          border-left-color: #dee2e6;
        }
        .stage-timeline .accordion-body .accordion-button {
          padding: 0.75rem 1rem;
          background: #f8f9fa;
          font-size: 0.875rem;
          border-radius: 8px !important;
          margin-bottom: 0;
        }
        .stage-timeline .accordion-body .accordion-button:not(.collapsed) {
          background: #e9ecef;
          border-bottom-left-radius: 0 !important;
          border-bottom-right-radius: 0 !important;
        }
        .stage-timeline .accordion-body .accordion-body {
          padding: 1rem;
          background: #fff;
        }
        .stage-timeline .accordion-body .stage-marker {
          display: none;
        }
      `}</style>

      <h5 className="mb-3 text-secondary fw-normal" style={{ fontSize: '0.9rem', marginLeft: '40px' }}>
        Stage Timeline
      </h5>

      <Accordion
        activeKey={activeStageKey || defaultActiveKey}
        onSelect={handleAccordionSelect}
        flush
      >
        {visibleStages.map((stage, index) => {
          const config = statusConfig[stage.status] || statusConfig.pending;
          const StatusIcon = config.icon;
          const StageComponent = stageComponents[stage.key];

          return (
            <Accordion.Item
              key={stage.key}
              eventKey={stage.key}
              className={`stage-${stage.status}`}
            >
              {/* Stage marker dot */}
              <div
                className="stage-marker"
                style={{
                  border: `2px solid ${config.color}`,
                  backgroundColor: config.bgColor
                }}
              >
                <StatusIcon size={12} style={{ color: config.color }} />
              </div>

              <Accordion.Header>
                <div className="stage-header-content">
                  <div>
                    <div className="stage-title">
                      {stage.label}
                    </div>
                    <div className="stage-meta">
                      {stage.timestamp ? (
                        <>
                          {stage.actor && <span>{stage.actor} &middot; </span>}
                          {moment(stage.timestamp).format('DD MMM YYYY, HH:mm')}
                        </>
                      ) : (
                        <span className="text-muted fst-italic">Not started</span>
                      )}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg={config.badgeVariant}>
                      {config.label}
                    </Badge>
                  </div>
                </div>
              </Accordion.Header>

              <Accordion.Body>
                {StageComponent ? (
                  <StageComponent
                    stage={stage}
                    rfq={rfq}
                    lifecycleData={lifecycleData}
                    onRefresh={onRefresh}
                    arcHandlers={stage.key === 'ARC_REVIEW' ? arcHandlers : undefined}
                  />
                ) : (
                  <div className="text-muted small">
                    No details available for this stage.
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          );
        })}
      </Accordion>
    </div>
  );
};

export default StageTimeline;
