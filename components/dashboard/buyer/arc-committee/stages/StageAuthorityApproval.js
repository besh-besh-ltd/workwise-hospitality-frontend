import React from 'react';
import moment from 'moment';
import { Badge, Table } from 'react-bootstrap';
import { BsCalendar, BsBuilding, BsBox, BsPeople } from 'react-icons/bs';
import ApprovalWorkflowSection from '@/components/dashboard/buyer/approval/ApprovalWorkflowSection';
import StageEventHistory from '../StageEventHistory';

const StageAuthorityApproval = ({ stage, rfq, lifecycleData, onRefresh }) => {
  const { details } = stage;

  return (
    <div className="stage-authority-approval">
      <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
        The tender was created and submitted for authority approval before publication.
      </p>

      {/* Tender Summary Info (from old CREATED stage) */}
      {(details.products?.length > 0 || details.vendorCount > 0) && (
        <div className="mb-4">
          <div className="row g-3 mb-3">
            {details.companyName && (
              <div className="col-md-6">
                <div className="d-flex align-items-start gap-2">
                  <BsBuilding className="text-primary mt-1" />
                  <div>
                    <div className="text-muted small">Company</div>
                    <div className="fw-semibold">{details.companyName}</div>
                  </div>
                </div>
              </div>
            )}
            {details.bidEndDate && (
              <div className="col-md-6">
                <div className="d-flex align-items-start gap-2">
                  <BsCalendar className="text-primary mt-1" />
                  <div>
                    <div className="text-muted small">Quote Submission Deadline</div>
                    <div className="fw-semibold">
                      {moment(details.bidEndDate).format('DD-MM-YYYY')}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {details.products?.length > 0 && (
              <div className="col-md-6">
                <div className="d-flex align-items-start gap-2">
                  <BsBox className="text-primary mt-1" />
                  <div>
                    <div className="text-muted small">Products</div>
                    <div className="fw-semibold">{details.products.length} products</div>
                  </div>
                </div>
              </div>
            )}
            {details.vendorCount > 0 && (
              <div className="col-md-6">
                <div className="d-flex align-items-start gap-2">
                  <BsPeople className="text-primary mt-1" />
                  <div>
                    <div className="text-muted small">Vendors Invited</div>
                    <div className="fw-semibold">{details.vendorCount} vendors</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Products List */}
          {details.products && details.products.length > 0 && (
            <div className="mb-3">
              <h6 className="text-muted mb-2" style={{ fontSize: '0.85rem' }}>Products in Tender</h6>
              <Table size="sm" bordered className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Product Name</th>
                    <th>Qty</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {details.products.slice(0, 5).map((product, idx) => {
                    const specs = product.product_specs || [];
                    const qty = specs.find(s => s.title === 'Quantity')?.value;
                    const unit = specs.find(s => s.title === 'Unit')?.value;
                    return (
                      <tr key={product.id || idx}>
                        <td>{product.product_details?.[0]?.name}</td>
                        <td>{qty}</td>
                        <td>{unit}</td>
                      </tr>
                    );
                  })}
                  {details.products.length > 5 && (
                    <tr>
                      <td colSpan={3} className="text-center text-muted small">
                        +{details.products.length - 5} more products
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Approval Workflow */}
      {rfq?.id && (
        <ApprovalWorkflowSection
          entityType="TENDER"
          entityId={rfq.id}
          entityLabel="Tender"
          hospitalityCompanyId={rfq?.hospitality_company_id}
          hotelId={rfq?.hotel_id}
          onActionComplete={onRefresh}
        />
      )}

      {/* Remarks if any */}
      {stage.remarks && (
        <div className="mt-3 p-3 bg-light rounded">
          <div className="text-muted small mb-1">Remarks:</div>
          <div className="fst-italic">"{stage.remarks}"</div>
        </div>
      )}

      {/* Full Event History */}
      {stage.history && stage.history.length > 1 && (
        <div className="mt-3 pt-3 border-top">
          <StageEventHistory
            events={stage.history}
            title="Approval History"
          />
        </div>
      )}

      {/* Actor info (single event fallback) */}
      {stage.actor && stage.status === 'completed' && (!stage.history || stage.history.length <= 1) && (
        <div className="pt-3 mt-3 border-top">
          <div className="d-flex justify-content-between align-items-center">
            <div className="text-muted small">
              <strong>Submitted by:</strong> {stage.actor}
            </div>
            {stage.timestamp && (
              <div className="text-muted small">
                {moment(stage.timestamp).format('DD-MM-YYYY hh:mm A')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StageAuthorityApproval;
