// FinalizeVendorModal.tsx
import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const FinalizeVendorModal = ({
  show,
  onHide,
  onConfirm,
  vendorName,
  quotedPrice,
  productName,
  alreadyFinalized
}) => {
  const isFinalized = alreadyFinalized && alreadyFinalized.length > 0

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
        <Modal.Title className="fw-semibold fs-4">Heads Up</Modal.Title>
      </Modal.Header>

      <Modal.Body className="pt-3 pb-4 p-0">
        <p className="fs-6 mb-4">
          {isFinalized
            ? `
            You are about to finalize another vendor for this product. 
            This will reset any ongoing Purchase Order related to this product in the current RFQ.
            `
            : `
            This will finalize this vendor as well as initiate a Purchase Order. 
            However, the Purchase Order may require further approvals from the higher-ups.
          `}
        </p>

        <div className="bg-light p-3 rounded mb-4">
          <p className="mb-2 text-muted" style={{ lineHeight: "1.6" }}>
            {isFinalized ? (
              <>
                Once finalized, the system will initiate the purchase order
                workflow for the newly selected vendor. This may go through
                multiple approval stages depending on your company's approval
                hierarchy. Please ensure the vendor and quote details are
                correct, as changing the finalized vendor will restart the {" "}
                <strong>Purchase Order</strong> and discard the current one.
              </>
            ) : (
              <>
                Once finalized, The system will trigger the purchase order
                workflow, which may go through multiple approval levels before
                execution. Ensure the selected vendor and quote details, as
                resetting or changing the Finalization will restart the{" "}
                <strong>Purchase Order!</strong>
              </>
            )}
          </p>
        </div>

        <div className="p-3 border rounded">
          <h6 className="mb-2">Final Details</h6>
          <div className="mb-1">
            <strong>Vendor Name:</strong> {vendorName}
          </div>
          <div className="mb-1">
            <strong>Quoted Price:</strong> ₹{quotedPrice}
          </div>
          <div>
            <strong>Product:</strong> {productName}
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-end gap-2 mt-2 p-0 pt-2">
        <Button
          variant="outline-secondary"
          style={{ padding: "0.7rem" }}
          onClick={onHide}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          style={{ padding: "0.7rem" }}
          onClick={onConfirm}
        >
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default FinalizeVendorModal;