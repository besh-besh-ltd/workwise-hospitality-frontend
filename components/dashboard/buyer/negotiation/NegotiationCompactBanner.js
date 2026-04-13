import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Button } from 'react-bootstrap';
import { getAllActiveNegotiationRounds, getNegotiationRounds } from '@/services/negotiation';
import { getEntityApprovalInstances, getApprovalInstanceDetails } from '@/services/approval';
import NegotiationModal from './NegotiationModal';
import moment from 'moment';
import styles from './NegotiationUI.module.scss';

const NegotiationCompactBanner = ({
  rfq_id,
  products = [],
  canWrite = true,
  permissionsLoading = false,
  hospitalityCompanyId,
  hotelId,
  departmentId,
  onRoundChange,
  arcApprovalData = null,
  preloadedActiveRounds = null,
  preloadedRoundsHistory = null,
  preloadedApprovalBundle = null,
}) => {
  const [activeRounds, setActiveRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [roundsHistory, setRoundsHistory] = useState([]);
  const userProfile = useSelector((state) => state.userProfile);
  const currentUserId = userProfile?.id || null;

  useEffect(() => {
    if (rfq_id) {
      loadActiveRounds();
      loadRoundsHistory();
    }
  }, [rfq_id]);

  const loadActiveRounds = async () => {
    try {
      setLoading(true);

      // Use preloaded data if available (avoids N per-round API calls)
      if (preloadedActiveRounds != null) {
        let rounds = [...preloadedActiveRounds];

        // Enrich PENDING_APPROVAL rounds from preloaded approval bundle
        if (preloadedApprovalBundle) {
          for (let i = 0; i < rounds.length; i++) {
            const round = rounds[i];
            if (round.status === 'PENDING_APPROVAL' && round.rfq_product_id) {
              const instances = preloadedApprovalBundle.negotiation_instances?.[String(round.rfq_product_id)] || [];
              const pendingInstance = instances.find(inst => inst.status === 'PENDING');
              if (pendingInstance) {
                const currentStep = (pendingInstance.steps || []).find(s => s.step_order === pendingInstance.current_step);
                if (currentStep?.approvers) {
                  round.approvals = currentStep.approvers.map(a => ({
                    approver_user_id: a.approver_user_id || a.user_id,
                    approver_name: a.user_name,
                    approver_email: a.user_email,
                    status: a.status
                  }));
                }
              }
            }
          }
        }

        setActiveRounds(rounds);
        return;
      }

      // Fallback: fetch from API
      const response = await getAllActiveNegotiationRounds(rfq_id);

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

      // Enrich PENDING_APPROVAL rounds with approval data from the approval engine
      for (let i = 0; i < rounds.length; i++) {
        const round = rounds[i];
        if (round.status === 'PENDING_APPROVAL' && round.rfq_product_id) {
          try {
            const instancesRes = await getEntityApprovalInstances('NEGOTIATION', round.rfq_product_id);
            const instances = instancesRes?.data || instancesRes || [];
            const pendingInstance = (Array.isArray(instances) ? instances : []).find(inst => inst.status === 'PENDING');
            if (pendingInstance) {
              const detailRes = await getApprovalInstanceDetails(pendingInstance.id);
              const detail = detailRes?.data || detailRes || {};
              const currentStep = (detail.steps || []).find(s => s.step_order === detail.current_step);
              if (currentStep && currentStep.approvers) {
                round.approvals = currentStep.approvers.map(a => ({
                  approver_user_id: a.user_id,
                  approver_name: a.user_name,
                  approver_email: a.user_email,
                  status: a.status
                }));
              }
            }
          } catch (err) {
            console.error('Error fetching approval data for round ' + round.id + ':', err);
          }
        }
      }

      setActiveRounds(rounds);
    } catch (error) {
      console.error('Error loading active rounds:', error);
      setActiveRounds([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRoundsHistory = async () => {
    // Use preloaded data if available
    if (preloadedRoundsHistory != null && preloadedRoundsHistory.length > 0) {
      setRoundsHistory(preloadedRoundsHistory);
      return;
    }

    // Fallback: fetch from API
    try {
      const response = await getNegotiationRounds(rfq_id);

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
      console.error('Error loading rounds history:', error);
      setRoundsHistory([]);
    }
  };

  const handleCreateClick = () => {
    setModalMode('create');
    setShowModal(true);
  };

  const handleHistoryClick = () => {
    setModalMode('history');
    loadRoundsHistory();
    setShowModal(true);
  };

  const handleViewApproveClick = () => {
    setModalMode('view-approve');
    loadActiveRounds();
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setModalMode(null);
  };

  // Helper to check if a round has been rejected via approvals
  const isRoundRejected = (round) => {
    return round?.approvals?.some(a => a.status === 'REJECTED');
  };

  // Helper to check if a round has ended based on end_date
  // Note: end_date from server is in UTC, so use moment.utc() to parse it correctly
  const isRoundEnded = (round) => {
    const status = (round?.status || '').toUpperCase();
    if (status === 'ACTIVE' && round?.end_date && moment.utc(round.end_date).isBefore(moment())) {
      return true;
    }
    return false;
  };

  // Filter out rejected rounds from pending
  const pendingRounds = (activeRounds || []).filter(r => {
    const status = r?.status?.toUpperCase();
    return status === 'PENDING_APPROVAL' && !isRoundRejected(r);
  });

  // Active rounds: status is ACTIVE, end_date has NOT passed, and not rejected
  const activeRoundsList = (activeRounds || []).filter(r => {
    const status = r?.status?.toUpperCase();
    return status === 'ACTIVE' && !isRoundEnded(r) && !isRoundRejected(r);
  });

  // Rounds from activeRounds that have ended (status ACTIVE but end_date passed) and not rejected
  const endedFromActiveRounds = (activeRounds || []).filter(r => {
    return isRoundEnded(r) && !isRoundRejected(r);
  });

  // Calculate ended rounds from history (CLOSED or COMPLETED status)
  const endedFromHistory = (roundsHistory || []).filter(r => {
    const status = r?.status?.toUpperCase();
    return status === 'CLOSED' || status === 'COMPLETED';
  });

  // Combine ended rounds, deduplicate by ID
  const allEndedRoundsMap = new Map();
  [...endedFromActiveRounds, ...endedFromHistory].forEach(r => {
    if (r?.id && !allEndedRoundsMap.has(r.id)) {
      allEndedRoundsMap.set(r.id, r);
    }
  });
  const endedRounds = Array.from(allEndedRoundsMap.values());

  const pendingApprovalsCount = pendingRounds.filter(round => {
    if (!currentUserId) return false;
    const approvals = round.approvals || [];
    return approvals.some(a => a.status === 'PENDING' && String(a.approver_user_id) === String(currentUserId));
  }).length;

  // Get pending approvers for all pending rounds
  const getPendingApprovers = () => {
    const pendingApprovers = [];
    pendingRounds.forEach(round => {
      const approvals = round.approvals || [];
      approvals.forEach(approval => {
        if (approval.status === 'PENDING') {
          pendingApprovers.push({
            name: approval.approver_name || ('User ' + approval.approver_user_id),
            email: approval.approver_email,
            roundNumber: round.round_number,
            productId: round.rfq_product_id
          });
        }
      });
    });
    // Remove duplicates by name
    const uniqueApprovers = [];
    const seen = new Set();
    pendingApprovers.forEach(approver => {
      const key = approver.name + '-' + approver.email;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueApprovers.push(approver);
      }
    });
    return uniqueApprovers;
  };

  const pendingApprovers = getPendingApprovers();

  // Check if ARC is approved (hide ended rounds when ARC is approved)
  const isArcApproved = arcApprovalData?.status === 'APPROVED';

  // Build status message
  const totalRoundsCount = endedRounds.length + activeRoundsList.length + pendingRounds.length;
  let statusMessage = 'No negotiation rounds';
  if (totalRoundsCount > 0) {
    const parts = [];
    // Only show ended rounds if ARC is not yet approved
    if (endedRounds.length > 0 && !isArcApproved) {
      parts.push(`${endedRounds.length} ended`);
    }
    if (activeRoundsList.length > 0) {
      parts.push(`${activeRoundsList.length} active`);
    }
    if (pendingRounds.length > 0) {
      parts.push(`${pendingRounds.length} pending`);
    }
    statusMessage = parts.length > 0 ? `${parts.join(', ')} round${totalRoundsCount > 1 ? 's' : ''}` : 'No negotiation rounds';
  }

  const bannerToneClass = pendingApprovalsCount > 0
    ? styles.bannerToneDanger
    : pendingRounds.length > 0
      ? styles.bannerToneWarning
      : activeRoundsList.length > 0
        ? styles.bannerToneSuccess
        : styles.bannerToneNeutral;

  return (
    <>
      <div className={`${styles.negotiationBanner} ${bannerToneClass}`}>
        <div className={styles.bannerBody}>
          <div className={styles.bannerTopLine}>
            <div>
              <p className={styles.bannerTitle}>
                {loading ? 'Loading negotiation status...' : `Negotiation Desk: ${statusMessage}`}
              </p>
              <p className={styles.bannerSub}>
                Manage round creation, approvals, and history from one place.
              </p>
            </div>
          </div>

          <div className={styles.bannerStats}>
            <span className={`${styles.statChip} ${styles.statChipHighlight}`}>
              {activeRoundsList.length} Active
            </span>
            <span className={styles.statChip}>
              {pendingRounds.length} Pending
            </span>
            <span className={styles.statChip}>
              {endedRounds.length} Ended
            </span>
            {pendingApprovalsCount > 0 && (
              <span className={`${styles.statChip} ${styles.statChipDanger}`}>
                {pendingApprovalsCount} Your Approval
              </span>
            )}
          </div>

          {pendingApprovers.length > 0 && pendingApprovalsCount === 0 && (
            <div className={styles.pendingApproverRow}>
              <span className={styles.pendingApproverLabel}>Pending approvers:</span>
              {pendingApprovers.map((approver, idx) => (
                <span key={idx} className={styles.pendingApproverTag}>
                  {approver.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className={styles.bannerActions}>
          <Button
            variant="light"
            size="sm"
            onClick={handleCreateClick}
            disabled={!canWrite || permissionsLoading}
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
          >
            Create Round
          </Button>
          <Button
            variant="light"
            size="sm"
            onClick={handleHistoryClick}
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
          >
            View History
          </Button>
          {pendingApprovalsCount > 0 && (
            <Button
              variant="light"
              size="sm"
              onClick={handleViewApproveClick}
              disabled={!canWrite || permissionsLoading}
              className={`${styles.actionBtn} ${styles.actionBtnAttention}`}
            >
              Approval Queue
            </Button>
          )}
        </div>
      </div>

      <NegotiationModal
        show={showModal}
        handleShow={handleViewApproveClick}
        onHide={handleModalClose}
        mode={modalMode}
        rfq_id={rfq_id}
        products={products}
        activeRounds={activeRounds}
        roundsHistory={roundsHistory}
        selectedProduct={null}
        onProductSelect={() => {}}
        onRefresh={() => { loadActiveRounds(); onRoundChange?.(); }}
        canWrite={canWrite}
        permissionsLoading={permissionsLoading}
        hospitalityCompanyId={hospitalityCompanyId}
        hotelId={hotelId}
        departmentId={departmentId}
        preloadedApprovalBundle={preloadedApprovalBundle}
      />
    </>
  );
};

export default NegotiationCompactBanner;
