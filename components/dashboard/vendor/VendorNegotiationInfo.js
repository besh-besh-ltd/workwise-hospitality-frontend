import React, { useState, useEffect } from 'react';
import { Alert, Badge } from 'react-bootstrap';
import { getVendorNegotiationStatus } from '@/services/negotiation';
import moment from 'moment';

const VendorNegotiationInfo = ({ rfq_id, rfq_product_id }) => {
  const [negotiationStatus, setNegotiationStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (rfq_id && rfq_product_id) {
      loadNegotiationStatus();
    }
  }, [rfq_id, rfq_product_id]);

  useEffect(() => {
    if (negotiationStatus?.hasActiveRound && negotiationStatus?.round?.status === 'ACTIVE') {
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
        } else if (response.hasActiveRound !== undefined) {
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

  const updateTimeRemaining = () => {
    if (!negotiationStatus?.round?.end_date) return;

    const now = moment();
    const endDate = moment(negotiationStatus.round.end_date);
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

  if (loading) {
    return (
      <Alert variant="info" className="mb-3">
        <small>Loading negotiation information...</small>
      </Alert>
    );
  }

  if (!negotiationStatus?.hasActiveRound) {
    return null;
  }

  const round = negotiationStatus.round;
  const hasSubmittedQuote = negotiationStatus.hasSubmittedQuote;
  const vendorQuote = negotiationStatus.vendorQuote;
  const isExpired = round?.isExpired || timeRemaining === 'Expired';
  const isPending = round?.status === 'PENDING_APPROVAL';

  return (
    <Alert 
      variant={hasSubmittedQuote ? 'success' : isExpired ? 'danger' : isPending ? 'warning' : 'info'}
      className="mb-3"
    >
      <div className="d-flex justify-content-between align-items-center flex-wrap">
        <div className="flex-grow-1">
          {hasSubmittedQuote ? (
            <>
              <strong>Negotiation Quote Already Submitted</strong>
              <div className="mt-2">
                <strong>Quoted Price:</strong> ₹{parseFloat(vendorQuote?.quoted_price || 0).toLocaleString()}
              </div>
              <div className="mt-1">
                <strong>Submitted At:</strong> {moment(vendorQuote?.submitted_at).format('DD/MM/YYYY HH:mm')}
              </div>
              <div className="mt-1">
                <small className="text-muted">
                  You have already submitted your negotiation quote for this round. No further updates allowed.
                </small>
              </div>
            </>
          ) : (
            <>
              <strong>
                {isPending ? 'Negotiation Round Pending Approval' : 'Active Negotiation Round'}
              </strong>
              {round?.status === 'ACTIVE' && (
                <>
                  <div className="mt-2">
                    <strong>Target Price:</strong> ₹{parseFloat(round.target_price).toLocaleString()}
                  </div>
                  <div className="mt-1">
                    <strong>End Date:</strong> {moment(round.end_date).format('DD/MM/YYYY HH:mm')}
                  </div>
                  {timeRemaining && (
                    <div className="mt-1">
                      <strong>Time Remaining:</strong>{' '}
                      <Badge bg={isExpired ? 'danger' : 'warning'}>
                        {timeRemaining}
                      </Badge>
                    </div>
                  )}
                  <div className="mt-1">
                    <small className="text-muted">
                      Note: Only one quote submission allowed per negotiation round
                    </small>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        {hasSubmittedQuote && (
          <Badge bg="success" className="ms-2">
            Submitted
          </Badge>
        )}
        {!hasSubmittedQuote && round?.status === 'ACTIVE' && !isExpired && (
          <Badge bg="info" className="ms-2">
            Submit Quote
          </Badge>
        )}
        {!hasSubmittedQuote && isExpired && (
          <Badge bg="danger" className="ms-2">
            Expired
          </Badge>
        )}
      </div>
    </Alert>
  );
};

export default VendorNegotiationInfo;

