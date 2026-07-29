import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

const AUTO_DISMISS_SECONDS = 8;

const GuestAccessModal = ({ onDismiss, expiresIn = 1800 }) => {
  const [countdown, setCountdown] = useState(AUTO_DISMISS_SECONDS);

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  useEffect(() => {
    if (countdown <= 0) {
      handleDismiss();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, handleDismiss]);

  const minutes = Math.floor(expiresIn / 60);

  return ReactDOM.createPortal(
    <>
      <style>{`
        .gam-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          background: rgba(15, 23, 42, 0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: gam-in 0.2s ease;
          font-family: 'Poppins', system-ui, sans-serif;
        }
        @keyframes gam-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .gam-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          max-width: 400px;
          width: 92%;
          overflow: hidden;
        }
        .gam-accent {
          height: 4px;
          background: linear-gradient(90deg, #2E5BA8 0%, #3b82f6 50%, #60a5fa 100%);
        }
        .gam-body {
          padding: 28px 30px 24px;
        }
        .gam-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 18px;
        }
        .gam-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: #eff6ff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .gam-title {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 4px;
          line-height: 1.3;
        }
        .gam-desc {
          font-size: 0.82rem;
          color: #64748b;
          line-height: 1.55;
          margin: 0;
        }
        .gam-desc strong {
          color: #1e293b;
          font-weight: 600;
        }
        .gam-divider {
          height: 1px;
          background: #f1f5f9;
          margin-bottom: 18px;
        }
        .gam-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .gam-session {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #0369a1;
        }
        .gam-session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          animation: gam-pulse 1.5s infinite;
        }
        @keyframes gam-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .gam-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 24px;
          font-size: 0.84rem;
          font-weight: 600;
          color: #fff;
          background: #2E5BA8;
          border: none;
          border-radius: 9px;
          cursor: pointer;
          transition: background 0.15s;
          font-family: 'Poppins', system-ui, sans-serif;
        }
        .gam-btn:hover {
          background: #24498a;
        }
        .gam-auto {
          margin-top: 14px;
          text-align: center;
          font-size: 0.72rem;
          color: #94a3b8;
        }
      `}</style>
      <div className="gam-overlay">
        <div className="gam-card">
          <div className="gam-accent" />
          <div className="gam-body">
            <div className="gam-top">
              <div className="gam-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="3" stroke="#2E5BA8" strokeWidth="1.8"/>
                  <path d="M2 8l10 6 10-6" stroke="#2E5BA8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="gam-title">Welcome — Guest Access</h3>
                <p className="gam-desc">
                  You're accessing this page via an email link. You have been granted <strong>{minutes} minutes</strong> of full access to the platform.
                </p>
              </div>
            </div>

            <div className="gam-divider" />

            <div className="gam-footer">
              <span className="gam-session">
                <span className="gam-session-dot" />
                Session: {minutes} min
              </span>
              <button className="gam-btn" onClick={handleDismiss}>
                Continue
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>

            <div className="gam-auto">
              Auto-closing in {countdown}s
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default GuestAccessModal;
