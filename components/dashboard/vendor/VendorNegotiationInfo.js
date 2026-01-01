import React, { useState, useEffect } from 'react';
import { Alert, Badge } from 'react-bootstrap';
import { getActiveNegotiationRound } from '@/services/negotiation';
import moment from 'moment';

const VendorNegotiationInfo = ({ rfq_id, rfq_product_id }) => {
  const [activeRound, setActiveRound] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (rfq_id && rfq_product_id) {
      console.log('VendorNegotiationInfo - Loading round for RFQ:', rfq_id, 'Product:', rfq_product_id);
      loadActiveRound();
    } else {
      console.log('VendorNegotiationInfo - Missing params:', { rfq_id, rfq_product_id });
    }
  }, [rfq_id, rfq_product_id]);

  useEffect(() => {
    if (activeRound && activeRound.status === 'ACTIVE') {
      const interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
      updateTimeRemaining();
      return () => clearInterval(interval);
    }
  }, [activeRound]);

  const loadActiveRound = async () => {
    try {
      setLoading(true);
      const response = await getActiveNegotiationRound(rfq_id, rfq_product_id);
      console.log('VendorNegotiationInfo - Response:', response);
      
      // Handle different response formats
      let roundData = null;
      if (response) {
        if (response.status === 1 && response.data) {
          // Standard format: { status: 1, data: {...} }
          roundData = response.data;
        } else if (response.status === 1 && response.data === null) {
          // No active round found
          roundData = null;
        } else if (response.data && !response.status) {
          // Response might be just the data object
          roundData = response.data;
        } else if (response.id) {
          // Response might be the round object directly
          roundData = response;
        }
      }
      
      console.log('VendorNegotiationInfo - Round data:', roundData, 'for product:', rfq_product_id);
      setActiveRound(roundData);
    } catch (error) {
      console.error('Error loading active round:', error);
      setActiveRound(null);
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = () => {
    if (!activeRound || !activeRound.end_date) return;

    const now = moment();
    const endDate = moment(activeRound.end_date);
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

  // Show loading state briefly, but don't hide if we're still loading
  // Only hide if we've finished loading and there's no round
  if (loading) {
    return (
      <Alert variant="info" className="mb-3">
        <small>Loading negotiation information...</small>
      </Alert>
    );
  }

  if (!activeRound) {
    return null; // Don't show anything if no active round
  }

  const isExpired = activeRound.status === 'ACTIVE' && timeRemaining === 'Expired';
  const isPending = activeRound.status === 'PENDING_APPROVAL';

  return (
    <Alert 
      variant={isExpired ? 'danger' : isPending ? 'warning' : 'info'}
      className="mb-3"
    >
      <div className="d-flex justify-content-between align-items-center flex-wrap">
        <div className="flex-grow-1">
          <strong>
            {isPending ? 'Negotiation Round Pending Approval' : 'Active Negotiation Round'}
          </strong>
          {activeRound.status === 'ACTIVE' && (
            <>
              <div className="mt-2">
                <strong>Target Price:</strong> ₹{parseFloat(activeRound.target_price).toLocaleString()}
              </div>
              <div className="mt-1">
                <strong>End Date:</strong> {moment(activeRound.end_date).format('DD/MM/YYYY HH:mm')}
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
        </div>
        {activeRound.status === 'ACTIVE' && !isExpired && (
          <Badge bg="success" className="ms-2">
            Submit Quote
          </Badge>
        )}
        {isExpired && (
          <Badge bg="danger" className="ms-2">
            Expired
          </Badge>
        )}
      </div>
    </Alert>
  );
};

export default VendorNegotiationInfo;

