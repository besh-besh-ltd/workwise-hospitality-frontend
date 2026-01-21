import React from 'react';
import { Alert, Badge } from 'react-bootstrap';
import { BsExclamationCircleFill, BsCheckCircleFill, BsClockFill } from 'react-icons/bs';
import { getStageDefinition } from './utils/stageMapper';
import ProductArcCard from './ProductArcCard';
import ApprovalWorkflowSection from '@/components/dashboard/buyer/approval/ApprovalWorkflowSection';

const CurrentStageSection = ({
  currentStage,
  stages,
  rfq,
  lifecycleData,
  onRefresh,
  arcHandlers
}) => {
  const stageDef = getStageDefinition(currentStage);
  const stageData = stages.find(s => s.key === currentStage);

  if (!stageDef || !stageData) {
    return null;
  }

  // For COMPLETED stage, show success summary
  if (currentStage === 'COMPLETED') {
    return (
      <Alert variant="success" className="mb-4">
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 48,
              height: 48,
              backgroundColor: '#198754',
              flexShrink: 0
            }}
          >
            <BsCheckCircleFill size={24} className="text-white" />
          </div>
          <div>
            <div className="fw-bold">Tender Process Completed</div>
            <div className="small text-muted">
              All stages have been completed successfully. The ARC documents have been generated and approved.
            </div>
          </div>
        </div>
      </Alert>
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
      <div className="current-stage-section mb-4">
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
