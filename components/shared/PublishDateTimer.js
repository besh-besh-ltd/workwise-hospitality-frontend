import React, { useState, useEffect } from 'react';
import { BsCalendarEvent } from 'react-icons/bs';
import moment from 'moment';

/**
 * Displays a countdown timer for RFQ/Tender publish date
 * @param {string} publishDate - The scheduled publish date
 * @param {string} variant - 'badge' for compact display, 'full' for detailed display
 * @param {boolean} showLabel - Whether to show "Publishes in" label
 */
const PublishDateTimer = ({ publishDate, variant = 'badge', showLabel = true }) => {
  const [countdown, setCountdown] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!publishDate) return;

    const calculateCountdown = () => {
      const now = new Date();
      const pubDate = new Date(publishDate);
      const diff = pubDate - now;

      if (diff <= 0) {
        setIsExpired(true);
        setCountdown('');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (variant === 'badge') {
        setCountdown(days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`);
      } else {
        setCountdown(days > 0
          ? `${days} days, ${hours} hours`
          : `${hours} hours, ${minutes} minutes`
        );
      }
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [publishDate, variant]);

  if (!publishDate || isExpired) return null;

  if (variant === 'badge') {
    return (
      <span
        className="badge rounded-pill d-inline-flex align-items-center gap-1"
        style={{
          backgroundColor: '#e7f3ff',
          color: '#0d6efd',
          fontSize: '0.75rem',
          fontWeight: 500,
          padding: '4px 8px'
        }}
        role="timer"
        aria-live="polite"
        aria-label={`Publishes in ${countdown}`}
      >
        <BsCalendarEvent size={10} />
        {showLabel ? `Publishes in ${countdown}` : countdown}
      </span>
    );
  }

  // Full display variant
  return (
    <div className="d-flex align-items-center gap-2 text-primary">
      <BsCalendarEvent size={14} />
      <span className="fw-medium">
        Publishes in {countdown}
      </span>
    </div>
  );
};

export default PublishDateTimer;
