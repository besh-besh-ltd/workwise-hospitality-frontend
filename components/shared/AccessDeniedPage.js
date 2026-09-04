import React from "react";
import { useRouter } from "next/router";
import { BsShieldLock, BsArrowLeft } from "react-icons/bs";

/**
 * Access Denied page component
 * Shows when user lacks "read" permission for a module
 */
const AccessDeniedPage = ({
  title = "Access Denied",
  message = "You do not have permission to view this content.",
  showBackButton = true,
  backUrl = "/dashboard/buyer/rfq-management",
  backLabel = "Back to Management",
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  return (
    <>
      <style jsx>{`
        .adp-wrapper {
          width: 100%;
          padding: 0;
        }
        .adp-banner {
          width: 100%;
          background: linear-gradient(135deg, #fef8f8 0%, #fdf0f0 100%);
          border: 1px solid rgba(192, 57, 43, 0.12);
          border-radius: 10px;
          padding: 18px 22px;
          display: flex;
          align-items: flex-start;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }
        .adp-banner::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, #c0392b, #e74c3c);
          border-radius: 4px 0 0 4px;
        }
        .adp-icon-area {
          flex-shrink: 0;
          padding-top: 2px;
        }
        .adp-icon-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #c0392b, #e74c3c);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(192, 57, 43, 0.25);
        }
        .adp-content {
          flex: 1;
          min-width: 0;
        }
        .adp-top-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .adp-title {
          font-size: 0.92rem;
          font-weight: 700;
          color: #1a2730;
          margin: 0;
        }
        .adp-badge {
          display: inline-block;
          padding: 2px 9px;
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          color: #c0392b;
          background: rgba(192, 57, 43, 0.08);
          border-radius: 20px;
        }
        .adp-message {
          font-size: 0.82rem;
          color: #495057;
          line-height: 1.5;
          margin: 0 0 6px;
        }
        .adp-helper {
          font-size: 0.73rem;
          color: #6c757d;
          margin: 0;
          line-height: 1.5;
        }
        .adp-actions {
          flex-shrink: 0;
          padding-top: 2px;
        }
        .adp-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 20px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #c0392b;
          background: transparent;
          border: 1.5px solid rgba(192, 57, 43, 0.3);
          border-radius: 8px;
          cursor: pointer;
          transition: all ease-in-out 0.3s;
          white-space: nowrap;
        }
        .adp-button:hover {
          background: rgba(192, 57, 43, 0.06);
          border-color: #c0392b;
        }
        .adp-button:active {
          background: rgba(192, 57, 43, 0.1);
        }
        @media (max-width: 768px) {
          .adp-banner {
            flex-direction: column;
            text-align: center;
            align-items: center;
            padding: 16px;
            gap: 12px;
          }
          .adp-top-row {
            justify-content: center;
          }
        }
      `}</style>

      <div className="adp-wrapper">
        <div className="adp-banner">
          <div className="adp-icon-area">
            <div className="adp-icon-circle">
              <BsShieldLock size={22} color="#ffffff" />
            </div>
          </div>
          <div className="adp-content">
            <div className="adp-top-row">
              <h2 className="adp-title">{title}</h2>
              <span className="adp-badge">Restricted</span>
            </div>
            <p className="adp-message">{message}</p>
            <p className="adp-helper">
              Ask your administrator to assign a role with viewer access for this module in your department through Account Management.
            </p>
          </div>
          {showBackButton && (
            <div className="adp-actions">
              <button
                className="adp-button"
                onClick={handleBack}
                id="back_button-access_denied_page"
              >
                <BsArrowLeft size={14} />
                {backLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AccessDeniedPage;
