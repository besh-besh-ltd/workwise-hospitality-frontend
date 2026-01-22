import React from 'react';
import { Badge, Card } from 'react-bootstrap';
import { BsCheckCircleFill, BsXCircleFill } from 'react-icons/bs';

/**
 * Displays vendor pass/fail status from approval metadata
 * Used in ApprovalWorkflowSection for TECHNICAL entity type
 */
const TechEvalVendorStatusDisplay = ({
  vendors = [],
  roundNumber = 1,
  showSummary = true
}) => {
  if (!vendors || vendors.length === 0) {
    return null;
  }

  // Separate passed and failed vendors
  const passedVendors = vendors.filter(v => v.is_passed || v.status === 'passed' || v.status === 'PASSED');
  const failedVendors = vendors.filter(v => !v.is_passed && (v.status === 'failed' || v.status === 'FAILED'));

  return (
    <div className="tech-eval-vendor-status-display mb-3">
      <Card className="border">
        <Card.Header className="bg-light py-2">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0 fw-bold" style={{ fontSize: '0.9rem' }}>
              Round {roundNumber} - Vendor Evaluation Results
            </h6>
            {showSummary && (
              <div className="d-flex gap-2">
                <Badge bg="success" className="px-2 py-1">
                  {passedVendors.length} Passed
                </Badge>
                <Badge bg="danger" className="px-2 py-1">
                  {failedVendors.length} Failed
                </Badge>
              </div>
            )}
          </div>
        </Card.Header>
        <Card.Body className="p-2">
          {/* Passed Vendors */}
          {passedVendors.length > 0 && (
            <div className="mb-2">
              <small className="text-success fw-medium d-block mb-1">
                <BsCheckCircleFill className="me-1" />
                Passed Vendors:
              </small>
              <div className="d-flex flex-wrap gap-1">
                {passedVendors.map((vendor, index) => {
                  const vendorLabel = vendor.vendor_name || `Vendor ${vendor.vendor_id}`;
                  const score = vendor.calculated_score !== undefined
                    ? `${vendor.calculated_score}%`
                    : '';
                  return (
                    <Badge
                      key={vendor.vendor_id || index}
                      bg="success"
                      className="px-2 py-1 d-flex align-items-center gap-1"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <BsCheckCircleFill size={10} />
                      {vendorLabel}
                      {score && <span className="ms-1">({score})</span>}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Failed Vendors */}
          {failedVendors.length > 0 && (
            <div>
              <small className="text-danger fw-medium d-block mb-1">
                <BsXCircleFill className="me-1" />
                Failed Vendors:
              </small>
              <div className="d-flex flex-wrap gap-1">
                {failedVendors.map((vendor, index) => {
                  const vendorLabel = vendor.vendor_name || `Vendor ${vendor.vendor_id}`;
                  const score = vendor.calculated_score !== undefined
                    ? `${vendor.calculated_score}%`
                    : '';
                  return (
                    <Badge
                      key={vendor.vendor_id || index}
                      bg="danger"
                      className="px-2 py-1 d-flex align-items-center gap-1"
                      style={{ fontSize: '0.8rem' }}
                    >
                      <BsXCircleFill size={10} />
                      {vendorLabel}
                      {score && <span className="ms-1">({score})</span>}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* No vendors message */}
          {passedVendors.length === 0 && failedVendors.length === 0 && (
            <small className="text-muted">No vendor evaluation data available</small>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default TechEvalVendorStatusDisplay;
