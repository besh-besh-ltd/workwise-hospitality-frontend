import React from 'react';
import { Accordion, Badge, Card } from 'react-bootstrap';
import { BsXCircleFill, BsArrowRightShort, BsPersonCheck } from 'react-icons/bs';
import moment from 'moment';

/**
 * Displays failed vendor history grouped by evaluation round
 * Shows vendor details, rejection reason, and replacement info
 */
const TechEvalFailedHistory = ({ vendors = [] }) => {
  if (!vendors || vendors.length === 0) {
    return null;
  }

  // Group vendors by evaluation round
  const vendorsByRound = vendors.reduce((acc, vendor) => {
    const round = vendor.evaluation_round || 1;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(vendor);
    return acc;
  }, {});

  // Get sorted round numbers
  const rounds = Object.keys(vendorsByRound).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="tech-eval-failed-history mb-4">
      <Card className="border-danger border-opacity-50">
        <Card.Header className="bg-danger bg-opacity-10 border-danger border-opacity-50">
          <div className="d-flex align-items-center gap-2">
            <BsXCircleFill className="text-danger" size={18} />
            <h6 className="mb-0 fw-bold text-danger">
              Failed Vendor History ({vendors.length} vendor{vendors.length !== 1 ? 's' : ''})
            </h6>
          </div>
        </Card.Header>
        <Card.Body className="p-2">
          <Accordion>
            {rounds.map((round, idx) => {
              const roundVendors = vendorsByRound[round];
              return (
                <Accordion.Item eventKey={round} key={round}>
                  <Accordion.Header>
                    <div className="d-flex align-items-center gap-2 w-100">
                      <Badge bg="secondary">Round {round}</Badge>
                      <span className="text-muted">
                        ({roundVendors.length} vendor{roundVendors.length !== 1 ? 's' : ''} failed)
                      </span>
                    </div>
                  </Accordion.Header>
                  <Accordion.Body className="p-0">
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Vendor</th>
                            <th>Score</th>
                            <th>Reason</th>
                            <th>Replaced By</th>
                            <th>Verified By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roundVendors.map((vendor, index) => {
                            const vendorCode = vendor.rfq_product_vendor_id
                              ? `VEN-${vendor.rfq_product_vendor_id}`
                              : vendor.vendor_name || `Vendor ${vendor.vendor_id}`;

                            const replacementCode = vendor.replaced_by_vendor_id
                              ? vendor.replaced_by_rfq_product_vendor_id
                                ? `VEN-${vendor.replaced_by_rfq_product_vendor_id}`
                                : vendor.replaced_by_vendor_name || `Vendor ${vendor.replaced_by_vendor_id}`
                              : null;

                            return (
                              <tr key={vendor.vendor_id || index}>
                                <td>
                                  <div className="d-flex flex-column">
                                    <span className="fw-medium text-danger">{vendorCode}</span>
                                    {vendor.vendor_name && vendor.rfq_product_vendor_id && (
                                      <small className="text-muted">{vendor.vendor_name}</small>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  <Badge bg="danger" className="px-2 py-1">
                                    {vendor.calculated_score !== undefined && vendor.calculated_score !== null
                                      ? `${vendor.calculated_score}%`
                                      : 'N/A'}
                                  </Badge>
                                </td>
                                <td>
                                  <small className="text-muted">
                                    {vendor.reject_message || 'Did not meet passing score'}
                                  </small>
                                </td>
                                <td>
                                  {replacementCode ? (
                                    <div className="d-flex align-items-center gap-1">
                                      <BsArrowRightShort className="text-info" size={18} />
                                      <Badge bg="info" className="px-2 py-1">
                                        {replacementCode}
                                      </Badge>
                                    </div>
                                  ) : (
                                    <small className="text-muted">-</small>
                                  )}
                                </td>
                                <td>
                                  {vendor.verified_by ? (
                                    <div className="d-flex align-items-center gap-1">
                                      <BsPersonCheck className="text-secondary" size={14} />
                                      <small>{vendor.verified_by}</small>
                                      {vendor.verified_at && (
                                        <small className="text-muted ms-1">
                                          ({moment(vendor.verified_at).format('DD MMM')})
                                        </small>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge bg="success" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
                                      Verified as Failed
                                    </Badge>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Accordion.Body>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </Card.Body>
      </Card>
    </div>
  );
};

export default TechEvalFailedHistory;
