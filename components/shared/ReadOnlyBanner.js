import React from "react";
import { BsEyeFill, BsLockFill, BsShieldLock } from "react-icons/bs";

/**
 * Read-only mode banner — horizontal layout with icon circle, content,
 * and an optional right-side status pill. Same visual language as the
 * Technical Evaluation bid-lock banner.
 *
 * - variant="warning" (default): yellow/amber theme — used for permission-based read-only
 * - variant="danger": red theme + lock icon — used for closed/locked entities
 */
const ReadOnlyBanner = ({
  title = "View Only Mode",
  message = "You don't have edit permissions for this tender.",
  className = "",
  dismissible = false,
  onDismiss = null,
  variant = "warning",
  badgeText,
  noMarginTop = false,
}) => {
  const isDanger = variant === "danger";

  // Theme tokens
  const theme = isDanger
    ? {
        bg: "linear-gradient(135deg, #fef2f2 0%, #fff1f2 50%, #fee2e2 100%)",
        border: "#fecaca",
        leftAccent: "#dc2626",
        iconBg: "linear-gradient(135deg, #ef4444, #b91c1c)",
        iconShadow: "0 2px 8px rgba(220, 38, 38, 0.25)",
        title: "#7f1d1d",
        message: "#991b1b",
        messageStrong: "#7f1d1d",
        badgeBg: "rgba(220, 38, 38, 0.12)",
        badgeBorder: "#fca5a5",
        badgeColor: "#7f1d1d",
        dismissBg: "rgba(220, 38, 38, 0.12)",
        dismissBorder: "rgba(220, 38, 38, 0.25)",
        dismissColor: "#991b1b",
        dismissHoverBg: "rgba(220, 38, 38, 0.22)",
        dismissHoverBorder: "rgba(220, 38, 38, 0.4)",
      }
    : {
        bg: "linear-gradient(135deg, #fff7ed 0%, #fffbeb 50%, #fef3c7 100%)",
        border: "#fed7aa",
        leftAccent: "#f59e0b",
        iconBg: "linear-gradient(135deg, #f59e0b, #d97706)",
        iconShadow: "0 2px 8px rgba(245, 158, 11, 0.25)",
        title: "#92400e",
        message: "#a16207",
        messageStrong: "#92400e",
        badgeBg: "rgba(245, 158, 11, 0.12)",
        badgeBorder: "#fcd34d",
        badgeColor: "#92400e",
        dismissBg: "rgba(245, 158, 11, 0.12)",
        dismissBorder: "rgba(245, 158, 11, 0.25)",
        dismissColor: "#92400e",
        dismissHoverBg: "rgba(245, 158, 11, 0.22)",
        dismissHoverBorder: "rgba(245, 158, 11, 0.4)",
      };

  return (
    <>
      <style jsx>{`
        .rob-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 24px 16px 20px;
          margin: ${noMarginTop ? "0 0 16px 0" : "16px 0"};
          background: ${theme.bg};
          border: 1px solid ${theme.border};
          border-left: 4px solid ${theme.leftAccent};
          border-radius: 12px;
          box-shadow: 0 2px 8px ${isDanger ? "rgba(220, 38, 38, 0.08)" : "rgba(245, 158, 11, 0.08)"};
          animation: rob-slide-in 0.4s ease-out;
        }
        @keyframes rob-slide-in {
          0% { opacity: 0; transform: translateY(-8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .rob-icon-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: ${theme.iconBg};
          color: #fff;
          flex-shrink: 0;
          box-shadow: ${theme.iconShadow};
        }
        .rob-content {
          flex: 1;
          min-width: 0;
        }
        .rob-title {
          font-size: 15px;
          font-weight: 700;
          color: ${theme.title};
          margin: 0 0 2px 0;
        }
        .rob-message {
          font-size: 13px;
          color: ${theme.message};
          margin: 0;
          line-height: 1.5;
        }
        .rob-message :global(strong) {
          color: ${theme.messageStrong};
          font-weight: 600;
        }
        .rob-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          background: ${theme.badgeBg};
          border: 1px solid ${theme.badgeBorder};
          color: ${theme.badgeColor};
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .rob-dismiss {
          flex-shrink: 0;
          padding: 4px 10px;
          background: ${theme.dismissBg};
          border: 1px solid ${theme.dismissBorder};
          border-radius: 6px;
          color: ${theme.dismissColor};
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          line-height: 1;
          transition: all 0.2s;
        }
        .rob-dismiss:hover {
          background: ${theme.dismissHoverBg};
          border-color: ${theme.dismissHoverBorder};
        }
        @media (max-width: 768px) {
          .rob-banner {
            flex-direction: column;
            text-align: center;
            gap: 10px;
            padding: 16px;
          }
        }
      `}</style>

      <div className={`rob-banner ${className}`}>
        <div className="rob-icon-wrapper">
          {isDanger ? <BsLockFill size={20} /> : <BsEyeFill size={20} />}
        </div>
        <div className="rob-content">
          <h5 className="rob-title">{title}</h5>
          <p className="rob-message">{message}</p>
        </div>
        {badgeText && (
          <div className="rob-badge">
            <BsShieldLock size={13} />
            <span>{badgeText}</span>
          </div>
        )}
        {dismissible && onDismiss && (
          <button className="rob-dismiss" onClick={onDismiss} aria-label="Dismiss">
            &times;
          </button>
        )}
      </div>
    </>
  );
};

export default ReadOnlyBanner;
