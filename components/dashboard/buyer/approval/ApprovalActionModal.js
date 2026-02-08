import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";
import { BsCheckCircleFill, BsXCircleFill, BsExclamationTriangleFill, BsXCircle, BsCheckCircle } from "react-icons/bs";

const ApprovalActionModal = ({
  show,
  actionType,
  onClose,
  onSubmit,
  loading,
  entityLabel = "item",
}) => {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!show) setComment("");
  }, [show]);

  const isReject = actionType === "REJECT";
  const isCommentRequired = isReject;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(comment.trim());
  };

  const isSubmitDisabled = loading || (isCommentRequired && !comment.trim());

  return (
    <Modal show={show} onHide={onClose} centered backdrop="static">
      <Modal.Header
        closeButton
        className="border-0 py-2 px-3"
        style={{
          backgroundColor: isReject ? "#fff5f5" : "#f0fff4",
        }}
      >
        <Modal.Title className="d-flex align-items-center gap-2">
          {isReject ? (
            <BsXCircleFill size={24} className="text-danger" />
          ) : (
            <BsCheckCircleFill size={24} className="text-success" />
          )}
          <span>
            {isReject ? "Reject" : "Approve"} {entityLabel}
          </span>
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-2">
          {/* Confirmation Message */}
          <Alert
            variant={isReject ? "danger" : "success"}
            className="py-2"
            style={{ backgroundColor: isReject ? "#fff5f5" : "#f0fff4" }}
          >
            {isReject ? (
              <>
                <strong>You are about to reject this {entityLabel.toLowerCase()}.</strong>
                <br />
                This action will stop the approval workflow and notify the initiator.
              </>
            ) : (
              <>
                <strong>You are about to approve this {entityLabel.toLowerCase()}.</strong>
                <br />
                This will advance the workflow to the next step or complete the approval.
              </>
            )}
          </Alert>

          {/* Comment Field */}
          <Form.Group className="mt-3">
            <Form.Label className="fw-semibold">
              {isReject ? (
                <>
                  Rejection Reason <span className="text-danger">*</span>
                </>
              ) : (
                "Comment (Optional)"
              )}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              placeholder={
                isReject
                  ? "Please explain why you are rejecting this request..."
                  : "Add any comments or notes for the record..."
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={isCommentRequired && !comment.trim() ? "border-warning" : ""}
            />
            <Form.Text className="text-muted">
              {isReject
                ? "A reason is required when rejecting. This will be visible to the initiator."
                : "Your comment will be recorded in the approval history."}
            </Form.Text>
          </Form.Group>

          {/* Warning for Rejection */}
          {isReject && (
            <Alert variant="warning" className="mt-3 mb-0 py-2 d-flex align-items-center gap-2">
              <BsExclamationTriangleFill size={42} />
              <small>
                <strong>Note:</strong> Rejection cannot be undone. The initiator will need to
                create a new request if they want to proceed.
              </small>
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer className="border-0 p-2">
          <Button
            variant="outline-secondary"
            className="p-2"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant={isReject ? "danger" : "success"}
            disabled={isSubmitDisabled}
            className="px-4 d-flex align-items-center gap-2 p-2"
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" />
                Processing...
              </>
            ) : (
              <>
                {isReject ? <BsXCircle size={16} /> : <BsCheckCircle size={16} />}
                {isReject ? "Reject" : "Approve"}
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ApprovalActionModal;
