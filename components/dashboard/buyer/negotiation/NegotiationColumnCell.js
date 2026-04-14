import React, { useState, useEffect } from 'react';
import { Badge, Modal, Table, Spinner } from 'react-bootstrap';
import { getNegotiationRounds } from '@/services/negotiation';
import moment from 'moment';
import styles from './NegotiationUI.module.scss';

const STATUS_LABELS = {
  active: 'Active',
  pending: 'Pending Approval',
  ended: 'Expired',
  rejected: 'Rejected',
  completed: 'Completed',
  closed: 'Closed',
};

const getEffectiveStatus = (round) => {
  if (!round) return 'closed';
  const status = (round.status || '').toUpperCase();
  const isExpired = round.end_date && moment.utc(round.end_date).isBefore(moment());

  if (round.approvals?.some(a => a.status === 'REJECTED')) return 'rejected';
  if (status === 'ACTIVE' && isExpired) return 'ended';
  if (status === 'PENDING_APPROVAL' && isExpired) return 'ended';
  if (status === 'ENDED') return 'ended';
  if (status === 'ACTIVE') return 'active';
  if (status === 'PENDING_APPROVAL') return 'pending';
  if (status === 'COMPLETED') return 'completed';
  if (status === 'REJECTED') return 'rejected';
  if (status === 'CANCELLED') return 'closed';
  if (status === 'CLOSED') return 'closed';
  return 'closed';
};

const getStatusBadge = (effectiveStatus) => {
  const map = {
    'active': { bg: 'success', label: 'Active' },
    'ended': { bg: 'secondary', label: 'Expired' },
    'pending': { bg: 'warning', label: 'Pending Approval', textDark: true },
    'completed': { bg: 'info', label: 'Completed' },
    'closed': { bg: 'secondary', label: 'Closed' },
    'rejected': { bg: 'danger', label: 'Rejected' },
  };
  const config = map[effectiveStatus] || { bg: 'secondary', label: effectiveStatus };
  return <Badge bg={config.bg} text={config.textDark ? 'dark' : undefined} style={{ fontSize: '0.7rem' }}>{config.label}</Badge>;
};

