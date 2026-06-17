import React from 'react';
import { Modal } from 'react-bootstrap';
import modalStyles from '../NegotiationUI.module.scss';

// Per-vendor text-target sub-modal for text fields (payment_terms, comment,
// vendor_tc, documents). Lifted from NegotiationModal.js:2544-2631 — kept
// visually identical so the experience matches.
const TextFieldTargetModal = ({
  open,                 // { vendorId, fieldKey, fieldLabel } | null
  tempValue,
  setTempValue,
  onSave,
  onClose,
  getCurrentVendorValue,  // (vendorId, fieldKey) => string | doc[]
}) => {
  if (!open) return null;

  const { vendorId, fieldKey, fieldLabel } = open;
  const isDocuments = fieldKey === 'documents';

  return (
    <Modal show={!!open} onHide={onClose} size="md" centered>
      <Modal.Header className={modalStyles.modalHeader}>
        <div className={modalStyles.modalTitleWrap}>
          <Modal.Title className={modalStyles.modalTitle}>
            {fieldLabel || 'Set Target'}
          </Modal.Title>
          <p className={modalStyles.modalSubtitle}>
            Set your target for {(fieldLabel || '').toLowerCase()}
          </p>
        </div>
        <button
          type="button"
          className={modalStyles.modalCloseBtn}
          onClick={onClose}
          aria-label="Close"
        >
          ✕
        </button>
      </Modal.Header>
      <Modal.Body className={modalStyles.modalBody}>
        {!isDocuments && (
          <>
            <div className="mb-3">
              <label className="fw-semibold mb-1 d-block" style={{ fontSize: '0.85rem' }}>
                Current Vendor Value
              </label>
              <div
                className="border rounded p-3"
                style={{
                  whiteSpace: 'pre-wrap',
                  fontSize: '0.85rem',
                  background: '#f8f9fa',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {getCurrentVendorValue(vendorId, fieldKey)}
              </div>
            </div>
            <div>
              <label className="fw-semibold mb-1 d-block" style={{ fontSize: '0.85rem' }}>
                Your Target
              </label>
              <textarea
                className="form-control"
                rows={4}
                value={typeof tempValue === 'string' ? tempValue : ''}
                onChange={(e) => setTempValue(e.target.value)}
                placeholder={`Enter your target ${(fieldLabel || '').toLowerCase()}...`}
                style={{ fontSize: '0.85rem' }}
              />
            </div>
          </>
        )}

        {isDocuments && (() => {
          const docs = getCurrentVendorValue(vendorId, 'documents');
          const docComments = typeof tempValue === 'object' && tempValue ? tempValue : {};
          const hasDocs = Array.isArray(docs) && docs.length > 0;
          return (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {hasDocs ? (
                docs.map((doc, idx) => (
                  <div key={idx} className="border rounded p-2 mb-2">
                    <div className="d-flex align-items-center justify-content-between mb-1">
                      <span className="fw-semibold" style={{ fontSize: '0.82rem' }}>
                        Document {idx + 1}
                      </span>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--primary-color)',
                          textDecoration: 'none',
                          fontWeight: 600,
                        }}
                      >
                        View Doc
                      </a>
                    </div>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={docComments[String(idx)] || ''}
                      onChange={(e) => {
                        setTempValue(prev => ({
                          ...(typeof prev === 'object' && prev ? prev : {}),
                          [String(idx)]: e.target.value,
                        }));
                      }}
                      placeholder="Enter your comment for this document..."
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                ))
              ) : (
                <p className="text-muted text-center py-3 mb-2">
                  No documents uploaded by this vendor.
                </p>
              )}
            </div>
          );
        })()}
      </Modal.Body>
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid #dee2e6',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: '0.8rem', padding: '4px 16px' }}
          onClick={onSave}
        >
          {isDocuments ? 'Save Comments' : 'Set Target'}
        </button>
      </div>
    </Modal>
  );
};

export default TextFieldTargetModal;
