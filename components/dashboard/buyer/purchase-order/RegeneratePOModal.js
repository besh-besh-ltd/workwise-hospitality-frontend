import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { BsArrowRepeat, BsCloudUpload, BsFilePdf, BsX } from 'react-icons/bs';

const RegeneratePOModal = ({
  show,
  onClose,
  onRegenerate,
  onUpload,
  isProcessing = false,
}) => {
  const [mode, setMode] = useState(null); // 'regenerate' | 'upload'
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (!show) {
      setMode(null);
      setSelectedFile(null);
    }
  }, [show]);

  const handleProceed = () => {
    if (mode === 'regenerate') {
      onRegenerate?.();
    } else if (mode === 'upload' && selectedFile) {
      onUpload?.(selectedFile);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed');
        return;
      }
      setSelectedFile(file);
    }
  };

  const canProceed = mode === 'regenerate' || (mode === 'upload' && selectedFile);
  const isDisabled = !canProceed || isProcessing;

  return (
    <Modal show={show} onHide={isProcessing ? undefined : onClose} centered backdrop="static" keyboard={!isProcessing} dialogClassName="po-regenerate-modal">
      <div style={{ padding: '28px 28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: 'rgba(46,91,168,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <BsArrowRepeat size={20} color="#2E5BA8" />
          </div>
          <div>
            <h5 style={{ fontSize: '1rem', fontWeight: 700, color: '#1a2730', margin: '0 0 4px' }}>
              Regenerate PO Document
            </h5>
            <p style={{ fontSize: '0.82rem', color: '#6c757d', margin: 0, lineHeight: 1.5 }}>
              Choose how you want to update the PO document.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', margin: '0 0 18px' }} />

        {/* Options */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569',
            marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.3px'
          }}>
            Select an option
          </label>

          {/* Option 1: System Regenerate */}
          <div
            onClick={() => !isProcessing && setMode('regenerate')}
            style={{
              border: `1.5px solid ${mode === 'regenerate' ? '#2E5BA8' : '#e2e8f0'}`,
              borderRadius: 10,
              padding: '12px 14px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              background: mode === 'regenerate' ? 'rgba(46,91,168,0.04)' : '#fff',
              transition: 'all 0.15s',
              marginBottom: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: mode === 'regenerate' ? 'rgba(46,91,168,0.1)' : '#f8fafc',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <BsArrowRepeat size={16} color={mode === 'regenerate' ? '#2E5BA8' : '#94a3b8'} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1a2730' }}>
                  Regenerate using system
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: 2 }}>
                  Regenerate the PO document using the latest data
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Upload Own */}
          <div
            onClick={() => !isProcessing && setMode('upload')}
            style={{
              border: `1.5px solid ${mode === 'upload' ? '#2E5BA8' : '#e2e8f0'}`,
              borderRadius: 10,
              padding: '12px 14px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              background: mode === 'upload' ? 'rgba(46,91,168,0.04)' : '#fff',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: mode === 'upload' ? 'rgba(46,91,168,0.1)' : '#f8fafc',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <BsCloudUpload size={16} color={mode === 'upload' ? '#2E5BA8' : '#94a3b8'} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.84rem', color: '#1a2730' }}>
                  Upload my own document
                </div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: 2 }}>
                  Upload your own PO document (PDF only, max 25MB)
                </div>
              </div>
            </div>
          </div>

          {/* File Upload Area */}
          {mode === 'upload' && (
            <div style={{
              border: '1.5px dashed #cbd5e1',
              borderRadius: 10,
              padding: '14px',
              background: '#fafbfc',
              textAlign: 'center',
              marginTop: 10,
            }}>
              {!selectedFile ? (
                <label style={{ cursor: 'pointer', display: 'block' }}>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <BsCloudUpload size={22} color="#94a3b8" />
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 6 }}>
                    Click to select a PDF file
                  </div>
                </label>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <BsFilePdf size={18} color="#dc3545" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#1a2730' }}>
                      {selectedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4 }}
                    disabled={isProcessing}
                  >
                    <BsX size={18} color="#94a3b8" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '10px 24px', fontSize: '0.85rem', fontWeight: 600,
              color: '#475569', background: '#fff', border: '1px solid #e2e8f0',
              borderRadius: 9, cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s', opacity: isProcessing ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            disabled={isDisabled}
            style={{
              padding: '10px 28px', fontSize: '0.85rem', fontWeight: 600,
              color: isDisabled ? '#6c757d' : '#fff',
              background: isDisabled ? '#e9ecef' : '#2E5BA8',
              border: `1.5px solid ${isDisabled ? '#dee2e6' : '#2E5BA8'}`,
              borderRadius: 9, cursor: isDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {isProcessing && (
              <span className="spinner-border spinner-border-sm" style={{ width: 14, height: 14 }} />
            )}
            {isProcessing
              ? (mode === 'upload' ? 'Uploading...' : 'Regenerating...')
              : (mode === 'upload' ? 'Upload & Replace' : 'Regenerate PO Doc')
            }
          </button>
        </div>
      </div>

      <style jsx>{`
        :global(.po-regenerate-modal .modal-dialog) {
          max-width: 520px;
          width: 100%;
        }
        :global(.po-regenerate-modal .modal-content) {
          border: none;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </Modal>
  );
};

export default RegeneratePOModal;