const NegotiationColumnCell = ({ rfq_id, rfq_product_id, productName, onStatusLoaded, token, vendorView = false }) => {
  const [rounds, setRounds] = useState([]);
  const [latestRound, setLatestRound] = useState(null);
  const [totalRounds, setTotalRounds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (rfq_id && rfq_product_id) {
      loadNegotiationData();
    } else {
      onStatusLoaded?.(false);
    }
  }, [rfq_id, rfq_product_id]);

  useEffect(() => {
    if (!latestRound) return;
    const status = getEffectiveStatus(latestRound);
    if (status === 'active') {
      const interval = setInterval(updateTimeRemaining, 1000);
      updateTimeRemaining();
      return () => clearInterval(interval);
    }
  }, [latestRound]);

  const loadNegotiationData = async () => {
    try {
      setLoading(true);
      const response = await getNegotiationRounds(rfq_id, rfq_product_id, token);
      let roundsList = [];
      if (response) {
        if (response.status === 1 && Array.isArray(response.data)) {
          roundsList = response.data;
        } else if (Array.isArray(response)) {
          roundsList = response;
        } else if (Array.isArray(response.data)) {
          roundsList = response.data;
        }
      }

      // Vendors only see active (non-expired) rounds
      if (vendorView) {
        roundsList = roundsList.filter(r => {
          if (r.status !== 'ACTIVE') return false;
          if (r.end_date && moment.utc(r.end_date).isBefore(moment())) return false;
          return true;
        });
      }

      setRounds(roundsList);
      setTotalRounds(roundsList.length);
      // Get latest round: prioritize ACTIVE, then highest round_number
      const sorted = [...roundsList].sort((a, b) => {
        const aActive = a.status === 'ACTIVE' ? 0 : 1;
        const bActive = b.status === 'ACTIVE' ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return b.round_number - a.round_number;
      });
      setLatestRound(sorted[0] || null);
      onStatusLoaded?.(roundsList.length > 0);
    } catch (error) {
      setRounds([]);
      setLatestRound(null);
      setTotalRounds(0);
      onStatusLoaded?.(false);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = () => {
    if (!latestRound?.end_date) return;
    const now = moment();
    const endDate = moment.utc(latestRound.end_date);
    const diff = endDate.diff(now);

    if (diff <= 0) {
      setTimeRemaining('Expired');
      return;
    }

    const duration = moment.duration(diff);
    const days = Math.floor(duration.asDays());
    const hours = duration.hours();
    const minutes = duration.minutes();

    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m`);
    } else {
      setTimeRemaining(`${minutes}m`);
    }
  };

  const handleCellClick = () => {
    if (!latestRound || vendorView) return;
    setShowModal(true);
  };

  if (loading) {
    return (
      <td style={{ minWidth: '140px', verticalAlign: 'middle' }}>
        <div className={styles.negCell} style={{ cursor: 'default', opacity: 0.7 }}>
          <span className={styles.negCellAccent} />
          <div className={styles.negCellContent} style={{ alignItems: 'center', justifyContent: 'center', padding: '16px 12px' }}>
            <Spinner size="sm" animation="border" variant="secondary" />
          </div>
        </div>
      </td>
    );
  }

  if (!latestRound) {
    return (
      <td style={{ minWidth: '140px', verticalAlign: 'middle' }}>
        <span className="text-muted" style={{ fontSize: '0.78rem' }}>N/A</span>
      </td>
    );
  }

  const effectiveStatus = getEffectiveStatus(latestRound);
  const isActive = effectiveStatus === 'active';

  // Get status-specific colors for the modal summary card
  const statusColorMap = {
    active: { bg: '#eef7f1', border: '#c9dfd0' },
    pending: { bg: '#fdf7ea', border: '#ebdcc0' },
    ended: { bg: '#f8f4f0', border: '#e4d6c7' },
    rejected: { bg: '#fbf2f2', border: '#ecd4d4' },
    completed: { bg: '#edf4fb', border: '#cfdff2' },
    closed: { bg: '#f2f4f8', border: '#d8dfe9' },
  };
  const modalColors = statusColorMap[effectiveStatus] || statusColorMap.closed;

  return (
    <>
      <td
        style={{ minWidth: '140px', verticalAlign: 'middle', cursor: vendorView ? 'default' : 'pointer' }}
        onClick={handleCellClick}
      >
        <div className={styles.negCell}>
          <span className={`${styles.negCellAccent} ${styles[`negCellAccent_${effectiveStatus}`] || ''}`} />

          <div className={styles.negCellContent}>
            {/* Status badge + round number */}
            <div className={styles.negCellStatusRow}>
              <span className={`${styles.negCellBadge} ${styles[`negCellBadge_${effectiveStatus}`] || ''}`}>
                {STATUS_LABELS[effectiveStatus] || latestRound.status}
              </span>
              {latestRound.round_number && (
                <span className={styles.negCellMeta}>R{latestRound.round_number}</span>
              )}
            </div>

            {/* Metrics: Target Price, Time Remaining, Total Rounds */}
            <div className={styles.negCellMetrics}>
              {latestRound.target_price && (
                <div className={styles.negCellStat}>
                  <span className={styles.negCellStatValue}>
                    ₹{parseFloat(latestRound.target_price).toLocaleString()}
                  </span>
                  <span className={styles.negCellStatLabel}>Target</span>
                </div>
              )}
              {isActive && timeRemaining && timeRemaining !== 'Expired' ? (
                <div className={styles.negCellStat} style={{ borderColor: 'rgba(47,91,69,0.2)', background: 'rgba(47,91,69,0.06)' }}>
                  <span className={styles.negCellStatValue} style={{ color: '#2f5b45' }}>{timeRemaining}</span>
                  <span className={styles.negCellStatLabel} style={{ color: '#2f5b45' }}>Left</span>
                </div>
              ) : null}
              {totalRounds > 1 && (
                <div className={styles.negCellStat}>
                  <span className={styles.negCellStatValue}>{totalRounds}</span>
                  <span className={styles.negCellStatLabel}>Rounds</span>
                </div>
              )}
            </div>

            {/* Bottom: Initiator or click hint */}
            {!vendorView && (
              <div className={styles.negCellSection}>
                <div className={styles.negCellFooter}>
                  {latestRound.created_by_name ? `By ${latestRound.created_by_name}` : 'Click to view details'}
                </div>
              </div>
            )}
          </div>
        </div>
      </td>

      {/* History Modal (buyer only) */}
      {!vendorView && <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
        <Modal.Header closeButton className="py-2 px-3">
          <Modal.Title style={{ fontSize: '1.1rem' }}>
            Negotiation Rounds {productName ? `- ${productName}` : ''}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Latest Round Summary */}
          {latestRound && (
            <div
              className="p-3 mb-3 rounded"
              style={{
                backgroundColor: modalColors.bg,
                border: `1px solid ${modalColors.border}`,
              }}
            >
              <div className="d-flex justify-content-between align-items-center mb-2">
                <div className="fw-bold" style={{ fontSize: '0.95rem' }}>
                  Latest Round {latestRound.round_number}
                </div>
                {getStatusBadge(effectiveStatus)}
              </div>
              <div className="row g-2" style={{ fontSize: '0.85rem' }}>
                <div className="col-md-3">
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Target Price</div>
                  <div className="fw-semibold">₹{parseFloat(latestRound.target_price).toLocaleString()}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>End Date</div>
                  <div>{moment.utc(latestRound.end_date).local().format('DD-MM-YYYY hh:mm A')}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Time Remaining</div>
                  <div>
                    {isActive ? (
                      <Badge bg="success" style={{ fontSize: '0.8rem' }}>
                        {timeRemaining || 'Calculating...'}
                      </Badge>
                    ) : (
                      <Badge bg={effectiveStatus === 'ended' ? 'danger' : 'secondary'} style={{ fontSize: '0.8rem' }}>
                        {STATUS_LABELS[effectiveStatus] || latestRound.status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>Created By</div>
                  <div className="fw-semibold">{latestRound.created_by_name || '-'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Round History Table */}
          <div className="fw-bold mb-2" style={{ fontSize: '0.95rem' }}>All Rounds</div>
          {rounds.length === 0 ? (
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
                {rounds.map((histRound) => {
                  const histStatus = getEffectiveStatus(histRound);
                  return (
                    <tr key={histRound.id}>
                      <td className="fw-semibold">#{histRound.round_number}</td>
                      <td>₹{parseFloat(histRound.target_price).toLocaleString()}</td>
                      <td>{moment.utc(histRound.end_date).local().format('DD-MM-YYYY hh:mm A')}</td>
                      <td>{getStatusBadge(histStatus)}</td>
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
      </Modal>}
    </>
  );
};

export default NegotiationColumnCell;
