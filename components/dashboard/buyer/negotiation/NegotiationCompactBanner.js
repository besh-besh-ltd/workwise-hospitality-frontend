import React, { useState, useEffect } from 'react';
import { Button, Badge } from 'react-bootstrap';
import { getAllActiveNegotiationRounds, getNegotiationRounds } from '@/services/negotiation';
import NegotiationModal from './NegotiationModal';

const NegotiationCompactBanner = ({ rfq_id, products = [] }) => {
  const [activeRounds, setActiveRounds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState(null);
  const [roundsHistory, setRoundsHistory] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    if (rfq_id) {
      loadActiveRounds();
    }
    const userId = localStorage.getItem('userId') || localStorage.getItem('user_id');
    if (userId) {
      setCurrentUserId(parseInt(userId));
    }
  }, [rfq_id]);

  const loadActiveRounds = async () => {
    try {
      setLoading(true);
      const response = await getAllActiveNegotiationRounds(rfq_id);
      if (response.status === 1 && response.data) {
        setActiveRounds(response.data || []);
      }
    } catch (error) {
      console.error('Error loading active rounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRoundsHistory = async () => {
    try {
      const response = await getNegotiationRounds(rfq_id);
      if (response.status === 1 && response.data) {
        setRoundsHistory(response.data || []);
      }
    } catch (error) {
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
  };

  const pendingRounds = activeRounds.filter(r => r.status === 'PENDING_APPROVAL');
  const activeRoundsList = activeRounds.filter(r => r.status === 'ACTIVE');
  const totalActiveCount = pendingRounds.length + activeRoundsList.length;

  const pendingApprovalsCount = pendingRounds.filter(round => {
    if (!currentUserId) return false;
    const approvals = round.approvals || [];
    return approvals.some(a => a.status === 'PENDING' && a.approver_user_id === currentUserId);
  }).length;

  // Determine background color
  let bgColor = '#e3f2fd'; // Subtle blue - no rounds
  let borderColor = '#90caf9';
  
  if (pendingApprovalsCount > 0 || pendingRounds.length > 0) {
    bgColor = '#fff8e1'; // Subtle yellow - approval required
    borderColor = '#ffcc80';
  } else if (activeRoundsList.length > 0) {
    bgColor = '#e8f5e9'; // Subtle green - rounds active, no approval needed
    borderColor = '#a5d6a7';
  }

  // Build status message
  let statusMessage = 'No active negotiation rounds';
  if (totalActiveCount > 0) {
    const parts = [];
    if (activeRoundsList.length > 0) {
      parts.push(`${activeRoundsList.length} active`);
    }
    if (pendingRounds.length > 0) {
      parts.push(`${pendingRounds.length} pending approval`);
    }
    statusMessage = `${parts.join(', ')} round${totalActiveCount > 1 ? 's' : ''}`;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.875rem', color: '#333' }}>
            <strong>Negotiation:</strong> {loading ? 'Loading...' : statusMessage}
          </span>
          {pendingApprovalsCount > 0 && (
            <Badge bg="warning" text="dark" style={{ fontSize: '0.75rem' }}>
              {pendingApprovalsCount} needs your approval
            </Badge>
          )}
        </div>

        {/* Right: Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateClick}
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
            variant={pendingApprovalsCount > 0 ? "warning" : "outline-info"}
            size="sm"
            onClick={handleViewApproveClick}
            style={{ fontSize: '0.8rem', padding: '5px 14px' }}
          >
            {pendingApprovalsCount > 0 ? 'Approve' : 'View'}
          </Button>
        </div>
      </div>

      <NegotiationModal
        show={showModal}
        onHide={handleModalClose}
        mode={modalMode}
        rfq_id={rfq_id}
        products={products}
        activeRounds={activeRounds}
        roundsHistory={roundsHistory}
        selectedProduct={null}
        onProductSelect={() => {}}
        onRefresh={loadActiveRounds}
      />
    </>
  );
};

export default NegotiationCompactBanner;
