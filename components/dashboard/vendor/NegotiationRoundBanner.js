import React, { useState, useEffect } from "react";
import { Card, Badge, Alert } from "react-bootstrap";
import { getActiveNegotiationRound } from "@/services/negotiation";
import moment from 'moment';

const VendorNegotiationRoundBanner = ({ rfq_id }) => {
  const [activeRound, setActiveRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (rfq_id) {
      loadActiveRound();
    }
  }, [rfq_id]);

  useEffect(() => {
    if (activeRound && activeRound.status === 'ACTIVE' && activeRound.end_date) {
      const calculateCountdown = () => {
        const now = moment();
        const endDate = moment.utc(activeRound.end_date);
        const diff = endDate.diff(now);

        if (diff <= 0) {
          setCountdown("Expired");
          setIsExpired(true);
          return true; // Signal to clear interval
        } else {
          const duration = moment.duration(diff);
          const days = Math.floor(duration.asDays());
          const hours = duration.hours();
          const minutes = duration.minutes();
          setCountdown(`${days} days, ${hours} hours, ${minutes} minutes`);
          return false;
        }
      };

      // Initial calculation
      const isExpiredNow = calculateCountdown();

      if (!isExpiredNow) {
        const interval = setInterval(() => {
          const expired = calculateCountdown();
          if (expired) clearInterval(interval);
        }, 60000); // Update every minute

        return () => clearInterval(interval);
      }
    }
  }, [activeRound]);

  const loadActiveRound = async () => {
    try {
      setLoading(true);
      const response = await getActiveNegotiationRound(rfq_id);
      if (response.status === 1 && response.data && response.data.status === 'ACTIVE') {
        setActiveRound(response.data);
      } else {
        setActiveRound(null);
      }
    } catch (error) {
      console.error("Error loading negotiation round:", error);
      setActiveRound(null);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `₹${parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return null;
  }

  if (!activeRound) {
    return null;
  }

  return (
    <Alert
      variant={isExpired ? "danger" : "warning"}
      className="mb-4"
      style={{
        padding: "20px",
        border: "2px solid",
        borderColor: isExpired ? "#dc3545" : "#ffc107",
        borderRadius: "8px",
        fontSize: "16px"
      }}
    >
      <div className="d-flex justify-content-between align-items-center flex-wrap">
        <div className="flex-grow-1">
          <h4 className="mb-2 fw-bold">
            <Badge bg="primary" className="me-2">Round {activeRound.round_number}</Badge>
            Negotiation Round Active
          </h4>
          <div className="mb-2">
            <strong>Target Price:</strong>{" "}
            <span style={{ fontSize: "20px", color: "#158993", fontWeight: "bold" }}>
              {formatPrice(activeRound.target_price)}
            </span>
          </div>
          {!isExpired && countdown && (
            <div className="mb-2">
              <strong>Time Remaining:</strong>{" "}
              <span style={{ fontSize: "18px", fontWeight: "bold" }}>
                {countdown}
              </span>
            </div>
          )}
          {isExpired && (
            <div className="mb-2">
              <strong className="text-danger">Round has expired. Quote submission is no longer allowed.</strong>
            </div>
          )}
          <div className="small text-muted">
            End Date: {moment.utc(activeRound.end_date).local().format('DD-MM-YYYY hh:mm A')}
          </div>
        </div>
      </div>
    </Alert>
  );
};

export default VendorNegotiationRoundBanner;

