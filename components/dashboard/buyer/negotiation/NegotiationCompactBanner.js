import React, { useState, useEffect } from 'react';
import { Button, Badge } from 'react-bootstrap';
import { getAllActiveNegotiationRounds, getNegotiationRounds } from '@/services/negotiation';
import { getEntityApprovalInstances, getApprovalInstanceDetails } from '@/services/approval';
import { getProfile } from '@/services/Auth';
import NegotiationModal from './NegotiationModal';
import moment from 'moment';

const NegotiationCompactBanner = ({
  rfq_id,
  products = [],
  canWrite = true,
  permissionsLoading = false,
  hospitalityCompanyId,
  hotelId,
  departmentId,
  onRoundChange,
  arcApprovalData = null
}) => {
  const [activeRounds, setActiveRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [roundsHistory, setRoundsHistory] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (rfq_id) {
      loadActiveRounds();
      loadRoundsHistory();
    }
    getProfile().then(res => {
      if (res?.data?.id) {
        setCurrentUserId(res.data.id);
      }
    }).catch(() => {});
  }, [rfq_id]);

  const loadActiveRounds = async () => {
    try {
      setLoading(true);
      const response = await getAllActiveNegotiationRounds(rfq_id);
      console.log('Active rounds raw response:', response);

      // Axios interceptor already returns response.data, so response is the backend response
      let rounds = [];

      if (response) {
        if (response.status === 1 && response.data) {
          // Standard format: { status: 1, data: [...] }
          rounds = Array.isArray(response.data) ? response.data : [];
        } else if (Array.isArray(response)) {
          // Response is array directly
          rounds = response;
        } else if (Array.isArray(response.data)) {
          // Fallback: check if data exists
          rounds = response.data;
        }
      }

      console.log('Parsed rounds:', rounds, 'Count:', rounds.length);

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
    try {
      const response = await getNegotiationRounds(rfq_id);
      console.log('Rounds history raw response:', response);

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

      console.log('Parsed history rounds:', rounds, 'Count:', rounds.length);
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
    loadActiveRounds();
    // Sync parent's negotiation data with this banner
    onRoundChange?.();
  };

  // Helper to check if a round has ended based on end_date
  const isRoundEnded = (round) => {
    const status = (round?.status || '').toUpperCase();
    if (status === 'ACTIVE' && round?.end_date && moment(round.end_date).isBefore(moment())) {
      return true;
    }
    return false;
  };

  const pendingRounds = (activeRounds || []).filter(r => {
    const status = r?.status?.toUpperCase();
    return status === 'PENDING_APPROVAL';
  });

  // Active rounds: status is ACTIVE and end_date has NOT passed
  const activeRoundsList = (activeRounds || []).filter(r => {
    const status = r?.status?.toUpperCase();
    return status === 'ACTIVE' && !isRoundEnded(r);
  });

  // Rounds from activeRounds that have ended (status ACTIVE but end_date passed)
  const endedFromActiveRounds = (activeRounds || []).filter(r => {
    return isRoundEnded(r);
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

  // Determine background color
  let bgColor = '#e3f2fd'; // Subtle blue - no rounds
  let borderColor = '#90caf9';

  if (pendingApprovalsCount > 0) {
    bgColor = '#fff3f3';
    borderColor = '#dc3545';
  } else if (pendingRounds.length > 0) {
    bgColor = '#fff8e1';
    borderColor = '#ffcc80';
  } else if (activeRoundsList.length > 0) {
    bgColor = '#e8f5e9'; // Subtle green - rounds active, no approval needed
    borderColor = '#a5d6a7';
  }

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

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: bgColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '6px',
          padding: '12px 16px',
          marginBottom: '12px',
          minHeight: '50px',
        }}
      >
        {/* Left: Status Message */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {pendingApprovalsCount > 0 ? (
              <Badge
                bg="danger"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                Your Approval Required
              </Badge>
            ) : pendingRounds.length > 0 ? (
              <Badge
                bg="warning"
                text="dark"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                Approval Pending
              </Badge>
            ) : null}
            <span style={{ fontSize: '0.875rem', color: '#333' }}>
              <strong>Negotiation:</strong> {loading ? 'Loading...' : statusMessage}
            </span>
          </div>
          {pendingApprovers.length > 0 && pendingApprovalsCount === 0 && (
            <div style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 500 }}>Round approval pending from:</span>
              {pendingApprovers.map((approver, idx) => (
                <Badge key={idx} bg="secondary" style={{ fontSize: '0.7rem', marginRight: '4px' }}>
                  {approver.name}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Right: Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateClick}
            disabled={!canWrite || permissionsLoading}
            style={{ fontSize: '0.8rem', padding: '5px 14px' }}
          >
            Create
          </Button>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleHistoryClick}
            style={{ fontSize: '0.8rem', padding: '5px 14px' }}
          >
            History
          </Button>
          <Button
            variant={pendingApprovalsCount > 0 ? "danger" : "outline-info"}
            size="sm"
            onClick={handleViewApproveClick}
            disabled={pendingApprovalsCount > 0 && (!canWrite || permissionsLoading)}
            style={{
              fontSize: '0.8rem',
              padding: '5px 14px',
              position: 'relative',
              ...(pendingApprovalsCount > 0 ? {
                backgroundColor: '#dc3545',
                borderColor: '#dc3545',
                color: '#fff',
                fontWeight: 600
              } : {})
            }}
          >
            View
            {pendingApprovalsCount > 0 && (
              <Badge
                bg="danger"
                pill
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  fontSize: '0.65rem',
                  minWidth: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {pendingApprovalsCount}
              </Badge>
            )}
          </Button>
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
        onRefresh={loadActiveRounds}
        canWrite={canWrite}
        permissionsLoading={permissionsLoading}
        hospitalityCompanyId={hospitalityCompanyId}
        hotelId={hotelId}
        departmentId={departmentId}
      />
    </>
  );
};

export default NegotiationCompactBanner;
