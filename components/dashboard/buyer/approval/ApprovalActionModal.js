import React, { useState, useEffect } from "react";
import { Modal, Form, Spinner } from "react-bootstrap";
import {
  BsCheckCircleFill,
  BsXCircleFill,
  BsExclamationTriangleFill,
  BsShieldCheck,
  BsShieldX,
  BsArrowRight,
} from "react-icons/bs";

const ApprovalActionModal = ({
  show,
  actionType,
  onClose,
  onSubmit,
  loading,
  entityLabel = "item",
}) => {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!show) setComment("");
  }, [show]);

  const isReject = actionType === "REJECT";
  const isCommentRequired = isReject;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(comment.trim());
  };

  const isSubmitDisabled = loading || (isCommentRequired && !comment.trim());

  const accentGradient = isReject
    ? "linear-gradient(90deg, #dc3545 0%, #e8606d 100%)"
    : "linear-gradient(90deg, #198754 0%, #20c070 100%)";

  const focusColor = isReject ? "#dc3545" : "#198754";

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static" contentClassName="aam-modal-content">
      <style jsx>{`
        :global(.aam-modal-content) {
          border-radius: 14px !important;
          overflow: hidden;
          border: none !important;
          padding: 0 !important;
        }
        .aam-accent {
          height: 3px;
          width: 100%;
        }
        .aam-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px 12px;
          border: none;
        }
        .aam-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .aam-title-icon {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .aam-title-text {
          font-size: 0.95rem;
          font-weight: 600;
          color: #2d3436;
        }
        .aam-close {
          background: none;
          border: none;
          color: #adb5bd;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          line-height: 1;
        }
        .aam-close:hover {
          background: #f0f0f0;
          color: #6c757d;
        }
        .aam-divider {
          height: 1px;
          background: #f0f0f0;
          margin: 0 20px;
        }
        .aam-info-strip {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px 14px;
          margin: 12px 20px 0;
          border-radius: 8px;
          font-size: 0.78rem;
          line-height: 1.45;
        }
        .aam-info-strip.approve {
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #d1fae5;
        }
        .aam-info-strip.reject {
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        }
        .aam-body {
          padding: 14px 20px 10px;
        }
        .aam-label {
          font-size: 0.82rem;
          font-weight: 600;
          color: #495057;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .aam-textarea {
          border: 1.5px solid #e0e0e0;
          border-radius: 8px;
          font-size: 0.85rem;
          padding: 10px 12px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          resize: none;
          line-height: 1.5;
        }
        .aam-textarea:focus {
          border-color: ${focusColor}60;
          box-shadow: 0 0 0 3px ${focusColor}10;
          outline: none;
        }
        .aam-textarea::placeholder {
          color: #c0c0c0;
          font-size: 0.82rem;
        }
        .aam-char-count {
          font-size: 0.66rem;
          color: #c0c0c0;
          text-align: right;
          margin-top: 4px;
        }
        .aam-warning-line {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          font-size: 0.72rem;
          color: #b45309;
        }
        .aam-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 10px 20px 16px;
          border: none;
        }
        .aam-btn-cancel {
          font-size: 0.82rem;
          font-weight: 500;
          padding: 7px 16px;
          border-radius: 7px;
          color: #6c757d;
          background: #f8f9fa;
          border: 1px solid #e0e0e0;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .aam-btn-cancel:hover:not(:disabled) {
          background: #eee;
          color: #495057;
        }
        .aam-btn-submit {
          font-size: 0.82rem;
          font-weight: 600;
          padding: 7px 20px;
          border-radius: 7px;
          border: none;
          color: #fff;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .aam-btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 3px 8px rgba(0,0,0,0.12);
        }
        .aam-btn-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .aam-btn-submit.approve {
          background: linear-gradient(135deg, #198754 0%, #20c070 100%);
        }
        .aam-btn-submit.reject {
          background: linear-gradient(135deg, #dc3545 0%, #e8606d 100%);
        }
      `}</style>

      {/* Accent bar */}
      <div className="aam-accent" style={{ background: accentGradient }} />

        {/* Header */}
        <div className="aam-header">
          <div className="aam-title-row">
            <div
              className="aam-title-icon"
              style={{ background: isReject ? "#fef2f210" : "#ecfdf510", border: `1.5px solid ${isReject ? '#fecaca' : '#bbf7d0'}` }}
            >
              {isReject ? (
                <BsXCircleFill size={14} style={{ color: "#dc3545" }} />
              ) : (
                <BsCheckCircleFill size={14} style={{ color: "#198754" }} />
              )}
            </div>
            <span className="aam-title-text">
              {isReject ? "Reject" : "Approve"} {entityLabel}
            </span>
          </div>
          <button className="aam-close" onClick={onClose} disabled={loading} type="button">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1L13 13M1 13L13 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="aam-divider" />

        {/* Info strip */}
        <div className={`aam-info-strip ${isReject ? 'reject' : 'approve'}`}>
          {isReject ? (
            <BsExclamationTriangleFill size={11} style={{ flexShrink: 0, marginTop: 1 }} />
          ) : (
            <BsArrowRight size={11} style={{ flexShrink: 0, marginTop: 1 }} />
          )}
          <span>
            {isReject
              ? "This will stop the approval workflow and notify the initiator. This action cannot be undone."
              : "This will advance the workflow to the next step or complete the approval process."
            }
          </span>
        </div>

        <Form onSubmit={handleSubmit}>
          {/* Body */}
          <div className="aam-body">
            <div className="aam-label">
              {isReject ? (
                <>Rejection Reason <span style={{ color: "#dc3545" }}>*</span></>
              ) : (
                "Comment"
              )}
              {!isReject && <span style={{ color: "#adb5bd", fontWeight: 400 }}>(optional)</span>}
            </div>
            <Form.Control
              as="textarea"
              rows={3}
              className="aam-textarea"
              placeholder={
                isReject
                  ? "Explain why this is being rejected..."
                  : "Add any notes for the record..."
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              style={isCommentRequired && !comment.trim() ? { borderColor: "#ffc10780" } : {}}
            />
            <div className="aam-char-count">{comment.length}/500</div>
          </div>

          {/* Footer */}
          <div className="aam-footer">
            <button
              type="button"
              className="aam-btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`aam-btn-submit ${isReject ? 'reject' : 'approve'}`}
              disabled={isSubmitDisabled}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" style={{ width: 12, height: 12 }} />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {isReject ? <BsShieldX size={12} /> : <BsShieldCheck size={12} />}
                  <span>Confirm {isReject ? "Rejection" : "Approval"}</span>
                </>
              )}
            </button>
          </div>
        </Form>
    </Modal>
  );
};

export default ApprovalActionModal;
