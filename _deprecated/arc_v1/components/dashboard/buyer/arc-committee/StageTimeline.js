import React from 'react';
import { Accordion, Badge, Alert } from 'react-bootstrap';
import moment from 'moment';
import {
  BsCheckCircleFill,
  BsCircleFill,
  BsXCircleFill,
  BsClockFill,
  BsArrowCounterclockwise,
  BsTrophyFill,
  BsFileEarmarkTextFill,
  BsDownload
} from 'react-icons/bs';
import StageAuthorityApproval from './stages/StageAuthorityApproval';
import StagePublication from './stages/StagePublication';
import StageQuotesReceived from './stages/StageQuotesReceived';
import StageTechnicalEval from './stages/StageTechnicalEval';
import StageNegotiation from './stages/StageNegotiation';
import StageQuoteFinalization from './stages/StageQuoteFinalization';
import StageArcReview from './stages/StageArcReview';

/**
 * Inline component for the COMPLETED stage in the timeline accordion.
 * Shows a success summary with approved products and ARC document details.
 */
const StageCompleted = ({ stage }) => {
  const details = stage.details || {};
  const products = details.products || [];
  const arcInstances = details.arcInstances || [];
  const revertHistory = details.revertHistory || [];
  const docsAvailable = arcInstances.filter(i => i.metadata?.award_document_url);

  return (
    <div>
      <Alert variant="success" className="border-0 mb-3" style={{ background: 'linear-gradient(135deg, #d1e7dd 0%, #badbcc 100%)' }}>
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{ width: 44, height: 44, backgroundColor: '#198754', flexShrink: 0 }}
          >
            <BsTrophyFill size={20} className="text-white" />
          </div>
          <div>
            <div className="fw-bold text-dark" style={{ fontSize: '1rem' }}>Tender Process Completed Successfully</div>
            <div className="small text-dark opacity-75">
              All stages have been completed and ARC approval has been granted.
              {revertHistory.length > 0 && (
                <span className="ms-1">
                  This tender went through {revertHistory.length} revision{revertHistory.length > 1 ? 's' : ''} before final approval.
                </span>
              )}
            </div>
          </div>
        </div>
      </Alert>

      {/* ARC Award Documents - Prominent at the top */}
      {docsAvailable.length > 0 && (
        <div
          className="p-3 rounded mb-3"
          style={{
            backgroundColor: '#f0f7ff',
            border: '1px solid #0d6efd',
            borderRadius: '8px'
          }}
        >
          <h6 className="mb-3 d-flex align-items-center gap-2" style={{ fontSize: '0.9rem', color: '#0d6efd' }}>
            <BsFileEarmarkTextFill size={16} />
            ARC Award Documents
          </h6>
          <div className="d-flex flex-wrap gap-2">
            {docsAvailable.map((inst, idx) => {
              const label = inst.metadata?.product_name || `ARC Document #${idx + 1}`;
              const suggestedName = `ARC-Award-${label.replace(/\s+/g, '-')}.pdf`;
              return (
                <a
                  key={inst.id || idx}
                  href={inst.metadata.award_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={suggestedName}
                  className="btn btn-primary d-inline-flex align-items-center gap-2 text-decoration-none"
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(13, 110, 253, 0.25)'
                  }}
                >
                  <BsDownload size={18} aria-hidden />
                  {label}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Approved Products Summary */}
      {products.length > 0 && (
        <div className="mb-3">
          <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>Approved Products</h6>
          <div className="d-flex flex-wrap gap-2">
            {products.map((product, idx) => (
              <div
                key={product.id || idx}
                className="d-flex align-items-center gap-2 px-3 py-2 rounded"
                style={{ backgroundColor: '#d1e7dd', border: '1px solid #a3cfbb' }}
              >
                <BsCheckCircleFill size={14} style={{ color: '#198754' }} />
                <span className="small fw-semibold text-dark">{product.product_details?.[0]?.name || product.product_name || product.name || `Product ${idx + 1}`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ARC Approval Records */}
      {arcInstances.length > 0 && (
        <div>
          <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>ARC Approval Records</h6>
          {arcInstances.map((inst, idx) => (
            <div
              key={inst.id || idx}
              className="d-flex align-items-center justify-content-between p-2 mb-1 rounded"
              style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}
            >
              <div className="d-flex align-items-center gap-2">
                <BsFileEarmarkTextFill size={14} style={{ color: '#6c757d' }} />
                <span className="small">
                  {inst.metadata?.product_name || `Approval #${idx + 1}`}
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <Badge bg="success" style={{ fontSize: '0.7rem' }}>Approved</Badge>
                {(inst.updated_at || inst.created_at) && (
                  <span className="small text-muted">
                    {moment(inst.updated_at || inst.created_at).format('DD-MM-YYYY')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {details.completedAt && (
        <div className="mt-3 pt-2 border-top small text-muted">
          Completed on {moment(details.completedAt).format('DD-MM-YYYY hh:mm A')}
          {details.projectName && <span> | Project: {details.projectName}</span>}
        </div>
      )}
    </div>
  );
};

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
  },
  reverted: {
    icon: BsArrowCounterclockwise,
    color: '#fd7e14',
    bgColor: '#fff3cd',
    badgeVariant: 'warning',
    label: 'Sent Back'
  }
};

const stageComponents = {
  AUTHORITY_APPROVAL: StageAuthorityApproval,
  PUBLISHED: StagePublication,
  QUOTES_RECEIVED: StageQuotesReceived,
  TECH_EVAL: StageTechnicalEval,
  NEGOTIATION: StageNegotiation,
  QUOTE_FINALIZED: StageQuoteFinalization,
  ARC_REVIEW: StageArcReview,
  COMPLETED: StageCompleted
};

const StageTimeline = ({
  stages = [],
  currentStage,
  rfq,
  lifecycleData,
  activeStageKey,
  onStageToggle,
  onRefresh,
  arcHandlers,
  revertHistory = [],
  refreshing = false
}) => {
  // Filter out COMPLETED if pending
  const visibleStages = stages.filter(stage => {
    if (stage.key === 'COMPLETED' && stage.status === 'pending') {
      return false;
    }
    return true;
  });

  // Check if this stage is the revert target
  const isRevertTarget = (stageKey) => {
    if (revertHistory.length === 0) return false;
    const latestRevert = revertHistory[revertHistory.length - 1];
    return latestRevert.targetStageKey === stageKey;
  };

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
        .stage-timeline .accordion-item.stage-completed-final .accordion-button {
          background: #d1e7dd;
          border: 1px solid #a3cfbb;
        }
        .stage-timeline .accordion-item.stage-completed-final {
          border-left-color: #198754;
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
        /* Revert indicator styles */
        .stage-timeline .revert-indicator {
          position: absolute;
          left: -45px;
          top: -10px;
          background: linear-gradient(135deg, #fd7e14, #ffc107);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          white-space: nowrap;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stage-timeline .accordion-item.needs-redo {
          border-left-color: #fd7e14 !important;
        }
        .stage-timeline .accordion-item.needs-redo .stage-marker {
          border-color: #fd7e14 !important;
          background-color: #fff3cd !important;
        }
        .stage-timeline .needs-redo-badge {
          background: #fd7e14;
          color: white;
          font-size: 0.65rem;
          padding: 2px 6px;
          border-radius: 4px;
          margin-left: 8px;
        }
      `}</style>

      {/* Show revert history summary if there are reverts */}
      {revertHistory.length > 0 && (
        <div className="mb-3 p-3 rounded" style={{ backgroundColor: '#fff3cd', marginLeft: '40px', border: '1px solid #ffc107' }}>
          <div className="d-flex align-items-center gap-2 mb-2">
            <BsArrowCounterclockwise className="text-warning" size={18} />
            <strong className="text-dark">Revert History ({revertHistory.length})</strong>
          </div>
          {revertHistory.map((revert, idx) => (
            <div key={idx} className="small text-muted mb-1">
              <span className="badge bg-secondary me-2">#{idx + 1}</span>
              Sent back to <strong>{revert.targetStage?.replace(/_/g, ' ')}</strong>
              {revert.actor && <> by {revert.actor}</>}
              {revert.timestamp && <> on {moment(revert.timestamp).format('DD-MM-YYYY hh:mm A')}</>}
              {revert.remarks && <div className="ms-4 fst-italic">"{revert.remarks}"</div>}
            </div>
          ))}
        </div>
      )}

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
          const StatusIcon = stage.needsRedo ? BsArrowCounterclockwise : config.icon;
          const StageComponent = stageComponents[stage.key];
          const showRevertTarget = isRevertTarget(stage.key);
          const markerColor = stage.needsRedo ? '#fd7e14' : config.color;
          const markerBgColor = stage.needsRedo ? '#fff3cd' : config.bgColor;

          return (
            <Accordion.Item
              key={stage.key}
              eventKey={stage.key}
              className={`stage-${stage.status}${stage.needsRedo ? ' needs-redo' : ''}${stage.key === 'COMPLETED' && stage.status === 'completed' ? ' stage-completed-final' : ''}`}
            >
              {/* Revert target indicator */}
              {showRevertTarget && (
                <div className="revert-indicator">
                  <BsArrowCounterclockwise size={10} className="me-1" />
                  Redo from here
                </div>
              )}

              {/* Stage marker dot */}
              <div
                className="stage-marker"
                style={{
                  border: `2px solid ${markerColor}`,
                  backgroundColor: markerBgColor
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
                          {moment(stage.timestamp).format('DD-MM-YYYY hh:mm A')}
                        </>
                      ) : (
                        <span className="text-muted fst-italic">Not started</span>
                      )}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Badge bg={stage.needsRedo ? 'warning' : config.badgeVariant} text={stage.needsRedo ? 'dark' : undefined}>
                      {stage.status === 'reverted' && stage.revertedTo
                        ? `Sent to ${stage.revertedTo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                        : stage.needsRedo
                          ? `Iteration ${stage.redoIteration || 2} - Redo`
                          : config.label
                      }
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
                    refreshing={refreshing}
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
