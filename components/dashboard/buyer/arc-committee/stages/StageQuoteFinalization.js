import React from 'react';
import { Badge, Table, Alert } from 'react-bootstrap';
import moment from 'moment';
import { BsTrophy, BsCurrencyRupee } from 'react-icons/bs';
import ApprovalWorkflowSection from '@/components/dashboard/buyer/approval/ApprovalWorkflowSection';

const StageQuoteFinalization = ({ stage, rfq, lifecycleData, onRefresh }) => {
  const { details } = stage;
  const rankings = details.rankings || lifecycleData?.vendorRankings || {};
  const products = rfq?.products || [];

  // Helper to get product name from ID
  const getProductName = (productKey) => {
    // productKey format could be "51606_0" or just "51606"
    const productId = productKey.includes('_') ? parseInt(productKey.split('_')[0]) : parseInt(productKey);
    const product = products.find(p => p.id === productId || p.id === productKey);
    return product?.product_details?.[0]?.name || productKey;
  };

  // Flatten rankings for display
  const allRankings = Object.entries(rankings).flatMap(([productKey, productRankings]) =>
    productRankings.map((r, idx) => ({
      ...r,
      productKey,
      productName: getProductName(productKey),
      rank: idx + 1
    }))
  );

  return (
    <div className="stage-quote-finalization">
      <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
        Vendors were ranked based on their final quotes and the best quotes were selected for approval.
      </p>

      {/* Approval Workflow for Quote Finalization */}
      {details.approvalData?.entity_id && (
        <div className="mb-3">
          <ApprovalWorkflowSection
            entityType="NEGOTIATION_QUOTE"
            entityId={details.approvalData.entity_id}
            entityLabel="Quote Finalization"
            hospitalityCompanyId={rfq?.hospitality_company_id}
            hotelId={rfq?.hotel_id}
            onActionComplete={onRefresh}
          />
        </div>
      )}

      {/* Rankings Table */}
      {allRankings.length > 0 ? (
        <Table size="sm" bordered hover className="mb-0">
          <thead className="table-light">
            <tr>
              <th>Product</th>
              <th style={{ width: '80px' }}>Rank</th>
              <th>Vendor</th>
              <th>Quoted Price</th>
              <th>Finalized</th>
            </tr>
          </thead>
          <tbody>
            {allRankings.map((ranking, idx) => (
              <tr key={idx}>
                <td className="small">{ranking.productName}</td>
                <td>
                  <Badge
                    bg={ranking.rank === 1 ? 'warning' : ranking.rank === 2 ? 'secondary' : 'dark'}
                    text={ranking.rank === 1 ? 'dark' : 'white'}
                    className="d-flex align-items-center justify-content-center"
                    style={{ width: 40 }}
                  >
                    {ranking.rank === 1 && <BsTrophy className="me-1" />}
                    L{ranking.rank}
                  </Badge>
                </td>
                <td className="fw-semibold">{ranking.vendor_name || ranking.organization_name || 'N/A'}</td>
                <td>
                  <div className="d-flex align-items-center">
                    <BsCurrencyRupee className="text-muted me-1" size={12} />
                    {parseFloat(ranking.quoted_price || 0).toLocaleString()}
                  </div>
                </td>
                <td className="small text-muted">
                  {moment(ranking.created_at).format('DD MMM YYYY')}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <Alert variant="info" className="mb-0">
          <BsTrophy className="me-2" />
          No vendor rankings available
        </Alert>
      )}

      {/* Actor info */}
      {stage.actor && stage.status === 'completed' && (
        <div className="pt-3 mt-3 border-top">
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              <strong>Finalized by:</strong> {stage.actor}
            </div>
            {stage.timestamp && (
              <div className="text-muted small">
                {moment(stage.timestamp).format('DD MMM YYYY, HH:mm')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StageQuoteFinalization;
