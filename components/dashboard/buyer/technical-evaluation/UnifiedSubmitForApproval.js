import React from 'react';
import ConfirmationModal from '@/components/modal/ConfirmationModal';

/**
 * UnifiedSubmitForApproval
 *
 * Single button that submits all products for approval after all clauses are evaluated
 * Replaces individual per-product submission buttons
 */
const UnifiedSubmitForApproval = ({
  canWrite,
  permissionsLoading,
  areAllProductsEvaluated,
  hasAnyPendingApproval,
  vendorCountValid,
  unifiedSubmitLoading,
  showUnifiedSubmitModal,
  onSubmitClick,
  onConfirm,
  onCancel,
  productCount,
  evaluatedProductCount = 0
}) => {
  // Don't show button if user doesn't have write permissions
  if (!canWrite || permissionsLoading) return null;

  // Don't show button if there's already a pending approval
  if (hasAnyPendingApproval) {
    return (
      <div
        style={{
          marginTop: '24px',
          marginBottom: '16px',
          padding: '16px 20px',
          background: 'linear-gradient(135deg, #fff3cd 0%, #fff8e1 100%)',
          border: '1px solid #ffc107',
          borderLeft: '4px solid #ff9800',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ff9800, #ffa726)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '14px', color: '#e65100', marginBottom: '2px' }}>
            Approval Pending
          </div>
          <div style={{ fontSize: '13px', color: '#bf360c' }}>
            Technical evaluation is currently pending approval. No changes can be made until the approval is complete.
          </div>
        </div>
      </div>
    );
  }

  const isDisabled = evaluatedProductCount === 0 || unifiedSubmitLoading;

  let tooltipMessage = "";
  if (evaluatedProductCount === 0) {
    tooltipMessage = "Evaluate at least one vendor in a product before submitting";
  } else {
    tooltipMessage = `Submit ${evaluatedProductCount} of ${productCount} evaluated product(s) for approval`;
  }

  return (
    <>
      <div className="d-flex justify-content-end mt-4 mb-3">
        <button
          type="button"
          className="btn"
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            borderRadius: '8px',
            background: isDisabled
              ? 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)'
              : 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
            color: '#ffffff',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: isDisabled
              ? 'none'
              : '0 2px 8px rgba(13, 110, 253, 0.25)',
            opacity: isDisabled ? 0.6 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            maxWidth: '100%',
            flexShrink: 0,
          }}
          onClick={onSubmitClick}
          disabled={isDisabled}
          title={tooltipMessage}
          id="unified_submit_for_approval-technical_evaluation_page"
          onMouseEnter={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.35)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isDisabled) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(13, 110, 253, 0.25)';
            }
          }}
        >
          {unifiedSubmitLoading ? (
            <>
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
              <span>Submitting...</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              <span style={{ whiteSpace: 'nowrap' }}>Submit All ({evaluatedProductCount}/{productCount})</span>
            </>
          )}
        </button>
      </div>

      <ConfirmationModal
        isOpen={showUnifiedSubmitModal}
        onClose={onCancel}
        onConfirm={onConfirm}
        title="Submit All Products for Approval"
        description={`Are you sure you want to submit ${evaluatedProductCount} of ${productCount} evaluated product(s) for technical evaluation approval?\n\nOnly products with at least one vendor evaluated will be submitted. Once submitted, the evaluation will be sent to the approver for review.`}
        confirmButtonColor="primary"
        confirmButtonText={unifiedSubmitLoading ? "Submitting..." : "Submit All"}
        cancelButtonText="Cancel"
      />
    </>
  );
};

export default UnifiedSubmitForApproval;
