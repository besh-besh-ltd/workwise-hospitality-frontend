import React, { useState } from 'react';
import { Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import moment from 'moment';
import NegotiationModal from './NegotiationModal';
import { finalizeQuotation } from '@/services/rfq';

const RoundEndActions = ({
  activeRound,
  roundQuotes = [],
  rfq_id,
  rfq_product_id,
  productName,
  onRoundCreated,
  onQuotesApproved,
  canWrite = true,
  permissionsLoading = false
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [approving, setApproving] = useState(false);

  // Check if round has ended
  const isRoundEnded = activeRound && (
    activeRound.status === 'CLOSED' || 
    (activeRound.status === 'ACTIVE' && moment(activeRound.end_date).isBefore(moment()))
  );

  if (!activeRound || !isRoundEnded || roundQuotes.length === 0) {
    return null;
  }

  const handleApproveQuotes = async () => {
    if (roundQuotes.length === 0) {
      toast.error('No quotes to approve');
      return;
    }

    // Find the best quote (lowest price)
    const bestQuote = roundQuotes.reduce((best, current) => {
      const bestPrice = parseFloat(best.quoted_price || 0);
      const currentPrice = parseFloat(current.quoted_price || 0);
      return currentPrice < bestPrice ? current : best;
    }, roundQuotes[0]);

    try {
      setApproving(true);
      
      // Get the original quote details
      // Note: This would need to be passed from parent or fetched
      // For now, we'll show a message that user needs to finalize manually
      toast.info('Please finalize the vendor from the quote comparison table. The negotiation quotes are highlighted.');
      
      if (onQuotesApproved) {
        onQuotesApproved(bestQuote);
      }
    } catch (error) {
      console.error('Error approving quotes:', error);
      toast.error('Failed to approve quotes');
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="mb-3">
      <Alert variant="info" className="d-flex justify-content-between align-items-center">
        <div>
          <strong>Round {activeRound.round_number} Ended</strong>
          <div className="small mt-1">
            {roundQuotes.length} quote(s) received. Choose an action:
          </div>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            disabled={!canWrite || permissionsLoading}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" />
            Create Another Round
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={handleApproveQuotes}
            disabled={approving || !canWrite || permissionsLoading}
          >
            <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
            {approving ? 'Processing...' : 'Approve Best Quote'}
          </Button>
        </div>
      </Alert>

      {showCreateModal && (
        <NegotiationModal
          show={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          mode="create"
          rfq_id={rfq_id}
          products={[{ id: rfq_product_id, name: productName }]}
          onSuccess={() => {
            setShowCreateModal(false);
            if (onRoundCreated) {
              onRoundCreated();
            }
          }}
        />
      )}
    </div>
  );
};

export default RoundEndActions;

