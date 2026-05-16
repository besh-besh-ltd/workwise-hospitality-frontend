import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Plus, History, ShieldCheck } from 'lucide-react';
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
  finalizationApprovalCompleted = false,
  hasPendingFinalizationApproval = false,
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
            if (round.status === 'PENDING_APPROVAL' && round.id) {
              const byRoundId = preloadedApprovalBundle.negotiation_instances?.[String(round.id)] || [];
              const byProductId = preloadedApprovalBundle.negotiation_instances?.[String(round.rfq_product_id)] || [];
              const instances = byRoundId.length > 0 ? byRoundId : byProductId;
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
        if (round.status === 'PENDING_APPROVAL' && round.id) {
          try {
            const instancesRes = await getEntityApprovalInstances('NEGOTIATION', round.id);
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

  // Filter out rejected rounds from pending
  const pendingRounds = (activeRounds || []).filter(r => {
    const status = r?.status?.toUpperCase();
    return status === 'PENDING_APPROVAL' && !isRoundRejected(r);
  });

  // Active rounds: status is ACTIVE and not rejected
  const activeRoundsList = (activeRounds || []).filter(r => {
    const status = r?.status?.toUpperCase();
    return status === 'ACTIVE' && !isRoundRejected(r);
  });

  // Ended rounds from activeRounds (status ENDED)
  const endedFromActiveRounds = (activeRounds || []).filter(r => {
    const status = r?.status?.toUpperCase();
    return status === 'ENDED' && !isRoundRejected(r);
  });

  // Calculate ended rounds from history (CLOSED or COMPLETED status)
  const endedFromHistory = (roundsHistory || []).filter(r => {
    const status = r?.status?.toUpperCase();
    return status === 'CLOSED' || status === 'COMPLETED' || status === 'EXPIRED' || status === 'ENDED';
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

  // Button is disabled only when every vendor on every product is already in an active/pending round.
  // in_active_round is the per-vendor flag that correctly handles parallel rounds and reflects
  // rejected vendors (set to false by backend so they're eligible for a new round).
  // Per-field negotiation: vendors can be in a round for some fields but still eligible for others
  const allVendorsInRounds = false;

  // Check if all products have quote_approval_status approved — disable Create Round
  const allQuotesApproved = products.length > 0 && products.every(p => p.quote_approval_status?.status === 'APPROVED');

  // Disable Create Round when the finalization cycle is in flight ("Finalized" or "In Approval"/"Action Required" of cycle b)
  const finalizationCycleBlocksRound = finalizationApprovalCompleted || hasPendingFinalizationApproval;

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
          {allVendorsInRounds ? (
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip id="create-round-disabled">
                  All vendors are already in negotiation round
                </Tooltip>
              }
            >
              <span className="d-inline-block">
                <button
                  type="button"
                  disabled
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  style={{ pointerEvents: 'none' }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Create Round
                </button>
              </span>
            </OverlayTrigger>
          ) : finalizationCycleBlocksRound ? (
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip id="create-round-disabled-finalization">
                  {finalizationApprovalCompleted
                    ? 'Vendor finalization is already approved'
                    : 'Vendor finalization is awaiting approval'}
                </Tooltip>
              }
            >
              <span className="d-inline-block">
                <button
                  type="button"
                  disabled
                  className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                  style={{ pointerEvents: 'none' }}
                >
                  <Plus size={14} strokeWidth={2.5} />
                  Create Round
                </button>
              </span>
            </OverlayTrigger>
          ) : (
            <button
              type="button"
              onClick={handleCreateClick}
              disabled={!canWrite || permissionsLoading || allQuotesApproved}
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            >
              <Plus size={14} strokeWidth={2.5} />
              Create Round
            </button>
          )}
          <button
            type="button"
            onClick={handleHistoryClick}
            className={`${styles.actionBtn} ${styles.actionBtnSecondary}`}
          >
            <History size={14} strokeWidth={2} />
            View History
          </button>
          {pendingApprovalsCount > 0 && (
            <button
              type="button"
              onClick={handleViewApproveClick}
              disabled={!canWrite || permissionsLoading}
              className={`${styles.actionBtn} ${styles.actionBtnAttention}`}
            >
              <ShieldCheck size={14} strokeWidth={2} />
              Approval Queue
            </button>
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
