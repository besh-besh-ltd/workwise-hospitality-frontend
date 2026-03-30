import React, { useState } from 'react';
import Modal from "react-modal";
import { BsBellFill, BsXLg, BsSendFill } from 'react-icons/bs';

const VendorSelectionModal = ({
  isOpen,
  onClose,
  onSendReminder,
  vendorCount = 0,
  loading = false,
  isTender = false
}) => {
  const [sendLoading, setSendLoading] = useState(false);

  const handleSendReminder = async () => {
    if (vendorCount === 0) return;
    setSendLoading(true);
    try {
      await onSendReminder();
    } finally {
      setSendLoading(false);
    }
  };

  const entityLabel = isTender ? 'tender' : 'RFQ';

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={onClose}
      ariaHideApp={false}
      contentLabel="Send Reminder"
      style={{
        overlay: {
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
          zIndex: 1050,
        },
        content: {
          position: "relative",
          inset: "auto",
          maxWidth: "380px",
          width: "100%",
          border: "none",
          background: "white",
          borderRadius: "16px",
          overflow: "hidden",
          padding: "0",
          boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.18)",
        },
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        disabled={sendLoading}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 2,
          background: 'rgba(255,255,255,0.8)', border: 'none', borderRadius: '50%',
          width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: '#64748b', backdropFilter: 'blur(4px)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e293b'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.color = '#64748b'; }}
      >
        <BsXLg size={12} />
      </button>

      {/* Content */}
      <div style={{ padding: '32px 28px 24px', textAlign: 'center' }}>
        {loading ? (
          <div style={{ padding: '20px 0' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid #e2e8f0', borderTopColor: 'var(--primary-color, #2E5BA8)',
              animation: 'reminderSpin 0.7s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Loading vendors...</p>
          </div>
        ) : vendorCount === 0 ? (
          <div style={{ padding: '12px 0' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', margin: '0 auto 16px',
              background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BsBellFill size={20} style={{ color: '#94a3b8' }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#475569', margin: '0 0 4px' }}>No reminders needed</p>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>
              All vendors have submitted their quotes for this {entityLabel}.
            </p>
          </div>
        ) : (
          <>
            {/* Icon */}
            <div style={{
              width: 56, height: 56, borderRadius: '16px', margin: '0 auto 20px',
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BsBellFill size={22} style={{ color: 'var(--primary-color, #2E5BA8)' }} />
            </div>

            {/* Vendor count */}
            <div style={{
              display: 'inline-flex', alignItems: 'baseline', gap: 6,
              marginBottom: 8,
            }}>
              <span style={{
                fontSize: 32, fontWeight: 700, lineHeight: 1,
                color: 'var(--primary-color, #2E5BA8)',
              }}>
                {vendorCount}
              </span>
              <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>
                {vendorCount === 1 ? 'vendor' : 'vendors'}
              </span>
            </div>

            {/* Description */}
            <p style={{ fontSize: 14, color: '#475569', margin: '0 0 24px', lineHeight: 1.5 }}>
              A quote submission reminder will be sent to{' '}
              <strong style={{ color: '#1e293b' }}>{vendorCount === 1 ? 'this vendor' : `all ${vendorCount} vendors`}</strong>{' '}
              for this {entityLabel}.
            </p>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={onClose}
                disabled={sendLoading}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10,
                  border: '1px solid #e2e8f0', background: '#fff',
                  fontSize: 13, fontWeight: 600, color: '#475569',
                  cursor: 'pointer', transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={sendLoading}
                style={{
                  flex: 1, padding: '10px 16px', borderRadius: 10,
                  border: 'none', background: 'var(--primary-color, #2E5BA8)',
                  fontSize: 13, fontWeight: 600, color: '#fff',
                  cursor: sendLoading ? 'not-allowed' : 'pointer',
                  opacity: sendLoading ? 0.7 : 1,
                  transition: 'all 0.15s ease',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}
                onMouseEnter={e => { if (!sendLoading) e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={e => { if (!sendLoading) e.currentTarget.style.opacity = '1'; }}
              >
                {sendLoading ? (
                  <>
                    <span style={{
                      width: 14, height: 14, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                      animation: 'reminderSpin 0.7s linear infinite',
                      display: 'inline-block',
                    }} />
                    Sending...
                  </>
                ) : (
                  <>
                    <BsSendFill size={12} />
                    Send Reminder
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes reminderSpin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Modal>
  );
};

export default VendorSelectionModal;
