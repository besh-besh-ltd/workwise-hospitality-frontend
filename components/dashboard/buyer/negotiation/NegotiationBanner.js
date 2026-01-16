import React, { useState, useEffect } from "react";
import { Card, Badge, Button, Collapse, Alert } from "react-bootstrap";
import { toast } from "react-toastify";
import {
  getNegotiationRounds,
  getActiveNegotiationRound,
  approveNegotiationRound,
  rejectNegotiationRound,
  closeNegotiationRound
} from "@/services/negotiation";
import NegotiationRoundForm from "./NegotiationRoundForm";
import RoundApprovalsList from "./RoundApprovalsList";
import NegotiationRoundHistoryModal from "./NegotiationRoundHistoryModal";

const NegotiationBanner = ({ rfq_id, currentUser }) => {
  const [rounds, setRounds] = useState([]);
  const [activeRound, setActiveRound] = useState(null);
  const [loading, setLoading] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (rfq_id) {
      loadRounds();
    }
  }, [rfq_id]);

  useEffect(() => {
    if (activeRound && activeRound.status === 'ACTIVE' && activeRound.end_date) {
      const interval = setInterval(() => {
        const now = new Date();
        const endDate = new Date(activeRound.end_date);
        const diff = endDate - now;

        if (diff <= 0) {
          setCountdown("Expired");
          clearInterval(interval);
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setCountdown(`${days}d ${hours}h ${minutes}m`);
        }
      }, 60000);

      const now = new Date();
      const endDate = new Date(activeRound.end_date);
      const diff = endDate - now;
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setCountdown(`${days}d ${hours}h ${minutes}m`);
      } else {
        setCountdown("Expired");
      }

      return () => clearInterval(interval);
    }
  }, [activeRound]);

  const loadRounds = async () => {
    try {
      setLoading(true);
      const [roundsResponse, activeResponse] = await Promise.all([
        getNegotiationRounds(rfq_id),
        getActiveNegotiationRound(rfq_id)
      ]);

      if (roundsResponse.status === 1) {
        setRounds(roundsResponse.data || []);
      }

      if (activeResponse.status === 1 && activeResponse.data) {
        setActiveRound(activeResponse.data);
      } else {
        setActiveRound(null);
      }
    } catch (error) {
      console.error("Error loading rounds:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoundCreated = () => {
    loadRounds();
  };

  const handleApprove = async () => {
    try {
      const response = await approveNegotiationRound(activeRound.id);
      if (response.status === 1) {
        toast.success(response.message || "Round approved successfully");
        loadRounds();
      } else {
        toast.error(response.message || "Failed to approve round");
      }
    } catch (error) {
      toast.error(error.message || "Failed to approve round");
    }
  };

  const handleReject = async (remarks) => {
    try {
      const response = await rejectNegotiationRound(activeRound.id, remarks);
      if (response.status === 1) {
        toast.success(response.message || "Round rejected successfully");
        loadRounds();
      } else {
        toast.error(response.message || "Failed to reject round");
      }
    } catch (error) {
      toast.error(error.message || "Failed to reject round");
    }
  };

  const handleCloseRound = async (action) => {
    if (!window.confirm(`Are you sure you want to ${action === 'ANOTHER_ROUND' ? 'close this round and create another' : action === 'REVERSE_AUCTION' ? 'close this round and enable reverse auction' : 'close this round and send forward for approval'}?`)) {
      return;
    }

    try {
      const response = await closeNegotiationRound(activeRound.id, action);
      if (response.status === 1) {
        toast.success(response.message || "Round closed successfully");
        loadRounds();
      } else {
        toast.error(response.message || "Failed to close round");
      }
    } catch (error) {
      toast.error(error.message || "Failed to close round");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <Badge bg="warning" className="px-2 py-1">Pending Approval</Badge>;
      case 'ACTIVE':
        return <Badge bg="success" className="px-2 py-1">Active</Badge>;
      case 'COMPLETED':
        return <Badge bg="secondary" className="px-2 py-1">Completed</Badge>;
      case 'CANCELLED':
        return <Badge bg="danger" className="px-2 py-1">Cancelled</Badge>;
      default:
        return <Badge bg="secondary" className="px-2 py-1">{status}</Badge>;
    }
  };

  const formatPrice = (price) => {
    if (!price) return 'N/A';
    return `₹${parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const pastRounds = rounds.filter(r => r.status === 'COMPLETED' || r.status === 'CANCELLED');

  if (loading) {
    return (
      <div className="mb-3" style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "6px" }}>
        <div className="text-center text-muted">
          <span className="spinner-border spinner-border-sm me-2"></span>
          Loading negotiation rounds...
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-3"
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #dee2e6",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        overflow: "hidden"
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "#158993",
          color: "white",
          padding: "12px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <h5 className="mb-0 fw-semibold" style={{ fontSize: "16px" }}>
          Negotiation Rounds
        </h5>
        {pastRounds.length > 0 && (
          <Button
            variant="light"
            size="sm"
            onClick={() => setHistoryOpen(!historyOpen)}
            style={{ fontSize: "12px", padding: "4px 12px" }}
          >
            History ({pastRounds.length})
          </Button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "20px" }}>
        <div className="row g-3">
          {/* Active Round Display - Left Side */}
          <div className="col-lg-7">
            {activeRound ? (
              <div
                style={{
                  border: activeRound.status === 'ACTIVE' ? "2px solid #28a745" : activeRound.status === 'PENDING_APPROVAL' ? "2px solid #ffc107" : "1px solid #dee2e6",
                  borderRadius: "6px",
                  padding: "16px",
                  backgroundColor: activeRound.status === 'ACTIVE' ? "#f8fff9" : activeRound.status === 'PENDING_APPROVAL' ? "#fffef8" : "#f8f9fa"
                }}
              >
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <Badge bg="primary" style={{ fontSize: "11px", padding: "4px 8px" }}>
                        Round {activeRound.round_number}
                      </Badge>
                      {getStatusBadge(activeRound.status)}
                    </div>
                    <div className="mb-2">
                      <span className="text-muted small">Target Price:</span>
                      <h4 className="mb-0 fw-bold" style={{ color: "#158993", fontSize: "24px" }}>
                        {formatPrice(activeRound.target_price)}
                      </h4>
                    </div>
                    {activeRound.status === 'ACTIVE' && countdown && (
                      <div className="mb-2">
                        <span className="text-muted small">Time Remaining:</span>
                        <div className="fw-semibold" style={{ color: "#28a745", fontSize: "14px" }}>
                          {countdown}
                        </div>
                      </div>
                    )}
                    <div className="text-muted" style={{ fontSize: "12px" }}>
                      Created by {activeRound.created_by_name} on {new Date(activeRound.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  border: "1px dashed #dee2e6",
                  borderRadius: "6px",
                  padding: "20px",
                  textAlign: "center",
                  backgroundColor: "#f8f9fa"
                }}
              >
                <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                  No active negotiation round
                </p>
              </div>
            )}
          </div>

          {/* Action Section - Right Side */}
          <div className="col-lg-5">
            {!activeRound ? (
              <div
                style={{
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  padding: "16px",
                  backgroundColor: "#ffffff"
                }}
              >
                <h6 className="mb-3 fw-semibold" style={{ fontSize: "14px", color: "#158993" }}>
                  Create New Round
                </h6>
                <NegotiationRoundForm
                  rfq_id={rfq_id}
                  onRoundCreated={handleRoundCreated}
                />
              </div>
            ) : activeRound.status === 'PENDING_APPROVAL' ? (
              <div
                style={{
                  border: "1px solid #ffc107",
                  borderRadius: "6px",
                  padding: "16px",
                  backgroundColor: "#fffef8"
                }}
              >
                <h6 className="mb-3 fw-semibold" style={{ fontSize: "14px" }}>
                  Approval Status
                </h6>

                {/* Check if current user is a pending approver */}
                {(() => {
                  const userApproval = activeRound.approvals?.find(
                    a => String(a.approver_user_id) === String(currentUser?.id)
                  );
                  const isCurrentApprover = userApproval &&
                    (userApproval.status === 'PENDING' || userApproval.status === 'pending' || !userApproval.status);

                  return isCurrentApprover ? (
                    <>
                      <Alert variant="warning" className="mb-2 py-2" style={{ fontSize: "13px" }}>
                        <strong>Action Required!</strong> You need to approve or reject this round.
                      </Alert>
                      <div className="d-flex gap-2 mb-3">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={handleApprove}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            const reason = window.prompt('Please provide a reason for rejection:');
                            if (reason) handleReject(reason);
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </>
                  ) : null;
                })()}

                <div className="mb-2">
                  <span className="text-muted small">Your Status:</span>
                  <div className="fw-semibold">
                    {activeRound.approvals?.find(a => String(a.approver_user_id) === String(currentUser?.id))?.status || 'Not an approver'}
                  </div>
                </div>
                <div className="text-muted small">
                  {activeRound.approvalStatus?.approved || 0} of {activeRound.approvalStatus?.total || 0} approved
                </div>
              </div>
            ) : activeRound.status === 'ACTIVE' ? (
              <div
                style={{
                  border: "1px solid #28a745",
                  borderRadius: "6px",
                  padding: "16px",
                  backgroundColor: "#f8fff9"
                }}
              >
                <h6 className="mb-3 fw-semibold" style={{ fontSize: "14px" }}>
                  Round Active
                </h6>
                {countdown && (
                  <div className="mb-3">
                    <span className="text-muted small">Ends in:</span>
                    <div className="fw-semibold" style={{ color: "#28a745" }}>
                      {countdown}
                    </div>
                  </div>
                )}
                <Button
                  variant="success"
                  size="sm"
                  className="w-100"
                  onClick={() => {
                    const quotesSection = document.getElementById('quotes-section');
                    if (quotesSection) {
                      quotesSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  View Revised Quotes
                </Button>
              </div>
            ) : activeRound.status === 'COMPLETED' ? (
              <div
                style={{
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  padding: "16px",
                  backgroundColor: "#ffffff"
                }}
              >
                <h6 className="mb-3 fw-semibold" style={{ fontSize: "14px" }}>
                  Next Actions
                </h6>
                <div className="d-grid gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCloseRound('ANOTHER_ROUND')}
                  >
                    Create Another Round
                  </Button>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => handleCloseRound('REVERSE_AUCTION')}
                  >
                    Enable Reverse Auction
                  </Button>
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleCloseRound('SEND_FORWARD')}
                  >
                    Close & Send Forward
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Round Approvals Section */}
        {activeRound && (activeRound.status === 'PENDING_APPROVAL' || activeRound.status === 'ACTIVE') && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid #dee2e6" }}>
            <RoundApprovalsList
              approvals={activeRound.approvals || []}
              currentUserId={currentUser?.id}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </div>
        )}

        {/* History Collapse */}
        {historyOpen && pastRounds.length > 0 && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid #dee2e6" }}>
            <h6 className="mb-2 fw-semibold" style={{ fontSize: "14px" }}>Round History</h6>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {pastRounds.map((round) => (
                <div
                  key={round.id}
                  className="border rounded p-2 mb-2"
                  style={{ backgroundColor: "#f8f9fa", cursor: "pointer" }}
                  onClick={() => setShowHistoryModal(true)}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <Badge bg="primary" style={{ fontSize: "10px" }}>Round {round.round_number}</Badge>
                    {getStatusBadge(round.status)}
                  </div>
                  <div className="small text-muted mt-1">
                    Target: {formatPrice(round.target_price)} • {new Date(round.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* History Modal */}
      <NegotiationRoundHistoryModal
        show={showHistoryModal}
        onHide={() => setShowHistoryModal(false)}
        rounds={rounds}
        rfq_id={rfq_id}
      />
    </div>
  );
};

export default NegotiationBanner;
