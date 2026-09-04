import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { BsCheckCircleFill, BsXCircleFill } from "react-icons/bs";

export default function RejectRemarksModal({ type = 'reject', show, onClose, onAction, poData }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const isApprove = type !== 'reject';
  const actionLabel = isApprove ? 'Approve' : 'Reject';
  const actionColor = isApprove ? '#198754' : '#dc3545';
  const actionBg = isApprove ? '#d1e7dd' : '#f8d7da';
  const iconBg = isApprove ? 'rgba(25, 135, 84, 0.08)' : 'rgba(220, 53, 69, 0.08)';

  useEffect(() => {
    if (!show) {
      setReason("");
      setLoading(false);
    }
  }, [show]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onAction?.(reason.trim());
    } catch (err) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || (!isApprove && reason.trim().length === 0);

  return (
    <Modal
      show={show}
      onHide={loading ? undefined : onClose}
      centered
      backdrop="static"
      keyboard={!loading}
      dialogClassName="po-remarks-modal"
    >
      <div style={{ padding: '28px 28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            {isApprove
              ? <BsCheckCircleFill size={20} color={actionColor} />
              : <BsXCircleFill size={20} color={actionColor} />
            }
          </div>
          <div>
            <h5 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a2730', margin: '0 0 4px' }}>
              {actionLabel} Purchase Order
            </h5>
            <p style={{ fontSize: '0.82rem', color: '#6c757d', margin: 0, lineHeight: 1.5 }}>
              {isApprove
                ? 'Add an optional note for this approval. This will be recorded in the approval timeline.'
                : 'Please provide a reason for rejecting this PO. This is required and will be shared with the initiator.'
              }
            </p>
          </div>
        </div>

        {/* Textarea */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569',
            marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px'
          }}>
            {isApprove ? 'Remarks (optional)' : 'Reason for rejection'}
          </label>
          <textarea
            rows={4}
            placeholder={`Enter your ${isApprove ? 'remarks' : 'reason'}...`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            style={{
              width: '100%', padding: '12px 14px', fontSize: '0.88rem',
              border: '1px solid #e2e8f0', borderRadius: 10, background: loading ? '#f8fafc' : '#fff',
              color: '#1a2730', outline: 'none', resize: 'vertical', minHeight: 100,
              transition: 'border-color 0.2s',
              fontFamily: 'inherit',
            }}
            onFocus={(e) => { if (!loading) e.target.style.borderColor = actionColor; }}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
          />
          {!isApprove && reason.trim().length === 0 && (
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '6px 0 0' }}>
              A reason is required to reject this purchase order.
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600,
              color: '#475569', background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 9, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s', opacity: loading ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isDisabled}
            style={{
              padding: '10px 28px', fontSize: '0.85rem', fontWeight: 600,
              color: isDisabled ? '#6c757d' : '#fff',
              background: isDisabled ? '#e9ecef' : actionColor,
              border: `1.5px solid ${isDisabled ? '#dee2e6' : actionColor}`,
              borderRadius: 9, cursor: isDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {loading && (
              <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
            )}
            {loading
              ? (isApprove ? 'Approving...' : 'Rejecting...')
              : `${actionLabel} PO`
            }
          </button>
        </div>
      </div>

      <style jsx>{`
        :global(.po-remarks-modal .modal-dialog) {
          max-width: 520px;
          width: 100%;
        }
        :global(.po-remarks-modal .modal-content) {
          border: none;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </Modal>
  );
}
