import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

export default function RejectRemarksModal({ type = 'reject', show, onClose, onAction, poData }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!show) setReason("");
  }, [show]);

  const handleReject = () => {
    // Pass the typed reason up to the caller
    onAction?.(reason.trim());
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
          <Form.Label className="fs-5 fw-semibold">{type == 'reject' ? 'Reject' : 'Approve'} reason</Form.Label>
          <Form.Control
            as="textarea"
            rows={6}
            placeholder={`Please share the reason for ${type == 'reject' ? 'Rejecting' : 'Approving'} this PO...`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="form-text">
            This note will be recorded with the {type == 'reject' ? 'Rejection' : 'Approval'}.
          </div>
        </Form.Group>
      </Modal.Body>

      <Modal.Footer className="border-0">
        <Button variant="outline-secondary" onClick={onClose} className="p-2">
          Cancel
        </Button>
        <Button
          variant={type == 'reject' ? 'danger' : 'success'}
          onClick={handleReject}
          disabled={(type == 'reject' && reason.trim().length === 0)}
          title={reason.trim().length === 0 ? "Enter a reason" : `${type == 'reject' ? 'Reject' : 'Approve'} PO`}
          className="p-2"
        >
          {type == 'reject' ? 'Reject' : 'Approve'} PO
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