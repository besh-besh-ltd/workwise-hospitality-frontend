import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

const COUNTDOWN_SECONDS = 5;

const SessionExpiredModal = ({ onRedirect }) => {
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  const handleRedirect = useCallback(() => {
    onRedirect?.();
  }, [onRedirect]);

  useEffect(() => {
    if (countdown <= 0) {
      handleRedirect();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, handleRedirect]);

  const progress = ((COUNTDOWN_SECONDS - countdown) / COUNTDOWN_SECONDS) * 100;

  return ReactDOM.createPortal(
    <>
      <style>{`
        .sem-overlay {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: sem-in 0.15s ease;
          font-family: 'Poppins', sans-serif;
        }
        @keyframes sem-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .sem-card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 16px 48px rgba(0,0,0,0.12);
          max-width: 380px;
          width: 90%;
          overflow: hidden;
        }
        .sem-progress {
          height: 3px;
          background: #f1f5f9;
          width: 100%;
        }
        .sem-progress-fill {
          height: 100%;
          background: #2E5BA8;
          transition: width 1s linear;
        }
        .sem-body {
          padding: 28px 30px 24px;
        }
        .sem-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 20px;
        }
        .sem-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #fef2f2;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .sem-title {
          font-size: 0.95rem;
          font-weight: 700;
          color: #1a2730;
          margin: 0 0 3px;
        }
        .sem-desc {
          font-size: 0.8rem;
          color: #64748b;
          line-height: 1.55;
          margin: 0;
        }
        .sem-divider {
          height: 1px;
          background: #f1f5f9;
          margin-bottom: 18px;
        }
        .sem-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .sem-timer {
          font-size: 0.75rem;
          color: #94a3b8;
        }
        .sem-timer strong {
          color: #1a2730;
          font-weight: 700;
        }
        .sem-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 9px 22px;
          font-size: 0.82rem;
          font-weight: 600;
          color: #fff;
          background: #2E5BA8;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
          font-family: 'Poppins', sans-serif;
        }
        .sem-btn:hover {
          background: #24498a;
        }
      `}</style>
      <div className="sem-overlay">
        <div className="sem-card">
          {/* Progress bar */}
          <div className="sem-progress">
            <div className="sem-progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <div className="sem-body">
            {/* Header row */}
            <div className="sem-top">
              <div className="sem-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <polyline points="16,17 21,12 16,7" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="21" y1="12" x2="9" y2="12" stroke="#dc3545" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <h3 className="sem-title">Session Expired</h3>
                <p className="sem-desc">Your session has ended. You'll be redirected to sign in again.</p>
              </div>
            </div>

            <div className="sem-divider" />

            {/* Footer */}
            <div className="sem-footer">
              <span className="sem-timer">Redirecting in <strong>{countdown}s</strong></span>
              <button className="sem-btn" onClick={handleRedirect}>
                Sign In Now
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default SessionExpiredModal;
