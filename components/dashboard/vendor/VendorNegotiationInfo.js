import React, { useState, useEffect } from 'react';
import { Badge, Modal, Table, Spinner } from 'react-bootstrap';
import { getVendorNegotiationStatus, getNegotiationRounds } from '@/services/negotiation';
import moment from 'moment';

const CARD_STYLES = {
  active: { backgroundColor: '#d1fae5', border: '1px solid #10b981' },
  expired: { backgroundColor: '#fee2e2', border: '1px solid #ef4444' },
  submitted: { backgroundColor: '#dbeafe', border: '1px solid #3b82f6' },
  pending: { backgroundColor: '#fef3c7', border: '1px solid #f59e0b' },
  closed: { backgroundColor: '#f3f4f6', border: '1px solid #9ca3af' },
};

const VendorNegotiationInfo = ({ rfq_id, rfq_product_id, productName }) => {
  const [negotiationStatus, setNegotiationStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [roundsHistory, setRoundsHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (rfq_id && rfq_product_id) {
      loadNegotiationStatus();
    }
  }, [rfq_id, rfq_product_id]);

  useEffect(() => {
    if (negotiationStatus?.round?.status === 'ACTIVE' && !negotiationStatus?.round?.isExpired) {
      const interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
      updateTimeRemaining();
      return () => clearInterval(interval);
    }
  }, [negotiationStatus]);

  const loadNegotiationStatus = async () => {
    try {
      setLoading(true);
      const response = await getVendorNegotiationStatus(rfq_id, rfq_product_id);

      let statusData = null;
      if (response) {
        if (response.status === 1 && response.data) {
          statusData = response.data;
        } else if (response.hasActiveRound !== undefined || response.hasRound !== undefined) {
          statusData = response;
        }
      }

      setNegotiationStatus(statusData);
    } catch (error) {
      console.error('Error loading negotiation status:', error);
      setNegotiationStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await getNegotiationRounds(rfq_id, rfq_product_id);
      let rounds = [];
      if (response) {
        if (response.status === 1 && response.data) {
          rounds = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
          rounds = response;
        } else if (Array.isArray(response.data)) {
          rounds = response.data;
        }
      }
      setRoundsHistory(rounds);
    } catch (error) {
      setRoundsHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const updateTimeRemaining = () => {
    if (!negotiationStatus?.round?.end_date) return;

    const now = moment();
    const endDate = moment.utc(negotiationStatus.round.end_date);
    const diff = endDate.diff(now);

    if (diff <= 0) {
      setTimeRemaining('Expired');
      return;
    }

    const duration = moment.duration(diff);
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();
    const seconds = duration.seconds();

    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    } else if (minutes > 0) {
      setTimeRemaining(`${minutes}m ${seconds}s`);
    } else {
      setTimeRemaining(`${seconds}s`);
    }
  };

  const handleCardClick = () => {
    setShowModal(true);
    loadHistory();
  };

  const getEffectiveStatus = (round) => {
    const status = (round?.status || '').toUpperCase();
    const hasRejected = round?.approvals?.some(a => a.status === 'REJECTED');
    if (hasRejected) return 'REJECTED';
    if (status === 'ACTIVE' && round?.end_date && moment.utc(round.end_date).isBefore(moment())) return 'ENDED';
    return status;
  };

  const getStatusBadge = (status) => {
    const map = {
      'ACTIVE': { bg: 'success', label: 'Active' },
      'ENDED': { bg: 'secondary', label: 'Ended' },
      'PENDING_APPROVAL': { bg: 'warning', label: 'Pending Approval' },
      'COMPLETED': { bg: 'info', label: 'Completed' },
      'CLOSED': { bg: 'secondary', label: 'Closed' },
      'REJECTED': { bg: 'danger', label: 'Rejected' },
    };
    const config = map[status] || { bg: 'secondary', label: status };
    return <Badge bg={config.bg} text={status === 'PENDING_APPROVAL' ? 'dark' : undefined} style={{ fontSize: '0.7rem' }}>{config.label}</Badge>;
  };

  if (loading) {
    return null;
  }

  // No round at all - hide completely
  if (!negotiationStatus?.round) {
    return null;
  }

  const round = negotiationStatus.round;
  const hasSubmittedQuote = negotiationStatus.hasSubmittedQuote;
  const vendorQuote = negotiationStatus.vendorQuote;
  const isExpired = round?.isExpired || timeRemaining === 'Expired';
  const isPending = round?.status === 'PENDING_APPROVAL';
  const isActive = round?.status === 'ACTIVE' && !isExpired;
  const isClosed = round?.status === 'CLOSED' || round?.status === 'COMPLETED';

  if (isPending) {
    return null;
  }

  const displayProductName = round?.product_name || productName || '';

  let cardStyle = CARD_STYLES.active;
  if (hasSubmittedQuote) cardStyle = CARD_STYLES.submitted;
  else if (isActive) cardStyle = CARD_STYLES.active;
  else if (round?.status === 'ENDED' || (round?.status === 'ENDED' || (isExpired && round?.status === 'ACTIVE'))) cardStyle = CARD_STYLES.expired;
  else if (isClosed) cardStyle = CARD_STYLES.closed;
  else cardStyle = CARD_STYLES.expired;

  return (
    <>
      <div
        className="d-flex align-items-center gap-3 p-2 rounded-3 mb-0"
        style={{
          ...cardStyle,
          borderRadius: '10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
        onClick={handleCardClick}
      >
        {/* Product name */}
        {displayProductName && (
          <Badge bg="dark" style={{ fontSize: '0.72rem', fontWeight: 500 }}>
            {displayProductName}
          </Badge>
        )}

        {/* Status badge */}
        <div className="d-flex align-items-center gap-1">
          {hasSubmittedQuote ? (
            <Badge bg="primary" style={{ fontSize: '0.7rem' }}>Submitted</Badge>
          ) : isActive ? (
            <Badge bg="success" style={{ fontSize: '0.7rem' }}>Active</Badge>
          ) : (round?.status === 'ENDED' || (isExpired && round?.status === 'ACTIVE')) ? (
            <Badge bg="danger" style={{ fontSize: '0.7rem' }}>Expired</Badge>
          ) : isClosed ? (
            <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>{round.status === 'COMPLETED' ? 'Completed' : 'Closed'}</Badge>
          ) : null}
          {round?.round_number && (
            <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>R{round.round_number}</span>
          )}
        </div>

        {/* Target price */}
        {round?.target_price && (
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1f2937' }}>
            Target: ₹{parseFloat(round.target_price).toLocaleString()}
          </span>
        )}

        {/* Time / submitted info */}
        {hasSubmittedQuote && vendorQuote?.quoted_price ? (
          <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 500 }}>
            Your Quote: ₹{parseFloat(vendorQuote.quoted_price).toLocaleString()}
          </span>
        ) : isActive && timeRemaining ? (
          <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500 }}>
            {timeRemaining} left
          </span>
        ) : (round?.status === 'ENDED' || (isExpired && round?.status === 'ACTIVE')) ? (
          <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>
            Round ended
          </span>
        ) : isClosed ? (
          <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
            Round {round.status.toLowerCase()}
          </span>
        ) : null}

        {/* Hint */}
        <span style={{ fontSize: '0.65rem', color: '#9ca3af', marginLeft: 'auto' }}>
          Click for details
        </span>
      </div>

      {/* Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="py-2 px-3">
          <Modal.Title style={{ fontSize: '1.1rem' }}>
            Negotiation Rounds {displayProductName ? `- ${displayProductName}` : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {round && (
            <div
              className="p-3 mb-3 rounded"
              style={{
                backgroundColor: isActive ? '#ecfdf5' : hasSubmittedQuote ? '#eff6ff' : (round?.status === 'ENDED' || (isExpired && round?.status === 'ACTIVE')) ? '#fef2f2' : '#f9fafb',
                border: `1px solid ${isActive ? '#a7f3d0' : hasSubmittedQuote ? '#bfdbfe' : (round?.status === 'ENDED' || (isExpired && round?.status === 'ACTIVE')) ? '#fecaca' : '#e5e7eb'}`,
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-bold" style={{ fontSize: '0.95rem' }}>
                  Latest Round {round.round_number}
                </div>
                {hasSubmittedQuote ? (
                  <Badge bg="primary">Quote Submitted</Badge>
                ) : isActive ? (
                  <Badge bg="success">Active</Badge>
                ) : (round?.status === 'ENDED' || (isExpired && round?.status === 'ACTIVE')) ? (
                  <Badge bg="danger">Expired</Badge>
                ) : (
                  <Badge bg="secondary">{round.status}</Badge>
                )}
              </div>
              <div className="row g-2" style={{ fontSize: '0.85rem' }}>
                <div className="col-md-3">
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Target Price</div>
                  <div className="fw-semibold">₹{parseFloat(round.target_price).toLocaleString()}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>End Date</div>
                  <div>{moment.utc(round.end_date).local().format('DD-MM-YYYY hh:mm A')}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Time Remaining</div>
                  <div>
                    {isActive ? (
                      <Badge bg="success" style={{ fontSize: '0.8rem' }}>
                        {timeRemaining || 'Calculating...'}
                      </Badge>
                    ) : (
                      <Badge bg={isExpired ? 'danger' : 'secondary'} style={{ fontSize: '0.8rem' }}>
                        {isExpired ? 'Expired' : round.status}
                      </Badge>
                    )}
                  </div>
                </div>
                {hasSubmittedQuote && vendorQuote?.quoted_price && (
                  <div className="col-md-3">
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>Your Quote</div>
                    <div className="fw-semibold text-primary">
                      ₹{parseFloat(vendorQuote.quoted_price).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
              {hasSubmittedQuote && (
                <div className="mt-2">
                  <small className="text-muted">
                    You have already submitted your negotiation quote for this round. No further updates allowed.
                  </small>
                </div>
              )}
              {!hasSubmittedQuote && isActive && (
                <div className="mt-2">
                  <small className="text-muted">
                    Only one quote submission allowed per negotiation round.
                  </small>
                </div>
              )}
            </div>
          )}

          <div className="fw-bold mb-2" style={{ fontSize: '0.95rem' }}>All Rounds</div>
          {historyLoading ? (
            <div className="text-center py-4">
              <Spinner animation="border" size="sm" />
              <span className="ms-2 text-muted">Loading history...</span>
            </div>
          ) : roundsHistory.length === 0 ? (
            <div className="text-center py-3 text-muted">No round history available</div>
          ) : (
            <Table bordered hover size="sm" style={{ fontSize: '0.85rem' }}>
              <thead className="table-light">
                <tr>
                  <th>Round</th>
                  <th>Target Price</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Created By</th>
                </tr>
              </thead>
              <tbody>
                {roundsHistory.map((histRound) => {
                  const effectiveStatus = getEffectiveStatus(histRound);
                  return (
                    <tr key={histRound.id}>
                      <td className="fw-semibold">#{histRound.round_number}</td>
                      <td>₹{parseFloat(histRound.target_price).toLocaleString()}</td>
                      <td>{moment.utc(histRound.end_date).local().format('DD-MM-YYYY hh:mm A')}</td>
                      <td>{getStatusBadge(effectiveStatus)}</td>
                      <td>{histRound.created_by_name || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer className="py-2">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>
            Close
          </button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default VendorNegotiationInfo;
