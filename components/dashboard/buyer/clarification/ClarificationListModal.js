import React, { useState } from "react";
import { Modal, Table, Badge, Button, Alert } from "react-bootstrap";
import { BsEye, BsCheckCircleFill, BsClockFill, BsQuestionCircle } from "react-icons/bs";
import moment from "moment";
import ClarificationDetailModal from "./ClarificationDetailModal";

/**
 * ClarificationListModal
 * Modal showing list of all clarifications for vendors to browse
 */
const ClarificationListModal = ({
  show,
  onHide,
  clarifications = [],
  isBuyer = false,
  currentUserId = null,
  onRefresh,
}) => {
  const [selectedClarification, setSelectedClarification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleViewClarification = (clarification) => {
    setSelectedClarification(clarification);
    setShowDetailModal(true);
  };

  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedClarification(null);
  };

  const handleDetailModalSuccess = () => {
    handleDetailModalClose();
    if (onRefresh) onRefresh();
  };

  // Sort: OPEN first, then by created_at desc
  const sortedClarifications = [...clarifications].sort((a, b) => {
    if (a.status === "OPEN" && b.status !== "OPEN") return -1;
    if (a.status !== "OPEN" && b.status === "OPEN") return 1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const openCount = clarifications.filter((c) => c.status === "OPEN").length;

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg">
        <Modal.Header closeButton className="py-2 px-3">
          <Modal.Title className="fs-5">
            All Clarifications
            {openCount > 0 && (
              <Badge bg="warning" className="ms-2">
                {openCount} Open
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-3" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {openCount > 0 && (
            <Alert variant="warning" className="mb-3 py-2">
              <BsClockFill className="me-2" />
              There {openCount === 1 ? "is" : "are"} {openCount} open clarification{openCount > 1 ? "s" : ""}.
              Quote submission is blocked until resolved.
            </Alert>
          )}

          {clarifications.length === 0 ? (
            <div className="text-center py-4">
              <BsQuestionCircle size={48} className="text-muted mb-3" />
              <h6 className="text-muted">No Clarifications</h6>
              <p className="text-muted small mb-0">
                No clarification requests have been raised for this tender yet.
              </p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>#</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedClarifications.map((clarification, index) => {
                  const isOwner = clarification.raised_by_vendor_id === currentUserId;
                  return (
                    <tr
                      key={clarification.id}
                      className={clarification.status === "OPEN" ? "table-warning" : ""}
                    >
                      <td>{index + 1}</td>
                      <td>
                        <div className="fw-semibold">{clarification.subject}</div>
                        <small className="text-muted">
                          {isOwner ? "Raised by you" : "Raised by another vendor"}
                        </small>
                      </td>
                      <td>
                        <div>{moment(clarification.created_at).format("DD MMM YYYY")}</div>
                        <small className="text-muted">
                          {moment(clarification.created_at).format("hh:mm A")}
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
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => handleViewClarification(clarification)}
                          className="d-flex align-items-center gap-1 p-2 px-3"
                        >
                          <BsEye size={14} />
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer className="py-2 px-3">
          <Button variant="outline-secondary" onClick={onHide} size="sm">
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Detail Modal */}
      <ClarificationDetailModal
        show={showDetailModal}
        onHide={handleDetailModalClose}
        clarification={selectedClarification}
        isBuyer={isBuyer}
        isOwner={selectedClarification?.raised_by_vendor_id === currentUserId}
        onSuccess={handleDetailModalSuccess}
      />
    </>
  );
};

export default ClarificationListModal;
