import React, { useState, useEffect } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { getNegotiationRounds } from '@/services/negotiation';
import moment from 'moment';
import styles from './NegotiationUI.module.scss';

const STATUS_LABELS = {
  active: 'Active',
  pending: 'Pending Approval',
  ended: 'Ended',
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

const formatEndDate = (endDate) => {
  if (!endDate) return '-';
  return moment.utc(endDate).local().format('DD/MM/YYYY, hh:mm A');
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

  /* ── Render: table cell ── */
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

      {/* ── Details Modal (buyer only) ── */}
      {!vendorView && (
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered dialogClassName={styles.negotiationModalDialog}>
          <Modal.Header className={styles.modalHeader}>
            <div className={styles.modalTitleWrap}>
              <Modal.Title className={styles.modalTitle}>
                Negotiation Rounds{productName ? ` — ${productName}` : ''}
              </Modal.Title>
              <p className={styles.modalSubtitle}>
                {totalRounds} round{totalRounds !== 1 ? 's' : ''} for this product
              </p>
            </div>
            <button type="button" className={styles.modalCloseBtn} onClick={() => setShowModal(false)} aria-label="Close">
              ✕
            </button>
          </Modal.Header>

          <Modal.Body className={styles.modalBody}>
            {/* Latest Round Hero Card */}
            {latestRound && (() => {
              const latestStatus = getEffectiveStatus(latestRound);
              return (
                <div className={`${styles.roundCard} ${styles[`roundCard_${latestStatus}`] || ''}`} style={{ padding: '14px', marginBottom: 14 }}>
                  <div className={styles.roundTopRow}>
                    <div className={styles.roundIdentity}>
                      <span className={styles.roundNumberDot}>{latestRound.round_number}</span>
                      <div>
                        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#1e3656' }}>
                          Latest Round
                        </p>
                        {latestRound.created_by_name && (
                          <p style={{ margin: 0, fontSize: 11, color: '#60748f' }}>
                            By {latestRound.created_by_name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isActive && timeRemaining && timeRemaining !== 'Expired' && (
                        <span className={styles.roundTimeRemaining}>{timeRemaining} left</span>
                      )}
                      <span className={`${styles.roundStatusBadge} ${styles[`historyStatus_${latestStatus}`] || ''}`}>
                        {STATUS_LABELS[latestStatus] || latestRound.status}
                      </span>
                    </div>
                  </div>

                  <div className={styles.roundMeta}>
                    <div className={styles.roundMetaItem}>
                      <p className={styles.roundMetaLabel}>Target Price</p>
                      <p className={styles.roundMetaValue}>
                        ₹{parseFloat(latestRound.target_price).toLocaleString('en-IN')}
                      </p>
                    </div>
                    <div className={styles.roundMetaItem}>
                      <p className={styles.roundMetaLabel}>End Date</p>
                      <p className={styles.roundMetaValue}>{formatEndDate(latestRound.end_date)}</p>
                    </div>
                    <div className={styles.roundMetaItem}>
                      <p className={styles.roundMetaLabel}>Created</p>
                      <p className={styles.roundMetaValue}>{formatEndDate(latestRound.created_at)}</p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Past Rounds */}
            {rounds.length > 1 && (
              <>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#4d6582', marginBottom: 8, marginTop: 4 }}>
                  Round History
                </p>
                {rounds
                  .filter(r => r.id !== latestRound?.id)
                  .sort((a, b) => b.round_number - a.round_number)
                  .map(histRound => {
                    const histStatus = getEffectiveStatus(histRound);
                    return (
                      <div key={histRound.id} className={`${styles.roundCard} ${styles[`roundCard_${histStatus}`] || ''}`}>
                        <div className={styles.roundTopRow}>
                          <div className={styles.roundIdentity}>
                            <span className={styles.roundNumberDot}>{histRound.round_number}</span>
                            <div>
                              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: '#1e3656' }}>
                                Round {histRound.round_number}
                              </p>
                              {histRound.created_by_name && (
                                <p style={{ margin: 0, fontSize: 10.5, color: '#60748f' }}>
                                  By {histRound.created_by_name}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className={`${styles.roundStatusBadge} ${styles[`historyStatus_${histStatus}`] || ''}`}>
                            {STATUS_LABELS[histStatus] || histRound.status}
                          </span>
                        </div>

                        <div className={styles.roundMeta}>
                          <div className={styles.roundMetaItem}>
                            <p className={styles.roundMetaLabel}>Target</p>
                            <p className={styles.roundMetaValue}>₹{parseFloat(histRound.target_price).toLocaleString('en-IN')}</p>
                          </div>
                          <div className={styles.roundMetaItem}>
                            <p className={styles.roundMetaLabel}>End Date</p>
                            <p className={styles.roundMetaValue}>{formatEndDate(histRound.end_date)}</p>
                          </div>
                          <div className={styles.roundMetaItem}>
                            <p className={styles.roundMetaLabel}>Created</p>
                            <p className={styles.roundMetaValue}>{formatEndDate(histRound.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </>
            )}

            {rounds.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#60748f', fontSize: 13 }}>
                No round history available
              </div>
            )}
          </Modal.Body>

          <Modal.Footer className={styles.modalFooter}>
            <button className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={() => setShowModal(false)}>
              Close
            </button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
};

export default NegotiationColumnCell;
