import React from 'react';
import { Badge, Alert } from 'react-bootstrap';
import { BsShieldCheck, BsFileBreak, BsArrowCounterclockwise } from 'react-icons/bs';
import ProductArcCard from '../ProductArcCard';
import ProductArcMatrix from '../ProductArcMatrix';
import StageEventHistory from '../StageEventHistory';

const StageArcReview = ({ stage, rfq, lifecycleData, onRefresh, arcHandlers }) => {
  const { details } = stage;
  const instances = details.instances || lifecycleData?.arcApproval?.instances || [];
  const products = details.products || rfq?.products || [];
  const sentBackTo = details.sentBackTo;

  // Phase 3 matrix view: when the BE returns arcApproval.items (one
  // row per product × vendor cell, post-Phase-2 model), render the
  // per-cell matrix UI. Falls back to the legacy product-level cards
  // for tenders that haven't been re-finalised under the new model.
  const arcItems = lifecycleData?.arcApproval?.items || [];
  const useMatrix = arcItems.length > 0;

  // Get products that have ARC instances
  const productsWithArc = products.filter(product => {
    return instances.some(inst =>
      (inst.metadata?.rfq_product_id || inst.entity_id) === product.id
    );
  });

  // Helper to get ARC instance for a product
  const getProductArcInstance = (productId) => {
    return instances.find(inst =>
      (inst.metadata?.rfq_product_id || inst.entity_id) === productId
    );
  };

  // Separate by status
  const pendingProducts = productsWithArc.filter(p => getProductArcInstance(p.id)?.status === 'PENDING');
  const approvedProducts = productsWithArc.filter(p => getProductArcInstance(p.id)?.status === 'APPROVED');
  const rejectedProducts = productsWithArc.filter(p => getProductArcInstance(p.id)?.status === 'REJECTED');
  const cancelledProducts = productsWithArc.filter(p => getProductArcInstance(p.id)?.status === 'CANCELLED');

  return (
    <div className="stage-arc-review">
      <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
        ARC Committee review is conducted per product. Each product requires committee approval before the award document is generated.
      </p>

      {/* Sent Back Alert */}
      {cancelledProducts.length > 0 && sentBackTo && (
        <Alert variant="warning" className="mb-3 d-flex align-items-center">
          <BsArrowCounterclockwise className="me-2" size={20} />
          <div>
            <strong>Sent back to {sentBackTo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
            <p className="mb-0 small text-muted">
              The ARC review was sent back to an earlier stage. Complete the required steps and resubmit for ARC approval.
            </p>
          </div>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="d-flex flex-wrap gap-3 mb-4">
        <div className="d-flex align-items-center gap-2">
          <Badge bg="warning" text="dark" className="px-2 py-1">{pendingProducts.length}</Badge>
          <span className="text-muted small">Pending</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <Badge bg="success" className="px-2 py-1">{approvedProducts.length}</Badge>
          <span className="text-muted small">Approved</span>
        </div>
        {rejectedProducts.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            <Badge bg="danger" className="px-2 py-1">{rejectedProducts.length}</Badge>
            <span className="text-muted small">Rejected</span>
          </div>
        )}
        {cancelledProducts.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            <Badge bg="secondary" className="px-2 py-1">{cancelledProducts.length}</Badge>
            <span className="text-muted small">Sent Back</span>
          </div>
        )}
      </div>

      {useMatrix ? (
        <ProductArcMatrix
          items={arcItems}
          rfq={rfq}
          onAction={async (arcItemId, action, comment) => {
            if (arcHandlers?.onCellAction) {
              return arcHandlers.onCellAction(arcItemId, action, comment);
            }
            return { success: false, error: 'No cell handler provided' };
          }}
          onRefresh={onRefresh}
        />
      ) : productsWithArc.length === 0 ? (
        <Alert variant="info" className="mb-0">
          <BsShieldCheck className="me-2" />
          No products are awaiting ARC review.
        </Alert>
      ) : (
        <>
          {/* Pending Products */}
          {pendingProducts.length > 0 && (
            <div className="mb-4">
              <h6 className="text-warning mb-3 d-flex align-items-center gap-2">
                <BsShieldCheck />
                Products Requiring Approval
              </h6>
              <div className="row g-3">
                {pendingProducts.map(product => (
                  <div key={product.id} className="col-12">
                    <ProductArcCard
                      product={product}
                      arcInstance={getProductArcInstance(product.id)}
                      rfq={rfq}
                      lifecycleData={lifecycleData}
                      onRefresh={onRefresh}
                      arcHandlers={arcHandlers}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approved Products */}
          {approvedProducts.length > 0 && (
            <div className="mb-4">
              <h6 className="text-success mb-3 d-flex align-items-center gap-2">
                <BsFileBreak />
                Approved Products
              </h6>
              <div className="row g-3">
                {approvedProducts.map(product => (
                  <div key={product.id} className="col-12">
                    <ProductArcCard
                      product={product}
                      arcInstance={getProductArcInstance(product.id)}
                      rfq={rfq}
                      lifecycleData={lifecycleData}
                      onRefresh={onRefresh}
                      arcHandlers={arcHandlers}
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rejected Products */}
          {rejectedProducts.length > 0 && (
            <div className="mb-4">
              <h6 className="text-danger mb-3 d-flex align-items-center gap-2">
                <BsShieldCheck />
                Rejected Products
              </h6>
              <div className="row g-3">
                {rejectedProducts.map(product => (
                  <div key={product.id} className="col-12">
                    <ProductArcCard
                      product={product}
                      arcInstance={getProductArcInstance(product.id)}
                      rfq={rfq}
                      lifecycleData={lifecycleData}
                      onRefresh={onRefresh}
                      arcHandlers={arcHandlers}
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sent Back Products */}
          {cancelledProducts.length > 0 && (
            <div>
              <h6 className="text-secondary mb-3 d-flex align-items-center gap-2">
                <BsArrowCounterclockwise />
                Sent Back Products
              </h6>
              <div className="row g-3">
                {cancelledProducts.map(product => (
                  <div key={product.id} className="col-12">
                    <ProductArcCard
                      product={product}
                      arcInstance={getProductArcInstance(product.id)}
                      rfq={rfq}
                      lifecycleData={lifecycleData}
                      onRefresh={onRefresh}
                      arcHandlers={arcHandlers}
                      readOnly
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Full Event History */}
      {stage.history && stage.history.length > 0 && (
        <div className="mt-4 pt-3 border-top">
          <StageEventHistory
            events={stage.history}
            title="ARC Review History"
          />
        </div>
      )}
    </div>
  );
};

export default StageArcReview;
