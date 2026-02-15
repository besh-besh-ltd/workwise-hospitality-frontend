import React, { useState } from "react";
import { Badge, Card, Collapse } from "react-bootstrap";
import moment from "moment";

const RoundApprovalsList = ({ approvals, currentUserId, onApprove, onReject }) => {
  const [open, setOpen] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectRemarks, setRejectRemarks] = useState("");

  if (!approvals || approvals.length === 0) {
    return null;
  }

  const approvedCount = approvals.filter(a => a.status === 'APPROVED').length;
  const rejectedCount = approvals.filter(a => a.status === 'REJECTED').length;
  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;
  const totalCount = approvals.length;

  const currentUserApproval = approvals.find(a => a.approver_user_id === currentUserId);

  const handleApprove = () => {
    if (onApprove) {
      onApprove();
    }
  };

  const handleReject = () => {
    if (!rejectRemarks.trim()) {
      alert("Remarks are required for rejection");
      return;
    }
    if (onReject) {
      onReject(rejectRemarks);
      setRejectRemarks("");
      setShowRejectForm(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return <Badge bg="success">✓ Approved</Badge>;
      case 'REJECTED':
        return <Badge bg="danger">✗ Rejected</Badge>;
      case 'PENDING':
        return <Badge bg="warning">⏳ Pending</Badge>;
      default:
        return <Badge bg="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="round-approvals-section">
      <div
        className="d-flex justify-content-between align-items-center mb-2"
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen(!open)}
      >
        <h6 className="mb-0 fw-semibold">Committee Approvals</h6>
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted small">
            {approvedCount} of {totalCount} approved
          </span>
          <i className={`bi bi-chevron-${open ? 'up' : 'down'}`}></i>
        </div>
      </div>

      <Collapse in={open}>
        <div>
          <Card className="mb-3">
            <Card.Body>
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="d-flex justify-content-between align-items-center py-2 border-bottom"
                >
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: "#f0f0f0",
                        color: "#158993",
                        fontWeight: "bold"
                      }}
                    >
                      {approval.approver_name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="fw-semibold">{approval.approver_name || 'Unknown User'}</div>
                      {approval.approver_email && (
                        <div className="text-muted small">{approval.approver_email}</div>
                      )}
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    {getStatusBadge(approval.status)}
                    {approval.acted_at && (
                      <span className="text-muted small">
                        {moment.utc(approval.acted_at).local().format("DD-MM-YYYY hh:mm a")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </Card.Body>
          </Card>

          {/* Current User Actions */}
          {currentUserApproval && currentUserApproval.status === 'PENDING' && (
            <Card className="border-primary">
              <Card.Body>
                <h6 className="mb-3">Your Approval</h6>
                {!showRejectForm ? (
                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={handleApprove}
                    >
                      ✓ Approve
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => setShowRejectForm(true)}
                    >
                      ✗ Reject
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="mb-2">
                      <label className="form-label small">Remarks (Required)</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={rejectRemarks}
                        onChange={(e) => setRejectRemarks(e.target.value)}
                        placeholder="Enter reason for rejection"
                      />
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={handleReject}
                        disabled={!rejectRemarks.trim()}
                      >
                        Submit Rejection
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectRemarks("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </Card.Body>
            </Card>
          )}
        </div>
      </Collapse>
    </div>
  );
};

export default RoundApprovalsList;

