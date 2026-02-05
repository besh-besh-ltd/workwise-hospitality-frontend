import React, { useState, useEffect, useMemo } from "react";
import { Table, Badge, Button, Spinner, Alert, Card } from "react-bootstrap";
import { BsEye, BsCheckCircleFill, BsClockFill, BsArrowLeft, BsQuestionCircle, BsChatDots } from "react-icons/bs";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import moment from "moment";
import { getClarifications } from "@/services/clarification";
import { getRFQById } from "@/services/rfq";
import ClarificationDetailModal from "./ClarificationDetailModal";
import { formatRFQNumber } from "@/utils/sharedFunctions";
import { getProfile } from "@/services/Auth";

/**
 * ClarificationManagement
 * Main component for managing tender clarifications (Buyer view)
 */
const ClarificationManagement = () => {
  const router = useRouter();
  const { rfq_id } = router.query;

  const [clarifications, setClarifications] = useState([]);
  const [rfqDetails, setRfqDetails] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedClarification, setSelectedClarification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const fetchData = async () => {
    if (!rfq_id) return;

    setLoading(true);
    setError(null);

    try {
      const [clarificationsRes, rfqRes, profileRes] = await Promise.all([
        getClarifications(rfq_id),
        getRFQById(rfq_id),
        getProfile(),
      ]);

      // API Response: { status: 1, data: { clarifications: [], open_clarification: null, has_open: false, is_own_clarification: false, is_buyer: true } }
      const responseData = clarificationsRes?.data?.data || clarificationsRes?.data || {};
      const clarificationsList = responseData?.clarifications || [];
      setClarifications(clarificationsList);

      const rfqData = rfqRes?.data?.data || rfqRes?.data;
      setRfqDetails(rfqData);

      // Get current user ID from profile
      const profileData = profileRes?.data || profileRes;
      setCurrentUserId(profileData?.id);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load clarifications. Please try again.");
      toast.error("Failed to load clarifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [rfq_id]);

  const handleViewClarification = (clarification) => {
    setSelectedClarification(clarification);
    setShowDetailModal(true);
  };

  const handleModalSuccess = () => {
    fetchData();
    setShowDetailModal(false);
    setSelectedClarification(null);
  };

  const openCount = clarifications.filter((c) => c.status === "OPEN").length;
  const closedCount = clarifications.filter((c) => c.status === "CLOSED").length;

  // Sort: OPEN first, then by created_at desc
  const sortedClarifications = [...clarifications].sort((a, b) => {
    if (a.status === "OPEN" && b.status !== "OPEN") return -1;
    if (a.status !== "OPEN" && b.status === "OPEN") return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  // Check if current user is the creator of this RFQ/Tender
  const isCreator = useMemo(() => {
    if (currentUserId && rfqDetails?.created_by) {
      return String(currentUserId) === String(rfqDetails.created_by);
    }
    return false;
  }, [currentUserId, rfqDetails]);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading clarifications...</p>
      </div>
    );
  }

  return (
    <div className="clarification-management px-5 mb-4" style={{ marginTop: "80px" }}>
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => router.back()}
            className="d-flex align-items-center p-2 px-4 gap-2"
            style={{ width: "120px" }}
          >
            <BsArrowLeft />
            Back
          </Button>
          <div>
            <h4 className="mb-0">Clarification Management</h4>
            {rfqDetails && (
              <small className="text-muted">
                {formatRFQNumber(rfqDetails.rfq_no, rfqDetails.is_tender)}
              </small>
            )}
          </div>
        </div>
        <div className="d-flex gap-2">
          <Badge bg="warning" className="d-flex align-items-center gap-1 px-3 py-2">
            <BsClockFill size={12} />
            {openCount} Open
          </Badge>
          <Badge bg="success" className="d-flex align-items-center gap-1 px-3 py-2">
            <BsCheckCircleFill size={12} />
            {closedCount} Closed
          </Badge>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Alert variant="danger" className="mb-4">
          {error}
          <Button variant="link" className="p-0 ms-2" onClick={fetchData}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Open Clarification Alert */}
      {openCount > 0 && (
        <Alert variant="warning" className="mb-4">
          <strong>Attention:</strong> There {openCount === 1 ? "is" : "are"} {openCount} open clarification{openCount > 1 ? "s" : ""}.
          Quote submission is blocked for all vendors until resolved.
        </Alert>
      )}

      {/* Clarifications Table */}
      {clarifications.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <BsQuestionCircle size={48} className="text-muted mb-3" />
            <h5 className="text-muted">No Clarifications</h5>
            <p className="text-muted mb-0">
              No clarification requests have been raised for this tender yet.
            </p>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Table responsive hover className="mb-0">
            <thead className="bg-light">
              <tr>
                <th style={{ width: "50px" }}>#</th>
                <th>Subject</th>
                <th>Raised By</th>
                <th style={{ width: "100px" }}>Messages</th>
                <th>Last Activity</th>
                <th style={{ width: "100px" }}>Status</th>
                <th style={{ width: "100px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedClarifications.map((clarification, index) => {
                // Get message count and latest message preview
                const messageCount = clarification.messages?.length || 0;
                const latestMessage = clarification.messages?.[clarification.messages.length - 1];
                const latestActivityDate = latestMessage?.created_at || clarification.created_at;
                const previewText = latestMessage?.message || clarification.question;

                return (
                  <tr
                    key={clarification.id}
                    className={clarification.status === "OPEN" ? "table-warning" : ""}
                  >
                    <td>{index + 1}</td>
                    <td>
                      <div className="fw-semibold">{clarification.subject}</div>
                      <small className="text-muted text-truncate d-block" style={{ maxWidth: 300 }}>
                        {previewText?.substring(0, 100)}
                        {previewText?.length > 100 ? "..." : ""}
                      </small>
                    </td>
                    <td>
                      {clarification.raised_by_vendor_code
                        || clarification.raised_by_vendor_name
                        || "Unknown Vendor"}
                    </td>
                    <td>
                      <Badge bg="secondary" className="d-flex align-items-center justify-content-center gap-1" style={{ width: "fit-content" }}>
                        <BsChatDots size={12} />
                        {messageCount}
                      </Badge>
                    </td>
                    <td>
                      <div>{moment.utc(latestActivityDate).local().format("DD MMM YYYY")}</div>
                      <small className="text-muted">
                        {moment.utc(latestActivityDate).local().format("hh:mm A")}
                      </small>
                    </td>
                    <td>
                      <Badge bg={clarification.status === "OPEN" ? "warning" : "success"}>
                        {clarification.status === "OPEN" ? (
                          <>
                            <BsClockFill className="me-1" />
                            Open
                          </>
                        ) : (
                          <>
                            <BsCheckCircleFill className="me-1" />
                            Closed
                          </>
                        )}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        variant={clarification.status === "OPEN" ? "warning" : "outline-secondary"}
                        size="sm"
                        onClick={() => handleViewClarification(clarification)}
                        className="d-flex align-items-center p-2 px-3 gap-1"
                      >
                        <BsEye size={14} />
                        {clarification.status === "OPEN" ? "Respond" : "View"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Card>
      )}

      {/* Detail Modal */}
      <ClarificationDetailModal
        show={showDetailModal}
        onHide={() => {
          setShowDetailModal(false);
          setSelectedClarification(null);
        }}
        clarification={selectedClarification}
        isBuyer={true}
        isCreator={isCreator}
        onSuccess={handleModalSuccess}
        onRefresh={fetchData}
      />
    </div>
  );
};

export default ClarificationManagement;
