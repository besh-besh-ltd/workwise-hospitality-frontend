import React, { useState, useEffect } from 'react';
import { Badge } from 'react-bootstrap';
import { getActiveNegotiationRound } from '@/services/negotiation';
import moment from 'moment';

const ProductNegotiationBadge = ({ rfq_id, rfq_product_id }) => {
  const [activeRound, setActiveRound] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (rfq_id && rfq_product_id) {
      loadActiveRound();
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
      
      let roundData = null;
      if (response) {
        if (response.status === 1 && response.data) {
          roundData = response.data;
        } else if (response.status === 1 && response.data === null) {
          roundData = null;
        } else if (response.data && !response.status) {
          roundData = response.data;
        } else if (response.id) {
          roundData = response;
        }
      }
      
      setActiveRound(roundData);
    } catch (error) {
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

    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m`);
    } else {
      setTimeRemaining(`${minutes}m`);
    }
  };

  if (loading || !activeRound) {
    return null;
  }

  const isExpired = activeRound.status === 'ACTIVE' && timeRemaining === 'Expired';
  const isPending = activeRound.status === 'PENDING_APPROVAL';

  if (isPending) {
    return (
      <div className="mt-1">
        <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem' }}>
          Negotiation Pending Approval
        </Badge>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="mt-1">
        <Badge bg="danger" style={{ fontSize: '0.7rem' }}>
          Negotiation Expired
        </Badge>
      </div>
    );
  }

  if (activeRound.status === 'ACTIVE') {
    return (
      <div className="mt-1 d-flex align-items-center gap-1 flex-wrap">
        <Badge bg="info" style={{ fontSize: '0.7rem' }}>
          Target: ₹{parseFloat(activeRound.target_price).toLocaleString()}
        </Badge>
        {timeRemaining && (
          <Badge bg="warning" text="dark" style={{ fontSize: '0.7rem' }}>
            {timeRemaining}
          </Badge>
        )}
      </div>
    );
  }

  return null;
};

export default ProductNegotiationBadge;

