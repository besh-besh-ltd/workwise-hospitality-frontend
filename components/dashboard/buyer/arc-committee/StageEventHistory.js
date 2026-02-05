import React from 'react';
import { Badge } from 'react-bootstrap';
import moment from 'moment';
import {
  BsCheckCircleFill,
  BsXCircleFill,
  BsArrowCounterclockwise,
  BsArrowRight,
  BsClockFill,
  BsFileEarmarkText,
  BsSendFill,
  BsPersonFill
} from 'react-icons/bs';

/**
 * Maps lifecycle event stage/action to a display config
 */
const getEventConfig = (event) => {
  const stage = (event.stage || '').toUpperCase();
  const action = (event.action || '').toUpperCase();

  // Sent back events
  if (stage.startsWith('SENT_TO_') || action === 'SEND_TO') {
    const target = stage.replace('SENT_TO_', '').replace(/_/g, ' ');
    return {
      icon: BsArrowCounterclockwise,
      color: '#fd7e14',
      bgColor: '#fff3cd',
      label: `Sent back to ${target.replace(/\b\w/g, l => l.toUpperCase())}`,
      type: 'sent_back'
    };
  }

  // Approval events
  if (stage.includes('APPROVED') || action === 'APPROVE') {
    return {
      icon: BsCheckCircleFill,
      color: '#198754',
      bgColor: '#d1e7dd',
      label: 'Approved',
      type: 'approved'
    };
  }

  // Rejection events
  if (stage.includes('REJECTED') || action === 'REJECT') {
    return {
      icon: BsXCircleFill,
      color: '#dc3545',
      bgColor: '#f8d7da',
      label: 'Rejected',
      type: 'rejected'
    };
  }

  // Document generated
  if (stage.includes('DOCUMENT_GENERATED') || action === 'GENERATE_DOCUMENT') {
    return {
      icon: BsFileEarmarkText,
      color: '#6f42c1',
      bgColor: '#e8d5f5',
      label: 'Document Generated',
      type: 'document'
    };
  }

  // Submitted events
  if (stage.includes('SUBMITTED') || action === 'SUBMIT' || action === 'SUBMIT_ARC' || action === 'SUBMIT_FOR_APPROVAL') {
    return {
      icon: BsSendFill,
      color: '#0d6efd',
      bgColor: '#cfe2ff',
      label: 'Submitted for Approval',
      type: 'submitted'
    };
  }

  // Published
  if (stage === 'PUBLISHED' || action === 'PUBLISH') {
    return {
      icon: BsSendFill,
      color: '#0d6efd',
      bgColor: '#cfe2ff',
      label: 'Published',
      type: 'published'
    };
  }

  // Started events
  if (stage.includes('STARTED') || action.includes('STARTED')) {
    return {
      icon: BsClockFill,
      color: '#0d6efd',
      bgColor: '#cfe2ff',
      label: 'Started',
      type: 'started'
    };
  }

  // Completed events
  if (stage.includes('COMPLETED') || action.includes('COMPLETED')) {
    return {
      icon: BsCheckCircleFill,
      color: '#198754',
      bgColor: '#d1e7dd',
      label: 'Completed',
      type: 'completed'
    };
  }

  // Negotiation round events
  if (stage.includes('NEGOTIATION_ROUND') || action === 'CREATE_ROUND' || action === 'ROUND_PUBLISHED') {
    return {
      icon: BsArrowRight,
      color: '#0d6efd',
      bgColor: '#cfe2ff',
      label: action === 'CREATE_ROUND' ? 'Round Created' : action === 'ROUND_PUBLISHED' ? 'Round Published' : stage.replace(/_/g, ' '),
      type: 'round'
    };
  }

  // Quotes received
  if (stage === 'QUOTES_RECEIVED' || action === 'QUOTE_RECEIVED') {
    return {
      icon: BsFileEarmarkText,
      color: '#20c997',
      bgColor: '#d1f2eb',
      label: 'Quotes Received',
      type: 'quotes'
    };
  }

  // Finalized
  if (stage.includes('FINALIZED') || action.includes('FINALIZED')) {
    return {
      icon: BsCheckCircleFill,
      color: '#198754',
      bgColor: '#d1e7dd',
      label: 'Finalized',
      type: 'finalized'
    };
  }

  // Default
  return {
    icon: BsClockFill,
    color: '#6c757d',
    bgColor: '#f8f9fa',
    label: (stage || action || 'Event').replace(/_/g, ' '),
    type: 'default'
  };
};

/**
 * StageEventHistory - Shows chronological event history for a stage
 * Displays rejections, approvals, sent-backs, etc. in a mini-timeline
 */
const StageEventHistory = ({ events = [], title = 'Event History' }) => {
  if (!events || events.length === 0) return null;

  return (
    <div className="stage-event-history mt-3 mb-2">
      <style jsx>{`
        .stage-event-history {
          border-left: 2px solid #dee2e6;
          margin-left: 8px;
        }
        .event-item {
          position: relative;
          padding: 8px 0 8px 24px;
          margin-left: 0;
        }
        .event-item:last-child {
          padding-bottom: 0;
        }
        .event-marker {
          position: absolute;
          left: -9px;
          top: 10px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .event-card {
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 10px 14px;
          transition: box-shadow 0.2s ease;
        }
        .event-card:hover {
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .event-card.sent_back {
          border-left: 3px solid #fd7e14;
          background: #fffdf5;
        }
        .event-card.rejected {
          border-left: 3px solid #dc3545;
          background: #fff5f5;
        }
        .event-card.approved {
          border-left: 3px solid #198754;
          background: #f5fff8;
        }
      `}</style>

      <h6 className="text-muted mb-2" style={{ fontSize: '0.8rem', fontWeight: 600, marginLeft: '24px' }}>
        {title} ({events.length} event{events.length !== 1 ? 's' : ''})
      </h6>

      {events.map((event, idx) => {
        const config = getEventConfig(event);
        const EventIcon = config.icon;

        return (
          <div key={event.id || idx} className="event-item">
            {/* Marker dot */}
            <div
              className="event-marker"
              style={{ backgroundColor: config.bgColor, border: `2px solid ${config.color}` }}
            >
              <EventIcon size={8} style={{ color: config.color }} />
            </div>

            {/* Event card */}
            <div className={`event-card ${config.type}`}>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <Badge
                      style={{ backgroundColor: config.color, fontSize: '0.7rem' }}
                    >
                      {config.label}
                    </Badge>
                    {event.metadata?.rfq_product_id && (
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                        Product #{event.metadata.rfq_product_id}
                      </span>
                    )}
                  </div>

                  {/* Actor */}
                  {event.performed_by_name && (
                    <div className="d-flex align-items-center gap-1 text-muted" style={{ fontSize: '0.78rem' }}>
                      <BsPersonFill size={10} />
                      <span>{event.performed_by_name}</span>
                    </div>
                  )}

                  {/* Remarks */}
                  {event.remarks && (
                    <div className="mt-1 fst-italic text-muted" style={{ fontSize: '0.78rem' }}>
                      "{event.remarks}"
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="text-muted text-end" style={{ fontSize: '0.72rem', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                  {event.created_at && (
                    <>
                      <div>{moment(event.created_at).format('DD MMM YYYY')}</div>
                      <div>{moment(event.created_at).format('HH:mm')}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StageEventHistory;
