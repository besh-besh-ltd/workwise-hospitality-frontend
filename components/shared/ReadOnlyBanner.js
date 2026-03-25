import React from "react";
import { BsEyeFill } from "react-icons/bs";

/**
 * Read-only mode banner component
 * Shows when user has "read" but not "update" permission
 */
const ReadOnlyBanner = ({
  title = "View Only Mode",
  message = "You don't have edit permissions for this tender.",
  className = "",
  dismissible = false,
  onDismiss = null,
}) => {
  return (
    <>
      <style jsx>{`
        .rob-wrapper {
          width: 100%;
          padding: 0;
          margin-bottom: 16px;
        }
        .rob-banner {
          width: 100%;
          background: linear-gradient(135deg, #fff8e1 0%, #fff3cd 50%, #ffecb3 100%);
          border: 1.5px solid #f0c040;
          border-radius: 10px;
          padding: 16px 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(212, 160, 23, 0.15), 0 0 0 1px rgba(212, 160, 23, 0.05);
        }
        .rob-banner::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 5px;
          background: linear-gradient(180deg, #e6a800, #f0c040);
          border-radius: 4px 0 0 4px;
        }
        .rob-icon-area {
          flex-shrink: 0;
        }
        .rob-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: linear-gradient(135deg, #e6a800, #f5ca3c);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 10px rgba(212, 160, 23, 0.35);
        }
        .rob-content {
          flex: 1;
          min-width: 0;
        }
        .rob-top-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 3px;
        }
        .rob-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #5a4106;
          margin: 0;
        }
        .rob-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 10px;
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #fff;
          background: #d4a017;
          border-radius: 20px;
        }
        .rob-message {
          font-size: 0.82rem;
          color: #6b5a1e;
          line-height: 1.5;
          margin: 0;
        }
        .rob-dismiss {
          flex-shrink: 0;
          padding: 4px 8px;
          background: rgba(212, 160, 23, 0.12);
          border: 1px solid rgba(212, 160, 23, 0.25);
          border-radius: 6px;
          color: #8a6914;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          line-height: 1;
          transition: all 0.2s;
        }
        .rob-dismiss:hover {
          background: rgba(212, 160, 23, 0.22);
          border-color: rgba(212, 160, 23, 0.4);
        }
        @media (max-width: 768px) {
          .rob-banner {
            flex-direction: column;
            text-align: center;
            align-items: center;
            padding: 16px;
            gap: 12px;
          }
          .rob-top-row {
            justify-content: center;
          }
        }
      `}</style>

      <div className={`rob-wrapper ${className}`}>
        <div className="rob-banner">
          <div className="rob-icon-area">
            <div className="rob-icon-circle">
              <BsEyeFill size={20} color="#ffffff" />
            </div>
          </div>
          <div className="rob-content">
            <div className="rob-top-row">
              <h2 className="rob-title">{title}</h2>
            </div>
            <p className="rob-message">{message}</p>
          </div>
          {dismissible && onDismiss && (
            <button className="rob-dismiss" onClick={onDismiss} aria-label="Dismiss">
              &times;
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default ReadOnlyBanner;
