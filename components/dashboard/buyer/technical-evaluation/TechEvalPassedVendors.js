import React from 'react';
import { Badge, Card } from 'react-bootstrap';
import { BsCheckCircleFill, BsShieldFillCheck } from 'react-icons/bs';

/**
 * Displays the list of passed/cleared vendors that have been verified
 * These vendors are "locked in" and will proceed to the next stage
 */
const TechEvalPassedVendors = ({ vendors = [], minimumPassingScore = null }) => {
  if (!vendors || vendors.length === 0) {
    return null;
  }

  return (
    <div className="tech-eval-passed-vendors mb-4">
      <Card className="border-success">
        <Card.Header className="bg-success bg-opacity-10 border-success">
          <div className="d-flex align-items-center gap-2">
            <BsShieldFillCheck className="text-success" size={20} />
            <h6 className="mb-0 fw-bold text-success">
              Cleared Vendors ({vendors.length})
            </h6>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '35%' }}>Vendor</th>
                  <th style={{ width: '20%' }}>Score</th>
                  <th style={{ width: '20%' }}>Cleared In</th>
                  <th style={{ width: '25%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor, index) => {
                  const vendorCode = vendor.rfq_product_vendor_id
                    ? `VEN-${vendor.rfq_product_vendor_id}`
                    : vendor.vendor_name || `Vendor ${vendor.vendor_id}`;

                  return (
                    <tr key={vendor.vendor_id || index}>
                      <td>
                        <div className="d-flex flex-column">
                          <span className="fw-medium">{vendorCode}</span>
                          {vendor.vendor_name && vendor.rfq_product_vendor_id && (
                            <small className="text-muted">{vendor.vendor_name}</small>
                          )}
                          {vendor.vendor_email && (
                            <small className="text-muted">{vendor.vendor_email}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge
                          bg="success"
                          className="px-2 py-1"
                          style={{ fontSize: '0.85rem' }}
                        >
                          {vendor.calculated_score !== undefined && vendor.calculated_score !== null
                            ? `${!minimumPassingScore ? 100 : vendor.calculated_score}%`
                            : 'N/A'}
                        </Badge>
                      </td>
                      <td>
                        <Badge bg="secondary" className="px-2 py-1">
                          Round {vendor.evaluation_round || 1}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <BsCheckCircleFill className="text-success" size={14} />
                          <span className="text-success fw-medium" style={{ fontSize: '0.85rem' }}>
                            Verified
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default TechEvalPassedVendors;
