import React from 'react';
import { Badge } from 'react-bootstrap';

/**
 * EvaluationProgressTracker
 *
 * Displays a progress summary showing evaluation completion status across all products
 */
const EvaluationProgressTracker = ({ productEvaluationStatus, clauseInfo }) => {
  if (!clauseInfo || clauseInfo.length === 0) return null;

  const productIds = clauseInfo.map(item => item.rfq_product_id);
  const totalProducts = productIds.length;

  let evaluatedCount = 0;
  let pendingCount = 0;
  let totalVendors = 0;
  let evaluatedVendors = 0;

  productIds.forEach(productId => {
    const status = productEvaluationStatus.get(productId);
    if (status) {
      if (status.isFullyEvaluated) evaluatedCount++;
      if (status.isPendingApproval) pendingCount++;
      totalVendors += status.totalVendors || 0;
      evaluatedVendors += status.evaluatedVendorCount || 0;
    }
  });

  const allEvaluated = evaluatedCount === totalProducts && totalProducts > 0;
  const progressPercentage = totalProducts > 0 ? Math.round((evaluatedCount / totalProducts) * 100) : 0;

  return (
    <div
      style={{
        marginBottom: '20px',
        padding: '20px 24px',
        background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
        border: '1px solid #dee2e6',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: allEvaluated
                ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
                : 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h6 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#212529' }}>
            Evaluation Progress
          </h6>
        </div>

        {allEvaluated && pendingCount === 0 && (
          <Badge
            bg="success"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              letterSpacing: '0.3px',
            }}
          >
            Complete
          </Badge>
        )}
        {pendingCount > 0 && (
          <Badge
            bg="warning"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              letterSpacing: '0.3px',
            }}
          >
            {pendingCount} Pending
          </Badge>
        )}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '8px',
          background: '#e9ecef',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            width: `${progressPercentage}%`,
            height: '100%',
            background: allEvaluated
              ? 'linear-gradient(90deg, #28a745 0%, #20c997 100%)'
              : 'linear-gradient(90deg, #0d6efd 0%, #0a58ca 100%)',
            transition: 'width 0.3s ease',
            borderRadius: '4px',
          }}
        />
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 auto', minWidth: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            Products Completed
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#212529' }}>
            {evaluatedCount}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#6c757d', marginLeft: '4px' }}>
              / {totalProducts}
            </span>
          </div>
        </div>

        <div style={{ flex: '1 1 auto', minWidth: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            Vendors Evaluated
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#212529' }}>
            {evaluatedVendors}
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#6c757d', marginLeft: '4px' }}>
              / {totalVendors}
            </span>
          </div>
        </div>

        <div style={{ flex: '1 1 auto', minWidth: '180px' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
            Overall Progress
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: allEvaluated ? '#28a745' : '#0d6efd' }}>
            {progressPercentage}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationProgressTracker;
