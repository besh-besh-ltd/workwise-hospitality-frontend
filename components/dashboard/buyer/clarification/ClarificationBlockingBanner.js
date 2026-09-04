import React from "react";
import { Alert, Button } from "react-bootstrap";
import { BsExclamationTriangleFill, BsEye, BsClockFill, BsChatDots } from "react-icons/bs";

/**
 * ClarificationBlockingBanner
 * Displays a warning banner when a clarification is open and quote submission is blocked
 *
 * @param {object} clarification - The open clarification object
 * @param {function} onViewDetails - Callback to view clarification details
 * @param {string} clarificationDeadline - Deadline for clarification period
 * @param {boolean} isOwner - True if the current vendor raised this clarification
 */
const ClarificationBlockingBanner = ({
  clarification,
  onViewDetails,
  clarificationDeadline,
  isOwner = false,
}) => {
  // Calculate time remaining until clarification deadline (if provided)
  const getTimeRemaining = () => {
    if (!clarificationDeadline) return null;
    const deadline = new Date(clarificationDeadline);
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) return "Clarification period ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ${hours}h remaining`;
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  const timeRemaining = getTimeRemaining();

  // Get latest message and message count for owner view
  const messageCount = clarification?.messages?.length || 0;
  const latestMessage = clarification?.messages?.[clarification.messages.length - 1];
  const latestMessagePreview = latestMessage?.message || clarification?.subject;

  // Owner of the clarification sees detailed message
  if (isOwner) {
    return (
      <Alert
        variant="info"
        className="d-flex align-items-center justify-content-between mb-3 py-3"
      >
        <div className="d-flex align-items-center gap-3">
          <BsClockFill size={24} className="text-info" />
          <div>
            <strong className="d-block">Your Clarification is Pending</strong>
            <span className="text-muted">
              Your clarification request has been submitted. A response from the tender creator will arrive soon.
              {clarification?.subject && (
                <span className="d-block mt-1">
                  <em>Subject: {clarification.subject}</em>
                </span>
              )}
              {messageCount > 0 && (
                <span className="d-block mt-1">
                  <BsChatDots size={12} className="me-1" />
                  <strong>{messageCount} message{messageCount > 1 ? "s" : ""}</strong>
                  {latestMessagePreview && (
                    <span className="ms-1 text-truncate" style={{ maxWidth: 200 }}>
                      - {latestMessagePreview.substring(0, 50)}
                      {latestMessagePreview.length > 50 ? "..." : ""}
                    </span>
                  )}
                </span>
              )}
              <span className="d-block mt-1 text-secondary">
                Quote submission is disabled until the clarification is resolved.
              </span>
            </span>
          </div>
        </div>
        {onViewDetails && (
          <Button
            variant="outline-dark"
            size="sm"
            onClick={onViewDetails}
            className="d-flex align-items-center p-2 px-3 gap-2"
          >
            <BsEye size={16} />
            View Details
          </Button>
        )}
      </Alert>
    );
  }

  // Other vendors see generic blocking message (no details)
  return (
    <Alert
      variant="warning"
      className="d-flex align-items-center mb-3 py-3"
    >
      <div className="d-flex align-items-center gap-3">
        <BsExclamationTriangleFill size={24} className="text-warning" />
        <div>
          <strong className="d-block">Clarification in Progress</strong>
          <span className="text-muted">
            A clarification is currently being addressed by the tender creator.
            <span className="d-block mt-1">
              Quote submission is temporarily disabled. Please check back later.
            </span>
            {timeRemaining && (
              <span className="d-block mt-1 text-secondary">
                {timeRemaining}
              </span>
            )}
          </span>
        </div>
      </div>
    </Alert>
  );
};

export default ClarificationBlockingBanner;
