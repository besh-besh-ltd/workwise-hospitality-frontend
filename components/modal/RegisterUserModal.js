import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal } from "react-bootstrap";
import Register from "../register";
import { useRouter } from "next/router";

export default function RegisterUserModal({ 
  showModal, 
  setShowModal, 
  showButton = true,
  onRegistrationSuccess,
  onClose,
  isPaidSubscription = false,
  isHospitality = false,
  subscription_plan = 0
}) {

  const router = useRouter();
  const source = router?.query?.source;
 
  // Use internal state if props not provided (for backwards compatibility)
  const [internalShowModal, setInternalShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const modalShow = showModal !== undefined ? showModal : internalShowModal;
  const setModalShow = setShowModal !== undefined ? setShowModal : setInternalShowModal;

  const getStepSubtitle = () => {
    if (currentStep === 1) return "Tell us about yourself";
    if (currentStep === 2) return "Share where you operate";
    return "Select hotels";
  };

  return (
    <>
      {showButton && (
        <div>
          <button
            id="register-as-vendor-modal"
            className="btn btn-primary mt-3"
            style={{
              borderRadius: "5px",
              width:"250px",
              border:"none",
              backgroundColor: "white",
              color: "black",
              padding: "10px 20px",
              fontWeight: "500",
              fontSize: "16px",
            }}
            onClick={() => setModalShow(true)}
          >
            Register As Vendor
          </button>
        </div>
      )}

      <Modal
        show={modalShow}
        onHide={() => {
          setModalShow(false);
          if (onClose) onClose();
        }}
        centered
        backdrop="static"
        style={{ backdropFilter: "blur(5px)" }}
      >
        <Modal.Header 
          closeButton
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: "white",
            zIndex: 10,
            borderBottom: "1px solid #e9ecef",
            padding: "1rem 1.5rem"
          }}
        >
          <div className="d-flex justify-content-between align-items-start w-100 me-4">
            <div>
              <Modal.Title className="mb-1" style={{ fontSize: "1.25rem" }}>Register As Vendor</Modal.Title>
              <p className="text-muted mb-0" style={{ fontSize: "0.875rem" }}>
                {getStepSubtitle()}
              </p>
            </div>
            <span className="badge bg-light text-dark px-3 py-2" style={{ marginTop: "0.25rem" }}>
              Step {currentStep} of {isHospitality ? 3 : 2}
            </span>
          </div>
        </Modal.Header>
        <Modal.Body className="p-4">
          {console.log("Rendering Register component with onRegistrationSuccess:", typeof onRegistrationSuccess)}
          <Register 
            registerAs={"vendor"} 
            onRegistrationSuccess={onRegistrationSuccess}
            isPaidSubscription={isPaidSubscription}
            isHospitality={isHospitality}
            source={source}
            subscription_plan={subscription_plan}
            onStepChange={setCurrentStep}
          />
        </Modal.Body>
      </Modal>
    </>
  );
}
