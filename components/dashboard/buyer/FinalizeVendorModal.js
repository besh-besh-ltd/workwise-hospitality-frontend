// FinalizeVendorModal.tsx
import { getExistingPOByVendor } from '@/services/rfq';
import { addCommasToNumber } from '@/utils/sharedFunctions';
import React, { useEffect, useState } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import ExistingPOModal from './ExistingPOModal';

const FinalizeVendorModal = ({
  show,
  onHide,
  onConfirm,
  vendorName,
  vendorDetails,
  quotedPrice,
  productDetails,
  alreadyFinalized,
  availableBudget,
  rfqId
}) => {
  const isFinalized = alreadyFinalized && alreadyFinalized.length > 0;

  const [showExistingPOModal, setShowExistingPOModal] = useState(false);

  const [selectedPo, setSelectedPo] = useState(null);
  const [existingPos, setExistingPos] = useState([]);

  const fetchExistingPOS = async () => {
    try {
      const response = await getExistingPOByVendor(vendorDetails?.id, rfqId);
      setExistingPos(response?.existingPOS ?? []);
    } catch (e) {
      onHide();
      toast.error("Something wen't wrong, please try again later!")
    }
  }

  const onConfirmFinalize = () => {
    if(existingPos.length > 0) {
      onHide();
      setShowExistingPOModal(true);
    } else {
      onConfirm();
    }
  }

  useEffect(() => {
    if(vendorDetails && rfqId)
      fetchExistingPOS();
  }, [vendorDetails, rfqId]);

  return (
    <>
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
          <div className="bg-light p-3 rounded mb-4">
            <p className="mb-2 text-muted" style={{ lineHeight: "1.6" }}>
              {isFinalized ? (
                <>
                  Once finalized, the system will initiate the purchase order
                  workflow for the newly selected vendor. This may go through
                  multiple approval stages depending on your company's approval
                  hierarchy. Please ensure the vendor and quote details are
                  correct, as changing the finalized vendor will restart the{" "}
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

          <div className="p-3 border rounded shadow-sm">
            {availableBudget?.total_budget > 0 && (
              <>
                <h5 className="mb-3 fw-bold text-primary">Budget Summary</h5>
                <div className="mb-3 p-3 bg-light rounded">
                  <h6 className="mb-2 text-muted">Budget Details</h6>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Total Budget:</span>
                    <span className="fw-bold">
                      ₹{addCommasToNumber(availableBudget?.total_budget)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">Available Budget:</span>
                    <span className="fw-bold">
                      ₹{addCommasToNumber(availableBudget?.available_budget)}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between mb-1">
                    <span className="text-muted">Quoted Price:</span>
                    <span className="fw-bold">₹{quotedPrice}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between">
                    <span className="fw-semibold">Remaining Amount:</span>
                    {availableBudget?.available_budget - quotedPrice >= 0 ? (
                      <span className="fw-bold text-success">
                        ₹
                        {addCommasToNumber(
                          availableBudget?.available_budget - quotedPrice
                        )}
                      </span>
                    ) : (
                      <span className="fw-bold text-danger">
                        ₹
                        {addCommasToNumber(
                          availableBudget?.available_budget - quotedPrice
                        )}{" "}
                        (Exceeds Budget!)
                      </span>
                    )}
                  </div>
                  {availableBudget?.available_budget - quotedPrice < 0 && (
                    <div className="mt-2 p-2 bg-danger bg-opacity-10 rounded text-danger">
                      <i className="bi bi-exclamation-triangle-fill me-2"></i>
                      Warning: This purchase will exceed your available budget!
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="mb-2">
              <h6 className="mb-2 text-muted">Purchase Details</h6>
              <div className="mb-2">
                <span className="text-muted">Vendor Name:</span>
                <span className="ms-2 fw-semibold">{vendorName}</span>
              </div>
              <div className="mb-2">
                <span className="text-muted">Product:</span>
                <span className="ms-2 fw-semibold">
                  {productDetails?.[0].product_name}
                </span>
              </div>
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
            onClick={onConfirmFinalize}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
      <ExistingPOModal
        show={showExistingPOModal}
        onHide={setShowExistingPOModal}
        existingPos={existingPos}
        selectedPo={selectedPo}
        setSelectedPo={setSelectedPo}
        onConfirm={onConfirm}
      />
    </>
  );
};

export default FinalizeVendorModal;