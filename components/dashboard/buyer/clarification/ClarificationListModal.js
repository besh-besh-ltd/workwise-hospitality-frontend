import React, { useState } from "react";
import { Modal, Table, Badge, Button, Alert } from "react-bootstrap";
import { BsEye, BsCheckCircleFill, BsClockFill, BsQuestionCircle, BsChatDots } from "react-icons/bs";
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
  onRefresh,
  token = null,
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
                  <th>Messages</th>
                  <th>Last Activity</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedClarifications.map((clarification, index) => {
                  // For vendors (!isBuyer), all clarifications in their list are owned by them
                  const isOwner = !isBuyer;
                  const messageCount = clarification.messages?.length || 0;
                  const latestMessage = clarification.messages?.[clarification.messages.length - 1];
                  const latestActivityDate = latestMessage?.created_at || clarification.created_at;

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
                        <Badge bg="secondary" className="d-flex align-items-center gap-1" style={{ width: "fit-content" }}>
                          <BsChatDots size={12} />
                          {messageCount}
                        </Badge>
                      </td>
                      <td>
                        <div>{moment(latestActivityDate).format("DD MMM YYYY")}</div>
                        <small className="text-muted">
                          {moment(latestActivityDate).format("hh:mm A")}
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
        isOwner={!isBuyer}
        onSuccess={handleDetailModalSuccess}
        token={token}
        onRefresh={onRefresh}
      />
    </>
  );
};

export default ClarificationListModal;
