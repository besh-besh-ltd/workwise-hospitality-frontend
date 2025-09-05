import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

export default function RejectRemarksModal({ show, onClose, onReject }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!show) setReason("");
  }, [show]);

  const handleReject = () => {
    // Pass the typed reason up to the caller
    onReject?.(reason.trim());
  };

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      keyboard={false}
      dialogClassName="reject-remarks-modal"
    >
      <Modal.Body>
        <Form.Group controlId="rejectReason">
          <Form.Label className="fw-semibold">Reject reason</Form.Label>
          <Form.Control
            as="textarea"
            rows={6}
            placeholder="Please share the reason for rejecting this PO..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="form-text">
            This note will be recorded with the rejection.
          </div>
        </Form.Group>
      </Modal.Body>

      <Modal.Footer className="border-0">
        <Button variant="outline-secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleReject}
          disabled={reason.trim().length === 0}
          title={reason.trim().length === 0 ? "Enter a reject reason" : "Reject PO"}
        >
          Reject PO
        </Button>
      </Modal.Footer>

      <style jsx>{`
        :global(.reject-remarks-modal .modal-dialog) {
          max-width: 640px;
          width: 100%;
        }
      `}</style>
    </Modal>
  );
}