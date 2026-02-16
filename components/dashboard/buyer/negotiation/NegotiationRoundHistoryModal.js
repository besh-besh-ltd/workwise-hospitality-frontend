import React, { useState } from "react";
import { Modal, Badge, Card, Collapse } from "react-bootstrap";
import { formatDisplayDate } from "@/utils/sharedFunctions";

const NegotiationRoundHistoryModal = ({ show, onHide, rounds, rfq_id }) => {
  const [expandedRounds, setExpandedRounds] = useState({});

  const toggleRound = (roundId) => {
    setExpandedRounds(prev => ({
      ...prev,
      [roundId]: !prev[roundId]
    }));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge bg="success">Completed</Badge>;
      case 'CANCELLED':
        return <Badge bg="danger">Cancelled</Badge>;
      case 'REJECTED':
        return <Badge bg="danger">Rejected</Badge>;
      case 'ACTIVE':
        return <Badge bg="primary">Active</Badge>;
      case 'PENDING_APPROVAL':
        return <Badge bg="warning">Pending Approval</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  // Helper to get effective status considering approvals
  const getEffectiveStatus = (round) => {
    // Check if any approval is REJECTED - if so, round is rejected
    const hasRejectedApproval = round.approvals?.some(a => a.status === 'REJECTED');
    if (hasRejectedApproval) return 'REJECTED';
    return round.status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return formatDisplayDate(dateString, { includeTime: true });
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `₹${parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Negotiation Round History</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: "70vh", overflowY: "auto" }}>
        {!rounds || rounds.length === 0 ? (
          <div className="text-center py-5">
            <p className="text-muted">No negotiation rounds found</p>
          </div>
        ) : (
          <div>
            {rounds.map((round) => (
              <Card key={round.id} className="mb-3">
                <Card.Header
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleRound(round.id)}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                      <Badge bg="primary">Round {round.round_number}</Badge>
                      <span className="fw-semibold">Target: {formatPrice(round.target_price)}</span>
                      {getStatusBadge(getEffectiveStatus(round))}
                    </div>
                    <i className={`bi bi-chevron-${expandedRounds[round.id] ? 'up' : 'down'}`}></i>
                  </div>
                </Card.Header>

                <Collapse in={expandedRounds[round.id]}>
                  <div>
                    <Card.Body>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <strong>Target Price:</strong> {formatPrice(round.target_price)}
                        </div>
                        <div className="col-md-6">
                          <strong>End Date:</strong> {formatDate(round.end_date)}
                        </div>
                      </div>

                      <div className="row mb-3">
                        <div className="col-md-6">
                          <strong>Created By:</strong> {round.created_by_name || 'Unknown'}
                        </div>
                        <div className="col-md-6">
                          <strong>Created At:</strong> {formatDate(round.created_at)}
                        </div>
                      </div>

                      {round.approved_at && (
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <strong>Approved At:</strong> {formatDate(round.approved_at)}
                          </div>
                        </div>
                      )}

                      {round.published_at && (
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <strong>Published At:</strong> {formatDate(round.published_at)}
                          </div>
                        </div>
                      )}

                      {round.closed_at && (
                        <div className="row mb-3">
                          <div className="col-md-6">
                            <strong>Closed At:</strong> {formatDate(round.closed_at)}
                          </div>
                        </div>
                      )}

                      {round.remarks && (
                        <div className="mb-3">
                          <strong>Remarks:</strong>
                          <p className="text-muted">{round.remarks}</p>
                        </div>
                      )}

                      {round.approvals && round.approvals.length > 0 && (
                        <div className="mt-3">
                          <strong>Approvals:</strong>
                          <div className="mt-2">
                            {round.approvals.map((approval) => (
                              <div
                                key={approval.id}
                                className="d-flex justify-content-between align-items-center py-2 border-bottom"
                              >
                                <span>{approval.approver_name || 'Unknown'}</span>
                                <Badge
                                  bg={
                                    approval.status === 'APPROVED' ? 'success' :
                                    approval.status === 'REJECTED' ? 'danger' : 'warning'
                                  }
                                >
                                  {approval.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card.Body>
                  </div>
                </Collapse>
              </Card>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onHide}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default NegotiationRoundHistoryModal;

