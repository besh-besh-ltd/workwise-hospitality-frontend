import React from 'react';
import { Alert, Badge, Spinner } from 'react-bootstrap';
import { BsExclamationCircleFill, BsCheckCircleFill, BsClockFill, BsArrowRepeat, BsTrophyFill, BsFileEarmarkTextFill, BsDownload } from 'react-icons/bs';
import moment from 'moment';
import { getStageDefinition } from './utils/stageMapper';
import ProductArcCard from './ProductArcCard';
import ApprovalWorkflowSection from '@/components/dashboard/buyer/approval/ApprovalWorkflowSection';

const CurrentStageSection = ({
  currentStage,
  stages,
  rfq,
  lifecycleData,
  onRefresh,
  arcHandlers,
  refreshing = false
}) => {
  const stageDef = getStageDefinition(currentStage);
  const stageData = stages.find(s => s.key === currentStage);

  if (!stageDef || !stageData) {
    return null;
  }

  // For COMPLETED stage, show success summary with product details
  if (currentStage === 'COMPLETED') {
    const arcInstances = lifecycleData?.arcApproval?.instances || [];
    const approvedInstances = arcInstances.filter(i => i.status === 'APPROVED');
    const products = rfq?.products || [];

    // Collect all document URLs from approved instances
    const docsAvailable = approvedInstances.filter(i => i.metadata?.award_document_url);

    return (
      <div className="mb-4">
        <Alert
          variant="success"
          className="border-0 mb-3"
          style={{
            background: 'linear-gradient(135deg, #d1e7dd 0%, #badbcc 100%)',
            borderLeft: '4px solid #198754 !important'
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: 56,
                height: 56,
                backgroundColor: '#198754',
                flexShrink: 0
              }}
            >
              <BsTrophyFill size={28} className="text-white" />
            </div>
            <div>
              <div className="fw-bold" style={{ fontSize: '1.1rem' }}>Tender Process Completed</div>
              <div className="small text-dark opacity-75">
                All stages have been completed successfully. The ARC documents have been generated and approved.
              </div>
            </div>
          </div>
        </Alert>

        {/* ARC Award Documents - Prominent at the top */}
        {docsAvailable.length > 0 && (
          <div
            className="p-3 rounded mb-3"
            style={{
              backgroundColor: '#f0f7ff',
              border: '1px solid #0d6efd',
              borderRadius: '8px'
            }}
          >
            <h6 className="mb-3 d-flex align-items-center gap-2" style={{ fontSize: '0.95rem', color: '#0d6efd' }}>
              <BsFileEarmarkTextFill size={18} />
              ARC Award Documents
            </h6>
            <div className="d-flex flex-wrap gap-2">
              {docsAvailable.map((inst, idx) => {
                const label = inst.metadata?.product_name || `ARC Document #${idx + 1}`;
                const suggestedName = `ARC-Award-${label.replace(/\s+/g, '-')}.pdf`;
                return (
                  <a
                    key={inst.id || idx}
                    href={inst.metadata.award_document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={suggestedName}
                    className="btn btn-primary d-inline-flex align-items-center gap-2 text-decoration-none"
                    style={{
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      padding: '0.5rem 1rem',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(13, 110, 253, 0.25)'
                    }}
                  >
                    <BsDownload size={18} aria-hidden />
                    {label}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Approved Products */}
        {products.length > 0 && (
          <div className="p-3 rounded mb-3" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
            <h6 className="mb-2" style={{ fontSize: '0.9rem', color: '#495057' }}>
              <BsCheckCircleFill className="me-2" style={{ color: '#198754' }} />
              Approved Products ({products.length})
            </h6>
            <div className="d-flex flex-wrap gap-2">
              {products.map((product, idx) => {
                const inst = approvedInstances.find(i =>
                  (i.metadata?.rfq_product_id || i.entity_id) === product.id
                );
                return (
                  <div
                    key={product.id || idx}
                    className="d-flex align-items-center gap-2 px-3 py-2 rounded"
                    style={{ backgroundColor: '#d1e7dd', border: '1px solid #a3cfbb' }}
                  >
                    <BsCheckCircleFill size={14} style={{ color: '#198754' }} />
                    <span className="small fw-semibold">{product.product_details?.[0]?.name || product.product_name || product.name || `Product ${idx + 1}`}</span>
                    {inst && (inst.updated_at || inst.created_at) && (
                      <span className="small text-muted ms-1">
                        ({moment(inst.updated_at || inst.created_at).format('DD MMM')})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ARC Approval Records */}
        {approvedInstances.length > 0 && (
          <div className="p-3 rounded" style={{ backgroundColor: '#f8f9fa', border: '1px solid #e9ecef' }}>
            <h6 className="mb-2" style={{ fontSize: '0.9rem', color: '#495057' }}>
              <BsFileEarmarkTextFill className="me-2" style={{ color: '#6c757d' }} />
              ARC Approval Records ({approvedInstances.length})
            </h6>
            {approvedInstances.map((inst, idx) => (
              <div
                key={inst.id || idx}
                className="d-flex align-items-center justify-content-between p-2 mb-1 rounded"
                style={{ backgroundColor: '#fff', border: '1px solid #e9ecef' }}
              >
                <span className="small">
                  {inst.metadata?.product_name || `Approval #${idx + 1}`}
                </span>
                <div className="d-flex align-items-center gap-2">
                  <Badge bg="success" style={{ fontSize: '0.7rem' }}>Approved</Badge>
                  {(inst.updated_at || inst.created_at) && (
                    <span className="small text-muted">
                      {moment(inst.updated_at || inst.created_at).format('DD-MM-YYYY hh:mm A')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // For ARC stage, show product cards prominently
  if (currentStage === 'ARC_REVIEW') {
    const instances = lifecycleData?.arcApproval?.instances || [];
    const products = rfq?.products || [];

    // Get products with pending ARC
    const pendingProducts = products.filter(product => {
      const inst = instances.find(i =>
        (i.metadata?.rfq_product_id || i.entity_id) === product.id
      );
      return inst?.status === 'PENDING';
    });

    if (pendingProducts.length === 0) {
      return (
        <Alert variant="success" className="mb-4">
          <div className="d-flex align-items-center gap-3">
            <BsCheckCircleFill size={24} />
            <div>
              <div className="fw-bold">All Products Approved</div>
              <div className="small">All products in this tender have been reviewed and approved by the ARC Committee.</div>
            </div>
          </div>
        </Alert>
      );
    }

    return (
      <div className="current-stage-section mb-4" style={{ position: 'relative' }}>
        {refreshing && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255,255,255,0.7)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px'
            }}
          >
            <div className="text-center">
              <Spinner animation="border" variant="primary" className="mb-2" />
              <div className="text-primary fw-semibold">
                <BsArrowRepeat className="me-2" style={{ animation: 'spin 1s linear infinite' }} />
                Updating ARC Status...
              </div>
            </div>
          </div>
        )}
        <Alert
          variant="warning"
          className="mb-4 border-0"
          style={{
            background: 'linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%)',
            borderLeft: '4px solid #ffc107 !important'
          }}
        >
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle"
              style={{
                width: 48,
                height: 48,
                backgroundColor: '#ffc107',
                flexShrink: 0
              }}
            >
              <BsExclamationCircleFill size={24} className="text-dark" />
            </div>
            <div>
              <div className="fw-bold text-dark">ARC Review in Progress</div>
              <div className="text-dark opacity-75">
                {pendingProducts.length} product{pendingProducts.length > 1 ? 's' : ''} awaiting ARC Committee approval.
                Review each product below to approve or reject.
              </div>
            </div>
          </div>
        </Alert>

        <h5 className="mb-3">Products Requiring Approval</h5>
        <div className="row g-3">
          {pendingProducts.map(product => {
            const arcInstance = instances.find(i =>
              (i.metadata?.rfq_product_id || i.entity_id) === product.id
            );
            return (
              <div key={product.id} className="col-12">
                <ProductArcCard
                  product={product}
                  arcInstance={arcInstance}
                  rfq={rfq}
                  lifecycleData={lifecycleData}
                  onRefresh={onRefresh}
                  arcHandlers={arcHandlers}
                  refreshing={refreshing}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // For stages with approval workflows (non-ARC)
  if (stageData.hasApproval && stageData.status === 'active') {
    let entityType = stageData.approvalType;
    let entityId = null;

    switch (currentStage) {
      case 'AUTHORITY_APPROVAL':
        entityId = rfq?.id;
        break;
      case 'TECH_EVAL':
        entityId = stageData.details?.approvalData?.entity_id;
        break;
      case 'NEGOTIATION':
        // Find active negotiation round
        const activeRound = lifecycleData?.negotiationRounds?.find(r =>
          r.status === 'PENDING_APPROVAL' || r.status === 'ACTIVE'
        );
        entityId = activeRound?.id;
        break;
      case 'QUOTE_FINALIZED':
        entityId = stageData.details?.approvalData?.entity_id;
        break;
    }

    if (entityId) {
      return (
        <div className="current-stage-section mb-4">
          <Alert
            variant="info"
            className="mb-3 border-0"
            style={{
              background: 'linear-gradient(135deg, #cce5ff 0%, #b8daff 100%)',
              borderLeft: '4px solid #0d6efd !important'
            }}
          >
            <div className="d-flex align-items-center gap-3">
              <div
                className="d-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: '#0d6efd',
                  flexShrink: 0
                }}
              >
                <BsClockFill size={24} className="text-white" />
              </div>
              <div>
                <div className="fw-bold text-dark">{stageDef.label}</div>
                <div className="text-dark opacity-75">
                  This stage is currently in progress and may require approval.
                </div>
              </div>
            </div>
          </Alert>

          <ApprovalWorkflowSection
            entityType={entityType}
            entityId={entityId}
            entityLabel={stageDef.label}
            hospitalityCompanyId={rfq?.hospitality_company_id}
            hotelId={rfq?.hotel_id}
            onActionComplete={onRefresh}
          />
        </div>
      );
    }
  }

  // For completed stages or stages without action needed
  if (stageData.status === 'active') {
    return (
      <Alert variant="info" className="mb-4">
        <div className="d-flex align-items-center gap-3">
          <BsClockFill size={24} />
          <div>
            <div className="fw-bold">Current Stage: {stageDef.label}</div>
            <div className="small">This stage is currently in progress. See the timeline below for details.</div>
          </div>
        </div>
      </Alert>
    );
  }

  return null;
};

export default CurrentStageSection;
