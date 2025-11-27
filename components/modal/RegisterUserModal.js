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
  subscription_plan = 0
}) {

  const router = useRouter();
  const source = router?.query?.source;
 
  // Use internal state if props not provided (for backwards compatibility)
  const [internalShowModal, setInternalShowModal] = useState(false);
  const modalShow = showModal !== undefined ? showModal : internalShowModal;
  const setModalShow = setShowModal !== undefined ? setShowModal : setInternalShowModal;

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
        <Modal.Header closeButton>
          <Modal.Title className="p-4">Register As Vendor</Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {console.log("Rendering Register component with onRegistrationSuccess:", typeof onRegistrationSuccess)}
          <Register 
            registerAs={"vendor"} 
            onRegistrationSuccess={onRegistrationSuccess}
            isPaidSubscription={isPaidSubscription}
            source={source}
            subscription_plan={subscription_plan}
          />
        </Modal.Body>
      </Modal>
    </>
  );
}
