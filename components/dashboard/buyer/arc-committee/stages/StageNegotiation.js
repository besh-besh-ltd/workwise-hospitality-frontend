import React, { useState } from 'react';
import { Badge, Accordion, Alert } from 'react-bootstrap';
import moment from 'moment';
import { BsArrowRepeat, BsCurrencyRupee, BsCalendar, BsPeople } from 'react-icons/bs';
import ApprovalWorkflowSection from '@/components/dashboard/buyer/approval/ApprovalWorkflowSection';

const StageNegotiation = ({ stage, rfq, lifecycleData, onRefresh }) => {
  const { details } = stage;
  const rounds = details.rounds || lifecycleData?.negotiationRounds || [];
  const products = rfq?.products || [];
  const [expandedRound, setExpandedRound] = useState(null);

  // Helper to get product name from rfq_product_id
  const getProductName = (rfqProductId) => {
    const product = products.find(p => p.id === rfqProductId);
    return product?.product_details?.[0]?.name || `Product ${rfqProductId}`;
  };

  const getRoundStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge bg="success">Active</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge bg="warning" text="dark">Pending Approval</Badge>;
      case 'COMPLETED':
        return <Badge bg="secondary">Completed</Badge>;
      case 'CANCELLED':
        return <Badge bg="danger">Cancelled</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="stage-negotiation">
      <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
        Negotiation rounds were conducted to achieve optimal pricing from vendors.
      </p>

      {/* Summary Stats */}
      <div className="d-flex gap-4 mb-3">
        <div className="d-flex align-items-center gap-2">
          <BsArrowRepeat className="text-primary" />
          <span className="fw-semibold">{rounds.length}</span>
          <span className="text-muted small">Rounds</span>
        </div>
      </div>

      {rounds.length > 0 ? (
        <Accordion activeKey={expandedRound} onSelect={setExpandedRound} flush>
          {rounds.map((round, index) => (
            <Accordion.Item
              key={round.id}
              eventKey={round.id?.toString()}
              className="border rounded mb-2"
            >
              <Accordion.Header>
                <div className="d-flex justify-content-between align-items-center w-100 me-3">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="d-flex align-items-center justify-content-center rounded-circle bg-primary text-white"
                      style={{ width: 32, height: 32, fontSize: '0.85rem' }}
                    >
                      {round.round_number || index + 1}
                    </div>
                    <div>
                      <div className="fw-semibold">Round {round.round_number || index + 1}</div>
                      <div className="text-muted small">
                        {moment(round.start_date || round.created_at).format('DD MMM')}
                        {round.end_date && ` - ${moment(round.end_date).format('DD MMM')}`}
                      </div>
                    </div>
                  </div>
                  {getRoundStatusBadge(round.status)}
                </div>
              </Accordion.Header>
              <Accordion.Body>
                {/* Round Details */}
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <div className="d-flex align-items-start gap-2">
                      <BsCurrencyRupee className="text-success mt-1" />
                      <div>
                        <div className="text-muted small">Target Price</div>
                        <div className="fw-semibold">
                          {round.target_price
                            ? `Rs. ${parseFloat(round.target_price).toLocaleString()}`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="d-flex align-items-start gap-2">
                      <BsCalendar className="text-warning mt-1" />
                      <div>
                        <div className="text-muted small">End Date</div>
                        <div className="fw-semibold">
                          {round.end_date
                            ? moment(round.end_date).format('DD MMM YYYY')
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="d-flex align-items-start gap-2">
                      <BsPeople className="text-primary mt-1" />
                      <div>
                        <div className="text-muted small">Vendor Quotes</div>
                        <div className="fw-semibold">{round.quotes?.length || 0} received</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Round Approval Workflow */}
                {round.rfq_product_id && (
                  <ApprovalWorkflowSection
                    entityType="NEGOTIATION"
                    entityId={round.rfq_product_id}
                    entityLabel={`Round ${round.round_number || index + 1} - ${getProductName(round.rfq_product_id)}`}
                    hospitalityCompanyId={rfq?.hospitality_company_id}
                    hotelId={rfq?.hotel_id}
                    onActionComplete={onRefresh}
                  />
                )}

                {/* Round Remarks */}
                {round.remarks && (
                  <div className="mt-3 p-2 bg-light rounded small">
                    <strong>Remarks:</strong> {round.remarks}
                  </div>
                )}
              </Accordion.Body>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : (
        <Alert variant="info" className="mb-0">
          <BsArrowRepeat className="me-2" />
          No negotiation rounds conducted
        </Alert>
      )}
    </div>
  );
};

export default StageNegotiation;
