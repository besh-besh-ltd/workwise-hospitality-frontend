import React, { useState } from 'react';
import { Button, Alert } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { toast } from 'react-toastify';
import moment from 'moment';
import NegotiationModal from './NegotiationModal';
import QuoteApprovalSelectionModal from './QuoteApprovalSelectionModal';

const RoundEndActions = ({
  activeRound,
  roundQuotes = [],
  rfq_id,
  rfq_product_id,
  productName,
  onRoundCreated,
  onQuotesApproved,
  canWrite = true,
  permissionsLoading = false,
  is_tender = false,
  vendorCodeMap = {}
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQuoteApprovalModal, setShowQuoteApprovalModal] = useState(false);

  // Check if round has ended
  const isRoundEnded = activeRound && (
    activeRound.status === 'CLOSED' ||
    (activeRound.status === 'ACTIVE' && moment(activeRound.end_date).isBefore(moment()))
  );

  if (!activeRound || !isRoundEnded || roundQuotes.length === 0) {
    return null;
  }

  const handleApproveQuotes = () => {
    if (roundQuotes.length === 0) {
      toast.error('No quotes to approve');
      return;
    }

    if (is_tender) {
      // For tenders, open the quote selection modal
      setShowQuoteApprovalModal(true);
    } else {
      // For non-tenders, show info message (existing behavior)
      toast.info('Please finalize the vendor from the quote comparison table. The negotiation quotes are highlighted.');
    }
  };

  const handleQuoteApprovalSuccess = () => {
    if (onQuotesApproved) {
      onQuotesApproved();
    }
  };

  return (
    <div className="my-3">
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
            className="p-2"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            disabled={!canWrite || permissionsLoading}
          >
            <FontAwesomeIcon icon={faPlus} className="me-1" />
            Create Another Round
          </Button>
          {is_tender && (
            <Button
              variant="success"
              className="p-2"
              size="sm"
              onClick={handleApproveQuotes}
              disabled={!canWrite || permissionsLoading}
            >
              <FontAwesomeIcon icon={faCheckCircle} className="me-1" />
              Approve Best Quotes
            </Button>
          )}
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

      {showQuoteApprovalModal && (
        <QuoteApprovalSelectionModal
          show={showQuoteApprovalModal}
          onHide={() => setShowQuoteApprovalModal(false)}
          roundQuotes={roundQuotes}
          activeRound={activeRound}
          rfq_id={rfq_id}
          rfq_product_id={rfq_product_id}
          productName={productName}
          vendorCodeMap={vendorCodeMap}
          onSuccess={handleQuoteApprovalSuccess}
        />
      )}
    </div>
  );
};

export default RoundEndActions;

