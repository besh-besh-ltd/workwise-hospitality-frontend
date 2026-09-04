import React, { useState, useEffect } from "react";
import { Modal } from "react-bootstrap";
import { BsFilePdf } from "react-icons/bs";
import { FiExternalLink } from "react-icons/fi";
import ProcessScopeErrorBanner from "@/components/shared/ProcessScopeErrorBanner";

/**
 * Single-step PO Approve Modal
 * Shows document review + optional remarks in one step
 */
const ApproveModal = ({ show, onClose, onApprove, poNumber, poPdfUrl }) => {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  // Captured typed-code error from the backend (e.g. PROCESS_NOT_IN_USER_SCOPE,
  // NO_APPROVAL_POLICY_FOR_PROCESS). Rendered via ProcessScopeErrorBanner.
  const [scopeError, setScopeError] = useState(null);

  useEffect(() => {
    if (!show) {
      setComment('');
      setLoading(false);
      setScopeError(null);
    }
  }, [show]);

  const handleSubmit = async () => {
    setLoading(true);
    setScopeError(null);
    try {
      await onApprove?.(comment.trim());
    } catch (err) {
      const payload = err?.response?.data || err?.data || err;
      if (payload?.code) setScopeError(payload);
      else throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={loading ? undefined : onClose} centered backdrop="static" keyboard={!loading} dialogClassName="po-approve-modal">
      <div style={{ padding: '28px 28px 24px' }}>
        {/* Title */}
        <h5 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a2730', margin: '0 0 4px' }}>
          Approve PO #{poNumber}
        </h5>
        <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 22px' }}>
          Review the document and confirm your approval.
        </p>

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 18px' }} />

        {/* Typed-error banner — surfaces NO_APPROVAL_POLICY_FOR_PROCESS or
            PROCESS_NOT_IN_USER_SCOPE in the modal so the approver knows why
            their action was rejected instead of getting a generic toast. */}
        <ProcessScopeErrorBanner error={scopeError} onDismiss={() => setScopeError(null)} />

        {/* Document */}
        {poPdfUrl && (
          <div style={{ marginBottom: 18 }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 8 }}>Document</label>
            <a href={poPdfUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fafbfc', border: '1px solid #eef0f2', borderRadius: 8, textDecoration: 'none', transition: 'border-color 0.15s' }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#eef0f2'}>
              <BsFilePdf size={18} color="#dc3545" />
              <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 500, color: '#1a2730' }}>PO_{poNumber}.pdf</span>
              <FiExternalLink size={13} color="#94a3b8" />
            </a>
          </div>
        )}

        {/* Remarks */}
        <div style={{ marginBottom: 22 }}>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 8 }}>
            Remarks <span style={{ textTransform: 'none', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            rows={3}
            placeholder="Add a note..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
            style={{
              width: '100%', padding: '10px 12px', fontSize: '0.84rem',
              border: '1px solid #e2e8f0', borderRadius: 8, background: loading ? '#f8fafc' : '#fff',
              color: '#1a2730', outline: 'none', resize: 'none',
              fontFamily: 'inherit', transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { if (!loading) e.target.style.borderColor = '#94a3b8'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} disabled={loading}
            style={{ padding: '9px 20px', fontSize: '0.82rem', fontWeight: 500, color: '#64748b', background: 'transparent', border: '1px solid #e2e8f0', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, transition: 'all 0.15s' }}>
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={handleSubmit}
            style={{
              padding: '9px 24px', fontSize: '0.82rem', fontWeight: 600, color: '#fff',
              background: loading ? '#9ca3af' : '#198754',
              border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}>
            {loading ? (
              <><span className="spinner-border spinner-border-sm" style={{ width: 13, height: 13 }} /> Approving...</>
            ) : 'Approve'}
          </button>
        </div>
      </div>

      <style jsx>{`
        :global(.po-approve-modal .modal-dialog) { max-width: 460px; }
        :global(.po-approve-modal .modal-content) { border: none; border-radius: 14px; box-shadow: 0 16px 48px rgba(0,0,0,0.12); }
      `}</style>
    </Modal>
  );
};

export default ApproveModal;
