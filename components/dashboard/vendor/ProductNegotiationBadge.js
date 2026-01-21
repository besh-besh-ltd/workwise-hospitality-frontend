import React, { useState, useEffect } from 'react';
import { Badge } from 'react-bootstrap';
import { getVendorNegotiationStatus } from '@/services/negotiation';
import moment from 'moment';

const ProductNegotiationBadge = ({ rfq_id, rfq_product_id }) => {
  const [negotiationStatus, setNegotiationStatus] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(false);

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

    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m`);
    } else {
      setTimeRemaining(`${minutes}m`);
    }
  };

  if (loading || !negotiationStatus?.hasActiveRound) {
    return null;
  }

  const round = negotiationStatus.round;
  const hasSubmittedQuote = negotiationStatus.hasSubmittedQuote;
  const isExpired = round?.isExpired || timeRemaining === 'Expired';
  const isPending = round?.status === 'PENDING_APPROVAL';

  if (isPending) {
    return (
      <div className="mt-1">
        <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem' }}>
          Negotiation Pending Approval
        </Badge>
      </div>
    );
  }

  if (round?.status === 'ACTIVE') {
    return (
      <div className="mt-1 d-flex align-items-center gap-1 flex-wrap">
        {hasSubmittedQuote ? (
          <Badge bg="success" style={{ fontSize: '0.7rem' }}>
            Negotiation Quote Submitted
          </Badge>
        ) : (
          <>
            <Badge bg="info" style={{ fontSize: '0.7rem' }}>
              Target: ₹{parseFloat(round.target_price).toLocaleString()}
            </Badge>
            {timeRemaining && (
              <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem' }}>
                {timeRemaining}
              </Badge>
            )}
          </>
        )}
      </div>
    );
  }

  return null;
};

export default ProductNegotiationBadge;

