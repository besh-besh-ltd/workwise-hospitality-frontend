import React from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { formatDisplayDate } from "@/utils/sharedFunctions";

const ExistingPOModal = ({
  show,
  onHide,
  existingPos,
  selectedPo,
  setSelectedPo,
  onConfirm,
}) => {
  return (
    <Modal
      show={show}
      onHide={onHide}
      centered
      size="lg"
      contentClassName="p-4"
      dialogClassName="custom-modal-width"
    >
      <Modal.Header closeButton>
        <Modal.Title className="fw-semibold fs-4">Group with Existing PO</Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-3 pb-4 p-0">
        <div className="bg-light p-3 rounded mb-4">
          <p className="mb-2 text-muted" style={{ lineHeight: "1.6" }}>
            We have detected some existing draft PO that belongs to the same vendor,
            You can group this product in the same PO.
          </p>
        </div>

        <Form>
          {existingPos && existingPos.length > 0 ? (
            existingPos.map((po) => (
              <Form.Check
                type="radio"
                id={`po-radio-${po.id}`}
                key={po.id}
                name="poRadio"
                label={
                  <>
                    <strong>PO #{po.po_number}</strong>
                    <br />
                    <small className="text-muted">Created: {formatDisplayDate(po.created_at)}</small>
                  </>
                }
                checked={selectedPo?.id === po.id}
                onChange={() => setSelectedPo(po)}
                className="mb-2"
              />
            ))
          ) : (
            <p className="text-muted">No existing Purchase Orders found.</p>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-end gap-2 mt-2 p-0 pt-2">
        <Button
          variant="outline-secondary"
          style={{ padding: "0.7rem" }}
          onClick={() => {
            onHide();
            onConfirm();
          }}
        >
          Draft a separate PO
        </Button>
        <Button
          variant="primary"
          style={{ padding: "0.7rem" }}
          onClick={() => onConfirm(selectedPo.id)}
          disabled={!selectedPo}
        >
          Group into this PO
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ExistingPOModal;
